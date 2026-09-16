<template>
  <section id="role-basic" class="role">
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
      <label v-if="entry.type !== 'user'">姓名<input v-model="entry.data.姓名" /></label
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
      <h3>语料</h3>
      <EntrySetEditor v-model="entry.data.语料" label="语料场景" :create="() => []">
        <template #entry="p"><StringField v-model="p.entry" label="语句" /></template>
      </EntrySetEditor>
    </template>
    <StringField v-if="entry.type === '次要角色'" v-model="entry.data.性格标签" label="性格标签" />
  </section>
  <section v-if="entry.type !== '次要角色'" id="role-personality">
    <h3>性格与关系</h3>
    <div class="grid">
      <label v-for="f in personality" :key="f">{{ f }}<textarea v-model="entry.data.性格[f]" /></label>
    </div>
    <h3>人际关系</h3>
    <EntrySetEditor
      v-model="entry.data.人际关系"
      label="关系对象"
      :create="() => ({ 认知了解: '', 情感羁绊: '', 利益纽带: '' })"
      ><template #entry="p"
        ><div class="grid">
          <label v-for="f in ['认知了解', '情感羁绊', '利益纽带']" :key="f"
            >{{ f }}<textarea v-model="p.entry[f]" />
          </label></div></template
    ></EntrySetEditor>
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
  <section id="role-stats">
    <h3>基础数值与生命</h3>
    <div class="stats grid">
      <label v-for="f in ['力量', '敏捷', '智慧', '魅力']" :key="f"
        >{{ f }}<input v-model.number="entry.data.基础数值[f]" type="number"
      /></label>
    </div>
    <h3>生命状态</h3>
    <div class="grid">
      <fieldset v-for="f in ['生命', '体力', '精神']" :key="f">
        <legend>{{ f }}</legend>
        <label>当前<input v-model.number="entry.data.生命状态[f].当前" type="number" /></label
        ><label>最大值<input v-model.number="entry.data.生命状态[f].最大值" type="number" /></label>
      </fieldset>
    </div>
  </section>
  <section id="role-skills">
    <h3>技能与术</h3>
    <EntrySetEditor
      v-model="entry.data.技能"
      label="技能"
      :create="() => ({ 性相: '', 技能等级: 0, 描述: '', 消耗: '', 作用: '' })"
      ><template #entry="p"
        ><div class="grid">
          <label v-for="f in ['性相', '描述', '消耗', '作用']" :key="f">{{ f }}<textarea v-model="p.entry[f]" /></label
          ><label>技能等级<input v-model.number="p.entry.技能等级" type="number" /></label></div></template
    ></EntrySetEditor>
    <h3>术之等级</h3>
    <EntrySetEditor v-model="entry.data['术之等级']" label="性相" :create="() => ({ 等级: 0, 经验: 0 })"
      ><template #entry="p"
        ><div class="grid">
          <label>等级<input v-model.number="p.entry.等级" type="number" /></label
          ><label>经验<input v-model.number="p.entry.经验" type="number" /></label></div></template
    ></EntrySetEditor>
  </section>
  <section id="role-items">
    <h3>特殊状态与物品</h3>
    <EntrySetEditor
      v-if="typeof entry.data.特殊状态 === 'object'"
      v-model="entry.data.特殊状态"
      label="状态"
      :create="() => ({ 描述: '', 效果: '', 持续时间: '' })"
      ><template #entry="p"
        ><div class="grid">
          <label v-for="f in ['描述', '效果', '持续时间']" :key="f"
            >{{ f }}<textarea v-model="p.entry[f]" />
          </label></div></template></EntrySetEditor
    ><label v-else>共享说明<input v-model="entry.data.特殊状态" /></label>
    <h3>物品</h3>
    <EntrySetEditor
      v-if="typeof entry.data.物品 === 'object'"
      v-model="entry.data.物品"
      label="物品"
      :create="() => ({ 类型: '', 品质: '凡庸', 描述: '', 作用: '', 数量: 0, 耐久: 0 })"
      ><template #entry="p"
        ><div class="grid">
          <label>类型<input v-model="p.entry.类型" /></label
          ><label
            >品质<select v-model="p.entry.品质">
              <option v-for="q in qualities" :key="q">{{ q }}</option>
            </select></label
          ><label>描述<textarea v-model="p.entry.描述" /></label
          ><label v-if="!Array.isArray(p.entry.作用)">作用<textarea v-model="p.entry.作用" /></label
          ><label>数量<input v-model.number="p.entry.数量" type="number" /></label
          ><label>耐久<input v-model.number="p.entry.耐久" type="number" /></label>
        </div>
        <StringField
          v-if="Array.isArray(p.entry.作用)"
          v-model="p.entry.作用"
          label="作用" /></template></EntrySetEditor
    ><label v-else>共享说明<input v-model="entry.data.物品" /></label>
    <div v-if="entry.type === 'user'" class="grid">
      <label>金钱<input v-model.number="entry.data.金钱" type="number" /></label
      ><label>缥缈异质<input v-model.number="entry.data.缥缈异质" type="number" /></label>
    </div>
  </section>
</template>
<script setup lang="ts">
import EntrySetEditor from './EntrySetEditor.vue';
import StringField from './StringField.vue';
const entry = defineModel<any>('entry', { required: true });
defineEmits<{ requestTypeChange: [type: string] }>();
const personality = ['社交表现', '行动逻辑', '思维习惯', '人际距离', '道德底色'];
const qualities = ['凡庸', '遗物', '珍品', '禁忌', '神造', '遗片', '佚存', '残卷', '蛀损', '完帙', '未知'];
</script>
<style scoped>
.role {
  display: grid;
  gap: 10px;
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
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
<!-- eslint-disable vue/no-mutating-props -->
