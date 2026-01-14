
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { Mockup } from './types';
import { PRODUCT_TEMPLATES, ICONS } from './constants';
import { geminiService } from './services/geminiService';
import LogoUpload from './components/LogoUpload';
import MockupGrid from './components/MockupGrid';
import MockupEditor from './components/MockupEditor';

const CONCURRENCY_LIMIT = 2;

const App: React.FC = () => {
  const [logo, setLogo] = useState<string | null>(null);
  const [mockups, setMockups] = useState<Mockup[]>([]);
  const [selectedMockup, setSelectedMockup] = useState<Mockup | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Theme state
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const stats = useMemo(() => {
    const total = mockups.length;
    const ready = mockups.filter(m => m.status === 'ready').length;
    const errors = mockups.filter(m => m.status === 'error').length;
    const progress = total > 0 ? Math.round(((ready + errors) / total) * 100) : 0;
    return { total, ready, errors, progress };
  }, [mockups]);

  const generateSingleMockup = async (id: string, logo: string, prompt: string) => {
    setMockups(prev => prev.map(m => m.id === id ? { ...m, status: 'generating' } : m));
    try {
      const resultUrl = await geminiService.generateMockup(logo, prompt);
      setMockups(prev => prev.map(m => m.id === id ? { ...m, imageUrl: resultUrl, status: 'ready' } : m));
    } catch (err) {
      console.error(`Error generating mockup ${id}:`, err);
      setMockups(prev => prev.map(m => m.id === id ? { ...m, status: 'error' } : m));
    }
  };

  const generateAllMockups = async () => {
    if (!logo || isGeneratingAll) return;

    setIsGeneratingAll(true);
    
    // 1. Initialize all as queued
    const initialMockups: Mockup[] = PRODUCT_TEMPLATES.map((t, idx) => ({
      id: `m-${idx}-${Date.now()}`,
      type: t.name,
      imageUrl: '',
      originalPrompt: t.prompt,
      status: 'queued'
    }));
    setMockups(initialMockups);

    // 2. Process in chunks to balance speed and rate limits
    const queue = [...initialMockups];
    const workers = Array(CONCURRENCY_LIMIT).fill(null).map(async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) {
          await generateSingleMockup(item.id, logo, item.originalPrompt);
        }
      }
    });

    await Promise.all(workers);
    setIsGeneratingAll(false);
  };

  const handleBatchExport = async () => {
    const readyMockups = mockups.filter(m => m.status === 'ready');
    if (readyMockups.length === 0) return;

    setIsExporting(true);
    try {
      const zip = new JSZip();
      for (const mockup of readyMockups) {
        const base64Data = mockup.imageUrl.split(',')[1];
        const fileName = `${mockup.type.toLowerCase().replace(/\s+/g, '-')}-${mockup.id.slice(-4)}.png`;
        zip.file(fileName, base64Data, { base64: true });
      }
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `merchmagic-suite-${Date.now()}.zip`);
    } catch (error) {
      console.error('Batch export failed:', error);
      alert('Failed to generate zip file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRetry = (mockup: Mockup) => {
    if (!logo) return;
    generateSingleMockup(mockup.id, logo, mockup.originalPrompt);
  };

  const handleUpdateMockup = (newImageUrl: string) => {
    if (!selectedMockup) return;
    const updated = { ...selectedMockup, imageUrl: newImageUrl, draftPrompt: '' };
    setMockups(prev => prev.map(m => m.id === selectedMockup.id ? updated : m));
    setSelectedMockup(updated);
  };

  const handleDraftChange = (id: string, draft: string) => {
    setMockups(prev => prev.map(m => m.id === id ? { ...m, draftPrompt: draft } : m));
  };

  return (
    <div className="min-h-screen pb-20 bg-[#F9FAFB] dark:bg-slate-950 transition-colors duration-300">
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 ring-2 ring-indigo-50 dark:ring-indigo-900/20">
              <ICONS.Magic />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
                MerchMagic <span className="text-indigo-600">AI</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Mockup Lab</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {stats.total > 0 && (
                <div className="hidden md:flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-100 dark:border-slate-700">
                  <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-500" 
                      style={{ width: `${stats.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{stats.progress}% Complete</span>
                </div>
             )}
            
            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDark ? <ICONS.Sun /> : <ICONS.Moon />}
            </button>

            <button className="hidden sm:block bg-slate-900 dark:bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all shadow-lg shadow-slate-200 dark:shadow-indigo-900/20">
              Sign In
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 mt-12">
        <header className="text-center mb-16 space-y-4">
          <div className="inline-block px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full border border-indigo-100 dark:border-indigo-800 uppercase tracking-wider">
            Powered by Gemini 2.5 Flash
          </div>
          <h2 className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
            Turn your brand into <br />
            <span className="text-indigo-600 italic">tangible</span> magic.
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">
            Generate a full product line in seconds. High resolution, 
            studio quality, and ready to share.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-6">
            <LogoUpload onUpload={setLogo} logo={logo} />

            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl shadow-slate-100 dark:shadow-none border border-slate-100 dark:border-slate-800 ring-1 ring-slate-50 dark:ring-slate-800">
              <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <ICONS.Magic />
                </div>
                The Studio
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">
                Our AI will apply your logo to {PRODUCT_TEMPLATES.length} products with realistic textures and lighting.
              </p>
              
              <button 
                onClick={generateAllMockups}
                disabled={!logo || isGeneratingAll}
                className={`w-full py-4 rounded-2xl font-black text-lg shadow-2xl transition-all flex items-center justify-center gap-3 relative overflow-hidden group ${
                  !logo || isGeneratingAll 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-300 hover:-translate-y-1 active:translate-y-0'
                }`}
              >
                {isGeneratingAll ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="relative z-10">Processing {stats.ready}/{stats.total}</span>
                  </>
                ) : (
                  <>
                    <ICONS.Magic />
                    <span className="relative z-10">Generate Suite</span>
                  </>
                )}
                {isGeneratingAll && (
                  <div 
                    className="absolute bottom-0 left-0 h-1 bg-white/20 transition-all duration-500" 
                    style={{ width: `${stats.progress}%` }}
                  />
                )}
              </button>
              
              {isGeneratingAll && (
                <div className="mt-4 flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">AI Worker active</p>
                  <div className="flex justify-center gap-1">
                    {mockups.map((m, i) => (
                      <div 
                        key={i} 
                        className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                          m.status === 'ready' ? 'bg-indigo-500' : 
                          m.status === 'generating' ? 'bg-indigo-300 animate-pulse' : 
                          m.status === 'error' ? 'bg-red-400' : 'bg-slate-200 dark:bg-slate-700'
                        }`} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-900 dark:bg-indigo-950 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <ICONS.Magic />
               </div>
               <h3 className="text-xl font-bold mb-4 relative z-10">Ready for print?</h3>
               <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium relative z-10">
                 All generated images are optimized for social media and basic web usage. Subscribe to unlock 4K vector exports.
               </p>
               <button className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors relative z-10">
                 Upgrade to Pro
               </button>
            </div>
          </div>

          <div className="lg:col-span-8 min-h-[500px]">
            {mockups.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] bg-white dark:bg-slate-900/50 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900 group">
                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-200 dark:text-slate-700 mb-8 ring-8 ring-slate-50 dark:ring-slate-900 group-hover:ring-indigo-50 dark:group-hover:ring-indigo-900/30 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 group-hover:text-indigo-400 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Your Studio is Empty</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm font-medium">Upload your brand logo and click "Generate Suite" to see the magic happen.</p>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Active Suite</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Batch processing enabled ({CONCURRENCY_LIMIT} concurrent workers)</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {stats.ready > 0 && (
                      <button 
                        onClick={handleBatchExport}
                        disabled={isExporting}
                        className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-indigo-100 dark:border-indigo-800 shadow-sm disabled:opacity-50"
                      >
                        {isExporting ? (
                          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <ICONS.Archive />
                        )}
                        {isExporting ? 'Zipping...' : `Export All (${stats.ready})`}
                      </button>
                    )}
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Progress</p>
                      <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 leading-tight">{stats.progress}%</p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl border-4 border-slate-100 dark:border-slate-800 flex items-center justify-center relative">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100 dark:text-slate-800" />
                        <circle 
                          cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" 
                          strokeDasharray={176} strokeDashoffset={176 - (176 * stats.progress) / 100}
                          className="text-indigo-600 dark:text-indigo-500 transition-all duration-1000" 
                        />
                      </svg>
                      <span className="absolute text-[10px] font-bold text-slate-700 dark:text-slate-300">{stats.ready}/{stats.total}</span>
                    </div>
                  </div>
                </div>
                
                <MockupGrid 
                  mockups={mockups} 
                  onSelect={setSelectedMockup} 
                  onRetry={handleRetry}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedMockup && (
        <MockupEditor 
          mockup={selectedMockup} 
          onClose={() => setSelectedMockup(null)} 
          onUpdate={handleUpdateMockup}
          onDraftChange={handleDraftChange}
        />
      )}
    </div>
  );
};

export default App;
