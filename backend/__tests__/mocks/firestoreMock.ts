/**
* In-memory Firestore stub used by backend test suites.
*
* Only the subset of the `@google-cloud/firestore` API surface that the codebase
* touches is implemented – enough for reads/writes performed by `db.ts`.
*
* The mock is automatically registered with Jest via `jest.unstable_mockModule`
* at module load time, so *importing this file must happen before* any code
* that transitively imports `@google-cloud/firestore` (e.g. `db.ts`).
*/

import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/** Produces a short random string suitable for fake document IDs. */
export const randomId = (): string => Math.random().toString(36).slice(2, 10);

// ---------------------------------------------------------------------------
// Timestamp shim – only `now()` and `toDate()` are used by the code under test.
// ---------------------------------------------------------------------------

export class MockTimestamp {
  private readonly _date: Date;

  private constructor(date: Date) {
    this._date = date;
  }

  static now(): MockTimestamp {
    return new MockTimestamp(new Date());
  }

  toDate(): Date {
    return this._date;
  }
}

// ---------------------------------------------------------------------------
// Firestore primitives – DocSnapshot, QuerySnapshot, DocumentReference, etc.
// ---------------------------------------------------------------------------

export class MockDocSnapshot {
  constructor(public readonly id: string, private readonly _data: any) {}

  get exists(): boolean {
    return this._data !== undefined;
  }

  data(): any {
    return this._data;
  }
}

export class MockQuerySnapshot {
  constructor(public readonly docs: MockDocSnapshot[]) {}
}

// Forward declaration – defined later because of circular reference.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export class MockCollection {
  /** Map<docId, data> */
  readonly store = new Map<string, any>();

  doc(id: string) {
    return new MockDocRef(this, id);
  }

  /** `.add()` behaves like Firestore's – generates a random ID and returns a DocRef. */
  async add(data: any) {
    const id = randomId();
    this.store.set(id, data);
    return new MockDocRef(this, id);
  }

  /** `.where()` always starts a brand-new query. */
  where(field: string, op: string, value: any): MockQuery {
    return new MockQuery(this).where(field, op, value);
  }

  /**
   * `.orderBy()` in the real driver returns a *new* `Query` that carries over
   * previously-applied filters. The implementation here mirrors that by
   * instantiating a single `MockQuery` and applying `.orderBy()` on it.
   */
  orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): MockQuery {
    return new MockQuery(this).orderBy(field, dir);
  }

  /** Same story for `.limit()` – it returns a Query derived from this collection. */
  limit(n: number): MockQuery {
    return new MockQuery(this).limit(n);
  }
}

export class MockDocRef {
  constructor(private readonly collection: MockCollection, public readonly id: string) {}

  async set(data: any) {
    this.collection.store.set(this.id, data);
  }

  async get(): Promise<MockDocSnapshot> {
    return new MockDocSnapshot(this.id, this.collection.store.get(this.id));
  }
}

export class MockQuery {
  private readonly _filters: Array<{ field: string; op: string; value: any }> = [];
  private _order: { field: string; dir: 'asc' | 'desc' } | undefined;
  private _limit: number | undefined;

  constructor(private readonly collection: MockCollection) {}

  // -------------------------------------------------------------------------
  // Builder methods – each mutates *this* and returns it so we maintain the
  // same instance across a call chain (orderBy().limit(), etc.).
  // -------------------------------------------------------------------------

  where(field: string, op: string, value: any): MockQuery {
    this._filters.push({ field, op, value });
    return this;
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): MockQuery {
    this._order = { field, dir };
    return this;
  }

  limit(n: number): MockQuery {
    this._limit = n;
    return this;
  }

  // -------------------------------------------------------------------------
  // Execution
  // -------------------------------------------------------------------------

  async get(): Promise<MockQuerySnapshot> {
    let docs: Array<[string, any]> = [...this.collection.store.entries()];

    // Apply equality filters (the only op used by the codebase).
    for (const f of this._filters) {
      if (f.op !== '==') continue; // Unsupported ops are ignored for now.
      docs = docs.filter(([, data]) => data?.[f.field] === f.value);
    }

    // Apply ordering.
    if (this._order) {
      const { field, dir } = this._order;
      docs.sort(([, a], [, b]) => {
        const av = field === '__name__' ? '' : a[field];
        const bv = field === '__name__' ? '' : b[field];
        if (av === bv) return 0;
        return av < bv ? (dir === 'asc' ? -1 : 1) : dir === 'asc' ? 1 : -1;
      });
    }

    // Apply limit.
    if (this._limit !== undefined) docs = docs.slice(0, this._limit);

    return new MockQuerySnapshot(docs.map(([id, data]) => new MockDocSnapshot(id, data)));
  }
}

// ---------------------------------------------------------------------------
// Top-level Firestore shim
// ---------------------------------------------------------------------------

export class MockFirestore {
  private readonly _collections = new Map<string, MockCollection>();

  collection(name: string): MockCollection {
    let col = this._collections.get(name);
    if (!col) {
      col = new MockCollection();
      this._collections.set(name, col);
    }
    return col;
  }

  /** Purges *all* data – handy for `beforeEach` isolation. */
  clear(): void {
    for (const col of this._collections.values()) col.store.clear();
  }
}

// ---------------------------------------------------------------------------
// Jest module factory registration
// ---------------------------------------------------------------------------

// The cast is needed because jest types might not include `unstable_mockModule`
// in older versions; it's safe in our test context.
(jest as any).unstable_mockModule('@google-cloud/firestore', () => ({
  __esModule: true,
  Firestore: MockFirestore,
  Timestamp: MockTimestamp,
}));

// ---------------------------------------------------------------------------
// Jest sees this file as a test suite because it lives under `__tests__`. Add
// a single no-op test so the runner doesn't complain about "no tests found".
// ---------------------------------------------------------------------------

import { describe, it } from '@jest/globals';

describe('firestoreMock helper', () => {
  it('loads without crashing', () => {
    // noop – the purpose of this suite is solely to satisfy Jest’s "at least
    // one test" requirement for files inside __tests__.
  });
});

