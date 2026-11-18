import { describe, expect, it } from 'vitest';
import type { MenuItem } from './menu';
import { searchItems } from './search';

const item = (name: string, category = '握り'): MenuItem => ({ category, name, price: 110 });

const names = (items: MenuItem[]) => items.map((i) => i.name);

describe('searchItems', () => {
  const items = [
    item('サーモン'),
    item('サーモンマヨ炙り'),
    item('えびマヨ炙り'),
    item('真鯛'),
    item('サーモンマヨネーズ', '軍艦・巻物・いなり'),
    item('コカ・コーラ', 'デザート・ドリンク'),
    item('ファンタ メロンソーダＷ', 'デザート・ドリンク'),
    item('MEGAカルピス', 'デザート・ドリンク'),
  ];

  it('検索語を含む品だけをメニュー順のまま返す', () => {
    expect(names(searchItems(items, 'サーモン'))).toEqual(['サーモン', 'サーモンマヨ炙り', 'サーモンマヨネーズ']);
  });

  it('検索語が空なら全件を返す', () => {
    expect(searchItems(items, '')).toEqual(items);
    expect(searchItems(items, ' 　')).toEqual(items);
  });

  it('一致が無ければ空配列を返す', () => {
    expect(searchItems(items, 'からすみ')).toEqual([]);
  });

  it('ひらがなとカタカナを同一視する', () => {
    expect(names(searchItems(items, 'さーもん'))).toEqual(['サーモン', 'サーモンマヨ炙り', 'サーモンマヨネーズ']);
    expect(names(searchItems(items, 'エビ'))).toEqual(['えびマヨ炙り']);
  });

  it('全角と半角、大文字と小文字を同一視する', () => {
    expect(names(searchItems(items, 'mega'))).toEqual(['MEGAカルピス']);
    expect(names(searchItems(items, 'ＭＥＧＡ'))).toEqual(['MEGAカルピス']);
    expect(names(searchItems(items, 'ソーダw'))).toEqual(['ファンタ メロンソーダＷ']);
    expect(names(searchItems(items, 'ｶﾙﾋﾟｽ'))).toEqual(['MEGAカルピス']);
  });

  it('読みでは照合しない', () => {
    expect(searchItems(items, 'たい')).toEqual([]);
    expect(names(searchItems(items, '鯛'))).toEqual(['真鯛']);
  });

  it('空白で区切った語をすべて含む品を返す', () => {
    expect(names(searchItems(items, 'マヨ 炙り'))).toEqual(['サーモンマヨ炙り', 'えびマヨ炙り']);
    expect(names(searchItems(items, '炙り　さーもん'))).toEqual(['サーモンマヨ炙り']);
  });

  it('品名の空白と「・」を無視する', () => {
    expect(names(searchItems(items, 'コカコーラ'))).toEqual(['コカ・コーラ']);
    expect(names(searchItems(items, 'コカ・コーラ'))).toEqual(['コカ・コーラ']);
    expect(names(searchItems(items, 'ファンタメロン'))).toEqual(['ファンタ メロンソーダＷ']);
  });

  it('「・」だけの検索語は空として扱う', () => {
    expect(searchItems(items, '・')).toEqual(items);
  });
});
