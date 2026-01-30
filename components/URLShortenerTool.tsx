import React, { useState, useEffect } from 'react';
import { Copy, Trash2, Link as LinkIcon, Settings, AlertCircle, ExternalLink, Globe, Check, AlertTriangle } from 'lucide-react';
import { ShortenedURL } from '../types';

interface Props {
  t: (key: string) => string;
}

const URLShortenerTool: React.FC<Props> = ({ t }) => {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<'mock' | 'api'>('mock');
  const [history, setHistory] = useState<ShortenedURL[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // API Mode State (Placeholder)
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('https://api.tinyurl.com/create');

  useEffect(() => {
    const saved = localStorage.getItem('url_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveHistory = (newHistory: ShortenedURL[]) => {
    setHistory(newHistory);
    localStorage.setItem('url_history', JSON.stringify(newHistory));
  };

  const generateMockSlug = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleShorten = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    if (mode === 'api') {
      alert("API Mode is for demonstration. In a real environment, this would send a POST request to the endpoint using your API Key.");
      return;
    }

    // Mock Mode Logic
    const slug = generateMockSlug();
    const shortUrl = `https://oth.local/${slug}`;
    
    const newEntry: ShortenedURL = {
      id: Date.now().toString(),
      originalUrl: url,
      slug: shortUrl,
      createdAt: Date.now(),
      clicks: 0
    };

    saveHistory([newEntry, ...history]);
    setUrl('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this from history?')) {
        saveHistory(history.filter(h => h.id !== id));
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      
      {/* DEVELOPMENT WARNING BANNER */}
      <div className="bg-red-100 dark:bg-red-900/40 border-l-8 border-red-600 p-6 rounded-r-lg shadow-sm flex items-start gap-4">
        <AlertTriangle className="text-red-600 dark:text-red-500 shrink-0 w-8 h-8 mt-1" strokeWidth={2.5} />
        <div>
            <h3 className="text-xl font-bold text-red-800 dark:text-red-200 uppercase tracking-wide">
                Dalam Tahap Pengembangan
            </h3>
            <p className="text-red-700 dark:text-red-300 font-medium mt-1 text-lg">
                Fitur ini belum dapat digunakan sepenuhnya.
            </p>
            <p className="text-red-600/80 dark:text-red-400/80 text-sm mt-2">
                Fungsi backend dan API belum terhubung. URL yang dihasilkan hanya simulasi (mock) lokal.
            </p>
        </div>
      </div>

      {/* Tool Header & Mode Switch */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 opacity-75 pointer-events-none grayscale-[0.5]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
                {t('nav.url')}
            </h2>
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg self-start md:self-auto">
                <button
                    onClick={() => setMode('mock')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        mode === 'mock' 
                        ? 'bg-white dark:bg-gray-600 text-brand-600 dark:text-brand-300 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    {t('url.mode.mock')}
                </button>
                <button
                    onClick={() => setMode('api')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        mode === 'api' 
                        ? 'bg-white dark:bg-gray-600 text-brand-600 dark:text-brand-300 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    {t('url.mode.api')}
                </button>
            </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-lg flex items-start gap-3 mb-6">
            <AlertCircle className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-blue-800 dark:text-blue-200">
                {mode === 'mock' 
                    ? "Mock Mode runs entirely in your browser. It generates a fake 'local' URL for testing and keeps a history record. It does not actually create a redirect on the internet."
                    : "API Mode allows you to configure a real URL shortening service endpoint. This requires a backend or third-party API key."
                }
            </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleShorten} className="space-y-4">
            {mode === 'api' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                        <label className="block text-xs font-medium uppercase text-gray-500 mb-1">API Endpoint</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                value={endpoint}
                                onChange={(e) => setEndpoint(e.target.value)}
                                className="w-full pl-9 p-2.5 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium uppercase text-gray-500 mb-1">API Key</label>
                        <div className="relative">
                            <Settings className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="password" 
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk_..."
                                className="w-full pl-9 p-2.5 rounded-lg border dark:bg-gray-700 dark:border-gray-600 text-sm"
                            />
                        </div>
                    </div>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium mb-1">{t('qr.label')}</label>
                <div className="flex gap-2">
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder={t('url.placeholder')}
                        required
                        className="flex-1 p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                    <button 
                        type="submit"
                        className="bg-brand-600 hover:bg-brand-700 text-white px-6 rounded-lg font-medium transition-colors"
                    >
                        {t('url.shorten')}
                    </button>
                </div>
            </div>
        </form>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden opacity-50 grayscale pointer-events-none">
             <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t('url.history')}</h3>
                <button 
                    onClick={() => { if(confirm('Clear all history?')) { setHistory([]); localStorage.removeItem('url_history'); } }}
                    className="text-xs text-red-500 hover:text-red-600"
                >
                    Clear All
                </button>
             </div>
             
             <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {history.map((item) => (
                    <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between group">
                        <div className="flex items-center gap-4 overflow-hidden">
                             <div className="bg-brand-100 dark:bg-brand-900/30 p-2 rounded-lg text-brand-600">
                                <LinkIcon size={20} />
                             </div>
                             <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-brand-600 dark:text-brand-400 truncate">{item.slug}</p>
                                    <span className="text-xs text-gray-400 hidden sm:inline-block">• {new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-gray-500 truncate max-w-[200px] sm:max-w-md">{item.originalUrl}</p>
                             </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleCopy(item.slug, item.id)}
                                className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors relative"
                                title={t('common.copy')}
                            >
                                {copiedId === item.id ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                            <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title={t('common.delete')}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
             </div>
        </div>
      )}
    </div>
  );
};

export default URLShortenerTool;