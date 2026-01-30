import React, { useState, useEffect } from 'react';
import { FileText, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Fix for ESM import compatibility: check if 'default' export exists
const pdfjs = (pdfjsLib as any).default || pdfjsLib;

// Define worker source for PDF.js safely
// Using cdnjs for the worker ensures we get a bundled, non-module script that works reliably across browsers
if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

interface Props {
  t: (key: string) => string;
}

const PDFCompressorTool: React.FC<Props> = ({ t }) => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [result, setResult] = useState<{ blob: Blob; url: string; size: number } | null>(null);
  
  // Settings
  const [quality, setQuality] = useState(0.6); // JPEG Quality (0-1)
  const [scale, setScale] = useState(1.5); // Resolution scale (1 = 72dpi, 2 = 144dpi approx)
  
  // Estimation
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Effect to calculate estimated size when settings change
  useEffect(() => {
    if (!file || result) return;

    // Debounce to avoid heavy calculation on every slider move
    const timer = setTimeout(async () => {
      setIsEstimating(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        // Sample page 1 for estimation
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        
        if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            
            // Get base64 data length
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            // Approx size in bytes: (Base64 length * 3/4) - padding
            // We use a simple approximation here
            const pageSizeBytes = Math.round(dataUrl.length * 0.75);
            
            // Estimate total: Single Page Size * Total Pages + some PDF overhead buffer (e.g. 5KB per page)
            const totalEstimate = (pageSizeBytes * pdf.numPages) + (5000 * pdf.numPages);
            
            setEstimatedSize(totalEstimate);
        }
      } catch (e) {
        console.error("Estimation failed", e);
      } finally {
        setIsEstimating(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [file, quality, scale, result]);


  const compressPDF = async () => {
    if (!file) return;
    setProcessing(true);
    setResult(null);
    setProgress({ current: 0, total: 100 });

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // 1. Load Original PDF using PDF.js (using the safe 'pdfjs' reference)
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const originalPdf = await loadingTask.promise;
      const totalPages = originalPdf.numPages;
      
      setProgress({ current: 0, total: totalPages });

      // 2. Create New PDF using PDF-Lib
      const newPdfDoc = await PDFDocument.create();

      // 3. Iterate pages: Render -> Compress -> Embed
      for (let i = 1; i <= totalPages; i++) {
        const page = await originalPdf.getPage(i);
        const viewport = page.getViewport({ scale: scale });

        // Create Canvas
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');

        if (!context) throw new Error("Canvas context failed");

        // Render PDF page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        // Convert canvas to JPEG blob (The compression step)
        const jpgDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Embed the JPG into the new PDF
        const jpgImage = await newPdfDoc.embedJpg(jpgDataUrl);
        const jpgDims = jpgImage.scale(1 / scale); // Scale back down to original PDF point size

        // Add page to new PDF
        const newPage = newPdfDoc.addPage([jpgDims.width, jpgDims.height]);
        newPage.drawImage(jpgImage, {
          x: 0,
          y: 0,
          width: jpgDims.width,
          height: jpgDims.height,
        });

        // Update progress
        setProgress({ current: i, total: totalPages });
        
        // Small delay to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // 4. Save the new PDF
      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setResult({
        blob,
        url,
        size: blob.size
      });

    } catch (err) {
      console.error(err);
      alert('Error compressing PDF. Ensure the file is valid and not password protected.');
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Warning Box */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 rounded-lg flex items-start gap-3">
        <AlertTriangle className="text-orange-600 dark:text-orange-500 shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-orange-800 dark:text-orange-200">
           {t('pdf.warning')}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
         <input
            type="file"
            id="pdf-upload"
            className="hidden"
            accept="application/pdf"
            onChange={(e) => {
                if(e.target.files?.[0]) {
                    setFile(e.target.files[0]);
                    setResult(null);
                    setProgress(null);
                    setEstimatedSize(null);
                }
            }}
        />
        
        {!file ? (
             <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-brand-500 transition-colors">
                <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-full mb-3">
                    <FileText className="text-red-500" size={32} />
                </div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{t('pdf.drop')}</p>
            </label>
        ) : (
            <div className="space-y-8">
                {/* File Info */}
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded">
                            <FileText className="text-red-500" size={24} />
                        </div>
                        <div>
                            <p className="font-medium truncate max-w-[150px] sm:max-w-xs">{file.name}</p>
                            <p className="text-sm text-gray-500">{formatSize(file.size)}</p>
                        </div>
                    </div>
                    <button onClick={() => setFile(null)} className="text-sm text-red-500 hover:text-red-600 font-medium px-2">
                        Remove
                    </button>
                </div>

                {/* Settings Controls */}
                {!result && !processing && (
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('pdf.resolution')}
                                </label>
                                <select 
                                    value={scale}
                                    onChange={(e) => setScale(parseFloat(e.target.value))}
                                    className="w-full p-2.5 rounded-lg border dark:bg-gray-800 dark:border-gray-600"
                                >
                                    <option value="1.0">{t('pdf.res_low')}</option>
                                    <option value="1.5">{t('pdf.res_med')}</option>
                                    <option value="2.0">{t('pdf.res_high')}</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('pdf.quality')}
                                    </label>
                                    <span className="text-sm text-gray-500">{Math.round(quality * 100)}%</span>
                                </div>
                                <input 
                                    type="range"
                                    min="0.1"
                                    max="0.9"
                                    step="0.1"
                                    value={quality}
                                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
                                />
                            </div>
                        </div>

                        {/* Estimation Display */}
                        <div className="flex items-center justify-end gap-2 text-sm pt-2 border-t border-gray-200 dark:border-gray-600">
                             {isEstimating ? (
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Loader2 className="animate-spin" size={14} />
                                    <span>{t('pdf.estimating')}</span>
                                </div>
                             ) : estimatedSize ? (
                                <div className="flex items-center gap-2">
                                     <span className="text-gray-500">{t('pdf.estimated_size')}</span>
                                     <span className={`font-bold ${estimatedSize > file.size ? 'text-orange-500' : 'text-green-600'}`}>
                                        {formatSize(estimatedSize)}
                                     </span>
                                     {estimatedSize > file.size && (
                                         <span className="text-xs text-orange-500">(Larger than original)</span>
                                     )}
                                </div>
                             ) : null}
                        </div>
                    </div>
                )}

                {/* Processing State */}
                {processing && progress && (
                    <div className="text-center py-4 space-y-3">
                        <Loader2 className="animate-spin mx-auto text-brand-600" size={32} />
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('pdf.processing')} {progress.current} / {progress.total}
                        </p>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div 
                                className="bg-brand-600 h-2.5 rounded-full transition-all duration-300" 
                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {!processing && !result && (
                     <button
                        onClick={compressPDF}
                        disabled={isEstimating} // Prevent starting while estimation is locking resources
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm hover:shadow disabled:opacity-70 disabled:cursor-not-allowed"
                     >
                         {t('pdf.optimize')}
                     </button>
                )}

                {/* Result */}
                {result && (
                    <div className="animate-fade-in bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-100 dark:border-green-900">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                             <div className="text-center sm:text-left">
                                <p className="font-semibold text-green-800 dark:text-green-300">Compression Successful!</p>
                                <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start">
                                    <span className="text-gray-500 line-through text-sm">{formatSize(file.size)}</span>
                                    <span className="mx-1">→</span>
                                    <span className="font-bold text-gray-900 dark:text-white text-lg">{formatSize(result.size)}</span>
                                </div>
                                <span className="inline-block mt-2 text-xs font-bold text-green-700 bg-green-200 dark:bg-green-800/50 px-2 py-1 rounded">
                                    Saved {Math.max(0, Math.round((1 - result.size / file.size) * 100))}%
                                </span>
                             </div>
                             <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                    onClick={() => { setResult(null); }}
                                    className="flex-1 sm:flex-none px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Reset
                                </button>
                                <a 
                                    href={result.url} 
                                    download={`compressed_${file.name}`}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors"
                                >
                                    <Download size={18} /> {t('image.download')}
                                </a>
                             </div>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default PDFCompressorTool;