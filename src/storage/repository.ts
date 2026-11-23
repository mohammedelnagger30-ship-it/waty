import AsyncStorage from '@react-native-async-storage/async-storage';
import { EntityType } from './entities';

const STORAGE_PREFIX = '@waqty/';

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
      return readAll<T>(type);
    },

    async getById(id: string): Promise<T | null> {
      const items = await readAll<T>(type);
      return items.find((item) => item.id === id) ?? null;
    },

    async create(item: T): Promise<T> {
      const items = await readAll<T>(type);
      items.push(item);
      await writeAll(type, items);
      return item;
    },

    async update(id: string, updates: Partial<T>): Promise<T | null> {
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
    },

    async delete(id: string): Promise<boolean> {
      const items = await readAll<T>(type);
      const filtered = items.filter((item) => item.id !== id);
      if (filtered.length === items.length) return false;
      await writeAll(type, filtered);
      return true;
    },

    async replaceAll(items: T[]): Promise<void> {
      await writeAll(type, items);
    },

    async clear(): Promise<void> {
      await AsyncStorage.removeItem(key(type));
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
  return new Date().toISOString().split('T')[0];
}
