import * as XLSX from 'xlsx';

const GENERAL_CODE_KEYWORDS = ['ILL HEALTH', 'HOLD LISTING', 'MATERNITY'];
const CHECKERS_SHOPRITE_KEYWORDS = ['CHECKERS', 'SHOPRITE'];
const REGION_LABELS = {
  SR: 'PERISHABLES',
  CH: 'GROCERIES',
} as const;

export function isGeneralCode(rep: string): boolean {
  const upper = String(rep || '').toUpperCase();
  return GENERAL_CODE_KEYWORDS.some(kw => upper.includes(kw));
}

function cleanCode(code: string): string {
  return String(code || '').replace(/\s+/g, '').toUpperCase();
}

function cleanStatus(status: string): 'Signed' | 'Not Signed' {
  return String(status || '').trim().toUpperCase() === 'SIGNED' ? 'Signed' : 'Not Signed';
}

function formatIdNumber(val: string | number | null | undefined): string {
  if (val == null) return '';
  const s = String(val).trim();
  if (!s || s.toLowerCase() === 'nan') return '';
  if (s.endsWith('.0')) return s.slice(0, -2);
  return s.replace(/\s+/g, '');
}

export function isCheckersOrShopriteStore(store: string): boolean {
  const upper = String(store || '').toUpperCase();
  if (!upper) return false;

  // Fast-path for exact matches.
  if (CHECKERS_SHOPRITE_KEYWORDS.some(keyword => upper.includes(keyword))) {
    return true;
  }

  // Handle common data-entry typos such as "CHEKCERS".
  const tokens = upper.split(/[^A-Z]+/).filter(Boolean);
  const isNearMatch = (token: string, target: string): boolean => {
    if (token === target) return true;
    if (Math.abs(token.length - target.length) > 1) return false;

    // Adjacent transposition (e.g. CHEKCERS vs CHECKERS).
    if (token.length === target.length) {
      for (let i = 0; i < token.length - 1; i++) {
        if (
          token[i] !== target[i] &&
          token[i] === target[i + 1] &&
          token[i + 1] === target[i]
        ) {
          const swapped = token.slice(0, i) + token[i + 1] + token[i] + token.slice(i + 2);
          if (swapped === target) return true;
        }
      }
    }

    // One-edit-away check (insert/delete/replace) for noisy inputs.
    let i = 0;
    let j = 0;
    let edits = 0;
    while (i < token.length && j < target.length) {
      if (token[i] === target[j]) {
        i++;
        j++;
        continue;
      }
      edits++;
      if (edits > 1) return false;
      if (token.length > target.length) {
        i++;
      } else if (token.length < target.length) {
        j++;
      } else {
        i++;
        j++;
      }
    }
    if (i < token.length || j < target.length) edits++;
    return edits <= 1;
  };

  return tokens.some((token) =>
    CHECKERS_SHOPRITE_KEYWORDS.some((brand) => isNearMatch(token, brand))
  );
}

export function isLearnerJobTitle(jobTitle: string): boolean {
  const title = String(jobTitle || '').toUpperCase();
  if (!title) return false;
  return /\bL01\s*-\s*LEARNER\b/.test(title) || /\bL01\s+LEARNER\b/.test(title);
}

export function isTerminatedEmployeeStatus(employeeStatus: string): boolean {
  const status = String(employeeStatus || '').toUpperCase();
  if (!status) return false;
  return status.includes('TERMINATED');
}

export function isRepForcedToNonCheckers(rep: string): boolean {
  const normalizedRep = String(rep || '').trim().toUpperCase();
  if (!normalizedRep) return false;
  return normalizedRep.startsWith('W') || normalizedRep.startsWith('P');
}

export function getRegionFromRep(rep: string): string {
  const upper = String(rep || '').toUpperCase().trim();
  if (!upper) return 'UNASSIGNED';

  if (/(^|[_\-\s])CH([_\-\s]|$)/.test(upper)) return REGION_LABELS.CH;
  if (/(^|[_\-\s])SR\d*([_\-\s]|$)/.test(upper)) return REGION_LABELS.SR;

  const codeMatchAfterHyphen = upper.match(/-\s*([A-Z]{2,4})(?=[_\-\s]|$)/);
  if (codeMatchAfterHyphen) return codeMatchAfterHyphen[1];

  const codeMatchAnywhere = upper.match(/\b([A-Z]{2,4})\b/);
  if (codeMatchAnywhere) return codeMatchAnywhere[1];

  return 'UNASSIGNED';
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
  'Status': 'Signed' | 'Not Signed';
  'Employee ID': string;
}

export function reassignGeneralCodes(employees: RawEmployee[]): RawEmployee[] {
  const storeRepCounts = new Map<string, Map<string, number>>();
  const storeIdToRep = new Map<string, string>();
  const idToRepCounts = new Map<string, Map<string, number>>();

  for (const emp of employees) {
    if (!isGeneralCode(emp.Rep)) {
      const normalizedStore = emp.Store.trim();
      const normalizedRep = emp.Rep.trim();
      const normalizedId = formatIdNumber(emp['ID Number']);

      if (!storeRepCounts.has(normalizedStore)) {
        storeRepCounts.set(normalizedStore, new Map<string, number>());
      }
      const storeCountMap = storeRepCounts.get(normalizedStore)!;
      storeCountMap.set(normalizedRep, (storeCountMap.get(normalizedRep) || 0) + 1);

      if (normalizedId) {
        const storeIdKey = `${normalizedStore}||${normalizedId}`;
        if (!storeIdToRep.has(storeIdKey)) {
          storeIdToRep.set(storeIdKey, normalizedRep);
        }

        if (!idToRepCounts.has(normalizedId)) {
          idToRepCounts.set(normalizedId, new Map<string, number>());
        }
        const idCountMap = idToRepCounts.get(normalizedId)!;
        idCountMap.set(normalizedRep, (idCountMap.get(normalizedRep) || 0) + 1);
      }
    }
  }

  const pickMostFrequentRep = (counts: Map<string, number>): string | null => {
    let selected: string | null = null;
    let max = -1;
    for (const [rep, count] of counts.entries()) {
      if (count > max) {
        selected = rep;
        max = count;
      }
    }
    return selected;
  };

  return employees.map(emp => {
    const originalRep = emp.Rep;
    if (isGeneralCode(emp.Rep)) {
      const normalizedStore = emp.Store.trim();
      const normalizedId = formatIdNumber(emp['ID Number']);

      if (normalizedId) {
        const storeIdKey = `${normalizedStore}||${normalizedId}`;
        const repFromStoreAndId = storeIdToRep.get(storeIdKey);
        if (repFromStoreAndId) {
          return { ...emp, 'Original Rep': originalRep, Rep: repFromStoreAndId };
        }

        const idCounts = idToRepCounts.get(normalizedId);
        if (idCounts) {
          const bestById = pickMostFrequentRep(idCounts);
          if (bestById) {
            return { ...emp, 'Original Rep': originalRep, Rep: bestById };
          }
        }
      }

      const storeCounts = storeRepCounts.get(normalizedStore);
      if (storeCounts) {
        const bestStoreRep = pickMostFrequentRep(storeCounts);
        if (bestStoreRep) {
          return { ...emp, 'Original Rep': originalRep, Rep: bestStoreRep };
        }
      }
    }
    return { ...emp, 'Original Rep': originalRep };
  });
}

export function parseRouteList(fileBuffer: ArrayBuffer): RawEmployee[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
  const requiredHeaders = ['Employee Code', 'ID Number', 'Store', 'Rep'];
  let data: unknown[][] | null = null;
  let headerRowIndex = -1;
  const headerIndexMap = new Map<string, number>();

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][];
    const candidateHeaderRowIndex = sheetData.findIndex((row) =>
      Array.isArray(row) &&
      requiredHeaders.every((header) =>
        row.some((cell) => String(cell).trim().toUpperCase() === header.toUpperCase())
      )
    );

    if (candidateHeaderRowIndex !== -1) {
      data = sheetData;
      headerRowIndex = candidateHeaderRowIndex;
      const headerRow = sheetData[candidateHeaderRowIndex];
      headerRow.forEach((header, index) => {
        headerIndexMap.set(String(header).trim().toUpperCase(), index);
      });
      break;
    }
  }

  if (!data || headerRowIndex === -1) {
    throw new Error('Could not find a valid header row in Route List');
  }

  const getIndex = (headerName: string): number => {
    const idx = headerIndexMap.get(headerName.toUpperCase());
    if (idx == null) throw new Error(`Missing required column "${headerName}" in Route List`);
    return idx;
  };

  const codeIndex = getIndex('Employee Code');
  const idIndex = getIndex('ID Number');
  const companyIndex = headerIndexMap.get('COMPANY') ?? -1;
  const jobTitleIndex = headerIndexMap.get('JOB TITLE') ?? -1;
  const storeIndex = getIndex('Store');
  const firstNameIndex = headerIndexMap.get('FIRST NAME') ?? -1;
  const lastNameIndex = headerIndexMap.get('LAST NAME') ?? -1;
  const employeeStatusIndex = headerIndexMap.get('EMPLOYEE STATUS') ?? -1;
  const repIndex = getIndex('Rep');

  const employees: RawEmployee[] = [];
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i] as (string | number | null | undefined)[];

    const code = cleanCode(String(row[codeIndex] || ''));
    const store = String(row[storeIndex] || '').trim();
    const rep = String(row[repIndex] || '').trim();
    if (!code || !store || !rep) {
      continue;
    }

    employees.push({
      'Employee Code': code,
      'First Name': firstNameIndex >= 0 ? String(row[firstNameIndex] || '').trim() : '',
      'Last Name': lastNameIndex >= 0 ? String(row[lastNameIndex] || '').trim() : '',
      'Store': store,
      'Rep': rep,
      'Original Rep': rep,
      'Company': companyIndex >= 0 ? String(row[companyIndex] || '').trim() : '',
      'Job Title': jobTitleIndex >= 0 ? String(row[jobTitleIndex] || '').trim() : '',
      'Employee Status': employeeStatusIndex >= 0 ? String(row[employeeStatusIndex] || '').trim() : '',
      'ID Number': formatIdNumber(row[idIndex]),
    });
  }

  return reassignGeneralCodes(employees);
}

export function parseSignedShifts(fileBuffer: ArrayBuffer): RawSignedShift[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
  const requiredHeaders = ['Employee Code', 'Employee Name', 'Store', 'Status', 'Employee ID'];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][];
    const headerRowIndex = rows.findIndex((row) =>
      Array.isArray(row) &&
      requiredHeaders.every((header) =>
        row.some((cell) => String(cell).trim().toUpperCase() === header.toUpperCase())
      )
    );

    if (headerRowIndex === -1) continue;

    const headerRow = rows[headerRowIndex];
    const headerIndexMap = new Map<string, number>();
    headerRow.forEach((header, index) => {
      headerIndexMap.set(String(header).trim().toUpperCase(), index);
    });

    const getIndex = (headerName: string): number => {
      const idx = headerIndexMap.get(headerName.toUpperCase());
      if (idx == null) throw new Error(`Missing required column "${headerName}" in Signed Shifts`);
      return idx;
    };

    const codeIndex = getIndex('Employee Code');
    const nameIndex = getIndex('Employee Name');
    const storeIndex = getIndex('Store');
    const statusIndex = getIndex('Status');
    const idIndex = getIndex('Employee ID');

    const result: RawSignedShift[] = [];
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i] as (string | number | null | undefined)[];
      const employeeCode = cleanCode(String(row[codeIndex] || ''));
      if (!employeeCode) continue;

      result.push({
        'Employee Code': employeeCode,
        'Employee Name': String(row[nameIndex] || '').trim(),
        'Store': String(row[storeIndex] || '').trim(),
        'Status': cleanStatus(String(row[statusIndex] || '')),
        'Employee ID': formatIdNumber(row[idIndex]),
      });
    }

    return result;
  }

  throw new Error('Could not find a valid Signed Shifts sheet with required columns');
}

export function buildSignedLookup(employees: RawEmployee[], signedShifts: RawSignedShift[]): Map<string, boolean> {
  const codeLookup = new Map<string, boolean>();
  for (const s of signedShifts) {
    const normalizedCode = cleanCode(s['Employee Code']);
    if (!normalizedCode) continue;
    const isSigned = cleanStatus(s.Status) === 'Signed';
    const existing = codeLookup.get(normalizedCode) || false;
    codeLookup.set(normalizedCode, existing || isSigned);
  }

  const idLookup = new Map<string, boolean>();
  for (const s of signedShifts) {
    const normalizedId = formatIdNumber(s['Employee ID']);
    if (normalizedId) {
      const isSigned = cleanStatus(s.Status) === 'Signed';
      const existing = idLookup.get(normalizedId) || false;
      idLookup.set(normalizedId, existing || isSigned);
    }
  }

  const result = new Map<string, boolean>();

  for (const emp of employees) {
    const code = cleanCode(emp['Employee Code']);
    const normalizedEmpId = formatIdNumber(emp['ID Number']);

    if (codeLookup.has(code)) {
      result.set(code, codeLookup.get(code)!);
      continue;
    }

    if (normalizedEmpId && idLookup.has(normalizedEmpId)) {
      result.set(code, idLookup.get(normalizedEmpId)!);
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
