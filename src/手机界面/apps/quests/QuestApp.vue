<template>
  <div class="quest-app">
    <div class="scroll">
      <section class="intro">
        <span class="witch-eyebrow">MEMBER MISSIONS</span>
        <h1>你的任务</h1>
        <p>已接 {{ activeEntries.length }}/4 · 本周已计入 {{ stats?.current.完成 ?? 0 }} 项，必达 KPI 完成 7 项任务</p>
        <button
          type="button"
          :disabled="busy || store.taskRefreshing || !refreshAvailable"
          @click="run(() => store.refreshTaskBoard())"
        >
          {{ store.taskRefreshing ? '生成中…' : refreshAvailable ? '免费刷新 6 项任务' : '今天已刷新' }}
        </button>
        <button v-if="store.taskRefreshing" type="button" class="secondary" @click="store.cancelTaskRefresh()">
          取消等待
        </button>
        <RefreshFeedback v-if="store.taskRefreshing" label="正在生成任务候选" />
        <p v-if="store.taskRefreshError" class="error">{{ store.taskRefreshError }}</p>
        <button
          v-if="store.failedGeneratedResult?.kind === '任务'"
          type="button"
          class="secondary"
          @click="run(() => store.clearFailedGeneratedResult('任务'))"
        >
          清除本楼失败的任务结果
        </button>
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
        <p v-if="!boardEntries.length" class="empty">暂无候选任务。点击免费刷新获取 6 项任务。</p>
        <article v-for="[name, task] in boardEntries" :key="name" class="card" :class="ratingVisualClass(task.评级)">
          <div class="heading">
            <strong>{{ name }}</strong
            ><span class="witch-grade-label">{{ task.评级 }} 级</span>
          </div>
          <p>{{ task.描述 }}</p>
          <div class="goal">目标：{{ task.目标 }}</div>
          <small>奖励 {{ task.奖励 }} 恶堕积分</small>
          <button
            type="button"
            :disabled="busy || activeEntries.length >= 4"
            @click="run(() => store.acceptTask(name))"
          >
            接取任务
          </button>
        </article>
      </div>

      <div v-else-if="tab === 'active'" class="list">
        <p v-if="!activeEntries.length" class="empty">目前没有已接任务。</p>
        <article v-for="[name, task] in activeEntries" :key="name" class="card" :class="ratingVisualClass(task.评级)">
          <div class="heading">
            <strong>{{ name }}</strong
            ><span class="witch-grade-label">{{ task.评级 }} 级</span>
          </div>
          <p>{{ task.描述 }}</p>
          <div class="goal">目标：{{ task.目标 }}</div>
          <div class="progress">{{ task.已完成 ? '已完成 · 待领奖' : task.当前进度 }}</div>
          <small>奖励 {{ task.奖励 }} 恶堕积分</small>
          <button v-if="task.已完成" type="button" :disabled="busy" @click="run(() => store.claimTask(name))">
            领取奖励
          </button>
          <template v-else>
            <button v-if="confirmAbandon === name" type="button" class="danger" :disabled="busy" @click="abandon(name)">
              确认放弃
            </button>
            <button v-else type="button" class="secondary" :disabled="busy" @click="confirmAbandon = name">
              放弃任务
            </button>
            <button v-if="confirmAbandon === name" type="button" class="text-button" @click="confirmAbandon = null">
              取消
            </button>
          </template>
        </article>
      </div>

      <div v-else class="list">
        <p class="stats-note">
          每周须完成至少 7 项任务，完成后领取奖励才计入 KPI；7
          项是达标线，达标后仍可继续完成。未达标可能面临组织问责。统计只保留本周和上周。
        </p>
        <article v-for="week in visibleWeeks" :key="week.label" class="card">
          <div class="heading">
            <strong>{{ week.label }}</strong
            ><span>{{ week.data.周起始 }} 起</span>
          </div>
          <p>已计入 {{ week.data.完成 }} 项 · 已放弃 {{ week.data.放弃 }} 项</p>
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
import { taskRefreshState, taskWeekStats, type 任务评级 } from './quests';
import RefreshFeedback from '../witch/RefreshFeedback.vue';
import { ratingVisualClass } from '../witch/ratingVisual';

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
  stats.value
    ? [
        { label: '本周', data: stats.value.current },
        ...(stats.value.previous ? [{ label: '上周', data: stats.value.previous }] : []),
      ]
    : [],
);
const refreshAvailable = computed(() => {
  try {
    return !!store.statData && taskRefreshState(store.statData).available;
  } catch {
    return false;
  }
});

function ratingSummary(counts: Record<任务评级, number>): string {
  return (['D', 'C', 'B', 'A', 'S'] as const).map(rating => `${rating} ${counts[rating]}`).join(' · ');
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
