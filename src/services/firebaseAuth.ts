import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

// ID client OAuth "Applicazione web" (Firebase Console > Authentication > Google > Web SDK configuration)
const GOOGLE_CLIENT_ID = '604961682001-2g89baca9b00qniga0livdp8iffnu0ha.apps.googleusercontent.com';

const TOKEN_STORAGE_KEY = 'adodoc_drive_access_token_v3';

declare const google: any;

let cachedAccessToken: string | null = null;

try {
  if (typeof window !== 'undefined') {
    cachedAccessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  }
} catch {
  // Ignore
}

/** Carica Google Identity Services una sola volta */
const loadGis = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) return resolve();
    const existing = document.querySelector('script[data-gis]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Caricamento Google non riuscito')));
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.setAttribute('data-gis', '1');
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Caricamento Google non riuscito'));
    document.head.appendChild(s);
  });

export const isTokenExpired = (err: unknown): boolean => {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg === 'SESSION_EXPIRED' ||
    msg.includes('invalid authentication credentials') ||
    msg.includes('Expected OAuth 2 access token') ||
    msg.includes('401')
  );
};

export const clearCachedAccessToken = () => {
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken && typeof window !== 'undefined') {
        try {
          cachedAccessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        } catch {
          // Ignore
        }
      }
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken || '');
    } else {
      clearCachedAccessToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Login con Google Identity Services (nessun problema COOP / window.closed),
 * poi accesso a Firebase con lo stesso token.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    await loadGis();

    const accessToken: string = await new Promise((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: `openid email profile ${DRIVE_SCOPE}`,
        callback: (resp: any) => {
          if (resp.error) {
            reject(new Error(resp.error_description || resp.error));
          } else {
            resolve(resp.access_token);
          }
        },
        error_callback: (err: any) => {
          reject(new Error(err?.type === 'popup_closed' ? 'Accesso annullato' : err?.type || 'Errore accesso Google'));
        },
      });
      client.requestAccessToken({ prompt: 'select_account' });
    });

    const credential = GoogleAuthProvider.credential(null, accessToken);
    const result = await signInWithCredential(auth, credential);

    cachedAccessToken = accessToken;
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    } catch {
      // Ignore
    }
    return { user: result.user, accessToken };
  } catch (error: unknown) {
    console.error('Errore durante il login con Google:', error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken && typeof window !== 'undefined') {
    try {
      cachedAccessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }
};

export const logout = async () => {
  const token = cachedAccessToken;
  try {
    if (token && (window as any).google?.accounts?.oauth2) {
      google.accounts.oauth2.revoke(token, () => {});
    }
  } catch {
    // Ignore
  }
  await signOut(auth);
  clearCachedAccessToken();
};
