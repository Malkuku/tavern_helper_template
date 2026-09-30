<template>
  <div class="witch-app">
    <header class="witch-header">
      <div class="witch-brand">
        <WitchMark class="witch-brand-mark" />
        <div><small>PRIVATE MEMBERSHIP</small><strong>魔女恶堕计划</strong></div>
      </div>
      <CorruptionPointsHelp class="witch-balance">
        <span class="witch-balance-gem" aria-hidden="true">◆</span>
        <strong>{{ balance }}</strong>
      </CorruptionPointsHelp>
    </header>

    <Transition name="witch-page" mode="out-in" appear>
      <div :key="`${tab}:${subpage}`" class="witch-view">
        <div v-if="tab === 'home'" class="witch-home witch-scroll">
          <div class="witch-home-intro">
            <span class="witch-eyebrow">YOUR PRIVATE ACCESS</span>
            <h1>今夜，继续<span>计划。</span></h1>
            <p>任务与回报，都在这里。</p>
          </div>
          <section
            class="witch-focus-card"
            :class="featuredTask && ratingVisualClass(featuredTask[1].评级)"
            aria-label="当前任务"
          >
            <svg class="witch-focus-art" viewBox="0 0 300 210" fill="none" aria-hidden="true">
              <circle cx="233" cy="99" r="62" stroke="currentColor" stroke-opacity=".3" />
              <circle cx="233" cy="99" r="49" stroke="currentColor" stroke-opacity=".35" />
              <path
                d="M233 29c-15 35-40 49-70 70 30 21 55 35 70 70 15-35 40-49 70-70-30-21-55-35-70-70Z"
                stroke="currentColor"
                stroke-opacity=".5"
              />
              <path
                d="M233 58c-8 20-21 31-42 41 21 10 34 21 42 41 8-20 21-31 42-41-21-10-34-21-42-41Z"
                fill="currentColor"
                fill-opacity=".08"
                stroke="currentColor"
              />
              <path
                d="M195 101c14-15 24-19 38-12 14-7 24-3 38 12-14 14-25 22-38 22s-24-8-38-22Z"
                fill="currentColor"
                fill-opacity=".24"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                d="M195 101c15 7 26 9 38 9s23-2 38-9M213 91c8-5 12-5 20 0 8-5 12-5 20 0"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
              />
              <path d="M233 130c-4 6-4 9 0 12 4-3 4-6 0-12Z" fill="currentColor" fill-opacity=".65" />
            </svg>
            <div class="witch-focus-top">
              <span>当前任务</span>
              <span v-if="featuredTask">{{ featuredTask[1].已完成 ? '待领取' : `${featuredTask[1].评级} 级` }}</span>
            </div>
            <template v-if="featuredTask">
              <h2>{{ featuredTask[0] }}</h2>
              <p>{{ featuredTask[1].目标 }}</p>
              <div class="witch-focus-foot">
                <span>{{ featuredTask[1].已完成 ? '目标已完成' : featuredTask[1].当前进度 }}</span>
                <strong>+{{ featuredTask[1].奖励 }} 积分</strong>
              </div>
              <button type="button" class="witch-main-action" @click="openTasks">
                {{ featuredTask[1].已完成 ? '领取奖励' : '查看任务' }} <span aria-hidden="true">↗</span>
              </button>
            </template>
            <template v-else>
              <h2>{{ store.statData ? '等待你的下一项任务' : '计划尚未就绪' }}</h2>
              <p>{{ store.statData ? '从任务列表挑选行动。' : '暂时无法查看计划，请稍后再试。' }}</p>
              <button v-if="store.statData" type="button" class="witch-main-action" @click="openTasks">
                前往任务 <span aria-hidden="true">↗</span>
              </button>
            </template>
          </section>
          <section v-if="store.statData" class="witch-week" aria-label="本周任务进度">
            <div class="witch-section-heading">
              <span>本周目标 · 完成 7 项任务</span><strong>已领奖 {{ weeklyDone }} 项</strong>
            </div>
            <div class="witch-progress-track">
              <span :style="{ width: `${Math.min(weeklyDone / 7, 1) * 100}%` }"></span>
            </div>
            <p>
              {{ weeklyDone < 7 ? `再完成并领奖 ${7 - weeklyDone} 项` : '本周目标已达成，还能继续接任务' }} ·
              {{ readyToClaim }} 项待领取
            </p>
          </section>
          <button type="button" class="witch-home-link" @click="tab = 'shop'">
            <span><small>MEMBER BENEFITS</small><strong>探索专属兑换</strong></span>
            <span aria-hidden="true">↗</span>
          </button>
        </div>

        <QuestApp v-else-if="tab === 'tasks'" />

        <DataApp
          v-else-if="tab === 'observe'"
          app="主要角色"
          :target-key="props.openRequest?.tab === 'observe' ? props.openRequest.target : null"
          :target-request-id="props.openRequest?.tab === 'observe' ? props.openRequest.id : null"
          @first-target-chosen="selectTab('tasks')"
        />

        <template v-else-if="tab === 'shop'">
          <div class="witch-subnav" role="tablist" aria-label="商店分类">
            <button
              type="button"
              role="tab"
              :aria-selected="subpage === '技能商店'"
              :class="{ active: subpage === '技能商店' }"
              @click="subpage = '技能商店'"
            >
              技能
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="subpage === '道具商店'"
              :class="{ active: subpage === '道具商店' }"
              @click="subpage = '道具商店'"
            >
              道具
            </button>
          </div>
          <SkillShop v-if="subpage !== '道具商店'" />
          <ItemShop v-else />
        </template>

        <template v-else>
          <div class="witch-subnav witch-subnav-three" role="tablist" aria-label="我的资产">
            <button
              type="button"
              role="tab"
              :aria-selected="subpage === '我的档案'"
              :class="{ active: subpage === '我的档案' }"
              @click="subpage = '我的档案'"
            >
              档案
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="subpage === '技能'"
              :class="{ active: subpage === '技能' }"
              @click="subpage = '技能'"
            >
              技能
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="subpage === '随身物品'"
              :class="{ active: subpage === '随身物品' }"
              @click="subpage = '随身物品'"
            >
              物品
            </button>
          </div>
          <DataApp :app="minePage" />
        </template>
      </div>
    </Transition>

    <nav class="witch-bottom-nav" aria-label="魔女恶堕计划导航">
      <button
        v-for="item in tabs"
        :key="item.key"
        type="button"
        :class="{ active: tab === item.key }"
        :aria-current="tab === item.key ? 'page' : undefined"
        @click="selectTab(item.key)"
      >
        <WitchNavIcon :name="item.key" />
        <span>{{ item.label }}</span>
        <span v-if="item.key === 'tasks' && taskNotices.length" class="witch-nav-dot" aria-label="任务有待办"></span>
        <span
          v-if="item.key === 'observe' && stabilityNotices.length"
          class="witch-nav-dot witch-nav-dot-warning"
          aria-label="观测角色稳定度警告"
        ></span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMagicGirlStatStore } from '../../store/StatStore';
import { taskWeekStats } from '../quests/quests';
import { witchStabilityNotices, witchTaskNotices } from './witchNotifications';
import { ratingVisualClass } from './ratingVisual';
import CorruptionPointsHelp from './CorruptionPointsHelp.vue';
import type { DataAppName } from '../../desktopApps';
import DataApp from '../data/DataApp.vue';
import QuestApp from '../quests/QuestApp.vue';
import SkillShop from '../skillShop/SkillShop.vue';
import ItemShop from '../itemShop/ItemShop.vue';
import WitchMark from './WitchMark.vue';
import WitchNavIcon from './WitchNavIcon.vue';
import './witch.css';

type Tab = 'home' | 'tasks' | 'observe' | 'shop' | 'mine';
const tabs: { key: Tab; label: string }[] = [
  { key: 'home', label: '首页' },
  { key: 'tasks', label: '任务' },
  { key: 'observe', label: '观测' },
  { key: 'shop', label: '商店' },
  { key: 'mine', label: '我的' },
];
const store = useMagicGirlStatStore();
const props = defineProps<{
  openRequest?: {
    tab: 'tasks' | 'observe' | 'shop';
    target?: string;
    shop?: '技能商店' | '道具商店';
    id: number;
  } | null;
}>();
const needsFirstTarget = (data: typeof store.statData) => data?.系统?.已发现目标?.length === 0;
const tab = ref<Tab>(needsFirstTarget(store.statData) ? 'observe' : 'home');
const subpage = ref('');
let waitingForInitialData = !store.statData;
watch(
  () => store.statData,
  data => {
    if (!waitingForInitialData || !data) return;
    waitingForInitialData = false;
    if (needsFirstTarget(data)) {
      tab.value = 'observe';
    }
  },
);
watch(
  () => props.openRequest,
  request => {
    if (request && (request.tab === 'shop' || !needsFirstTarget(store.statData))) {
      selectTab(request.tab);
      if (request.tab === 'shop' && request.shop) subpage.value = request.shop;
    }
  },
  { immediate: true },
);
const minePage = computed<DataAppName>(() =>
  subpage.value === '技能' || subpage.value === '随身物品' ? subpage.value : '我的档案',
);
const balance = computed(() => store.statData?.角色?.user?.恶堕积分 ?? '—');
const activeTasks = computed(() => Object.entries(store.statData?.任务 ?? {}));
const featuredTask = computed(() => activeTasks.value.find(([, item]) => item.已完成) ?? activeTasks.value[0]);
const readyToClaim = computed(() => activeTasks.value.filter(([, item]) => item.已完成).length);
const taskNotices = computed(() => witchTaskNotices(store.statData));
const stabilityNotices = computed(() => witchStabilityNotices(store.statData));
const weeklyDone = computed(() => {
  try {
    return store.statData ? taskWeekStats(store.statData).current.完成 : 0;
  } catch {
    return 0;
  }
});
function selectTab(next: Tab) {
  waitingForInitialData = false;
  if (tab.value === next) return;
  tab.value = next;
  subpage.value = next === 'shop' ? '技能商店' : '我的档案';
}
function openTasks() {
  selectTab('tasks');
}
</script>
