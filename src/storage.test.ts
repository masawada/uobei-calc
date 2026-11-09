import { describe, expect, it } from 'vitest';
import { loadState, saveState, STORAGE_KEY } from './storage';
import { emptyState, type State } from './tally';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem'> {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

const state: State = {
  counts: { 'にぎり/まぐろ': 2 },
  customs: [{ id: 'custom:330', price: 330, count: 1 }],
};

describe('saveState / loadState', () => {
  it('保存した状態をそのまま読み戻せる', () => {
    const storage = new MemoryStorage();
    saveState(storage, state);
    expect(loadState(storage)).toEqual(state);
  });

  it('何も保存されていなければ空の状態', () => {
    expect(loadState(new MemoryStorage())).toEqual(emptyState);
  });

  it('JSON として壊れていれば空の状態', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{oops');
    expect(loadState(storage)).toEqual(emptyState);
  });

  it('形が合わなければ空の状態', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ counts: [1, 2], customs: 'x' }));
    expect(loadState(storage)).toEqual(emptyState);
  });

  it('個数が正の整数でない品目と、不正なその他行は捨てる', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        counts: { a: 1, b: 0, c: -1, d: 1.5, e: 'x' },
        customs: [
          { id: 'custom:330', price: 330, count: 1 },
          { id: 'custom:0', price: 0, count: 1 },
          { id: 'custom:440', price: 440, count: 0 },
          { price: 550, count: 1 },
        ],
      }),
    );
    expect(loadState(storage)).toEqual({
      counts: { a: 1 },
      customs: [{ id: 'custom:330', price: 330, count: 1 }],
    });
  });

  it('getItem が例外を投げても空の状態', () => {
    const storage = {
      getItem() {
        throw new Error('denied');
      },
      setItem() {},
    };
    expect(loadState(storage)).toEqual(emptyState);
  });

  it('setItem が例外を投げても saveState は例外を投げない', () => {
    const storage = {
      getItem() {
        return null;
      },
      setItem() {
        throw new Error('quota');
      },
    };
    expect(() => saveState(storage, state)).not.toThrow();
  });
});
