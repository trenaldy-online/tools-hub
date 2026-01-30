import React, { useState } from 'react';
import { View } from '../types';
import { TOOLS_CONFIG } from '../constants';
import * as Icons from 'lucide-react';

interface Props {
  t: (key: string) => string;
  setCurrentView: (view: View) => void;
  recentTools: View[];
}

const Dashboard: React.FC<Props> = ({ t, setCurrentView, recentTools }) => {
  const [search, setSearch] = useState('');

  const getToolTitle = (id: View) => {
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

  const filteredTools = TOOLS_CONFIG.filter(tool => {
    const title = getToolTitle(tool.id);
    return title.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-brand-600 to-brand-500 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">{t('dashboard.welcome')}</h1>
        <p className="opacity-90 mb-6">Access all your productivity tools in one place, securely on your client.</p>
        
        <div className="relative max-w-md">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('dashboard.search')}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-gray-900 bg-white shadow-sm outline-none focus:ring-2 focus:ring-white/50"
            />
        </div>
      </div>

      <section>
         <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">All Tools</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredTools.map(tool => {
                const Icon = (Icons as any)[tool.icon];
                return (
                    <button
                        key={tool.id}
                        onClick={() => setCurrentView(tool.id)}
                        className="group bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-brand-200 dark:hover:border-brand-900 transition-all text-left"
                    >
                        <div className={`w-12 h-12 rounded-lg ${tool.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                            <Icon className={tool.color} size={24} />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {getToolTitle(tool.id)}
                        </h3>
                    </button>
                );
            })}
         </div>
      </section>

      {recentTools.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('dashboard.recent')}</h2>
             <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {recentTools.map((toolId, index) => {
                    const tool = TOOLS_CONFIG.find(t => t.id === toolId);
                    if (!tool) return null;
                    const Icon = (Icons as any)[tool.icon];
                    return (
                        <button 
                            key={`${toolId}-${index}`}
                            onClick={() => setCurrentView(toolId)}
                            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                        >
                             <div className={`w-10 h-10 rounded-lg ${tool.bg} flex items-center justify-center`}>
                                <Icon className={tool.color} size={20} />
                            </div>
                            <span className="font-medium">{getToolTitle(toolId)}</span>
                            <Icons.ChevronRight className="ml-auto text-gray-400" size={16} />
                        </button>
                    );
                })}
             </div>
          </section>
      )}
    </div>
  );
};

export default Dashboard;