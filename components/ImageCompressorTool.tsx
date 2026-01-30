import React, { useState, useEffect } from 'react';
import { Upload, Download, Image as ImageIcon } from 'lucide-react';

interface Props {
  t: (key: string) => string;
}

const ImageCompressorTool: React.FC<Props> = ({ t }) => {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [compressedPreview, setCompressedPreview] = useState<string | null>(null);
  const [quality, setQuality] = useState(0.8);
  const [format, setFormat] = useState<'image/jpeg' | 'image/webp' | 'image/png'>('image/jpeg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);

  // Cleanup object URLs when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
      if (compressedPreview) URL.revokeObjectURL(compressedPreview);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Cleanup previous preview
      if (preview) URL.revokeObjectURL(preview);
      
      const file = e.target.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setCompressedPreview(null);
      setCompressedBlob(null);
    }
  };

  const handleReset = () => {
      if (preview) URL.revokeObjectURL(preview);
      if (compressedPreview) URL.revokeObjectURL(compressedPreview);
      
      setImage(null);
      setPreview(null);
      setCompressedPreview(null);
      setCompressedBlob(null);
      
      // Reset file input value so same file can be selected again
      const fileInput = document.getElementById('image-upload') as HTMLInputElement;
      if (fileInput) {
          fileInput.value = '';
      }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processImage = async () => {
    if (!image || !preview) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.src = preview;
      await new Promise((resolve, reject) => { 
          img.onload = resolve;
          img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // Simple max dimension check
      const MAX_DIM = 2000;
      if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
          } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
          }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context failed");
      
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (blob) {
            if (compressedPreview) URL.revokeObjectURL(compressedPreview);
            setCompressedBlob(blob);
            setCompressedPreview(URL.createObjectURL(blob));
        }
        setIsProcessing(false);
      }, format, quality);

    } catch (error) {
      console.error(error);
      setIsProcessing(false);
      alert("Failed to process image.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
        <input
            type="file"
            id="image-upload"
            className="hidden"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleFileChange}
        />
        {!preview ? (
            <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-brand-500 transition-colors">
                <div className="bg-brand-50 dark:bg-brand-900/30 p-4 rounded-full mb-3">
                    <Upload className="text-brand-600" size={32} />
                </div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{t('image.drop')}</p>
                <p className="text-sm text-gray-400 mt-1">Click to browse</p>
            </label>
        ) : (
            <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <p className="font-medium text-gray-500">Original</p>
                        <div className="h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                             <img src={preview} alt="Original" className="max-h-full object-contain" />
                        </div>
                        <p className="text-sm">{formatSize(image?.size || 0)}</p>
                    </div>
                    
                    <div className="space-y-2">
                        <p className="font-medium text-gray-500">Compressed</p>
                        <div className="h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            {compressedPreview ? (
                                <img src={compressedPreview} alt="Compressed" className="max-h-full object-contain" />
                            ) : (
                                <div className="text-gray-400 text-sm">Waiting to compress...</div>
                            )}
                        </div>
                         <p className="text-sm">
                            {compressedBlob ? (
                                <span className={compressedBlob.size < (image?.size || 0) ? 'text-green-600 font-bold' : 'text-gray-500'}>
                                    {formatSize(compressedBlob.size)}
                                    {compressedBlob.size < (image?.size || 0) && ` (-${Math.round((1 - compressedBlob.size / (image?.size || 1)) * 100)}%)`}
                                </span>
                            ) : '-'}
                        </p>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-4 text-left">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Format</label>
                            <select 
                                value={format} 
                                onChange={(e) => setFormat(e.target.value as any)}
                                className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="image/jpeg">JPEG</option>
                                <option value="image/png">PNG</option>
                                <option value="image/webp">WebP</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('image.quality')} ({Math.round(quality * 100)}%)</label>
                            <input 
                                type="range" 
                                min="0.1" 
                                max="1.0" 
                                step="0.1" 
                                value={quality}
                                onChange={(e) => setQuality(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
                            />
                        </div>
                     </div>
                </div>

                <div className="flex justify-center gap-3">
                     <button
                        onClick={handleReset}
                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Reset
                    </button>
                    <button
                        onClick={processImage}
                        disabled={isProcessing}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        {isProcessing ? 'Processing...' : t('image.compress')}
                    </button>
                    {compressedBlob && compressedPreview && (
                         <a
                            href={compressedPreview}
                            download={`compressed.${format.split('/')[1]}`}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <Download size={18} />
                            {t('image.download')}
                        </a>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ImageCompressorTool;