import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { parseStoreMenu } from './menu';
import rawMenu from '../stores/gotanda-toc.json';
import './style.css';

registerSW({ immediate: true });

const menu = parseStoreMenu(rawMenu);
const root = document.getElementById('app');
if (!root) throw new Error('#app が見つかりません');
render(<App menu={menu} />, root);
