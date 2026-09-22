import { calculateCharacterAttributes, type CharacterLevels } from '../../尘史使徒/DOC/数值计算';
import type { JsonObject } from '../scenario/types';

const aspectMap: Record<string, keyof CharacterLevels> = {
  灯: 'Lantern',
  铸: 'Forge',
  刃: 'Edge',
  冬: 'Winter',
  心: 'Heart',
  杯: 'Grail',
  蛾: 'Moth',
  启: 'Knock',
};

export function applyRoleDerivedStats(data: JsonObject): void {
  const arts = data.术之等级;
  const levels: CharacterLevels = {};
  if (arts && typeof arts === 'object' && !Array.isArray(arts)) {
    for (const [name, raw] of Object.entries(arts)) {
      const aspect = aspectMap[name];
      if (!aspect || !raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
      const level = Number((raw as JsonObject).等级);
      if (Number.isFinite(level) && level > 0) levels[aspect] = level;
    }
  }

  const stats = calculateCharacterAttributes(levels);
  data.基础数值 = { 力量: stats.Strength, 敏捷: stats.Agility, 智慧: stats.Wisdom, 魅力: stats.Charisma };
  data.生命状态 = {
    生命: { 最大值: stats.Life, 当前: stats.Life },
    体力: { 最大值: stats.Stamina, 当前: stats.Stamina },
    精神: { 最大值: stats.Spirit, 当前: stats.Spirit },
  };
}
