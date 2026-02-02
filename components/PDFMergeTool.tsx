import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, Plus, Trash2, ArrowLeft, ArrowRight, Loader2, Files, X } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Fix for ESM import compatibility for PDF.js
const pdfjs = (pdfjsLib as any).default || pdfjsLib;

// Define worker source
if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

interface Props {
  t: (key: string) => string;
}

interface PdfFileItem {
  id: string;
  file: File;
  previewUrl: string | null;
  isLoadingPreview: boolean;
}

const PDFMergeTool: React.FC<Props> = ({ t }) => {
  const [items, setItems] = useState<PdfFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      items.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  const generateThumbnail = async (file: File): Promise<string | null> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1); // Get first page
      
      // Calculate scale for thumbnail (approx 200px width is enough)
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        return canvas.toDataURL();
      }
      return null;
    } catch (e) {
      console.error("Error generating thumbnail", e);
      return null;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files) as File[];
      setMergedPdfUrl(null);

      // Create temporary items with loading state
      const newItems: PdfFileItem[] = newFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: null,
        isLoadingPreview: true
      }));

      setItems(prev => [...prev, ...newItems]);

      // Generate thumbnails asynchronously
      for (const item of newItems) {
        const preview = await generateThumbnail(item.file);
        setItems(prev => prev.map(p => 
          p.id === item.id ? { ...p, previewUrl: preview, isLoadingPreview: false } : p
        ));
      }
    }
  };

  const removeItem = (id: string) => {
    setItems(prev => {
        const itemToRemove = prev.find(i => i.id === id);
        if (itemToRemove?.previewUrl) URL.revokeObjectURL(itemToRemove.previewUrl);
        return prev.filter(i => i.id !== id);
    });
    setMergedPdfUrl(null);
  };

  const moveItem = (index: number, direction: 'left' | 'right') => {
    if (
      (direction === 'left' && index === 0) || 
      (direction === 'right' && index === items.length - 1)
    ) return;

    const newItems = [...items];
    const swapIndex = direction === 'left' ? index - 1 : index + 1;
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    setItems(newItems);
    setMergedPdfUrl(null);
  };

  const mergePDFs = async () => {
    if (items.length < 2) {
        alert("Please select at least 2 PDF files to merge.");
        return;
    }
    
    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of items) {
        const fileBuffer = await item.file.arrayBuffer();
        const pdf = await PDFDocument.load(fileBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setMergedPdfUrl(url);
    } catch (error) {
      console.error("Error merging PDFs:", error);
      alert("Failed to merge PDFs. Ensure files are valid and not password protected.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 min-h-[500px] flex flex-col">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        {t('nav.pdf_merge')}
                    </h2>
                    {items.length > 0 && (
                        <span className="bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 px-3 py-1 rounded-full text-xs font-bold">
                            {items.length} Files
                        </span>
                    )}
                </div>
                
                <div className="flex gap-3 w-full sm:w-auto">
                    <input
                        type="file"
                        id="pdf-multi-upload"
                        className="hidden"
                        accept="application/pdf"
                        multiple
                        onChange={handleFileChange}
                    />
                    <label 
                        htmlFor="pdf-multi-upload" 
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 px-5 py-2.5 rounded-lg font-medium cursor-pointer transition-colors shadow-sm"
                    >
                        <Plus size={18} />
                        <span>{items.length === 0 ? t('pdf_merge.add') : 'Add more files'}</span>
                    </label>
                </div>
            </div>

            {/* Empty State */}
            {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-full shadow-sm mb-4">
                        <Files className="text-brand-500" size={48} />
                    </div>
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{t('pdf_merge.empty')}</p>
                    <p className="text-gray-400 mt-2">{t('pdf_merge.drop')}</p>
                </div>
            ) : (
                /* Grid View */
                <div className="flex-1">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {items.map((item, index) => (
                            <div 
                                key={item.id} 
                                className="group relative bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md transition-all flex flex-col items-center"
                            >
                                {/* Remove Button */}
                                <button 
                                    onClick={() => removeItem(item.id)}
                                    className="absolute -top-2 -right-2 bg-white dark:bg-gray-700 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 border border-gray-200 dark:border-gray-600 rounded-full p-1.5 shadow-sm transition-colors z-10"
                                >
                                    <X size={14} />
                                </button>

                                {/* Preview Area */}
                                <div className="w-full aspect-[1/1.4] bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex items-center justify-center mb-3 relative">
                                    {item.isLoadingPreview ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="animate-spin text-brand-500" size={24} />
                                            <span className="text-[10px] text-gray-400">Loading preview...</span>
                                        </div>
                                    ) : item.previewUrl ? (
                                        <img src={item.previewUrl} alt="Preview" className="w-full h-full object-contain" />
                                    ) : (
                                        <FileText className="text-gray-300" size={48} />
                                    )}

                                    {/* Order Overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                                        <button 
                                            onClick={() => moveItem(index, 'left')}
                                            disabled={index === 0}
                                            className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            title="Move Left"
                                        >
                                            <ArrowLeft size={18} className="text-gray-800 dark:text-white" />
                                        </button>
                                        <button 
                                            onClick={() => moveItem(index, 'right')}
                                            disabled={index === items.length - 1}
                                            className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            title="Move Right"
                                        >
                                            <ArrowRight size={18} className="text-gray-800 dark:text-white" />
                                        </button>
                                    </div>
                                </div>

                                {/* Filename */}
                                <div className="w-full text-center">
                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate w-full" title={item.file.name}>
                                        {item.file.name}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        {(item.file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                
                                {/* Index Badge */}
                                <div className="absolute top-2 left-2 w-6 h-6 bg-gray-900/80 dark:bg-gray-700/80 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                    {index + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Action Area */}
            {items.length > 0 && (
                <div className="flex flex-col items-center gap-4 pt-8 mt-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 sticky bottom-0 z-20">
                     <button
                        onClick={mergePDFs}
                        disabled={isProcessing || items.length < 2}
                        className="min-w-[240px] bg-brand-600 hover:bg-brand-700 text-white px-8 py-3.5 rounded-xl font-medium transition-all shadow-lg hover:shadow-brand-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                     >
                         {isProcessing ? <Loader2 className="animate-spin" size={22} /> : <Files size={22} />}
                         {isProcessing ? 'Merging PDFs...' : t('pdf_merge.action')}
                     </button>

                     {mergedPdfUrl && (
                         <div className="w-full max-w-2xl animate-fade-in bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
                             <div className="text-center sm:text-left pl-2">
                                 <p className="font-semibold text-green-800 dark:text-green-300 text-lg">Merge Complete!</p>
                                 <p className="text-sm text-green-700 dark:text-green-400">Your document is ready to download.</p>
                             </div>
                             <a 
                                href={mergedPdfUrl} 
                                download={`merged_document_${Date.now()}.pdf`}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors"
                            >
                                <Download size={18} /> {t('image.download')}
                            </a>
                         </div>
                     )}
                </div>
            )}
        </div>
    </div>
  );
};

export default PDFMergeTool;