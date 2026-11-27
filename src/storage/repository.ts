import AsyncStorage from '@react-native-async-storage/async-storage';
import { EntityType } from './entities';

const STORAGE_PREFIX = '@waqty/';
export const DEVICE_NAMESPACE = 'device';

/** Payload queued for the cloud. One entry per (table, id), newest wins. */
export interface SyncMutation {
  table: EntityType;
  id: string;
  deleted: boolean;
  updatedAt: string;
  data?: unknown;
}

export type EntitySnapshot = Record<EntityType, unknown[]>;

export const ENTITY_TYPES: readonly EntityType[] = [
  'tasks',
  'goals',
  'plans',
  'recurring_plans',
  'habits',
  'reviews',
  'settings',
  'pomodoros',
  'reminders',
  'notif_settings',
  'weekly_reviews',
  'task_templates',
];

// One in-memory snapshot per (namespace, collection). Every entity write goes
// through a repository, so the snapshot stays in sync without touching
// AsyncStorage on every tab focus. It also keeps object identities stable,
// letting React.memo and useState bail out for unchanged data.
const caches = new Map<string, unknown[]>();
let activeNamespace = DEVICE_NAMESPACE;

function cacheKey(type: EntityType, namespace: string): string {
  return `${namespace}/${type}`;
}

function storageKey(type: EntityType, namespace: string): string {
  // Guest data keeps the original keys so existing installs migrate in place.
  return namespace === DEVICE_NAMESPACE
    ? `${STORAGE_PREFIX}${type}`
    : `${STORAGE_PREFIX}u/${namespace}/${type}`;
}

function mutationKey(namespace: string): string {
  return `${STORAGE_PREFIX}sync_queue/${namespace}`;
}

function mergedKey(userId: string): string {
  return `${STORAGE_PREFIX}cloud_merged/${userId}`;
}

/** Drops cached snapshots after an external restore, sync, or user switch. */
export function invalidateRepositoryCache(type?: EntityType): void {
  if (!type) {
    caches.clear();
    return;
  }
  for (const key of caches.keys()) {
    if (key.endsWith(`/${type}`)) caches.delete(key);
  }
}

// Every AsyncStorage operation (repositories, sync and account switches) goes
// through one queue. Otherwise a pull could overwrite a save that happened
// between its read and its write, or a mutation could be cleared by a stale
// sync pass. Work captures the namespace synchronously, so a queued save can
// never be redirected to an account signed in later.
let storageQueue: Promise<unknown> = Promise.resolve();

export function runStorageExclusive<T>(work: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(work, work);
  storageQueue = result.then(() => undefined, () => undefined);
  return result;
}

function queueWrite<T>(
  type: EntityType,
  work: (namespace: string) => Promise<T>,
  namespaceOverride?: string,
): Promise<T> {
  const namespace = namespaceOverride ?? activeNamespace;
  void type;
  return runStorageExclusive(() => work(namespace));
}

/** Waits for in-flight writes before switching the active account. */
export function waitForRepositoryWrites(): Promise<void> {
  return storageQueue.then(() => undefined, () => undefined);
}

async function preserveCorruptValue(key: string, raw: string): Promise<void> {
  // Never silently turn unreadable data into an empty list: a later write
  // would destroy it permanently. Keep a rescue copy before reporting it.
  await AsyncStorage.setItem(`${STORAGE_PREFIX}corrupt/${key.replace(STORAGE_PREFIX, '')}`, raw);
}

/** Reads every collection directly from AsyncStorage, bypassing caches. */
export async function readNamespaceSnapshotRaw(namespace: string): Promise<EntitySnapshot> {
  const keys = ENTITY_TYPES.map((type) => storageKey(type, namespace));
  const values = await AsyncStorage.getMany(keys);
  const snapshot = {} as EntitySnapshot;
  const corrupt: string[] = [];
  for (const type of ENTITY_TYPES) {
    const key = storageKey(type, namespace);
    const raw = values[key];
    let items: unknown[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('not an array');
        items = parsed;
      } catch {
        await preserveCorruptValue(key, raw);
        corrupt.push(key);
      }
    }
    snapshot[type] = items;
  }
  if (corrupt.length > 0) throw new Error(`Unreadable local data: ${corrupt.join(', ')}`);
  return snapshot;
}

export function readNamespaceSnapshot(namespace: string): Promise<EntitySnapshot> {
  return runStorageExclusive(() => readNamespaceSnapshotRaw(namespace));
}

/** Replaces a namespace atomically from a cloud pull or a device merge. */
export async function writeNamespaceSnapshotRaw(
  namespace: string,
  snapshot: Partial<EntitySnapshot>,
  options?: { mutations?: SyncMutation[] },
): Promise<void> {
  const entries: Record<string, string> = {};
  for (const type of ENTITY_TYPES) {
    const items = snapshot[type];
    if (Array.isArray(items)) entries[storageKey(type, namespace)] = JSON.stringify(items);
  }
  if (Object.keys(entries).length > 0) await AsyncStorage.setMany(entries);
  for (const type of ENTITY_TYPES) caches.delete(cacheKey(type, namespace));
  if (options?.mutations) await setPendingMutations(namespace, options.mutations);
}

export function writeNamespaceSnapshot(
  namespace: string,
  snapshot: Partial<EntitySnapshot>,
  options?: { mutations?: SyncMutation[] },
): Promise<void> {
  return runStorageExclusive(() => writeNamespaceSnapshotRaw(namespace, snapshot, options));
}

/** Selects the account whose AsyncStorage keys repositories read and write. */
async function switchStorageNamespaceRaw(namespace: string | null): Promise<void> {
  activeNamespace = namespace || DEVICE_NAMESPACE;
  caches.clear();
}

export function switchStorageNamespace(namespace: string | null): Promise<void> {
  return runStorageExclusive(() => switchStorageNamespaceRaw(namespace));
}

export function getActiveNamespace(): string {
  return activeNamespace;
}

export async function hasMergedDeviceDataRaw(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(mergedKey(userId))) === '1';
  } catch {
    return false;
  }
}

export function hasMergedDeviceData(userId: string): Promise<boolean> {
  return runStorageExclusive(() => hasMergedDeviceDataRaw(userId));
}

export async function markDeviceDataMergedRaw(userId: string): Promise<void> {
  await AsyncStorage.setItem(mergedKey(userId), '1');
}

export function markDeviceDataMerged(userId: string): Promise<void> {
  return runStorageExclusive(() => markDeviceDataMergedRaw(userId));
}

async function readAll<T>(type: EntityType, namespace: string): Promise<T[]> {
  const key = cacheKey(type, namespace);
  const cached = caches.get(key);
  if (cached) return cached as T[];
  try {
    const raw = await AsyncStorage.getItem(storageKey(type, namespace));
    let items: T[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('not an array');
      items = parsed;
      // Give every persisted row a timestamp so cloud LWW works even for
      // installs created before settings/notifications carried one.
      let migrated = false;
      for (const item of items) {
        if (item && typeof item === 'object' && !entityTimestamp(item)) {
          (item as Record<string, unknown>).updatedAt = new Date().toISOString();
          migrated = true;
        }
      }
      if (migrated) await AsyncStorage.setItem(storageKey(type, namespace), JSON.stringify(items));
    }
    caches.set(key, items);
    return items;
  } catch {
    try {
      const raw = await AsyncStorage.getItem(storageKey(type, namespace));
      if (raw) await preserveCorruptValue(storageKey(type, namespace), raw);
    } catch {
      // Storage may be unavailable entirely; an empty list keeps the app usable.
    }
    caches.set(key, []);
    return [];
  }
}

async function writeAll<T>(type: EntityType, items: T[], namespace: string): Promise<void> {
  const snapshot = items.slice();
  await AsyncStorage.setItem(storageKey(type, namespace), JSON.stringify(snapshot));
  caches.set(cacheKey(type, namespace), snapshot);
}

/** Strict entity timestamp; missing timestamps must not be mistaken for "now". */
export function entityTimestamp(value: unknown): string | null {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const candidate = record.updatedAt ?? record.endedAt ?? record.createdAt;
    if (typeof candidate === 'string' && !Number.isNaN(Date.parse(candidate))) return candidate;
  }
  return null;
}

function timestampOf(value: unknown): string {
  return entityTimestamp(value) ?? new Date().toISOString();
}

function mutationId(table: EntityType, id: string): string {
  return `${table}:${id}`;
}

async function ensureMutations(namespace: string): Promise<Map<string, SyncMutation>> {
  const existing = mutationCache.get(namespace);
  if (existing) return existing;
  const map = new Map<string, SyncMutation>();
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(mutationKey(namespace));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const row of parsed as SyncMutation[]) {
          if (row && typeof row.table === 'string' && typeof row.id === 'string') {
            map.set(mutationId(row.table, row.id), row);
          }
        }
      }
    }
  } catch {
    // Keep the unreadable queue for inspection; local rows are still intact
    // and will be re-queued on the next edit.
    if (raw) await preserveCorruptValue(mutationKey(namespace), raw).catch(() => {});
  }
  mutationCache.set(namespace, map);
  return map;
}

const mutationCache = new Map<string, Map<string, SyncMutation>>();

async function persistMutations(namespace: string, map: Map<string, SyncMutation>): Promise<void> {
  await AsyncStorage.setItem(mutationKey(namespace), JSON.stringify([...map.values()]));
}

/** Reminder rows are derived locally from tasks/settings; never push them. */
function syncable(mutations: SyncMutation[]): SyncMutation[] {
  return mutations.filter((mutation) => mutation.table !== 'reminders');
}

export async function recordMutations(namespace: string, mutations: SyncMutation[]): Promise<void> {
  if (namespace === DEVICE_NAMESPACE) return;
  const rows = syncable(mutations);
  if (rows.length === 0) return;
  const map = await ensureMutations(namespace);
  for (const mutation of rows) map.set(mutationId(mutation.table, mutation.id), mutation);
  await persistMutations(namespace, map);
}

export async function setPendingMutations(namespace: string, mutations: SyncMutation[]): Promise<void> {
  const map = new Map<string, SyncMutation>();
  for (const mutation of syncable(mutations)) {
    map.set(mutationId(mutation.table, mutation.id), mutation);
  }
  mutationCache.set(namespace, map);
  await persistMutations(namespace, map);
}

export const setPendingMutationsRaw = setPendingMutations;

export async function getPendingMutationsRaw(namespace: string): Promise<SyncMutation[]> {
  return [...(await ensureMutations(namespace)).values()];
}

export function getPendingMutations(namespace: string): Promise<SyncMutation[]> {
  return runStorageExclusive(() => getPendingMutationsRaw(namespace));
}

export async function clearMutationsRaw(namespace: string, mutations: SyncMutation[]): Promise<void> {
  const map = await ensureMutations(namespace);
  for (const mutation of mutations) map.delete(mutationId(mutation.table, mutation.id));
  await persistMutations(namespace, map);
}

export function clearMutations(namespace: string, mutations: SyncMutation[]): Promise<void> {
  return runStorageExclusive(() => clearMutationsRaw(namespace, mutations));
}

/** Clears only the exact versions that were pushed; newer local edits survive. */
export async function clearPushedMutationsRaw(namespace: string, mutations: SyncMutation[]): Promise<void> {
  const map = await ensureMutations(namespace);
  let changed = false;
  for (const mutation of mutations) {
    const current = map.get(mutationId(mutation.table, mutation.id));
    if (current && current.updatedAt === mutation.updatedAt) {
      map.delete(mutationId(mutation.table, mutation.id));
      changed = true;
    }
  }
  if (changed) await persistMutations(namespace, map);
}

export function createRepository<T extends { id: string }>(type: EntityType) {
  return {
    async getAll(namespaceOverride?: string): Promise<T[]> {
      return queueWrite(type, (namespace) => readAll<T>(type, namespace), namespaceOverride);
    },

    async getById(id: string, namespaceOverride?: string): Promise<T | null> {
      return queueWrite(type, async (namespace) => {
        const items = await readAll<T>(type, namespace);
        return items.find((item) => item.id === id) ?? null;
      }, namespaceOverride);
    },

    async create(item: T, namespaceOverride?: string): Promise<T> {
      return queueWrite(type, async (namespace) => {
        const items = await readAll<T>(type, namespace);
        if (items.some((existing) => existing.id === item.id)) return item;
        await writeAll(type, [...items, item], namespace);
        await recordMutations(namespace, [{
          table: type,
          id: item.id,
          deleted: false,
          updatedAt: timestampOf(item),
          data: item,
        }]);
        return item;
      }, namespaceOverride);
    },

    /** Persists a batch in one write; existing IDs are left untouched. */
    async createMany(items: T[], namespaceOverride?: string): Promise<T[]> {
      return queueWrite(type, async (namespace) => {
        if (items.length === 0) return [];
        const stored = await readAll<T>(type, namespace);
        const known = new Set(stored.map((item) => item.id));
        const added = items.filter((item) => {
          if (known.has(item.id)) return false;
          known.add(item.id);
          return true;
        });
        if (added.length === 0) return [];
        await writeAll(type, [...stored, ...added], namespace);
        await recordMutations(namespace, added.map((item) => ({
          table: type,
          id: item.id,
          deleted: false,
          updatedAt: timestampOf(item),
          data: item,
        })));
        return added;
      }, namespaceOverride);
    },

    async update(id: string, updates: Partial<T>, namespaceOverride?: string): Promise<T | null> {
      return queueWrite(type, async (namespace) => {
        const items = await readAll<T>(type, namespace);
        const index = items.findIndex((item) => item.id === id);
        if (index === -1) return null;
        const next = items.slice();
        next[index] = {
          ...next[index],
          ...updates,
          id: next[index].id,
          ...('updatedAt' in next[index] ? { updatedAt: new Date().toISOString() } : {}),
        };
        await writeAll(type, next, namespace);
        await recordMutations(namespace, [{
          table: type,
          id,
          deleted: false,
          updatedAt: timestampOf(next[index]),
          data: next[index],
        }]);
        return next[index];
      }, namespaceOverride);
    },

    async delete(id: string, namespaceOverride?: string): Promise<boolean> {
      return queueWrite(type, async (namespace) => {
        const items = await readAll<T>(type, namespace);
        const filtered = items.filter((item) => item.id !== id);
        if (filtered.length === items.length) return false;
        await writeAll(type, filtered, namespace);
        await recordMutations(namespace, [{
          table: type,
          id,
          deleted: true,
          updatedAt: new Date().toISOString(),
        }]);
        return true;
      }, namespaceOverride);
    },

    /** Removes many rows in one write; returns the number actually removed. */
    async deleteMany(ids: string[], namespaceOverride?: string): Promise<number> {
      return queueWrite(type, async (namespace) => {
        if (ids.length === 0) return 0;
        const doomed = new Set(ids);
        const items = await readAll<T>(type, namespace);
        const filtered = items.filter((item) => !doomed.has(item.id));
        const removed = items.length - filtered.length;
        if (removed > 0) {
          await writeAll(type, filtered, namespace);
          await recordMutations(namespace, ids.map((id) => ({
            table: type,
            id,
            deleted: true,
            updatedAt: new Date().toISOString(),
          })));
        }
        return removed;
      }, namespaceOverride);
    },

    async replaceAll(items: T[], namespaceOverride?: string): Promise<void> {
      return queueWrite(type, async (namespace) => {
        const existing = await readAll<T>(type, namespace);
        const snapshot = items.slice();
        await writeAll(type, snapshot, namespace);
        const before = new Map(existing.map((item) => [item.id, item]));
        const after = new Set(snapshot.map((item) => item.id));
        const mutations: SyncMutation[] = existing
          .filter((item) => !after.has(item.id))
          .map((item) => ({
            table: type,
            id: item.id,
            deleted: true,
            updatedAt: new Date().toISOString(),
          }));
        for (const item of snapshot) {
          const previous = before.get(item.id);
          if (previous && JSON.stringify(previous) === JSON.stringify(item)) continue;
          mutations.push({
            table: type,
            id: item.id,
            deleted: false,
            updatedAt: timestampOf(item),
            data: item,
          });
        }
        await recordMutations(namespace, mutations);
      }, namespaceOverride);
    },

    async clear(namespaceOverride?: string): Promise<void> {
      return queueWrite(type, async (namespace) => {
        const existing = await readAll<T>(type, namespace);
        await AsyncStorage.removeItem(storageKey(type, namespace));
        caches.delete(cacheKey(type, namespace));
        await recordMutations(namespace, existing.map((item) => ({
          table: type,
          id: item.id,
          deleted: true,
          updatedAt: new Date().toISOString(),
        })));
      }, namespaceOverride);
    },
  };
}

export type Repository<T extends { id: string }> = ReturnType<typeof createRepository<T>>;

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function todayISODate(): string {
  // Use local date: toISOString() is UTC and gives yesterday's date for the
  // first hours of the day in UTC+ timezones, breaking grouping/reminders.
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
