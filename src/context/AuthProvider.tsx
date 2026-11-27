import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, InteractionManager } from 'react-native';
import type { User } from '@supabase/supabase-js';
import { configError, isCloudConfigured, supabase } from '@/src/cloud/supabase';
import { getLastSync, mergeDeviceIntoAccount, syncAccount } from '@/src/cloud/sync';
import { clearAllNotifications, markNotificationsDirty } from '@/src/notifications';
import { settingsRepository } from '@/src/storage';
import { DEVICE_NAMESPACE, switchStorageNamespace } from '@/src/storage/repository';

export type CloudSyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface AuthContextValue {
  ready: boolean;
  configured: boolean;
  configError: string | null;
  user: User | null;
  /** Changes only on login/logout; used to remount data-owning providers. */
  authKey: string;
  busy: boolean;
  error: string | null;
  notice: string | null;
  syncStatus: CloudSyncStatus;
  lastSyncedAt: string | null;
  /** Increments after a pull changed local data so screens can reload. */
  dataVersion: number;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  clearError: () => void;
  clearNotice: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  const userRef = useRef<User | null>(null);
  const activationRef = useRef(0);
  const syncingRef = useRef<{ userId: string; promise: Promise<void> } | null>(null);
  const foregroundSyncRef = useRef<{ cancel: () => void } | null>(null);

  // Only one sync at a time, and never let an old account's sync overwrite the
  // new account's status or reload counter.
  const runSync = useCallback(async (userId: string) => {
    if (!supabase) return;
    const previous = syncingRef.current;
    if (previous?.userId === userId) {
      await previous.promise;
      return;
    }
    if (previous) await previous.promise.catch(() => {});
    if (userRef.current?.id !== userId) return;

    const promise = (async () => {
      try {
        const result = await syncAccount(userId);
        if (userRef.current?.id !== userId) return;
        setLastSyncedAt(await getLastSync(userId));
        setSyncStatus('idle');
        if (result.changed) {
          setDataVersion((version) => version + 1);
          markNotificationsDirty();
        }
      } catch (syncError) {
        if (userRef.current?.id !== userId) return;
        setSyncStatus('error');
        setError(messageOf(syncError));
      }
    })();

    syncingRef.current = { userId, promise };
    try {
      await promise;
    } finally {
      if (syncingRef.current?.promise === promise) syncingRef.current = null;
    }
  }, []);

  const activateUser = useCallback(async (nextUser: User) => {
    const token = ++activationRef.current;
    // Drop alerts belonging to the previous account before data is swapped.
    await clearAllNotifications().catch(() => {});
    if (token !== activationRef.current) return;
    await switchStorageNamespace(nextUser.id);
    if (token !== activationRef.current) return;
    settingsRepository.invalidate();
    try {
      await mergeDeviceIntoAccount(nextUser.id);
    } catch (mergeError) {
      setError(messageOf(mergeError));
    }
    if (token !== activationRef.current) return;

    userRef.current = nextUser;
    setUser(nextUser);
    setNotice(null);
    setLastSyncedAt(await getLastSync(nextUser.id));
    markNotificationsDirty();
    // Network work is idle work: never hold the first render hostage to it.
    void runSync(nextUser.id);
  }, [runSync]);

  const activateDevice = useCallback(async () => {
    const token = ++activationRef.current;
    await clearAllNotifications().catch(() => {});
    if (token !== activationRef.current) return;
    await switchStorageNamespace(DEVICE_NAMESPACE);
    if (token !== activationRef.current) return;
    settingsRepository.invalidate();
    userRef.current = null;
    setUser(null);
    setSyncStatus('idle');
    setLastSyncedAt(null);
    setError(null);
    setNotice(null);
    markNotificationsDirty();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!supabase) {
          await switchStorageNamespace(DEVICE_NAMESPACE);
        } else {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) await activateUser(data.session.user);
          else await activateDevice();
        }
      } catch {
        await activateDevice().catch(() => {});
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [activateDevice, activateUser]);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && userRef.current) void activateDevice();
    });
    return () => data.subscription.unsubscribe();
  }, [activateDevice]);

  useEffect(() => {
    if (!ready || !userRef.current) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      foregroundSyncRef.current?.cancel();
      foregroundSyncRef.current = InteractionManager.runAfterInteractions(() => {
        const active = userRef.current;
        if (active) void runSync(active.id);
      });
    });
    return () => {
      subscription.remove();
      foregroundSyncRef.current?.cancel();
    };
  }, [ready, runSync]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      setError('Supabase is not configured on this build.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;
      if (!data.user) throw new Error('Sign in returned no user.');
      await activateUser(data.user);
    } catch (signInError) {
      setError(messageOf(signInError));
    } finally {
      setBusy(false);
    }
  }, [activateUser]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      setError('Supabase is not configured on this build.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;
      if (data.session?.user) {
        await activateUser(data.session.user);
      } else {
        setNotice('confirm-email');
      }
    } catch (signUpError) {
      setError(messageOf(signUpError));
    } finally {
      setBusy(false);
    }
  }, [activateUser]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    setBusy(true);
    try {
      // The SIGNED_OUT listener switches storage and clears notifications.
      // On failure we stay in the account instead of showing a guest UI over
      // a session that is still valid.
      await supabase.auth.signOut();
    } catch (signOutError) {
      setError(messageOf(signOutError));
    } finally {
      setBusy(false);
    }
  }, []);

  const syncNow = useCallback(async () => {
    const active = userRef.current;
    if (!active) return;
    await runSync(active.id);
  }, [runSync]);

  const value = useMemo<AuthContextValue>(() => ({
    ready,
    configured: isCloudConfigured,
    configError,
    user,
    authKey: user?.id ?? DEVICE_NAMESPACE,
    busy,
    error,
    notice,
    syncStatus,
    lastSyncedAt,
    dataVersion,
    signIn,
    signUp,
    signOut,
    syncNow,
    clearError: () => setError(null),
    clearNotice: () => setNotice(null),
  }), [
    ready,
    user,
    busy,
    error,
    notice,
    syncStatus,
    lastSyncedAt,
    dataVersion,
    signIn,
    signUp,
    signOut,
    syncNow,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
