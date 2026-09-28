<template>
  <div class="data-intro monitor-intro">
    <span>PERSONA MONITOR</span>
    <h1>心象监测</h1>
  </div>
  <div v-if="mainEntries.length" class="data-selector" aria-label="选择主要角色">
    <button
      v-for="[key] in mainEntries"
      :key="key"
      type="button"
      :class="{ active: selectedMainKey === key }"
      @click="selectedKey = key"
    >
      <span class="selector-avatar">{{ key.slice(0, 1) }}</span
      ><span>{{ key }}</span>
    </button>
  </div>
  <div v-if="selectedMain" class="data-sections">
    <section class="data-hero monitor-hero" :style="heroImageStyle">
      <div class="hero-overline">实时观测 · {{ selectedMain.在场 ? '信号在线' : '信号离线' }}</div>
      <h2>{{ selectedMainKey }}</h2>
      <div class="data-badges">
        <span :class="selectedMain.在场 ? 'badge-live' : ''">{{ selectedMain.在场 ? '在场' : '未在场' }}</span>
      </div>
      <div
        v-if="selectedMainKey && characterImages[selectedMainKey as keyof typeof characterImages]"
        class="monitor-image-picker"
      >
        <button
          v-for="form in imageForms"
          :key="form"
          type="button"
          :class="{ active: imageForm === form }"
          :disabled="form === '恶堕' && !unlockedForms.includes('恶堕')"
          @click="setImageForm(form)"
        >
          {{ form === '恶堕' && !unlockedForms.includes('恶堕') ? '恶堕 · 等级 4 解锁' : form }}
        </button>
        <button v-if="imageCount > 1" type="button" @click="nextImage">{{ imageIndex }} / {{ imageCount }} →</button>
      </div>
    </section>
    <nav class="data-pages" aria-label="角色档案分页">
      <button v-for="item in pages" :key="item" type="button" :class="{ active: page === item }" @click="page = item">
        {{ item }}
      </button>
    </nav>
    <template v-if="page === '心象'">
      <section class="monitor-heading">
        <span>01 / 当前心象</span>
        <h3>心象状态</h3>
      </section>
      <section v-for="[key, stage] in stageEntries" :key="key" class="data-card monitor-card">
        <div class="monitor-card-head">
          <strong>{{ key }}</strong
          ><span>等级 {{ stage.当前等级 }}</span>
        </div>
        <p class="data-prose">{{ currentLevelDescription(stage) || '暂无记录' }}</p>
        <small>累计经验 {{ stage.累计经验 }}</small>
      </section>
    </template>
    <template v-else-if="page === '身体'">
      <section class="monitor-heading">
        <span>02 / 状态观测</span>
        <h3>身体状态</h3>
      </section>
      <section v-if="selectedMain.身体.特殊状态?.length" class="data-card">
        <h3>特殊状态</h3>
        <p class="data-prose">{{ selectedMain.身体.特殊状态.map(formatValue).join('、') }}</p>
      </section>
      <section v-for="[key, part] in bodyEntries" :key="key" class="data-card monitor-card">
        <div class="monitor-card-head">
          <strong>{{ key }}</strong>
        </div>
        <p class="monitor-state">{{ part.当前状态 }}</p>
        <p v-if="part.特征" class="data-prose">{{ part.特征 }}</p>
        <p v-if="part.开发程度" class="data-prose">{{ part.开发程度 }}</p>
      </section>
    </template>
    <template v-else>
      <section class="monitor-heading">
        <span>03 / 人物档案</span>
        <h3>档案线索</h3>
        <p>重要信息需使用恶堕积分解锁</p>
      </section>
      <section class="data-card">
        <h3>基础信息</h3>
        <p class="data-prose">{{ selectedMain.基础信息.姓名 }} · {{ selectedMain.基础信息.身份.join('、') }}</p>
      </section>
      <section class="data-card">
        <h3>当前评级</h3>
        <p class="data-prose">{{ selectedMain.当前评级 || '未记录' }}</p>
      </section>
      <section class="data-card">
        <h3>整体印象</h3>
        <p class="data-prose">{{ selectedMain.外貌.整体印象 || '暂无记录' }}</p>
      </section>
      <LockedField kind="主要角色" :character-key="selectedMainKey!" field="日常外貌"
        ><p class="data-prose">{{ selectedMain.外貌.日常外貌 || '暂无记录' }}</p></LockedField
      >
      <LockedField kind="主要角色" :character-key="selectedMainKey!" field="魔法形态"
        ><p class="data-prose">{{ selectedMain.外貌.魔法少女形态.正常 || '暂无记录' }}</p></LockedField
      >
      <LockedField kind="主要角色" :character-key="selectedMainKey!" field="性格"
        ><p class="data-prose">{{ selectedMain.性格 || '暂无记录' }}</p></LockedField
      >
      <LockedField kind="主要角色" :character-key="selectedMainKey!" field="背景"
        ><p class="data-prose">{{ selectedMain.基础信息.背景 || '暂无记录' }}</p></LockedField
      >
      <LockedField kind="主要角色" :character-key="selectedMainKey!" field="核心能力">
        <p class="data-prose">{{ selectedMain.魔法少女能力.核心能力 || '暂无记录' }}</p>
        <div v-for="[key, value] in entries(selectedMain.魔法少女能力.核心能力限制)" :key="key" class="data-field">
          <span>{{ key }}</span>
          <p>{{ value }}</p>
        </div>
      </LockedField>
      <LockedField kind="主要角色" :character-key="selectedMainKey!" field="核心创伤"
        ><p class="data-prose">{{ selectedMain.核心创伤 || '暂无记录' }}</p></LockedField
      >
    </template>
  </div>
  <div v-else-if="pendingTarget" class="data-sections">
    <section class="data-hero monitor-hero" :style="pendingImageStyle">
      <div class="hero-overline">首次接触目标 · 档案待建立</div>
      <h2>{{ pendingTarget.key }}</h2>
      <div class="data-badges">
        <span>{{ pendingTarget.title }}</span>
      </div>
    </section>
    <p class="data-prose">接触任务已发放。目标的观测档案会在角色数据录入后显示。</p>
  </div>
  <section v-else-if="showFirstChoice" class="first-target-selection" aria-label="选择首位接触目标">
    <div class="first-target-head">
      <small>FIRST CONTACT</small>
      <h2>选择首位接触目标</h2>
      <p>组织已提供四位魔法少女的线索。请选择一位开始接触。</p>
    </div>
    <div v-if="activeChoice" class="first-target-slide">
      <img :src="characterImageUrl(activeChoice.key, '魔法少女')!" :alt="`${activeChoice.key}的魔法少女形态`" />
      <div class="first-target-caption">
        <strong>{{ activeChoice.key }}</strong
        ><span>{{ activeChoice.title }}</span>
      </div>
    </div>
    <div class="first-target-controls">
      <button type="button" aria-label="上一位" @click="moveChoice(-1)">‹</button>
      <span>{{ choiceIndex + 1 }} / {{ choiceOptions.length }}</span>
      <button type="button" aria-label="下一位" @click="moveChoice(1)">›</button>
    </div>
    <button class="first-target-confirm" type="button" :disabled="choosing" @click="chooseTarget">
      {{ choosing ? '正在确认…' : `选择${activeChoice?.key}` }}
    </button>
    <p v-if="choiceError" class="data-error" role="alert">{{ choiceError }}</p>
  </section>
  <div v-else class="data-empty"><strong>暂无主要角色</strong></div>
</template>

<script setup lang="ts">
import type { 角色人设, stat_data } from '../../types';
import { computed, ref, watch } from 'vue';
import { currentLevelDescription, entries } from './entries';
import { isDiscoveredTarget } from '../../store/discoveredTargets';
import { useMagicGirlStatStore } from '../../store/StatStore';
import {
  availableCharacterImageForms,
  characterImageUrl,
  characterImages,
  type CharacterImageForm,
} from './characterImages';
import { firstTargetChoices } from './firstTarget';
import LockedField from './LockedField.vue';

const props = defineProps<{ data: stat_data }>();
const emit = defineEmits<{ firstTargetChosen: [] }>();
const selectedKey = ref<string | null>(null);
const imageForm = ref<CharacterImageForm>('魔法少女');
const imageIndex = ref(1);
const choiceIndex = ref(0);
const choosing = ref(false);
const choiceError = ref('');
const statStore = useMagicGirlStatStore();
const pages = ['心象', '身体', '档案'] as const;
const page = ref<(typeof pages)[number]>('心象');
const mainEntries = computed(() =>
  (Object.entries(props.data.角色?.主要角色 ?? {}) as [string, 角色人设][]).filter(([key]) =>
    isDiscoveredTarget(props.data, key),
  ),
);
const selectedMainKey = computed(() =>
  mainEntries.value.some(([key]) => key === selectedKey.value) ? selectedKey.value : mainEntries.value[0]?.[0],
);
const selectedMain = computed(() => mainEntries.value.find(([key]) => key === selectedMainKey.value)?.[1]);
const imageForms: CharacterImageForm[] = ['日常', '魔法少女', '恶堕'];
const unlockedForms = computed(() => (selectedMain.value ? availableCharacterImageForms(selectedMain.value) : []));
const imageCount = computed(() =>
  selectedMainKey.value
    ? (characterImages[selectedMainKey.value as keyof typeof characterImages]?.[imageForm.value] ?? 0)
    : 0,
);
const heroImageStyle = computed(() => {
  const url =
    selectedMainKey.value && unlockedForms.value.includes(imageForm.value)
      ? characterImageUrl(selectedMainKey.value, imageForm.value, imageIndex.value)
      : null;
  return url
    ? { backgroundImage: `linear-gradient(90deg, rgba(28, 13, 31, .94), rgba(28, 13, 31, .22)), url("${url}")` }
    : {};
});
const choiceOptions = firstTargetChoices;
const activeChoice = computed(() => choiceOptions[choiceIndex.value]);
const showFirstChoice = computed(() => (props.data.系统?.已发现目标?.length ?? 0) === 0);
const pendingTarget = computed(() =>
  firstTargetChoices.find(
    item => props.data.系统?.已发现目标?.includes(item.key) && !props.data.角色?.主要角色?.[item.key],
  ),
);
const pendingImageStyle = computed(() =>
  pendingTarget.value
    ? {
        backgroundImage: `linear-gradient(90deg, rgba(28, 13, 31, .94), rgba(28, 13, 31, .22)), url("${characterImageUrl(pendingTarget.value.key, '魔法少女')}")`,
      }
    : {},
);
const stageEntries = computed(() => entries(selectedMain.value?.人设阶段));
const bodyEntries = computed(() =>
  selectedMain.value
    ? (['小穴', '口穴', '菊穴', '胸部'] as const).map(key => [key, selectedMain.value!.身体[key]] as const)
    : [],
);
watch(selectedMainKey, () => {
  page.value = '心象';
  imageForm.value = '魔法少女';
  imageIndex.value = 1;
});
watch(unlockedForms, forms => {
  if (!forms.includes(imageForm.value)) imageForm.value = '魔法少女';
});
function setImageForm(form: CharacterImageForm) {
  if (!unlockedForms.value.includes(form)) return;
  imageForm.value = form;
  imageIndex.value = 1;
}
function nextImage() {
  imageIndex.value = (imageIndex.value % imageCount.value) + 1;
}
function moveChoice(step: number) {
  choiceIndex.value = (choiceIndex.value + step + choiceOptions.length) % choiceOptions.length;
  choiceError.value = '';
}
async function chooseTarget() {
  if (!activeChoice.value || choosing.value) return;
  choosing.value = true;
  choiceError.value = '';
  try {
    await statStore.chooseFirstTarget(activeChoice.value.key);
    emit('firstTargetChosen');
  } catch (error) {
    choiceError.value = error instanceof Error ? error.message : '目标选择失败，请重试。';
  } finally {
    choosing.value = false;
  }
}
function formatValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}
</script>
