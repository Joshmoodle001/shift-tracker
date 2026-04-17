import { NextRequest, NextResponse } from 'next/server';
import { parseRouteList, parseSignedShifts, mergeData, getUniqueReps, getUniqueStores } from '@/lib/data-processing';

interface StoreEntry {
  store: string;
  rep: string;
  employee_codes: string[];
  signed_count: number;
  not_signed_count: number;
}

interface ProcessedData {
  stores: StoreEntry[];
  reps: string[];
  storeNames: string[];
  timestamp: string;
  employees: { Employee_Code: string; First_Name: string; Last_Name: string; Store: string; Rep: string }[];
}

let cachedData: ProcessedData | null = null;
let cachedRouteListEmployees: ReturnType<typeof parseRouteList> extends Promise<infer T> ? T : never = [];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const routeListFile = formData.get('routeList') as File | null;
    const signedShiftsFile = formData.get('signedShifts') as File | null;
    const keepExisting = formData.get('keepExisting') as string | null;

    if (!routeListFile && !signedShiftsFile && !keepExisting) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    let employees = cachedRouteListEmployees;
    let signedShifts: Awaited<ReturnType<typeof parseSignedShifts>> = [];

    if (routeListFile) {
      const buffer = await routeListFile.arrayBuffer();
      employees = await parseRouteList(buffer);
      cachedRouteListEmployees = employees;
    }

    if (signedShiftsFile) {
      const buffer = await signedShiftsFile.arrayBuffer();
      signedShifts = await parseSignedShifts(buffer);
    }

    if (employees.length === 0) {
      return NextResponse.json({ error: 'No Checkers/Shoprite employees found. Upload the Route List first.' }, { status: 400 });
    }

    const merged = mergeData(employees, signedShifts);

    const stores: StoreEntry[] = [];
    for (const [key, counts] of merged.entries()) {
      const [rep, store] = key.split('||');
      const empCodes = employees
        .filter(e => e.Rep === rep && e.Store === store)
        .map(e => e['Employee Code']);
      stores.push({
        store,
        rep,
        employee_codes: empCodes,
        signed_count: counts.signed,
        not_signed_count: counts.not_signed
      });
    }

    const reps = getUniqueReps(employees);
    const storeNames = getUniqueStores(employees);

    const data: ProcessedData = {
      stores,
      reps,
      storeNames,
      timestamp: new Date().toISOString(),
      employees: employees.map(e => ({
        Employee_Code: e['Employee Code'],
        First_Name: e['First Name'],
        Last_Name: e['Last Name'],
        Store: e.Store,
        Rep: e.Rep
      }))
    };

    cachedData = data;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process files' },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (cachedData) {
    return NextResponse.json(cachedData);
  }
  return NextResponse.json({ error: 'No data loaded yet. Upload files to get started.' }, { status: 404 });
}