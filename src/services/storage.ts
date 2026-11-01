import { Topic, TopicVersion } from '../types';

/**
 * INITIAL_TOPICS is empty by design.
 * No mock or sample topics will ever be generated or re-seeded.
 */
export const INITIAL_TOPICS: Topic[] = [];

export const DEMO_TOPIC_IDS = new Set([
  'topic-1-spazio',
  'topic-2-ai',
  'topic-3-rinascimento',
]);

/**
 * Detects any legacy sample/demo topics so they are completely purged
 * from localStorage, IndexedDB, and Google Drive sync.
 */
export function isDemoTopic(t: { id?: string; title?: string } | null | undefined): boolean {
  if (!t) return false;
  if (t.id && DEMO_TOPIC_IDS.has(t.id)) return true;
  const title = (t.title || '').toLowerCase();
  if (title.includes('esplorazione spaziale') || title.includes('artemis')) return true;
  if (title.includes('intelligenza artificiale') || title.includes('reti neurali')) return true;
  if (title.includes('rinascimento fiorentino') || title.includes('prospettiva')) return true;
  return false;
}

const LOCAL_STORAGE_KEY = 'docu_argomenti_list_v4';
const LOCAL_STORAGE_DELETED_KEY = 'docu_deleted_topic_ids_v1';
const LOCAL_STORAGE_INIT_KEY = 'docu_initialized_v4';
const IDB_NAME = 'ADOdoc_Database';
const IDB_VERSION = 1;
const IDB_STORE = 'topics_store';
const IDB_KEY = 'all_topics';

/**
 * Returns set of topic IDs that the user has explicitly deleted.
 * Prevents deleted topics from being re-imported from cloud or re-seeded.
 */
export function getDeletedTopicIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DELETED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch {
    // Ignore
  }
  return new Set();
}

/**
 * Marks a topic ID as permanently deleted in local storage.
 */
export function markTopicAsDeleted(topicId: string): void {
  try {
    const set = getDeletedTopicIds();
    set.add(topicId);
    localStorage.setItem(LOCAL_STORAGE_DELETED_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn('Errore salvataggio ID eliminato:', err);
  }
}

/**
 * Records multiple topic IDs as deleted in local storage (used during cloud sync).
 */
export function markMultipleTopicsAsDeleted(topicIds: string[]): void {
  if (!topicIds || topicIds.length === 0) return;
  try {
    const set = getDeletedTopicIds();
    let modified = false;
    topicIds.forEach((id) => {
      if (id && !set.has(id)) {
        set.add(id);
        modified = true;
      }
    });
    if (modified) {
      localStorage.setItem(LOCAL_STORAGE_DELETED_KEY, JSON.stringify(Array.from(set)));
    }
  } catch (err) {
    console.warn('Errore salvataggio multiplo ID eliminati:', err);
  }
}

/**
 * Removes an ID from the deleted tombstone set (used when restoring or discovering active cloud files).
 */
export function unmarkTopicAsDeleted(topicId: string): void {
  try {
    const set = getDeletedTopicIds();
    if (set.delete(topicId)) {
      localStorage.setItem(LOCAL_STORAGE_DELETED_KEY, JSON.stringify(Array.from(set)));
    }
  } catch (err) {
    console.warn('Errore rimozione ID eliminato:', err);
  }
}

/**
 * Removes multiple IDs from the deleted tombstone set.
 */
export function unmarkMultipleTopicsAsDeleted(topicIds: string[]): void {
  if (!topicIds || topicIds.length === 0) return;
  try {
    const set = getDeletedTopicIds();
    let modified = false;
    topicIds.forEach((id) => {
      if (set.delete(id)) {
        modified = true;
      }
    });
    if (modified) {
      localStorage.setItem(LOCAL_STORAGE_DELETED_KEY, JSON.stringify(Array.from(set)));
    }
  } catch (err) {
    console.warn('Errore rimozione multipla ID eliminati:', err);
  }
}

/**
 * Checks if a topic ID has been deleted.
 */
export function isTopicDeleted(topicId: string): boolean {
  return getDeletedTopicIds().has(topicId);
}

/**
 * Open IndexedDB database safely
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB non disponibile'));
      return;
    }
    const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Persist topics to IndexedDB (virtually unlimited quota, perfect for iOS PWAs with images)
 */
export async function saveTopicsToIndexedDB(topics: Topic[]): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(topics, IDB_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (err) {
    console.warn('Errore salvataggio IndexedDB:', err);
  }
}

/**
 * Load topics from IndexedDB
 */
export async function loadTopicsFromIndexedDB(): Promise<Topic[] | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => {
        const result = req.result;
        if (Array.isArray(result)) {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (err) {
    console.warn('Errore lettura da IndexedDB:', err);
    return null;
  }
}

/**
 * Synchronous initial load from localStorage for immediate, zero-flicker render
 */
export function loadStoredTopics(): Topic[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out legacy demo topics
        return parsed.filter((t) => !isDemoTopic(t));
      }
    }

    return [];
  } catch (err) {
    console.error('Errore nel caricamento dal localStorage:', err);
  }

  return [];
}

/**
 * Asynchronous authoritative loader (IndexedDB takes precedence for rich media)
 */
export async function loadStoredTopicsAsync(): Promise<Topic[]> {
  try {
    const idbTopics = await loadTopicsFromIndexedDB();
    if (idbTopics) {
      const filtered = idbTopics.filter((t) => !isDemoTopic(t));
      return filtered;
    }
  } catch (err) {
    console.warn('Errore caricamento asincrono IndexedDB, fallback localStorage:', err);
  }
  const local = loadStoredTopics();
  // Seed IndexedDB for future instant availability
  saveTopicsToIndexedDB(local).catch(() => {});
  return local;
}

/**
 * Dual-layer persistent save:
 * 1. Writes full documents with images to IndexedDB (safe against 5MB quota errors).
 * 2. Writes to localStorage cache with safe error boundary.
 * Omits old version snapshots to keep documents ultra-fast and lightweight as requested.
 */
export function saveStoredTopics(topics: Topic[]): void {
  // Strip demo topics and version history bloat
  const filtered = topics
    .filter((t) => !isDemoTopic(t))
    .map(({ versions, ...rest }) => ({ ...rest, versions: [] }));

  // Mark as initialized so empty array is preserved as valid user state
  try {
    localStorage.setItem(LOCAL_STORAGE_INIT_KEY, 'true');
  } catch {
    // Ignore
  }

  // 1. Authoritative IndexedDB write
  saveTopicsToIndexedDB(filtered).catch((err) => {
    console.error('Errore scrittura IndexedDB:', err);
  });

  // 2. LocalStorage cache
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Quota localStorage superata (normale con immagini). Salvataggio completato in IndexedDB:', err);
  }
}

/**
 * Immediate synchronous/unconditional flush for iOS lifecycle events (pagehide, visibilitychange)
 */
export function flushStoredTopicsSync(topics: Topic[]): void {
  const filtered = (topics || [])
    .filter((t) => !isDemoTopic(t))
    .map(({ versions, ...rest }) => ({ ...rest, versions: [] }));

  try {
    localStorage.setItem(LOCAL_STORAGE_INIT_KEY, 'true');
  } catch {
    // Ignore
  }

  saveTopicsToIndexedDB(filtered).catch(() => {});
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // Ignore quota issues during emergency flush
  }
}

/**
 * Creates a version snapshot for a topic.
 * Protects against memory/storage bloat by pruning excessive embedded base64 in older snapshots.
 */
export function createTopicVersionSnapshot(
  topic: Topic,
  summary: string = 'Modifica documento',
  savedBy: string = 'Utente'
): TopicVersion {
  let versionContent = topic.content;
  // If snapshot content is huge (> 500KB due to base64 images), replace raw base64 in history snapshot
  if (versionContent.length > 500000) {
    versionContent = versionContent.replace(
      /src="data:image\/[^;]+;base64,[^"]+"/g,
      'src="data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'70\'><rect width=\'100%\' height=\'100%\' fill=\'%23f1f5f9\'/><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%2364748b\' font-size=\'11\'>Immagine</text></svg>"'
    );
  }

  return {
    id: `ver-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    topicId: topic.id,
    timestamp: new Date().toISOString(),
    title: topic.title,
    category: topic.category,
    content: versionContent,
    summary,
    savedBy,
  };
}
