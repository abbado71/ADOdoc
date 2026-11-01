import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
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

const provider = new GoogleAuthProvider();
provider.addScope(DRIVE_SCOPE);

// Use persistent localStorage so tokens survive iOS app closures, backgrounding, and Safari tab switches
const TOKEN_STORAGE_KEY = 'adodoc_drive_access_token_v3';

let isSigningIn = false;
let cachedAccessToken: string | null = null;

try {
  if (typeof window !== 'undefined') {
    cachedAccessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  }
} catch {
  // Ignore
}

/**
 * Checks if an error is due to an expired or invalid OAuth access token.
 */
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

/**
 * Clears the cached access token when expired or on logout.
 */
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

/**
 * Initializes the auth listener to monitor sign-in state across restarts.
 */
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

      // If we have an access token, notify success with the token
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // User is known in Firebase, but needs fresh OAuth token for Drive
        if (onAuthSuccess) onAuthSuccess(user, '');
      }
    } else {
      clearCachedAccessToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Initiates the Google Sign-In popup with Google Drive scope.
 * Works on Desktop and Mobile (iOS / Android).
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Impossibile ottenere il token di accesso Google');
    }

    cachedAccessToken = credential.accessToken;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(TOKEN_STORAGE_KEY, credential.accessToken);
      } catch {
        // Ignore
      }
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: unknown) {
    console.error('Errore durante il login con Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Returns the currently cached OAuth access token from persistent storage.
 */
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

/**
 * Sets the access token manually in memory and persistent storage.
 */
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

/**
 * Signs the user out and clears all cached tokens.
 */
export const logout = async () => {
  await signOut(auth);
  clearCachedAccessToken();
};
