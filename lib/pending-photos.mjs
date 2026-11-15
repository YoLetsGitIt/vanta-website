// A client's reference photos wait in the browser while they pay for an instant booking,
// and are uploaded once the payment has made the booking. Kept in IndexedDB (photos are
// too big for localStorage), under the checkout they belong to, for a day at most.

const DB_NAME = 'vanta-booking';
const STORE = 'pending-photos';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function open() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB unavailable'));
  });
}

function run(mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const out = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(out?.result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error || new Error('IndexedDB failed')); };
  }));
}

// Whether photos can be kept in this browser (not in some private modes).
export async function canKeepPhotos() {
  try {
    await run('readwrite', store => store.put({ at: Date.now(), files: [] }, '__probe'));
    await run('readwrite', store => store.delete('__probe'));
    return true;
  } catch {
    return false;
  }
}

// files: File/Blob objects. artistId: whose booking the uploads are signed for.
export function keepPhotos(key, artistId, files) {
  const entry = { at: Date.now(), artistId, files: files.map(f => ({ blob: f, type: f.type, size: f.size, name: f.name || 'photo' })) };
  return run('readwrite', store => store.put(entry, key));
}

// The photos kept for a checkout, or null.
export async function keptPhotos(key) {
  try {
    const entry = await run('readonly', store => store.get(key));
    if (!entry || Date.now() - entry.at > MAX_AGE_MS || !entry.files?.length) return null;
    const files = entry.files.map(f => {
      const blob = f.blob;
      try { return new File([blob], f.name, { type: f.type }); } catch { return blob; }
    });
    return { artistId: entry.artistId, files };
  } catch {
    return null;
  }
}

export function forgetPhotos(key) {
  return run('readwrite', store => store.delete(key)).catch(() => {});
}
