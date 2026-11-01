import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  CloudUpload,
  DownloadCloud,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  FolderOpen,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Topic } from '../types';
import { User } from 'firebase/auth';
import { isTokenExpired } from '../services/firebaseAuth';
import {
  listAppFilesFromDrive,
  saveTopicToGoogleDrive,
  saveAllTopicsBackupToDrive,
  loadTopicFromDrive,
  loadAllTopicsBackupFromDrive,
  syncAllTopicsBiDirectional,
  DriveFileSummary,
} from '../services/googleDriveService';

interface DriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  accessToken: string | null;
  currentTopic: Topic | null;
  allTopics: Topic[];
  onTopicUpdated: (updatedTopic: Topic) => void;
  onTopicsBatchUpdated?: (updatedTopics: Topic[]) => void;
  onImportTopic: (importedTopic: Topic) => void;
  onGoogleSignIn: () => void;
}

export const DriveSyncModal: React.FC<DriveSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  accessToken,
  currentTopic,
  allTopics,
  onTopicUpdated,
  onTopicsBatchUpdated,
  onImportTopic,
  onGoogleSignIn,
}) => {
  const [driveFiles, setDriveFiles] = useState<DriveFileSummary[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isSyncingCurrent, setIsSyncingCurrent] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isSyncingFull, setIsSyncingFull] = useState(false);
  const [importingFileId, setImportingFileId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen && accessToken) {
      loadDriveFiles();
    }
  }, [isOpen, accessToken]);

  const loadDriveFiles = async () => {
    if (!accessToken) return;
    setIsLoadingFiles(true);
    try {
      const files = await listAppFilesFromDrive(accessToken);
      setDriveFiles(files);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Errore nel caricamento dei file da Google Drive';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  if (!isOpen) return null;

  const handleSyncCurrent = async () => {
    if (!accessToken) {
      onGoogleSignIn();
      return;
    }
    if (!currentTopic) return;
    setIsSyncingCurrent(true);
    setMessage(null);
    try {
      const res = await saveTopicToGoogleDrive(currentTopic, accessToken);
      const updated: Topic = {
        ...currentTopic,
        googleDriveFileId: res.fileId,
        googleDriveSyncedAt: res.modifiedTime,
      };
      onTopicUpdated(updated);
      setMessage({ text: 'Argomento sincronizzato con successo su Google Drive!', type: 'success' });
      await loadDriveFiles();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Errore durante la sincronizzazione su Google Drive';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsSyncingCurrent(false);
    }
  };

  const handleSyncAllBackup = async () => {
    if (!accessToken) {
      onGoogleSignIn();
      return;
    }
    if (allTopics.length === 0) return;
    setIsSyncingAll(true);
    setMessage(null);
    try {
      await saveAllTopicsBackupToDrive(allTopics, accessToken);
      setMessage({
        text: `Archivio completo (${allTopics.length} argomenti) salvato con successo su Google Drive!`,
        type: 'success',
      });
      await loadDriveFiles();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Errore nel backup completo su Google Drive';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleFullBiDirectionalSync = async () => {
    if (!accessToken) {
      onGoogleSignIn();
      return;
    }
    setIsSyncingFull(true);
    setMessage(null);
    try {
      const { mergedTopics, importedCount, updatedCount, deletedCount } = await syncAllTopicsBiDirectional(
        allTopics,
        accessToken
      );
      if (onTopicsBatchUpdated) {
        onTopicsBatchUpdated(mergedTopics);
      }
      const delMsg = deletedCount > 0 ? `, ${deletedCount} eliminati da altri dispositivi` : '';
      setMessage({
        text: `Sincronizzazione completata! ${importedCount} nuovi scaricati, ${updatedCount} aggiornati${delMsg}. Totale argomenti: ${mergedTopics.length}`,
        type: 'success',
      });
      await loadDriveFiles();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Errore durante la sincronizzazione con Drive';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsSyncingFull(false);
    }
  };

  const handleImportFile = async (fileId: string) => {
    if (!accessToken) {
      onGoogleSignIn();
      return;
    }
    setImportingFileId(fileId);
    setMessage(null);
    try {
      const imported = await loadTopicFromDrive(fileId, accessToken);
      if (imported) {
        onImportTopic(imported);
        setMessage({
          text: `Argomento "${imported.title}" importato con successo da Google Drive!`,
          type: 'success',
        });
      } else {
        setMessage({ text: 'Formato file non valido per ADOdoc', type: 'error' });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Errore nell'importazione da Google Drive";
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setImportingFileId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        role="dialog"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#f8fafd]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Integrazione Google Drive</h3>
              <p className="text-xs text-gray-500">Salva, sincronizza e consulta i tuoi documenti su cloud</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* User state banner */}
          {user && accessToken ? (
            <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Utente'}
                    className="w-10 h-10 rounded-full object-cover border border-emerald-300"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-emerald-950">
                      {user.displayName || 'Account Google'}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-xs text-emerald-800">{user.email}</span>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-200/60 text-emerald-900 rounded-full">
                Connesso
              </span>
            </div>
          ) : user && !accessToken ? (
            <div className="flex items-center justify-between p-3.5 bg-amber-50 border border-amber-300 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Utente'}
                    className="w-10 h-10 rounded-full object-cover border border-amber-300"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold shrink-0">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-amber-950 truncate">
                      {user.displayName || 'Account Google'}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full shrink-0">
                      Sessione da rinnovare
                    </span>
                  </div>
                  <span className="text-xs text-amber-800 truncate block">{user.email}</span>
                </div>
              </div>
              <button
                onClick={onGoogleSignIn}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Riconnetti Drive</span>
              </button>
            </div>
          ) : (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-900">Accesso Google Richiesto</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Accedi per salvare i documenti direttamente sul tuo Google Drive personale.
                </p>
              </div>
              <button
                onClick={onGoogleSignIn}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Accedi con Google
              </button>
            </div>
          )}

          {/* Feedback message / Session expired banner */}
          {message && (
            isTokenExpired(message.text) ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-xs">Sessione Google Drive scaduta</p>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      L&apos;autorizzazione di Google Drive è scaduta per inattività o navigazione offline. Tocca il pulsante qui sotto per rinnovare l&apos;accesso in un tocco e completare la sincronizzazione.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onGoogleSignIn}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Riconnetti Google Drive Adesso</span>
                </button>
              </div>
            ) : (
              <div
                className={`p-3 rounded-lg text-xs flex items-center justify-between gap-2 ${
                  message.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {message.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              </div>
            )
          )}

          {/* Prominent Archive Card if archive exists on Drive */}
          {user && (() => {
            const archiveFile = driveFiles.find(
              (f) => f.name === 'ADOdoc_Archivio.json' || f.name === 'DocuArgomenti_Archivio.json'
            );
            if (!archiveFile) return null;
            const driveLink =
              archiveFile.webViewLink || `https://drive.google.com/file/d/${archiveFile.id}/view`;
            return (
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-emerald-950">
                          {archiveFile.name}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-200/70 text-emerald-900 rounded-full">
                          Attivo su Drive
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        {archiveFile.modifiedTime
                          ? `Ultima sincronizzazione: ${new Date(archiveFile.modifiedTime).toLocaleString('it-IT')}`
                          : 'Archivio presente su Google Drive'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={driveLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs shrink-0 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Apri su Google Drive</span>
                  </a>
                </div>
              </div>
            );
          })()}

          {/* Sync actions */}
          {user && (
            <div className="space-y-3">
              {/* Primary Bi-directional sync button (PC <-> Cellulare) */}
              <button
                onClick={handleFullBiDirectionalSync}
                disabled={isSyncingFull}
                className="w-full p-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md text-left transition-all flex items-center justify-between group disabled:opacity-60 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <RefreshCw className={`w-5 h-5 ${isSyncingFull ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                  </div>
                  <div>
                    <span className="block font-bold text-sm">Sincronizza Adesso (PC ↔ Cellulare)</span>
                    <span className="text-xs text-blue-100">
                      {isSyncingFull
                        ? 'Sincronizzazione in corso...'
                        : 'Scarica gli argomenti dal tuo Google Drive e carica le modifiche'}
                    </span>
                  </div>
                </div>
                <div className="hidden sm:block text-xs font-semibold px-3 py-1.5 bg-white/20 rounded-lg shrink-0">
                  {isSyncingFull ? 'In corso...' : 'Sincronizza'}
                </div>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleSyncCurrent}
                  disabled={!currentTopic || isSyncingCurrent}
                  className="p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5 mb-1.5 text-blue-600 font-bold text-sm">
                    <CloudUpload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>Sincronizza Documento Attuale</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {currentTopic ? currentTopic.title : 'Nessun argomento aperto'}
                  </p>
                  {currentTopic?.googleDriveSyncedAt && (
                    <p className="text-[10px] text-emerald-600 mt-2 font-medium">
                      Ultima sync: {new Date(currentTopic.googleDriveSyncedAt).toLocaleDateString('it-IT')}
                    </p>
                  )}
                </button>

                <button
                  onClick={handleSyncAllBackup}
                  disabled={isSyncingAll}
                  className="p-4 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5 mb-1.5 text-emerald-600 font-bold text-sm">
                    <FolderOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>Salva Archivio Completo</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Esporta tutti i {allTopics.length} argomenti in un unico archivio su Drive
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* List of files on Google Drive */}
          {user && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  File Documenti su Google Drive ({driveFiles.length})
                </span>
                <button
                  onClick={loadDriveFiles}
                  disabled={isLoadingFiles}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                  Aggiorna elenco
                </button>
              </div>

              {isLoadingFiles ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                  Caricamento file da Google Drive in corso...
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="p-6 text-center text-xs bg-amber-50/70 rounded-xl border border-dashed border-amber-200 text-amber-800">
                  <FolderOpen className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                  <p className="font-semibold text-amber-950 mb-1">
                    Nessun archivio o documento ancora salvato su Google Drive
                  </p>
                  <p className="text-[11px] text-amber-700 max-w-md mx-auto">
                    Clicca su <strong>&quot;Sincronizza Adesso (PC ↔ Cellulare)&quot;</strong> sopra per creare il file <code>ADOdoc_Archivio.json</code> nel tuo Drive.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  {driveFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-3 hover:bg-gray-50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{file.name}</p>
                          <span className="text-[10px] text-gray-400">
                            {file.modifiedTime
                              ? new Date(file.modifiedTime).toLocaleDateString('it-IT')
                              : 'File salvato'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-gray-700 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 rounded text-[11px] font-medium transition-colors"
                            title="Apri in Google Drive"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Apri</span>
                          </a>
                        )}
                        <button
                          onClick={() => handleImportFile(file.id)}
                          disabled={importingFileId === file.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-emerald-600 hover:text-white rounded text-[11px] font-medium transition-colors"
                        >
                          <DownloadCloud className="w-3 h-3" />
                          {importingFileId === file.id ? 'Importazione...' : 'Importa'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Practical tips on where to look in Google Drive */}
              <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-emerald-950">
                  📁 Cartella dedicata &quot;ADOdoc&quot; su Google Drive:
                </p>
                <ul className="list-disc list-inside space-y-1 text-emerald-800 pl-1">
                  <li>
                    Tutti i file sono ora raggruppati ordinatamente nella cartella <strong>ADOdoc</strong> all&apos;interno del tuo Google Drive (<code>{user.email}</code>).
                  </li>
                  <li>
                    All&apos;interno troverai l&apos;archivio completo <code>ADOdoc_Archivio.json</code> e i singoli argomenti salvati.
                  </li>
                  <li>
                    Quando modifichi o crei un argomento da PC o cellulare (iPhone 12 o Samsung A34), le modifiche vengono sincronizzate automaticamente attraverso questa cartella.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-xs"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
