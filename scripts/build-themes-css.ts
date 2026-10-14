// Writes public/static/themes.css from src/themes.ts. Run after changing themes: npm run themes
import { writeFileSync } from 'node:fs';
import { themesCss } from '../src/themes.ts';

writeFileSync(new URL('../public/static/themes.css', import.meta.url), `${themesCss()}\n`);
console.log('wrote public/static/themes.css');
