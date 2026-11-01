import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  topicTitle: string;
  hasDriveSync: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  topicTitle,
  hasDriveSync,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
      <div 
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-red-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 id="modal-headline" className="text-lg font-semibold text-gray-900">
              Conferma Eliminazione
            </h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-gray-700 leading-relaxed text-sm">
            Sei sicuro di voler eliminare l&apos;argomento:
          </p>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 font-medium text-gray-900 text-sm break-words">
            &ldquo;{topicTitle}&rdquo;
          </div>
          {hasDriveSync && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs leading-relaxed">
              <strong>Nota Google Drive:</strong> Questo documento è sincronizzato con Google Drive. Eliminandolo, verrà rimosso anche dal tuo spazio di archiviazione Google Drive.
            </div>
          )}
          <p className="text-xs text-gray-500">
            Questa operazione è permanente e non può essere annullata.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-xs"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-60"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Eliminazione in corso...' : 'Elimina Argomento'}
          </button>
        </div>
      </div>
    </div>
  );
};
