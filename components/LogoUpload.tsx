
import React, { useRef } from 'react';
import { ICONS } from '../constants';

interface LogoUploadProps {
  onUpload: (base64: string) => void;
  logo: string | null;
}

const LogoUpload: React.FC<LogoUploadProps> = ({ onUpload, logo }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 ring-1 ring-slate-50 dark:ring-slate-800/50">
      <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
        <ICONS.Upload />
        Step 1: Upload Your Logo
      </h2>
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ${
          logo 
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500/50' 
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
      >
        {logo ? (
          <div className="relative group">
            <img src={logo} alt="Uploaded logo" className="max-h-32 rounded-lg shadow-sm bg-white p-2" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
              <span className="text-white text-sm font-medium">Change Logo</span>
            </div>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500">
              <ICONS.Upload />
            </div>
            <div className="text-center">
              <p className="font-medium text-slate-700 dark:text-slate-300">Click to upload logo</p>
              <p className="text-sm text-slate-500 dark:text-slate-500">PNG, JPG or SVG (Max 5MB)</p>
            </div>
          </>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default LogoUpload;
