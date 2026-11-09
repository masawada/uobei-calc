import type { MenuItem, StoreMenu } from './menu';

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

function customId(price: number): string {
  return `custom:${price}`;
}

function isValidPrice(price: number): boolean {
  return Number.isInteger(price) && price > 0;
}

function changeCustom(customs: CustomEntry[], id: string, delta: number): CustomEntry[] {
  return customs
    .map((c) => (c.id === id ? { ...c, count: c.count + delta } : c))
    .filter((c) => c.count > 0);
}

export function reduce(state: State, action: Action): State {
  switch (action.type) {
    case 'increment': {
      const current = state.counts[action.key] ?? 0;
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
      const id = customId(action.price);
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
