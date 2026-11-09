import { useEffect, useMemo, useReducer, useState } from 'preact/hooks';
import type { MenuItem, StoreMenu } from './menu';
import { loadState, saveState } from './storage';
import { breakdown, itemKey, reduce, total, type Action, type BreakdownLine, type CustomEntry, type State } from './tally';

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;

type Dispatch = (action: Action) => void;

export function App({ menu }: { menu: StoreMenu }) {
  const [state, dispatch] = useReducer(reduce, undefined, () => loadState(localStorage));
  useEffect(() => saveState(localStorage, state), [state]);

  const categories = useMemo(() => groupByCategory(menu.items), [menu]);
  const lines = breakdown(state, menu);
  const sum = total(state, menu);

  const clear = () => {
    if (sum === 0) return;
    if (window.confirm('集計をクリアしますか?')) dispatch({ type: 'clear' });
  };

  return (
    <>
      <Header store={menu.store} sum={sum} lines={lines} onClear={clear} />
      <CategoryNav categories={categories.map((c) => c.category)} />
      <main>
        {categories.map((c) => (
          <MenuSection key={c.category} category={c.category} items={c.items} state={state} dispatch={dispatch} />
        ))}
        <CustomSection customs={state.customs} dispatch={dispatch} />
      </main>
      <Footer menu={menu} />
    </>
  );
}

function groupByCategory(items: MenuItem[]): { category: string; items: MenuItem[] }[] {
  const groups: { category: string; items: MenuItem[] }[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last && last.category === item.category) last.items.push(item);
    else groups.push({ category: item.category, items: [item] });
  }
  return groups;
}

function Header({
  store,
  sum,
  lines,
  onClear,
}: {
  store: string;
  sum: number;
  lines: BreakdownLine[];
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <header class="header">
      <div class="header-row">
        <h1 class="store">{store}</h1>
        <button type="button" class="clear" onClick={onClear} disabled={sum === 0}>
          クリア
        </button>
      </div>
      <button
        type="button"
        class="total"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="breakdown"
      >
        <span class="total-label">合計</span>
        <span class="total-amount">{yen(sum)}</span>
        <span class="total-toggle">{open ? '内訳を閉じる ▲' : '内訳を見る ▼'}</span>
      </button>
      {open && (
        <ul id="breakdown" class="breakdown">
          {lines.length === 0 && <li class="breakdown-empty">まだ何も押していません</li>}
          {lines.map((l) => (
            <li key={`${l.label}:${l.unitPrice}`}>
              <span class="breakdown-label">{l.label}</span>
              <span class="breakdown-calc">
                {yen(l.unitPrice)} × {l.count}
              </span>
              <span class="breakdown-subtotal">{yen(l.subtotal)}</span>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}

const sectionId = (category: string) => `cat-${category}`;

function CategoryNav({ categories }: { categories: string[] }) {
  return (
    <nav class="catnav" aria-label="カテゴリ">
      {categories.map((c) => (
        <a key={c} href={`#${sectionId(c)}`}>
          {c}
        </a>
      ))}
      <a href={`#${sectionId('その他')}`}>その他</a>
    </nav>
  );
}

function MenuSection({
  category,
  items,
  state,
  dispatch,
}: {
  category: string;
  items: MenuItem[];
  state: State;
  dispatch: Dispatch;
}) {
  return (
    <section id={sectionId(category)} class="section">
      <h2>{category}</h2>
      <ul class="items">
        {items.map((item) => {
          const key = itemKey(item);
          const count = state.counts[key] ?? 0;
          return (
            <li key={key} class={count > 0 ? 'item selected' : 'item'}>
              <span class="item-name">{item.name}</span>
              <span class="item-price">{yen(item.price)}</span>
              <Counter
                count={count}
                label={item.name}
                onDecrement={() => dispatch({ type: 'decrement', key })}
                onIncrement={() => dispatch({ type: 'increment', key })}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CustomSection({ customs, dispatch }: { customs: CustomEntry[]; dispatch: Dispatch }) {
  const [price, setPrice] = useState('');
  const parsed = Number(price);
  const valid = price !== '' && Number.isInteger(parsed) && parsed > 0;

  const add = (e: Event) => {
    e.preventDefault();
    if (!valid) return;
    dispatch({ type: 'addCustom', price: parsed });
    setPrice('');
  };

  return (
    <section id={sectionId('その他')} class="section">
      <h2>その他</h2>
      <p class="hint">一覧に無い品は金額を入れて追加してください。</p>
      <form class="custom-form" onSubmit={add}>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          placeholder="金額(税込)"
          value={price}
          onInput={(e) => setPrice((e.target as HTMLInputElement).value)}
          aria-label="その他の金額"
        />
        <button type="submit" disabled={!valid}>
          追加
        </button>
      </form>
      {customs.length > 0 && (
        <ul class="items">
          {customs.map((c) => (
            <li key={c.id} class="item selected">
              <span class="item-name">その他</span>
              <span class="item-price">{yen(c.price)}</span>
              <Counter
                count={c.count}
                label={`その他 ${yen(c.price)}`}
                onDecrement={() => dispatch({ type: 'decrementCustom', id: c.id })}
                onIncrement={() => dispatch({ type: 'incrementCustom', id: c.id })}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Counter({
  count,
  label,
  onDecrement,
  onIncrement,
}: {
  count: number;
  label: string;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <span class="counter">
      <button type="button" onClick={onDecrement} disabled={count === 0} aria-label={`${label} を 1 減らす`}>
        −
      </button>
      <span class="count" aria-live="polite">
        {count}
      </span>
      <button type="button" onClick={onIncrement} aria-label={`${label} を 1 増やす`}>
        +
      </button>
    </span>
  );
}

function Footer({ menu }: { menu: StoreMenu }) {
  return (
    <footer class="footer">
      <p>
        データ更新日: {menu.updatedAt} / 出典:{' '}
        <a href={menu.source} target="_blank" rel="noopener noreferrer">
          魚べい公式サイト
        </a>
      </p>
      <p>非公式ツールです。実際の価格は店頭の表示をご確認ください。</p>
    </footer>
  );
}
