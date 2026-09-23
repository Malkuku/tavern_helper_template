<template>
  <div class="dossier-toolbar">
    <div>
      <p>CHARACTER DOSSIER</p>
      <h2>{{ roleName }}</h2>
      <span>{{ entry.type }} · {{ entry.author || '未署名版本' }}</span>
    </div>
    <span class="dossier-hint">点击内容即可编辑</span>
  </div>
  <div class="role-dossier">
    <section class="identity-preview">
      <RoleAvatar
        class="large-avatar"
        :src="entry.meta?.avatar"
        :alt="roleName"
        :seed="entry.key"
        :fallback-style="entry.meta?.avatarStyle"
        :theme-color="entry.meta?.color"
      />
      <div class="visual-fields">
        <div class="visual-summary">
          <div>
            <p>PORTRAIT</p>
            <h3>角色外观</h3>
          </div>
          <div class="visual-state">
            <span class="avatar-source" :class="{ image: hasAvatar }">{{ hasAvatar ? '图片头像' : '默认头像' }}</span>
            <span class="color-swatch" :style="{ background: entry.meta.color }" :title="entry.meta.color"></span>
          </div>
        </div>
        <details class="visual-editor">
          <summary>调整头像与主题</summary>
          <div class="visual-editor-body">
            <AvatarMediaField v-model="entry.meta.avatar" />
            <div class="avatar-style-field">
              <span>无图或图片加载失败时使用</span>
              <div class="avatar-options">
                <button
                  v-for="option in avatarStyles"
                  :key="option.value"
                  type="button"
                  :class="{ active: !hasAvatar && entry.meta.avatarStyle === option.value }"
                  @click="entry.meta.avatarStyle = option.value"
                >
                  <RoleAvatar
                    :src="''"
                    :alt="option.label"
                    :seed="entry.key"
                    :fallback-style="option.value"
                    :theme-color="entry.meta?.color"
                  /><small>{{ option.label }}</small>
                </button>
              </div>
            </div>
            <label class="color-field"
              >主题颜色<input v-model="entry.meta.color" type="color" /><input
                v-model="entry.meta.color"
                pattern="#[0-9a-fA-F]{6}"
            /></label>
            <small
              >图片地址优先保存并显示；默认样式只在没有图片或图片加载失败时使用。三类角色的主题颜色都会用于特殊对话框。</small
            >
            <MessageDisplay
              :display-html="`【${roleName}】「这是一句会随头像与主题颜色即时变化的对话预览。」`"
              :is-streaming="false"
              :font-size="16"
              :role-preview="{
                name: roleName,
                avatar: entry.meta.avatar,
                avatarStyle: entry.meta.avatarStyle,
                color: entry.meta.color,
              }"
            />
          </div>
        </details>
      </div>
    </section>
    <nav class="section-nav" aria-label="角色编辑分区">
      <button
        v-for="item in visibleTabs"
        :key="item.id"
        type="button"
        :class="{ active: activeTab === item.id }"
        @click="activeTab = item.id"
      >
        <span>{{ item.icon }}</span
        ><b>{{ item.label }}<i v-if="dirtySections.includes(item.id)" class="dirty-dot" title="有未保存更改"></i></b
        ><small>{{ item.note }}</small>
      </button>
    </nav>
    <section v-show="activeTab === 'basic'" id="role-basic" class="role dossier-panel">
      <h3>基本资料、外貌与背景</h3>
      <label
        >角色类型<select
          :value="entry.type"
          @change="$emit('requestTypeChange', ($event.target as HTMLSelectElement).value)"
        >
          <option>user</option>
          <option>主要角色</option>
          <option>次要角色</option>
        </select></label
      >
      <div class="grid">
        <InlineEditableText v-model="entry.key" label="角色 key" :readonly="entry.type === 'user'" />
        <InlineEditableText v-model="entry.author" label="作者" />
        <InlineEditableText v-model="entry.desc" label="素材说明" multiline wide />
        <InlineEditableText v-if="entry.type !== 'user'" v-model="entry.data.姓名" label="姓名" />
        <label v-if="entry.type !== 'user'" class="check"
          ><input v-model="entry.data.在场" type="checkbox" />当前在场</label
        >
        <InlineEditableText v-if="entry.type !== '次要角色'" v-model="entry.data.年龄" label="年龄" />
        <InlineEditableText v-if="entry.type !== '次要角色'" v-model="entry.data.当前身份" label="当前身份" />
        <InlineEditableText v-if="entry.type === '主要角色'" v-model="entry.data.当前想法" label="当前想法" multiline />
        <InlineEditableText v-if="entry.type === '主要角色'" v-model="entry.data.外貌概括" label="外貌概括" multiline />
        <InlineEditableText v-if="entry.type === '次要角色'" v-model="entry.data.简介" label="简介" multiline wide />
      </div>
      <template v-if="entry.type !== 'user'"
        ><StringField v-model="entry.data.名称检索词" label="名称检索词" /><StringField
          v-model="entry.data.区域检索词"
          label="区域检索词" /></template
      ><template v-if="entry.type !== '次要角色'"
        ><StringField v-model="entry.data.外貌" label="外貌" /><StringField
          v-model="entry.data.背景"
          label="背景" /></template
      ><StringField v-if="entry.type === '主要角色'" v-model="entry.data.战斗风格" label="战斗风格" />
      <template v-if="entry.type === '主要角色'">
        <RoleCardCollection v-model="entry.data.语料" kind="语料" />
      </template>
      <StringField v-if="entry.type === '次要角色'" v-model="entry.data.性格标签" label="性格标签" />
    </section>
    <section
      v-if="entry.type !== '次要角色'"
      v-show="activeTab === 'personality'"
      id="role-personality"
      class="dossier-panel"
    >
      <h3>性格与关系</h3>
      <div class="grid">
        <InlineEditableText v-for="f in personality" :key="f" v-model="entry.data.性格[f]" :label="f" multiline />
      </div>
      <RelationshipModule
        :data="entry.data.人际关系"
        is-editing
        :target-options="availableRelationshipTargets"
        @update:data="entry.data.人际关系 = $event"
      />
      <h3>性经验</h3>
      <EntrySetEditor
        v-if="typeof entry.data.性经验 === 'object'"
        v-model="entry.data.性经验"
        label="经验"
        :create="() => 0"
        ><template #entry="p"
          ><label
            >次数<input
              :value="p.entry"
              type="number"
              @input="
                entry.data.性经验[p.entryKey] = Number(($event.target as HTMLInputElement).value)
              " /></label></template></EntrySetEditor
      ><label v-else>共享说明<input v-model="entry.data.性经验" /></label>
    </section>
    <section v-show="activeTab === 'skills'" id="role-skills" class="dossier-panel">
      <h3>基础数值与生命</h3>
      <LifeStatusModule :data="entry.data" />
      <h3>技能与术</h3>
      <SkillModule :data="entry.data.技能" :stats="entry.data" mode="edit" @update:data="entry.data.技能 = $event" />
      <ArtLevelEditor :model-value="entry.data['术之等级']" @update:model-value="updateArts" />
    </section>
    <section v-show="activeTab === 'items'" id="role-items" class="dossier-panel">
      <div v-if="entry.type === 'user'" class="resource-strip">
        <label><span>金钱</span><input v-model.number="entry.data.金钱" type="number" min="0" /></label>
        <label><span>缥缈异质</span><input v-model.number="entry.data.缥缈异质" type="number" min="0" /></label>
      </div>
      <SpecialStatusModule
        v-if="typeof entry.data.特殊状态 === 'object'"
        :data="entry.data.特殊状态"
        :stats="entry.data"
        mode="edit"
        @update:data="entry.data.特殊状态 = $event"
      /><label v-else>共享说明<input v-model="entry.data.特殊状态" /></label>
      <InventoryModule
        v-if="typeof entry.data.物品 === 'object'"
        :data="entry.data.物品"
        mode="edit"
        @update:data="entry.data.物品 = $event"
      /><label v-else>共享说明<input v-model="entry.data.物品" /></label>
    </section>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue';
import { applyRoleDerivedStats } from '../assets/roleStats';
import AvatarMediaField from './AvatarMediaField.vue';
import MessageDisplay from '../../尘史使徒/UI/components/panel/MessageDisplay.vue';
import ArtLevelEditor from './ArtLevelEditor.vue';
import RoleAvatar from '../../尘史使徒/UI/components/common/RoleAvatar.vue';
import EntrySetEditor from './EntrySetEditor.vue';
import InlineEditableText from './InlineEditableText.vue';
import RoleCardCollection from './RoleCardCollection.vue';
import StringField from './StringField.vue';
import InventoryModule from '../../尘史使徒/UI/components/role/InventoryModule.vue';
import LifeStatusModule from '../../尘史使徒/UI/components/role/LifeStatusModule.vue';
import RelationshipModule from '../../尘史使徒/UI/components/role/RelationshipModule.vue';
import SkillModule from '../../尘史使徒/UI/components/role/SkillModule.vue';
import SpecialStatusModule from '../../尘史使徒/UI/components/role/SpecialStatusModule.vue';
const entry = defineModel<any>('entry', { required: true });
const props = withDefaults(
  defineProps<{ roleOptions?: { id: string; label: string; identity: string }[]; dirtySections?: string[] }>(),
  { roleOptions: () => [], dirtySections: () => [] },
);
defineEmits<{ requestTypeChange: [type: string] }>();
const personality = ['社交表现', '行动逻辑', '思维习惯', '人际距离', '道德底色'];
const avatarStyles = [
  { value: 'auto', label: '自动' },
  { value: '0', label: '旅人' },
  { value: '1', label: '六芒星' },
  { value: '2', label: '匕首' },
  { value: '3', label: '羽毛笔' },
  { value: '4', label: '秘眼' },
  { value: '5', label: '残月' },
];
const activeTab = ref('basic');
const tabs = [
  { id: 'basic', icon: '◈', label: '角色档案', note: '身份、外貌与背景' },
  { id: 'personality', icon: '◎', label: '人格关系', note: '性格与人物网络' },
  { id: 'skills', icon: '✦', label: '技能与术', note: '基础状态、能力和性相' },
  { id: 'items', icon: '▣', label: '状态物品', note: '效果与携带物' },
];
const visibleTabs = computed(() => tabs.filter(tab => tab.id !== 'personality' || entry.value.type !== '次要角色'));
watch(
  [() => entry.value.type, visibleTabs],
  () => {
    if (!visibleTabs.value.some(tab => tab.id === activeTab.value)) activeTab.value = 'basic';
  },
  { immediate: true },
);
const roleName = computed(() => entry.value.data?.姓名 || entry.value.key || '角色头像');
const hasAvatar = computed(() => Boolean(entry.value.meta?.avatar?.trim()));
const currentIdentity = computed(() =>
  entry.value.type === 'user' ? 'user' : `${entry.value.type}\u0000${entry.value.key}`,
);
const availableRelationshipTargets = computed(() =>
  props.roleOptions.filter(option => option.identity !== currentIdentity.value),
);
function updateArts(value: Record<string, { 等级: number; 经验: number }>) {
  entry.value.data['术之等级'] = value;
  applyRoleDerivedStats(entry.value.data, entry.value.type);
}
watchEffect(() => {
  entry.value.meta ??= { avatar: '', color: '#C9B485', avatarStyle: 'auto' };
  entry.value.meta.avatarStyle ??= 'auto';
  if (entry.value.type === 'user') entry.value.key = 'user';
  for (const key of ['生命', '体力', '精神']) {
    const status = entry.value.data?.生命状态?.[key];
    if (status && status.当前 !== status.最大值) status.当前 = status.最大值;
  }
});
</script>
<style scoped>
.role {
  display: grid;
  gap: 10px;
}
.dossier-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  background: linear-gradient(120deg, #1f211e, #141719);
  border: 1px solid #4d493b;
}
.dossier-toolbar p,
.dossier-toolbar h2 {
  margin: 0;
}
.dossier-toolbar p {
  color: #cbb477;
  font-size: 10px;
  letter-spacing: 0.18em;
}
.dossier-toolbar h2 {
  margin: 4px 0;
  font:
    500 26px Georgia,
    serif;
}
.dossier-toolbar span {
  color: #9d9689;
}
.editing-badge {
  padding: 6px 10px;
  color: #d8c38b !important;
  background: rgba(203, 180, 119, 0.1);
  border: 1px solid rgba(203, 180, 119, 0.35);
}
.dossier-hint {
  color: #8e887c !important;
  font-size: 12px;
}
.role-dossier {
  display: grid;
  gap: 10px;
  min-width: 0;
  max-width: 100%;
}
input[readonly] {
  color: #c8c1b3 !important;
  background: rgba(255, 255, 255, 0.025) !important;
  border-style: dashed !important;
  cursor: not-allowed;
}
.identity-preview {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 22px;
  align-items: center;
  padding: 20px;
  background: radial-gradient(circle at left, rgba(197, 160, 89, 0.12), transparent 46%), #17191c;
  border: 1px solid rgba(197, 160, 89, 0.28);
  min-width: 0;
  max-width: 100%;
}
.large-avatar {
  --avatar-size: 92px;
}
.visual-fields {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.visual-fields h3 {
  margin: 0;
}
.visual-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}
.visual-state {
  display: flex;
  align-items: center;
  gap: 10px;
}
.avatar-source {
  padding: 4px 8px;
  color: #a9a293;
  font-size: 11px;
  border: 1px solid #4b4f51;
}
.avatar-source.image {
  color: #9dd6ae;
  background: rgba(75, 132, 91, 0.12);
  border-color: #4b845b;
}
.visual-summary p {
  margin: 0 0 3px;
  color: #cbb477;
  font-size: 10px;
  letter-spacing: 0.16em;
}
.color-swatch {
  width: 34px;
  height: 34px;
  border: 5px solid #222629;
  border-radius: 50%;
  box-shadow: 0 0 0 1px #5a5e60;
}
.visual-editor {
  min-width: 0;
  max-width: 100%;
  border-top: 1px solid #34383a;
}
.visual-editor summary {
  padding: 10px 0;
  color: #bdb39f;
  cursor: pointer;
}
.visual-editor-body {
  display: grid;
  gap: 12px;
  min-width: 0;
  max-width: 100%;
  padding-top: 4px;
}
.visual-fields small {
  color: #9d9689;
}
.section-nav {
  position: sticky;
  top: 70px;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  padding: 8px;
  background: rgba(13, 15, 16, 0.94);
  border: 1px solid #393d3f;
}
.section-nav button {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 8px;
  text-align: left;
}
.section-nav button > span {
  grid-row: 1 / 3;
  color: #cbb477;
  font-size: 20px;
}
.section-nav button small {
  overflow: hidden;
  color: #9d9689;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.section-nav b {
  display: flex;
  align-items: center;
  gap: 6px;
}
.dirty-dot {
  width: 6px;
  height: 6px;
  background: #e1bd63;
  border-radius: 50%;
  box-shadow: 0 0 7px rgba(225, 189, 99, 0.7);
}
.section-nav button.active {
  color: #eee7d8 !important;
  background: linear-gradient(180deg, rgba(203, 180, 119, 0.16), rgba(203, 180, 119, 0.04)) !important;
  border-color: #cbb477 !important;
  box-shadow: inset 0 -2px #cbb477;
}
.section-nav button.active > span,
.section-nav button.active small {
  color: inherit;
}
.avatar-style-field {
  display: grid;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
}
.avatar-options {
  display: flex;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  gap: 10px;
  overflow-x: auto;
  padding: 6px;
}
.avatar-options button {
  display: grid;
  flex: 0 0 78px;
  gap: 7px;
  place-items: center;
  padding: 10px 5px !important;
}
.avatar-options button :deep(.role-avatar-frame) {
  --avatar-size: 42px;
}
.avatar-options button.active {
  border-color: #cbb477 !important;
  background: #2c2921 !important;
}
.avatar-options small {
  font-size: 11px;
}
.dossier-panel {
  min-width: 0;
  max-width: 100%;
  animation: panel-in 0.18s ease-out;
}
@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
}
.role,
section[id^='role-'] {
  scroll-margin-top: 118px;
  padding: 16px;
  background: #1d2123;
  border: 1px solid #393d3f;
}
.dossier-panel > .grid label,
.dossier-panel > label {
  color: #8f897e;
  font-size: 12px;
}
.dossier-panel > .grid input:not([type='checkbox']),
.dossier-panel > .grid textarea,
.dossier-panel > label input,
.dossier-panel > label textarea {
  padding: 8px 2px;
  color: #eee9df;
  font: inherit;
  font-size: 15px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid transparent;
  border-radius: 0;
}
.dossier-panel > .grid textarea,
.dossier-panel > label textarea {
  min-height: 52px;
  overflow: hidden;
  resize: vertical;
}
.dossier-panel > .grid input:focus,
.dossier-panel > .grid textarea:focus,
.dossier-panel > label input:focus,
.dossier-panel > label textarea:focus {
  outline: none;
  border-bottom-color: #cbb477;
  background: linear-gradient(180deg, transparent, rgba(203, 180, 119, 0.05));
}
.color-field {
  grid-template-columns: auto minmax(110px, 1fr);
  align-items: center;
}
.color-field input[type='color'] {
  width: 54px !important;
  padding: 3px !important;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.resource-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}
.resource-strip label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 15px;
  color: #cbb477;
  background: linear-gradient(135deg, rgba(203, 180, 119, 0.11), rgba(255, 255, 255, 0.018));
  border: 1px solid rgba(203, 180, 119, 0.28);
}
.resource-strip input {
  width: 120px !important;
  color: #fff4d4;
  font-size: 18px;
  font-weight: 700;
  text-align: right;
  background: transparent;
  border: 0;
  border-bottom: 1px solid rgba(203, 180, 119, 0.35);
}
.wide {
  grid-column: 1/-1;
}
.check {
  display: flex !important;
  align-items: center;
}
.check input {
  width: auto !important;
}
h3 {
  margin-top: 16px;
}
fieldset {
  border: 1px solid #393d3f;
}
@media (max-width: 720px) {
  .dossier-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .section-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    top: 58px;
  }
  .identity-preview {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
    padding: 14px;
  }
  .large-avatar {
    justify-self: center;
  }
  .visual-summary {
    align-items: flex-start;
    flex-direction: column;
  }
  .visual-state {
    width: 100%;
    justify-content: space-between;
  }
  .color-field {
    grid-template-columns: 1fr;
  }
  .grid {
    grid-template-columns: 1fr;
  }
  .resource-strip {
    grid-template-columns: 1fr;
  }
}
</style>
<!-- eslint-disable vue/no-mutating-props -->
