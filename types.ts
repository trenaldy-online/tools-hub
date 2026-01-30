export enum View {
  DASHBOARD = 'DASHBOARD',
  QR_CODE = 'QR_CODE',
  PDF_COMPRESS = 'PDF_COMPRESS',
  PDF_MERGE = 'PDF_MERGE',
  PDF_SPLIT = 'PDF_SPLIT',
  PDF_WATERMARK = 'PDF_WATERMARK',
  IMAGE_COMPRESS = 'IMAGE_COMPRESS',
  URL_SHORTENER = 'URL_SHORTENER',
}

export enum Language {
  EN = 'en',
  ID = 'id',
}

export interface ToolCard {
  id: View;
  title: string;
  description: string;
  icon: string;
}

export interface AppContextType {
  currentView: View;
  setCurrentView: (view: View) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  recentTools: View[];
  addRecentTool: (view: View) => void;
  translations: Record<string, string>;
}

export interface ShortenedURL {
  id: string;
  originalUrl: string;
  slug: string;
  createdAt: number;
  clicks: number;
}