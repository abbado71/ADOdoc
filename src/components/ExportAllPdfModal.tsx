import React, { useState } from 'react';
import {
  X,
  FileArchive,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
} from 'lucide-react';
import { Topic } from '../types';
import { exportAllTopicsToSinglePdf } from '../utils/pdfExport';

interface ExportAllPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  topics: Topic[];
  onNotify?: (message: string) => void;
}

export const ExportAllPdfModal: React.FC<ExportAllPdfModalProps> = ({
  isOpen,
  onClose,
  topics,
  onNotify,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    if (topics.length === 0) {
      setErrorMessage('Non ci sono argomenti da esportare.');
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);
    setIsSuccess(false);
    setProgressPercent(0);
    setProgressStatus('Inizializzazione esportazione...');

    try {
      const result = await exportAllTopicsToSinglePdf(topics, {
        onProgress: (status, current, total) => {
          setProgressStatus(status);
          const pct = Math.round((current / (total || 1)) * 100);
          setProgressPercent(pct);
        },
      });

      setIsSuccess(true);
      if (onNotify) {
        onNotify(`Archivio PDF generato con successo (${result.totalPages} pagine)!`);
      }

      // Close modal automatically after brief success delay
      setTimeout(() => {
        setIsExporting(false);
        setIsSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Errore esportazione PDF completo:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Errore durante la creazione del PDF completo.'
      );
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in print:hidden">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#f8fafd]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Esporta tutto in un unico PDF
              </h3>
              <p className="text-xs text-gray-500">
                Genera un volume PDF completo con indice e tutti gli argomenti
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Summary Banner */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Layers className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-blue-950">
                Raccolta completa di {topics.length} {topics.length === 1 ? 'argomento' : 'argomenti'}
              </p>
              <p className="text-blue-800 leading-relaxed">
                Il documento includerà una prima pagina con l&apos;<strong>Indice generale</strong> e
                ogni argomento inizierà su una pagina dedicata con titolo, categoria, testo formattato
                e immagini.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {isSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5 font-medium">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>File PDF scaricato con successo sul tuo computer!</span>
            </div>
          )}

          {/* Topics Preview List */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Argomenti che verranno inclusi ({topics.length}):
            </span>
            <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-100 bg-gray-50/50">
              {topics.map((t, idx) => (
                <div key={t.id} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-bold text-blue-600 w-5 shrink-0 text-right">
                      {idx + 1}.
                    </span>
                    <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="font-medium text-gray-900 truncate">
                      {t.title || 'Senza Titolo'}
                    </span>
                  </div>
                  {t.category && (
                    <span className="text-[10px] font-semibold text-gray-600 bg-gray-200/70 px-2 py-0.5 rounded-md shrink-0">
                      {t.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Progress Section */}
          {isExporting && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-800 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  {progressStatus || 'Elaborazione in corso...'}
                </span>
                <span className="font-bold text-blue-600">{progressPercent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-xs cursor-pointer"
          >
            Chiudi
          </button>

          <button
            onClick={handleStartExport}
            disabled={isExporting || topics.length === 0}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Creazione in corso...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Scarica Tutto in PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
