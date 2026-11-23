import AsyncStorage from '@react-native-async-storage/async-storage';
import { EntityType } from './entities';

const STORAGE_PREFIX = '@waqty/';

// AsyncStorage repositories do read-modify-write. Without serialization, a
// quick create followed by delete (or vice versa) can interleave and bring a
// deleted task back. Queue every access per entity type so reads always see
// the latest committed write.
const queues = new Map<EntityType, Promise<unknown>>();

function queueWrite<T>(type: EntityType, work: () => Promise<T>): Promise<T> {
  const previous = queues.get(type) ?? Promise.resolve();
  const result = previous.then(work, work);
  queues.set(type, result.catch(() => undefined));
  return result;
}

function key(type: EntityType): string {
  return `${STORAGE_PREFIX}${type}`;
}

async function readAll<T>(type: EntityType): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key(type));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll<T>(type: EntityType, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key(type), JSON.stringify(items));
}

export function createRepository<T extends { id: string }>(type: EntityType) {
  return {
    async getAll(): Promise<T[]> {
      return queueWrite(type, () => readAll<T>(type));
    },

    async getById(id: string): Promise<T | null> {
      return queueWrite(type, async () => {
        const items = await readAll<T>(type);
        return items.find((item) => item.id === id) ?? null;
      });
    },

    async create(item: T): Promise<T> {
      return queueWrite(type, async () => {
        const items = await readAll<T>(type);
        if (items.some((existing) => existing.id === item.id)) return item;
        items.push(item);
        await writeAll(type, items);
        return item;
      });
    },

    async update(id: string, updates: Partial<T>): Promise<T | null> {
      return queueWrite(type, async () => {
        const items = await readAll<T>(type);
        const index = items.findIndex((item) => item.id === id);
        if (index === -1) return null;
        items[index] = {
          ...items[index],
          ...updates,
          id: items[index].id,
          ...('updatedAt' in items[index] ? { updatedAt: new Date().toISOString() } : {}),
        };
        await writeAll(type, items);
        return items[index];
      });
    },

    async delete(id: string): Promise<boolean> {
      return queueWrite(type, async () => {
        const items = await readAll<T>(type);
        const filtered = items.filter((item) => item.id !== id);
        if (filtered.length === items.length) return false;
        await writeAll(type, filtered);
        return true;
      });
    },

    async replaceAll(items: T[]): Promise<void> {
      return queueWrite(type, () => writeAll(type, items));
    },

    async clear(): Promise<void> {
      return queueWrite(type, () => AsyncStorage.removeItem(key(type)));
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
