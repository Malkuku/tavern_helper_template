<template>
  <div class="ac-skill-manager">
    <!-- 顶部状态栏 -->
    <header class="manager-header">
      <div class="header-title-area">
        <div class="header-title">
          <span class="animus-icon"></span>
          <h2>秘术研习 / SKILL MASTERY</h2>
        </div>

        <!-- 新增：角色切换器 -->
        <div class="character-selector">
          <select
            v-model="activeCharacterKey"
            class="ac-select"
            :disabled="hasUnsavedChanges || isSaving"
            @change="handleCharacterChange"
          >
            <option value="user">玩家 (User)</option>
            <option
              v-for="name in mainCharacterNames"
              :key="name"
              :value="name"
            >
              {{ name }}
            </option>
          </select>
        </div>
      </div>

      <div class="header-actions">
        <div v-if="hasUnsavedChanges" class="unsaved-warning">
          <span class="blink">⚠</span> 未同步 (请先保存再切换角色)
        </div>
        <button
          class="ac-btn save-btn"
          :class="{ 'is-active': hasUnsavedChanges }"
          :disabled="!hasUnsavedChanges || isSaving"
          @click="saveAllChanges"
        >
          <span v-if="isSaving">研习中...</span>
          <span v-else>确认研习</span>
        </button>
      </div>
    </header>

    <!-- 分类筛选栏 (按性相) -->
    <div class="category-bar-wrapper">
      <div class="category-scroll">
        <button
          v-for="cat in categories"
          :key="cat"
          class="cat-btn"
          :class="{ active: activeCategory === cat }"
          @click="activeCategory = cat"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <!-- 主体双栏区域 -->
    <div class="manager-body">
      <!-- 移动端 Tab 切换栏 -->
      <div class="mobile-tabs">
        <div
          class="mobile-tab-item"
          :class="{ active: activeMobileTab === 'equipped' }"
          @click="activeMobileTab = 'equipped'"
        >
          已装备 ({{ equippedList.length }})
        </div>
        <div
          class="mobile-tab-item"
          :class="{ active: activeMobileTab === 'library' }"
          @click="activeMobileTab = 'library'"
        >
          技能库 ({{ libraryList.length }})
        </div>
      </div>

      <!-- 左侧：已装备技能 -->
      <div
        class="pane equipped-pane"
        :class="{ 'mobile-hidden': activeMobileTab !== 'equipped' }"
      >
        <div class="pane-header">
          <div class="title-group">
            <h3>铭记 <small>EQUIPPED</small></h3>
          </div>
          <div class="header-controls">
            <input v-model="searchQuery" placeholder="检索..." class="ac-input" />
          </div>
        </div>

        <div class="item-grid custom-scroll">
          <div
            v-for="skill in equippedList"
            :key="skill.name"
            class="skill-card"
            :class="[
              getAspectClass(skill.raw.性相),
              { 'is-modified': skill.isModified },
              { 'is-expanded': activeItemId === 'eq-' + skill.name }
            ]"
            @click="toggleItemExpand(skill, 'toLibrary', 'eq')"
          >
            <div class="skill-header">
              <div class="skill-title-group">
                <span class="skill-icon" v-html="getAspectIcon(skill.raw.性相)"></span>
                <strong v-fit-text class="skill-name" :title="skill.name"><span class="skill-name-text" data-fit-text-content>{{ skill.name }}</span></strong>
              </div>
              <div class="skill-meta">
                <span class="skill-level-badge">Lv.{{ skill.raw.技能等级 }}</span>
                <span class="skill-aspect-tag">{{ skill.raw.性相 }}</span>
              </div>
            </div>

            <!-- 展开区域 -->
            <div v-if="activeItemId === 'eq-' + skill.name" class="expanded-panel" @click.stop>
              <div class="skill-body">
                <p class="skill-desc">{{ skill.raw.描述 }}</p>
                <div class="skill-details">
                  <div class="detail-row cost">
                    <span class="label">消耗:</span>
                    <span class="value">{{ formatSkillText(skill.raw.消耗, skill.raw) }}</span>
                  </div>
                  <div class="detail-row effect">
                    <span class="label">作用:</span>
                    <span class="value">{{ formatSkillText(skill.raw.作用, skill.raw) }}</span>
                  </div>
                </div>
              </div>

              <div class="transfer-action-bar">
                <!-- 新增：使用技能按钮 -->
                <button class="mini-confirm-btn use-btn" @click="handleUseSkill(skill)">
                  ⚡ 施放
                </button>

                <button class="mini-confirm-btn unequip-btn" @click="confirmTransfer">
                  遗忘 ➔
                </button>
              </div>
            </div>
          </div>
          <div v-if="equippedList.length === 0" class="empty-state">
            {{ activeCategory !== '全部' ? '该性相下无装备技能' : '意识空空如也' }}
          </div>
        </div>
      </div>

      <!-- 中间：装饰性连接符 -->
      <div class="divider-column">
        <div class="arrow-icon">⇄</div>
      </div>

      <!-- 右侧：技能库 -->
      <div
        class="pane library-pane"
        :class="{ 'mobile-hidden': activeMobileTab !== 'library' }"
      >
        <div class="pane-header">
          <div class="title-group">
            <h3>典籍 <small>LIBRARY</small></h3>
          </div>
        </div>

        <div class="item-grid custom-scroll">
          <div
            v-for="skill in libraryList"
            :key="skill.name"
            class="skill-card"
            :class="[
              getAspectClass(skill.raw.性相),
              { 'is-modified': skill.isModified },
              { 'is-expanded': activeItemId === 'lib-' + skill.name }
            ]"
            @click="toggleItemExpand(skill, 'toEquipped', 'lib')"
          >
            <div class="skill-header">
              <div class="skill-title-group">
                <span class="skill-icon" v-html="getAspectIcon(skill.raw.性相)"></span>
                <strong v-fit-text class="skill-name" :title="skill.name"><span class="skill-name-text" data-fit-text-content>{{ skill.name }}</span></strong>
              </div>
              <div class="skill-meta">
                <span class="skill-level-badge">Lv.{{ skill.raw.技能等级 }}</span>
                <span class="skill-aspect-tag">{{ skill.raw.性相 }}</span>
              </div>
            </div>

            <!-- 展开区域 -->
            <div v-if="activeItemId === 'lib-' + skill.name" class="expanded-panel" @click.stop>
              <div class="skill-body">
                <p class="skill-desc">{{ skill.raw.描述 }}</p>
                <div class="skill-details">
                  <div class="detail-row cost">
                    <span class="label">消耗:</span>
                    <span class="value">{{ formatSkillText(skill.raw.消耗, skill.raw) }}</span>
                  </div>
                  <div class="detail-row effect">
                    <span class="label">作用:</span>
                    <span class="value">{{ formatSkillText(skill.raw.作用, skill.raw) }}</span>
                  </div>
                </div>
              </div>

              <!-- 装备条件校验 -->
              <div class="transfer-action-bar">
                <div v-if="!canEquip(skill)" class="requirement-warning">
                  ⚠ 术之等级不足 (需 {{ skill.raw.性相 }} Lv.{{ skill.raw.技能等级 }}, 当前 Lv.{{ getUserArtLevel(skill.raw.性相) }})
                </div>
                <div v-else class="requirement-met">
                  ✓ 满足条件 (当前 {{ skill.raw.性相 }} Lv.{{ getUserArtLevel(skill.raw.性相) }})
                </div>

                <button
                  class="mini-confirm-btn equip-btn"
                  :disabled="!canEquip(skill)"
                  @click="confirmTransfer"
                >
                  ➔ 铭记
                </button>
              </div>
            </div>
          </div>
          <div v-if="libraryList.length === 0" class="empty-state">
            {{ activeCategory !== '全部' ? '该性相下无典籍' : '技能库空置' }}
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router'; // 新增：引入路由
import { useStatStore } from '@/尘史使徒/UI/store/StatStore';
import { MvuUtil } from '@/Utils/MvuUtil';
import { MessageUtil } from '@/Utils/MessageUtil';
import { useUiStore } from '@/尘史使徒/UI/store/UIStore';
import { vFitText } from '@/尘史使徒/UI/util/fitText';

// --- 状态定义 ---
const router = useRouter(); // 新增：初始化路由
const statStore = useStatStore();
const localEquipped = ref({});
const localLibrary = ref({});
const userArts = ref({}); // 存储当前选中角色的术之等级
const hasUnsavedChanges = ref(false);
const isSaving = ref(false);
const searchQuery = ref('');
const uiStore = useUiStore();

// 角色切换状态
const activeCharacterKey = ref('user');

// 分类状态
const activeCategory = ref('全部');
const activeMobileTab = ref('equipped');

// 交互状态
const activeItemId = ref(null);
const pendingTransferItem = ref(null);
const pendingTransferDirection = ref('');

// --- 初始化与角色数据获取 ---
onMounted(() => {
  resetData();
});

// 获取主要角色列表
const mainCharacterNames = computed(() => {
  const mainChars = statStore.stat_data?.角色?.主要角色 || {};
  return Object.keys(mainChars);
});

// 动态获取当前选中角色的数据引用
function getActiveCharacterData() {
  if (activeCharacterKey.value === 'user') {
    return statStore.stat_data?.角色?.user || {};
  } else {
    return statStore.stat_data?.角色?.主要角色?.[activeCharacterKey.value] || {};
  }
}

function handleCharacterChange() {
  resetData();
}

function resetData() {
  const charData = getActiveCharacterData();

  // 兼容处理：如果主要角色的技能是字符串(如"与某某共享")，这里做个容错，默认给空对象
  const rawEquipped = typeof charData.技能 === 'object' ? charData.技能 : {};
  const rawLibrary = statStore.stat_data?.技能库 || {};

  // 获取当前角色的术之等级用于校验
  userArts.value = typeof charData.术之等级 === 'object' ? charData.术之等级 : {};

  localEquipped.value = JSON.parse(JSON.stringify(rawEquipped));
  localLibrary.value = JSON.parse(JSON.stringify(rawLibrary));

  hasUnsavedChanges.value = false;
  activeItemId.value = null;
  // 切换角色时不重置 activeCategory，保持用户筛选习惯
}

// --- 数据处理 ---
const categories = computed(() => {
  const aspects = new Set();
  const collectAspects = (obj) => {
    Object.entries(obj).forEach(([key, val]) => {
      if (key !== '$template' && val.性相) {
        aspects.add(val.性相);
      }
    });
  };
  collectAspects(localEquipped.value);
  collectAspects(localLibrary.value);
  return ['全部', ...Array.from(aspects).sort()];
});

const processList = (sourceObj) => {
  return Object.entries(sourceObj)
    .filter(([key]) => key !== '$template')
    .map(([key, val]) => ({
      name: key,
      isModified: val.isModified || false,
      raw: val
    }))
    .filter(item => {
      if (searchQuery.value) {
        const query = searchQuery.value;
        const matchesSearch = item.name.includes(query) ||
          (item.raw.性相 && item.raw.性相.includes(query));
        if (!matchesSearch) return false;
      }
      if (activeCategory.value !== '全部') {
        if (item.raw.性相 !== activeCategory.value) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.isModified && !b.isModified) return -1;
      if (!a.isModified && b.isModified) return 1;
      // 按等级降序，同等级按名称
      if (b.raw.技能等级 !== a.raw.技能等级) return b.raw.技能等级 - a.raw.技能等级;
      return a.name.localeCompare(b.name);
    });
};

const equippedList = computed(() => processList(localEquipped.value));
const libraryList = computed(() => processList(localLibrary.value));

// --- 核心校验逻辑 ---
function getUserArtLevel(aspect) {
  if (!userArts.value[aspect]) return 0;
  return userArts.value[aspect].等级 || 0;
}

function canEquip(skill) {
  const aspect = skill.raw.性相;
  const reqLevel = skill.raw.技能等级 || 0;
  const currentLevel = getUserArtLevel(aspect);
  return currentLevel >= reqLevel;
}

// --- 交互逻辑 ---
function toggleItemExpand(item, direction, prefix) {
  const id = `${prefix}-${item.name}`;
  if (activeItemId.value === id) {
    closeTransfer();
  } else {
    activeItemId.value = id;
    pendingTransferItem.value = item;
    pendingTransferDirection.value = direction;
  }
}

function closeTransfer() {
  activeItemId.value = null;
  pendingTransferItem.value = null;
}

function confirmTransfer() {
  if (!pendingTransferItem.value) return;

  const item = pendingTransferItem.value;
  const direction = pendingTransferDirection.value;

  const isEquipping = direction === 'toEquipped';

  // 再次校验防止异常操作
  if (isEquipping && !canEquip(item)) return;

  const sourceObj = isEquipping ? localLibrary.value : localEquipped.value;
  const targetObj = isEquipping ? localEquipped.value : localLibrary.value;

  // 技能是唯一实体，直接转移
  if (sourceObj[item.name]) {
    delete sourceObj[item.name];
  }

  targetObj[item.name] = {
    ...item.raw,
    "isModified": true
  };

  hasUnsavedChanges.value = true;
  closeTransfer();
}

// --- 新增：使用技能逻辑 ---
function handleUseSkill(skill) {
  const skillName = skill.name;
  let logText = '';

  if (activeCharacterKey.value === 'user') {
    logText = `<user>将要使用${skillName}`;
  } else {
    logText = `<user>希望让${activeCharacterKey.value}使用${skillName}`;
  }
  uiStore.setPendingInput(logText);
  router.push('/选项');
}

// --- 文本格式化与图标 ---
const formatSkillText = (text, currentSkill) => {
  if (!text || typeof text !== 'string') return text || '无';

  // 动态获取当前角色的数值用于文本解析
  const stats = getActiveCharacterData();

  return text.replace(/\$\{([^}]+)\}/g, (match, key) => {
    if (key === '技能等级') return `技能等级[${currentSkill.技能等级}]`;
    if (stats['基础数值'] && stats['基础数值'][key] !== undefined) {
      return `${key}[${stats['基础数值'][key]}]`;
    }
    if (stats['术之等级'] && stats['术之等级'][key]) {
      return `${key}[${stats['术之等级'][key]['等级']}]`;
    }
    return match;
  });
};

const getAspectIcon = (aspect) => {
  const baseSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:100%;height:100%;">`;
  const icons = {
    '刃': `${baseSvg}<path d="M12 2v20M9 7l3-4 3 4M8 11h8"/></svg>`,
    '杯': `${baseSvg}<path d="M7 3h10M7 3v4c0 3 2.5 5.5 5 5.5s5-2.5 5-5V3M12 12.5V21M8 21h8M12 7v.01"/></svg>`,
    '铸': `${baseSvg}<path d="M12 22c4.4 0 8-3.6 8-8 0-5-4-9-8-12-4 3-8 7-8 12 0 4.4 3.6 8 8 8z"/><path d="M12 22c-2 0-3.5-1.5-3.5-3.5 0-2.5 2-4.5 3.5-6.5 1.5 2 3.5 4 3.5 6.5 0 2-1.5 3.5-3.5 3.5z"/></svg>`,
    '蛾': `${baseSvg}<path d="M12 22v-6M12 16c-4 0-8-2-8-8 0-4 3-6 8-6s8 2 8 6c0 6-4 8-8 8z"/><path d="M12 16c-2 0-4-1-4-4 0-2 1.5-3 4-3s4 1 4 3c0 3-2 4-4 4z"/></svg>`,
    '心': `${baseSvg}<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/><path d="M12 15l-3-3 1.5-1.5L12 12l3-3 1.5 1.5-4.5 4.5z"/></svg>`,
    '灯': `${baseSvg}<path d="M12 2L2 12l10 10 10-10L12 2z"/><circle cx="12" cy="12" r="3"/><path d="M12 9v.01M12 15v.01"/></svg>`,
    '冬': `${baseSvg}<path d="M21 7.5V16.5L13.5 21H10.5L3 16.5V7.5L10.5 3H13.5L21 7.5Z"/><path d="M12 3v18M3 7.5l18 9M3 16.5l18-9"/></svg>`,
    '启': `${baseSvg}<circle cx="12" cy="9" r="4"/><path d="M10.5 12.5L9 21h6l-1.5-8.5"/></svg>`
  };
  return icons[aspect] || `${baseSvg}<path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></svg>`;
};

const getAspectClass = (aspect) => {
  const map = {
    '刃': 'aspect-edge', '杯': 'aspect-grail', '铸': 'aspect-forge',
    '蛾': 'aspect-moth', '心': 'aspect-heart', '灯': 'aspect-lantern',
    '冬': 'aspect-winter', '启': 'aspect-knock'
  };
  return map[aspect] || 'aspect-generic';
};

// --- 保存逻辑 ---
function cleanData(item) {
  const { isModified, ...rest } = item;
  return rest;
}

function addToPayload(root, pathArr, key, value) {
  let current = root;
  pathArr.forEach(pathKey => {
    if (!current[pathKey]) current[pathKey] = {};
    current = current[pathKey];
  });
  current[key] = value;
}

function generateDiff(localObj, remoteObj, pathArr, payload) {
  const allKeys = new Set([...Object.keys(localObj), ...Object.keys(remoteObj)]);

  allKeys.forEach(key => {
    if (key === '$template') return;
    const localItem = localObj[key];
    const remoteItem = remoteObj[key];

    if (remoteItem && !localItem) {
      // 远程有，本地没有 -> 删除
      addToPayload(payload, pathArr, key, null);
    } else if (localItem && !remoteItem) {
      // 本地有，远程没有 -> 新增
      addToPayload(payload, pathArr, key, cleanData(localItem));
    } else if (localItem && remoteItem) {
      // 都有 -> 检查更新
      const cleanLocal = cleanData(localItem);
      if (JSON.stringify(cleanLocal) !== JSON.stringify(remoteItem)) {
        addToPayload(payload, pathArr, key, cleanLocal);
      }
    }
  });
}

async function saveAllChanges() {
  if (isSaving.value) return;
  isSaving.value = true;

  try {
    // 直接使用单一的 payload 对象
    const mergedPayload = {};

    // 动态获取当前角色的远程数据和保存路径
    const charData = getActiveCharacterData();
    const remoteEquipped = typeof charData.技能 === 'object' ? charData.技能 : {};
    const remoteLibrary = statStore.stat_data?.技能库 || {};

    const characterSkillPath = activeCharacterKey.value === 'user'
      ? ['角色', 'user', '技能']
      : ['角色', '主要角色', activeCharacterKey.value, '技能'];

    // 直接将差异写入 mergedPayload
    generateDiff(localEquipped.value, remoteEquipped, characterSkillPath, mergedPayload);
    generateDiff(localLibrary.value, remoteLibrary, ['技能库'], mergedPayload);

    // 如果有差异，则调用 MvuUtil 更新
    if (Object.keys(mergedPayload).length > 0) {
      await MvuUtil.updateMvuDataByDiff(mergedPayload);
    }

    // 记录日志
    const exchangeLogs = [];
    const allNames = new Set([
      ...Object.keys(remoteEquipped), ...Object.keys(localEquipped.value)
    ]);

    allNames.forEach(name => {
      if (name === '$template') return;
      const wasEquipped = !!remoteEquipped[name];
      const isEquipped = !!localEquipped.value[name];

      if (!wasEquipped && isEquipped) {
        exchangeLogs.push(`铭记了技能 [${name}]`);
      } else if (wasEquipped && !isEquipped) {
        exchangeLogs.push(`遗忘了技能 [${name}]`);
      }
    });

    if (exchangeLogs.length > 0) {
      const logName = activeCharacterKey.value === 'user' ? 'user' : activeCharacterKey.value;
      const logText = `\n<systemLog>\n<${logName}>调整了意识深处的秘术:\n${exchangeLogs.join('\n')}\n</systemLog>\n`;
      const lastMsgId = typeof getLastMessageId === 'function' ? getLastMessageId() : -1;
      await MessageUtil.mergeContentToMessage(lastMsgId, logText, 'none');
    }

    hasUnsavedChanges.value = false;
    Object.values(localEquipped.value).forEach(i => i.isModified = false);
    Object.values(localLibrary.value).forEach(i => i.isModified = false);
    activeItemId.value = null;

  } catch (e) {
    console.error("Skill Sync Failed:", e);
  } finally {
    isSaving.value = false;
  }
}

</script>

<style scoped>
/* --- 基础变量与布局 --- */
.ac-skill-manager {
  --c-gold: #d4af37;
  --c-gold-dim: rgba(212, 175, 55, 0.3);
  --c-bg: #0f0f13;
  --c-bg-panel: #16161a;
  --c-text: #e0e0e0;
  --c-danger: #ff4d4d;
  --font-title: 'Cinzel', 'Georgia', serif;
  --font-body: 'EB Garamond', 'Segoe UI', serif;

  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  width: 100%;
  background: var(--c-bg);
  color: var(--c-text);
  font-family: var(--font-body);
  overflow: hidden;
}

/* --- 头部 --- */
.manager-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 15px 20px; border-bottom: 2px solid var(--c-gold);
  background: linear-gradient(to right, rgba(0,0,0,0.8), transparent);
  flex-shrink: 0;
}
.header-title-area { display: flex; align-items: center; gap: 20px; }
.header-title { display: flex; align-items: center; gap: 10px; }
.header-title h2 { margin: 0; font-family: var(--font-title); color: var(--c-gold); font-size: 1.4rem; }
.animus-icon { width: 10px; height: 10px; background: var(--c-gold); transform: rotate(45deg); box-shadow: 0 0 8px var(--c-gold); }

/* 新增：角色选择器样式 */
.character-selector { display: flex; align-items: center; }
.ac-select {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--c-gold-dim);
  color: var(--c-gold);
  padding: 6px 12px;
  font-family: var(--font-title);
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
  transition: all 0.3s;
}
.ac-select:hover:not(:disabled) { border-color: var(--c-gold); box-shadow: 0 0 8px var(--c-gold-dim); }
.ac-select:disabled { opacity: 0.5; cursor: not-allowed; border-color: #444; color: #888; }
.ac-select option { background: var(--c-bg-panel); color: var(--c-text); }

.header-actions { display: flex; align-items: center; gap: 15px; }
.unsaved-warning { color: var(--c-gold); font-size: 0.9rem; font-family: var(--font-title); }
.blink { animation: blink 1.5s infinite; }
@keyframes blink { 50% { opacity: 0; } }

.ac-btn {
  background: transparent; border: 1px solid var(--c-gold-dim); color: var(--c-gold);
  padding: 8px 16px; font-family: var(--font-title); cursor: pointer; transition: all 0.3s;
  text-transform: uppercase; font-size: 0.85rem;
}
.ac-btn:hover:not(:disabled) { background: var(--c-gold); color: #000; box-shadow: 0 0 15px var(--c-gold-dim); }
.ac-btn:disabled { opacity: 0.3; cursor: not-allowed; border-color: #444; color: #666; }
.save-btn.is-active { border-color: var(--c-gold); box-shadow: inset 0 0 10px rgba(212, 175, 55, 0.1); }

/* --- 分类栏 --- */
.category-bar-wrapper { padding: 10px 20px 0 20px; flex-shrink: 0; background: rgba(0,0,0,0.2); }
.category-scroll { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.08); scrollbar-width: none; }
.category-scroll::-webkit-scrollbar { display: none; }
.cat-btn { background: transparent; border: 1px solid transparent; color: #888; padding: 6px 16px; cursor: pointer; transition: 0.3s; font-family: var(--font-title); font-size: 0.85rem; white-space: nowrap; }
.cat-btn:hover { color: #ccc; background: rgba(255,255,255,0.05); }
.cat-btn.active { color: var(--c-gold); border-color: var(--c-gold-dim); background: rgba(212, 175, 55, 0.08); }

/* --- 主体区域 --- */
.manager-body { flex: 1; display: flex; overflow: hidden; padding: 20px; gap: 10px; flex-direction: row; }
.mobile-tabs { display: none; }
.pane { flex: 1; background: var(--c-bg-panel); border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; border-radius: 2px; min-width: 0; min-height: 0; }
.pane-header { padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; height: 50px; }
.pane-header h3 { margin: 0; font-family: var(--font-title); color: #ccc; font-size: 1.1rem; }
.pane-header small { color: #666; font-size: 0.7rem; margin-left: 8px; }
.ac-input { background: rgba(0,0,0,0.3); border: none; border-bottom: 1px solid #444; color: #fff; padding: 5px 10px; font-family: var(--font-body); width: 120px; transition: 0.3s; }
.ac-input:focus { outline: none; border-color: var(--c-gold); width: 150px; }
.divider-column { display: flex; align-items: center; justify-content: center; width: 40px; flex-shrink: 0; color: var(--c-gold-dim); font-size: 1.5rem; }

/* --- 技能网格与卡片 --- */
.item-grid { flex: 1; padding: 10px; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); grid-auto-rows: max-content; gap: 12px; align-content: start; }
.custom-scroll::-webkit-scrollbar { width: 6px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
.empty-state { color: #666; font-style: italic; padding: 20px; text-align: center; grid-column: 1 / -1; }

.skill-card {
  background: rgba(20, 20, 22, 0.75); backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 4px;
  overflow: hidden; display: flex; flex-direction: column;
  transition: all 0.2s ease; cursor: pointer;
}
.skill-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4); border-color: rgba(255, 255, 255, 0.2); }
.skill-card.is-expanded { background: rgba(0,0,0,0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.6); z-index: 10; }
.skill-card.is-modified { border-left: 3px solid var(--c-gold); }

.skill-header { padding: 10px 14px; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid rgba(255, 255, 255, 0.05); display: flex; justify-content: space-between; align-items: center; }
.skill-title-group { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1 1 auto; }
.skill-icon { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; flex: 0 0 20px; }
.skill-name { min-width: 0; flex: 1 1 auto; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-family: var(--font-title); font-size: 1.05rem; color: #e8e8e8; letter-spacing: 1px; font-weight: 500; --fit-text-min-font-size: 0.75rem; }
.skill-name-text { display: inline-block; white-space: nowrap; will-change: transform; }
.skill-meta { display: flex; gap: 6px; font-size: 0.75rem; }
.skill-level-badge { background: rgba(255, 255, 255, 0.1); color: #ddd; padding: 2px 6px; border-radius: 2px; font-family: monospace; border: 1px solid rgba(255, 255, 255, 0.1); }
.skill-aspect-tag { padding: 2px 6px; border-radius: 2px; color: #111; font-weight: bold; background: #aaa; }

/* 展开面板 */
.expanded-panel { animation: slideDown 0.2s ease-out; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

.skill-body { padding: 12px 14px; font-size: 0.9rem; color: #bbb; display: flex; flex-direction: column; gap: 10px; }
.skill-desc { margin: 0; line-height: 1.5; font-style: italic; color: #999; }
.skill-details { display: flex; flex-direction: column; gap: 6px; background: rgba(0, 0, 0, 0.3); padding: 10px; border-radius: 2px; border-left: 2px solid rgba(255, 255, 255, 0.1); }
.detail-row { display: flex; align-items: baseline; line-height: 1.4; }
.detail-row .label { flex-shrink: 0; width: 42px; font-weight: 600; margin-right: 6px; opacity: 0.7; font-size: 0.85rem; }
.detail-row.cost .label { color: #e57373; } .detail-row.cost .value { color: #ffcdd2; }
.detail-row.effect .label { color: #ffd54f; } .detail-row.effect .value { color: #fff9c4; }

/* 转移操作栏 */
.transfer-action-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(0,0,0,0.5); border-top: 1px solid rgba(255,255,255,0.05); }
.requirement-warning { color: var(--c-danger); font-size: 0.8rem; font-weight: bold; }
.requirement-met { color: #81c784; font-size: 0.8rem; }

.mini-confirm-btn { background: var(--c-gold); color: #000; border: none; padding: 6px 16px; font-size: 0.85rem; font-weight: bold; cursor: pointer; border-radius: 2px; transition: 0.2s; font-family: var(--font-title); }
.mini-confirm-btn:hover:not(:disabled) { background: #fff; box-shadow: 0 0 10px var(--c-gold); }
.mini-confirm-btn:disabled { background: #444; color: #888; cursor: not-allowed; }
.unequip-btn { background: #555; color: #ddd; }
.unequip-btn:hover { background: var(--c-danger); color: #fff; box-shadow: 0 0 10px var(--c-danger); }
.use-btn { background: #00bcd4; color: #fff; margin-right: auto; }
.use-btn:hover { background: #26c6da; box-shadow: 0 0 10px #00bcd4; }

/* --- 性相配色方案 --- */
.aspect-edge { border-top: 2px solid #2a2a2a; } .aspect-edge .skill-header { background: linear-gradient(90deg, rgba(42, 42, 42, 0.15), transparent); } .aspect-edge .skill-aspect-tag { background: #4a4a4a; color: #fff; } .aspect-edge .skill-icon { color: #4a4a4a; filter: drop-shadow(0 0 4px rgba(74, 74, 74, 0.5)); }
.aspect-grail { border-top: 2px solid #d32f2f; } .aspect-grail .skill-header { background: linear-gradient(90deg, rgba(211, 47, 47, 0.15), transparent); } .aspect-grail .skill-aspect-tag { background: #e57373; color: #fff; } .aspect-grail .skill-icon { color: #e57373; filter: drop-shadow(0 0 4px rgba(229, 115, 115, 0.5)); }
.aspect-forge { border-top: 2px solid #f57c00; } .aspect-forge .skill-header { background: linear-gradient(90deg, rgba(245, 124, 0, 0.15), transparent); } .aspect-forge .skill-aspect-tag { background: #ffb74d; color: #000; } .aspect-forge .skill-icon { color: #ffb74d; filter: drop-shadow(0 0 4px rgba(255, 183, 77, 0.5)); }
.aspect-moth { border-top: 2px solid #a1887f; } .aspect-moth .skill-header { background: linear-gradient(90deg, rgba(161, 136, 127, 0.15), transparent); } .aspect-moth .skill-aspect-tag { background: #d7ccc8; color: #3e2723; } .aspect-moth .skill-icon { color: #d7ccc8; filter: drop-shadow(0 0 4px rgba(215, 204, 200, 0.5)); }
.aspect-heart { border-top: 2px solid #c2185b; } .aspect-heart .skill-header { background: linear-gradient(90deg, rgba(194, 24, 91, 0.15), transparent); } .aspect-heart .skill-aspect-tag { background: #f06292; color: #fff; } .aspect-heart .skill-icon { color: #f06292; filter: drop-shadow(0 0 4px rgba(240, 98, 146, 0.5)); }
.aspect-lantern { border-top: 2px solid #fbc02d; } .aspect-lantern .skill-header { background: linear-gradient(90deg, rgba(251, 192, 45, 0.15), transparent); } .aspect-lantern .skill-aspect-tag { background: #fff59d; color: #000; } .aspect-lantern .skill-icon { color: #fff59d; filter: drop-shadow(0 0 4px rgba(255, 245, 157, 0.5)); }
.aspect-winter { border-top: 2px solid #78909c; } .aspect-winter .skill-header { background: linear-gradient(90deg, rgba(120, 144, 156, 0.15), transparent); } .aspect-winter .skill-aspect-tag { background: #cfd8dc; color: #000; } .aspect-winter .skill-icon { color: #cfd8dc; filter: drop-shadow(0 0 4px rgba(207, 216, 220, 0.5)); }
.aspect-knock { border-top: 2px solid #7b1fa2; } .aspect-knock .skill-header { background: linear-gradient(90deg, rgba(123, 31, 162, 0.15), transparent); } .aspect-knock .skill-aspect-tag { background: #ce93d8; color: #000; } .aspect-knock .skill-icon { color: #ce93d8; filter: drop-shadow(0 0 4px rgba(206, 147, 216, 0.5)); }
.aspect-generic { border-top: 2px solid #777; } .aspect-generic .skill-icon { color: #ccc; }

/* --- 移动端适配 --- */
@media (max-width: 768px) {
  .manager-header { flex-direction: column; align-items: flex-start; gap: 10px; }
  .header-actions { width: 100%; justify-content: space-between; }
  .manager-body { flex-direction: column; padding: 10px; }
  .mobile-tabs { display: flex; gap: 10px; margin-bottom: 5px; flex-shrink: 0; }
  .mobile-tab-item { flex: 1; text-align: center; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #888; font-family: var(--font-title); cursor: pointer; transition: 0.3s; }
  .mobile-tab-item.active { background: rgba(212, 175, 55, 0.1); border-color: var(--c-gold); color: var(--c-gold); }
  .divider-column { display: none; }
  .pane.mobile-hidden { display: none; }
  .pane { width: 100%; flex: 1; height: 100%; }
  .item-grid { grid-template-columns: 1fr; }
  .header-title h2 { font-size: 1.1rem; }
  .ac-btn { padding: 6px 10px; font-size: 0.75rem; }
  .category-bar-wrapper { padding: 10px 10px 0 10px; }
}
</style>
