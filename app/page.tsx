'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileUploader } from '@/components/file-uploader';
import { DashboardStats } from '@/components/dashboard-stats';
import { Filters } from '@/components/filters';
import { RepProgressTable } from '@/components/rep-progress-table';
import { StoreDetailTable } from '@/components/store-detail-table';
import { RepProgress, StoreData, EmployeeDetail } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { ClipboardCheck, RefreshCw, Shield, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface DbEmployee {
  employee_code: string;
  first_name: string;
  last_name: string;
  store: string;
  rep: string;
  company: string;
  job_title: string;
  employee_status: string;
}

interface DbSigned {
  employee_code: string;
  employee_name: string;
  store: string;
  status: string;
}

export default function Home() {
  const [storeData, setStoreData] = useState<StoreData[]>([]);
  const [reps, setReps] = useState<string[]>([]);
  const [storeNames, setStoreNames] = useState<string[]>([]);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetail[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedRep, setSelectedRep] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [initialized, setInitialized] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [empRes, signedRes, uploadRes] = await Promise.all([
        supabase.from('shift_employees').select('*'),
        supabase.from('shift_signed').select('*'),
        supabase.from('shift_uploads').select('created_at').order('created_at', { ascending: false }).limit(1),
      ]);

      const employees: DbEmployee[] = empRes.data || [];
      const signed: DbSigned[] = signedRes.data || [];

      if (employees.length === 0) {
        setStoreData([]);
        setReps([]);
        setStoreNames([]);
        setEmployeeDetails([]);
        setIsLoading(false);
        return;
      }

      const signedMap = new Map<string, boolean>();
      for (const s of signed) {
        signedMap.set(s.employee_code, s.status === 'Signed');
      }

      const details: EmployeeDetail[] = employees.map(e => ({
        employee_code: e.employee_code,
        first_name: e.first_name,
        last_name: e.last_name,
        store: e.store,
        rep: e.rep,
        job_title: e.job_title,
        employee_status: e.employee_status,
        signed: signedMap.get(e.employee_code) ?? false,
      }));
      setEmployeeDetails(details);

      const mergedMap = new Map<string, { signed: number; not_signed: number; codes: string[] }>();
      for (const e of employees) {
        const key = `${e.rep}||${e.store}`;
        const isSigned = signedMap.get(e.employee_code) ?? false;
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
      const uniqueStores = [...new Set(employees.map(e => e.store))].sort();

      setStoreData(stores);
      setReps(uniqueReps);
      setStoreNames(uniqueStores);

      if (uploadRes.data && uploadRes.data.length > 0) {
        setLastUpdated(new Date(uploadRes.data[0].created_at).toLocaleString());
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData().then(() => setInitialized(true));
  }, [loadData]);

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
              <button
                onClick={loadData}
                disabled={isLoading}
                className="text-sm text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-1"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <Link
                href="/admin"
                className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 flex items-center gap-1"
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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