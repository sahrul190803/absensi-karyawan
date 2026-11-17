import { SecureStorage } from "@aparajita/capacitor-secure-storage";

const TOKEN_KEY = "session_token";
const PREFIX = "hadirku_mobile_";
let ready: Promise<void> | null = null;

function ensureReady() {
  ready ??= SecureStorage.setKeyPrefix(PREFIX).catch(() => undefined);
  return ready;
}

// Keychain on iOS, KeyStore-backed encryption on Android. The web
// implementation uses localStorage and exists only for browser development.
export async function saveSessionToken(token: string) {
  await ensureReady();
  await SecureStorage.set(TOKEN_KEY, token);
}

export async function loadSessionToken(): Promise<string | null> {
  await ensureReady();
  try {
    const value = await SecureStorage.get(TOKEN_KEY);
    return typeof value === "string" && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export async function clearSessionToken() {
  await ensureReady();
  try {
    await SecureStorage.remove(TOKEN_KEY);
  } catch {
    /* already gone */
  }
}

export function getDeviceKey(): string {
  const storageKey = "hadirku_device_key";
  let key = window.localStorage.getItem(storageKey);
  if (!key) {
    key = crypto.randomUUID();
    window.localStorage.setItem(storageKey, key);
  }
  return key;
}
