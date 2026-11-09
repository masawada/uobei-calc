import { customIdFor, emptyState, isValidPrice, MAX_COUNT, type CustomEntry, type State } from './tally';

export const STORAGE_KEY = 'uobei-calc:state:v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 保存された個数を検証し、上限で丸める。使えない値は null。 */
function sanitizeCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return null;
  return Math.min(value, MAX_COUNT);
}

function sanitizeCounts(raw: unknown): Record<string, number> | null {
  if (!isRecord(raw)) return null;
  const counts: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    const count = sanitizeCount(value);
    if (count !== null) counts[key] = count;
  }
  return counts;
}

/** id は保存値を信用せず金額から決め直し、同じ金額の行は 1 つにまとめる。 */
function sanitizeCustoms(raw: unknown): CustomEntry[] | null {
  if (!Array.isArray(raw)) return null;
  const byPrice = new Map<number, CustomEntry>();
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const { price } = entry;
    const count = sanitizeCount(entry['count']);
    if (typeof price !== 'number' || !isValidPrice(price) || count === null) continue;
    const existing = byPrice.get(price);
    if (existing) existing.count = Math.min(existing.count + count, MAX_COUNT);
    else byPrice.set(price, { id: customIdFor(price), price, count });
  }
  return [...byPrice.values()];
}

/** 保存された状態を読む。無い・壊れている・形が違う場合は空の状態を返す。 */
export function loadState(storage: StorageLike): State {
  let raw: unknown;
  try {
    const text = storage.getItem(STORAGE_KEY);
    if (text === null) return emptyState;
    raw = JSON.parse(text);
  } catch {
    return emptyState;
  }
  if (!isRecord(raw)) return emptyState;
  const counts = sanitizeCounts(raw['counts']);
  const customs = sanitizeCustoms(raw['customs']);
  if (counts === null || customs === null) return emptyState;
  return { counts, customs };
}

/** 状態を保存する。容量超過などで失敗しても例外は投げない(集計は続行できる)。 */
export function saveState(storage: StorageLike, state: State): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 保存できなくても画面上の集計は続けられるので握りつぶす
  }
}
