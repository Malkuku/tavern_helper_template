import assert from 'node:assert/strict';
import {
  defaultPhoneLayout,
  movePhoneItem,
  normalizePhoneLayout,
  takeAppOutOfFolder,
} from '../src/手机界面/desktopLayout';
import { apps } from '../src/手机界面/desktopApps';

const initial = defaultPhoneLayout();
assert.equal(initial.desktop.length, apps.length);
assert.ok(initial.desktop.some(item => item.kind === 'app' && item.name === '技能商店'));
assert.equal(initial.dock.length, 4);

const reordered = movePhoneItem(
  initial,
  { kind: 'app', name: '微信' },
  { zone: 'desktop', key: 'app:随身物品', placement: 'after' },
  'unused',
);
assert.equal(
  reordered.desktop.findIndex(item => item.kind === 'app' && item.name === '微信'),
  reordered.desktop.findIndex(item => item.kind === 'app' && item.name === '随身物品') + 1,
);
assert.equal(initial.desktop[0].kind, 'app');

const grouped = movePhoneItem(
  reordered,
  { kind: 'app', name: '技能' },
  { zone: 'desktop', key: 'app:随身物品', placement: 'inside' },
  'folder-1',
);
const folder = grouped.desktop.find(item => item.kind === 'folder' && item.id === 'folder-1');
assert.deepEqual(folder?.kind === 'folder' ? folder.apps : [], ['随身物品', '技能']);
const added = movePhoneItem(
  grouped,
  { kind: 'app', name: '微信' },
  { zone: 'desktop', key: 'folder:folder-1', placement: 'inside' },
  'unused',
);
assert.deepEqual(added.desktop.find(item => item.kind === 'folder' && item.id === 'folder-1')?.apps, [
  '随身物品',
  '技能',
  '微信',
]);
const restored = normalizePhoneLayout(JSON.parse(JSON.stringify(added)));
assert.deepEqual(restored, added);

const removed = takeAppOutOfFolder(added, 'folder-1', '技能');
assert.ok(removed.desktop.some(item => item.kind === 'app' && item.name === '技能'));
assert.deepEqual(removed.desktop.find(item => item.kind === 'folder' && item.id === 'folder-1')?.apps, [
  '随身物品',
  '微信',
]);

const docked = movePhoneItem(
  initial,
  { kind: 'app', name: '技能' },
  { zone: 'dock', key: '电话', placement: 'before' },
  'unused',
);
assert.ok(docked.dock.includes('技能'));
assert.ok(docked.desktop.some(item => item.kind === 'app' && item.name === '电话'));

const movedToSecondPage = movePhoneItem(initial, { kind: 'app', name: '微信' }, { zone: 'page', index: 12 }, 'unused');
assert.equal(movedToSecondPage.desktop[12].kind, 'app');
assert.equal(movedToSecondPage.desktop[12].kind === 'app' ? movedToSecondPage.desktop[12].name : '', '微信');
assert.equal(movedToSecondPage.desktop.length, initial.desktop.length);

const bad = normalizePhoneLayout({
  desktop: [
    { kind: 'app', name: '微信' },
    { kind: 'app', name: '微信' },
    { kind: 'app', name: '不存在' },
  ],
  dock: ['微信', '电话', '电话'],
});
const names = [...bad.dock, ...bad.desktop.flatMap(item => (item.kind === 'app' ? [item.name] : item.apps))];
assert.equal(new Set(names).size, names.length);
assert.equal(names.length, initial.desktop.length + initial.dock.length);

const legacy = normalizePhoneLayout({
  desktop: [
    { kind: 'app', name: '仓库' },
    { kind: 'folder', id: 'old-folder', name: '物品', apps: ['仓库', '随身物品'] },
  ],
  dock: ['仓库', '电话'],
});
assert.ok(legacy.desktop.some(item => item.kind === 'folder' && item.apps.includes('随身物品')));
assert.ok(!legacy.desktop.some(item => item.kind === 'app' && item.name === '仓库'));
assert.ok(!legacy.dock.includes('仓库'));

console.log('手机桌面布局验证通过');
