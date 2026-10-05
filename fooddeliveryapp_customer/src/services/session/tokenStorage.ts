import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'customer.auth.session';

export interface StoredSession {
  token: string;
  expiresAt: number;
}

function getWebStorage(): Storage {
  if (typeof globalThis.localStorage === 'undefined') {
    throw new Error('Trình duyệt hiện không hỗ trợ lưu phiên đăng nhập.');
  }

  return globalThis.localStorage;
}

async function readValue(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return getWebStorage().getItem(SESSION_KEY);
  }
  return SecureStore.getItemAsync(SESSION_KEY);
}

async function writeValue(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    getWebStorage().setItem(SESSION_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, value);
}

async function removeValue(): Promise<void> {
  if (Platform.OS === 'web') {
    getWebStorage().removeItem(SESSION_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function readSession(): Promise<StoredSession | null> {
  const serializedSession = await readValue();
  if (serializedSession === null) {
    return null;
  }

  let session: unknown;
  try {
    session = JSON.parse(serializedSession);
  } catch {
    await removeValue();
    throw new Error('Phiên đăng nhập lưu trên thiết bị không hợp lệ. Hãy thử lại.');
  }

  if (
    typeof session !== 'object' ||
    session === null ||
    !('token' in session) ||
    typeof session.token !== 'string' ||
    session.token.length === 0 ||
    !('expiresAt' in session) ||
    typeof session.expiresAt !== 'number' ||
    !Number.isFinite(session.expiresAt)
  ) {
    await removeValue();
    throw new Error('Phiên đăng nhập lưu trên thiết bị không hợp lệ. Hãy thử lại.');
  }

  if (session.expiresAt <= Date.now()) {
    await removeValue();
    return null;
  }

  return { token: session.token, expiresAt: session.expiresAt };
}

export async function saveSession(token: string, expiresIn: number): Promise<void> {
  if (!token || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error('Không thể lưu phiên đăng nhập với dữ liệu không hợp lệ.');
  }

  const session: StoredSession = {
    token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  await writeValue(JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await removeValue();
}
