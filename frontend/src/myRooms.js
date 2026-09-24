// Remembers the rooms this browser has created / joined / opened, so the
// Home page can show a "Your Rooms" list. Only lives in this browser's
// localStorage — the rooms themselves stay in the database.

const KEY = "pickle_my_rooms";
const MAX_ROOMS = 10;

function read() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // storage full or blocked — the list just won't persist
  }
}

// Most recently visited first
export function getMyRooms() {
  return read().sort((a, b) => (b.lastVisited || 0) - (a.lastVisited || 0));
}

export function findMyRoom(code) {
  return read().find((r) => r.code === code);
}

// entry: { code, title, role: "host" | "guest", name?, playerId? }
// Merges with what is already saved, so playerId/name aren't lost when the
// dashboard re-saves the room later.
export function saveMyRoom(entry) {
  const list = read();
  const existing = list.find((r) => r.code === entry.code);
  const merged = { ...existing, ...entry, lastVisited: Date.now() };
  const next = [merged, ...list.filter((r) => r.code !== entry.code)];
  write(next.slice(0, MAX_ROOMS));
}

// Only removes it from the list. The host token (host_<CODE>) is kept, so a
// host can still open the room by its link/code and stay host.
export function removeMyRoom(code) {
  write(read().filter((r) => r.code !== code));
}
