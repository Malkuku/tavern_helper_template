<template>
  <div class="dossier-toolbar">
    <div>
      <p>CHARACTER DOSSIER</p>
      <h2>{{ roleName }}</h2>
      <span>{{ entry.type }} · {{ entry.author || '未署名版本' }}</span>
    </div>
    <span class="editing-badge">编辑中</span>
  </div>
  <div class="role-dossier">
    <section class="identity-preview">
      <RoleAvatar
        class="large-avatar"
        :src="entry.meta?.avatar"
        :alt="roleName"
        :seed="entry.key"
        :fallback-style="entry.meta?.avatarStyle"
      />
      <div class="visual-fields">
        <h3>角色外观</h3>
        <AvatarMediaField v-model="entry.meta.avatar" />
        <div class="avatar-style-field">
          <span>默认头像</span>
          <div class="avatar-options">
            <button
              v-for="option in avatarStyles"
              :key="option.value"
              type="button"
              :class="{ active: entry.meta.avatarStyle === option.value }"
              @click="entry.meta.avatarStyle = option.value"
            >
              <RoleAvatar :src="''" :alt="option.label" :seed="entry.key" :fallback-style="option.value" /><small>{{
                option.label
              }}</small>
            </button>
          </div>
        </div>
        <label class="color-field"
          >主题颜色<input v-model="entry.meta.color" type="color" /><input
            v-model="entry.meta.color"
            pattern="#[0-9a-fA-F]{6}"
        /></label>
        <small>没有头像图片时，默认头像由角色 key 稳定生成；主题颜色用于主要角色的特殊对话框。</small>
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
        ><b>{{ item.label }}</b
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
        <label>角色 key<input v-model="entry.key" required :readonly="entry.type === 'user'" /></label
        ><label>作者<input v-model="entry.author" /></label
        ><label class="wide">素材说明<textarea v-model="entry.desc" /></label
        ><label v-if="entry.type !== 'user'">姓名<input v-model="entry.data.姓名" /></label
        ><label v-if="entry.type !== 'user'" class="check"
          ><input v-model="entry.data.在场" type="checkbox" />当前在场</label
        ><label v-if="entry.type !== '次要角色'">年龄<input v-model="entry.data.年龄" /></label
        ><label v-if="entry.type !== '次要角色'">当前身份<input v-model="entry.data.当前身份" /></label
        ><label v-if="entry.type === '主要角色'">当前想法<textarea v-model="entry.data.当前想法" /></label
        ><label v-if="entry.type === '主要角色'">外貌概括<textarea v-model="entry.data.外貌概括" /></label
        ><label v-if="entry.type === '次要角色'" class="wide">简介<textarea v-model="entry.data.简介" /></label>
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
        <label v-for="f in personality" :key="f">{{ f }}<textarea v-model="entry.data.性格[f]" /></label>
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
    <section v-show="activeTab === 'stats'" id="role-stats" class="dossier-panel">
      <h3>基础数值与生命</h3>
      <LifeStatusModule :data="entry.data" mode="edit" @update:data="entry.data = $event" />
    </section>
    <section v-show="activeTab === 'skills'" id="role-skills" class="dossier-panel">
      <SkillModule :data="entry.data.技能" :stats="entry.data" mode="edit" @update:data="entry.data.技能 = $event" />
      <RoleCardCollection v-model="entry.data['术之等级']" kind="术" :options="aspects" />
    </section>
    <section v-show="activeTab === 'items'" id="role-items" class="dossier-panel">
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
      <div v-if="entry.type === 'user'" class="grid">
        <label>金钱<input v-model.number="entry.data.金钱" type="number" /></label
        ><label>缥缈异质<input v-model.number="entry.data.缥缈异质" type="number" /></label>
      </div>
    </section>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import AvatarMediaField from './AvatarMediaField.vue';
import RoleAvatar from '../../尘史使徒/UI/components/common/RoleAvatar.vue';
import EntrySetEditor from './EntrySetEditor.vue';
import RoleCardCollection from './RoleCardCollection.vue';
import StringField from './StringField.vue';
import InventoryModule from '../../尘史使徒/UI/components/role/InventoryModule.vue';
import LifeStatusModule from '../../尘史使徒/UI/components/role/LifeStatusModule.vue';
import RelationshipModule from '../../尘史使徒/UI/components/role/RelationshipModule.vue';
import SkillModule from '../../尘史使徒/UI/components/role/SkillModule.vue';
import SpecialStatusModule from '../../尘史使徒/UI/components/role/SpecialStatusModule.vue';
const entry = defineModel<any>('entry', { required: true });
const props = withDefaults(defineProps<{ roleOptions?: { id: string; label: string; identity: string }[] }>(), {
  roleOptions: () => [],
});
defineEmits<{ requestTypeChange: [type: string] }>();
const personality = ['社交表现', '行动逻辑', '思维习惯', '人际距离', '道德底色'];
const aspects = ['杯', '刃', '启', '铸', '蛾', '心', '冬', '灯', '秘史', '无'];
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
  { id: 'stats', icon: '◇', label: '能力状态', note: '基础数值与生命' },
  { id: 'skills', icon: '✦', label: '技能与术', note: '能力和性相进度' },
  { id: 'items', icon: '▣', label: '状态物品', note: '效果与携带物' },
];
const visibleTabs = computed(() => tabs.filter(tab => tab.id !== 'personality' || entry.value.type !== '次要角色'));
const roleName = computed(() => entry.value.data?.姓名 || entry.value.key || '角色头像');
const currentIdentity = computed(() =>
  entry.value.type === 'user' ? 'user' : `${entry.value.type}\u0000${entry.value.key}`,
);
const availableRelationshipTargets = computed(() =>
  props.roleOptions.filter(option => option.identity !== currentIdentity.value),
);
watchEffect(() => {
  entry.value.meta ??= { avatar: '', color: '#C9B485', avatarStyle: 'auto' };
  entry.value.meta.avatarStyle ??= 'auto';
  if (entry.value.type === 'user') entry.value.key = 'user';
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
.role-dossier {
  display: grid;
  gap: 10px;
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
}
.large-avatar {
  --avatar-size: 92px;
}
.visual-fields {
  display: grid;
  gap: 8px;
}
.visual-fields h3 {
  margin: 0;
}
.visual-fields small {
  color: #9d9689;
}
.section-nav {
  position: sticky;
  top: 70px;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
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
.section-nav button.active {
  color: #17130c !important;
  background: #cbb477 !important;
  border-color: #cbb477 !important;
}
.section-nav button.active > span,
.section-nav button.active small {
  color: inherit;
}
.avatar-style-field {
  display: grid;
  gap: 8px;
}
.avatar-options {
  display: flex;
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
@media (max-width: 700px) {
  .dossier-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .section-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    top: 58px;
  }
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
<!-- eslint-disable vue/no-mutating-props -->
