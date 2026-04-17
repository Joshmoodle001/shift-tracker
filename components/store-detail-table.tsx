'use client';

import { StoreData } from '@/lib/types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface StoreDetailTableProps {
  data: StoreData[];
}

export function StoreDetailTable({ data }: StoreDetailTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: keyof StoreData; direction: 'asc' | 'desc' }>({
    key: 'store',
    direction: 'asc'
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

  const handleSort = (key: keyof StoreData) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ column }: { column: keyof StoreData }) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">Store Details</h3>
        <p className="text-sm text-slate-500 mt-1">{data.length} stores shown</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('store')}
              >
                <div className="flex items-center gap-1">Store <SortIcon column="store" /></div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('rep')}
              >
                <div className="flex items-center gap-1">Rep <SortIcon column="rep" /></div>
              </th>
              <th
                className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('signed_count')}
              >
                <div className="flex items-center justify-center gap-1">Signed <SortIcon column="signed_count" /></div>
              </th>
              <th
                className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('not_signed_count')}
              >
                <div className="flex items-center justify-center gap-1">Not Signed <SortIcon column="not_signed_count" /></div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Employees
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedData.map((store, i) => {
              const total = store.signed_count + store.not_signed_count;
              const progress = total > 0 ? Math.round((store.signed_count / total) * 100) : 0;
              return (
                <tr key={`${store.store}-${store.rep}-${i}`} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm text-slate-900 max-w-xs">
                    <div className="font-medium">{store.store}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{store.rep}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {store.signed_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {store.not_signed_count}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden min-w-[60px]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            progress >= 80 ? 'bg-green-500' :
                            progress >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-10 text-right">{progress}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <div className="py-12 text-center text-slate-500">
          No stores match your filters.
        </div>
      )}
    </div>
  );
}