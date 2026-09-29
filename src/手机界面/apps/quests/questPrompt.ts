import type { stat_data } from '../../types';

export function buildQuestPrompt(data: stat_data | undefined, name: string): string {
  const task = data?.任务?.[name];
  if (!task) throw new Error('当前没有这项已接任务，请重新选择。');
  if (task.已完成) throw new Error('该任务已完成，请领取奖励。');
  const details = { 任务名称: name, 目标: task.目标, 当前进度: task.当前进度 };
  return `<user>决定推进任务「${name}」。\n<list>\n${JSON.stringify(details, null, 2)}\n</list>\n`;
}
