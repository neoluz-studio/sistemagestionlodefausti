const ACCESS = 'lf_access_token';
const REFRESH = 'lf_refresh_token';
const USER = 'lf_user';
const STORE = 'lf_store';

export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS);
}

export function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS, accessToken);
  localStorage.setItem(REFRESH, refreshToken);
  document.cookie = `lf_session=1; Path=/; SameSite=Lax`;
}

export function clearTokens() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem(USER);
  localStorage.removeItem(STORE);
  document.cookie = 'lf_session=; Max-Age=0; Path=/; SameSite=Lax';
}

export function setUserState(user: unknown, store: unknown) {
  localStorage.setItem(USER, JSON.stringify(user));
  localStorage.setItem(STORE, JSON.stringify(store));
}

export function getUserState<T>() {
  const raw = localStorage.getItem(USER);
  return raw ? (JSON.parse(raw) as T) : null;
}
