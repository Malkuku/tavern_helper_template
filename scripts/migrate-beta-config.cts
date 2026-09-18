import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const directory = process.argv[2];
if (!directory) throw new Error('请传入 Beta 配置目录。');

const privateCategories = ['世界', '开场文本', '主线', '任务', '事件'] as const;
const read = (name: string) => JSON.parse(readFileSync(path.join(directory, `${name}.json`), 'utf8'));
const openingPath = path.join(directory, '开场白.json');
const existingOpening = read('开场白');
const privateFilesExist = privateCategories.every(name => existsSync(path.join(directory, `${name}.json`)));
if (!privateFilesExist) {
  const scenarios = Object.values(existingOpening.开场白) as any[];
  const alreadyMigrated = scenarios.every(
    scenario => scenario.视觉方案 && !scenario.主题 && typeof scenario.内容配置?.世界 === 'object',
  );
  if (!alreadyMigrated) throw new Error('私有配置文件不完整，且开场白尚未完成新格式迁移。');
  console.info(`Beta 配置已是新格式：${scenarios.length} 个剧本，无需重复迁移。`);
  process.exit(0);
}
const documents = Object.fromEntries(privateCategories.map(name => [name, read(name)[name]]));
const openingDocument = existingOpening;
const themeMap: Record<string, string> = {
  'theme-broken-mirror': '破镜',
  'theme-lamp': '灯',
  'theme-forge': '铸',
  'theme-edge': '刃',
  'theme-winter': '冬',
  'theme-heart': '心',
  'theme-cup': '杯',
  'theme-moth': '蛾',
  'theme-knock': '启',
};

const requireEntry = (category: (typeof privateCategories)[number], id: string) => {
  const entry = documents[category][id];
  if (!entry) throw new Error(`剧本引用缺失：${category}/${id}`);
  return entry;
};

for (const scenario of Object.values(openingDocument.开场白) as any[]) {
  const config = scenario.内容配置;
  const theme = themeMap[scenario.主题];
  if (!theme) throw new Error(`未知旧主题：${scenario.主题}`);
  const world = requireEntry('世界', config.世界);
  const opening = requireEntry('开场文本', config.开场文本);
  const mainline = requireEntry('主线', config.主线);
  const tasks = config.任务.map((id: string) => requireEntry('任务', id));
  const events = config.事件.map((id: string) => requireEntry('事件', id));
  assert.equal(typeof world.data, 'object');
  assert.equal(typeof opening.data, 'string');
  assert.equal(typeof mainline.data, 'object');
  scenario.视觉方案 = theme;
  delete scenario.主题;
  delete scenario.图标;
  scenario.内容配置 = {
    ...config,
    世界: structuredClone(world.data),
    开场文本: opening.data,
    主线: structuredClone(mainline.data),
    任务: tasks.map((entry: any) => ({ key: entry.key, data: structuredClone(entry.data) })),
    事件: events.map((entry: any) => ({ key: entry.key, data: structuredClone(entry.data) })),
  };
}

const backupDirectory = path.join(directory, '.migration-backup-20260918');
mkdirSync(backupDirectory, { recursive: true });
for (const name of ['开场白', ...privateCategories]) {
  const source = path.join(directory, `${name}.json`);
  const backup = path.join(backupDirectory, `${name}.json`);
  if (!existsSync(backup)) copyFileSync(source, backup);
}

const serialized = `${JSON.stringify(openingDocument, null, 4)}\n`;
JSON.parse(serialized);
writeFileSync(openingPath, serialized, 'utf8');
for (const category of privateCategories) unlinkSync(path.join(directory, `${category}.json`));

console.info(`Beta 配置迁移完成：${Object.keys(openingDocument.开场白).length} 个剧本；备份位于 ${backupDirectory}`);
