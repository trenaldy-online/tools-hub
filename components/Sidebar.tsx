import React from 'react';
import { View, Language } from '../types';
import * as Icons from 'lucide-react';
import { TOOLS_CONFIG } from '../constants';

interface Props {
  currentView: View;
  setCurrentView: (view: View) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  t: (key: string) => string;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const Sidebar: React.FC<Props> = ({
  currentView,
  setCurrentView,
  language,
  setLanguage,
  darkMode,
  toggleDarkMode,
  t,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const getLabel = (id: View) => {
    switch (id) {
      case View.QR_CODE: return t('nav.qr');
      case View.PDF_COMPRESS: return t('nav.pdf');
      case View.PDF_MERGE: return t('nav.pdf_merge');
      case View.PDF_SPLIT: return t('nav.pdf_split');
      case View.PDF_WATERMARK: return t('nav.pdf_watermark');
      case View.IMAGE_COMPRESS: return t('nav.image');
      case View.URL_SHORTENER: return t('nav.url');
      default: return '';
    }
  };

  const NavItem = ({ view, label, iconName }: { view: View; label: string; iconName: string }) => {
    const Icon = (Icons as any)[iconName] || Icons.HelpCircle;
    const isActive = currentView === view;
    
    return (
      <button
        onClick={() => {
            setCurrentView(view);
            setIsMobileOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          isActive
            ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 font-medium'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
      >
        <Icon size={20} />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center mr-3">
               <Icons.Command className="text-white" size={20} />
            </div>
            <span className="font-bold text-lg tracking-tight">Tools Hub</span>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            <NavItem view={View.DASHBOARD} label={t('nav.dashboard')} iconName="LayoutDashboard" />
            
            <div className="pt-4 pb-2">
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tools</p>
            </div>
            
            {TOOLS_CONFIG.map(tool => (
                <NavItem 
                    key={tool.id}
                    view={tool.id}
                    label={getLabel(tool.id)}
                    iconName={tool.icon}
                />
            ))}
          </div>

          {/* Footer controls */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <button
                onClick={toggleDarkMode}
                className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
                <div className="flex items-center gap-3">
                    {darkMode ? <Icons.Moon size={18} /> : <Icons.Sun size={18} />}
                    <span>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
                </div>
            </button>

            <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                    onClick={() => setLanguage(Language.EN)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${language === Language.EN ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                    English
                </button>
                 <button
                    onClick={() => setLanguage(Language.ID)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${language === Language.ID ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                    Indonesia
                </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;