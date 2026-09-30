export const SCRIPT_BACKUP_FORMAT = 'magic-girl-phone-script-variables';
export const SCRIPT_BACKUP_VERSION = 1;

export type ScriptBackup = {
  format: typeof SCRIPT_BACKUP_FORMAT;
  version: typeof SCRIPT_BACKUP_VERSION;
  scriptId: string;
  createdAt: string;
  variables: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseScriptBackup(value: unknown): ScriptBackup {
  if (
    !isRecord(value) ||
    value.format !== SCRIPT_BACKUP_FORMAT ||
    value.version !== SCRIPT_BACKUP_VERSION ||
    typeof value.scriptId !== 'string' ||
    !value.scriptId ||
    typeof value.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    !isRecord(value.variables)
  ) {
    throw new Error('备份文件格式无效或版本不受支持');
  }
  return value as ScriptBackup;
}

export function createScriptBackup(scriptId: string, variables: unknown, now = new Date()): ScriptBackup {
  if (!isRecord(variables)) throw new Error('脚本变量格式无效');
  // 生成独立的 JSON 快照，避免后续变量写入改变已经保存的备份。
  const snapshot = JSON.parse(JSON.stringify(variables)) as unknown;
  if (!isRecord(snapshot)) throw new Error('脚本变量无法序列化');
  return {
    format: SCRIPT_BACKUP_FORMAT,
    version: SCRIPT_BACKUP_VERSION,
    scriptId,
    createdAt: now.toISOString(),
    variables: snapshot,
  };
}

function backupKey(scriptId: string): string {
  return `magicGirlPhoneScriptBackup:${scriptId}`;
}

export function readLocalScriptBackups(): ScriptBackup[] {
  return Object.entries(getVariables({ type: 'global' }) || {})
    .filter(([key]) => key.startsWith('magicGirlPhoneScriptBackup:'))
    .map(([key, value]) => {
      const backup = parseScriptBackup(value);
      if (key !== backupKey(backup.scriptId)) throw new Error(`备份来源脚本与存储键不一致：${key}`);
      return backup;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveLocalScriptBackup(backup: ScriptBackup): void {
  updateVariablesWith(variables => ({ ...variables, [backupKey(backup.scriptId)]: backup }), { type: 'global' });
}

export function restoreScriptBackup(backup: ScriptBackup, scriptId: string): void {
  replaceVariables(JSON.parse(JSON.stringify(backup.variables)), { type: 'script', script_id: scriptId });
}
