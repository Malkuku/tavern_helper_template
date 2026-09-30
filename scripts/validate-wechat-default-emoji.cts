// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
// eslint-disable-next-line import-x/no-nodejs-modules
import { readdirSync, readFileSync } from 'node:fs';
// eslint-disable-next-line import-x/no-nodejs-modules
import path from 'node:path';
import { insertInlineEmoji, splitInlineEmoji } from '../src/手机界面/apps/wechat/defaultEmojiText';
import { contentSummary } from '../src/手机界面/apps/wechat/wechatData';

const base = path.resolve('src/手机界面/apps/wechat');
const catalog = readFileSync(path.join(base, 'defaultEmoji.ts'), 'utf8');
const names = [...catalog.matchAll(/\{ name: '([^']+)', source: emoji\d+ \}/g)].map(match => match[1]);
assert.equal(names.length, 109);
assert.equal(new Set(names).size, 109);
assert.equal(readdirSync(path.join(base, 'defaultEmojiAssets')).filter(file => file.endsWith('.png')).length, 109);
assert.ok(names.includes('捂脸'));
assert.ok(names.includes('微笑'));

const known = (name: string) => names.includes(name);
assert.deepEqual(splitInlineEmoji('我去，不早说[捂脸]！[未知][微笑]', known), [
  { kind: 'text', value: '我去，不早说' },
  { kind: 'emoji', value: '捂脸' },
  { kind: 'text', value: '！[未知]' },
  { kind: 'emoji', value: '微笑' },
]);
assert.deepEqual(splitInlineEmoji('<表情包>捂脸</表情包>', known), [{ kind: 'text', value: '<表情包>捂脸</表情包>' }]);
assert.deepEqual(insertInlineEmoji('我去，不早说', 2, 2, '捂脸'), { text: '我去[捂脸]，不早说', cursor: 6 });
assert.equal(contentSummary(['我去，不早说[捂脸]']), '我去，不早说[捂脸]');
assert.equal(contentSummary(['<表情包>捂脸</表情包>']), '[表情包]');
console.log('微信内置表情验证通过');
