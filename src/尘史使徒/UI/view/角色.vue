<template>
  <div class="role-view-container">

    <!-- 移动端：遮罩层 -->
    <div
      class="mobile-overlay"
      v-if="isMobileMenuOpen"
      @click="isMobileMenuOpen = false"
    ></div>

    <!-- 移动端：菜单切换按钮 -->
    <button class="mobile-menu-toggle" @click="isMobileMenuOpen = !isMobileMenuOpen">
      {{ isMobileMenuOpen ? '✕' : '☰' }}
    </button>

    <!-- 左侧：角色列表导航 -->
    <aside class="role-sidebar" :class="{ 'mobile-open': isMobileMenuOpen }">
      <div class="role-list-header">
        <span>倒影</span>
        <span class="mobile-close-btn" @click="isMobileMenuOpen = false">✕</span>
      </div>

      <!-- 新增：搜索与工具栏 -->
      <div class="sidebar-tools">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索..."
        />
        <button
          class="tool-btn"
          :class="{ active: isOmniscient }"
          @click="isOmniscient = !isOmniscient"
          title="显示全部"
        >
          {{ isOmniscient ? '👁️' : '🔒' }}
        </button>
      </div>

      <div class="role-list scroll-wrapper">

        <!-- 玩家 (始终显示，除非搜索过滤) -->
        <div
          v-if="matchesSearch('我')"
          class="role-item user-item"
          :class="{ active: selectedId === 'user' }"
          @click="selectRole('user', 'user')"
        >
          <RoleAvatar class="list-avatar" :src="userData?.meta?.avatar" alt="我" />
          <span class="name">{{ '我' }}</span>
        </div>

        <div class="divider"></div>

        <!-- 主要角色 -->
        <div class="category-title" v-if="Object.keys(visibleMainChars).length > 0">主要角色</div>
        <div
          v-for="(char, id) in visibleMainChars"
          :key="id"
          class="role-item main-item"
          :class="{ active: selectedId === id }"
          @click="selectRole(id, 'main')"
        >
          <RoleAvatar class="list-avatar" :src="char.meta?.avatar" :alt="id" />
          <span class="name">{{ id }}</span>
          <span v-if="!char.在场 && !isOmniscient" class="absent-tag">(离)</span>
          <span
            class="star-icon"
            :class="{ active: isFollowed(id, '主要角色') }"
            @click.stop="toggleFollow(id, '主要角色')"
            title="关注/取消关注"
          >★</span>
        </div>

        <!-- 次要角色 -->
        <div class="category-title" v-if="Object.keys(visibleMinorChars).length > 0">次要角色</div>
        <div
          v-for="(char, id) in visibleMinorChars"
          :key="id"
          class="role-item minor-item"
          :class="{ active: selectedId === id }"
          @click="selectRole(id, 'minor')"
        >
          <RoleAvatar class="list-avatar" :src="char.meta?.avatar" :alt="id" />
          <span class="name">{{ id }}</span>
          <span
            class="star-icon"
            :class="{ active: isFollowed(id, '次要角色') }"
            title="关注/取消关注"
            @click.stop="toggleFollow(id, '次要角色')"
          >★</span>
        </div>

      </div>
    </aside>

    <!-- 右侧：详细内容展示区 -->
    <main class="role-content">
      <CharPanel
        :key="selectedId"
        :data="currentData"
        :char-id="selectedId"
        :category="currentCategoryKey"
        :char-type="selectedType"
      />
    </main>

  </div>
</template>

<script setup>
import { MvuUtil } from '@/Utils/MvuUtil';
import CharPanel from '@/尘史使徒/UI/components/role/CharPanel.vue';
import RoleAvatar from '@/尘史使徒/UI/components/common/RoleAvatar.vue';
import { useStatStore } from '@/尘史使徒/UI/store/StatStore';
import { computed, ref, watch } from 'vue';

const store = useStatStore();

// 状态
const selectedId = ref('user');
const selectedType = ref('user');
const isMobileMenuOpen = ref(false);
const isOmniscient = ref(false); // 控制是否显示全部角色
const searchQuery = ref(''); // 新增：搜索关键词

// 数据获取
const userData = computed(() => store.stat_data?.角色?.user);

// --- 辅助功能 ---

const ensureSystemData = () => {
  if (!store.stat_data) return;
  if (!store.stat_data.system) store.stat_data.system = {};
  if (!store.stat_data.system['关注角色列表']) {
    store.stat_data.system['关注角色列表'] = {
      '主要角色': [],
      '次要角色': []
    };
  }
};

const currentCategoryKey = computed(() => {
  if (selectedType.value === 'main') return '主要角色';
  if (selectedType.value === 'minor') return '次要角色';
  return '';
});

const isFollowed = (id, categoryKey) => {
  const list = store.stat_data?.system?.['关注角色列表']?.[categoryKey];
  return list && list.includes(id);
};

const toggleFollow = (id, categoryKey) => {
  ensureSystemData();
  const list = store.stat_data.system['关注角色列表'][categoryKey];
  const index = list.indexOf(id);
  if (index > -1) {
    list.splice(index, 1);
  } else {
    list.push(id);
  }
  const updatePayload = {
    system: { '关注角色列表': store.stat_data.system['关注角色列表'] }
  };
  // 使用 MvuUtil 的差分更新方法更新关注列表
  MvuUtil.updateMvuDataByDiff(updatePayload).catch(err => console.error(err));
};

// --- 核心过滤逻辑 (修改) ---

// 简单的搜索匹配检查
const matchesSearch = (name) => {
  if (!searchQuery.value) return true;
  return name.toLowerCase().includes(searchQuery.value.toLowerCase());
};

const filterChars = (chars, categoryKey) => {
  if (!chars) return {};
  const result = {};
  const followList = store.stat_data?.system?.['关注角色列表']?.[categoryKey] || [];

  for (const [key, char] of Object.entries(chars)) {
    // 1. 搜索过滤
    if (!matchesSearch(key)) {
      continue;
    }

    // 2. 显示规则：在场 OR 全视模式 OR 已关注
    const isPresent = char.在场;
    const isFollowedChar = followList.includes(key);

    if (isPresent || isOmniscient.value || isFollowedChar) {
      result[key] = char;
    }
  }
  return result;
};

const visibleMainChars = computed(() => filterChars(store.stat_data?.角色?.['主要角色'], '主要角色'));
const visibleMinorChars = computed(() => filterChars(store.stat_data?.角色?.['次要角色'], '次要角色'));

// --- 逻辑结束 ---

const selectRole = (id, type) => {
  selectedId.value = id;
  selectedType.value = type;
  if (window.innerWidth <= 768) {
    isMobileMenuOpen.value = false;
  }
};

const currentData = computed(() => {
  if (selectedType.value === 'user') return userData.value;
  if (selectedType.value === 'main') return store.stat_data?.角色?.['主要角色']?.[selectedId.value];
  if (selectedType.value === 'minor') return store.stat_data?.角色?.['次要角色']?.[selectedId.value];
  return {};
});

watch(() => store.stat_data, (newVal) => {
  if (newVal) {
    ensureSystemData();
    if (!selectedId.value) selectedId.value = 'user';
  }
}, { immediate: true });

</script>

<style scoped>
/* 保持原有样式不变，新增以下样式 */

.role-view-container {
  display: flex;
  height: 100%;
  width: 100%;
  background: rgba(0,0,0,0.2);
  position: relative;
  overflow: hidden;
}

.role-sidebar {
  width: 240px;
  border-right: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  background: rgba(20, 20, 20, 0.6);
  backdrop-filter: blur(5px);
  flex-shrink: 0;
  z-index: 10;
}

.role-list-header {
  padding: 16px;
  font-family: var(--font-title);
  font-size: 1.2rem;
  color: var(--c-gold);
  border-bottom: 1px solid var(--c-border);
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  background: rgba(0,0,0,0.8);
}
/* --- 新增：工具栏样式 --- */
.sidebar-tools {
  display: flex;
  padding: 10px;
  gap: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  background: rgba(0,0,0,0.3);
  box-sizing: border-box; /* 新增：防止 padding 撑开宽度 */
  width: 100%; /* 新增：确保宽度不超过父容器 */
}

.search-input {
  flex: 1;
  min-width: 0; /* 新增：允许输入框在 flex 容器中缩小，防止溢出 */
  background: rgba(0,0,0,0.5);
  border: 1px solid var(--c-border);
  color: #ddd;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box; /* 新增 */
}

.search-input:focus {
  border-color: var(--c-gold);
}

.tool-btn {
  flex-shrink: 0; /* 新增：防止按钮被挤压变形 */
  background: transparent;
  border: 1px solid var(--c-border);
  color: #888;
  width: 30px;
  height: 30px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.2s;
  box-sizing: border-box; /* 新增 */
}

.tool-btn:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

.tool-btn.active {
  color: var(--c-gold);
  border-color: var(--c-gold);
  background: rgba(255, 215, 0, 0.1);
  text-shadow: 0 0 5px var(--c-gold);
}
/* --- 工具栏样式结束 --- */

.role-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.role-list::-webkit-scrollbar {
  width: 4px;
}
.role-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.category-title {
  padding: 12px 16px 6px;
  font-size: 0.75rem;
  color: var(--c-text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
  opacity: 0.7;
}

.role-item {
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
  position: relative;
}
.list-avatar { --avatar-size: 30px; margin-right: 3px; }

.role-item:hover {
  background: var(--c-hover-bg);
}

.role-item.active {
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.1), transparent);
  border-left-color: var(--c-gold);
  color: var(--c-gold);
}

.role-item .name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.95rem;
}

.star-icon {
  font-size: 1rem;
  color: #444;
  cursor: pointer;
  line-height: 1;
  transition: all 0.2s;
  margin-left: auto;
  padding: 4px;
  border-radius: 50%;
}
.star-icon:hover {
  color: #888;
  background: rgba(255,255,255,0.05);
}
.star-icon.active {
  color: #FFD700;
  text-shadow: 0 0 5px rgba(255, 215, 0, 0.4);
}

.absent-tag {
  font-size: 0.7rem;
  color: #666;
  margin-right: 4px;
}

.divider {
  height: 1px;
  background: var(--c-border);
  margin: 10px 16px;
  opacity: 0.3;
}

.role-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.mobile-menu-toggle { display: none; }
.mobile-close-btn { display: none; }
.mobile-overlay { display: none; }

@media (max-width: 768px) {
  .role-view-container {
    flex-direction: column;
    min-height: 0;
  }

  .role-content {
    padding-bottom: calc(30px + env(safe-area-inset-bottom));
  }

  .role-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 260px;
    height: 100%;

    /* 修复：侧边栏底部也增加内边距，防止列表底部被遮挡 */
    padding-bottom: calc(40px + env(safe-area-inset-bottom));
    background: #1a1a1a !important;
    backdrop-filter: none !important;
    box-shadow: 2px 0 15px rgba(0,0,0,0.9);
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 2000;
    border-right: 1px solid #333;
    border-left: none;
  }

  .role-list-header {
    background: #1a1a1a !important;
    border-bottom: 1px solid #333;
  }

  .role-list.scroll-wrapper{
    min-height: 100vh;
    min-height: 100dvh;
    background: #1a1a1a !important;
  }

  .sidebar-tools {
    background: #1a1a1a !important;
  }

  .role-sidebar.mobile-open {
    transform: translateX(0);
  }

  .mobile-menu-toggle {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 900;
    background: rgba(0,0,0,0.6);
    border: 1px solid var(--c-border);
    color: var(--c-gold);
    width: 36px;
    height: 36px;
    border-radius: 4px;
    font-size: 1.2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mobile-close-btn {
    display: block;
    position: absolute;
    right: 15px;
    cursor: pointer;
    font-size: 1.2rem;
    color: #999;
  }

  .mobile-overlay {
    display: block;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6);
    z-index: 1999;
    backdrop-filter: blur(2px);
  }
}
</style>
