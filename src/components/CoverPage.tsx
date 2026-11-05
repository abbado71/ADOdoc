import React from 'react';
import { Layers, Plus, BookOpen } from 'lucide-react';
import { APP_NAME, APP_VERSION } from '../config';

interface CoverPageProps {
  onOpenSidebar: () => void;
  onOpenNewTopicModal: () => void;
  version?: string;
  hasTopics?: boolean;
}

export const CoverPage: React.FC<CoverPageProps> = ({
  onOpenSidebar,
  onOpenNewTopicModal,
  version = APP_VERSION,
  hasTopics = true,
}) => {
  return (
    <div className="w-full max-w-[850px] mx-auto transition-transform origin-top duration-150 ease-out">
      <div className="google-doc-page relative bg-white border border-gray-200 shadow-md my-2 sm:my-4 rounded-xs min-h-[500px] sm:min-h-[640px] pt-8 sm:pt-14 pb-12 px-6 sm:px-12 flex flex-col items-center justify-start select-none">
        {/* Top Decorative Border Accent */}
        <div className="w-16 h-1 bg-blue-600 rounded-full mb-8 sm:mb-10" />

        {/* Branding & Version: positioned comfortably high on the page */}
        <div className="flex flex-col items-center text-center px-4 max-w-lg space-y-5">
          {/* App Logo Emblem */}
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-lg border-2 border-gray-100 flex items-center justify-center bg-slate-900 transition-transform hover:scale-105 duration-200">
            <img
              src="apple-touch-icon.png"
              alt="ADOdoc Logo"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Title: ADOdoc */}
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight font-['Google_Sans']">
              {APP_NAME}
            </h1>
            <p className="text-sm sm:text-base font-semibold text-gray-500 tracking-wider uppercase">
              Versione {version}
            </p>
          </div>

          {/* Clean Action Buttons */}
          <div className="pt-4 sm:pt-6 flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs justify-center">
            {hasTopics ? (
              <button
                type="button"
                onClick={onOpenSidebar}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Apri Indice</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={onOpenNewTopicModal}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Nuovo Argomento</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
