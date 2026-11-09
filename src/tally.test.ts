import { describe, expect, it } from 'vitest';
import type { StoreMenu } from './menu';
import {
  breakdown,
  emptyState,
  itemKey,
  MAX_COUNT,
  MAX_PRICE,
  pruneUnknownItems,
  reduce,
  total,
  type State,
} from './tally';

const menu: StoreMenu = {
  store: 'テスト店',
  updatedAt: '2026-11-09',
  source: 'https://example.com/menu',
  items: [
    { category: 'にぎり', name: 'まぐろ', price: 110 },
    { category: 'にぎり', name: 'サーモン', price: 110 },
    { category: 'サイド', name: 'あおさ汁', price: 165 },
  ],
};

const maguro = itemKey({ category: 'にぎり', name: 'まぐろ' });
const salmon = itemKey({ category: 'にぎり', name: 'サーモン' });
const soup = itemKey({ category: 'サイド', name: 'あおさ汁' });

const apply = (actions: Parameters<typeof reduce>[1][], from: State = emptyState) =>
  actions.reduce(reduce, from);

describe('itemKey', () => {
  it('カテゴリと品名の組で一意になる', () => {
    expect(itemKey({ category: 'にぎり', name: 'まぐろ' })).toBe('にぎり/まぐろ');
    expect(itemKey({ category: 'にぎり', name: 'まぐろ' })).not.toBe(itemKey({ category: 'サイド', name: 'まぐろ' }));
  });
});

describe('reduce: メニュー品目の個数', () => {
  it('increment で 0 から 1 になる', () => {
    const s = apply([{ type: 'increment', key: maguro }]);
    expect(s.counts).toEqual({ [maguro]: 1 });
  });

  it('increment を重ねると加算される', () => {
    const s = apply([
      { type: 'increment', key: maguro },
      { type: 'increment', key: maguro },
      { type: 'increment', key: salmon },
    ]);
    expect(s.counts).toEqual({ [maguro]: 2, [salmon]: 1 });
  });

  it('decrement で 1 から 0 になると個数の記録が消える', () => {
    const s = apply([{ type: 'increment', key: maguro }, { type: 'decrement', key: maguro }]);
    expect(s.counts).toEqual({});
  });

  it('0 の品目を decrement しても負にならない', () => {
    const s = apply([{ type: 'decrement', key: maguro }]);
    expect(s.counts).toEqual({});
  });

  it('個数は上限 MAX_COUNT で止まる', () => {
    const s = apply(Array.from({ length: MAX_COUNT + 5 }, () => ({ type: 'increment' as const, key: maguro })));
    expect(s.counts[maguro]).toBe(MAX_COUNT);
  });

  it('状態オブジェクトを破壊的に変更しない', () => {
    const before = apply([{ type: 'increment', key: maguro }]);
    const snapshot = structuredClone(before);
    reduce(before, { type: 'increment', key: maguro });
    expect(before).toEqual(snapshot);
  });
});

describe('reduce: その他(任意金額)', () => {
  it('addCustom で金額付きの行が個数 1 で追加される', () => {
    const s = apply([{ type: 'addCustom', price: 330 }]);
    expect(s.customs).toHaveLength(1);
    expect(s.customs[0]).toMatchObject({ price: 330, count: 1 });
    expect(typeof s.customs[0]?.id).toBe('string');
  });

  it('同じ金額を追加すると既存の行の個数が増える', () => {
    const s = apply([{ type: 'addCustom', price: 330 }, { type: 'addCustom', price: 330 }]);
    expect(s.customs).toHaveLength(1);
    expect(s.customs[0]?.count).toBe(2);
  });

  it('違う金額は別の行になる', () => {
    const s = apply([{ type: 'addCustom', price: 330 }, { type: 'addCustom', price: 440 }]);
    expect(s.customs.map((c) => c.price)).toEqual([330, 440]);
  });

  it('0 以下・整数でない・上限超え・安全でない整数の金額は無視する', () => {
    const s = apply([
      { type: 'addCustom', price: 0 },
      { type: 'addCustom', price: -10 },
      { type: 'addCustom', price: 10.5 },
      { type: 'addCustom', price: Number.NaN },
      { type: 'addCustom', price: MAX_PRICE + 1 },
      { type: 'addCustom', price: 1e308 },
      { type: 'addCustom', price: Number.MAX_SAFE_INTEGER + 2 },
    ]);
    expect(s.customs).toEqual([]);
  });

  it('上限ちょうどの金額は受け付ける', () => {
    const s = apply([{ type: 'addCustom', price: MAX_PRICE }]);
    expect(s.customs[0]?.price).toBe(MAX_PRICE);
  });

  it('その他の個数も上限 MAX_COUNT で止まる', () => {
    const added = apply([{ type: 'addCustom', price: 330 }]);
    const id = added.customs[0]!.id;
    const s = apply(Array.from({ length: MAX_COUNT + 5 }, () => ({ type: 'incrementCustom' as const, id })), added);
    expect(s.customs[0]?.count).toBe(MAX_COUNT);
  });

  it('incrementCustom / decrementCustom で個数が増減し、0 になると行が消える', () => {
    const added = apply([{ type: 'addCustom', price: 330 }]);
    const id = added.customs[0]!.id;
    const up = reduce(added, { type: 'incrementCustom', id });
    expect(up.customs[0]?.count).toBe(2);
    const down = apply([{ type: 'decrementCustom', id }, { type: 'decrementCustom', id }], up);
    expect(down.customs).toEqual([]);
  });

  it('存在しない id の increment/decrement は何もしない', () => {
    const s = apply([{ type: 'incrementCustom', id: 'nope' }, { type: 'decrementCustom', id: 'nope' }]);
    expect(s).toEqual(emptyState);
  });
});

describe('reduce: clear', () => {
  it('品目もその他もすべて消える', () => {
    const s = apply([
      { type: 'increment', key: maguro },
      { type: 'addCustom', price: 330 },
      { type: 'clear' },
    ]);
    expect(s).toEqual(emptyState);
  });
});

describe('pruneUnknownItems', () => {
  it('メニューに無い品目の個数を捨て、ある品目とその他は残す', () => {
    const s = apply([
      { type: 'increment', key: 'にぎり/廃盤ネタ' },
      { type: 'increment', key: maguro },
      { type: 'addCustom', price: 330 },
    ]);
    expect(pruneUnknownItems(s, menu)).toEqual({
      counts: { [maguro]: 1 },
      customs: [{ id: 'custom:330', price: 330, count: 1 }],
    });
  });

  it('捨てるものが無ければ同じオブジェクトを返す', () => {
    const s = apply([{ type: 'increment', key: maguro }]);
    expect(pruneUnknownItems(s, menu)).toBe(s);
  });
});

describe('total', () => {
  it('空なら 0', () => {
    expect(total(emptyState, menu)).toBe(0);
  });

  it('個数 × 単価の合計にその他を足す', () => {
    const s = apply([
      { type: 'increment', key: maguro },
      { type: 'increment', key: maguro },
      { type: 'increment', key: soup },
      { type: 'addCustom', price: 330 },
    ]);
    expect(total(s, menu)).toBe(110 * 2 + 165 + 330);
  });

  it('メニューから消えた品目の個数は合計に含めない', () => {
    const s = apply([{ type: 'increment', key: 'にぎり/廃盤ネタ' }, { type: 'increment', key: maguro }]);
    expect(total(s, menu)).toBe(110);
  });
});

describe('breakdown', () => {
  it('個数 1 以上の品目だけをメニュー順に並べ、その他を末尾に付ける', () => {
    const s = apply([
      { type: 'addCustom', price: 330 },
      { type: 'increment', key: soup },
      { type: 'increment', key: maguro },
      { type: 'increment', key: maguro },
    ]);
    expect(breakdown(s, menu)).toEqual([
      { label: 'まぐろ', unitPrice: 110, count: 2, subtotal: 220 },
      { label: 'あおさ汁', unitPrice: 165, count: 1, subtotal: 165 },
      { label: 'その他', unitPrice: 330, count: 1, subtotal: 330 },
    ]);
  });

  it('メニューから消えた品目は内訳にも出ない', () => {
    const s = apply([{ type: 'increment', key: 'にぎり/廃盤ネタ' }]);
    expect(breakdown(s, menu)).toEqual([]);
  });
});
