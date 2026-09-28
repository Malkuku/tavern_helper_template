<template>
  <div class="quest-app">
    <header>
      <strong>组织任务</strong><span>{{ balance }} 恶堕积分</span>
    </header>
    <div class="scroll">
      <section class="intro">
        <h1>委托任务</h1>
        <p>每天可免费刷新一次，每次 6 项；同时最多接取 4 项，领奖后释放名额。</p>
        <p>本周已领奖 {{ stats?.current.完成 ?? 0 }}/10 项 · 已接 {{ activeEntries.length }}/4 项</p>
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
        <p v-if="!boardEntries.length" class="empty">暂无候选任务。点击免费刷新获取 6 项任务。</p>
        <article v-for="[name, task] in boardEntries" :key="name" class="card">
          <div class="heading">
            <strong>{{ name }}</strong
            ><span>{{ task.评级 }} 级</span>
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
        <article v-for="[name, task] in activeEntries" :key="name" class="card">
          <div class="heading">
            <strong>{{ name }}</strong
            ><span>{{ task.评级 }} 级</span>
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
        <p class="stats-note">每周目标：领取 10 项任务奖励。统计只保留本周和上周。</p>
        <article v-for="week in visibleWeeks" :key="week.label" class="card">
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
import { taskRefreshState, taskWeekStats, type 任务评级 } from './quests';

const store = useMagicGirlStatStore();
const tab = ref<'board' | 'active' | 'stats'>('board');
const busy = ref(false);
const error = ref('');
const confirmAbandon = ref<string | null>(null);
const balance = computed(() => store.statData?.角色.user.恶堕积分 ?? 0);
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

<style scoped>
.quest-app {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: #30283b;
  background: #f5f3f8;
  font-family: sans-serif;
}
header {
  box-sizing: border-box;
  height: 104px;
  padding: 52px 18px 0;
  display: flex;
  justify-content: space-between;
  background: #faf8fc;
  border-bottom: 1px solid #e8e2ee;
}
header span {
  color: #76519b;
  font-size: 12px;
  font-weight: 700;
}
.scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 17px 40px;
}
.intro {
  padding: 17px;
  border-radius: 18px;
  color: white;
  background: linear-gradient(140deg, #342d54, #76527e);
}
h1 {
  margin: 0;
  font-size: 25px;
}
.intro p {
  font-size: 12px;
  line-height: 1.6;
}
button {
  border: 0;
  border-radius: 10px;
  padding: 9px 12px;
  color: white;
  background: #76519b;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
.intro button {
  background: white;
  color: #55366f;
  margin-right: 7px;
}
.intro button.secondary {
  background: #ffffff26;
  color: white;
}
nav {
  display: flex;
  gap: 7px;
  margin: 16px 0;
}
nav button {
  flex: 1;
  background: #e9e1ef;
  color: #65477b;
}
nav button.selected {
  background: #76519b;
  color: white;
}
.list {
  display: grid;
  gap: 12px;
}
.card {
  padding: 15px;
  border-radius: 16px;
  background: white;
  box-shadow: 0 5px 18px #42334a08;
  display: grid;
  gap: 10px;
}
.heading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
}
.heading span {
  color: #76519b;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.card p {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
}
.goal,
.progress {
  padding: 10px;
  border-radius: 10px;
  background: #f8f4fa;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.progress {
  color: #76519b;
}
.card small {
  color: #76519b;
  font-weight: 700;
}
.secondary {
  background: #e9e1ef;
  color: #65477b;
}
.danger {
  background: #b6375a;
}
.text-button {
  color: #65477b;
  background: transparent;
}
.error {
  color: #b6375a;
  font-size: 12px;
}
.intro .error {
  color: #ffe4ed;
}
.empty,
.stats-note {
  color: #776b80;
  font-size: 13px;
  text-align: center;
  padding: 15px;
}
</style>
