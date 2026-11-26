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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager } from 'react-native';
import { UpdateDialog, UpdateNotice } from '@/src/components/UpdateDialog';
import { useI18n } from '@/src/i18n';
import { checkForUpdate, type UpdateInfo } from './updateService';

const LAST_CHECK_KEY = '@waqty/last_update_check';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000;

type UpdateMessage = 'noUpdate' | 'error' | null;

interface UpdateContextValue {
  check: (manual?: boolean) => Promise<void>;
  checking: boolean;
  dismiss: () => void;
}

const UpdateContext = createContext<UpdateContextValue | null>(null);

export function UpdateProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [message, setMessage] = useState<UpdateMessage>(null);
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);
  const mountedRef = useRef(true);

  const check = useCallback(async (manual = false) => {
    if (checkingRef.current || !mountedRef.current) return;

    if (!manual) {
      try {
        const lastCheck = await AsyncStorage.getItem(LAST_CHECK_KEY);
        if (lastCheck && Date.now() - Number(lastCheck) < CHECK_INTERVAL) return;
      } catch {
        // Storage failures should never block the update check.
      }
    }

    checkingRef.current = true;
    if (mountedRef.current) setChecking(true);
    if (mountedRef.current) setMessage(null);

    try {
      const result = await checkForUpdate();
      try {
        await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
      } catch {
        // Ignore storage failures.
      }
      if (result) {
        if (mountedRef.current) setInfo(result);
      } else if (manual && mountedRef.current) {
        setMessage('noUpdate');
      }
    } catch {
      if (manual && mountedRef.current) setMessage('error');
    } finally {
      checkingRef.current = false;
      if (mountedRef.current) setChecking(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // Run the daily update check after the first navigation/interactions settle
    // so it never competes with opening the app or switching tabs.
    const handle = InteractionManager.runAfterInteractions(() => {
      void check(false);
    });
    return () => {
      mountedRef.current = false;
      handle.cancel();
    };
  }, [check]);

  const dismiss = useCallback(() => setInfo(null), []);
  const clearMessage = useCallback(() => setMessage(null), []);

  const value = useMemo(() => ({ check, checking, dismiss }), [check, checking]);

  return (
    <UpdateContext.Provider value={value}>
      {children}
      <UpdateDialog info={info} onDismiss={dismiss} />
      <UpdateNotice
        text={
          message === 'noUpdate'
            ? t('update.noUpdate')
            : message === 'error'
              ? t('update.error')
              : null
        }
        onDismiss={clearMessage}
      />
    </UpdateContext.Provider>
  );
}

export function useAppUpdate() {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useAppUpdate must be used within UpdateProvider');
  }
  return context;
}
