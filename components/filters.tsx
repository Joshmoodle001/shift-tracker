'use client';

import { Search, X, Filter } from 'lucide-react';
import { useState } from 'react';

interface FiltersProps {
  stores: string[];
  reps: string[];
  employeeCodes: string[];
  onStoreFilter: (store: string) => void;
  onRepFilter: (rep: string) => void;
  onEmployeeCodeFilter: (code: string) => void;
  selectedStore: string;
  selectedRep: string;
  selectedEmployeeCode: string;
}

export function Filters({
  stores,
  reps,
  employeeCodes,
  onStoreFilter,
  onRepFilter,
  onEmployeeCodeFilter,
  selectedStore,
  selectedRep,
  selectedEmployeeCode
}: FiltersProps) {
  const [storeSearch, setStoreSearch] = useState('');
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [codeSearch, setCodeSearch] = useState('');
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);

  const filteredStores = storeSearch
    ? stores.filter(s => s.toLowerCase().includes(storeSearch.toLowerCase()))
    : stores;

  const filteredCodes = codeSearch
    ? employeeCodes.filter(c => c.toLowerCase().includes(codeSearch.toLowerCase()))
    : employeeCodes.slice(0, 50);

  const clearFilters = () => {
    onStoreFilter('');
    onRepFilter('');
    onEmployeeCodeFilter('');
    setStoreSearch('');
    setCodeSearch('');
  };

  const hasFilters = selectedStore || selectedRep || selectedEmployeeCode;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-slate-600" />
        <h3 className="font-semibold text-slate-900">Filters</h3>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="ml-auto text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Store Search */}
        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Search Store
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Type store name..."
              value={storeSearch}
              onChange={(e) => {
                setStoreSearch(e.target.value);
                setShowStoreDropdown(true);
              }}
              onFocus={() => setShowStoreDropdown(true)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {selectedStore && (
              <button
                onClick={() => {
                  onStoreFilter('');
                  setStoreSearch('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {showStoreDropdown && storeSearch && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredStores.length > 0 ? (
                filteredStores.map(store => (
                  <button
                    key={store}
                    onClick={() => {
                      onStoreFilter(store);
                      setStoreSearch(store);
                      setShowStoreDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                  >
                    {store}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-slate-500">No stores found</div>
              )}
            </div>
          )}
        </div>

        {/* Employee Code Search */}
        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Employee Code
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Type employee code..."
              value={codeSearch}
              onChange={(e) => {
                setCodeSearch(e.target.value);
                setShowCodeDropdown(true);
                onEmployeeCodeFilter(e.target.value);
              }}
              onFocus={() => setShowCodeDropdown(true)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {selectedEmployeeCode && (
              <button
                onClick={() => {
                  onEmployeeCodeFilter('');
                  setCodeSearch('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {showCodeDropdown && codeSearch && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredCodes.length > 0 ? (
                filteredCodes.map(code => (
                  <button
                    key={code}
                    onClick={() => {
                      onEmployeeCodeFilter(code);
                      setCodeSearch(code);
                      setShowCodeDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0 font-mono"
                  >
                    {code}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-slate-500">No codes found</div>
              )}
            </div>
          )}
        </div>

        {/* Rep Filter */}
        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Filter by Rep
          </label>
          <div className="relative">
            <select
              value={selectedRep}
              onChange={(e) => {
                onRepFilter(e.target.value);
              }}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white cursor-pointer"
            >
              <option value="">All Reps</option>
              {reps.map(rep => (
                <option key={rep} value={rep}>{rep}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}