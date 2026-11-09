import { describe, expect, it } from 'vitest';
import { loadState, saveState, STORAGE_KEY } from './storage';
import { emptyState, MAX_COUNT, MAX_PRICE, type State } from './tally';

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

  it('個数が正の整数でない品目と、金額や個数が不正なその他行は捨てる', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        counts: { a: 1, b: 0, c: -1, d: 1.5, e: 'x' },
        customs: [
          { id: 'custom:330', price: 330, count: 1 },
          { id: 'custom:0', price: 0, count: 1 },
          { id: 'custom:440', price: 440, count: 0 },
          { id: 'custom:10', price: 10.5, count: 1 },
          { id: 'custom:20', price: '20', count: 1 },
          'not an object',
        ],
      }),
    );
    expect(loadState(storage)).toEqual({
      counts: { a: 1 },
      customs: [{ id: 'custom:330', price: 330, count: 1 }],
    });
  });

  it('その他行の id は保存値を信用せず金額から決め直し、同じ金額は 1 行にまとめる', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        counts: {},
        customs: [
          { id: 'custom:330', price: 440, count: 1 },
          { id: 'whatever', price: 440, count: 2 },
          { id: 'custom:330', price: 330, count: 1 },
        ],
      }),
    );
    expect(loadState(storage)).toEqual({
      counts: {},
      customs: [
        { id: 'custom:440', price: 440, count: 3 },
        { id: 'custom:330', price: 330, count: 1 },
      ],
    });
  });

  it('上限を超える金額・個数と安全でない整数は捨てる(個数は上限で丸める)', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        counts: { a: MAX_COUNT + 1, b: 1e308, c: MAX_COUNT },
        customs: [
          { id: 'x', price: MAX_PRICE + 1, count: 1 },
          { id: 'y', price: 1e308, count: 1 },
          { id: 'z', price: 330, count: MAX_COUNT + 10 },
        ],
      }),
    );
    expect(loadState(storage)).toEqual({
      counts: { a: MAX_COUNT, c: MAX_COUNT },
      customs: [{ id: 'custom:330', price: 330, count: MAX_COUNT }],
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
