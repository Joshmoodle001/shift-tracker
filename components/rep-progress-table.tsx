'use client';

import { RepProgress } from '@/lib/types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface RepProgressTableProps {
  data: RepProgress[];
}

export function RepProgressTable({ data }: RepProgressTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: keyof RepProgress; direction: 'asc' | 'desc' }>({
    key: 'progress',
    direction: 'desc'
  });

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

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">Rep Progress</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
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
            {sortedData.map((rep) => (
              <tr key={rep.rep} className="hover:bg-slate-50">
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
            ))}
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