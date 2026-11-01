import { Topic } from '../types';
import {
  getDeletedTopicIds,
  markMultipleTopicsAsDeleted,
  unmarkMultipleTopicsAsDeleted,
  markTopicAsDeleted,
  isDemoTopic,
} from './storage';
import { clearCachedAccessToken } from './firebaseAuth';

export interface DriveFileSummary {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  size?: string;
}

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

let cachedFolderId: string | null = null;

let folderInitPromise: Promise<string> | null = null;

/**
 * Consolidates duplicate 'ADOdoc' folders if more than one exists on Google Drive.
 * Moves any files from duplicate folders into the primary folder, then removes empty duplicates.
 */
async function consolidateDuplicateFolders(
  folders: Array<{ id: string; name: string; createdTime?: string }>,
  accessToken: string
): Promise<string> {
  if (folders.length === 1) return folders[0].id;

  try {
    // Check file counts in each folder
    const folderStats = await Promise.all(
      folders.map(async (folder) => {
        try {
          const q = `'${folder.id}' in parents and trashed = false`;
          const res = await fetch(`${DRIVE_API_URL}?q=${encodeURIComponent(q)}&fields=files(id,name)`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const data = res.ok ? await res.json() : { files: [] };
          const files = data.files || [];
          const hasArchive = files.some((f: { name: string }) => f.name === 'ADOdoc_Archivio.json');
          return { ...folder, files, fileCount: files.length, hasArchive };
        } catch {
          return { ...folder, files: [], fileCount: 0, hasArchive: false };
        }
      })
    );

    // Primary folder is the one containing ADOdoc_Archivio.json, or with the most files
    folderStats.sort((a, b) => {
      if (a.hasArchive && !b.hasArchive) return -1;
      if (!a.hasArchive && b.hasArchive) return 1;
      return b.fileCount - a.fileCount;
    });

    const primaryFolder = folderStats[0];
    const duplicates = folderStats.slice(1);

    // Move any files from duplicates into primary, then delete duplicate folders
    for (const dup of duplicates) {
      for (const file of dup.files) {
        try {
          await fetch(
            `${DRIVE_API_URL}/${file.id}?addParents=${primaryFolder.id}&removeParents=${dup.id}`,
            {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
        } catch (moveErr) {
          console.warn(`Errore spostamento file ${file.id} nella cartella primaria:`, moveErr);
        }
      }

      // Delete the duplicate empty folder
      try {
        await fetch(`${DRIVE_API_URL}/${dup.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        console.log(`Cartella duplicata ADOdoc (${dup.id}) rimossa con successo.`);
      } catch (delErr) {
        console.warn(`Errore eliminazione cartella duplicata ${dup.id}:`, delErr);
      }
    }

    return primaryFolder.id;
  } catch (err) {
    console.warn('Errore consolidamento cartelle duplicate:', err);
    return folders[0].id;
  }
}

/**
 * Finds or creates the dedicated 'ADOdoc' folder on Google Drive.
 * Uses a singleton promise to guarantee no concurrent race conditions create duplicate folders.
 * Automatically consolidates and deletes any existing duplicate 'ADOdoc' folders.
 */
export async function getOrCreateAdoDocFolder(accessToken: string): Promise<string> {
  if (cachedFolderId) {
    return cachedFolderId;
  }

  if (folderInitPromise) {
    return folderInitPromise;
  }

  folderInitPromise = (async () => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('adodoc_gdrive_folder_id') : null;
      if (stored) {
        // Verify folder still exists on Drive
        const verifyRes = await fetch(`${DRIVE_API_URL}/${stored}?fields=id,name,trashed`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (verifyRes.status === 401) {
          clearCachedAccessToken();
          throw new Error('SESSION_EXPIRED');
        }
        if (verifyRes.ok) {
          const folderData = await verifyRes.json();
          if (!folderData.trashed) {
            cachedFolderId = folderData.id;
            return cachedFolderId!;
          }
        }
      }
    } catch (cacheErr) {
      if (cacheErr instanceof Error && cacheErr.message === 'SESSION_EXPIRED') throw cacheErr;
    }

    try {
      // 1. Search for existing 'ADOdoc' folders (pageSize 10 to detect duplicates)
      const q = "mimeType = 'application/vnd.google-apps.folder' and name = 'ADOdoc' and trashed = false";
      const url = `${DRIVE_API_URL}?q=${encodeURIComponent(q)}&fields=files(id,name,createdTime)&pageSize=10`;
      const searchRes = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (searchRes.status === 401) {
        clearCachedAccessToken();
        throw new Error('SESSION_EXPIRED');
      }

      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
          // If duplicates exist, consolidate them into a single primary folder and delete the other
          const resolvedFolderId = await consolidateDuplicateFolders(data.files, accessToken);
          cachedFolderId = resolvedFolderId;
          try {
            localStorage.setItem('adodoc_gdrive_folder_id', cachedFolderId);
          } catch {}
          return cachedFolderId;
        }
      }

      // 2. Folder does not exist at all: create it in user's root Drive
      const createRes = await fetch(DRIVE_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'ADOdoc',
          mimeType: 'application/vnd.google-apps.folder',
          description: 'Cartella principale contenente i documenti e gli archivi di ADOdoc',
        }),
      });

      if (createRes.status === 401) {
        clearCachedAccessToken();
        throw new Error('SESSION_EXPIRED');
      }

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Impossibile creare la cartella ADOdoc su Google Drive');
      }

      const created = await createRes.json();
      cachedFolderId = created.id;
      try {
        localStorage.setItem('adodoc_gdrive_folder_id', cachedFolderId!);
      } catch {}
      return cachedFolderId!;
    } catch (err) {
      if (err instanceof Error && err.message === 'SESSION_EXPIRED') throw err;
      console.error('Errore gestione cartella ADOdoc su Drive:', err);
      throw err;
    }
  })().finally(() => {
    folderInitPromise = null;
  });

  return folderInitPromise;
}

/**
 * Searches for files created by this app inside the dedicated 'ADOdoc' folder.
 * Also checks root Drive for any files created before folder migration and moves them to 'ADOdoc'.
 */
export async function listAppFilesFromDrive(accessToken: string): Promise<DriveFileSummary[]> {
  try {
    let folderId: string | null = null;
    try {
      folderId = await getOrCreateAdoDocFolder(accessToken);
    } catch (fErr) {
      if (fErr instanceof Error && fErr.message === 'SESSION_EXPIRED') throw fErr;
    }

    const fileMap = new Map<string, DriveFileSummary>();

    // 1. Query files inside the dedicated ADOdoc folder
    if (folderId) {
      const qFolder = `'${folderId}' in parents and trashed = false`;
      const folderUrl = `${DRIVE_API_URL}?q=${encodeURIComponent(qFolder)}&fields=files(id,name,mimeType,modifiedTime,webViewLink,size)&orderBy=modifiedTime desc`;
      const res = await fetch(folderUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.status === 401) {
        clearCachedAccessToken();
        throw new Error('SESSION_EXPIRED');
      }

      if (res.ok) {
        const data = await res.json();
        (data.files || []).forEach((f: DriveFileSummary) => fileMap.set(f.id, f));
      }
    }

    // 2. Also check if there are legacy files in root that haven't been moved into ADOdoc folder yet
    try {
      const qRoot = "trashed = false and (name contains 'Argomento - ' or name = 'ADOdoc_Archivio.json' or name = 'DocuArgomenti_Archivio.json')";
      const rootUrl = `${DRIVE_API_URL}?q=${encodeURIComponent(qRoot)}&fields=files(id,name,mimeType,modifiedTime,webViewLink,size)&pageSize=30`;
      const resRoot = await fetch(rootUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (resRoot.status === 401) {
        clearCachedAccessToken();
        throw new Error('SESSION_EXPIRED');
      }

      if (resRoot.ok) {
        const rootData = await resRoot.json();
        for (const file of rootData.files || []) {
          if (!fileMap.has(file.id)) {
            fileMap.set(file.id, file);
            // Migrate root file into the ADOdoc folder in background
            if (folderId) {
              fetch(`${DRIVE_API_URL}/${file.id}?addParents=${folderId}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${accessToken}` },
              }).catch(() => {});
            }
          }
        }
      }
    } catch (rootErr) {
      if (rootErr instanceof Error && rootErr.message === 'SESSION_EXPIRED') throw rootErr;
    }

    return Array.from(fileMap.values());
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_EXPIRED') throw error;
    console.error('Errore durante la lettura da Google Drive:', error);
    throw error;
  }
}

const inFlightTopicSaves = new Map<string, Promise<{ fileId: string; modifiedTime: string }>>();

/**
 * Saves a single topic to Google Drive inside the 'ADOdoc' folder as a formatted JSON document.
 * Checks for existing file by name to prevent duplicate files on Google Drive.
 * Automatically cleans up any duplicate files with the same name.
 * Prunes historical version array to keep file sizes lightweight.
 */
export async function saveTopicToGoogleDrive(
  topic: Topic,
  accessToken: string
): Promise<{ fileId: string; modifiedTime: string }> {
  // Prevent duplicate concurrent saves for the same topic ID
  const lockKey = topic.id;
  if (inFlightTopicSaves.has(lockKey)) {
    try {
      return await inFlightTopicSaves.get(lockKey)!;
    } catch {
      // Continue with new save if previous failed
    }
  }

  const savePromise = (async () => {
    const folderId = await getOrCreateAdoDocFolder(accessToken);
    const cleanTitle = topic.title.trim() || 'Senza Titolo';
    const fileName = `Argomento - ${cleanTitle}.json`;

    // Prune version history array as requested by the user
    const cleanTopic: Topic = {
      ...topic,
      versions: [],
    };
    const fileContent = JSON.stringify(cleanTopic, null, 2);

    let targetFileId = topic.googleDriveFileId || null;

    // 1. If no fileId or to check if a file with this name already exists in the folder
    if (!targetFileId) {
      try {
        const safeName = fileName.replace(/'/g, "\\'");
        const searchUrl = `${DRIVE_API_URL}?q=${encodeURIComponent(
          `'${folderId}' in parents and name = '${safeName}' and trashed = false`
        )}&fields=files(id,name,modifiedTime)&pageSize=10`;

        const searchRes = await fetch(searchUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (searchRes.status === 401) {
          clearCachedAccessToken();
          throw new Error('SESSION_EXPIRED');
        }

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const matches = searchData.files || [];
          if (matches.length > 0) {
            targetFileId = matches[0].id;
            // Clean up any existing duplicate files with the exact same name
            if (matches.length > 1) {
              for (let i = 1; i < matches.length; i++) {
                deleteFileFromDrive(matches[i].id, accessToken).catch(() => {});
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.message === 'SESSION_EXPIRED') throw err;
        console.warn('Errore verifica file duplicati su Drive:', err);
      }
    }

    // 2. If existing file found, PATCH it with updated content
    if (targetFileId) {
      try {
        const updateUrl = `${DRIVE_UPLOAD_URL}/${targetFileId}?uploadType=media`;
        const updateRes = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: fileContent,
        });

        if (updateRes.status === 401) {
          clearCachedAccessToken();
          throw new Error('SESSION_EXPIRED');
        }

        if (updateRes.ok) {
          const data = await updateRes.json();
          // Update file name and ensure parents
          fetch(`${DRIVE_API_URL}/${targetFileId}?addParents=${folderId}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: fileName }),
          }).catch(() => {});

          return { fileId: data.id || targetFileId, modifiedTime: new Date().toISOString() };
        }
      } catch (upErr) {
        if (upErr instanceof Error && upErr.message === 'SESSION_EXPIRED') throw upErr;
        console.warn('Aggiornamento file esistente fallito, creazione nuovo file...');
      }
    }

    // 3. Create multipart upload for new file inside the 'ADOdoc' folder
    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: [folderId],
      description: `Documento argomento: ${cleanTitle} in ADOdoc`,
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    const response = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (response.status === 401) {
      clearCachedAccessToken();
      throw new Error('SESSION_EXPIRED');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Errore salvataggio su Drive (${response.status})`);
    }

    const result = await response.json();
    return { fileId: result.id, modifiedTime: new Date().toISOString() };
  })();

  inFlightTopicSaves.set(lockKey, savePromise);
  try {
    return await savePromise;
  } finally {
    inFlightTopicSaves.delete(lockKey);
  }
}

/**
 * Saves all user topics as a central archive in Google Drive inside the 'ADOdoc' folder.
 * Preserves tombstone list of deleted topic IDs so deletions propagate seamlessly across devices.
 * Strips legacy sample topics and removes versions history bloat.
 */
export async function saveAllTopicsBackupToDrive(
  topics: Topic[],
  accessToken: string,
  extraDeletedIds?: Set<string>
): Promise<{ fileId: string; webViewLink?: string }> {
  const folderId = await getOrCreateAdoDocFolder(accessToken);
  const fileName = 'ADOdoc_Archivio.json';

  const deletedIds = new Set([
    ...getDeletedTopicIds(),
    ...(extraDeletedIds ? Array.from(extraDeletedIds) : []),
  ]);

  // Filter out any deleted items, demo topics, and prune versions
  const sanitizedTopics = topics
    .filter((t) => !deletedIds.has(t.id) && !isDemoTopic(t))
    .map(({ versions, ...rest }) => ({ ...rest, versions: [] }));

  const payload = {
    app: 'ADOdoc',
    exportedAt: new Date().toISOString(),
    deletedTopicIds: Array.from(deletedIds),
    totalTopics: sanitizedTopics.length,
    topics: sanitizedTopics,
  };
  const fileContent = JSON.stringify(payload, null, 2);

  // Check if archive already exists (either in the ADOdoc folder or in app files)
  const files = await listAppFilesFromDrive(accessToken);
  const existingArchive = files.find(
    (f) => f.name === fileName || f.name === 'DocuArgomenti_Archivio.json'
  );

  if (existingArchive) {
    const updateUrl = `${DRIVE_UPLOAD_URL}/${existingArchive.id}?uploadType=media`;
    const res = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: fileContent,
    });

    if (res.status === 401) {
      clearCachedAccessToken();
      throw new Error('SESSION_EXPIRED');
    }

    if (res.ok) {
      // Ensure it is named correctly and inside the ADOdoc folder
      await fetch(`${DRIVE_API_URL}/${existingArchive.id}?addParents=${folderId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: fileName }),
      }).catch(() => {});

      return {
        fileId: existingArchive.id,
        webViewLink: existingArchive.webViewLink || `https://drive.google.com/file/d/${existingArchive.id}/view`,
      };
    }
  }

  // Create new archive inside the 'ADOdoc' folder
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    parents: [folderId],
    description: 'Archivio centrale sincronizzato degli argomenti di ADOdoc',
  };

  const boundary = '-------backup3141592653589';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const res = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (res.status === 401) {
    clearCachedAccessToken();
    throw new Error('SESSION_EXPIRED');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Errore creazione archivio in cartella ADOdoc su Drive');
  }

  const result = await res.json();
  return {
    fileId: result.id,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
  };
}

/**
 * Deletes a file from Google Drive.
 */
export async function deleteFileFromDrive(fileId: string, accessToken: string): Promise<boolean> {
  const response = await fetch(`${DRIVE_API_URL}/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    clearCachedAccessToken();
    throw new Error('SESSION_EXPIRED');
  }

  if (!response.ok && response.status !== 404) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Errore eliminazione file da Drive (${response.status})`);
  }
  return true;
}

/**
 * Loads a topic file from Google Drive.
 */
export async function loadTopicFromDrive(fileId: string, accessToken: string): Promise<Topic | null> {
  const response = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    clearCachedAccessToken();
    throw new Error('SESSION_EXPIRED');
  }

  if (!response.ok) {
    throw new Error(`Impossibile scaricare file da Drive (${response.status})`);
  }

  const data = await response.json();
  if (data && data.title && data.content && !isDemoTopic(data)) {
    return {
      ...data,
      versions: [],
      googleDriveFileId: fileId,
      googleDriveSyncedAt: new Date().toISOString(),
    };
  }
  return null;
}

/**
 * Loads the complete archive of topics from Google Drive if it exists.
 * Filters out demo topics and pruned version bloat.
 */
export interface CloudArchiveData {
  topics: Topic[];
  exportedAt?: string;
  deletedTopicIds?: string[];
}

/**
 * Loads the complete archive details from Google Drive.
 * 1. Reads the central archive first to retrieve tombstones of deleted topics across devices.
 * 2. Merges with any individual topic files, purging any files that were deleted on other devices.
 * 3. Never restores topics that are recorded as deleted.
 */
export async function loadAllTopicsBackupDetailsFromDrive(accessToken: string): Promise<CloudArchiveData | null> {
  try {
    const files = await listAppFilesFromDrive(accessToken);

    const archiveFile = files.find(
      (f) => f.name === 'ADOdoc_Archivio.json' || f.name === 'DocuArgomenti_Archivio.json'
    );
    const individualFiles = files.filter((f) => f.name.startsWith('Argomento - ') && f.name.endsWith('.json'));

    const topicMap = new Map<string, Topic>();
    let exportedAt: string | undefined = undefined;
    const cloudDeletedIds: string[] = [];

    // 1. Read central archive FIRST so we learn what was deleted on any device!
    if (archiveFile) {
      try {
        const response = await fetch(`${DRIVE_API_URL}/${archiveFile.id}?alt=media`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.status === 401) {
          clearCachedAccessToken();
          throw new Error('SESSION_EXPIRED');
        }

        if (response.ok) {
          const data = await response.json();
          exportedAt = data.exportedAt;

          if (Array.isArray(data.deletedTopicIds) && data.deletedTopicIds.length > 0) {
            cloudDeletedIds.push(...data.deletedTopicIds);
            markMultipleTopicsAsDeleted(data.deletedTopicIds);
          }

          if (data && Array.isArray(data.topics)) {
            data.topics.forEach((archTopic: Topic) => {
              if (archTopic && !isDemoTopic(archTopic)) {
                topicMap.set(archTopic.id, { ...archTopic, versions: [] });
              }
            });
          }
        }
      } catch (archErr) {
        if (archErr instanceof Error && archErr.message === 'SESSION_EXPIRED') throw archErr;
        console.warn('Errore lettura archivio centrale:', archErr);
      }
    }

    // Consolidated set of all deleted topic IDs (local tombstones + cloud tombstones)
    const allDeletedSet = new Set([...getDeletedTopicIds(), ...cloudDeletedIds]);

    // Purge any tombstoned topics from topicMap
    for (const delId of allDeletedSet) {
      topicMap.delete(delId);
    }

    // 2. Read individual topic files present on Google Drive
    if (individualFiles.length > 0) {
      const recovered = await Promise.all(
        individualFiles.map(async (file) => {
          try {
            const t = await loadTopicFromDrive(file.id, accessToken);
            if (t && t.title && !isDemoTopic(t)) {
              return {
                ...t,
                googleDriveFileId: file.id,
                versions: [],
              };
            }
          } catch (err) {
            if (err instanceof Error && err.message === 'SESSION_EXPIRED') throw err;
            console.warn(`Errore lettura file Drive ${file.name}:`, err);
          }
          return null;
        })
      );

      for (const item of recovered) {
        if (item) {
          if (allDeletedSet.has(item.id)) {
            // This topic was deleted on another device! Remove its leftover file from Google Drive
            deleteFileFromDrive(item.googleDriveFileId!, accessToken).catch(() => {});
          } else {
            // Active topic: merge into topicMap
            if (!topicMap.has(item.id)) {
              topicMap.set(item.id, item);
            } else {
              const existing = topicMap.get(item.id)!;
              const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
              const itemTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
              if (itemTime >= existingTime) {
                topicMap.set(item.id, {
                  ...item,
                  googleDriveFileId: item.googleDriveFileId || existing.googleDriveFileId,
                });
              }
            }
          }
        }
      }
    }

    // Final purge of any deleted topics
    for (const delId of allDeletedSet) {
      topicMap.delete(delId);
    }

    const topics = Array.from(topicMap.values());
    if (topics.length > 0 || archiveFile) {
      return {
        topics,
        exportedAt,
        deletedTopicIds: Array.from(allDeletedSet),
      };
    }

    return null;
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_EXPIRED') throw error;
    console.error('Errore durante la lettura archivio da Drive:', error);
    return null;
  }
}

/**
 * Loads the complete archive of topics from Google Drive if it exists.
 * Filters out demo topics and pruned version bloat.
 */
export async function loadAllTopicsBackupFromDrive(accessToken: string): Promise<Topic[] | null> {
  const details = await loadAllTopicsBackupDetailsFromDrive(accessToken);
  return details ? details.topics : null;
}

/**
 * Performs bi-directional synchronization between local topics and Google Drive:
 * 1. Reads cloud archive and updates tombstones across devices
 * 2. Purges any topics deleted on other devices from local state
 * 3. Merges local and cloud topics safely (never deleting offline-created topics)
 * 4. Assigns Drive file IDs to any unlinked topics
 * 5. Cleans up files of explicitly deleted topics
 * 6. Saves the updated central archive to Google Drive
 */
export async function syncAllTopicsBiDirectional(
  localTopics: Topic[],
  accessToken: string,
  customDeletedIds?: Set<string>
): Promise<{
  mergedTopics: Topic[];
  importedCount: number;
  updatedCount: number;
  deletedCount: number;
  webViewLink?: string;
}> {
  // 1. Fetch cloud archive details (merging central archive + standalone files)
  const cloudDetails = await loadAllTopicsBackupDetailsFromDrive(accessToken);
  const cloudTopics = cloudDetails?.topics || [];

  const allDeletedIds = new Set([
    ...getDeletedTopicIds(),
    ...(cloudDetails?.deletedTopicIds || []),
    ...(customDeletedIds ? Array.from(customDeletedIds) : []),
  ]);

  if (allDeletedIds.size > 0) {
    markMultipleTopicsAsDeleted(Array.from(allDeletedIds));
  }

  let deletedCount = 0;
  const topicMap = new Map<string, Topic>();

  // 2. Seed map with non-demo local topics, STRICTLY filtering out any deleted topics!
  localTopics
    .filter((t) => !isDemoTopic(t))
    .forEach((t) => {
      if (allDeletedIds.has(t.id)) {
        deletedCount++;
      } else {
        topicMap.set(t.id, { ...t, versions: [] });
      }
    });

  let importedCount = 0;
  let updatedCount = 0;

  // 3. Merge all non-deleted cloud topics found on Google Drive
  cloudTopics.forEach((cloudTopic) => {
    if (isDemoTopic(cloudTopic) || allDeletedIds.has(cloudTopic.id)) {
      return;
    }

    const cleanCloud: Topic = { ...cloudTopic, versions: [] };
    const local = topicMap.get(cleanCloud.id);

    if (!local) {
      // New topic from cloud -> import locally
      topicMap.set(cleanCloud.id, cleanCloud);
      importedCount++;
    } else {
      // Both exist: newer timestamp wins
      const localTime = new Date(local.updatedAt || local.createdAt || 0).getTime();
      const cloudTime = new Date(cleanCloud.updatedAt || cleanCloud.createdAt || 0).getTime();
      if (cloudTime > localTime) {
        topicMap.set(cleanCloud.id, {
          ...cleanCloud,
          googleDriveFileId: cleanCloud.googleDriveFileId || local.googleDriveFileId,
        });
        updatedCount++;
      } else {
        // Local is newer or equal: preserve any googleDriveFileId from cloud if missing locally
        if (!local.googleDriveFileId && cleanCloud.googleDriveFileId) {
          local.googleDriveFileId = cleanCloud.googleDriveFileId;
        }
      }
    }
  });

  // Ensure absolute deletion: remove any topic whose id is in allDeletedIds
  for (const delId of allDeletedIds) {
    topicMap.delete(delId);
  }

  const mergedTopics = Array.from(topicMap.values());

  // 4. For any topic missing a googleDriveFileId, ensure its individual file exists on Drive
  for (let i = 0; i < mergedTopics.length; i++) {
    const t = mergedTopics[i];
    if (!t.googleDriveFileId) {
      try {
        const driveRes = await saveTopicToGoogleDrive(t, accessToken);
        mergedTopics[i] = {
          ...t,
          googleDriveFileId: driveRes.fileId,
          googleDriveSyncedAt: driveRes.modifiedTime,
        };
      } catch (saveErr) {
        if (saveErr instanceof Error && saveErr.message === 'SESSION_EXPIRED') throw saveErr;
        console.warn(`Salvataggio file singolo fallito per ${t.title}:`, saveErr);
      }
    }
  }

  // 5. Clean up any individual files on Drive for topics that were explicitly deleted
  try {
    const allDriveFiles = await listAppFilesFromDrive(accessToken);
    const deletedFileIdsToPurge = new Set<string>();

    for (const file of allDriveFiles) {
      if (file.name.startsWith('Argomento - ')) {
        // If file corresponds to a deleted topic ID or is in allDeletedIds
        for (const delId of allDeletedIds) {
          if (file.name.includes(delId)) {
            deletedFileIdsToPurge.add(file.id);
          }
        }
      }
    }

    for (const fId of deletedFileIdsToPurge) {
      deleteFileFromDrive(fId, accessToken).catch(() => {});
    }
  } catch {}

  // 6. Save the clean merged archive back to the 'ADOdoc' folder on Google Drive
  const saveResult = await saveAllTopicsBackupToDrive(mergedTopics, accessToken, allDeletedIds);

  return {
    mergedTopics,
    importedCount,
    updatedCount,
    deletedCount,
    webViewLink: saveResult.webViewLink,
  };
}

