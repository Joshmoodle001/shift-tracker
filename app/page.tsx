'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileUploader } from '@/components/file-uploader';
import { DashboardStats } from '@/components/dashboard-stats';
import { Filters } from '@/components/filters';
import { RepProgressTable } from '@/components/rep-progress-table';
import { StoreDetailTable } from '@/components/store-detail-table';
import { RepProgress, StoreData, EmployeeDetail } from '@/lib/types';
import { parseRouteList, parseSignedShifts, mergeData, getUniqueReps, getUniqueStores, RawEmployee, RawSignedShift } from '@/lib/data-processing';
import { ClipboardCheck, RefreshCw, Upload as UploadIcon } from 'lucide-react';

const STORAGE_KEY = 'shift-tracker-data';

interface PersistedData {
  stores: StoreData[];
  reps: string[];
  storeNames: string[];
  employees: RawEmployee[];
  employeeDetails: EmployeeDetail[];
  timestamp: string;
}

function loadPersistedData(): PersistedData | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

function savePersistedData(data: PersistedData) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function Home() {
  const [storeData, setStoreData] = useState<StoreData[]>([]);
  const [reps, setReps] = useState<string[]>([]);
  const [storeNames, setStoreNames] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedRep, setSelectedRep] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [routeListFile, setRouteListFile] = useState<File | null>(null);
  const [signedShiftsFile, setSignedShiftsFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<RawEmployee[]>([]);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetail[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const persisted = loadPersistedData();
    if (persisted) {
      setStoreData(persisted.stores);
      setReps(persisted.reps);
      setStoreNames(persisted.storeNames);
      setEmployees(persisted.employees);
      setEmployeeDetails(persisted.employeeDetails || []);
      setLastUpdated(new Date(persisted.timestamp).toLocaleString());
    }
    setInitialized(true);
  }, []);

  const buildStoreData = useCallback((emps: RawEmployee[], signedShifts: Awaited<ReturnType<typeof parseSignedShifts>>) => {
    const merged = mergeData(emps, signedShifts);
    const stores: StoreData[] = [];

    for (const [key, counts] of merged.entries()) {
      const [rep, store] = key.split('||');
      const empCodes = emps
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

    return stores;
  }, []);

  const buildEmployeeDetails = useCallback((emps: RawEmployee[], signedShifts: RawSignedShift[]): EmployeeDetail[] => {
    return emps.map(emp => {
      const signed = signedShifts.find(s => s['Employee Code'] === emp['Employee Code']);
      return {
        employee_code: emp['Employee Code'],
        first_name: emp['First Name'],
        last_name: emp['Last Name'],
        store: emp.Store,
        rep: emp.Rep,
        job_title: emp['Job Title'],
        employee_status: emp['Employee Status'],
        signed: signed?.Status === 'Signed'
      };
    });
  }, []);

  const processFiles = useCallback(async (routeFile: File | null, signedFile: File | null) => {
    setIsProcessing(true);
    setError('');

    try {
      let emps = employees;

      if (routeFile) {
        const buffer = await routeFile.arrayBuffer();
        emps = parseRouteList(buffer);
        setEmployees(emps);
      }

      if (emps.length === 0) {
        setError('No Checkers/Shoprite employees found. Upload the Route List first.');
        setIsProcessing(false);
        return;
      }

      let signedShifts: Awaited<ReturnType<typeof parseSignedShifts>> = [];
      if (signedFile) {
        const buffer = await signedFile.arrayBuffer();
        signedShifts = parseSignedShifts(buffer);
      }

      const stores = buildStoreData(emps, signedShifts);
      const details = buildEmployeeDetails(emps, signedShifts);
      const uniqueReps = getUniqueReps(emps);
      const uniqueStoreNames = getUniqueStores(emps);
      const timestamp = new Date().toISOString();

      setStoreData(stores);
      setEmployeeDetails(details);
      setReps(uniqueReps);
      setStoreNames(uniqueStoreNames);
      setLastUpdated(new Date(timestamp).toLocaleString());

      savePersistedData({
        stores,
        reps: uniqueReps,
        storeNames: uniqueStoreNames,
        employees: emps,
        employeeDetails: details,
        timestamp
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process files');
    } finally {
      setIsProcessing(false);
    }
  }, [employees, buildStoreData, buildEmployeeDetails]);

  const filteredData = storeData
    .filter(d => !selectedStore || d.store.toLowerCase().includes(selectedStore.toLowerCase()))
    .filter(d => !selectedRep || d.rep === selectedRep);

  const repProgress: RepProgress[] = (() => {
    const repMap = new Map<string, RepProgress>();
    for (const d of filteredData) {
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
  })();

  if (!initialized) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <ClipboardCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Shift Tracker</h1>
                <p className="text-xs text-slate-500">Merchandiser Sign-off Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdated && (
                <span className="text-xs text-slate-500 hidden sm:block">
                  Updated: {lastUpdated}
                </span>
              )}
              {storeData.length > 0 && (
                <button
                  onClick={() => {
                    localStorage.removeItem(STORAGE_KEY);
                    setRouteListFile(null);
                    setSignedShiftsFile(null);
                    setStoreData([]);
                    setReps([]);
                    setStoreNames([]);
                    setEmployees([]);
                    setEmployeeDetails([]);
                    setSelectedStore('');
                    setSelectedRep('');
                    setLastUpdated('');
                    setError('');
                  }}
                  className="text-sm text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {storeData.length === 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <UploadIcon className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900">Upload Data Files</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Route List (Store Universe) <span className="text-red-500">*</span>
                  </label>
                  <FileUploader
                    onUpload={(file) => setRouteListFile(file)}
                    label="Upload Route List Excel"
                    currentFile={routeListFile?.name}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Contains employee codes, stores, and rep assignments
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Signed Shifts (Addendum B)
                  </label>
                  <FileUploader
                    onUpload={(file) => setSignedShiftsFile(file)}
                    label="Upload Signed Shifts Excel"
                    currentFile={signedShiftsFile?.name}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Contains signed/not signed status per employee
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => processFiles(routeListFile, signedShiftsFile)}
                  disabled={isProcessing || !routeListFile}
                  className={`
                    flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm text-white
                    ${isProcessing || !routeListFile
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                    }
                  `}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="w-4 h-4" />
                      Process Files
                    </>
                  )}
                </button>
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {storeData.length > 0 && (
          <div className="mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 shrink-0">
                  <UploadIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-slate-700">Upload New Signed Docs:</span>
                </div>
                <div className="flex-1 min-w-[300px] max-w-lg">
                  <FileUploader
                    onUpload={async (file) => {
                      setSignedShiftsFile(file);
                      await processFiles(null, file);
                    }}
                    label="Upload new signed shifts Excel"
                    currentFile={signedShiftsFile?.name}
                  />
                </div>
                {isProcessing && (
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                )}
              </div>
            </div>
          </div>
        )}

        {storeData.length > 0 && (
          <>
            <div className="mb-6">
              <DashboardStats data={repProgress} />
            </div>

            <div className="mb-6">
              <Filters
                stores={storeNames}
                reps={reps}
                onStoreFilter={setSelectedStore}
                onRepFilter={setSelectedRep}
                selectedStore={selectedStore}
                selectedRep={selectedRep}
              />
            </div>

            <div className="mb-6">
              <RepProgressTable data={repProgress} employeeDetails={employeeDetails} />
            </div>

            <div className="mb-6">
              <StoreDetailTable data={filteredData} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}