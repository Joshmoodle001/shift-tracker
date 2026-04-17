import * as XLSX from 'xlsx';

export interface RawEmployee {
  'Employee Code': string;
  'First Name': string;
  'Last Name': string;
  'Store': string;
  'Rep': string;
  'Company': string;
  'Job Title': string;
  'Employee Status': string;
}

export interface RawSignedShift {
  'Employee Code': string;
  'Employee Name': string;
  'Store': string;
  'Status': string;
}

export async function parseRouteList(fileBuffer: ArrayBuffer): Promise<RawEmployee[]> {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  const headerRowIndex = data.findIndex((row: unknown) => 
    Array.isArray(row) && row.some((cell: unknown) => cell === 'Employee Code')
  );
  
  if (headerRowIndex === -1) {
    throw new Error('Could not find header row in Route List');
  }
  
  const employees: RawEmployee[] = [];
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i] as (string | number | null | undefined)[];
    if (row[0] && row[5] && row[14]) {
      const store = String(row[5]);
      const isCheckersOrShoprite = store.includes('CHECKERS') || store.includes('SHOPRITE');
      
      if (isCheckersOrShoprite) {
        employees.push({
          'Employee Code': String(row[0]),
          'First Name': String(row[7] || ''),
          'Last Name': String(row[8] || ''),
          'Store': store,
          'Rep': String(row[14]),
          'Company': String(row[3] || ''),
          'Job Title': String(row[4] || ''),
          'Employee Status': String(row[10] || '')
        });
      }
    }
  }
  
  return employees;
}

export async function parseSignedShifts(fileBuffer: ArrayBuffer): Promise<RawSignedShift[]> {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  return (data as RawSignedShift[]).map(row => ({
    'Employee Code': row['Employee Code'] || '',
    'Employee Name': row['Employee Name'] || '',
    'Store': row['Store'] || '',
    'Status': row['Status'] || 'Not Signed'
  }));
}

export function mergeData(
  employees: RawEmployee[],
  signedShifts: RawSignedShift[]
): Map<string, { signed: number; not_signed: number }> {
  const result = new Map<string, { signed: number; not_signed: number }>();
  
  for (const emp of employees) {
    const key = `${emp.Rep}||${emp.Store}`;
    const signedShift = signedShifts.find(
      s => s['Employee Code'] === emp['Employee Code']
    );
    
    const isSigned = signedShift?.Status === 'Signed';
    
    const existing = result.get(key);
    if (existing) {
      if (isSigned) {
        existing.signed += 1;
      } else {
        existing.not_signed += 1;
      }
    } else {
      result.set(key, {
        signed: isSigned ? 1 : 0,
        not_signed: isSigned ? 0 : 1
      });
    }
  }
  
  return result;
}

export function getUniqueReps(employees: RawEmployee[]): string[] {
  const reps = new Set<string>();
  for (const emp of employees) {
    if (emp.Rep) {
      reps.add(emp.Rep);
    }
  }
  return Array.from(reps).sort();
}

export function getUniqueStores(employees: RawEmployee[]): string[] {
  const stores = new Set<string>();
  for (const emp of employees) {
    if (emp.Store) {
      stores.add(emp.Store);
    }
  }
  return Array.from(stores).sort();
}