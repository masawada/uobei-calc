export type MenuItem = {
  category: string;
  name: string;
  price: number;
};

export type StoreMenu = {
  store: string;
  updatedAt: string;
  source: string;
  items: MenuItem[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(obj: Record<string, unknown>, key: string, path: string): string {
  const value = obj[key];
  if (typeof value !== 'string') throw new Error(`${path}.${key} は文字列である必要があります`);
  return value;
}

function parseItem(raw: unknown, path: string): MenuItem {
  if (!isRecord(raw)) throw new Error(`${path} はオブジェクトである必要があります`);
  const price = raw['price'];
  if (typeof price !== 'number') throw new Error(`${path}.price は数値である必要があります`);
  return {
    category: requireString(raw, 'category', path),
    name: requireString(raw, 'name', path),
    price,
  };
}

/** stores/*.json の中身を検証して StoreMenu にする。形が合わなければ例外を投げる。 */
export function parseStoreMenu(raw: unknown): StoreMenu {
  if (!isRecord(raw)) throw new Error('店舗メニューはオブジェクトである必要があります');
  const items = raw['items'];
  if (!Array.isArray(items)) throw new Error('items は配列である必要があります');
  return {
    store: requireString(raw, 'store', 'menu'),
    updatedAt: requireString(raw, 'updatedAt', 'menu'),
    source: requireString(raw, 'source', 'menu'),
    items: items.map((item, i) => parseItem(item, `items[${i}]`)),
  };
}
