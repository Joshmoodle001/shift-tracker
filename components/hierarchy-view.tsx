'use client';

import { RepProgress, StoreData, EmployeeDetail } from '@/lib/types';
import { ChevronRight, CheckCircle2, XCircle, User, Store, Users, ArrowRight } from 'lucide-react';
import { useState } from 'react';

interface HierarchyViewProps {
  repProgress: RepProgress[];
  storeData: StoreData[];
  employeeDetails: EmployeeDetail[];
}

export function HierarchyView({ repProgress, storeData, employeeDetails }: HierarchyViewProps) {
  const [expandedReps, setExpandedReps] = useState<Set<string>>(new Set());
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());

  const toggleRep = (rep: string) => {
    setExpandedReps(prev => {
      const next = new Set(prev);
      if (next.has(rep)) {
        next.delete(rep);
        const storeKeysToRemove = storeData
          .filter(s => s.rep === rep)
          .map(s => `${s.rep}||${s.store}`);
        storeKeysToRemove.forEach(k => next.delete(k));
        setExpandedStores(prev2 => {
          const next2 = new Set(prev2);
          storeKeysToRemove.forEach(k => next2.delete(k));
          return next2;
        });
      } else {
        next.add(rep);
      }
      return next;
    });
  };

  const toggleStore = (key: string) => {
    setExpandedStores(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const sortedReps = [...repProgress].sort((a, b) => b.progress - a.progress);

  const getStoresForRep = (rep: string): StoreData[] => {
    return storeData
      .filter(s => s.rep === rep)
      .sort((a, b) => {
        const pA = a.signed_count + a.not_signed_count > 0 ? Math.round((a.signed_count / (a.signed_count + a.not_signed_count)) * 100) : 0;
        const pB = b.signed_count + b.not_signed_count > 0 ? Math.round((b.signed_count / (b.signed_count + b.not_signed_count)) * 100) : 0;
        return pB - pA;
      });
  };

  const getEmployeesForStore = (rep: string, store: string): EmployeeDetail[] => {
    return employeeDetails.filter(e => e.rep === rep && e.store === store);
  };

  const progressBar = (pct: number) => (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden min-w-[60px]">
        <div
          className={`h-full rounded-full transition-all ${
            pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-600 w-10 text-right">{pct}%</span>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-slate-900">Rep &rarr; Store &rarr; Employee Hierarchy</h3>
        <span className="text-xs text-slate-500 ml-2">Click to expand</span>
      </div>

      {sortedReps.length === 0 && (
        <div className="py-12 text-center text-slate-500">No data available.</div>
      )}

      <div className="divide-y divide-slate-200">
        {sortedReps.map(rep => {
          const repOpen = expandedReps.has(rep.rep);
          const stores = getStoresForRep(rep.rep);

          return (
            <div key={rep.rep}>
              {/* Rep Row */}
              <div
                className="flex items-center gap-3 px-6 py-3.5 cursor-pointer hover:bg-slate-50 select-none"
                onClick={() => toggleRep(rep.rep)}
              >
                <div className={`transition-transform ${repOpen ? 'rotate-90' : ''}`}>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{rep.rep}</p>
                  <p className="text-xs text-slate-500">{rep.total_stores} store{rep.total_stores !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {rep.signed} signed
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {rep.not_signed} not signed
                  </span>
                  <div className="w-28">{progressBar(rep.progress)}</div>
                </div>
              </div>

              {/* Expanded: Stores */}
              {repOpen && (
                <div className="bg-slate-50/70">
                  {stores.map((store, si) => {
                    const storeKey = `${store.rep}||${store.store}`;
                    const storeOpen = expandedStores.has(storeKey);
                    const total = store.signed_count + store.not_signed_count;
                    const storePct = total > 0 ? Math.round((store.signed_count / total) * 100) : 0;
                    const emps = getEmployeesForStore(store.rep, store.store);
                    const signedEmps = emps.filter(e => e.signed);
                    const notSignedEmps = emps.filter(e => !e.signed);

                    return (
                      <div key={storeKey} className={si > 0 ? 'border-t border-slate-200' : ''}>
                        {/* Store Row */}
                        <div
                          className="flex items-center gap-3 pl-12 pr-6 py-3 cursor-pointer hover:bg-slate-100/60 select-none"
                          onClick={() => toggleStore(storeKey)}
                        >
                          <div className={`transition-transform ${storeOpen ? 'rotate-90' : ''}`}>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                          <Store className="w-4 h-4 text-blue-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate" title={store.store}>
                              {store.store}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {store.signed_count}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {store.not_signed_count}
                            </span>
                            <div className="w-28">{progressBar(storePct)}</div>
                          </div>
                        </div>

                        {/* Expanded: Employees */}
                        {storeOpen && (
                          <div className="pl-20 pr-6 pb-3">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                              {/* Signed */}
                              <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                  <span className="text-xs font-semibold text-green-800">Signed ({signedEmps.length})</span>
                                </div>
                                {signedEmps.length > 0 ? signedEmps.map(emp => (
                                  <div
                                    key={emp.employee_code + emp.store}
                                    className="flex items-center gap-2 px-3 py-1.5 mb-1 bg-green-50 border border-green-100 rounded-lg"
                                  >
                                    <User className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-slate-900 truncate">
                                        {emp.first_name} {emp.last_name}
                                      </p>
                                      <p className="text-[11px] text-slate-500 truncate">
                                        {emp.employee_code} &middot; {emp.job_title}
                                        {emp.original_rep !== emp.rep && (
                                          <span className="text-amber-600 ml-1">
                                            <ArrowRight className="w-2.5 h-2.5 inline" /> from {emp.original_rep}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                )) : (
                                  <p className="text-[11px] text-slate-400 px-2">None</p>
                                )}
                              </div>

                              {/* Not Signed */}
                              <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                                  <span className="text-xs font-semibold text-red-800">Not Signed ({notSignedEmps.length})</span>
                                </div>
                                {notSignedEmps.length > 0 ? notSignedEmps.map(emp => (
                                  <div
                                    key={emp.employee_code + emp.store}
                                    className="flex items-center gap-2 px-3 py-1.5 mb-1 bg-red-50 border border-red-100 rounded-lg"
                                  >
                                    <User className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-slate-900 truncate">
                                        {emp.first_name} {emp.last_name}
                                      </p>
                                      <p className="text-[11px] text-slate-500 truncate">
                                        {emp.employee_code} &middot; {emp.job_title}
                                        {emp.original_rep !== emp.rep && (
                                          <span className="text-amber-600 ml-1">
                                            <ArrowRight className="w-2.5 h-2.5 inline" /> from {emp.original_rep}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                )) : (
                                  <p className="text-[11px] text-slate-400 px-2">All signed!</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {stores.length === 0 && (
                    <div className="pl-12 py-3 text-sm text-slate-500">No stores for this rep</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}