import assert from 'node:assert/strict';
import {
  createScriptBackup,
  parseScriptBackup,
  readLocalScriptBackup,
  restoreScriptBackup,
  saveLocalScriptBackup,
} from '../src/手机界面/apps/scriptBackup';

const variables = { notes: [{ title: '原内容' }], enabled: false, count: 0 };
const globalVariables = { unrelated: { keep: true } } as Record<string, unknown>;
let scriptVariables: Record<string, unknown> = variables;
(globalThis as any).getVariables = (option: { type: string }) =>
  option.type === 'global' ? globalVariables : scriptVariables;
(globalThis as any).updateVariablesWith = (updater: (value: Record<string, unknown>) => Record<string, unknown>) => {
  Object.assign(globalVariables, updater(globalVariables));
};
(globalThis as any).replaceVariables = (next: Record<string, unknown>, option: { type: string }) => {
  assert.equal(option.type, 'script');
  scriptVariables = next;
};

const backup = createScriptBackup('phone-script', variables, new Date('2026-09-30T00:00:00Z'));
variables.notes[0].title = '后来修改';
assert.equal((backup.variables.notes as { title: string }[])[0].title, '原内容');
saveLocalScriptBackup(backup);
assert.deepEqual(readLocalScriptBackup('phone-script'), backup);
assert.equal(readLocalScriptBackup('another-script'), null);
assert.deepEqual(globalVariables.unrelated, { keep: true });
assert.deepEqual(parseScriptBackup(JSON.parse(JSON.stringify(backup))), backup);
assert.throws(() => parseScriptBackup({ ...backup, version: 2 }), /格式无效/);
assert.throws(() => parseScriptBackup({ ...backup, variables: [] }), /格式无效/);
restoreScriptBackup(backup, 'phone-script');
assert.deepEqual(scriptVariables, backup.variables);
assert.notStrictEqual(scriptVariables, backup.variables);
console.log('手机脚本变量备份、隔离、校验与恢复验证通过');
