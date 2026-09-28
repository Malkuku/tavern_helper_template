import type { stat_data, 用户数据 } from '../../types';

export type ProfileField = '背景' | '外貌' | '性格';

export function profileFieldValue(user: 用户数据, field: ProfileField): string {
  return field === '背景' ? user.基础信息.背景 : user[field];
}

export function applyProfileEdit(data: stat_data, field: ProfileField, value: string): void {
  if (field === '背景') data.角色.user.基础信息.背景 = value;
  else data.角色.user[field] = value;
}
