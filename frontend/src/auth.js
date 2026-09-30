// Remembers who is logged in on this browser (token + a copy of the account).
const KEY = "pickle_auth";

export function getAuth() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY));
    return a && a.token ? a : null;
  } catch {
    return null;
  }
}

export function saveAuth(token, account) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, account }));
  } catch {
    // storage blocked — login just won't persist
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
