import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { clearSession, readSession, saveSession } from '@/services/session/tokenStorage';

interface SessionContextValue {
  token: string | null;
  isReady: boolean;
  error: string | null;
  signIn: (token: string, expiresIn: number) => Promise<void>;
  signOut: () => Promise<void>;
  retryRestore: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    async function restore() {
      setIsReady(false);
      setError(null);
      try {
        const session = await readSession();
        if (isCurrent) {
          setToken(session?.token ?? null);
        }
      } catch (restoreError) {
        if (isCurrent) {
          setError(
            restoreError instanceof Error
              ? restoreError.message
              : 'Không thể khôi phục phiên đăng nhập.',
          );
        }
      } finally {
        if (isCurrent) {
          setIsReady(true);
        }
      }
    }

    void restore();
    return () => {
      isCurrent = false;
    };
  }, [restoreAttempt]);

  const signIn = useCallback(async (newToken: string, expiresIn: number) => {
    await saveSession(newToken, expiresIn);
    setToken(newToken);
    setError(null);
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setToken(null);
    setError(null);
  }, []);

  const retryRestore = useCallback(() => {
    setRestoreAttempt((attempt) => attempt + 1);
  }, []);

  const value = useMemo(
    () => ({ token, isReady, error, signIn, signOut, retryRestore }),
    [token, isReady, error, signIn, signOut, retryRestore],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession phải được dùng bên trong SessionProvider.');
  }
  return context;
}

export function SessionLoadingScreen() {
  return (
    <SafeAreaView style={styles.loadingScreen}>
      <ActivityIndicator size="large" color="#E65E3F" />
      <Text style={styles.loadingText}>Đang kiểm tra phiên đăng nhập...</Text>
    </SafeAreaView>
  );
}

export function SessionRestoreError() {
  const { error, retryRestore } = useSession();

  return (
    <SafeAreaView style={styles.errorScreen}>
      <View style={styles.errorCard}>
        <Text style={styles.errorTitle}>Không thể khôi phục phiên</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text onPress={retryRestore} accessibilityRole="button" style={styles.retryButton}>
          Thử lại
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9F5',
    gap: 12,
  },
  loadingText: {
    color: '#64584F',
    fontSize: 15,
  },
  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFF9F5',
  },
  errorCard: {
    gap: 12,
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    color: '#281C16',
    fontSize: 20,
    fontWeight: '700',
  },
  errorMessage: {
    color: '#64584F',
    fontSize: 15,
    lineHeight: 22,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    color: '#D94F31',
    fontSize: 16,
    fontWeight: '700',
  },
});
