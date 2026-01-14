
import React, { useState, useRef, useEffect } from 'react';
import { Mockup } from '../types';
import { geminiService } from '../services/geminiService';
import { ICONS } from '../constants';
import saveAs from 'file-saver';

interface MockupEditorProps {
  mockup: Mockup;
  onClose: () => void;
  onUpdate: (newImageUrl: string) => void;
  onDraftChange: (id: string, draft: string) => void;
}

const LIGHTING_PRESETS = [
  { 
    id: 'daylight', 
    name: 'Natural Daylight', 
    icon: <ICONS.Sun />, 
    prompt: 'Transform the scene to bright natural daylight. Sharp, realistic outdoor lighting with natural shadows.' 
  },
  { 
    id: 'studio', 
    name: 'Pro Studio', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
      </svg>
    ),
    prompt: 'Apply professional studio lighting. High-key white background, soft box lighting, clean reflections, and high-end e-commerce aesthetic.' 
  },
  { 
    id: 'evening', 
    name: 'Golden Hour', 
    icon: <ICONS.Moon />, 
    prompt: 'Change lighting to warm golden hour. Long soft shadows, orange-tinted ambient light, atmospheric and moody.' 
  },
  { 
    id: 'neon', 
    name: 'Cyber Neon', 
    icon: <ICONS.Magic />, 
    prompt: 'Add vibrant neon ambient lighting. Cinematic blue and pink rim lights, high contrast, futuristic urban night atmosphere.' 
  }
];

const ROTATION_PRESETS = [
  { id: 'top', name: 'Top View', icon: <ICONS.ArrowUp />, prompt: 'Rotate the product to a top-down flat lay perspective. The logo should still be visible and correctly oriented.' },
  { id: 'bottom', name: 'Bottom View', icon: <ICONS.ArrowDown />, prompt: 'Rotate the product to show the bottom view or a low angle looking up. Maintain logo consistency.' },
  { id: 'left', name: 'Side View (Left)', icon: <ICONS.ArrowLeft />, prompt: 'Show a side profile of the product from the left side. Ensure the logo wraps realistically around the form.' },
  { id: 'right', name: 'Side View (Right)', icon: <ICONS.ArrowRight />, prompt: 'Show a side profile of the product from the right side. Ensure the logo wraps realistically around the form.' },
  { id: 'perspective', name: '3/4 Perspective', icon: <ICONS.Rotate />, prompt: 'Show the product from a dynamic 3/4 perspective angle. Professional high-end product photography style.' },
  { id: 'back', name: 'Back View', icon: <div className="text-[10px] font-black">BACK</div>, prompt: 'Rotate the product 180 degrees to show the back view. If the logo was on the front, it may now be hidden or reflected on the back if appropriate.' }
];

const FILTER_PRESETS = [
  { name: 'None', filter: 'none' },
  { name: 'Grayscale', filter: 'grayscale(1)' },
  { name: 'Sepia', filter: 'sepia(1)' },
  { name: 'Vintage', filter: 'sepia(0.4) contrast(1.2) brightness(1.1) saturate(1.1)' },
  { name: 'Warm', filter: 'sepia(0.2) saturate(1.6) brightness(1.05)' },
  { name: 'Cool', filter: 'saturate(0.8) hue-rotate(10deg) brightness(1.1)' }
];

const BACKGROUND_PRESETS = {
  "Solid Colors": [
    { name: "Pure White", color: "#FFFFFF", prompt: "Replace the background with a solid clean white studio color." },
    { name: "Matte Black", color: "#000000", prompt: "Replace the background with a solid matte black color. Update lighting to match." },
    { name: "Soft Grey", color: "#E5E7EB", prompt: "Replace the background with a soft light grey neutral color." },
    { name: "Sage", color: "#B4BDB1", prompt: "Replace the background with a solid organic sage green color." },
    { name: "Terracotta", color: "#C6715E", prompt: "Replace the background with a solid warm terracotta earthy color." },
    { name: "Soft Pink", color: "#FBCFE8", prompt: "Replace the background with a solid soft aesthetic pink color." },
    { name: "Hot Pink", color: "#EC4899", prompt: "Replace the background with a solid vibrant hot pink color." }
  ],
  "Gradients": [
    { name: "Vivid Blue", color: "linear-gradient(45deg, #3B82F6, #1D4ED8)", prompt: "Replace the background with a smooth vibrant blue gradient." },
    { name: "Soft Peach", color: "linear-gradient(45deg, #FDE68A, #FCA5A5)", prompt: "Replace the background with a soft peach and amber gradient." },
    { name: "Night Sky", color: "linear-gradient(45deg, #1E1B4B, #4338CA)", prompt: "Replace the background with a deep dark purple and indigo gradient." }
  ]
};

const PROMPT_CATEGORIES = {
  "Colors & Finishes": [
    "Change the primary color to Sage Green",
    "Apply a premium metallic gold finish",
    "Switch to a deep charcoal matte look",
    "Make it a vibrant Sunset Orange",
    "Change the product color to Soft Pink"
  ],
  "Atmosphere": [
    "Place in a modern minimalist living room",
    "Set against a rustic brick wall",
    "Use a high-end fashion studio backdrop",
    "Show it in a bright outdoor park setting"
  ],
  "Texture & Style": [
    "Add a vintage distressed print effect",
    "Give the logo a raised embroidery look",
    "Add realistic fabric folds and shadows",
    "Apply a subtle grainy film texture"
  ]
};

const MockupEditor: React.FC<MockupEditorProps> = ({ mockup, onClose, onUpdate, onDraftChange }) => {
  const [prompt, setPrompt] = useState(mockup.draftPrompt || '');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string; isSafety?: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Zoom, Pan, Flip, Filter State
  const [scale, setScale] = useState(1);
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTER_PRESETS[0]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleEdit = async (customPrompt?: string, bgImage?: string) => {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim()) return;
    
    setIsEditing(true);
    setError(null);
    try {
      const result = await geminiService.editMockup(mockup.imageUrl, finalPrompt, bgImage);
      onUpdate(result);
      if (!customPrompt && !bgImage) {
        setPrompt('');
        onDraftChange(mockup.id, '');
      }
      resetZoom();
    } catch (err: any) {
      setError({
        message: err.message || 'AI Refinement failed',
        details: err.details || (err.status ? `API Status Code: ${err.status}` : undefined),
        isSafety: err.message?.includes('SAFETY')
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleEdit("Replace the entire background of this image with the provided background image. Ensure the lighting and reflections on the product naturally blend with this new background environment.", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExport = () => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = mockup.imageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Apply filters to context
      ctx.filter = activeFilter.filter;
      
      // Handle Flip
      if (isFlipped) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `merchmagic-${mockup.type.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`);
        }
      }, 'image/png');
    };
  };

  const updatePrompt = (val: string) => {
    setPrompt(val);
    onDraftChange(mockup.id, val);
  };

  // Zoom and View logic
  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 4));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const toggleFlip = () => setIsFlipped(prev => !prev);
  const resetZoom = () => {
    setScale(1);
    setIsFlipped(false);
    setActiveFilter(FILTER_PRESETS[0]);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const onMouseUp = () => setIsDragging(false);

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[95vh] border border-slate-200 dark:border-slate-800">
        
        {/* Preview Area */}
        <div 
          ref={containerRef}
          className="flex-1 bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-8 relative overflow-hidden min-h-[400px] cursor-grab active:cursor-grabbing"
          onWheel={handleWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {isEditing && (
            <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 z-20 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Processing Perspective...</p>
            </div>
          )}

          {/* Zoom Controls Overlay */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-30">
            <button 
              onClick={zoomOut}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-600 dark:text-slate-400"
              title="Zoom Out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <div className="px-3 min-w-[60px] text-center text-xs font-bold text-slate-700 dark:text-slate-300">
              {Math.round(scale * 100)}%
            </div>
            <button 
              onClick={zoomIn}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-600 dark:text-slate-400"
              title="Zoom In"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
            <button 
              onClick={toggleFlip}
              className={`p-2 rounded-xl transition-all ${isFlipped ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              title="Horizontal Flip"
            >
              <ICONS.Flip />
            </button>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
            <button 
              onClick={resetZoom}
              className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400"
            >
              Reset
            </button>
          </div>

          <div 
            style={{ 
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            className="flex items-center justify-center pointer-events-none"
          >
            <img 
              src={mockup.imageUrl} 
              alt="Editing mockup" 
              style={{ 
                transform: `scaleX(${isFlipped ? -1 : 1})`,
                filter: activeFilter.filter
              }}
              className="max-h-[70vh] max-w-full rounded-xl shadow-2xl object-contain select-none transition-all duration-300" 
              draggable={false}
            />
          </div>
        </div>

        {/* Control Area */}
        <div className="w-full md:w-[480px] p-8 flex flex-col border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Refine Mockup</h3>
              <p className="text-xs text-slate-500 font-medium">Use AI to tweak every detail</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* 3D Perspectives Section */}
            <div className="space-y-4">
               <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">3D Perspectives</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                  <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-tighter">AI Driven View</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ROTATION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleEdit(preset.prompt)}
                    disabled={isEditing}
                    className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-xl transition-all group disabled:opacity-50 min-h-[70px]"
                    title={preset.name}
                  >
                    <div className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {preset.icon}
                    </div>
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 uppercase tracking-tighter text-center leading-none">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Background Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Background</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline"
                >
                  Upload Custom
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />
              </div>

              {Object.entries(BACKGROUND_PRESETS).map(([cat, items]) => (
                <div key={cat} className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-500 italic">{cat}</h4>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => handleEdit(item.prompt)}
                        disabled={isEditing}
                        title={item.name}
                        className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:scale-110 transition-transform shadow-sm flex-shrink-0"
                        style={{ background: item.color }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Visual Filters Section */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Visual Filters</p>
              <div className="flex flex-wrap gap-2">
                {FILTER_PRESETS.map((filter) => (
                  <button
                    key={filter.name}
                    onClick={() => setActiveFilter(filter)}
                    className={`text-[10px] px-3 py-1.5 rounded-lg border font-black uppercase tracking-tighter transition-all
                      ${activeFilter.name === filter.name 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Lighting Scenarios Section */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Lighting Scenarios</p>
              <div className="grid grid-cols-2 gap-2">
                {LIGHTING_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleEdit(preset.prompt)}
                    disabled={isEditing}
                    className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-xl transition-all group disabled:opacity-50"
                  >
                    <div className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {preset.icon}
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-200">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">AI Refinement Prompt</label>
              <textarea 
                value={prompt}
                onChange={(e) => updatePrompt(e.target.value)}
                placeholder="e.g., 'Change the shirt to a vibrant red and add shadows'"
                className="w-full p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none h-24 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            </div>

            <button 
              onClick={() => handleEdit()}
              disabled={isEditing || !prompt.trim()}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-indigo-200 dark:shadow-none shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-3"
            >
              {isEditing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Rendering...
                </>
              ) : (
                <>
                  <ICONS.Magic />
                  Generate Changes
                </>
              )}
            </button>

            {error && (
              <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 space-y-3 animate-in fade-in zoom-in duration-300 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0 bg-white/50 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-900 dark:text-red-300 leading-tight">
                      {error.isSafety ? 'Content Blocked' : 'AI Refinement Error'}
                    </p>
                    <p className="text-xs text-red-800/80 dark:text-red-400/90 mt-1.5 font-medium leading-relaxed">
                      {error.message.replace('SAFETY: ', '')}
                    </p>
                    {error.details && (
                      <div className="mt-3 pt-3 border-t border-red-200/50 dark:border-red-900/20">
                        <p className="text-[10px] font-black text-red-600/60 dark:text-red-500/50 uppercase tracking-widest mb-1">Diagnostic Log</p>
                        <p className="text-[10px] font-mono text-red-600 dark:text-red-500/70 break-all bg-red-100/30 dark:bg-red-900/10 p-2 rounded-lg">
                          {error.details}
                        </p>
                      </div>
                    )}
                    {error.isSafety && (
                      <p className="text-[10px] text-red-700/60 dark:text-red-400/50 mt-2 italic">
                        Tip: Avoid brand names, public figures, or sensitive descriptions.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Quick Styles</p>
              
              {Object.entries(PROMPT_CATEGORIES).map(([category, prompts]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-indigo-400 rounded-full"></span>
                    {category}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {prompts.map((p) => (
                      <button 
                        key={p}
                        onClick={() => {
                          updatePrompt(p);
                          setError(null);
                        }}
                        className={`text-[11px] px-3 py-1.5 rounded-lg transition-all border font-medium text-left
                          ${prompt === p 
                            ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                            : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 mt-auto border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={handleExport}
                className="w-full py-3 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <ICONS.Download />
                Export Print-Ready
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockupEditor;
