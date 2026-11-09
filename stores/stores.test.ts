import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { itemKey } from '../src/tally';
import { parseStoreMenu } from '../src/menu';

const dir = import.meta.dirname;
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

describe('stores/*.json', () => {
  it('店舗ファイルが 1 つ以上ある', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    describe(file, () => {
      const raw: unknown = JSON.parse(readFileSync(join(dir, file), 'utf8'));

      it('スキーマに適合する', () => {
        expect(() => parseStoreMenu(raw)).not.toThrow();
      });

      const menu = parseStoreMenu(raw);

      it('店舗名・更新日・出典がある', () => {
        expect(menu.store.length).toBeGreaterThan(0);
        expect(menu.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(menu.updatedAt))).toBe(false);
        expect(menu.source).toMatch(/^https:\/\//);
      });

      it('品目が 1 つ以上ある', () => {
        expect(menu.items.length).toBeGreaterThan(0);
      });

      it('価格はすべて正の整数', () => {
        for (const item of menu.items) {
          expect(Number.isInteger(item.price), `${item.name}: ${item.price}`).toBe(true);
          expect(item.price, `${item.name}: ${item.price}`).toBeGreaterThan(0);
        }
      });

      it('品名・カテゴリは空でなく前後に空白がない', () => {
        for (const item of menu.items) {
          expect(item.name).toBe(item.name.trim());
          expect(item.name.length).toBeGreaterThan(0);
          expect(item.category).toBe(item.category.trim());
          expect(item.category.length).toBeGreaterThan(0);
        }
      });

      it('カテゴリ + 品名の組は重複しない', () => {
        const seen = new Map<string, number>();
        for (const item of menu.items) {
          const key = itemKey(item);
          seen.set(key, (seen.get(key) ?? 0) + 1);
        }
        const dupes = [...seen].filter(([, n]) => n > 1).map(([k]) => k);
        expect(dupes).toEqual([]);
      });

      it('同じカテゴリの品目は連続して並ぶ(カテゴリが分断されていない)', () => {
        const order: string[] = [];
        for (const item of menu.items) {
          if (order.at(-1) !== item.category) order.push(item.category);
        }
        expect(new Set(order).size).toBe(order.length);
      });
    });
  }
});
