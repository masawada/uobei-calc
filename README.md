# uobei-calc

魚べい 五反田TOC店で、自分が食べた分の金額を手元で数えるための非公式ツールです。
各自が自分のスマホで、食べた品の個数を +/- で記録し、会計時に合計と内訳を確認できます。

- 1 端末 1 人で使う想定です。
- 個数はブラウザに保存され、「クリア」を押すまで残ります。
- PWA としてインストールでき、オフラインでも動きます。

## メニューデータ

`stores/gotanda-toc.json` に、公式メニューページの表示内容を手で転記したものを置いています。
品名・カテゴリ・店内飲食の税込価格だけを持ち、画像など著作物は含みません。

```json
{
  "store": "魚べい 五反田TOC店",
  "updatedAt": "2026-11-09",
  "source": "https://www.uobei.info/menu/?topics_id=1112",
  "items": [{ "category": "握り", "name": "まぐろ", "price": 110 }]
}
```

価格改定やメニュー変更があったら、この JSON を直して `updatedAt` を更新し、`main` に push すると配信されます。
`npm test` が価格の形式や品名の重複を検査します。
一覧に無い品は、アプリの「その他」から金額を入力して追加できます。

## 開発

```sh
npm ci
npm run dev        # 開発サーバ
npm test           # vitest
npm run typecheck  # tsc
npm run build      # dist/ に出力
```

`main` への push で GitHub Actions がテストとビルドを行い、GitHub Pages に配信します。
初回だけ、リポジトリの Settings → Pages → Source で「GitHub Actions」を選んでおく必要があります。

## 免責

株式会社Genki Global Dining Concepts および魚べいとは無関係の非公式ツールです。
実際の価格は店頭の表示をご確認ください。
