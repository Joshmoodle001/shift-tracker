import { useState, useCallback } from 'react';
import { Upload, X, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onUpload: (file: File) => void;
  accept?: string;
  label?: string;
  currentFile?: string;
}

export function FileUploader({ 
  onUpload, 
  accept = '.xlsx,.xls', 
  label = 'Upload Excel file',
  currentFile 
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      onUpload(file);
      setUploadStatus('success');
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  }, [onUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      setUploadStatus('success');
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  }, [onUpload]);

  return (
    <div className="w-full">
      {currentFile ? (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="p-2 bg-green-100 rounded-lg">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">{currentFile}</p>
            <p className="text-xs text-green-600">File loaded successfully</p>
          </div>
          {uploadStatus === 'success' && (
            <Check className="w-5 h-5 text-green-600" />
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center transition-all
            ${isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-slate-300 hover:border-slate-400'
            }
          `}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-3">
            <div className={`p-3 rounded-full ${isDragging ? 'bg-blue-100' : 'bg-slate-100'}`}>
              <Upload className={`w-6 h-6 ${isDragging ? 'text-blue-600' : 'text-slate-500'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">{label}</p>
              <p className="text-xs text-slate-500 mt-1">Drag & drop or click to browse</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}