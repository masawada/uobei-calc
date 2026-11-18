import type { MenuItem } from './menu';

const KATAKANA = /[ァ-ヶ]/g;
const HIRAGANA_OFFSET = 0x60;

/** 照合用に表記をそろえる。全角/半角、大文字/小文字、ひらがな/カタカナを同一視し、空白と「・」を取り除く。 */
function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(KATAKANA, (c) => String.fromCharCode(c.charCodeAt(0) - HIRAGANA_OFFSET))
    .replace(/[\s・]/g, '');
}

/**
 * 品名に検索語を含む品を、メニュー順のまま返す。
 * 検索語は空白で区切り、すべての語を含む品だけを残す。読み(よみがな)では照合しない。
 */
export function searchItems(items: MenuItem[], query: string): MenuItem[] {
  const terms = query
    .split(/\s+/)
    .map(normalize)
    .filter((term) => term !== '');
  if (terms.length === 0) return items;
  return items.filter((item) => {
    const name = normalize(item.name);
    return terms.every((term) => name.includes(term));
  });
}
