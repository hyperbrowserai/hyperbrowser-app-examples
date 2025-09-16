'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  error: string | null;
}

export default function FileUpload({ onFileUpload, error }: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0]);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/html': ['.html'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
    },
    multiple: false,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  return (
    <div className="space-y-6 flex flex-col items-center">
      <div
        {...getRootProps()}
        className="cursor-pointer"
      >
        <input {...getInputProps()} />
        <button
          type="button"
          className={`flex items-center justify-center space-x-3 px-8 py-4 border border-[#424242] rounded-lg transition-all cursor-pointer ${
            isDragActive ? 'border-[#F0FF26] bg-[#F0FF26]/5' : ''
          }`}
          style={{
            background: 'linear-gradient(90deg, #111011 0%, #222222 100%)'
          }}
        >
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="text-white font-medium">Upload your blood reports</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg max-w-md">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
