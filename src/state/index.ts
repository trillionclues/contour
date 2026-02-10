// State Manager - In-memory store for stateful mode

import { v4 as uuidv4 } from 'uuid';

interface StoreItem {
    id: string;
    [key: string]: unknown;
}

type Store = Map<string, StoreItem[]>;

const stores = new Map<string, Store>();

function getStore(path: string): StoreItem[] {
    // Normalize path: connect related endpoints (collection & item)
    // /users -> /users
    // /users/{id} -> /users
    // /api/v1/users/{id} -> /api/v1/users
    // Remove parameters: /{param} -> empty string
    const key = path.replace(/\/\{[^}]+\}/g, '').replace(/\/$/, '') || '/';

    if (!stores.has('default')) {
        stores.set('default', new Map());
    }

    const store = stores.get('default')!;

    if (!store.has(key)) {
        store.set(key, []);
    }

    return store.get(key)!;
}

export const stateManager = {
    // get all items from a collection
    getAll(path: string): StoreItem[] {
        return getStore(path);
    },

    // get item by ID
    getById(path: string, id: string): StoreItem | undefined {
        const items = getStore(path);
        return items.find((item) => item.id === id);
    },

    create(path: string, data: Record<string, unknown>): StoreItem {
        const items = getStore(path);
        const newItem: StoreItem = {
            id: uuidv4(),
            ...data,
            createdAt: new Date().toISOString(),
        };
        items.push(newItem);
        return newItem;
    },

    update(
        path: string,
        id: string,
        data: Record<string, unknown>
    ): StoreItem | undefined {
        const items = getStore(path);
        const index = items.findIndex((item) => item.id === id);

        if (index === -1) {
            return undefined;
        }

        items[index] = {
            ...items[index],
            ...data,
            id,
            updatedAt: new Date().toISOString(),
        };

        return items[index];
    },

    delete(path: string, id: string): boolean {
        const items = getStore(path);
        const index = items.findIndex((item) => item.id === id);

        if (index === -1) {
            return false;
        }

        items.splice(index, 1);
        return true;
    },

    // seed collection with initial data
    seed(path: string, items: StoreItem[]): void {
        const key = path.replace(/\/\{[^}]+\}/g, '').replace(/\/$/, '') || '/';

        if (!stores.has('default')) {
            stores.set('default', new Map());
        }

        stores.get('default')!.set(key, [...items]);
    },

    clear(): void {
        stores.clear();
    },

    // get stats
    stats(): Record<string, number> {
        const result: Record<string, number> = {};

        if (stores.has('default')) {
            for (const [key, items] of stores.get('default')!.entries()) {
                result[key] = items.length;
            }
        }

        return result;
    },
};
