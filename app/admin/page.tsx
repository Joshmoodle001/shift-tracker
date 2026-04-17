'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { parseRouteList, parseSignedShifts, RawEmployee, RawSignedShift, isCheckersOrShopriteStore } from '@/lib/data-processing';
import { FileUploader } from '@/components/file-uploader';
import { Shield, RefreshCw, ArrowLeft, Upload, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
import Link from 'next/link';

const ADMIN_PASSCODE = '1234';

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [routeListFile, setRouteListFile] = useState<File | null>(null);
  const [signedShiftsFile, setSignedShiftsFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadHistory, setUploadHistory] = useState<{ id: number; file_name: string; file_type: string; record_count: number; created_at: string }[]>([]);
  const [stats, setStats] = useState({ employees: 0, signed: 0, uploads: 0 });

  const loadUploadHistory = useCallback(async () => {
    const { data } = await supabase
      .from('shift_uploads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setUploadHistory(data);

    const [empRes, signedRes, uploadRes] = await Promise.all([
      supabase.from('shift_employees').select('id', { count: 'exact', head: true }),
      supabase.from('shift_signed').select('id', { count: 'exact', head: true }),
      supabase.from('shift_uploads').select('id', { count: 'exact', head: true }),
    ]);
    setStats({
      employees: empRes.count || 0,
      signed: signedRes.count || 0,
      uploads: uploadRes.count || 0,
    });
  }, []);

  const handleLogin = () => {
    if (passcode === ADMIN_PASSCODE) {
      setAuthenticated(true);
      setPasscodeError('');
      loadUploadHistory();
    } else {
      setPasscodeError('Invalid passcode');
    }
  };

  const processFiles = useCallback(async (routeFile: File | null, signedFile: File | null) => {
    setIsProcessing(true);
    setMessage(null);

    try {
      const CHUNK = 500;

      const deleteAll = async (table: string) => {
        let deleted = true;
        while (deleted) {
          const { error, count } = await supabase.from(table).delete().neq('id', 0).select('id');
          if (error) throw new Error(`Failed to clear ${table}: ${error.message}`);
          deleted = (count ?? 0) > 0;
        }
      };

      if (routeFile) {
        let buffer: ArrayBuffer;
        try {
          buffer = await routeFile.arrayBuffer();
        } catch (readErr) {
          throw new Error('Failed to read route list file: ' + (readErr instanceof Error ? readErr.message : String(readErr)));
        }

        let employees: RawEmployee[];
        try {
          employees = parseRouteList(buffer);
        } catch (parseErr) {
          throw new Error('Failed to parse route list: ' + (parseErr instanceof Error ? parseErr.message : String(parseErr)));
        }

        if (employees.length === 0) {
          setMessage({ type: 'error', text: 'No employees found in the route list.' });
          setIsProcessing(false);
          return;
        }

        const uniqueStores = [...new Set(employees.map(e => e.Store))].length;
        const checkersOrShopriteStores = [...new Set(
          employees.filter(e => isCheckersOrShopriteStore(e.Store)).map(e => e.Store)
        )].length;
        const otherStores = uniqueStores - checkersOrShopriteStores;
        const reassigned = employees.filter(e => e['Original Rep'] !== e.Rep).length;
        const reassignedNote = reassigned > 0 ? ` (${reassigned} reassigned from general codes like HOLD/MATERNITY/ILL HEALTH)` : '';

        console.log('Route list parsed:', employees.length, 'employees,', uniqueStores, 'unique stores');

        await deleteAll('shift_employees');

        const rows = employees.map(e => ({
          employee_code: e['Employee Code'],
          first_name: e['First Name'],
          last_name: e['Last Name'],
          store: e.Store,
          rep: e.Rep,
          original_rep: e['Original Rep'] || e.Rep,
          company: e.Company,
          job_title: e['Job Title'],
          employee_status: e['Employee Status'],
          id_number: e['ID Number'] || '',
        }));

        for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK);
          const { error: insertError } = await supabase.from('shift_employees').insert(chunk);
          if (insertError) throw new Error(`Insert employees failed (batch ${Math.floor(i / CHUNK) + 1}): ${insertError.message}`);
        }

        const { error: uploadErr } = await supabase.from('shift_uploads').insert({
          file_name: routeFile.name,
          file_type: 'route_list',
          record_count: employees.length,
        });
        if (uploadErr) console.warn('Upload log error:', uploadErr.message);

        setMessage({
          type: 'success',
          text: `Route list uploaded: ${employees.length} employees, ${uniqueStores} unique stores (${checkersOrShopriteStores} Checkers/Shoprite, ${otherStores} other stores)${reassignedNote}.`,
        });
      }

      if (signedFile) {
        let buffer: ArrayBuffer;
        try {
          buffer = await signedFile.arrayBuffer();
        } catch (readErr) {
          throw new Error('Failed to read signed shifts file: ' + (readErr instanceof Error ? readErr.message : String(readErr)));
        }

        let signedShifts: RawSignedShift[];
        try {
          signedShifts = parseSignedShifts(buffer);
        } catch (parseErr) {
          throw new Error('Failed to parse signed shifts: ' + (parseErr instanceof Error ? parseErr.message : String(parseErr)));
        }

        if (signedShifts.length === 0) {
          setMessage({ type: 'error', text: 'No signed shifts found in the file.' });
          setIsProcessing(false);
          return;
        }

        await deleteAll('shift_signed');

        const rows = signedShifts.map(s => ({
          employee_code: s['Employee Code'],
          employee_name: s['Employee Name'],
          store: s.Store,
          status: s.Status,
          submitted_by: '',
          date: '',
          department: '',
          hours: 0,
          id_number: s['Employee ID'] || '',
        }));

        for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK);
          const { error: insertError } = await supabase.from('shift_signed').insert(chunk);
          if (insertError) throw new Error(`Insert signed failed (batch ${Math.floor(i / CHUNK) + 1}): ${insertError.message}`);
        }

        await supabase.from('shift_uploads').insert({
          file_name: signedFile.name,
          file_type: 'signed_shifts',
          record_count: signedShifts.length,
        });

        setMessage({ type: 'success', text: `Signed shifts uploaded: ${signedShifts.length} records imported.` });
      }

      await loadUploadHistory();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process files';
      console.error('Upload error:', err);
      setMessage({ type: 'error', text: msg });
    } finally {
      setIsProcessing(false);
    }
  }, [loadUploadHistory]);

  const clearAllData = useCallback(async () => {
    if (!confirm('Are you sure you want to delete ALL data from the database?')) return;
    setIsProcessing(true);
    const deleteAll = async (table: string) => {
      let deleted = true;
      while (deleted) {
        const { count } = await supabase.from(table).delete().neq('id', 0).select('id');
        deleted = (count ?? 0) > 0;
      }
    };
    await deleteAll('shift_employees');
    await deleteAll('shift_signed');
    await deleteAll('shift_uploads');
    setMessage({ type: 'success', text: 'All data cleared.' });
    loadUploadHistory();
    setIsProcessing(false);
  }, [loadUploadHistory]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 w-full max-w-sm mx-3">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="p-3 bg-blue-600 rounded-full">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Admin Access</h1>
            <p className="text-sm text-slate-500">Enter passcode to continue</p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              value={passcode}
              onChange={(e) => { setPasscode(e.target.value); setPasscodeError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Enter passcode"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-center text-lg tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {passcodeError && (
              <p className="text-sm text-red-600 text-center">{passcodeError}</p>
            )}
            <button
              onClick={handleLogin}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Enter
            </button>
          </div>
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-700">
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="py-3 sm:py-0 sm:h-16 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Admin Panel</h1>
                <p className="text-xs text-slate-500">Upload & manage shift data</p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <Link
                href="/"
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Link>
              <button
                onClick={() => { setAuthenticated(false); setPasscode(''); }}
                className="text-sm text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100"
              >
                Lock
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-2xl font-bold text-slate-900">{stats.employees}</p>
            <p className="text-sm text-slate-500">Employees in DB</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-2xl font-bold text-slate-900">{stats.signed}</p>
            <p className="text-sm text-slate-500">Signed Records</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-2xl font-bold text-slate-900">{stats.uploads}</p>
            <p className="text-sm text-slate-500">Uploads</p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Upload className="w-5 h-5 text-blue-600" />
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
                Replaces all existing employee data. Includes Checkers/Shoprite and other stores.
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
                Replaces all existing signed shift data.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => processFiles(routeListFile, signedShiftsFile)}
              disabled={isProcessing || (!routeListFile && !signedShiftsFile)}
              className={`
                flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm text-white w-full sm:w-auto
                ${isProcessing || (!routeListFile && !signedShiftsFile)
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
                  <Upload className="w-4 h-4" />
                  Upload to Database
                </>
              )}
            </button>
            <button
              onClick={clearAllData}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm text-red-600 border border-red-200 hover:bg-red-50 w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Data
            </button>
          </div>
          {message && (
            <div className={`mt-4 flex items-center gap-2 px-4 py-3 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              <span className="text-sm">{message.text}</span>
            </div>
          )}
        </div>

        {/* Upload History */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Upload History</h3>
          </div>
          {uploadHistory.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {uploadHistory.map((upload) => (
                <div key={upload.id} className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className={`p-1.5 rounded ${upload.file_type === 'route_list' ? 'bg-purple-100' : 'bg-green-100'}`}>
                    <Upload className={`w-4 h-4 ${upload.file_type === 'route_list' ? 'text-purple-600' : 'text-green-600'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{upload.file_name}</p>
                    <p className="text-xs text-slate-500">
                      {upload.file_type === 'route_list' ? 'Route List' : 'Signed Shifts'} &middot; {upload.record_count} records
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 sm:text-right">
                    {new Date(upload.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-sm">No uploads yet</div>
          )}
        </div>
      </main>
    </div>
  );
}
