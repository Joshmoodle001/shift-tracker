'use client';

import { useState, useCallback } from 'react';
import { FileUploader } from '@/components/file-uploader';
import { DashboardStats } from '@/components/dashboard-stats';
import { Filters } from '@/components/filters';
import { RepProgressTable } from '@/components/rep-progress-table';
import { StoreDetailTable } from '@/components/store-detail-table';
import { RepProgress, StoreData } from '@/lib/types';
import { ClipboardCheck, RefreshCw, Upload as UploadIcon } from 'lucide-react';

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

  const processFiles = useCallback(async (routeFile: File | null, signedFile: File | null, keepExisting = false) => {
    setIsProcessing(true);
    setError('');

    const formData = new FormData();
    if (routeFile) formData.append('routeList', routeFile);
    if (signedFile) formData.append('signedShifts', signedFile);
    if (keepExisting) formData.append('keepExisting', 'true');

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to process files');
      }

      const data = await response.json();
      setStoreData(data.stores);
      setReps(data.reps);
      setStoreNames(data.storeNames);
      setLastUpdated(new Date(data.timestamp).toLocaleString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process files');
    } finally {
      setIsProcessing(false);
    }
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
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
                <span className="text-xs text-slate-500">
                  Updated: {lastUpdated}
                </span>
              )}
              <button
                onClick={() => {
                  setRouteListFile(null);
                  setSignedShiftsFile(null);
                  setStoreData([]);
                  setReps([]);
                  setStoreNames([]);
                  setSelectedStore('');
                  setSelectedRep('');
                  setLastUpdated('');
                  setError('');
                }}
                className="text-sm text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section - shown when no data */}
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

        {/* Upload New Signed Docs - shown when data is loaded */}
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
                      await processFiles(null, file, true);
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

        {/* Dashboard */}
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
              <RepProgressTable data={repProgress} />
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