import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, Stamp, Image as ImageIcon, Type, Grid3X3, Loader2, X, Upload } from 'lucide-react';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

const pdfjs = (pdfjsLib as any).default || pdfjsLib;
if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

interface Props {
  t: (key: string) => string;
}

type Position = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // Grid positions 1-9

const PDFWatermarkTool: React.FC<Props> = ({ t }) => {
  // Main File
  const [file, setFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Settings
  const [type, setType] = useState<'text' | 'image'>('text');
  
  // Text Settings
  const [text, setText] = useState('CONFIDENTIAL');
  const [textSize, setTextSize] = useState(48);
  const [textColor, setTextColor] = useState('#FF0000');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  
  // Image Settings
  const [watermarkImage, setWatermarkImage] = useState<File | null>(null);
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(0.5);

  // Common Settings
  const [position, setPosition] = useState<Position>(5); // 5 = Center
  const [opacity, setOpacity] = useState(0.5);
  const [rotation, setRotation] = useState(45);
  
  // Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
        if (previewImage) URL.revokeObjectURL(previewImage);
        if (watermarkPreview) URL.revokeObjectURL(watermarkPreview);
        if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, []);

  // Load PDF Preview (First Page)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const f = e.target.files[0];
          setFile(f);
          setResultUrl(null);
          
          // Generate Preview
          try {
              const arrayBuffer = await f.arrayBuffer();
              const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
              const pdf = await loadingTask.promise;
              const page = await pdf.getPage(1);
              const viewport = page.getViewport({ scale: 1.0 });
              
              const canvas = document.createElement('canvas');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              const context = canvas.getContext('2d');
              
              if (context) {
                  await page.render({ canvasContext: context, viewport }).promise;
                  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r));
                  if (blob) {
                      if (previewImage) URL.revokeObjectURL(previewImage);
                      setPreviewImage(URL.createObjectURL(blob));
                  }
              }
          } catch (err) {
              console.error(err);
              alert("Failed to load PDF preview");
          }
      }
  };

  const handleWatermarkImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const f = e.target.files[0];
          setWatermarkImage(f);
          if (watermarkPreview) URL.revokeObjectURL(watermarkPreview);
          setWatermarkPreview(URL.createObjectURL(f));
      }
  };

  const processPDF = async () => {
      if (!file) return;
      setIsProcessing(true);

      try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const pages = pdfDoc.getPages();
          
          // Embed resources
          let embedFont;
          let embedImage;
          let embedDims;

          if (type === 'text') {
             // Embed Font
             if (isBold && isItalic) embedFont = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
             else if (isBold) embedFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
             else if (isItalic) embedFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
             else embedFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
          } else if (type === 'image' && watermarkImage) {
              const imgBuffer = await watermarkImage.arrayBuffer();
              // Check type
              if (watermarkImage.type === 'image/png') embedImage = await pdfDoc.embedPng(imgBuffer);
              else embedImage = await pdfDoc.embedJpg(imgBuffer);
              embedDims = embedImage.scale(imageScale);
          }

          // Helper to convert Hex to RGB (0-1)
          const r = parseInt(textColor.slice(1, 3), 16) / 255;
          const g = parseInt(textColor.slice(3, 5), 16) / 255;
          const b = parseInt(textColor.slice(5, 7), 16) / 255;

          // Loop pages
          pages.forEach(page => {
              const { width, height } = page.getSize();
              let x = 0, y = 0;
              let contentWidth = 0;
              let contentHeight = 0;

              // Calculate content dimensions
              if (type === 'text' && embedFont) {
                  contentWidth = embedFont.widthOfTextAtSize(text, textSize);
                  contentHeight = textSize;
              } else if (type === 'image' && embedDims) {
                  contentWidth = embedDims.width;
                  contentHeight = embedDims.height;
              }

              // Calculate X, Y based on Grid Position (1-9)
              // 1 2 3
              // 4 5 6
              // 7 8 9
              const margin = 20;

              // Horizontal
              if ([1, 4, 7].includes(position)) x = margin; // Left
              else if ([2, 5, 8].includes(position)) x = (width / 2) - (contentWidth / 2); // Center
              else x = width - contentWidth - margin; // Right

              // Vertical (PDF Y starts from bottom)
              if ([7, 8, 9].includes(position)) y = margin; // Bottom
              else if ([4, 5, 6].includes(position)) y = (height / 2) - (contentHeight / 2); // Center
              else y = height - contentHeight - margin; // Top

              // Draw
              if (type === 'text' && embedFont) {
                   page.drawText(text, {
                       x,
                       y,
                       size: textSize,
                       font: embedFont,
                       color: rgb(r, g, b),
                       opacity: opacity,
                       rotate: degrees(rotation),
                   });
              } else if (type === 'image' && embedImage && embedDims) {
                  page.drawImage(embedImage, {
                      x,
                      y,
                      width: embedDims.width,
                      height: embedDims.height,
                      opacity: opacity,
                      rotate: degrees(rotation),
                  });
              }
          });

          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          setResultUrl(URL.createObjectURL(blob));

      } catch (err) {
          console.error(err);
          alert("Failed to apply watermark");
      } finally {
          setIsProcessing(false);
      }
  };

  // Helper CSS Position for Preview Overlay
  const getPreviewStyle = (): React.CSSProperties => {
      const base: React.CSSProperties = {
          position: 'absolute',
          opacity: opacity,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center',
          pointerEvents: 'none'
      };

      // Map grid 1-9 to Flex alignment terms approximation
      // Note: Rotation changes the bounding box visual logic, but simple placement is enough for preview
      if ([1, 4, 7].includes(position)) base.left = '10%';
      if ([2, 5, 8].includes(position)) { base.left = '50%'; base.translate = '-50% 0'; }
      if ([3, 6, 9].includes(position)) { base.right = '10%'; }

      if ([1, 2, 3].includes(position)) base.top = '10%';
      if ([4, 5, 6].includes(position)) { base.top = '50%'; base.translate = base.translate ? '-50% -50%' : '0 -50%'; }
      if ([7, 8, 9].includes(position)) { base.bottom = '10%'; }
      
      return base;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
             <h2 className="text-xl font-semibold flex items-center gap-2 mb-4 md:mb-0">
                {t('nav.pdf_watermark')}
            </h2>
            {!file && (
                <label className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg font-medium cursor-pointer transition-colors shadow-sm flex items-center gap-2">
                    <Upload size={18} />
                    <span>Select PDF</span>
                    <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
                </label>
            )}
            {file && (
                <div className="flex items-center gap-4">
                     <span className="font-medium text-sm text-gray-600 dark:text-gray-300">{file.name}</span>
                     <button onClick={() => { setFile(null); setPreviewImage(null); setResultUrl(null); }} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                        <X size={18} />
                     </button>
                </div>
            )}
        </div>

        {file && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* PREVIEW AREA */}
                <div className="lg:col-span-2 bg-gray-100 dark:bg-gray-900 rounded-xl p-4 flex items-center justify-center min-h-[500px] border border-gray-200 dark:border-gray-700 relative overflow-hidden">
                    {previewImage ? (
                        <div className="relative shadow-lg max-w-full max-h-[70vh]">
                            <img src={previewImage} alt="PDF Preview" className="max-w-full max-h-[70vh] object-contain bg-white" />
                            
                            {/* OVERLAY */}
                            <div style={getPreviewStyle()} className="z-10 whitespace-nowrap transition-all duration-200 ease-out">
                                {type === 'text' ? (
                                    <span style={{ 
                                        fontSize: `${Math.max(12, textSize / 2)}px`, // Scale down for preview roughly
                                        color: textColor,
                                        fontWeight: isBold ? 'bold' : 'normal',
                                        fontStyle: isItalic ? 'italic' : 'normal',
                                        textShadow: '0 0 2px rgba(255,255,255,0.5)'
                                    }}>
                                        {text}
                                    </span>
                                ) : (
                                    watermarkPreview && (
                                        <img 
                                            src={watermarkPreview} 
                                            alt="wm" 
                                            style={{ 
                                                width: `${imageScale * 200}px`, // Approx width
                                            }} 
                                        />
                                    )
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-gray-400">
                            <Loader2 className="animate-spin" /> Loading preview...
                        </div>
                    )}
                </div>

                {/* CONTROLS AREA */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                    
                    {/* Tabs */}
                    <div className="flex border-b border-gray-100 dark:border-gray-700">
                        <button 
                            onClick={() => setType('text')}
                            className={`flex-1 py-4 font-medium text-sm flex items-center justify-center gap-2 transition-colors ${type === 'text' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            <Type size={18} /> {t('wm.tab_text')}
                        </button>
                        <button 
                            onClick={() => setType('image')}
                            className={`flex-1 py-4 font-medium text-sm flex items-center justify-center gap-2 transition-colors ${type === 'image' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            <ImageIcon size={18} /> {t('wm.tab_image')}
                        </button>
                    </div>

                    <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                        
                        {/* Type Specific Controls */}
                        {type === 'text' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('wm.text_label')}</label>
                                    <input 
                                        type="text" 
                                        value={text} 
                                        onChange={(e) => setText(e.target.value)}
                                        className="w-full p-2.5 rounded-lg border dark:bg-gray-700 dark:border-gray-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">{t('wm.format')}</label>
                                    <div className="flex gap-2 mb-2">
                                        <button onClick={() => setIsBold(!isBold)} className={`p-2 rounded border ${isBold ? 'bg-brand-100 border-brand-200 text-brand-700' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}><strong className="font-bold">B</strong></button>
                                        <button onClick={() => setIsItalic(!isItalic)} className={`p-2 rounded border ${isItalic ? 'bg-brand-100 border-brand-200 text-brand-700' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}><em className="italic">I</em></button>
                                        <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-[42px] w-[42px] rounded cursor-pointer" />
                                    </div>
                                    <input 
                                        type="range" min="10" max="120" value={textSize} onChange={(e) => setTextSize(Number(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>Size</span>
                                        <span>{textSize}px</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <label className="block w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-brand-500 transition-colors">
                                    <div className="bg-gray-100 dark:bg-gray-700 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <ImageIcon className="text-gray-500" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Upload Image</span>
                                    <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleWatermarkImageChange} />
                                </label>
                                {watermarkPreview && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Image Scale</p>
                                        <input 
                                            type="range" min="0.1" max="1.0" step="0.1" value={imageScale} onChange={(e) => setImageScale(Number(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <hr className="dark:border-gray-700" />

                        {/* Position Grid */}
                        <div>
                            <label className="block text-sm font-medium mb-2">{t('wm.position')}</label>
                            <div className="w-32 h-32 mx-auto grid grid-cols-3 gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                {[1,2,3,4,5,6,7,8,9].map((pos) => (
                                    <button
                                        key={pos}
                                        onClick={() => setPosition(pos as Position)}
                                        className={`rounded hover:bg-white dark:hover:bg-gray-600 transition-all ${position === pos ? 'bg-brand-500 ring-2 ring-brand-300' : 'bg-gray-300 dark:bg-gray-500'}`}
                                    >
                                        {position === pos && <div className="w-1.5 h-1.5 bg-white rounded-full mx-auto" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Transparency & Rotation */}
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="text-sm font-medium">{t('wm.transparency')}</label>
                                    <span className="text-xs text-gray-500">{Math.round((1-opacity)*100)}%</span>
                                </div>
                                <input 
                                    type="range" min="0.1" max="1.0" step="0.1" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="text-sm font-medium">{t('wm.rotation')}</label>
                                    <select 
                                        value={rotation} 
                                        onChange={(e) => setRotation(Number(e.target.value))}
                                        className="text-xs border rounded p-1 dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="0">0°</option>
                                        <option value="45">45°</option>
                                        <option value="90">90°</option>
                                        <option value="-45">-45°</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Action */}
                    <div className="p-6 border-t border-gray-100 dark:border-gray-700">
                        <button
                            onClick={processPDF}
                            disabled={isProcessing}
                            className="w-full bg-brand-600 hover:bg-brand-700 text-white px-4 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-brand-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Stamp size={20} />}
                            {t('wm.action')}
                        </button>
                        
                        {resultUrl && (
                             <a 
                                href={resultUrl} 
                                download={`watermarked_${Date.now()}.pdf`}
                                className="mt-3 flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition-colors"
                            >
                                <Download size={18} /> {t('image.download')}
                            </a>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default PDFWatermarkTool;