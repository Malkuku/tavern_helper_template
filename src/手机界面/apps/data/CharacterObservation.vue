<template>
  <div class="data-intro monitor-intro">
    <span>CHARACTER OBSERVATION</span>
    <h1>角色观测</h1>
  </div>
  <div v-if="visibleTargets.length" class="observation-switcher">
    <button ref="selectorTrigger" type="button" class="observation-switcher-button" @click="openSelector">
      <span class="selector-avatar" aria-hidden="true">{{ selectedTarget?.key.slice(0, 1) }}</span>
      <span class="selector-copy"
        ><small>正在观测</small><strong>{{ selectedTarget?.key }}</strong></span
      >
      <span class="switcher-chevron" aria-hidden="true">⌄</span>
    </button>
    <span class="observation-switcher-count">{{ selectedIndex }} / {{ visibleTargets.length }}</span>
  </div>
  <Teleport to=".witch-app">
    <div v-if="selectorOpen" class="observation-selector-overlay" @keydown.esc="closeSelector">
      <button type="button" class="observation-selector-backdrop" aria-label="关闭角色选择" @click="closeSelector" />
      <section
        ref="selectorSheet"
        class="observation-selector-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="选择观测角色"
        tabindex="-1"
        @keydown.tab="trapSelectorFocus"
      >
        <div class="observation-selector-head">
          <div>
            <small>CHARACTER OBSERVATION</small>
            <h2>选择角色</h2>
          </div>
          <button type="button" class="observation-selector-close" aria-label="关闭角色选择" @click="closeSelector">
            ×
          </button>
        </div>
        <input
          v-model="selectorSearch"
          class="observation-selector-search"
          type="search"
          placeholder="搜索角色姓名"
          aria-label="搜索角色姓名"
        />
        <div class="observation-selector-list">
          <button
            v-for="target in filteredTargets"
            :key="target.id"
            type="button"
            class="observation-selector-option"
            :class="{ active: selectedTarget?.id === target.id }"
            :aria-current="selectedTarget?.id === target.id ? 'true' : undefined"
            @click="selectTarget(target.id)"
          >
            <span class="selector-avatar" aria-hidden="true">{{ target.key.slice(0, 1) }}</span>
            <span class="selector-copy"
              ><strong>{{ target.key }}</strong
              ><small>{{ target.kind }}</small></span
            >
            <span v-if="selectedTarget?.id === target.id" class="observation-selector-check" aria-hidden="true">✓</span>
          </button>
          <p v-if="!filteredTargets.length" class="observation-selector-empty">没有找到角色</p>
        </div>
      </section>
    </div>
  </Teleport>
  <div v-if="selectedMain || selectedMinor" class="data-sections">
    <section v-if="selectedMain" class="data-hero monitor-hero">
      <CharacterPortrait :src="heroImageUrl" :name="selectedMainKey!" cover />
      <h2>{{ selectedMainKey }}</h2>
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
    <section v-else-if="selectedMinor" class="data-hero monitor-hero minor-hero">
      <CharacterPortrait :src="null" :name="selectedMinorKey!" cover />
      <h2>{{ selectedMinorKey }}</h2>
      <p>{{ selectedMinor.身份.join('、') || '身份未记录' }}</p>
    </section>
    <nav class="data-pages" aria-label="角色档案分页">
      <button v-for="item in pages" :key="item" type="button" :class="{ active: page === item }" @click="page = item">
        {{ item }}
      </button>
    </nav>
    <template v-if="page === '概览'">
      <template v-if="selectedMain">
        <section class="monitor-heading">
          <span>01 / 当前状态</span>
          <h3>心象状态</h3>
        </section>
        <template v-for="[key, stage] in stageEntries" :key="key">
          <LockedField
            v-if="key !== '创伤稳定度'"
            kind="主要角色"
            :character-key="selectedMainKey!"
            :field="key"
            class="observation-stage"
            :data-stage="key"
          >
            <div class="observation-stage-head">
              <span class="observation-stage-icon" aria-hidden="true">{{ stageMeta[key].icon }}</span>
              <span class="observation-stage-meaning">{{ stageMeta[key].meaning }}</span>
              <div class="observation-stage-level">
                <small>等级</small><strong>{{ stage.当前等级 }}</strong>
              </div>
            </div>
            <p class="observation-stage-description">{{ currentLevelDescription(stage) || '暂无记录' }}</p>
          </LockedField>
          <section v-else class="data-card observation-stage" :data-stage="key">
            <div class="observation-stage-head">
              <span class="observation-stage-icon" aria-hidden="true">{{ stageMeta[key].icon }}</span>
              <div class="observation-stage-title">
                <strong>{{ key }}</strong>
                <small>{{ stageMeta[key].meaning }}</small>
              </div>
              <div class="observation-stage-level">
                <small>等级</small><strong>{{ stage.当前等级 }}</strong>
              </div>
            </div>
            <p class="observation-stage-description">{{ currentLevelDescription(stage) || '暂无记录' }}</p>
          </section>
        </template>
      </template>
      <template v-else-if="selectedMinor">
        <section class="monitor-heading">
          <span>01 / 人物概览</span>
          <h3>当前记录</h3>
        </section>
        <section class="data-card">
          <h3>当前评级</h3>
          <p class="data-prose">{{ selectedMinor.当前评级 || '未记录' }}</p>
        </section>
        <section class="data-card">
          <h3>背景</h3>
          <p class="data-prose">{{ selectedMinor.背景 || '暂无记录' }}</p>
        </section>
        <section class="data-card">
          <h3>外貌</h3>
          <p class="data-prose">{{ selectedMinor.外貌 || '暂无记录' }}</p>
        </section>
        <LockedField
          v-if="selectedMinor.人设阶段?.恶堕度"
          kind="次要角色"
          :character-key="selectedMinorKey!"
          field="恶堕度"
          class="observation-stage"
          data-stage="恶堕度"
        >
          <div class="observation-stage-head">
            <span class="observation-stage-icon" aria-hidden="true">✦</span>
            <span class="observation-stage-meaning">恶堕进程</span>
            <div class="observation-stage-level">
              <small>等级</small><strong>{{ selectedMinor.人设阶段.恶堕度.当前等级 }}</strong>
            </div>
          </div>
          <p class="observation-stage-description">
            {{ currentLevelDescription(selectedMinor.人设阶段.恶堕度) || '暂无当前阶段描述' }}
          </p>
        </LockedField>
      </template>
    </template>
    <template v-else-if="page === '身体'">
      <section class="monitor-heading">
        <span>02 / 状态观测</span>
        <h3>身体状态</h3>
      </section>
      <LockedField
        :kind="selectedMain ? '主要角色' : '次要角色'"
        :character-key="(selectedMainKey ?? selectedMinorKey)!"
        field="身体状态"
        class="body-unlock"
      >
        <section v-if="selectedMain?.身体.特殊状态?.length" class="data-card">
          <h3>特殊状态</h3>
          <p class="data-prose">{{ selectedMain.身体.特殊状态.map(formatValue).join('、') }}</p>
        </section>
        <section v-for="[key, part] in bodyEntries" :key="key" class="data-card monitor-card body-observation-card">
          <button
            v-if="part.特征 || part.开发程度"
            type="button"
            class="monitor-card-head body-card-toggle"
            :aria-expanded="expandedBodyParts.includes(key)"
            @click="toggleBodyPart(key)"
          >
            <strong>{{ key }}</strong>
            <span aria-hidden="true">{{ expandedBodyParts.includes(key) ? '⌃' : '⌄' }}</span>
          </button>
          <div v-else class="monitor-card-head">
            <strong>{{ key }}</strong>
          </div>
          <div class="body-current">
            <span>当前状态</span>
            <p>{{ part.当前状态 || '暂无记录' }}</p>
          </div>
          <div v-if="expandedBodyParts.includes(key) && part.特征" class="body-detail">
            <span>特征</span>
            <p>{{ part.特征 }}</p>
          </div>
          <div v-if="expandedBodyParts.includes(key) && part.开发程度" class="body-detail">
            <span>开发程度</span>
            <p>{{ part.开发程度 }}</p>
          </div>
        </section>
        <section v-if="selectedMinor" class="data-card body-observation-card">
          <h3>身体开发状态</h3>
          <ul v-if="selectedMinor.身体开发状态.length" class="body-record-list">
            <li v-for="(state, index) in selectedMinor.身体开发状态" :key="index">{{ state }}</li>
          </ul>
          <p v-if="!selectedMinor.身体开发状态.length" class="data-prose">暂无记录</p>
        </section>
      </LockedField>
    </template>
    <template v-else>
      <section class="monitor-heading">
        <span>03 / 人物档案</span>
        <h3>档案线索</h3>
      </section>
      <template v-if="selectedMain">
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
        <section class="data-card">
          <h3>日常外貌</h3>
          <p class="data-prose">{{ selectedMain.外貌.日常外貌 || '暂无记录' }}</p>
        </section>
        <section class="data-card">
          <h3>魔法形态</h3>
          <p class="data-prose">{{ selectedMain.外貌.魔法少女形态.正常 || '暂无记录' }}</p>
        </section>
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
      <template v-else-if="selectedMinor">
        <LockedField kind="次要角色" :character-key="selectedMinorKey!" field="性格侧写">
          <p class="data-prose">{{ selectedMinor.性格 || '暂无记录' }}</p>
        </LockedField>
        <LockedField kind="次要角色" :character-key="selectedMinorKey!" field="能力描述">
          <p v-for="(ability, index) in selectedMinor.能力描述" :key="index" class="data-prose">{{ ability }}</p>
          <p v-if="!selectedMinor.能力描述.length" class="data-prose">暂无记录</p>
        </LockedField>
      </template>
    </template>
  </div>
  <div v-else-if="pendingTarget" class="data-sections">
    <section class="data-hero monitor-hero">
      <CharacterPortrait :src="characterImageUrl(pendingTarget.key, '魔法少女')" :name="pendingTarget.key" cover />
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
      <CharacterPortrait
        v-for="(choice, index) in choiceOptions"
        v-show="choiceIndex === index"
        :key="choice.key"
        :src="characterImageUrl(choice.key, '魔法少女')!"
        :name="choice.key"
      />
      <div class="first-target-caption">
        <strong>{{ activeChoice.key }}</strong
        ><span>{{ activeChoice.title }}</span>
      </div>
    </div>
    <div v-if="activeChoice" class="first-target-brief">
      <p><strong>已知身份</strong>{{ activeChoice.identity }}</p>
      <p><strong>接触线索</strong>{{ activeChoice.lead }}</p>
      <p><strong>配发物品</strong>{{ activeChoice.item.name }} · {{ activeChoice.item.effect }}</p>
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
  <div v-else class="data-empty"><strong>暂无可观测角色</strong></div>
</template>

<script setup lang="ts">
import type { 角色人设, stat_data, 次要角色人设 } from '../../types';
import { computed, nextTick, ref, watch } from 'vue';
import { currentLevelDescription, entries } from './entries';
import { useMagicGirlStatStore } from '../../store/StatStore';
import {
  availableCharacterImageForms,
  characterImageUrl,
  characterImages,
  type CharacterImageForm,
} from './characterImages';
import { firstTargetChoices } from './firstTarget';
import { visibleObservationTargets } from './observationTargets';
import CharacterPortrait from './CharacterPortrait.vue';
import LockedField from './LockedField.vue';

const props = defineProps<{ data: stat_data; targetKey?: string | null }>();
const emit = defineEmits<{ firstTargetChosen: [] }>();
const selectedId = ref<string | null>(null);
const selectorOpen = ref(false);
const selectorSearch = ref('');
const selectorTrigger = ref<HTMLButtonElement | null>(null);
const selectorSheet = ref<HTMLElement | null>(null);
const imageForm = ref<CharacterImageForm>('魔法少女');
const imageIndex = ref(1);
const choiceIndex = ref(0);
const expandedBodyParts = ref<string[]>([]);
const choosing = ref(false);
const choiceError = ref('');
const statStore = useMagicGirlStatStore();
const pages = ['概览', '身体', '档案'] as const;
const page = ref<(typeof pages)[number]>('概览');
const visibleTargets = computed(() => visibleObservationTargets(props.data));
watch(
  () => props.targetKey,
  key => {
    const target = visibleTargets.value.find(item => item.key === key && item.kind === '主要角色');
    if (target) selectedId.value = target.id;
  },
  { immediate: true },
);
const selectedTarget = computed(
  () => visibleTargets.value.find(target => target.id === selectedId.value) ?? visibleTargets.value[0],
);
const selectedIndex = computed(
  () => visibleTargets.value.findIndex(target => target.id === selectedTarget.value?.id) + 1,
);
const filteredTargets = computed(() =>
  visibleTargets.value.filter(target => target.key.includes(selectorSearch.value.trim())),
);
const selectedMainKey = computed(() =>
  selectedTarget.value?.kind === '主要角色' ? selectedTarget.value.key : undefined,
);
const selectedMinorKey = computed(() =>
  selectedTarget.value?.kind === '次要角色' ? selectedTarget.value.key : undefined,
);
const selectedMain = computed<角色人设 | undefined>(() =>
  selectedMainKey.value ? props.data.角色?.主要角色?.[selectedMainKey.value] : undefined,
);
const selectedMinor = computed<次要角色人设 | undefined>(() =>
  selectedMinorKey.value ? props.data.角色?.次要角色?.[selectedMinorKey.value] : undefined,
);
const imageForms: CharacterImageForm[] = ['日常', '魔法少女', '恶堕'];
const unlockedForms = computed(() => (selectedMain.value ? availableCharacterImageForms(selectedMain.value) : []));
const imageCount = computed(() =>
  selectedMainKey.value
    ? (characterImages[selectedMainKey.value as keyof typeof characterImages]?.[imageForm.value] ?? 0)
    : 0,
);
const heroImageUrl = computed(() =>
  selectedMainKey.value && unlockedForms.value.includes(imageForm.value)
    ? characterImageUrl(selectedMainKey.value, imageForm.value, imageIndex.value)
    : null,
);
const choiceOptions = firstTargetChoices;
const activeChoice = computed(() => choiceOptions[choiceIndex.value]);
const showFirstChoice = computed(() => (props.data.系统?.已发现目标?.length ?? 0) === 0);
const pendingTarget = computed(() =>
  selectedTarget.value?.kind === '档案待建立'
    ? firstTargetChoices.find(item => item.key === selectedTarget.value?.key)
    : undefined,
);
const stageEntries = computed(() => entries(selectedMain.value?.人设阶段));
const stageMeta = {
  创伤稳定度: { icon: '◇', meaning: '心理应对模式' },
  好感度: { icon: '♡', meaning: '关系亲近程度' },
  恶堕度: { icon: '✦', meaning: '恶堕进程' },
} as const;
const bodyEntries = computed(() =>
  selectedMain.value
    ? (['小穴', '口穴', '菊穴', '胸部'] as const).map(key => [key, selectedMain.value!.身体[key]] as const)
    : [],
);
watch(
  () => selectedTarget.value?.id,
  () => {
    page.value = '概览';
    expandedBodyParts.value = [];
    imageForm.value = '魔法少女';
    imageIndex.value = 1;
  },
);
watch(page, () => {
  expandedBodyParts.value = [];
});
watch(unlockedForms, forms => {
  if (!forms.includes(imageForm.value)) imageForm.value = '魔法少女';
});
async function openSelector() {
  selectorSearch.value = '';
  selectorOpen.value = true;
  await nextTick();
  selectorSheet.value?.focus();
}
function trapSelectorFocus(event: KeyboardEvent) {
  const controls = selectorSheet.value?.querySelectorAll<HTMLElement>('button, input');
  if (!controls?.length) return;
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && (document.activeElement === first || document.activeElement === selectorSheet.value)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
function closeSelector() {
  selectorOpen.value = false;
  selectorTrigger.value?.focus();
}
function selectTarget(id: string) {
  selectedId.value = id;
  closeSelector();
}
function setImageForm(form: CharacterImageForm) {
  if (!unlockedForms.value.includes(form)) return;
  imageForm.value = form;
  imageIndex.value = 1;
}
function nextImage() {
  imageIndex.value = (imageIndex.value % imageCount.value) + 1;
}
function toggleBodyPart(key: string) {
  expandedBodyParts.value = expandedBodyParts.value.includes(key)
    ? expandedBodyParts.value.filter(part => part !== key)
    : [...expandedBodyParts.value, key];
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
