import * as XLSX from 'xlsx';

const GENERAL_CODE_KEYWORDS = ['ILL HEALTH', 'HOLD LISTING', 'MATERNITY'];

export function isGeneralCode(rep: string): boolean {
  const upper = rep.toUpperCase();
  return GENERAL_CODE_KEYWORDS.some(kw => upper.includes(kw));
}

function cleanCode(code: string): string {
  return code.replace(/\s+/g, '').toUpperCase();
}

function formatIdNumber(val: string | number | null | undefined): string {
  if (val == null || String(val) === 'nan' || String(val) === '') return '';
  const s = String(val).trim();
  if (s.endsWith('.0')) return s.slice(0, -2);
  return s;
}

export interface RawEmployee {
  'Employee Code': string;
  'First Name': string;
  'Last Name': string;
  'Store': string;
  'Rep': string;
  'Original Rep': string;
  'Company': string;
  'Job Title': string;
  'Employee Status': string;
  'ID Number': string;
}

export interface RawSignedShift {
  'Employee Code': string;
  'Employee Name': string;
  'Store': string;
  'Status': string;
  'Employee ID': string;
}

export function reassignGeneralCodes(employees: RawEmployee[]): RawEmployee[] {
  const storeToRealReps = new Map<string, string[]>();
  for (const emp of employees) {
    if (!isGeneralCode(emp.Rep)) {
      const existing = storeToRealReps.get(emp.Store);
      if (existing) {
        if (!existing.includes(emp.Rep)) existing.push(emp.Rep);
      } else {
        storeToRealReps.set(emp.Store, [emp.Rep]);
      }
    }
  }

  return employees.map(emp => {
    if (isGeneralCode(emp.Rep)) {
      const realReps = storeToRealReps.get(emp.Store);
      if (realReps && realReps.length > 0) {
        return { ...emp, 'Original Rep': emp.Rep, Rep: realReps[0] };
      }
    }
    return { ...emp, 'Original Rep': emp.Rep };
  });
}

export function parseRouteList(fileBuffer: ArrayBuffer): RawEmployee[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const headerRowIndex = (data as unknown[][]).findIndex((row) =>
    Array.isArray(row) && row.some((cell) => cell === 'Employee Code')
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
        const rawCode = String(row[0]);
        const rawRep = String(row[14]);
        employees.push({
          'Employee Code': cleanCode(rawCode),
          'First Name': String(row[7] || ''),
          'Last Name': String(row[8] || ''),
          'Store': store,
          'Rep': rawRep,
          'Original Rep': rawRep,
          'Company': String(row[3] || ''),
          'Job Title': String(row[4] || ''),
          'Employee Status': String(row[10] || ''),
          'ID Number': formatIdNumber(row[2]),
        });
      }
    }
  }

  return reassignGeneralCodes(employees);
}

export function parseSignedShifts(fileBuffer: ArrayBuffer): RawSignedShift[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  return (data as RawSignedShift[]).map(row => ({
    'Employee Code': cleanCode(row['Employee Code'] || ''),
    'Employee Name': row['Employee Name'] || '',
    'Store': row['Store'] || '',
    'Status': row['Status'] || 'Not Signed',
    'Employee ID': formatIdNumber(row['Employee ID']),
  }));
}

export function buildSignedLookup(employees: RawEmployee[], signedShifts: RawSignedShift[]): Map<string, boolean> {
  const codeLookup = new Map<string, boolean>();
  for (const s of signedShifts) {
    codeLookup.set(s['Employee Code'], s.Status === 'Signed');
  }

  const idLookup = new Map<string, boolean>();
  for (const s of signedShifts) {
    if (s['Employee ID']) {
      idLookup.set(s['Employee ID'], s.Status === 'Signed');
    }
  }

  const routeIdToCode = new Map<string, string>();
  for (const e of employees) {
    if (e['ID Number']) {
      routeIdToCode.set(e['ID Number'], e['Employee Code']);
    }
  }

  const result = new Map<string, boolean>();

  for (const emp of employees) {
    const code = emp['Employee Code'];

    if (codeLookup.has(code)) {
      result.set(code, codeLookup.get(code)!);
      continue;
    }

    const idNum = emp['ID Number'];
    if (idNum && idLookup.has(idNum)) {
      result.set(code, idLookup.get(idNum)!);
      continue;
    }

    result.set(code, false);
  }

  return result;
}

export function mergeData(
  employees: RawEmployee[],
  signedShifts: RawSignedShift[]
): Map<string, { signed: number; not_signed: number }> {
  const result = new Map<string, { signed: number; not_signed: number }>();
  const signedLookup = buildSignedLookup(employees, signedShifts);

  for (const emp of employees) {
    const key = `${emp.Rep}||${emp.Store}`;
    const isSigned = signedLookup.get(emp['Employee Code']) ?? false;

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