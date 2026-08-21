import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  query,
  enableMultiTabIndexedDbPersistence,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { getFirestoreErrorCode } from '../lib/firestoreError';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function initFirestore(): Firestore | null {
  const dbId = (firebaseConfig as any)?.firestoreDatabaseId;
  if (dbId && dbId !== '(default)') {
    try {
      return getFirestore(app, dbId);
    } catch (e) {
      console.warn(`Failed to initialize Firestore with databaseId "${dbId}", trying default database:`, e);
    }
  }
  try {
    return getFirestore(app);
  } catch (e) {
    console.error("Failed to initialize Firestore:", e);
    return null;
  }
}

export const db = initFirestore();
export const auth = getAuth(app);

// Enable offline persistence to support offline mode and prevent connection error blockages
if (db && typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore multi-tab persistence failed-precondition (multiple tabs open)');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore multi-tab persistence unimplemented in this browser');
    } else {
      console.warn('Firestore persistence initialization error:', err);
    }
  });
}

// Firestore operation types
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Structured error info as required by instructions
interface FirestoreErrorInfo {
  code: string | null;
  operationType: OperationType;
}

export function handleFirestoreError(error: unknown, operationType: OperationType) {
  const safeErrorInfo: FirestoreErrorInfo = {
    code: getFirestoreErrorCode(error),
    operationType,
  };
  console.error('Firestore operation failed', safeErrorInfo);
  const wrappedError = new Error(JSON.stringify(safeErrorInfo));
  Object.assign(wrappedError, { code: safeErrorInfo.code });
  throw wrappedError;
}

// --- Helper to clean undefined values recursively ---
function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as any;
  }
  const newObj = {} as any;
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (val !== undefined) {
      newObj[key] = cleanUndefined(val);
    }
  }
  return newObj as T;
}

// --- Firestore User Profile Ops ---
export interface UserProfile {
  userId: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
  currency: string;
  initialCapital?: number;
  createdAt: string;
  adminId?: string;
  allowedTabs?: string[];
}

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!db) return null;
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET);
    return null;
  }
};

export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  if (!db) return;
  try {
    const cleaned = cleanUndefined(profile);
    await setDoc(doc(db, 'users', profile.userId), cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE);
  }
};

// --- Generic Helpers for Subcollections ---
export const fetchCollection = async <T>(userId: string, subcollection: string): Promise<T[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'users', userId, subcollection));
    const querySnapshot = await getDocs(q);
    const list: T[] = [];
    querySnapshot.forEach((d) => {
      list.push({ ...d.data() } as T);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST);
    return [];
  }
};

export const saveDocument = async <T extends { id?: string; month?: string }>(
  userId: string, 
  subcollection: string, 
  docId: string, 
  data: T
): Promise<void> => {
  if (!db) return;
  const path = `users/${userId}/${subcollection}/${docId}`;
  try {
    // Enforce the owner guard: every document must carry the owning uid so Firestore rules
    // can verify relational field alignment (security_spec.md invariant #3).
    const cleaned = cleanUndefined({
      ...data,
      userId // Make sure the owner UID is written on every document
    });
    await setDoc(doc(db, 'users', userId, subcollection, docId), cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE);
  }
};

// --- Client-side financial value range enforcement (defense in depth) ---
// Clamps negative numeric fields to 0 before saving, complementing the Firestore rules
// that reject negative amounts at the database layer (security_spec.md invariant #4).
export function sanitizeFinancialValue(value: number): number {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
}

export const deleteDocument = async (
  userId: string, 
  subcollection: string, 
  docId: string
): Promise<void> => {
  if (!db) return;
  const path = `users/${userId}/${subcollection}/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, subcollection, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE);
  }
};
