import AsyncStorage from '@react-native-async-storage/async-storage';
import { EntityType } from '@/src/storage/entities';
import {
  DEVICE_NAMESPACE,
  ENTITY_TYPES,
  EntitySnapshot,
  SyncMutation,
  clearPushedMutationsRaw,
  entityTimestamp,
  getPendingMutationsRaw,
  hasMergedDeviceDataRaw,
  markDeviceDataMergedRaw,
  readNamespaceSnapshotRaw,
  runStorageExclusive,
  writeNamespaceSnapshotRaw,
} from '@/src/storage/repository';
import { supabase } from './supabase';

interface RemoteRow {
  id: string;
  data: unknown;
  updated_at: string;
  deleted_at: string | null;
}

const LAST_SYNC_KEY = '@waqty/cloud_last_sync/';
const PAGE_SIZE = 500;
const EPOCH = '1970-01-01T00:00:00.000Z';

function idOf(item: unknown): string {
  if (item && typeof item === 'object') {
    const id = (item as Record<string, unknown>).id;
    if (typeof id === 'string') return id;
  }
  return '';
}

function validTimestamp(value: unknown): string | null {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;
}

function timeValue(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Deterministic tie-break: equal timestamps must resolve the same on every device. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(record[key])}`,
    ).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** Native notification ids are device-local and must never reach the cloud. */
function sanitize(table: EntityType, item: unknown): Record<string, unknown> | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const copy = { ...(item as Record<string, unknown>) };
  if (table === 'reminders') delete copy.scheduledId;
  if (typeof copy.id !== 'string') return null;
  return copy;
}

function upsertMutation(table: EntityType, item: unknown): SyncMutation | null {
  const data = sanitize(table, item);
  if (!data) return null;
  const updatedAt = entityTimestamp(data);
  if (!updatedAt) return null;
  return { table, id: data.id as string, deleted: false, updatedAt, data };
}

function snapshotFrom(items: unknown[]): Map<string, unknown> {
  const map = new Map<string, unknown>();
  for (const item of items) {
    const id = idOf(item);
    if (id) map.set(id, item);
  }
  return map;
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

type RemotePayload = {
  user_id: string;
  id: string;
  data: Record<string, unknown>;
  updated_at: string;
  deleted_at: string | null;
};

/** Skips corrupt rows instead of replacing real cloud data with an empty object. */
function toRemotePayload(table: EntityType, mutation: SyncMutation): RemotePayload | null {
  const updatedAt = validTimestamp(mutation.updatedAt);
  if (!updatedAt) return null;
  if (mutation.deleted) {
    return { user_id: '', id: mutation.id, data: {}, updated_at: updatedAt, deleted_at: updatedAt };
  }
  const data = sanitize(table, mutation.data);
  if (!data) return null;
  return { user_id: '', id: mutation.id, data, updated_at: updatedAt, deleted_at: null };
}

/** Pushes queued local edits (including tombstones) using last-write-wins. */
export async function pushPendingChanges(userId: string): Promise<number> {
  if (!supabase) return 0;
  const pending = await runStorageExclusive(() => getPendingMutationsRaw(userId));
  if (pending.length === 0) return 0;

  const sent: SyncMutation[] = [];
  for (const table of ENTITY_TYPES) {
    const rows: RemotePayload[] = [];
    for (const mutation of pending) {
      if (mutation.table !== table) continue;
      const payload = toRemotePayload(table, mutation);
      if (!payload) continue;
      rows.push({ ...payload, user_id: userId });
      sent.push(mutation);
    }

    for (const batch of chunk(rows, PAGE_SIZE)) {
      const { error } = await supabase
        .from(table)
        .upsert(batch, { onConflict: 'user_id,id' });
      if (error) throw new Error(error.message);
    }
  }

  // Only clear the exact versions uploaded. A newer edit made during the
  // network call stays queued for the next sync.
  if (sent.length > 0) {
    await runStorageExclusive(() => clearPushedMutationsRaw(userId, sent));
  }
  return sent.length;
}

async function fetchTable(table: EntityType, userId: string): Promise<RemoteRow[]> {
  if (!supabase) return [];
  const rows: RemoteRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('id,data,updated_at,deleted_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as RemoteRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

export async function fetchRemoteSnapshot(userId: string): Promise<Partial<Record<EntityType, RemoteRow[]>>> {
  const result: Partial<Record<EntityType, RemoteRow[]>> = {};
  for (const table of ENTITY_TYPES) {
    result[table] = await fetchTable(table, userId);
  }
  return result;
}

/** Merges pulled rows into the local snapshot. Newer timestamp wins. */
export function mergeRemoteSnapshot(
  local: EntitySnapshot,
  remote: Partial<Record<EntityType, RemoteRow[]>>,
): { snapshot: EntitySnapshot; changed: boolean } {
  const merged = {} as EntitySnapshot;
  let changed = false;

  for (const table of ENTITY_TYPES) {
    const byId = snapshotFrom(local[table] ?? []);
    for (const row of remote[table] ?? []) {
      if (!row || typeof row.id !== 'string') continue;
      const existing = byId.get(row.id);
      const deleted = Boolean(row.deleted_at);
      const remoteTime = timeValue(deleted ? row.deleted_at ?? undefined : row.updated_at);
      const localTime = existing ? timeValue(entityTimestamp(existing) ?? EPOCH) : 0;

      if (existing && remoteTime < localTime) continue;

      let next: Record<string, unknown> | null = null;
      if (!deleted) {
        const data = sanitize(table, row.data);
        if (!data) continue;
        next = { ...data, id: row.id };
      }

      if (existing && remoteTime === localTime && !deleted) {
        // Equal timestamps need a deterministic order, otherwise two devices
        // disagree about which copy survives. Deletions always win a tie.
        if (stableJson(next) <= stableJson(existing)) continue;
      }

      if (next) {
        if (!existing || stableJson(existing) !== stableJson(next)) changed = true;
        byId.set(row.id, next);
      } else if (existing) {
        byId.delete(row.id);
        changed = true;
      }
    }
    merged[table] = [...byId.values()];
  }

  return { snapshot: merged, changed };
}

/**
 * First login on this device: copy pre-account data into the user namespace.
 * Runs once per account and respects last-write-wins when rows already exist.
 */
export async function mergeDeviceIntoAccount(userId: string): Promise<boolean> {
  // The whole merge is one storage transaction so no save can slip between
  // reading device data and writing the account namespace.
  return runStorageExclusive(async () => {
    if (await hasMergedDeviceDataRaw(userId)) return false;

    const device = await readNamespaceSnapshotRaw(DEVICE_NAMESPACE);
    const current = await readNamespaceSnapshotRaw(userId);
    const merged = {} as EntitySnapshot;
    const mutations: SyncMutation[] = [];

    for (const table of ENTITY_TYPES) {
      // Reminders are regenerated from tasks/settings on every device.
      if (table === 'reminders') {
        merged[table] = current[table] ?? [];
        continue;
      }

      const byId = snapshotFrom(current[table] ?? []);
      for (const item of device[table] ?? []) {
        const id = idOf(item);
        if (!id) continue;
        const existing = byId.get(id);
        const deviceTime = timeValue(entityTimestamp(item) ?? EPOCH);
        const existingTime = existing ? timeValue(entityTimestamp(existing) ?? EPOCH) : 0;
        if (existing && existingTime >= deviceTime) continue;
        const data = sanitize(table, item);
        if (!data) continue;
        byId.set(id, data);
        const mutation = upsertMutation(table, data);
        if (mutation) mutations.push(mutation);
      }
      merged[table] = [...byId.values()];
    }

    await writeNamespaceSnapshotRaw(userId, merged, { mutations });
    await markDeviceDataMergedRaw(userId);
    return mutations.length > 0;
  });
}

export async function getLastSync(userId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_SYNC_KEY + userId);
  } catch {
    return null;
  }
}

/** Full bidirectional sync. Called on login and when the app returns. */
export async function syncAccount(userId: string): Promise<{ changed: boolean; pushed: number; pulled: number }> {
  if (!supabase) return { changed: false, pushed: 0, pulled: 0 };

  // Never merge a pull over edits that have not reached the server yet.
  const pushed = await pushPendingChanges(userId);
  const remote = await fetchRemoteSnapshot(userId);

  const changedLocally = await runStorageExclusive(async () => {
    const local = await readNamespaceSnapshotRaw(userId);
    const merged = mergeRemoteSnapshot(local, remote);
    await writeNamespaceSnapshotRaw(userId, merged.snapshot, {
      // Changes made while the network call was running are still queued.
      mutations: await getPendingMutationsRaw(userId),
    });
    await AsyncStorage.setItem(LAST_SYNC_KEY + userId, new Date().toISOString());
    return merged.changed;
  });

  const pulled = ENTITY_TYPES.reduce((sum, table) => sum + (remote[table]?.length ?? 0), 0);
  return { changed: changedLocally || pushed > 0, pushed, pulled };
}

/** Lets screens import the list without reaching into storage internals. */
export { ENTITY_TYPES };
