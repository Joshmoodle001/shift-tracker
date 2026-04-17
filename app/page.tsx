'use client';

import { useState, useCallback, useEffect } from 'react';
import { DashboardStats } from '@/components/dashboard-stats';
import { Filters } from '@/components/filters';
import { HierarchyView } from '@/components/hierarchy-view';
import { RepProgress, StoreData, EmployeeDetail } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { buildSignedLookup, getRegionFromRep, isCheckersOrShopriteStore } from '@/lib/data-processing';
import { ClipboardCheck, RefreshCw, Shield, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

interface DbEmployee {
  employee_code: string;
  first_name: string;
  last_name: string;
  store: string;
  rep: string;
  original_rep: string;
  company: string;
  job_title: string;
  employee_status: string;
  id_number: string;
}

interface DbSigned {
  employee_code: string;
  employee_name: string;
  store: string;
  status: string;
  id_number: string;
}

const PAGE_SIZE = 1000;

function normalizeEmployeeCode(code: string): string {
  return String(code || '').replace(/\s+/g, '').toUpperCase();
}

function calculateRepProgress(data: StoreData[]): RepProgress[] {
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
        progress: 0,
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

export default function Home() {
  const [storeData, setStoreData] = useState<StoreData[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [reps, setReps] = useState<string[]>([]);
  const [storeNames, setStoreNames] = useState<string[]>([]);
  const [employeeCodes, setEmployeeCodes] = useState<string[]>([]);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetail[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedRep, setSelectedRep] = useState('');
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchAllRows = useCallback(async <T,>(table: string): Promise<T[]> => {
    const rows: T[] = [];
    let from = 0;

    while (true) {
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase.from(table).select('*').range(from, to);
      if (error) throw error;
      if (!data || data.length === 0) break;

      rows.push(...(data as T[]));
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    return rows;
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [employees, signed, uploadRes] = await Promise.all([
        fetchAllRows<DbEmployee>('shift_employees'),
        fetchAllRows<DbSigned>('shift_signed'),
        supabase.from('shift_uploads').select('created_at').order('created_at', { ascending: false }).limit(1),
      ]);

      if (employees.length === 0) {
        setStoreData([]);
        setRegions([]);
        setReps([]);
        setStoreNames([]);
        setEmployeeCodes([]);
        setEmployeeDetails([]);
        setIsLoading(false);
        return;
      }

      const signedLookup = buildSignedLookup(
        employees.map(e => ({
          'Employee Code': e.employee_code,
          'First Name': e.first_name,
          'Last Name': e.last_name,
          'Store': e.store,
          'Rep': e.rep,
          'Original Rep': e.original_rep,
          'Company': e.company,
          'Job Title': e.job_title,
          'Employee Status': e.employee_status,
          'ID Number': e.id_number,
        })),
        signed.map(s => ({
          'Employee Code': s.employee_code,
          'Employee Name': s.employee_name,
          'Store': s.store,
          'Status': String(s.status || '').trim().toUpperCase() === 'SIGNED' ? 'Signed' : 'Not Signed',
          'Employee ID': s.id_number,
        }))
      );

      const details: EmployeeDetail[] = employees.map(e => ({
        employee_code: e.employee_code,
        first_name: e.first_name,
        last_name: e.last_name,
        store: e.store,
        rep: e.rep,
        original_rep: e.original_rep || e.rep,
        job_title: e.job_title,
        employee_status: e.employee_status,
        signed: signedLookup.get(normalizeEmployeeCode(e.employee_code)) ?? false,
      }));
      setEmployeeDetails(details);

      const mergedMap = new Map<string, { signed: number; not_signed: number; codes: string[] }>();
      for (const e of employees) {
        const key = `${e.rep}||${e.store}`;
        const isSigned = signedLookup.get(normalizeEmployeeCode(e.employee_code)) ?? false;
        const existing = mergedMap.get(key);
        if (existing) {
          if (isSigned) existing.signed += 1; else existing.not_signed += 1;
          existing.codes.push(e.employee_code);
        } else {
          mergedMap.set(key, {
            signed: isSigned ? 1 : 0,
            not_signed: isSigned ? 0 : 1,
            codes: [e.employee_code],
          });
        }
      }

      const stores: StoreData[] = [];
      for (const [key, val] of mergedMap.entries()) {
        const [rep, store] = key.split('||');
        stores.push({
          store,
          rep,
          employee_codes: val.codes,
          signed_count: val.signed,
          not_signed_count: val.not_signed,
        });
      }

      const uniqueReps = [...new Set(employees.map(e => e.rep))].sort();
      const uniqueRegions = [...new Set(employees.map(e => getRegionFromRep(e.rep)))].sort();
      const uniqueStores = [...new Set(employees.map(e => e.store))].sort();
      const uniqueCodes = [...new Set(employees.map(e => e.employee_code))].sort();

      setStoreData(stores);
      setRegions(uniqueRegions);
      setReps(uniqueReps);
      setStoreNames(uniqueStores);
      setEmployeeCodes(uniqueCodes);

      if (uploadRes.data && uploadRes.data.length > 0) {
        setLastUpdated(new Date(uploadRes.data[0].created_at).toLocaleString());
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchAllRows]);

  useEffect(() => {
    // Initial data hydration from Supabase on page load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const filteredReps = selectedRegion
    ? reps.filter((rep) => getRegionFromRep(rep) === selectedRegion)
    : reps;

  const filteredData = storeData
    .filter(d => !selectedRegion || getRegionFromRep(d.rep) === selectedRegion)
    .filter(d => !selectedStore || d.store.toLowerCase().includes(selectedStore.toLowerCase()))
    .filter(d => !selectedRep || d.rep === selectedRep)
    .filter(d => {
      if (!selectedEmployeeCode) return true;
      const selectedCode = normalizeEmployeeCode(selectedEmployeeCode);
      return d.employee_codes.some(c => normalizeEmployeeCode(c).includes(selectedCode));
    });

  const filteredEmployeeDetails = employeeDetails
    .filter(e => {
      if (!selectedEmployeeCode) return true;
      const selectedCode = normalizeEmployeeCode(selectedEmployeeCode);
      return normalizeEmployeeCode(e.employee_code).includes(selectedCode);
    });

  const checkersStoreData = filteredData.filter(d => isCheckersOrShopriteStore(d.store));
  const otherStoreData = filteredData.filter(d => !isCheckersOrShopriteStore(d.store));

  const checkersEmployeeDetails = filteredEmployeeDetails.filter(e => isCheckersOrShopriteStore(e.store));
  const otherEmployeeDetails = filteredEmployeeDetails.filter(e => !isCheckersOrShopriteStore(e.store));

  const checkersRepProgress = calculateRepProgress(checkersStoreData);
  const otherRepProgress = calculateRepProgress(otherStoreData);

  const canExport = Boolean(selectedRegion || selectedRep);

  const getReportScope = useCallback(() => {
    const scopedStores = storeData
      .filter((d) => !selectedRegion || getRegionFromRep(d.rep) === selectedRegion)
      .filter((d) => !selectedRep || d.rep === selectedRep);

    const scopedStoreKeys = new Set(scopedStores.map((s) => `${s.rep}||${s.store}`));

    const scopedEmployees = employeeDetails.filter((e) =>
      scopedStoreKeys.has(`${e.rep}||${e.store}`)
    );

    return { scopedStores, scopedEmployees };
  }, [storeData, employeeDetails, selectedRegion, selectedRep]);

  const exportToExcel = useCallback(() => {
    if (!canExport) return;
    const { scopedStores, scopedEmployees } = getReportScope();
    if (scopedStores.length === 0) return;

    const repSummary = calculateRepProgress(scopedStores).map((rep) => ({
      Region: getRegionFromRep(rep.rep),
      Rep: rep.rep,
      'Total Stores': rep.total_stores,
      Signed: rep.signed,
      'Not Signed': rep.not_signed,
      Progress: `${rep.progress}%`,
    }));

    const storeSummary = scopedStores
      .map((store) => {
        const total = store.signed_count + store.not_signed_count;
        const progress = total > 0 ? Math.round((store.signed_count / total) * 100) : 0;
        return {
          Region: getRegionFromRep(store.rep),
          Rep: store.rep,
          Store: store.store,
          Signed: store.signed_count,
          'Not Signed': store.not_signed_count,
          Progress: `${progress}%`,
        };
      })
      .sort((a, b) => a.Rep.localeCompare(b.Rep) || a.Store.localeCompare(b.Store));

    const details = scopedEmployees
      .map((emp) => ({
        Region: getRegionFromRep(emp.rep),
        Rep: emp.rep,
        Store: emp.store,
        'Employee Code': emp.employee_code,
        'Merchandiser Name': `${emp.first_name} ${emp.last_name}`.trim(),
        'Job Title': emp.job_title,
        'Employee Status': emp.employee_status,
        'Sign Status': emp.signed ? 'Signed' : 'Not Signed',
      }))
      .sort((a, b) =>
        a.Rep.localeCompare(b.Rep) ||
        a.Store.localeCompare(b.Store) ||
        a['Merchandiser Name'].localeCompare(b['Merchandiser Name'])
      );

    const workbook = XLSX.utils.book_new();
    const repWs = XLSX.utils.json_to_sheet(repSummary);
    const storeWs = XLSX.utils.json_to_sheet(storeSummary);
    const detailWs = XLSX.utils.json_to_sheet(details);
    repWs['!cols'] = [{ wch: 16 }, { wch: 42 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
    storeWs['!cols'] = [{ wch: 16 }, { wch: 42 }, { wch: 42 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
    detailWs['!cols'] = [{ wch: 16 }, { wch: 42 }, { wch: 42 }, { wch: 16 }, { wch: 30 }, { wch: 22 }, { wch: 18 }, { wch: 14 }];

    XLSX.utils.book_append_sheet(workbook, repWs, 'Rep Summary');
    XLSX.utils.book_append_sheet(workbook, storeWs, 'Store Summary');
    XLSX.utils.book_append_sheet(workbook, detailWs, 'Merchandiser Details');

    const dateTag = new Date().toISOString().slice(0, 10);
    const scopeTag = selectedRep
      ? selectedRep.replace(/[^A-Z0-9]+/gi, '_')
      : (selectedRegion || 'ALL').replace(/[^A-Z0-9]+/gi, '_');
    XLSX.writeFile(workbook, `shift_tracker_report_${scopeTag}_${dateTag}.xlsx`);
  }, [canExport, getReportScope, selectedRegion, selectedRep]);

  const exportToPdf = useCallback(() => {
    if (!canExport) return;
    const { scopedStores, scopedEmployees } = getReportScope();
    if (scopedStores.length === 0) return;

    const repList = calculateRepProgress(scopedStores).sort((a, b) => a.rep.localeCompare(b.rep));
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const sections = repList.map((rep) => {
      const storesForRep = scopedStores
        .filter((store) => store.rep === rep.rep)
        .sort((a, b) => a.store.localeCompare(b.store));

      const storeHtml = storesForRep.map((store) => {
        const emps = scopedEmployees
          .filter((emp) => emp.rep === store.rep && emp.store === store.store)
          .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));

        const employeeRows = emps.map((emp) => `
          <tr>
            <td>${emp.first_name} ${emp.last_name}</td>
            <td>${emp.employee_code}</td>
            <td>${emp.job_title || ''}</td>
            <td>${emp.signed ? 'Signed' : 'Not Signed'}</td>
          </tr>
        `).join('');

        return `
          <div class="store-block">
            <h4>${store.store}</h4>
            <p>Signed: ${store.signed_count} | Not Signed: ${store.not_signed_count}</p>
            <table>
              <thead>
                <tr><th>Merchandiser</th><th>Employee Code</th><th>Job Title</th><th>Status</th></tr>
              </thead>
              <tbody>${employeeRows}</tbody>
            </table>
          </div>
        `;
      }).join('');

      return `
        <section>
          <h2>${rep.rep} (${getRegionFromRep(rep.rep)})</h2>
          <p>Total Stores: ${rep.total_stores} | Signed: ${rep.signed} | Not Signed: ${rep.not_signed} | Progress: ${rep.progress}%</p>
          ${storeHtml}
        </section>
      `;
    }).join('');

    const reportTitle = selectedRep
      ? `Rep Report - ${selectedRep}`
      : `Region Report - ${selectedRegion}`;

    printWindow.document.write(`
      <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #0f172a; }
          h1 { margin-bottom: 4px; }
          h2 { margin-top: 28px; margin-bottom: 8px; }
          h4 { margin: 10px 0 4px; }
          p { margin: 4px 0 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #f1f5f9; }
          .meta { color: #475569; margin-bottom: 18px; }
          .store-block { margin-bottom: 14px; }
        </style>
      </head>
      <body>
        <h1>${reportTitle}</h1>
        <p class="meta">Generated: ${new Date().toLocaleString()}</p>
        ${sections}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [canExport, getReportScope, selectedRegion, selectedRep]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="py-3 sm:py-0 sm:h-16 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <ClipboardCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Shift Tracker</h1>
                <p className="text-xs text-slate-500">Merchandiser Sign-off Dashboard</p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
              {lastUpdated && (
                <span className="text-[11px] sm:text-xs text-slate-500 hidden sm:block">
                  Updated: {lastUpdated}
                </span>
              )}
              <button
                onClick={loadData}
                disabled={isLoading}
                className="text-sm text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-1 shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <Link
                href="/admin"
                className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 flex items-center gap-1 shrink-0"
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
            <p className="text-slate-600">Loading data from database...</p>
          </div>
        ) : storeData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="p-4 bg-slate-100 rounded-full mb-4">
              <ClipboardCheck className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No Data Loaded</h2>
            <p className="text-slate-500 mb-6 text-center max-w-md">
              Upload the Route List and Signed Shifts files via the Admin panel to populate the dashboard.
            </p>
            <Link
              href="/admin"
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700"
            >
              <Shield className="w-4 h-4" />
              Go to Admin
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Checkers/Shoprite Stores
                </h2>
              </div>
              <DashboardStats data={checkersRepProgress} />
            </div>

            <div className="mb-6">
              <DashboardStats data={otherRepProgress} />
            </div>

            <div className="mb-6">
              <Filters
                regions={regions}
                stores={storeNames}
                reps={filteredReps}
                employeeCodes={employeeCodes}
                onRegionFilter={setSelectedRegion}
                onStoreFilter={setSelectedStore}
                onRepFilter={setSelectedRep}
                onEmployeeCodeFilter={setSelectedEmployeeCode}
                selectedRegion={selectedRegion}
                selectedStore={selectedStore}
                selectedRep={selectedRep}
                selectedEmployeeCode={selectedEmployeeCode}
              />
            </div>

            <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Divisional Export Report</p>
                  <p className="text-xs text-slate-500">
                    Select a Region or Rep to enable expanded export (rep &rarr; store &rarr; merchandiser details).
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={exportToExcel}
                    disabled={!canExport}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                      canExport ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Export Excel
                  </button>
                  <button
                    onClick={exportToPdf}
                    disabled={!canExport}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                      canExport ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Export PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <HierarchyView
                repProgress={checkersRepProgress}
                storeData={checkersStoreData}
                employeeDetails={checkersEmployeeDetails}
                title="Rep -> Store -> Employee Hierarchy (Checkers/Shoprite)"
                emptyMessage="No Checkers/Shoprite stores match the current filters."
              />
            </div>

            <div className="mb-6">
              <HierarchyView
                repProgress={otherRepProgress}
                storeData={otherStoreData}
                employeeDetails={otherEmployeeDetails}
                title="Non-Checkers/Shoprite Stores: Rep -> Store -> Employee Hierarchy"
                emptyMessage="No non-Checkers/Shoprite stores match the current filters."
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
