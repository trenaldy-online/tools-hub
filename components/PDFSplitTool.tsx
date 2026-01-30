import React, { useState, useEffect } from 'react';
import { Download, Scissors, CheckCircle, Circle, Loader2, X, Sliders, Layers, Package } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';

const pdfjs = (pdfjsLib as any).default || pdfjsLib;

if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

interface Props {
  t: (key: string) => string;
}

interface PagePreview {
  index: number; // 0-based index
  imageUrl: string;
  selected: boolean;
}

const PDFSplitTool: React.FC<Props> = ({ t }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PagePreview[]>([]);
  
  // Modes
  const [mode, setMode] = useState<'custom' | 'fixed'>('custom');
  const [outputMode, setOutputMode] = useState<'single' | 'separate'>('single');
  const [fixedRange, setFixedRange] = useState<number>(1);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rangeInput, setRangeInput] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Result
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFilename, setResultFilename] = useState<string>('');

  useEffect(() => {
    return () => {
      // Cleanup URLs
      pages.forEach(p => URL.revokeObjectURL(p.imageUrl));
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [pages, resultUrl]);

  // Reset result when configuration changes
  useEffect(() => {
    setResultUrl(null);
  }, [mode, outputMode, fixedRange, pages]);

  const loadPDF = async (file: File) => {
    setIsLoading(true);
    setPages([]);
    setFile(file);
    setResultUrl(null);
    setRangeInput('');
    setLoadingProgress(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument(arrayBuffer).promise;
      const totalPages = pdf.numPages;
      
      const newPages: PagePreview[] = [];

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 }); // Small thumbnail
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');

        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve));
          if (blob) {
             newPages.push({
               index: i - 1,
               imageUrl: URL.createObjectURL(blob),
               selected: false
             });
          }
        }
        setLoadingProgress(Math.round((i / totalPages) * 100));
        await new Promise(r => setTimeout(r, 0));
      }
      setPages(newPages);
    } catch (error) {
      console.error("Error loading PDF", error);
      alert("Failed to load PDF pages.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      loadPDF(e.target.files[0]);
    }
  };

  const togglePageSelection = (index: number) => {
    if (mode === 'fixed') return; // Selection disabled in fixed mode
    setPages(prev => prev.map(p => 
      p.index === index ? { ...p, selected: !p.selected } : p
    ));
  };

  const selectAll = (select: boolean) => {
    setPages(prev => prev.map(p => ({ ...p, selected: select })));
  };

  const applyRange = () => {
    if (!rangeInput || mode === 'fixed') return;

    const selectedIndices = new Set<number>();
    const parts = rangeInput.split(',');

    parts.forEach(part => {
      const range = part.trim().split('-').map(Number);
      if (range.length === 1 && !isNaN(range[0])) {
        if (range[0] > 0 && range[0] <= pages.length) {
          selectedIndices.add(range[0] - 1);
        }
      } else if (range.length === 2 && !isNaN(range[0]) && !isNaN(range[1])) {
        const start = Math.min(range[0], range[1]);
        const end = Math.max(range[0], range[1]);
        for (let i = start; i <= end; i++) {
          if (i > 0 && i <= pages.length) {
            selectedIndices.add(i - 1);
          }
        }
      }
    });

    setPages(prev => prev.map(p => ({
      ...p,
      selected: selectedIndices.has(p.index)
    })));
  };

  const processPDF = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const timestamp = Date.now();

      // --- LOGIC: FIXED RANGE SPLIT (Always produces ZIP unless entire doc fits in one chunk) ---
      if (mode === 'fixed') {
        const zip = new JSZip();
        const chunkCount = Math.ceil(pages.length / fixedRange);
        
        for (let i = 0; i < chunkCount; i++) {
            const start = i * fixedRange;
            const end = Math.min(start + fixedRange, pages.length);
            // Get indices for this chunk
            const indices = Array.from({length: end - start}, (_, k) => k + start);
            
            const newDoc = await PDFDocument.create();
            const copiedPages = await newDoc.copyPages(srcDoc, indices);
            copiedPages.forEach(p => newDoc.addPage(p));
            
            const pdfBytes = await newDoc.save();
            const filename = `part_${i + 1}_pages_${start + 1}-${end}.pdf`;
            zip.file(filename, pdfBytes);
        }

        const zipContent = await zip.generateAsync({ type: "blob" });
        setResultUrl(URL.createObjectURL(zipContent));
        setResultFilename(`split_fixed_${timestamp}.zip`);
      } 
      // --- LOGIC: CUSTOM SELECTION ---
      else {
        const selectedPages = pages.filter(p => p.selected);
        if (selectedPages.length === 0) return;

        // CASE 1: Merge into ONE file
        if (outputMode === 'single') {
            const newDoc = await PDFDocument.create();
            const indices = selectedPages.map(p => p.index);
            const copiedPages = await newDoc.copyPages(srcDoc, indices);
            copiedPages.forEach(p => newDoc.addPage(p));
            
            const pdfBytes = await newDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            setResultUrl(URL.createObjectURL(blob));
            setResultFilename(`extracted_${timestamp}.pdf`);
        } 
        // CASE 2: Separate files (ZIP)
        else {
            const zip = new JSZip();
            
            for (const page of selectedPages) {
                const newDoc = await PDFDocument.create();
                const copiedPage = await newDoc.copyPages(srcDoc, [page.index]);
                newDoc.addPage(copiedPage[0]);
                
                const pdfBytes = await newDoc.save();
                zip.file(`page_${page.index + 1}.pdf`, pdfBytes);
            }
            
            const zipContent = await zip.generateAsync({ type: "blob" });
            setResultUrl(URL.createObjectURL(zipContent));
            setResultFilename(`extracted_pages_${timestamp}.zip`);
        }
      }

    } catch (error) {
      console.error("Error splitting PDF", error);
      alert("Failed to process pages.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 min-h-[500px] flex flex-col">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                 <h2 className="text-xl font-semibold flex items-center gap-2">
                    {t('nav.pdf_split')}
                </h2>
                {pages.length > 0 && mode === 'custom' && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="font-medium text-gray-900 dark:text-gray-200">{pages.filter(p => p.selected).length}</span> selected
                        <span>/ {pages.length} {t('pdf_split.pages')}</span>
                    </div>
                )}
            </div>

            {/* Empty State / Upload */}
            {!file && !isLoading && (
                 <div className="flex-1 flex flex-col items-center justify-center py-16 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <input
                        type="file"
                        id="pdf-split-upload"
                        className="hidden"
                        accept="application/pdf"
                        onChange={handleFileChange}
                    />
                    <label 
                        htmlFor="pdf-split-upload" 
                        className="flex flex-col items-center cursor-pointer group"
                    >
                        <div className="bg-pink-50 dark:bg-pink-900/30 p-5 rounded-full mb-4 group-hover:scale-110 transition-transform">
                            <Scissors className="text-pink-500" size={40} />
                        </div>
                        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{t('pdf_split.drop')}</p>
                        <p className="text-sm text-gray-400 mt-2">Click to browse</p>
                    </label>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center py-12">
                    <Loader2 className="animate-spin text-brand-500 mb-4" size={40} />
                    <p className="text-gray-600 dark:text-gray-300 font-medium">Loading PDF pages...</p>
                    <div className="w-64 h-2 bg-gray-200 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-brand-500 transition-all duration-100" style={{ width: `${loadingProgress}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{loadingProgress}%</p>
                </div>
            )}

            {/* Editor Interface */}
            {file && !isLoading && (
                <div className="flex-1 flex flex-col gap-6">
                    
                    {/* Controls Bar */}
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl space-y-4">
                        
                        {/* 1. Mode Selection Tabs */}
                        <div className="flex gap-4 border-b border-gray-200 dark:border-gray-600 pb-4">
                            <button
                                onClick={() => setMode('custom')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    mode === 'custom' 
                                    ? 'bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-400 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                <Sliders size={16} />
                                {t('pdf_split.mode_custom')}
                            </button>
                            <button
                                onClick={() => setMode('fixed')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    mode === 'fixed' 
                                    ? 'bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-400 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                <Layers size={16} />
                                {t('pdf_split.mode_fixed')}
                            </button>
                            <div className="flex-1 flex justify-end">
                                <button onClick={() => setFile(null)} className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* 2. Specific Controls based on Mode */}
                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center min-h-[50px]">
                            
                            {/* Custom Mode Controls */}
                            {mode === 'custom' && (
                                <>
                                    <div className="flex flex-col gap-1 flex-1">
                                        <label className="text-xs font-semibold uppercase text-gray-500">{t('pdf_split.range_label')}</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="1-3, 5, 8" 
                                                value={rangeInput}
                                                onChange={(e) => setRangeInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && applyRange()}
                                                className="w-full md:w-48 px-3 py-1.5 rounded border dark:bg-gray-800 dark:border-gray-600 text-sm"
                                            />
                                            <button 
                                                onClick={applyRange}
                                                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1 flex-1">
                                        <label className="text-xs font-semibold uppercase text-gray-500">{t('pdf_split.output_label')}</label>
                                        <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-lg w-fit">
                                            <button 
                                                onClick={() => setOutputMode('single')}
                                                className={`px-3 py-1 text-xs font-medium rounded ${outputMode === 'single' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500'}`}
                                            >
                                                Merge (PDF)
                                            </button>
                                            <button 
                                                onClick={() => setOutputMode('separate')}
                                                className={`px-3 py-1 text-xs font-medium rounded ${outputMode === 'separate' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500'}`}
                                            >
                                                Separate (ZIP)
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2 pt-4 md:pt-0">
                                        <button onClick={() => selectAll(true)} className="text-xs px-3 py-2 bg-white dark:bg-gray-800 border rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                                            {t('pdf_split.select_all')}
                                        </button>
                                        <button onClick={() => selectAll(false)} className="text-xs px-3 py-2 bg-white dark:bg-gray-800 border rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                                            {t('pdf_split.deselect_all')}
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Fixed Mode Controls */}
                            {mode === 'fixed' && (
                                <div className="flex flex-col gap-1 w-full">
                                    <label className="text-xs font-semibold uppercase text-gray-500">{t('pdf_split.fixed_label')}</label>
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="number" 
                                            min="1"
                                            max={pages.length}
                                            value={fixedRange}
                                            onChange={(e) => setFixedRange(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-24 px-3 py-2 rounded border dark:bg-gray-800 dark:border-gray-600 text-sm"
                                        />
                                        <p className="text-sm text-gray-500 italic">
                                            {t('pdf_split.fixed_hint')} (Creates {Math.ceil(pages.length / fixedRange)} files)
                                        </p>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {pages.map((page) => (
                            <div 
                                key={page.index}
                                onClick={() => togglePageSelection(page.index)}
                                className={`
                                    relative rounded-lg overflow-hidden border-2 transition-all
                                    ${mode === 'custom' ? 'cursor-pointer group' : 'cursor-default opacity-90'}
                                    ${page.selected && mode === 'custom'
                                        ? 'border-brand-500 ring-2 ring-brand-500/20' 
                                        : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}
                                `}
                            >
                                <div className="aspect-[1/1.4] bg-gray-100 dark:bg-gray-900 relative">
                                    <img src={page.imageUrl} alt={`Page ${page.index + 1}`} className="w-full h-full object-contain" />
                                    
                                    {/* Overlay for selection state (Only custom mode) */}
                                    {mode === 'custom' && (
                                        <>
                                            <div className={`absolute inset-0 transition-colors ${page.selected ? 'bg-brand-500/10' : 'bg-transparent group-hover:bg-black/5'}`}></div>
                                            <div className="absolute top-2 right-2">
                                                {page.selected ? (
                                                    <CheckCircle className="text-brand-500 fill-white dark:fill-gray-900" size={20} />
                                                ) : (
                                                    <Circle className="text-gray-400 fill-white/50 dark:fill-black/50" size={20} />
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {/* Visual Grouping Indicator for Fixed Mode */}
                                    {mode === 'fixed' && (
                                        <div className="absolute top-2 right-2 bg-gray-900/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                                            Group {Math.floor(page.index / fixedRange) + 1}
                                        </div>
                                    )}

                                    {/* Page Number */}
                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
                                        Page {page.index + 1}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer Action */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col items-center gap-4 sticky bottom-0 bg-white dark:bg-gray-800 z-10">
                        <button
                            onClick={processPDF}
                            disabled={isProcessing || (mode === 'custom' && pages.filter(p => p.selected).length === 0)}
                            className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-brand-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" size={20} /> : (
                                (mode === 'fixed' || outputMode === 'separate') ? <Package size={20} /> : <Scissors size={20} />
                            )}
                            {t('pdf_split.action')}
                        </button>

                         {resultUrl && (
                             <div className="w-full max-w-xl animate-fade-in bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-900/50 flex items-center justify-between gap-4">
                                 <div>
                                     <p className="font-semibold text-green-800 dark:text-green-300">Ready!</p>
                                     <p className="text-xs text-green-700 dark:text-green-400">
                                         {mode === 'fixed' || outputMode === 'separate' ? 'Files packed into ZIP.' : 'PDF created successfully.'}
                                     </p>
                                 </div>
                                 <a 
                                    href={resultUrl} 
                                    download={resultFilename}
                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm"
                                >
                                    <Download size={16} /> {t('image.download')}
                                </a>
                             </div>
                         )}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default PDFSplitTool;