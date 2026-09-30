<template>
  <div class="quest-app">
    <div class="scroll">
      <section class="intro">
        <span class="witch-eyebrow">MEMBER MISSIONS</span>
        <h1>你的任务</h1>
        <p>已接 {{ activeEntries.length }}/4 · 本周已领奖 {{ stats?.current.完成 ?? 0 }}/7 项</p>
        <button type="button" :disabled="busy || store.taskRefreshing" @click="run(() => store.refreshTaskBoard())">
          {{ store.taskRefreshing ? '刷新中…' : '刷新任务' }}
        </button>
        <button v-if="store.taskRefreshing" type="button" class="secondary" @click="store.cancelTaskRefresh()">
          取消等待
        </button>
        <RefreshFeedback v-if="store.taskRefreshing" label="正在寻找新任务" />
        <p v-if="store.taskRefreshError" class="error">{{ store.taskRefreshError }}</p>
      </section>

      <nav aria-label="任务页面">
        <button type="button" :class="{ selected: tab === 'board' }" @click="tab = 'board'">
          候选 {{ boardEntries.length }}
        </button>
        <button type="button" :class="{ selected: tab === 'active' }" @click="tab = 'active'">
          已接 {{ activeEntries.length }}
        </button>
        <button type="button" :class="{ selected: tab === 'stats' }" @click="tab = 'stats'">统计</button>
      </nav>

      <div v-if="tab === 'board'" class="list">
        <p v-if="!boardEntries.length" class="empty">目前没有可接的任务，刷新看看。</p>
        <QuestCard v-for="[name, task] in boardEntries" :key="name" :name="name" :task="task" :accepted="false">
          <template #actions>
            <button
              type="button"
              class="quest-card-action"
              :disabled="busy || activeEntries.length >= 4"
              @click="run(() => store.acceptTask(name))"
            >
              接取任务
            </button>
          </template>
        </QuestCard>
      </div>

      <div v-else-if="tab === 'active'" class="list">
        <p v-if="!activeEntries.length" class="empty">目前没有已接任务。</p>
        <QuestCard v-for="[name, task] in activeEntries" :key="name" :name="name" :task="task" :accepted="true">
          <template #actions>
            <button
              v-if="task.已完成"
              type="button"
              class="quest-card-action"
              :disabled="busy"
              @click="run(() => store.claimTask(name))"
            >
              领取奖励
            </button>
            <template v-else>
              <button type="button" class="quest-card-action" :disabled="busy" @click="run(() => prepareQuest(name))">
                推进任务
              </button>
              <button
                v-if="confirmAbandon === name"
                type="button"
                class="quest-card-action danger"
                :disabled="busy"
                @click="abandon(name)"
              >
                确认放弃
              </button>
              <button
                v-else
                type="button"
                class="quest-card-action secondary"
                :disabled="busy"
                @click="confirmAbandon = name"
              >
                放弃任务
              </button>
              <button
                v-if="confirmAbandon === name"
                type="button"
                class="quest-card-action text-button"
                @click="confirmAbandon = null"
              >
                取消
              </button>
            </template>
          </template>
        </QuestCard>
      </div>

      <div v-else class="list">
        <p class="stats-note">
          每周至少完成 7 项任务。完成后记得领取奖励，才算进本周成绩。满 7
          项后仍能继续接任务；若未达成目标，组织可能会找上门。
        </p>
        <article v-if="lifetimeStats" class="card">
          <div class="heading"><strong>累计战绩</strong></div>
          <p>已领奖 {{ lifetimeStats.完成 }} 项 · 已放弃 {{ lifetimeStats.放弃 }} 项</p>
          <div class="goal">完成评级：{{ ratingSummary(lifetimeStats.完成评级) }}</div>
          <div class="goal">放弃评级：{{ ratingSummary(lifetimeStats.放弃评级) }}</div>
        </article>
        <article v-for="week in visibleWeeks" :key="week.data.周起始" class="card">
          <div class="heading">
            <strong>{{ week.label }}</strong
            ><span>{{ week.data.周起始 }} 起</span>
          </div>
          <p>已领奖 {{ week.data.完成 }} 项 · 已放弃 {{ week.data.放弃 }} 项</p>
          <div class="goal">完成评级：{{ ratingSummary(week.data.完成评级) }}</div>
          <div class="goal">放弃评级：{{ ratingSummary(week.data.放弃评级) }}</div>
        </article>
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMagicGirlStatStore } from '../../store/StatStore';
import { taskWeekHistory, taskWeekStats, type 任务评级 } from './quests';
import RefreshFeedback from '../witch/RefreshFeedback.vue';
import QuestCard from './QuestCard.vue';
import { buildQuestPrompt } from './questPrompt';
import type { stat_data } from '../../types';

const store = useMagicGirlStatStore();
const tab = ref<'board' | 'active' | 'stats'>(Object.keys(store.statData?.任务 ?? {}).length ? 'active' : 'board');
const busy = ref(false);
const error = ref('');
const confirmAbandon = ref<string | null>(null);
const boardEntries = computed(() => Object.entries(store.statData?.任务候选 ?? {}));
const activeEntries = computed(() => Object.entries(store.statData?.任务 ?? {}));
const stats = computed(() => {
  try {
    return store.statData ? taskWeekStats(store.statData) : null;
  } catch {
    return null;
  }
});
const visibleWeeks = computed(() =>
  store.statData
    ? taskWeekHistory(store.statData).map(data => ({
        label:
          data.周起始 === stats.value?.current.周起始
            ? '本周'
            : data.周起始 === stats.value?.previous?.周起始
              ? '上周'
              : '往期',
        data,
      }))
    : [],
);
const lifetimeStats = computed(() => {
  if (!store.statData) return null;
  const result = {
    完成: 0,
    放弃: 0,
    完成评级: { D: 0, C: 0, B: 0, A: 0, S: 0 },
    放弃评级: { D: 0, C: 0, B: 0, A: 0, S: 0 },
  };
  for (const week of Object.values(store.statData.任务统计.周记录)) {
    result.完成 += week.完成;
    result.放弃 += week.放弃;
    for (const rating of ['D', 'C', 'B', 'A', 'S'] as const) {
      result.完成评级[rating] += week.完成评级[rating];
      result.放弃评级[rating] += week.放弃评级[rating];
    }
  }
  return result;
});
function ratingSummary(counts: Record<任务评级, number>): string {
  return (['D', 'C', 'B', 'A', 'S'] as const).map(rating => `${rating} ${counts[rating]}`).join(' · ');
}

async function prepareQuest(name: string): Promise<void> {
  const data = getVariables({ type: 'message', message_id: -1 })?.stat_data as stat_data | undefined;
  const prompt = buildQuestPrompt(data, name);
  const input = window.parent.document.querySelector<HTMLTextAreaElement>('#send_textarea');
  if (!input) throw new Error('未找到酒馆聊天输入框。');
  input.value += `${input.value && !input.value.endsWith('\n') ? '\n' : ''}${prompt}`;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
}

async function run(action: () => Promise<unknown>) {
  busy.value = true;
  error.value = '';
  try {
    await action();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '任务操作失败。';
  } finally {
    busy.value = false;
  }
}

function abandon(name: string) {
  void run(async () => {
    await store.abandonTask(name);
    confirmAbandon.value = null;
  });
}
</script>
