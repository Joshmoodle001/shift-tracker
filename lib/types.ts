export interface Employee {
  id?: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  store: string;
  rep: string;
  company: string;
  job_title: string;
  employee_status: string;
}

export interface SignedShift {
  id?: number;
  employee_code: string;
  employee_name: string;
  store: string;
  status: 'Signed' | 'Not Signed';
  submitted_by: string;
  date: string;
  department: string;
  hours: number;
}

export interface RepProgress {
  rep: string;
  total_stores: number;
  signed: number;
  not_signed: number;
  progress: number;
}

export interface StoreData {
  store: string;
  rep: string;
  employee_codes: string[];
  signed_count: number;
  not_signed_count: number;
}

export function filterByStore(data: StoreData[], searchTerm: string): StoreData[] {
  if (!searchTerm) return data;
  const term = searchTerm.toLowerCase();
  return data.filter(d => d.store.toLowerCase().includes(term));
}

export function filterByRep(data: StoreData[], rep: string): StoreData[] {
  if (!rep) return data;
  return data.filter(d => d.rep === rep);
}

export function groupByRep(data: StoreData[]): RepProgress[] {
  const repMap = new Map<string, RepProgress>();
  
  for (const d of data) {
    const existing = repMap.get(d.rep);
    if (existing) {
      existing.total_stores += 1;
      existing.signed += d.signed_count;
      existing.not_signed += d.not_signed_count;
    } else {
      repMap.set(d.rep, {
        rep: d.rep,
        total_stores: 1,
        signed: d.signed_count,
        not_signed: d.not_signed_count,
        progress: 0
      });
    }
  }
  
  const results = Array.from(repMap.values());
  for (const r of results) {
    const total = r.signed + r.not_signed;
    r.progress = total > 0 ? Math.round((r.signed / total) * 100) : 0;
  }
  
  return results;
}