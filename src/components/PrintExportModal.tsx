import React, { useState } from 'react';
import {
  X,
  Printer,
  FileDown,
  Share2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileText,
  FileArchive,
} from 'lucide-react';
import { Topic } from '../types';
import { exportTopicToPdf, isIosStandalone } from '../utils/pdfExport';

interface PrintExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: Topic | null;
  onNativePrint: () => void;
  onExportAllPdf?: () => void;
  topicsCount?: number;
}

export const PrintExportModal: React.FC<PrintExportModalProps> = ({
  isOpen,
  onClose,
  topic,
  onNativePrint,
  onExportAllPdf,
  topicsCount,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !topic) return null;

  const isStandalone = isIosStandalone();

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    setErrorMessage(null);
    try {
      await exportTopicToPdf(topic, {
        onProgress: (status) => setProgressStatus(status),
      });
      // Close modal on success after brief pause
      setTimeout(() => {
        setIsExportingPdf(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Errore esportazione PDF:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Impossibile generare il PDF. Riprova.'
      );
      setIsExportingPdf(false);
    }
  };

  const handleDirectPrint = () => {
    onClose();
    // Allow modal DOM unmount before invoking print
    setTimeout(() => {
      onNativePrint();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in print:hidden">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#f8fafd]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Stampa / Salva in PDF</h3>
              <p className="text-[11px] text-gray-500">Esporta o stampa il tuo documento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExportingPdf}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Active Document Info Card */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              {topic.category && (
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                  {topic.category}
                </span>
              )}
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                {topic.title}
              </h4>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Options */}
          <div className="space-y-3">
            {/* Option 1: PDF Export (Supports iOS native share sheet, AirPrint, Files) */}
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="w-full p-4 rounded-xl border-2 border-blue-600 bg-blue-50/50 hover:bg-blue-50 text-left transition-all group cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-60"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                  <FileDown className="w-5 h-5 group-hover:scale-110 transition-transform text-blue-600" />
                  <span>Esporta come File PDF</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-600 text-white rounded-full">
                  Consigliato
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Genera il file PDF del documento con formattazione e immagini.
              </p>
              {isStandalone && (
                <p className="text-[11px] text-blue-800 font-medium mt-2 bg-blue-100/60 p-2 rounded-lg flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span>
                    Su iPhone apre il menu per <strong>Stampare (AirPrint)</strong> o salvare su <strong>File</strong>.
                  </span>
                </p>
              )}
            </button>

            {/* Option 2: Direct browser print (Only if NOT iOS standalone, or as alternative) */}
            {!isStandalone && (
              <button
                onClick={handleDirectPrint}
                disabled={isExportingPdf}
                className="w-full p-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-left transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60"
              >
                <div className="flex items-center gap-2 text-gray-800 font-semibold text-xs sm:text-sm mb-1">
                  <Printer className="w-4 h-4 text-gray-600" />
                  <span>Finestra di Stampa del Browser</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Apre la consueta schermata di stampa di sistema o del browser.
                </p>
              </button>
            )}

            {/* Option 3: Export all topics into a single PDF */}
            {onExportAllPdf && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    onClose();
                    onExportAllPdf();
                  }}
                  disabled={isExportingPdf}
                  className="w-full p-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-left transition-all cursor-pointer flex items-center justify-between group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileArchive className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-900 block group-hover:text-blue-700 transition-colors">
                        Esporta tutti gli argomenti in un unico PDF
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {topicsCount ? `Tutti i ${topicsCount} argomenti in un unico file con indice` : 'Archivio completo con indice'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    Tutti
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Exporting Progress Spinner */}
          {isExportingPdf && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center gap-2 text-xs text-blue-800 font-medium animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>{progressStatus || 'Generazione PDF in corso...'}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
          <button
            onClick={onClose}
            disabled={isExportingPdf}
            className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-xs cursor-pointer"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};
