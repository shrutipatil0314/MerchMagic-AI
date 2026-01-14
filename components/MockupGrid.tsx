
import React from 'react';
import { Mockup } from '../types';
import { ICONS } from '../constants';

interface MockupGridProps {
  mockups: Mockup[];
  onSelect: (mockup: Mockup) => void;
  onRetry: (mockup: Mockup) => void;
}

const MockupGrid: React.FC<MockupGridProps> = ({ mockups, onSelect, onRetry }) => {
  if (mockups.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {mockups.map((mockup) => (
        <div 
          key={mockup.id} 
          className={`group bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-300 ${
            mockup.status === 'ready' 
            ? 'hover:shadow-2xl hover:shadow-indigo-100 dark:hover:shadow-indigo-900/20 hover:-translate-y-2 cursor-pointer' 
            : 'cursor-default'
          }`}
          onClick={() => mockup.status === 'ready' && onSelect(mockup)}
        >
          <div className="relative aspect-square bg-[#F8FAFC] dark:bg-slate-800/50 flex items-center justify-center overflow-hidden">
            {mockup.status === 'queued' && (
              <div className="flex flex-col items-center gap-4 p-8 text-center">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-700 animate-pulse">
                  <ICONS.Magic />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">In Queue</p>
                  <p className="text-[10px] text-slate-300 dark:text-slate-700 mt-1 font-medium">Waiting for designer...</p>
                </div>
              </div>
            )}

            {mockup.status === 'generating' && (
              <div className="flex flex-col items-center gap-6 p-8 w-full text-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900/50 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <ICONS.Magic />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest animate-pulse">Rendering {mockup.type}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Applying logo fabric dynamics...</p>
                </div>
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent animate-shimmer" />
              </div>
            )}

            {mockup.status === 'error' && (
              <div className="text-center p-8 space-y-4">
                <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-400 dark:text-red-500 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-50 dark:ring-red-900/10">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Generation Failed</p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetry(mockup);
                    }}
                    className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-full transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {mockup.status === 'ready' && (
              <>
                <img 
                  src={mockup.imageUrl} 
                  alt={mockup.type} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                  <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-6 py-3 rounded-2xl text-sm font-black shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 flex items-center gap-3">
                    <ICONS.Magic />
                    Customize
                  </div>
                </div>
                <div className="absolute top-4 left-4">
                  <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1 rounded-full border border-white/20 dark:border-slate-800/50 shadow-sm flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Studio Ready</span>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 flex justify-between items-center border-t border-slate-50 dark:border-slate-800 relative">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-sm tracking-tight">{mockup.type}</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Photorealistic Mockup</p>
            </div>
            {mockup.status === 'ready' && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const link = document.createElement('a');
                  link.href = mockup.imageUrl;
                  link.download = `mockup-${mockup.type.toLowerCase().replace(/\s+/g, '-')}.png`;
                  link.click();
                }}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800"
                title="Download Mockup"
              >
                <ICONS.Download />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MockupGrid;
