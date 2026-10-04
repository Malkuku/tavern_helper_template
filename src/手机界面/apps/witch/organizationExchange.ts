import type { stat_data, 微信数据 } from '../../types';

export const organizationNoticeKey = '通知:组织财务';
export const organizationNoticeAccount = '$organization-finance';
export const yenPerPoint = 1000;

export function exchangeOrganizationPoints(data: stat_data, points: number): void {
  if (!Number.isSafeInteger(points) || points <= 0) throw new Error('兑换点数必须为正整数。');
  const user = data.角色.user;
  if (!Number.isSafeInteger(user.恶堕积分) || user.恶堕积分 < points) throw new Error('恶堕积分不足。');
  if (!Number.isFinite(user.金钱)) throw new Error('角色金钱变量无效。');
  if (!data.手机?.微信) throw new Error('Weline 尚未初始化，无法发送到账通知。');
  if (!data.世界?.时间) throw new Error('世界时间尚未设置，无法记录兑换。');
  const cents = Math.round(user.金钱 * 100) + points * yenPerPoint * 100;
  if (!Number.isSafeInteger(points * yenPerPoint * 100) || !Number.isSafeInteger(cents))
    throw new Error('兑换金额超出有效范围。');
  user.恶堕积分 -= points;
  user.金钱 = cents / 100;
  (data.手机.组织兑换通知 ??= []).push({ 时间: data.世界.时间, 点数: points, 日元: points * yenPerPoint });
}

/** 仅为会话列表与未读提醒派生视图，绝不写入真实账号、好友或聊天协议。 */
export function organizationWeChatView(data: stat_data | null): 微信数据 | null {
  const wechat = data?.手机?.微信;
  if (!wechat) return null;
  const notices = data.手机.组织兑换通知;
  if (!notices?.length) return wechat;
  return {
    ...wechat,
    账号: {
      ...wechat.账号,
      [organizationNoticeAccount]: { 昵称: '组织财务', 头像: '', 表情包: {}, 好友: [] },
    },
    会话: {
      ...wechat.会话,
      [organizationNoticeKey]: {
        类型: '私聊',
        成员: ['user', organizationNoticeAccount],
        消息: notices.map((notice, index) => ({
          楼层ID: index + 1,
          发送者: organizationNoticeAccount,
          时间: notice.时间,
          内容: [`兑换到账 ￥${notice.日元}，已扣除 ${notice.点数} 点恶堕积分。`],
        })),
      },
    },
  };
}
