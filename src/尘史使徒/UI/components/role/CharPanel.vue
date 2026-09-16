<template>
  <div class="char-panel" :class="panelClass">
    <header class="panel-header">
      <div class="header-content">
        <div class="identity-block">
          <RoleAvatar class="detail-avatar" :src="data?.meta?.avatar" :alt="displayName" />
          <div>
          <h2 class="char-name">{{ displayName }}</h2>
          <div class="char-intro" v-if="charType === 'minor' && !isEditing">{{ data.简介 || '暂无简介' }}</div>
          <div class="char-identity" v-else>{{ data.当前身份 }}</div>
          </div>
        </div>
        <div class="header-actions">
          <button class="edit-btn" @click="isEditing ? saveEdit() : startEdit()">
            {{ isEditing ? '保存' : '编辑' }}
          </button>
          <button class="cancel-btn" v-if="isEditing" @click="cancelEdit">取消</button>
          <button class="delete-btn" v-if="charType === 'minor' && !isEditing" @click="deleteChar">删除角色</button>
          <button
            v-if="showDetailToggle"
            class="detail-toggle-btn"
            :class="{ active: showDetails }"
            title="切换详情模式"
            @click="toggleDetails"
          >
            <span class="text">{{ showDetails ? '详情开启' : '详情关闭' }}</span>
          </button>
        </div>
      </div>
      <textarea
        v-if="charType === 'minor' && isEditing"
        v-model="editForm.简介"
        class="edit-textarea mt-2"
        placeholder="简介"
      ></textarea>
    </header>

    <div v-if="hasTabs" class="sub-nav">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="['sub-nav-item', { active: currentTab === tab }]"
        @click="currentTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <div class="panel-content scroll-container">
      <template v-if="hasTabs">
        <div v-if="currentTab === '状态'" class="tab-content">
          <section class="info-block">
            <h3>生命状态</h3>
            <LifeStatusModule :data="data" />
          </section>
          <section v-if="data.特殊状态" class="info-block">
            <h3>特殊状态</h3>
            <SpecialStatusModule :data="data.特殊状态" :stats="data" />
          </section>
        </div>

        <div v-if="currentTab === '技能'" class="tab-content">
          <section class="info-block">
            <ArtsModule :arts-data="data.术之等级" />
          </section>
          <section class="info-block">
            <h3>掌握技能</h3>
            <SkillModule :data="data.技能" :stats="data" />
          </section>
        </div>

        <div v-if="currentTab === '档案'" class="tab-content">
          <!-- 修改点：将背景纳入详情模式 -->
          <section
            v-if="showDetails || charType !== 'main' || isEditing"
            class="info-block"
            :class="{ 'detail-block': charType === 'main' && !isEditing }"
          >
            <h3>背景</h3>
            <p v-if="!isEditing" class="text-content">{{ data.背景?.join('\n') }}</p>
            <textarea v-else v-model="editForm._背景Str" class="edit-textarea" placeholder="每行一条背景故事"></textarea>
          </section>

          <section class="info-block">
            <h3>外貌</h3>
            <p v-if="!isEditing">{{ data.外貌?.join('\n') }}</p>
            <textarea v-else v-model="editForm._外貌Str" class="edit-textarea" placeholder="每行一条外貌特征"></textarea>
          </section>

          <!-- 修改点：将性格倾向纳入详情模式 -->
          <section
            v-if="showDetails || charType !== 'main' || isEditing"
            class="info-block"
            :class="{ 'detail-block': charType === 'main' && !isEditing }"
          >
            <h3>性格倾向</h3>
            <PersonalityModule
              :data="isEditing ? editForm.性格 : data.性格"
              :isEditing="isEditing"
              @update:data="editForm.性格 = $event"
            />
          </section>


          <section v-if="charType === 'main'" class="info-block">
            <h3>活动范围</h3>
            <div class="tag-container">
              <span v-for="(tag, index) in data.区域检索词" :key="index" class="area-tag">{{ tag }}</span>
            </div>
          </section>

          <template v-if="showDetails && charType === 'main'">
            <section class="info-block detail-block">
              <h3>语料库</h3>
              <div v-for="(lines, mood) in data.语料" :key="mood" class="corpus-row">
                <span class="mood-tag">{{ mood }}</span>
                <span class="corpus-text">{{ lines.join(' | ') }}</span>
              </div>
            </section>
            <section class="info-block detail-block">
              <h3>性经验</h3>
              <div v-if="typeof data.性经验 === 'object'">
                <div v-for="(exp, k) in data.性经验" :key="k">{{ k }}: {{ exp }}</div>
              </div>
              <div v-else>{{ data.性经验 }}</div>
            </section>
          </template>

          <section class="info-block">
            <h3>人际关系</h3>
            <RelationshipModule
              :data="isEditing ? editForm.人际关系 : data.人际关系"
              :isEditing="isEditing"
              @update:data="editForm.人际关系 = $event"
            />
          </section>
        </div>

        <div v-if="currentTab === '物品'" class="tab-content">
          <section v-if="charType === 'user' && data.金钱 !== undefined" class="info-block">
            <h3>持有金</h3>
            <div class="currency-row">
              <span class="currency-value">{{ data.金钱 }}</span>
              <span class="currency-unit">g</span>
            </div>
          </section>
          <InventoryModule :data="data.物品" />
        </div>
      </template>

      <template v-else>
        <section class="info-block">
          <h3>性格标签</h3>
          <div class="tags-container" v-if="!isEditing">
            <span v-for="tag in data.性格标签" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <input v-else v-model="editForm._性格标签Str" class="edit-input" placeholder="输入标签，用空格分隔" />
        </section>

        <section class="info-block">
          <h3>状态</h3>
          <LifeStatusModule :data="data" />
          <div class="mt-4" v-if="data.特殊状态">
            <h4>特殊状态</h4>
            <SpecialStatusModule :data="data.特殊状态" :stats="data" />
          </div>
        </section>

        <section class="info-block">
          <h3>能力</h3>
          <div class="mb-3">
            <ArtsModule v-if="typeof data.术之等级 === 'object'" :arts-data="data.术之等级" />
            <p v-else><strong>术之等级:</strong> {{ data.术之等级 || '未知' }}</p>
          </div>
          <div class="mt-4" v-if="data.技能">
            <h4>技能</h4>
            <SkillModule :data="data.技能" :stats="data" />
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import ArtsModule from './ArtsModule.vue';
import PersonalityModule from './PersonalityModule.vue';
import SpecialStatusModule from './SpecialStatusModule.vue';
import LifeStatusModule from './LifeStatusModule.vue';
import RelationshipModule from './RelationshipModule.vue';
import InventoryModule from './InventoryModule.vue';
import SkillModule from './SkillModule.vue';
import RoleAvatar from '../common/RoleAvatar.vue';
import { MvuUtil } from '@/Utils/MvuUtil';

const props = defineProps({
  data: { type: Object, required: true },
  charId: { type: String, default: '' },
  category: { type: String, default: '' },
  charType: {
    type: String,
    default: 'main',
    validator: (v) => ['user', 'main', 'minor'].includes(v)
  }
});

const panelClass = computed(() => `${props.charType}-panel`);

const displayName = computed(() => {
  if (props.charType === 'user') return substitudeMacros('{{user}}');
  return props.data?.姓名 || '未知角色';
});

const showDetailToggle = computed(() => props.charType === 'main');

const hasTabs = computed(() => props.charType !== 'minor');

const defaultTabs = ['状态', '技能', '档案', '物品'];

const tabs = computed(() => {
  if (props.charType === 'user') return defaultTabs;
  if (props.charType === 'main') {
    if (props.data?.姓名 === '希尔') return ['技能', '档案'];
    return defaultTabs;
  }
  return [];
});

const currentTab = ref(tabs.value.includes('状态') ? '状态' : tabs.value[0]);

watch(() => props.data?.姓名, () => {
  if (!tabs.value.includes(currentTab.value)) currentTab.value = tabs.value[0];
});

const showDetails = ref(false);
const toggleDetails = () => showDetails.value = !showDetails.value;

const isEditing = ref(false);
const editForm = ref({});

const startEdit = () => {
  editForm.value = JSON.parse(JSON.stringify(props.data));
  editForm.value._外貌Str = (editForm.value.外貌 || []).join('\n');
  editForm.value._背景Str = (editForm.value.背景 || []).join('\n');
  editForm.value.性格 = editForm.value.性格 || {};
  editForm.value.人际关系 = editForm.value.人际关系 || {};
  if (props.charType === 'minor') {
    editForm.value._性格标签Str = (editForm.value.性格标签 || []).join(' ');
  }
  isEditing.value = true;
};

const saveEdit = async () => {
  const newAppearance = editForm.value._外貌Str.split('\n').map(s => s.trim()).filter(s => s);
  const newBackground = editForm.value._背景Str.split('\n').map(s => s.trim()).filter(s => s);

  const diff = {
    外貌: newAppearance,
    背景: newBackground,
    性格: editForm.value.性格,
    人际关系: editForm.value.人际关系
  };

  if (props.charType === 'minor') {
    diff.简介 = editForm.value.简介;
    diff.性格标签 = editForm.value._性格标签Str.split(/\s+/).filter(s => s);
  }

  const cat = props.category || (props.charType === 'user' ? 'User' : props.charType === 'main' ? 'Main' : 'Minor');
  const cid = props.charId || (props.charType === 'user' ? 'User' : props.data?.姓名);

  await MvuUtil.updateMvuDataByDiff({
    角色: {
      [cat]: {
        [cid]: diff
      }
    }
  });
  isEditing.value = false;
};

const cancelEdit = () => {
  isEditing.value = false;
};

const deleteChar = async () => {
  if (!props.charId || !props.category) return;
  const nameDisplay = props.data?.姓名 || props.charId;
  if (!confirm(`确定要删除角色【${nameDisplay}】吗？\n此操作将删除该角色的所有数据且不可恢复。`)) return;
  try {
    await MvuUtil.updateMvuDataByDiff({
      角色: { [props.category]: { [props.charId]: null } }
    });
  } catch (error) {
    console.error("删除角色时发生错误:", error);
  }
};
</script>

<style scoped>
.char-panel {
  --c-gold: #d4af37;
  --c-text: #e0e0e0;
  --c-text-dim: #a0a0a0;
  --c-bg-dark: rgba(0, 0, 0, 0.4);
  --c-detail-bg: rgba(50, 20, 20, 0.3);
  --c-hover-bg: rgba(255, 255, 255, 0.1);
  --c-border: rgba(255, 255, 255, 0.2);
  --c-danger: #e74c3c;
  --font-title: 'Cinzel', serif;
  --font-body: 'EB Garamond', serif;

  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  color: var(--c-text);
  font-family: var(--font-body);
}

.panel-header {
  border-bottom: 1px solid rgba(212, 175, 55, 0.3);
  padding-bottom: 15px;
  margin-bottom: 15px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.identity-block { display: flex; align-items: center; gap: 18px; min-width: 0; }
.detail-avatar { --avatar-size: 74px; }

.char-name {
  font-family: var(--font-title);
  color: var(--c-gold);
  font-size: 2rem;
  margin: 0;
}

.char-identity {
  color: var(--c-text-dim);
  margin-top: 5px;
}

.char-intro {
  font-style: italic;
  color: var(--c-text-dim);
  margin-top: 5px;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.edit-btn,
.cancel-btn,
.delete-btn {
  background: transparent;
  border: 1px solid var(--c-gold);
  color: var(--c-gold);
  padding: 4px 12px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: var(--font-title);
}

.edit-btn:hover {
  background: var(--c-gold);
  color: #000;
}

.cancel-btn {
  border-color: #a0a0a0;
  color: #a0a0a0;
}

.cancel-btn:hover {
  background: #a0a0a0;
  color: #000;
}

.delete-btn {
  border-color: var(--c-danger);
  color: var(--c-danger);
  opacity: 0.7;
}

.delete-btn:hover {
  background: var(--c-danger);
  color: white;
  opacity: 1;
  box-shadow: 0 0 8px rgba(231, 76, 60, 0.4);
}

.detail-toggle-btn {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--c-text-dim);
  color: var(--c-text-dim);
  padding: 5px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.3s;
  font-family: var(--font-title);
  font-size: 0.8rem;
}

.detail-toggle-btn:hover {
  border-color: var(--c-gold);
  color: var(--c-gold);
}

.detail-toggle-btn.active {
  background: rgba(212, 175, 55, 0.1);
  border-color: var(--c-gold);
  color: var(--c-gold);
  box-shadow: 0 0 8px rgba(212, 175, 55, 0.2);
}

.edit-textarea,
.edit-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--c-gold);
  color: var(--c-text);
  padding: 8px;
  font-family: var(--font-body);
  border-radius: 4px;
}

.edit-textarea {
  resize: vertical;
  min-height: 80px;
}

.sub-nav {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sub-nav-item {
  background: none;
  border: none;
  color: var(--c-text-dim);
  padding: 8px 16px;
  cursor: pointer;
  font-family: var(--font-title);
  transition: 0.3s;
  border-bottom: 2px solid transparent;
  font-size: 1.1rem;
}

.sub-nav-item.active {
  color: var(--c-gold);
  border-bottom-color: var(--c-gold);
}

.sub-nav-item:hover {
  color: #fff;
}

.scroll-container {
  flex: 1;
  overflow-y: auto;
  padding-right: 10px;
}

.scroll-container::-webkit-scrollbar {
  width: 6px;
}

.scroll-container::-webkit-scrollbar-thumb {
  background: rgba(212, 175, 55, 0.2);
  border-radius: 3px;
}

.info-block {
  margin-bottom: 25px;
  background: var(--c-bg-dark);
  padding: 20px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.info-block h3 {
  color: var(--c-gold);
  border-left: 3px solid var(--c-gold);
  padding-left: 10px;
  margin-top: 0;
  font-family: var(--font-title);
  margin-bottom: 15px;
}

.info-block h4 {
  color: var(--c-text-dim);
  margin-top: 15px;
  margin-bottom: 10px;
  font-size: 0.95rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 5px;
}

.detail-block {
  border: 1px dashed rgba(212, 175, 55, 0.3);
  background: linear-gradient(to right, rgba(0, 0, 0, 0.4), rgba(30, 30, 30, 0.4));
}

.thought-text {
  font-style: italic;
  color: #aaa;
}

.corpus-row {
  margin-bottom: 8px;
  font-size: 0.9em;
}

.mood-tag {
  color: var(--c-gold);
  font-weight: bold;
  margin-right: 8px;
}

.text-content {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #ccc;
}

.tag-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.area-tag {
  background: rgba(212, 175, 55, 0.1);
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: var(--c-gold);
  padding: 4px 8px;
  border-radius: 2px;
  font-size: 0.9rem;
  font-family: var(--font-title);
}

.tag {
  display: inline-block;
  background: var(--c-hover-bg);
  border: 1px solid var(--c-border);
  padding: 2px 8px;
  margin-right: 5px;
  margin-bottom: 5px;
  font-size: 0.9rem;
  color: var(--c-text-dim);
}

.currency-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.currency-value {
  font-family: var(--font-title);
  font-size: 1.8rem;
  color: var(--c-gold);
  font-weight: bold;
  text-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
}

.currency-unit {
  font-family: var(--font-title);
  font-size: 1.2rem;
  color: var(--c-text-dim);
}

.mt-2 {
  margin-top: 10px;
}

.mt-4 {
  margin-top: 20px;
}

.mb-3 {
  margin-bottom: 15px;
}
</style>
