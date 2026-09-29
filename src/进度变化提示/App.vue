<template>
  <section v-if="notices.length" class="progress-report" aria-label="本楼层进度变化" role="status">
    <header class="report-heading">
      <span class="report-mark" aria-hidden="true">✦</span>
      <div>
        <span class="eyebrow">PROGRESS UPDATE</span>
        <h2>进展记录</h2>
      </div>
      <span class="report-count">{{ notices.length }} 项变化</span>
    </header>
    <ul>
      <li v-for="notice in notices" :key="notice.key" :class="notice.kind === '角色阶段' ? 'stage' : 'quest'">
        <span class="kind">{{ notice.kind }}</span>
        <strong>{{ notice.title }}</strong>
        <span class="detail">{{ notice.detail }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type { stat_data } from '../手机界面/types';
import { progressNotices, type ProgressNotice } from './diff';

const notices = ref<ProgressNotice[]>([]);
const messageId = getCurrentMessageId();
let active = true;
const subscriptions: EventOnReturn[] = [];

function refresh() {
  if (!active || messageId < 1) return;
  try {
    const before = Mvu.getMvuData({ type: 'message', message_id: messageId - 1 })?.stat_data as stat_data | undefined;
    const after = Mvu.getMvuData({ type: 'message', message_id: messageId })?.stat_data as stat_data | undefined;
    notices.value = progressNotices(before, after);
  } catch (error) {
    console.error('读取楼层进度变化失败', error);
    notices.value = [];
  }
}

onMounted(async () => {
  await waitGlobalInitialized('Mvu');
  if (!active) return;
  refresh();
  subscriptions.push(eventOn('mag_variable_update_ended', refresh));
  subscriptions.push(eventOn('kat_mvu_update_finished', refresh));
});

onUnmounted(() => {
  active = false;
  subscriptions.forEach(subscription => subscription.stop());
});
</script>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  background: transparent;
}
</style>

<style scoped>
.progress-report {
  box-sizing: border-box;
  width: min(100%, 720px);
  margin: 0 auto;
  padding: 8px;
  color: #f8eef4;
  font:
    13px/1.5 -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    'Noto Sans SC',
    sans-serif;
}
.progress-report * {
  box-sizing: border-box;
}
.report-heading {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px 15px;
  border: 1px solid #614057;
  border-bottom: 0;
  border-radius: 12px 12px 0 0;
  background: linear-gradient(110deg, #29182d, #44243c);
}
.report-mark {
  display: grid;
  flex: 0 0 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #b15f88;
  border-radius: 50%;
  color: #f29bc0;
  font-size: 20px;
}
.eyebrow {
  color: #e996bb;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
}
h2 {
  margin: 0;
  font-size: 16px;
  line-height: 1.3;
}
.report-count {
  margin-left: auto;
  color: #dec1d1;
  font-size: 11px;
  white-space: nowrap;
}
ul {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 5px 14px 9px;
  border: 1px solid #614057;
  border-top: 0;
  border-radius: 0 0 12px 12px;
  background: #1c1322;
  list-style: none;
}
li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 9px;
  min-width: 0;
  padding: 9px 1px;
  overflow-wrap: anywhere;
}
li + li {
  border-top: 1px solid #493047;
}
.kind {
  flex: 0 0 auto;
  padding: 1px 6px;
  border-radius: 4px;
  background: #523045;
  color: #f6accd;
  font-size: 10px;
}
.stage .kind {
  background: #3c3359;
  color: #cbb9ff;
}
strong {
  min-width: 0;
  font-size: 12px;
}
.detail {
  flex-basis: 100%;
  padding-left: 1px;
  color: #dfbbcf;
  font-size: 12px;
  white-space: pre-wrap;
}
@media (prefers-reduced-motion: no-preference) {
  .progress-report {
    animation: report-enter 0.3s ease-out both;
  }
  @keyframes report-enter {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
</style>
