// eslint-disable-next-line import-x/no-nodejs-modules
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
assert.ok(initial.desktop.some(item => item.kind === 'app' && item.name === '魔女恶堕计划'));
assert.ok(!initial.desktop.some(item => item.kind === 'app' && item.name === '技能商店'));
assert.ok(!initial.desktop.some(item => item.kind === 'app' && item.name === '道具商店'));
assert.equal(initial.dock.length, 4);

const reordered = movePhoneItem(
  initial,
  { kind: 'app', name: '微信' },
  { zone: 'desktop', key: 'app:角色编辑器', placement: 'after' },
  'unused',
);
assert.equal(
  reordered.desktop.findIndex(item => item.kind === 'app' && item.name === '微信'),
  reordered.desktop.findIndex(item => item.kind === 'app' && item.name === '角色编辑器') + 1,
);
assert.equal(initial.desktop[0].kind, 'app');

const grouped = movePhoneItem(
  reordered,
  { kind: 'app', name: '魔女恶堕计划' },
  { zone: 'desktop', key: 'app:角色编辑器', placement: 'inside' },
  'folder-1',
);
const folder = grouped.desktop.find(item => item.kind === 'folder' && item.id === 'folder-1');
assert.deepEqual(folder?.kind === 'folder' ? folder.apps : [], ['角色编辑器', '魔女恶堕计划']);
const added = movePhoneItem(
  grouped,
  { kind: 'app', name: '微信' },
  { zone: 'desktop', key: 'folder:folder-1', placement: 'inside' },
  'unused',
);
assert.deepEqual(added.desktop.find(item => item.kind === 'folder' && item.id === 'folder-1')?.apps, [
  '角色编辑器',
  '魔女恶堕计划',
  '微信',
]);
const restored = normalizePhoneLayout(JSON.parse(JSON.stringify(added)));
assert.deepEqual(restored, added);

const removed = takeAppOutOfFolder(added, 'folder-1', '魔女恶堕计划');
assert.ok(removed.desktop.some(item => item.kind === 'app' && item.name === '魔女恶堕计划'));
assert.deepEqual(removed.desktop.find(item => item.kind === 'folder' && item.id === 'folder-1')?.apps, [
  '角色编辑器',
  '微信',
]);

const docked = movePhoneItem(
  initial,
  { kind: 'app', name: '魔女恶堕计划' },
  { zone: 'dock', key: '电话', placement: 'before' },
  'unused',
);
assert.ok(docked.dock.includes('魔女恶堕计划'));
assert.ok(docked.desktop.some(item => item.kind === 'app' && item.name === '电话'));

const movedToEnd = movePhoneItem(initial, { kind: 'app', name: '微信' }, { zone: 'page', index: 12 }, 'unused');
const last = movedToEnd.desktop.at(-1);
assert.equal(last?.kind, 'app');
assert.equal(last?.kind === 'app' ? last.name : '', '微信');
assert.equal(movedToEnd.desktop.length, initial.desktop.length);

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
    { kind: 'folder', id: 'old-folder', name: '物品', apps: ['仓库', '随身物品', '微信'] },
  ],
  dock: ['仓库', '电话'],
});
assert.ok(legacy.desktop.some(item => item.kind === 'folder' && item.apps.includes('微信')));
assert.ok(!legacy.desktop.some(item => item.kind === 'app' && item.name === '仓库'));
assert.ok(!legacy.dock.includes('仓库'));
assert.ok(legacy.desktop.some(item => item.kind === 'app' && item.name === '魔女恶堕计划'));
assert.ok(!legacy.desktop.some(item => item.kind === 'folder' && item.apps.includes('随身物品')));
const oldOrganizationApps = [
  '主要角色',
  '次要角色',
  '我的档案',
  '技能',
  '随身物品',
  '技能商店',
  '道具商店',
  '组织任务',
];
const migrated = normalizePhoneLayout({
  desktop: [
    { kind: 'app', name: '角色编辑器' },
    { kind: 'folder', id: 'organization', name: '组织', apps: ['心象监测', '技能商店', '微信'] },
    ...oldOrganizationApps.map(name => ({ kind: 'app', name })),
  ],
  dock: ['组织任务', '电话'],
});
const migratedNames = [
  ...migrated.dock,
  ...migrated.desktop.flatMap(item => (item.kind === 'app' ? [item.name] : item.apps)),
];
assert.equal(migratedNames.filter(name => name === '魔女恶堕计划').length, 1);
assert.ok(oldOrganizationApps.every(name => !migratedNames.includes(name)));
assert.ok(migrated.desktop.some(item => item.kind === 'folder' && item.apps.includes('微信')));
assert.ok(migrated.desktop.some(item => item.kind === 'app' && item.name === '角色编辑器'));

console.log('手机桌面布局验证通过');
