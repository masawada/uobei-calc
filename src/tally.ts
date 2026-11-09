import type { MenuItem, StoreMenu } from './menu';

/** 「その他」で入力できる金額の上限(円)。桁の打ち間違いを弾くための現実的な値。 */
export const MAX_PRICE = 100_000;
/** 1 品目あたりの個数の上限。 */
export const MAX_COUNT = 999;

/** 「その他」で追加した任意金額の行。金額ごとに 1 行にまとめる。 */
export type CustomEntry = {
  id: string;
  price: number;
  count: number;
};

export type State = {
  /** itemKey → 個数。0 の品目は持たない。 */
  counts: Record<string, number>;
  customs: CustomEntry[];
};

export const emptyState: State = { counts: {}, customs: [] };

export type Action =
  | { type: 'increment'; key: string }
  | { type: 'decrement'; key: string }
  | { type: 'addCustom'; price: number }
  | { type: 'incrementCustom'; id: string }
  | { type: 'decrementCustom'; id: string }
  | { type: 'clear' };

export function itemKey(item: Pick<MenuItem, 'category' | 'name'>): string {
  return `${item.category}/${item.name}`;
}

export function customIdFor(price: number): string {
  return `custom:${price}`;
}

export function isValidPrice(price: number): boolean {
  return Number.isSafeInteger(price) && price > 0 && price <= MAX_PRICE;
}

function changeCustom(customs: CustomEntry[], id: string, delta: number): CustomEntry[] {
  return customs
    .map((c) => (c.id === id ? { ...c, count: Math.min(c.count + delta, MAX_COUNT) } : c))
    .filter((c) => c.count > 0);
}

export function reduce(state: State, action: Action): State {
  switch (action.type) {
    case 'increment': {
      const current = state.counts[action.key] ?? 0;
      if (current >= MAX_COUNT) return state;
      return { ...state, counts: { ...state.counts, [action.key]: current + 1 } };
    }
    case 'decrement': {
      const current = state.counts[action.key] ?? 0;
      if (current <= 1) {
        const { [action.key]: _removed, ...rest } = state.counts;
        return { ...state, counts: rest };
      }
      return { ...state, counts: { ...state.counts, [action.key]: current - 1 } };
    }
    case 'addCustom': {
      if (!isValidPrice(action.price)) return state;
      const id = customIdFor(action.price);
      if (state.customs.some((c) => c.id === id)) {
        return { ...state, customs: changeCustom(state.customs, id, 1) };
      }
      return { ...state, customs: [...state.customs, { id, price: action.price, count: 1 }] };
    }
    case 'incrementCustom':
      return { ...state, customs: changeCustom(state.customs, action.id, 1) };
    case 'decrementCustom':
      return { ...state, customs: changeCustom(state.customs, action.id, -1) };
    case 'clear':
      return emptyState;
  }
}

/** メニューから消えた品目の個数を捨てる。捨てるものが無ければ同じ state を返す。 */
export function pruneUnknownItems(state: State, menu: StoreMenu): State {
  const known = new Set(menu.items.map(itemKey));
  const stale = Object.keys(state.counts).filter((key) => !known.has(key));
  if (stale.length === 0) return state;
  const counts = { ...state.counts };
  for (const key of stale) delete counts[key];
  return { ...state, counts };
}

export type BreakdownLine = {
  label: string;
  unitPrice: number;
  count: number;
  subtotal: number;
};

/** 個数 1 以上の品目をメニュー順に並べ、その他を末尾に付ける。メニューに無い品目は無視する。 */
export function breakdown(state: State, menu: StoreMenu): BreakdownLine[] {
  const lines: BreakdownLine[] = [];
  for (const item of menu.items) {
    const count = state.counts[itemKey(item)] ?? 0;
    if (count > 0) {
      lines.push({ label: item.name, unitPrice: item.price, count, subtotal: item.price * count });
    }
  }
  for (const c of state.customs) {
    lines.push({ label: 'その他', unitPrice: c.price, count: c.count, subtotal: c.price * c.count });
  }
  return lines;
}

export function total(state: State, menu: StoreMenu): number {
  return breakdown(state, menu).reduce((sum, line) => sum + line.subtotal, 0);
}
