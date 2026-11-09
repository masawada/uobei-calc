import { emptyState, type CustomEntry, type State } from './tally';

export const STORAGE_KEY = 'uobei-calc:state:v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function sanitizeCounts(raw: unknown): Record<string, number> | null {
  if (!isRecord(raw)) return null;
  const counts: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (isPositiveInteger(value)) counts[key] = value;
  }
  return counts;
}

function sanitizeCustoms(raw: unknown): CustomEntry[] | null {
  if (!Array.isArray(raw)) return null;
  const customs: CustomEntry[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const { id, price, count } = entry;
    if (typeof id === 'string' && isPositiveInteger(price) && isPositiveInteger(count)) {
      customs.push({ id, price, count });
    }
  }
  return customs;
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
