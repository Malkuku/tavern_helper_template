<template>
  <div class="data-intro">
    <span>个人资料</span>
    <h1>我的档案</h1>
  </div>
  <div v-if="user" class="data-sections">
    <section class="data-hero">
      <div class="hero-overline">当前身份</div>
      <h2>我的档案</h2>
      <div class="data-badges">
        <span>评级 {{ user.当前评级 || '未记录' }}</span>
      </div>
    </section>
    <div class="resource-grid">
      <div>
        <span>金钱</span><strong>{{ user.金钱 ?? '—' }}</strong>
      </div>
      <div>
        <span>恶堕积分</span><strong>{{ user.恶堕积分 ?? '—' }}</strong>
      </div>
    </div>
    <section class="data-card">
      <div class="item-heading">
        <h3>基本信息</h3>
        <button v-if="!editing" type="button" class="data-text-button" @click="startEdit">编辑</button>
      </div>
      <template v-if="editing">
        <textarea v-model="draft" class="profile-editor" aria-label="基本信息" rows="6"></textarea>
        <p v-if="error" class="data-error" role="alert">{{ error }}</p>
        <div class="profile-actions">
          <button type="button" :disabled="saving" @click="cancelEdit">取消</button>
          <button type="button" class="primary" :disabled="saving" @click="save">
            {{ saving ? '保存中…' : '保存' }}
          </button>
        </div>
      </template>
      <p v-else class="data-prose">{{ user.基础信息 || '暂无基本信息' }}</p>
    </section>
  </div>
  <div v-else class="data-empty"><strong>暂无个人资料</strong></div>
</template>

<script setup lang="ts">
import type { stat_data } from '../../types';
import { computed, ref, watch } from 'vue';
import { useMagicGirlStatStore } from '../../store/StatStore';

const props = defineProps<{ data: stat_data }>();
const user = computed(() => props.data.角色?.user);
const statStore = useMagicGirlStatStore();
const editing = ref(false);
const saving = ref(false);
const draft = ref('');
const error = ref('');
watch(
  () => props.data.角色?.user?.基础信息,
  value => {
    if (!editing.value) draft.value = value ?? '';
  },
);
function startEdit() {
  draft.value = user.value?.基础信息 ?? '';
  error.value = '';
  editing.value = true;
}
function cancelEdit() {
  editing.value = false;
  error.value = '';
}
async function save() {
  saving.value = true;
  error.value = '';
  try {
    await statStore.saveProfileBaseInfo(draft.value);
    editing.value = false;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '保存失败，请重试。';
  } finally {
    saving.value = false;
  }
}
</script>
