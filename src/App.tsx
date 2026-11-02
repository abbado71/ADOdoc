/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Topic, TopicVersion, ViewMode, EditorFormatting } from './types';
import {
  loadStoredTopics,
  loadStoredTopicsAsync,
  saveStoredTopics,
  flushStoredTopicsSync,
  createTopicVersionSnapshot,
  markTopicAsDeleted,
  isDemoTopic,
} from './services/storage';
import { optimizeImageFile } from './utils/imageOptimizer';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setCachedAccessToken,
  clearCachedAccessToken,
  isTokenExpired,
} from './services/firebaseAuth';
import {
  saveTopicToGoogleDrive,
  deleteFileFromDrive,
  syncAllTopicsBiDirectional,
  saveAllTopicsBackupToDrive,
  listAppFilesFromDrive,
} from './services/googleDriveService';

import { GoogleDocsHeader } from './components/GoogleDocsHeader';
import { GoogleDocsToolbar } from './components/GoogleDocsToolbar';
import { GoogleDocsRuler } from './components/GoogleDocsRuler';
import { TopicSidebar } from './components/TopicSidebar';
import { DocumentPaper } from './components/DocumentPaper';
import { NewTopicModal } from './components/NewTopicModal';
import { DriveSyncModal } from './components/DriveSyncModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { PrintExportModal } from './components/PrintExportModal';
import { ExportAllPdfModal } from './components/ExportAllPdfModal';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  // Topics state
  const [topics, setTopics] = useState<Topic[]>(() => loadStoredTopics());
  const [selectedTopicId, setSelectedTopicId] = useState<string>(() => {
    const list = loadStoredTopics();
    const lastActive =
      typeof window !== 'undefined'
        ? localStorage.getItem('docu_last_active_topic_id')
        : null;
    if (lastActive && list.some((t) => t.id === lastActive)) {
      return lastActive;
    }
    return list[0]?.id || '';
  });

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('view');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'synced-drive' | 'error'>('saved');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default to false on mobile for spaciousness
  const [zoomLevel, setZoomLevel] = useState(100);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-open sidebar on wide desktop screens on first mount
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, []);

  // Formatting state
  const [formatting, setFormatting] = useState<EditorFormatting>({
    fontFamily: 'Roboto, sans-serif',
    fontSize: 15,
    isBold: false,
    isItalic: false,
    isUnderline: false,
    alignment: 'left',
    textColor: '#202124',
  });

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isExportAllModalOpen, setIsExportAllModalOpen] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auth & Drive state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Debounce timer for auto-save and history tracking
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnapshotRef = useRef<number>(Date.now());

  // Show transient toast notification
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, token) => {
        setUser(authedUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Derived current topic
  const currentTopic = topics.find((t) => t.id === selectedTopicId) || topics[0] || null;

  // Extract all dynamic categories used across existing topics
  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    topics.forEach((t) => {
      if (t.category && t.category.trim()) {
        set.add(t.category.trim());
      }
    });
    return Array.from(set);
  }, [topics]);

  // Persist selected topic ID whenever user switches topics
  useEffect(() => {
    if (selectedTopicId) {
      try {
        localStorage.setItem('docu_last_active_topic_id', selectedTopicId);
      } catch {
        // Ignore
      }
    }
  }, [selectedTopicId]);

  // Keep a mutable ref of topics for zero-delay lifecycle flush and sync
  const topicsRef = useRef<Topic[]>(topics);
  useEffect(() => {
    topicsRef.current = topics;
  }, [topics]);

  // Scrub any legacy demo topics completely on startup
  useEffect(() => {
    setTopics((prev) => {
      const cleaned = prev.filter((t) => !isDemoTopic(t));
      if (cleaned.length !== prev.length) {
        flushStoredTopicsSync(cleaned);
      }
      return cleaned;
    });
  }, []);

  // Asynchronously hydrate from IndexedDB on startup (authoritative store with full rich media)
  useEffect(() => {
    let isMounted = true;
    loadStoredTopicsAsync()
      .then((idbTopics) => {
        if (isMounted && idbTopics) {
          const cleaned = idbTopics.filter((t) => !isDemoTopic(t));
          if (cleaned.length > 0) {
            setTopics(cleaned);
            const lastActive = localStorage.getItem('docu_last_active_topic_id');
            if (lastActive && cleaned.some((t) => t.id === lastActive)) {
              setSelectedTopicId(lastActive);
            }
          }
        }
      })
      .catch((err) => {
        console.warn('Errore idb hydrate:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Debounced persistence of topics to local storage and IndexedDB to avoid UI freeze while typing
  const localSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (topics.length > 0) {
      if (localSaveTimerRef.current) {
        clearTimeout(localSaveTimerRef.current);
      }
      localSaveTimerRef.current = setTimeout(() => {
        saveStoredTopics(topics);
      }, 1500);
    }
    return () => {
      if (localSaveTimerRef.current) {
        clearTimeout(localSaveTimerRef.current);
      }
    };
  }, [topics]);

  // Centralized bi-directional cloud sync across all 5 user devices
  const syncInProgressRef = useRef(false);
  const lastSyncTimeRef = useRef<number>(0);

  const performCloudSync = useCallback(
    async (isSilent = true) => {
      if (!accessToken || syncInProgressRef.current) return;
      const now = Date.now();
      // Throttle silent background sync to at most once every 6 seconds
      if (isSilent && now - lastSyncTimeRef.current < 6000) return;

      syncInProgressRef.current = true;
      if (!isSilent) setSaveStatus('saving');

      try {
        const { mergedTopics, importedCount, updatedCount, deletedCount } = await syncAllTopicsBiDirectional(
          topicsRef.current,
          accessToken
        );
        lastSyncTimeRef.current = Date.now();
        setTopics(mergedTopics);
        flushStoredTopicsSync(mergedTopics);
        setSaveStatus('synced-drive');

        // If the currently open topic was deleted on another device, select the first remaining topic
        setSelectedTopicId((currentId) => {
          if (currentId && !mergedTopics.some((t) => t.id === currentId)) {
            return mergedTopics[0]?.id || '';
          }
          return currentId;
        });

        if (!isSilent || importedCount > 0 || updatedCount > 0 || deletedCount > 0) {
          const parts: string[] = [];
          if (importedCount > 0 || updatedCount > 0) {
            parts.push(`${importedCount + updatedCount} scaricati`);
          }
          if (deletedCount > 0) {
            parts.push(`${deletedCount} eliminati`);
          }
          const detail = parts.length > 0 ? `: ${parts.join(', ')}` : '';
          showToast(`Sincronizzato con Drive (cartella ADOdoc)${detail}`);
        }
      } catch (err) {
        console.warn('Errore durante la sincronizzazione con Drive:', err);
        if (isTokenExpired(err)) {
          setAccessToken(null);
          clearCachedAccessToken();
          setSaveStatus('saved');
          if (!isSilent) {
            showToast('Sessione Google Drive scaduta. Tocca "Riconnetti Drive" in alto.');
          }
        } else if (!isSilent) {
          const msg = err instanceof Error ? err.message : 'Errore';
          showToast(`Sincronizzazione non riuscita: ${msg}`);
        }
      } finally {
        syncInProgressRef.current = false;
      }
    },
    [accessToken, showToast]
  );

  // Auto-sync whenever accessToken becomes available
  useEffect(() => {
    if (accessToken) {
      performCloudSync(true);
    }
  }, [accessToken, performCloudSync]);

  // Multi-device automatic sync: pull changes whenever tab/app is opened, focused, or un-minimized
  useEffect(() => {
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible' && accessToken && navigator.onLine) {
        performCloudSync(true);
      }
    };

    document.addEventListener('visibilitychange', handleFocusOrVisible);
    window.addEventListener('focus', handleFocusOrVisible);

    // Periodic auto-sync check every 45 seconds while app is active
    const periodicInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && accessToken && navigator.onLine) {
        performCloudSync(true);
      }
    }, 45000);

    return () => {
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('focus', handleFocusOrVisible);
      clearInterval(periodicInterval);
    };
  }, [accessToken, performCloudSync]);

  // Immediately sync offline-created or modified topics whenever network comes back online
  useEffect(() => {
    const handleOnline = () => {
      showToast('Connessione ripristinata! Sincronizzazione automatica con Drive...');
      if (accessToken) {
        performCloudSync(false);
      }
    };

    const handleOffline = () => {
      showToast('Sei offline. Le modifiche vengono salvate sul dispositivo.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [accessToken, performCloudSync, showToast]);

  // Listen to iOS WebKit lifecycle events: flush changes immediately when user swipes away or switches apps
  useEffect(() => {
    const handleImmediateFlush = () => {
      if (topicsRef.current && topicsRef.current.length > 0) {
        flushStoredTopicsSync(topicsRef.current);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleImmediateFlush();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleImmediateFlush);
    window.addEventListener('beforeunload', handleImmediateFlush);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleImmediateFlush);
      window.removeEventListener('beforeunload', handleImmediateFlush);
    };
  }, []);

  // Handle Google Sign-In with automatic bi-directional sync
  const handleGoogleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setCachedAccessToken(result.accessToken);
        showToast(`Accesso effettuato come ${result.user.displayName || result.user.email}`);

        // Immediately sync topics with Google Drive ADOdoc folder
        try {
          const { mergedTopics, importedCount, updatedCount } = await syncAllTopicsBiDirectional(
            topicsRef.current,
            result.accessToken
          );
          setTopics(mergedTopics);
          flushStoredTopicsSync(mergedTopics);
          showToast(
            importedCount > 0 || updatedCount > 0
              ? `Sincronizzazione completata: ${importedCount + updatedCount} argomenti aggiornati da Drive!`
              : 'Connesso alla cartella ADOdoc su Google Drive!'
          );
        } catch (syncErr) {
          console.warn('Sync iniziale da Drive non riuscito:', syncErr);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore accesso Google';
      showToast(`Accesso non riuscito: ${msg}`);
    }
  };

  // Handle Google Logout
  const handleGoogleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    showToast('Disconnessione da Google completata');
  };

  // Real-time update handler for current topic (in-memory for maximum typing performance, zero network lag)
  const handleUpdateTopic = useCallback(
    (updatedFields: Partial<Topic>, isSignificantEdit = false) => {
      if (!currentTopic) return;

      const now = new Date().toISOString();
      setTopics((prevTopics) => {
        return prevTopics.map((item) => {
          if (item.id !== currentTopic.id) return item;
          return {
            ...item,
            ...updatedFields,
            updatedAt: now,
            versions: [], // No bloated versions array stored
          };
        });
      });

      // Clear existing debounce timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Lightweight status change without blocking main thread or calling Google Drive during typing
      setSaveStatus('saving');
      autoSaveTimerRef.current = setTimeout(() => {
        setSaveStatus('saved');
      }, 500);
    },
    [currentTopic]
  );

  // Inserts an image file picked from the device into the active document with client-side downscaling and instant persistence
  const handleInsertImageFile = useCallback(
    async (file: File) => {
      if (!currentTopic) return;
      if (!file.type.startsWith('image/')) return;

      try {
        showToast('Ottimizzazione immagine in corso...');
        const dataUrl = await optimizeImageFile(file);
        if (!dataUrl) return;

        // Switch to edit mode if not already
        if (viewMode !== 'edit') {
          setViewMode('edit');
        }

        const imgHtml = `<p style="text-align: center;"><img src="${dataUrl}" alt="Immagine inserita" style="width: 75%; max-width: 100%; height: auto; border-radius: 8px; margin: 12px auto; display: block; box-shadow: 0 1px 3px rgba(0,0,0,0.12); cursor: pointer;" /></p><p><br></p>`;

        const activeEl = document.querySelector('.document-content') as HTMLElement;
        let newContent = '';
        if (activeEl) {
          activeEl.focus();
          const inserted = document.execCommand('insertHTML', false, imgHtml);
          if (!inserted) {
            activeEl.innerHTML += imgHtml;
          }
          newContent = activeEl.innerHTML;
        } else {
          // If editor ref not focused, append to content
          newContent = currentTopic.content + imgHtml;
        }

        handleUpdateTopic({ content: newContent }, true);

        // Immediately commit to IndexedDB and localStorage so that even instant app swipe-close retains it
        const updatedTopic = {
          ...currentTopic,
          content: newContent,
          updatedAt: new Date().toISOString(),
        };
        const nextTopics = topics.map((t) => (t.id === currentTopic.id ? updatedTopic : t));
        flushStoredTopicsSync(nextTopics);

        showToast('Immagine ottimizzata e salvata sul dispositivo!');
      } catch (err) {
        console.error('Errore inserimento immagine:', err);
        showToast("Errore durante il caricamento dell'immagine.");
      }
    },
    [currentTopic, viewMode, handleUpdateTopic, showToast, topics]
  );

  // Manual Save and Mode-Switch Save handler (commits to disk and syncs to Drive)
  const handleManualSave = useCallback(async () => {
    if (!currentTopic) return;

    setSaveStatus('saving');
    const now = new Date().toISOString();

    // Check if DOM content has newer edits
    const activeEl = document.querySelector('.document-content') as HTMLElement;
    const latestContent = activeEl ? activeEl.innerHTML : currentTopic.content;

    let driveFileId = currentTopic.googleDriveFileId;
    let driveSyncedAt = currentTopic.googleDriveSyncedAt;

    const updatedTopic: Topic = {
      ...currentTopic,
      content: latestContent,
      updatedAt: now,
      versions: [], // No version snapshots kept
    };

    const nextTopics = topics.map((t) => (t.id === currentTopic.id ? updatedTopic : t));
    flushStoredTopicsSync(nextTopics);
    setTopics(nextTopics);

    if (accessToken) {
      try {
        const driveRes = await saveTopicToGoogleDrive(updatedTopic, accessToken);
        driveFileId = driveRes.fileId;
        driveSyncedAt = driveRes.modifiedTime;

        // Also update central cloud archive in ADOdoc folder
        const finalTopic = {
          ...updatedTopic,
          googleDriveFileId: driveFileId,
          googleDriveSyncedAt: driveSyncedAt,
        };
        const finalList = nextTopics.map((t) => (t.id === currentTopic.id ? finalTopic : t));
        setTopics(finalList);
        flushStoredTopicsSync(finalList);
        await saveAllTopicsBackupToDrive(finalList, accessToken);

        setSaveStatus('synced-drive');
        showToast('Documento salvato e sincronizzato su Google Drive!');
      } catch (err: unknown) {
        if (isTokenExpired(err)) {
          setAccessToken(null);
          clearCachedAccessToken();
          showToast('Sessione Google Drive scaduta. Tocca "Riconnetti Drive" per sincronizzare.');
        } else {
          const msg = err instanceof Error ? err.message : 'Errore Drive';
          showToast(`Salvato in locale (Drive: ${msg})`);
        }
        setSaveStatus('saved');
      }
    } else {
      setSaveStatus('saved');
      showToast('Documento salvato sul dispositivo!');
    }
  }, [currentTopic, accessToken, showToast, topics]);

  // Toggle between Edit and View mode: exiting Edit mode immediately commits and syncs to Drive
  const handleToggleViewMode = useCallback(async () => {
    if (viewMode === 'edit') {
      setViewMode('view');
      // On switching to view mode: commit to local storage and sync to Google Drive
      await handleManualSave();
    } else {
      setViewMode('edit');
    }
  }, [viewMode, handleManualSave]);

  // Keyboard shortcut: Ctrl+S / Cmd+S for instant Save & Drive Sync
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave]);

  // Create a new topic
  const handleCreateTopic = async (newTopicData: Pick<Topic, 'title' | 'category' | 'content'>) => {
    const id = `topic-${Date.now()}`;
    const now = new Date().toISOString();

    const newTopic: Topic = {
      ...newTopicData,
      id,
      content: newTopicData.content || '<p><br></p>',
      createdAt: now,
      updatedAt: now,
      versions: [], // No version history bloat
    };

    const nextTopics = [newTopic, ...topics];
    setTopics(nextTopics);
    setSelectedTopicId(id);
    setViewMode('edit'); // Open directly in edit mode on a clean empty canvas
    flushStoredTopicsSync(nextTopics);
    showToast(`Documento "${newTopic.title}" creato!`);

    // Sync to Google Drive in ADOdoc folder if authenticated
    if (accessToken && navigator.onLine) {
      setSaveStatus('saving');
      try {
        const driveRes = await saveTopicToGoogleDrive(newTopic, accessToken);
        const syncedTopic: Topic = {
          ...newTopic,
          googleDriveFileId: driveRes.fileId,
          googleDriveSyncedAt: driveRes.modifiedTime,
        };
        const syncedList = [syncedTopic, ...topics];
        setTopics(syncedList);
        flushStoredTopicsSync(syncedList);
        // Bi-directionally sync with Drive so that all existing cloud topics are merged and preserved
        await performCloudSync(true);
        setSaveStatus('synced-drive');
      } catch (err) {
        if (isTokenExpired(err)) {
          setAccessToken(null);
          clearCachedAccessToken();
          showToast('Argomento creato in locale. Sessione Google Drive scaduta: tocca "Riconnetti Drive".');
        } else {
          console.warn('Sync cloud nuovo argomento:', err);
        }
        setSaveStatus('saved');
      }
    } else {
      setSaveStatus('saved');
    }
  };

  // Handle destructive delete confirmation
  const handleConfirmDelete = async () => {
    if (!topicToDelete) return;

    setIsDeleting(true);
    try {
      // 1. Mark permanently deleted in tombstone registry so neither reload nor Drive sync will ever bring it back
      markTopicAsDeleted(topicToDelete.id);

      const remaining = topics.filter((t) => t.id !== topicToDelete.id);
      setTopics(remaining);

      // 2. Persist immediately to IndexedDB and localStorage (handles empty array correctly)
      flushStoredTopicsSync(remaining);

      if (selectedTopicId === topicToDelete.id) {
        setSelectedTopicId(remaining[0]?.id || '');
      }

      // 3. Remove from Google Drive if user is authenticated with Drive
      if (accessToken) {
        try {
          // A. Delete specific file ID if known
          if (topicToDelete.googleDriveFileId) {
            await deleteFileFromDrive(topicToDelete.googleDriveFileId, accessToken);
          } else {
            // Check if there is an individual file with this topic title on Drive
            try {
              const driveFiles = await listAppFilesFromDrive(accessToken);
              const targetName = `Argomento - ${topicToDelete.title.trim() || 'Senza Titolo'}.json`;
              const matched = driveFiles.find((f) => f.name === targetName);
              if (matched) {
                await deleteFileFromDrive(matched.id, accessToken);
              }
            } catch {
              // Ignore Drive listing errors
            }
          }

          // B. Crucial: Update the cloud archive backup (ADOdoc_Archivio.json) so the deleted topic is removed from Drive
          await saveAllTopicsBackupToDrive(remaining, accessToken, new Set([topicToDelete.id]));
        } catch (driveErr) {
          if (isTokenExpired(driveErr)) {
            setAccessToken(null);
            clearCachedAccessToken();
          }
          console.warn('Errore eliminazione da Drive:', driveErr);
        }
      }

      showToast(`Argomento "${topicToDelete.title}" eliminato.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore';
      showToast(`Errore durante l'eliminazione: ${msg}`);
    } finally {
      setIsDeleting(false);
      setTopicToDelete(null);
    }
  };

  // Apply rich-text formatting commands to the editable canvas
  const handleApplyCommand = (command: string, value?: string) => {
    try {
      document.execCommand(command, false, value);
      const activeEl = document.querySelector('.document-content') as HTMLElement;
      if (activeEl) {
        handleUpdateTopic({ content: activeEl.innerHTML }, false);
      }
    } catch (e) {
      console.warn('Command failed:', e);
    }
  };

  const handleOpenPrintModal = () => {
    setIsPrintModalOpen(true);
  };

  const handleNativePrint = () => {
    if (currentTopic?.title) {
      const originalTitle = document.title;
      document.title = `${currentTopic.title} - ADOdoc`;
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    } else {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fbfd] flex flex-col font-['Roboto'] text-[#202124] print:bg-white print:min-h-0 print:block">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#323232] text-white px-4 py-2.5 rounded-lg shadow-xl text-xs flex items-center gap-2 animate-bounce print:hidden">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Google Docs Style Header (with clean non-overlapping mobile mode) */}
      <div className="print:hidden">
        <GoogleDocsHeader
          topic={currentTopic}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
          onTitleChange={(newTitle) => handleUpdateTopic({ title: newTitle }, true)}
          saveStatus={saveStatus}
          user={user}
          accessToken={accessToken}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleLogout={handleGoogleLogout}
          onOpenNewModal={() => setIsNewModalOpen(true)}
          onOpenDriveModal={() => setIsDriveModalOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isSidebarOpen={isSidebarOpen}
          onPrint={handleOpenPrintModal}
          onExportAllPdf={() => setIsExportAllModalOpen(true)}
        />

        {/* Google Docs Toolbar with Image Insertion */}
        <GoogleDocsToolbar
          viewMode={viewMode}
          formatting={formatting}
          onChangeFormatting={(changes) => setFormatting((prev) => ({ ...prev, ...changes }))}
          onApplyCommand={handleApplyCommand}
          onPrint={handleOpenPrintModal}
          onManualSave={handleManualSave}
          onInsertImageFile={handleInsertImageFile}
          zoomLevel={zoomLevel}
          onChangeZoom={setZoomLevel}
          isSaving={saveStatus === 'saving'}
        />

        {/* Horizontal Ruler for Google Docs styling */}
        <GoogleDocsRuler />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative print:block print:overflow-visible">
        {/* Topic Directory / Search Sidebar */}
        <TopicSidebar
          topics={topics}
          selectedTopicId={selectedTopicId}
          onSelectTopic={async (t) => {
            if (t.id === selectedTopicId) return;
            if (viewMode === 'edit') {
              // Commit changes before changing topic
              await handleManualSave();
            }
            setSelectedTopicId(t.id);
            if (window.innerWidth < 1024) {
              setIsSidebarOpen(false);
            }
          }}
          onOpenNewTopicModal={() => setIsNewModalOpen(true)}
          onRequestDeleteTopic={(t) => setTopicToDelete(t)}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Document View Canvas */}
        <main className="flex-1 overflow-y-auto p-2 sm:p-5 md:p-8 flex justify-center bg-[#f0f4f9] print:bg-white print:p-0 print:overflow-visible print:block print:w-full print:m-0">
          {currentTopic ? (
            <div className="w-full max-w-[850px] print:max-w-none print:w-full">
              <DocumentPaper
                key={currentTopic.id}
                topic={currentTopic}
                viewMode={viewMode}
                formatting={formatting}
                zoomLevel={zoomLevel}
                existingCategories={existingCategories}
                onUpdateTopic={handleUpdateTopic}
                onToggleViewMode={handleToggleViewMode}
                onNotify={showToast}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center text-gray-500 my-auto">
              <p className="text-base font-semibold text-gray-700 mb-2">
                Nessun argomento disponibile
              </p>
              <p className="text-xs text-gray-500 mb-4 max-w-sm">
                Crea un nuovo argomento per iniziare a prendere appunti e salvare documenti.
              </p>
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm"
              >
                Crea Nuovo Argomento
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Modal: New Topic */}
      <NewTopicModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreate={handleCreateTopic}
        existingCategories={existingCategories}
      />

      {/* Modal: Google Drive Sync & Backup Manager */}
      <DriveSyncModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        user={user}
        accessToken={accessToken}
        currentTopic={currentTopic}
        allTopics={topics}
        onTopicUpdated={(updated) => {
          setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        }}
        onTopicsBatchUpdated={(updatedTopics) => {
          setTopics(updatedTopics);
          if (updatedTopics.length > 0 && !selectedTopicId) {
            setSelectedTopicId(updatedTopics[0].id);
          }
        }}
        onImportTopic={(imported) => {
          setTopics((prev) => [imported, ...prev.filter((t) => t.id !== imported.id)]);
          setSelectedTopicId(imported.id);
        }}
        onGoogleSignIn={handleGoogleSignIn}
      />

      {/* Modal: Destructive Delete Confirmation */}
      <DeleteConfirmationModal
        isOpen={!!topicToDelete}
        topicTitle={topicToDelete?.title || ''}
        hasDriveSync={!!topicToDelete?.googleDriveFileId}
        onConfirm={handleConfirmDelete}
        onCancel={() => setTopicToDelete(null)}
        isDeleting={isDeleting}
      />

      {/* Modal: Print & PDF Export Manager (with iOS AirPrint / Files support) */}
      <PrintExportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        topic={currentTopic}
        onNativePrint={handleNativePrint}
        onExportAllPdf={() => setIsExportAllModalOpen(true)}
        topicsCount={topics.length}
      />

      {/* Modal: Export All Topics to Single PDF (Desktop Web) */}
      <ExportAllPdfModal
        isOpen={isExportAllModalOpen}
        onClose={() => setIsExportAllModalOpen(false)}
        topics={topics}
        onNotify={showToast}
      />

      {/* Offline Status Toast */}
      <OfflineIndicator />
    </div>
  );
}
