'use client';

import { RepProgress, EmployeeDetail } from '@/lib/types';
import { ChevronDown, ChevronUp, ChevronRight, CheckCircle2, XCircle, User } from 'lucide-react';
import { useState } from 'react';

interface RepProgressTableProps {
  data: RepProgress[];
  employeeDetails: EmployeeDetail[];
}

export function RepProgressTable({ data, employeeDetails }: RepProgressTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: keyof RepProgress; direction: 'asc' | 'desc' }>({
    key: 'progress',
    direction: 'desc'
  });
  const [expandedReps, setExpandedReps] = useState<Set<string>>(new Set());

  const toggleRep = (rep: string) => {
    setExpandedReps(prev => {
      const next = new Set(prev);
      if (next.has(rep)) {
        next.delete(rep);
      } else {
        next.add(rep);
      }
      return next;
    });
  };

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortConfig.direction === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const handleSort = (key: keyof RepProgress) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ column }: { column: keyof RepProgress }) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />;
  };

  const getEmployeesForRep = (rep: string): EmployeeDetail[] => {
    return employeeDetails.filter(e => e.rep === rep);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">Rep Progress</h3>
        <p className="text-xs text-slate-500 mt-0.5">Click a rep row to expand and view employees</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 w-10" />
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('rep')}
              >
                <div className="flex items-center gap-1">
                  Rep Name
                  <SortIcon column="rep" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('total_stores')}
              >
                <div className="flex items-center justify-center gap-1">
                  Stores
                  <SortIcon column="total_stores" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('signed')}
              >
                <div className="flex items-center justify-center gap-1">
                  Signed
                  <SortIcon column="signed" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('not_signed')}
              >
                <div className="flex items-center justify-center gap-1">
                  Not Signed
                  <SortIcon column="not_signed" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('progress')}
              >
                <div className="flex items-center justify-center gap-1">
                  Progress
                  <SortIcon column="progress" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedData.map((rep) => {
              const isExpanded = expandedReps.has(rep.rep);
              const repEmployees = isExpanded ? getEmployeesForRep(rep.rep) : [];
              const signedEmployees = repEmployees.filter(e => e.signed);
              const notSignedEmployees = repEmployees.filter(e => !e.signed);

              return (
                <>
                  <tr
                    key={rep.rep}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => toggleRep(rep.rep)}
                  >
                    <td className="px-4 py-4">
                      <div className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {rep.rep}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-slate-600">
                      {rep.total_stores}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {rep.signed}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {rep.not_signed}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              rep.progress >= 80 ? 'bg-green-500' :
                              rep.progress >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${rep.progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-700 w-12 text-right">
                          {rep.progress}%
                        </span>
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr key={`${rep.rep}-detail`} className="bg-slate-50">
                      <td colSpan={6} className="px-6 py-0">
                        <div className="py-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Signed Employees */}
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <h4 className="text-sm font-semibold text-green-800">
                                  Signed ({signedEmployees.length})
                                </h4>
                              </div>
                              {signedEmployees.length > 0 ? (
                                <div className="space-y-1">
                                  {signedEmployees.map(emp => (
                                    <div
                                      key={emp.employee_code}
                                      className="flex items-center gap-3 px-3 py-2 bg-green-50 border border-green-100 rounded-lg"
                                    >
                                      <User className="w-4 h-4 text-green-500 shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">
                                          {emp.first_name} {emp.last_name}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">
                                          {emp.employee_code} &middot; {emp.job_title}
                                        </p>
                                      </div>
                                      <p className="text-xs text-slate-600 shrink-0 max-w-[200px] truncate" title={emp.store}>
                                        {emp.store}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 px-3">No signed employees</p>
                              )}
                            </div>

                            {/* Not Signed Employees */}
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <XCircle className="w-4 h-4 text-red-500" />
                                <h4 className="text-sm font-semibold text-red-800">
                                  Not Signed ({notSignedEmployees.length})
                                </h4>
                              </div>
                              {notSignedEmployees.length > 0 ? (
                                <div className="space-y-1">
                                  {notSignedEmployees.map(emp => (
                                    <div
                                      key={emp.employee_code}
                                      className="flex items-center gap-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg"
                                    >
                                      <User className="w-4 h-4 text-red-400 shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">
                                          {emp.first_name} {emp.last_name}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">
                                          {emp.employee_code} &middot; {emp.job_title}
                                        </p>
                                      </div>
                                      <p className="text-xs text-slate-600 shrink-0 max-w-[200px] truncate" title={emp.store}>
                                        {emp.store}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 px-3">All employees signed!</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <div className="py-12 text-center text-slate-500">
          No data available. Please upload the required Excel files.
        </div>
      )}
    </div>
  );
}