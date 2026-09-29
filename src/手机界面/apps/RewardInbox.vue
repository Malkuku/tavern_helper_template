<template>
  <section class="reward-inbox" aria-label="组织邮件">
    <div class="reward-inbox-heading">
      <span>收件箱</span><small>{{ unreadCount ? `${unreadCount} 封未读` : '邮件已读' }}</small>
    </div>
    <p v-if="!mails.length" class="reward-empty">暂无组织来信</p>
    <template v-else>
      <button
        v-for="mail in mails"
        :key="mail.id"
        type="button"
        class="reward-mail-row"
        :class="{ unread: !mail.已读, selected: selectedId === mail.id }"
        @click="openMail(mail.id)"
      >
        <span class="reward-mail-emblem" aria-hidden="true">✧</span>
        <span class="reward-mail-summary">
          <strong>魔女恶堕计划 · 会员事务部</strong>
          <span>{{ mail.角色 }}的阶段奖励已入账</span>
          <small>{{ mail.时间 }}</small>
        </span>
        <span v-if="!mail.已读" class="reward-mail-dot" aria-label="未读"></span>
      </button>
    </template>
    <article v-if="selectedMail" class="reward-letter" aria-label="奖励邮件正文">
      <div class="reward-letter-art" aria-hidden="true">
        <svg viewBox="0 0 320 104" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="reward-glow" x1="26" y1="5" x2="290" y2="112" gradientUnits="userSpaceOnUse">
              <stop stop-color="#fff1c7" />
              <stop offset=".48" stop-color="#d593c6" />
              <stop offset="1" stop-color="#774eaa" />
            </linearGradient>
          </defs>
          <path
            d="M0 76C49 68 69 22 126 45c33 13 49 51 90 30 41-22 61-44 104-26"
            stroke="url(#reward-glow)"
            stroke-opacity=".38"
          />
          <circle cx="160" cy="52" r="39" stroke="url(#reward-glow)" stroke-opacity=".7" />
          <circle cx="160" cy="52" r="28" stroke="url(#reward-glow)" stroke-opacity=".5" />
          <path d="m160 23 9 20 20 9-20 9-9 20-9-20-20-9 20-9 9-20Z" fill="url(#reward-glow)" />
          <path d="M90 52h25m90 0h25M160 1v12m0 78v12" stroke="url(#reward-glow)" stroke-opacity=".7" />
        </svg>
        <span>PRIVATE MEMBER CORRESPONDENCE</span>
      </div>
      <div class="reward-letter-body">
        <small>魔女恶堕计划 / 会员事务部</small>
        <h2>阶段成果确认函</h2>
        <p class="reward-letter-meta">收件人：计划会员<br />发送时间：{{ selectedMail.时间 }}</p>
        <p>您好：</p>
        <p>
          我们已确认您负责的 {{ selectedMail.评级 }} 级魔法少女「{{ selectedMail.角色 }}」首次进入恶堕等级
          {{ selectedMail.等级 }}。您在推进计划中的投入，已形成可核实的阶段成果。
        </p>
        <div class="reward-letter-credit">
          <span>本次阶段奖励 · 已自动入账</span><strong>+{{ selectedMail.积分 }}</strong
          ><small>恶堕积分</small>
        </div>
        <p>请继续保持当前的推进节奏。每一次有记录的进展，都会成为下一阶段工作的基础。</p>
        <p class="reward-letter-signature">祝工作顺利，<br />魔女恶堕计划<br />会员事务部</p>
        <small class="reward-letter-footer">此为系统自动发送的业务通知，请勿回复。</small>
      </div>
    </article>
    <p v-if="error" role="alert">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMagicGirlStatStore } from '../store/StatStore';

const store = useMagicGirlStatStore();
const mails = computed(() => store.statData?.手机.恶堕奖励.邮件 ?? []);
const unreadCount = computed(() => mails.value.filter(mail => !mail.已读).length);
const selectedId = ref<string | null>(null);
const selectedMail = computed(() => mails.value.find(mail => mail.id === selectedId.value));
const error = ref('');
async function openMail(id: string) {
  selectedId.value = id;
  error.value = '';
  const mail = mails.value.find(item => item.id === id);
  if (!mail || mail.已读) return;
  try {
    await store.readCorruptionRewardMail(id);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '邮件已读状态保存失败。';
  }
}
</script>

<style scoped>
.reward-inbox {
  display: grid;
  gap: 10px;
}
.reward-inbox-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 2px;
}
.reward-inbox-heading span {
  font-size: 15px;
  font-weight: 750;
}
.reward-inbox-heading small,
.reward-empty {
  color: #70798b;
}
.reward-mail-row {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 12px;
  border: 1px solid #e4e4ec;
  border-radius: 15px;
  background: #fff;
  color: #24202d;
  text-align: left;
}
.reward-mail-row.unread {
  border-color: #dbb7d5;
  background: #fff8fd;
}
.reward-mail-row.selected {
  box-shadow: 0 0 0 2px #a45b9b55;
}
.reward-mail-emblem {
  display: grid;
  place-items: center;
  flex: 0 0 36px;
  height: 36px;
  border-radius: 12px;
  background: #372344;
  color: #f1c8d9;
  font-size: 24px;
}
.reward-mail-summary {
  display: grid;
  gap: 3px;
  min-width: 0;
  flex: 1;
}
.reward-mail-summary strong {
  font-size: 12px;
}
.reward-mail-summary span {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.reward-mail-summary small {
  color: #758092;
  font-size: 10px;
}
.reward-mail-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d74c6a;
}
.reward-letter {
  overflow: hidden;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 4px 24px #1f193019;
}
.reward-letter-art {
  position: relative;
  height: 104px;
  background: linear-gradient(140deg, #1c142a, #4d2947 58%, #191128);
}
.reward-letter-art svg {
  width: 100%;
  height: 100%;
}
.reward-letter-art span {
  position: absolute;
  right: 14px;
  bottom: 9px;
  color: #e6c9db;
  font-size: 8px;
  letter-spacing: 1.2px;
}
.reward-letter-body {
  padding: 19px;
  color: #312838;
}
.reward-letter-body > small:first-child {
  color: #855878;
  font-size: 10px;
  letter-spacing: 1px;
}
.reward-letter-body h2 {
  margin: 7px 0 12px;
  text-align: left;
  font-size: 21px;
}
.reward-letter-body p {
  margin: 12px 0;
  color: #4c4350;
  font-size: 13px;
  line-height: 1.7;
}
.reward-letter-body .reward-letter-meta {
  color: #867b89;
  font-size: 11px;
}
.reward-letter-credit {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  margin: 17px 0;
  padding: 14px;
  border: 1px solid #ead3e1;
  border-radius: 12px;
  background: #fbf3f9;
}
.reward-letter-credit span {
  font-size: 11px;
  color: #805574;
}
.reward-letter-credit strong {
  color: #a32e71;
  font-size: 25px;
}
.reward-letter-credit small {
  grid-column: 2;
  color: #805574;
  text-align: right;
}
.reward-letter-body .reward-letter-signature {
  margin-top: 20px;
}
.reward-letter-footer {
  display: block;
  padding-top: 10px;
  border-top: 1px solid #eee5ea;
  color: #988d99;
  font-size: 10px;
}
</style>
