import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  browserSessionPersistence,
  setPersistence
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Request Google Drive File scope to read/write files created by this app
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Get token from session storage or cache
try {
  const savedToken = sessionStorage.getItem('gdrive_access_token');
  if (savedToken) {
    cachedAccessToken = savedToken;
  }
} catch (e) {
  console.error('Failed to read from sessionStorage', e);
}

// Initialize Auth State Listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Use session persistence so user doesn't lose login on page refresh
  setPersistence(auth, browserSessionPersistence).catch(err => {
    console.error('Persistence error:', err);
  });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If we have user but no cached token, we may need to sign in again to get the token
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      try {
        sessionStorage.removeItem('gdrive_access_token');
      } catch (e) {}
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    try {
      sessionStorage.setItem('gdrive_access_token', cachedAccessToken);
    } catch (e) {}
    
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Logout
export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem('gdrive_access_token');
  } catch (e) {}
};

// Get active Access Token
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export interface DriveBackupFile {
  id: string;
  name: string;
  modifiedTime: string;
}

// List backups in Google Drive
export const getBackupsFromDrive = async (): Promise<DriveBackupFile[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول أولاً للوصول إلى السحابة');

  const query = encodeURIComponent("name contains 'malyah_backup' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired
      cachedAccessToken = null;
      sessionStorage.removeItem('gdrive_access_token');
      throw new Error('انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول');
    }
    throw new Error('فشل تحميل الملفات من Google Drive');
  }

  const data = await response.json();
  return data.files || [];
};

// Save Backup to Google Drive
export const saveBackupToDrive = async (dataPayload: any): Promise<DriveBackupFile> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول أولاً لحفظ البيانات في السحابة');

  // Let's create a backup file with date in name
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(2, '0')}`;
  const fileName = `malyah_backup_${dateStr}_${timeStr}.json`;

  // First create file metadata
  const metaUrl = 'https://www.googleapis.com/drive/v3/files';
  const metaResponse = await fetch(metaUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: fileName,
      mimeType: 'application/json',
    }),
  });

  if (!metaResponse.ok) {
    if (metaResponse.status === 401) {
      cachedAccessToken = null;
      sessionStorage.removeItem('gdrive_access_token');
      throw new Error('انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول');
    }
    throw new Error('فشل إنشاء ملف النسخة الاحتياطية في السحابة');
  }

  const fileMetadata = await metaResponse.json();
  const fileId = fileMetadata.id;

  // Now upload content
  const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dataPayload),
  });

  if (!uploadResponse.ok) {
    throw new Error('فشل رفع محتوى النسخة الاحتياطية إلى السحابة');
  }

  return {
    id: fileId,
    name: fileName,
    modifiedTime: new Date().toISOString(),
  };
};

// Download Backup from Google Drive
export const downloadBackupFromDrive = async (fileId: string): Promise<any> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول أولاً لاستعادة البيانات من السحابة');

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('فشل تنزيل ملف النسخة الاحتياطية من السحابة');
  }

  return await response.json();
};

// Delete Backup from Google Drive
export const deleteBackupFromDrive = async (fileId: string): Promise<void> => {
  const token = getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول أولاً لإجراء التغييرات');

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('فشل حذف ملف النسخة الاحتياطية من السحابة');
  }
};
