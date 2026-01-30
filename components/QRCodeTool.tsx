import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { Download, Upload, X, Loader2 } from 'lucide-react';
import { AppContextType } from '../types';

interface Props {
  t: (key: string) => string;
}

const QRCodeTool: React.FC<Props> = ({ t }) => {
  const [text, setText] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [colorDark, setColorDark] = useState('#000000');
  const [colorLight, setColorLight] = useState('#ffffff');
  const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [margin, setMargin] = useState(4);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(0.2); // Percentage of QR width (0.1 - 0.3)
  const [showText, setShowText] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setLogo(ev.target?.result as string);
        // Automatically switch to High error correction for better logo support
        setErrorCorrection('H');
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Helper function to generate QR Data URL with specific size
  const createQRImage = async (size: number): Promise<string | null> => {
    if (!text) return null;
    try {
      // Generate basic QR
      const qrUrl = await QRCode.toDataURL(text, {
        width: size,
        margin: margin,
        color: {
          dark: colorDark,
          light: colorLight,
        },
        errorCorrectionLevel: errorCorrection,
      });

      // Calculate dimensions for text area if enabled
      const fontSize = Math.floor(size * 0.04); // 4% of total width
      const textPadding = Math.floor(size * 0.03);
      const textAreaHeight = showText ? (fontSize + (textPadding * 2)) : 0;
      
      // Composition on Canvas
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size + textAreaHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // 1. Fill Background (Entire Canvas)
      ctx.fillStyle = colorLight;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw QR
      const qrImg = new Image();
      qrImg.src = qrUrl;
      await new Promise((resolve) => { qrImg.onload = resolve; });
      ctx.drawImage(qrImg, 0, 0, size, size);

      // 3. Draw Logo (if exists)
      if (logo) {
        const logoImg = new Image();
        logoImg.src = logo;
        await new Promise((resolve) => { logoImg.onload = resolve; });

        const targetW = size * logoSize;
        const scale = targetW / logoImg.width;
        const targetH = logoImg.height * scale;
        const x = (size - targetW) / 2;
        const y = (size - targetH) / 2;

        // Draw background behind logo
        ctx.fillStyle = colorLight;
        ctx.fillRect(x, y, targetW, targetH);
        ctx.drawImage(logoImg, x, y, targetW, targetH);
      }

      // 4. Draw Text (if enabled)
      if (showText) {
          ctx.fillStyle = colorDark;
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Truncate text if too long to fit in canvas width with some padding
          let textToDraw = text;
          const maxTextWidth = size * 0.9;
          if (ctx.measureText(textToDraw).width > maxTextWidth) {
               // Simple truncation logic
               while (ctx.measureText(textToDraw + '...').width > maxTextWidth && textToDraw.length > 0) {
                   textToDraw = textToDraw.slice(0, -1);
               }
               textToDraw += '...';
          }

          ctx.fillText(textToDraw, size / 2, size + (textAreaHeight / 2) - (textPadding * 0.2));
      }

      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // Effect for Preview (Standard Size ~1000px)
  useEffect(() => {
    const updatePreview = async () => {
        const url = await createQRImage(1000);
        setQrDataUrl(url);
    };
    
    const timer = setTimeout(() => {
      if (text) updatePreview();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, colorDark, colorLight, errorCorrection, margin, logo, logoSize, showText]);

  // Handler for High-Res Download (5000px)
  const handleDownload = async () => {
    if (!text) return;
    setIsDownloading(true);

    // Small delay to allow UI to show loading state
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        const highResUrl = await createQRImage(5000);
        if (highResUrl) {
            const link = document.createElement('a');
            link.download = `qrcode-${Date.now()}.png`;
            link.href = highResUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) {
        console.error("Failed to generate high-res QR", error);
        alert("Failed to generate high resolution image.");
    } finally {
        setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
           {t('nav.qr')}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('qr.label')}</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="https://example.com"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Colors */}
             <div>
              <label className="block text-sm font-medium mb-1">Foreground</label>
              <input 
                  type="color" 
                  value={colorDark} 
                  onChange={(e) => setColorDark(e.target.value)}
                  className="h-10 w-full rounded cursor-pointer" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Background</label>
              <input 
                  type="color" 
                  value={colorLight} 
                  onChange={(e) => setColorLight(e.target.value)}
                  className="h-10 w-full rounded cursor-pointer" 
              />
            </div>

            {/* Configs */}
             <div>
                <label className="block text-sm font-medium mb-1">Error Correction</label>
                <select 
                    value={errorCorrection}
                    onChange={(e) => setErrorCorrection(e.target.value as any)}
                    className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600"
                >
                    <option value="L">Low (7%)</option>
                    <option value="M">Medium (15%)</option>
                    <option value="Q">Quartile (25%)</option>
                    <option value="H">High (30%)</option>
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium mb-1">Margin</label>
                <input 
                    type="number" 
                    min="0" 
                    max="10" 
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600"
                />
             </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="showText"
                checked={showText}
                onChange={(e) => setShowText(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
              />
              <label htmlFor="showText" className="text-sm font-medium cursor-pointer select-none">
                  {t('qr.showText')}
              </label>
          </div>

          {/* Logo Section */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <label className="block text-sm font-medium mb-2">{t('qr.logo')}</label>
              {!logo ? (
                <label className="flex items-center gap-2 cursor-pointer w-fit bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-gray-700 dark:text-gray-300">
                    <Upload size={18} />
                    <span>{t('qr.upload')}</span>
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
              ) : (
                <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="h-12 w-12 bg-white dark:bg-gray-800 rounded border dark:border-gray-600 flex items-center justify-center p-1">
                        <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between mb-1">
                            <span className="text-xs font-medium text-gray-500">{t('qr.size')}</span>
                            <span className="text-xs text-gray-500">{Math.round(logoSize * 100)}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0.1" 
                            max="0.35" 
                            step="0.01" 
                            value={logoSize} 
                            onChange={(e) => setLogoSize(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
                        />
                    </div>
                    <button 
                        onClick={() => setLogo(null)} 
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
              )}
          </div>
        </div>
      </div>

      {qrDataUrl && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center space-y-4">
          <img src={qrDataUrl} alt="Generated QR" className="border-4 border-white shadow-md rounded-lg max-w-full h-auto" />
          
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            {isDownloading ? 'Generating 5000px...' : t('qr.download')}
          </button>
        </div>
      )}
    </div>
  );
};

export default QRCodeTool;