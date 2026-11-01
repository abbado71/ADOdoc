import React, { useState } from 'react';
import {
  FileText,
  Cloud,
  CloudUpload,
  RefreshCw,
  Edit3,
  Eye,
  Plus,
  HardDrive,
  LogOut,
  FolderOpen,
  Menu,
  MoreVertical,
  X,
  Printer,
  Smartphone,
  Download,
  FileArchive,
} from 'lucide-react';
import { Topic, ViewMode } from '../types';
import { User } from 'firebase/auth';
import { PWAInstallButton } from './PWAInstallButton';

interface GoogleDocsHeaderProps {
  topic: Topic | null;
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  onTitleChange: (newTitle: string) => void;
  saveStatus: 'saved' | 'saving' | 'synced-drive' | 'error';
  user: User | null;
  accessToken?: string | null;
  onGoogleSignIn: () => void;
  onGoogleLogout: () => void;
  onOpenNewModal: () => void;
  onOpenDriveModal: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onPrint: () => void;
  onExportAllPdf?: () => void;
}

export const GoogleDocsHeader: React.FC<GoogleDocsHeaderProps> = ({
  topic,
  viewMode,
  onToggleViewMode,
  onTitleChange,
  saveStatus,
  user,
  accessToken,
  onGoogleSignIn,
  onGoogleLogout,
  onOpenNewModal,
  onOpenDriveModal,
  onToggleSidebar,
  isSidebarOpen,
  onPrint,
  onExportAllPdf,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(topic?.title || '');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync title draft when topic changes
  React.useEffect(() => {
    if (topic) {
      setTitleDraft(topic.title);
    }
  }, [topic?.title]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleDraft.trim() && topic && titleDraft.trim() !== topic.title) {
      onTitleChange(titleDraft.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setTitleDraft(topic?.title || '');
      setIsEditingTitle(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 select-none sticky top-0 z-40">
      {/* ================= PRIMO RIGO IN TESTA A TUTTO: BRAND BAR "ADOdoc" ================= */}
      <div className="bg-[#1e293b] text-white px-3 sm:px-4 py-1.5 flex items-center justify-between border-b border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <img
            src="/apple-touch-icon.png"
            alt="ADOdoc Logo"
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-md object-cover border border-white/20 shadow-xs shrink-0"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-bold text-white tracking-tight leading-none">
              ADOdoc
            </span>
            <span className="hidden sm:inline-block text-[10px] font-medium text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700">
              Editor &amp; Archivio
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Drive status / Connect button (visible on all screens including mobile/iOS) */}
          {user && accessToken ? (
            <button
              onClick={onOpenDriveModal}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-md text-[11px] font-semibold transition-colors shadow-2xs"
              title="Drive connesso e sincronizzato. Tocca per gestire i file"
            >
              <CloudUpload className="w-3.5 h-3.5 text-white" />
              <span>Drive Synced</span>
            </button>
          ) : user && !accessToken ? (
            <button
              onClick={onGoogleSignIn}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-[11px] font-bold shadow-xs animate-pulse transition-transform active:scale-95"
              title="Sessione Google Drive scaduta. Tocca per riconnettere con un tocco"
            >
              <RefreshCw className="w-3.5 h-3.5 text-white" />
              <span>Riconnetti Drive</span>
            </button>
          ) : (
            <button
              onClick={onGoogleSignIn}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold shadow-xs transition-transform active:scale-95"
              title="Tocca per accedere a Google Drive e sincronizzare i tuoi argomenti"
            >
              <HardDrive className="w-3.5 h-3.5 text-white" />
              <span>Connetti Drive</span>
            </button>
          )}

          {user && (
            <span className="text-[11px] text-slate-300 hidden sm:inline truncate max-w-[180px]">
              {user.email}
            </span>
          )}
          <div className="hidden md:block">
            <PWAInstallButton />
          </div>
        </div>
      </div>

      {/* ================= DESKTOP HEADER (MD E SUPERIORI) ================= */}
      <div className="hidden md:flex items-center justify-between px-4 py-2">
        {/* Left Side: Toggle Sidebar, Title (No icon in this row) & Menus */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title={isSidebarOpen ? 'Nascondi elenco argomenti' : 'Mostra elenco argomenti'}
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {/* Document title: editable ONLY in edit mode */}
              {viewMode === 'edit' ? (
                isEditingTitle ? (
                  <input
                    type="text"
                    autoFocus
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={handleTitleSubmit}
                    onKeyDown={handleKeyDown}
                    className="text-base md:text-lg font-medium text-gray-900 border border-blue-500 rounded px-1.5 py-0.5 bg-white focus:outline-none w-full max-w-md"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(true)}
                    className="text-base md:text-lg font-medium text-gray-900 hover:bg-gray-100 rounded px-1.5 py-0.5 truncate text-left max-w-md transition-colors"
                    title="Fai clic per rinominare l'argomento"
                  >
                    {topic?.title || 'Seleziona o crea un argomento'}
                  </button>
                )
              ) : (
                <span
                  className="text-base md:text-lg font-semibold text-gray-900 px-1.5 py-0.5 truncate text-left max-w-md select-text"
                  title={topic?.title || 'Seleziona argomento'}
                >
                  {topic?.title || 'Seleziona argomento'}
                </span>
              )}

              {/* Real-time Save status indicator */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-1 shrink-0">
                {saveStatus === 'saving' && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvataggio...</span>
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="flex items-center gap-1 text-gray-500" title="Salvato in memoria locale">
                    <Cloud className="w-3.5 h-3.5 text-gray-400" />
                    <span>Modifiche salvate</span>
                  </span>
                )}
                {saveStatus === 'synced-drive' && (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium" title="Sincronizzato con il tuo Google Drive">
                    <CloudUpload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Sincronizzato su Drive</span>
                  </span>
                )}
              </div>
            </div>

            {/* Google Docs-style Menu Bar */}
            <div className="flex items-center gap-1 text-xs text-gray-600 font-normal mt-0.5 relative">
              <div className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
                  className={`px-2 py-0.5 rounded hover:bg-gray-100 transition-colors ${activeMenu === 'file' ? 'bg-gray-200' : ''}`}
                >
                  File
                </button>
                {activeMenu === 'file' && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                    <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 animate-fade-in">
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          onOpenNewModal();
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-gray-700 flex items-center justify-between text-xs"
                      >
                        <span className="flex items-center gap-2">
                          <Plus className="w-3.5 h-3.5" /> Nuovo argomento
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          onOpenDriveModal();
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-gray-700 flex items-center justify-between text-xs"
                      >
                        <span className="flex items-center gap-2">
                          <HardDrive className="w-3.5 h-3.5" /> Google Drive & Backup
                        </span>
                      </button>
                      <div className="my-1 border-t border-gray-100" />
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          onPrint();
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-gray-700 flex items-center justify-between text-xs cursor-pointer"
                      >
                        <span>Stampa / Salva in PDF</span>
                        <span className="text-gray-400">Ctrl+P</span>
                      </button>

                      {/* Esporta tutto in PDF: visibile nel menu File in modalita web */}
                      {onExportAllPdf && (
                        <button
                          onClick={() => {
                            setActiveMenu(null);
                            onExportAllPdf();
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-gray-700 flex items-center justify-between text-xs cursor-pointer group transition-colors"
                          title="Esporta tutti gli argomenti in un unico file PDF"
                        >
                          <span className="flex items-center gap-2 text-gray-700 group-hover:text-blue-700 font-medium">
                            <FileArchive className="w-3.5 h-3.5 text-blue-600" />
                            <span>Esporta tutto in PDF</span>
                          </span>
                          <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                            Tutti
                          </span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={onToggleViewMode}
                className="px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
              >
                {viewMode === 'edit' ? 'Passa a Lettura' : 'Modifica'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side Desktop Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Edit / View Mode Switcher */}
          <button
            onClick={onToggleViewMode}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs transition-all ${
              viewMode === 'edit'
                ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            title={viewMode === 'edit' ? 'Termina modifica e torna alla visualizzazione' : 'Modifica questo argomento'}
          >
            {viewMode === 'edit' ? (
              <>
                <Eye className="w-4 h-4" />
                <span>Visualizza</span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                <span>Modifica Argomento</span>
              </>
            )}
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* New Topic Button */}
          <button
            onClick={onOpenNewModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold transition-colors"
            title="Crea un nuovo argomento"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Nuovo</span>
          </button>

          {/* Google Drive Status & Account Sign-in */}
          {user ? (
            <div className="flex items-center gap-2 border-l border-gray-200 pl-2">
              <button
                onClick={onOpenDriveModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-emerald-700 flex items-center gap-1.5 text-xs font-medium"
                title="Gestisci file e sincronizzazione Google Drive"
              >
                <HardDrive className="w-4 h-4 text-emerald-600" />
                <span className="hidden lg:inline text-gray-700">Drive</span>
              </button>

              <div className="relative group">
                <button className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-blue-400 transition-all">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Utente'}
                      className="w-7 h-7 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                      {user.displayName?.[0] || user.email?.[0] || 'G'}
                    </div>
                  )}
                </button>
                <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl p-3 hidden group-hover:block z-50">
                  <p className="text-xs font-bold text-gray-900 truncate">{user.displayName || 'Utente Google'}</p>
                  <p className="text-[11px] text-gray-500 truncate mb-2">{user.email}</p>
                  <button
                    onClick={onOpenDriveModal}
                    className="w-full text-left py-1.5 px-2 text-xs text-gray-700 hover:bg-blue-50 rounded flex items-center gap-2"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                    Visualizza file su Drive
                  </button>
                  <button
                    onClick={onGoogleLogout}
                    className="w-full text-left py-1.5 px-2 text-xs text-red-600 hover:bg-red-50 rounded flex items-center gap-2 mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Disconnetti Google
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={onGoogleSignIn}
              className="gsi-material-button scale-90 origin-right"
              title="Accedi con Google per sincronizzare gli argomenti sul tuo Google Drive"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">Google Drive</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* ================= MOBILE HEADER (< MD) - ZERO SOVRAPPOSIZIONI ================= */}
      <div className="flex md:hidden items-center justify-between px-3 py-2.5 h-14 bg-white">
        {/* Left: Sidebar Toggle + Title (No icon in this row) */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 text-gray-700 hover:bg-gray-100 rounded-lg shrink-0"
            aria-label="Apri indice argomenti"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Truncated Mobile Title: editable ONLY in edit mode */}
          <div className="min-w-0 flex-1">
            {viewMode === 'edit' ? (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="text-xs sm:text-sm font-semibold text-gray-900 truncate text-left block w-full hover:underline"
                title="Tocca per rinominare"
              >
                {topic?.title || 'Seleziona argomento'}
              </button>
            ) : (
              <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate text-left block w-full select-text">
                {topic?.title || 'Seleziona argomento'}
              </span>
            )}
          </div>
        </div>

        {/* Right: Save Status Icon + Toggle Edit/View + More Actions (...) */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          {/* Status Indicator on Mobile */}
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
              <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
              <span>Sync...</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-gray-500 bg-gray-100 border border-gray-200 shrink-0"
              title="Salvato in locale sul dispositivo"
            >
              <Cloud className="w-3.5 h-3.5 text-gray-400" />
              <span>Locale</span>
            </div>
          )}
          {saveStatus === 'synced-drive' && (
            <button
              onClick={onOpenDriveModal}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs shrink-0 active:scale-95 transition-transform"
              title="Documento sincronizzato con Google Drive. Tocca per aprire opzioni Drive"
            >
              <CloudUpload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Drive Synced</span>
            </button>
          )}

          {/* Quick Edit/View Toggle Button */}
          <button
            onClick={onToggleViewMode}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold shadow-2xs transition-all ${
              viewMode === 'edit'
                ? 'bg-amber-500 text-white ring-1 ring-amber-300'
                : 'bg-blue-600 text-white'
            }`}
          >
            {viewMode === 'edit' ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Vedi</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifica</span>
              </>
            )}
          </button>

          {/* Mobile Overflow Menu Button (...) */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Altre opzioni"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Title Editing Dialog if clicked on mobile */}
      {isEditingTitle && (
        <div className="md:hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-full max-w-sm space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Rinomina Argomento
            </h4>
            <input
              type="text"
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 text-sm border border-blue-500 rounded-lg focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setTitleDraft(topic?.title || '');
                  setIsEditingTitle(false);
                }}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
              >
                Annulla
              </button>
              <button
                onClick={handleTitleSubmit}
                className="px-4 py-1.5 text-xs bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom-Sheet / Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl shadow-2xl px-4 pt-3 pb-12 z-10 max-h-[88vh] overflow-y-auto overscroll-contain space-y-3">
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-1" />

            {/* Sheet Header with ADOdoc Branding & Close */}
            <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 shadow-2xs shrink-0">
                  <img
                    src="/apple-touch-icon.png"
                    alt="ADOdoc"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 tracking-tight leading-none">
                    ADOdoc
                  </h3>
                  <p className="text-[10px] text-gray-500 font-medium">
                    Menu & Opzioni Documento
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                aria-label="Chiudi menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Actions Section */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 pt-1">
                Azioni Documento
              </p>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenNewModal();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-gray-800 hover:bg-blue-50 active:bg-blue-100 rounded-xl transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <span className="block font-semibold">Crea Nuovo Argomento</span>
                  <span className="text-[10px] font-normal text-gray-500">Inizia con un foglio completamente vuoto</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onToggleSidebar();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-gray-800 hover:bg-blue-50 active:bg-blue-100 rounded-xl transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Menu className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-semibold">Indice & Ricerca Argomenti</span>
                  <span className="text-[10px] font-normal text-gray-500">Cerca per titolo o categoria</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onToggleViewMode();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-gray-800 hover:bg-blue-50 active:bg-blue-100 rounded-xl transition-colors text-left"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  viewMode === 'edit' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {viewMode === 'edit' ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </div>
                <div>
                  <span className="block font-semibold">
                    {viewMode === 'edit' ? 'Passa alla Modalità Lettura' : 'Passa alla Modalità Modifica'}
                  </span>
                  <span className="text-[10px] font-normal text-gray-500">
                    {viewMode === 'edit' ? 'Termina modifiche' : 'Aggiungi o varia testo e immagini'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onPrint();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-gray-800 hover:bg-blue-50 active:bg-blue-100 rounded-xl transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-semibold">Stampa o Salva come PDF</span>
                  <span className="text-[10px] font-normal text-gray-500">Esporta documento formattato</span>
                </div>
              </button>
            </div>

            {/* Google Drive Status Section */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 pb-1.5">
                Google Drive & Cloud
              </p>
              {user ? (
                <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                  !accessToken ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="User"
                        className="w-9 h-9 rounded-full border border-emerald-300 object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                        {user.displayName?.[0] || 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {user.displayName || 'Google Connesso'}
                        </p>
                        {!accessToken && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded-full">
                            Rinnovare
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-600 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!accessToken ? (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onGoogleSignIn();
                        }}
                        className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 shrink-0"
                        title="Riconnetti Drive"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Riconnetti</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onOpenDriveModal();
                        }}
                        className="p-2 text-emerald-700 hover:bg-emerald-100 rounded-lg"
                        title="Gestione Drive"
                      >
                        <HardDrive className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onGoogleLogout();
                      }}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                      title="Disconnetti"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onGoogleSignIn();
                  }}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2.5 shadow-md active:scale-[0.98] transition-all"
                >
                  <HardDrive className="w-4 h-4" />
                  <span>Connetti con Google Drive</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
