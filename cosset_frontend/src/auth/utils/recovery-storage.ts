const RECOVERY_STORAGE_KEY = 'cosset_account_recovery';

export type StoredRecoveryState = {
  method: 'phone' | 'questions';
  phone?: string;
  email?: string;
  questions?: Array<{ id: string; prompt: string }>;
  recoveryToken?: string;
  newEmail?: string;
  devCode?: string;
};

export function readRecoveryState(): StoredRecoveryState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(RECOVERY_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as StoredRecoveryState;
  } catch {
    return null;
  }
}

export function writeRecoveryState(state: StoredRecoveryState) {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(state));
}

export function clearRecoveryState() {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
}
