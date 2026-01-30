import React, { useState, useEffect } from 'react';
import { View, Language } from './types';
import { TRANSLATIONS } from './constants';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import QRCodeTool from './components/QRCodeTool';
import ImageCompressorTool from './components/ImageCompressorTool';
import PDFCompressorTool from './components/PDFCompressorTool';
import PDFMergeTool from './components/PDFMergeTool';
import PDFSplitTool from './components/PDFSplitTool';
import PDFWatermarkTool from './components/PDFWatermarkTool';
import URLShortenerTool from './components/URLShortenerTool';
import { Menu } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [language, setLanguage] = useState<Language>(Language.ID);
  const [darkMode, setDarkMode] = useState(false);
  const [recentTools, setRecentTools] = useState<View[]>([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Initialize
  useEffect(() => {
    // Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // Language
    const savedLang = localStorage.getItem('lang') as Language;
    if (savedLang && Object.values(Language).includes(savedLang)) {
      setLanguage(savedLang);
    }

    // Recent
    const savedRecent = localStorage.getItem('recent_tools');
    if (savedRecent) {
      setRecentTools(JSON.parse(savedRecent));
    }
  }, []);

  // Theme Toggle
  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newVal = !prev;
      if (newVal) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', newVal ? 'dark' : 'light');
      return newVal;
    });
  };

  // Language Set
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  // View Navigation wrapper to track history
  const navigateTo = (view: View) => {
    setCurrentView(view);
    if (view !== View.DASHBOARD) {
        setRecentTools(prev => {
            const newRecent = [view, ...prev.filter(v => v !== view)].slice(0, 5);
            localStorage.setItem('recent_tools', JSON.stringify(newRecent));
            return newRecent;
        });
    }
  };

  const t = (key: string) => TRANSLATIONS[language][key] || key;

  const renderContent = () => {
    switch (currentView) {
      case View.QR_CODE: return <QRCodeTool t={t} />;
      case View.IMAGE_COMPRESS: return <ImageCompressorTool t={t} />;
      case View.PDF_COMPRESS: return <PDFCompressorTool t={t} />;
      case View.PDF_MERGE: return <PDFMergeTool t={t} />;
      case View.PDF_SPLIT: return <PDFSplitTool t={t} />;
      case View.PDF_WATERMARK: return <PDFWatermarkTool t={t} />;
      case View.URL_SHORTENER: return <URLShortenerTool t={t} />;
      default: return <Dashboard t={t} setCurrentView={navigateTo} recentTools={recentTools} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <Sidebar 
        currentView={currentView}
        setCurrentView={navigateTo}
        language={language}
        setLanguage={handleSetLanguage}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        t={t}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      <main className="lg:ml-64 min-h-screen flex flex-col transition-all duration-200">
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 lg:hidden sticky top-0 z-30">
             <div className="font-bold text-lg">Office Tools Hub</div>
             <button onClick={() => setIsMobileOpen(true)} className="p-2 text-gray-600 dark:text-gray-300">
                <Menu />
             </button>
        </header>

        <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
            {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;