<template>
  <div v-if="user" class="data-sections profile-page">
    <section class="profile-overview" aria-label="档案概览">
      <div class="profile-overview-heading">
        <div>
          <span>个人资料</span>
          <h1>档案概览</h1>
        </div>
        <div class="profile-rank">
          <span>当前评级</span>
          <div class="profile-rank-emblem" :data-rank="user.当前评级 || undefined">
            <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
              <path
                d="M32 2 44 11 59 12 60 27 62 32 60 37 59 52 44 53 32 62 20 53 5 52 4 37 2 32 4 27 5 12 20 11Z"
                fill="currentColor"
                fill-opacity=".11"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                d="M32 8 42 16 54 17 55 29 58 32 55 35 54 47 42 48 32 56 22 48 10 47 9 35 6 32 9 29 10 17 22 16Z"
                stroke="currentColor"
                stroke-opacity=".55"
              />
              <path
                d="m32 12 2.7 7.3L42 22l-7.3 2.7L32 32l-2.7-7.3L22 22l7.3-2.7L32 12Z"
                fill="currentColor"
                fill-opacity=".7"
              />
            </svg>
            <strong>{{ user.当前评级 || '—' }}</strong>
          </div>
          <small v-if="!user.当前评级">未记录</small>
        </div>
      </div>
      <div class="profile-resources">
        <div>
          <span>金钱</span><strong>{{ user.金钱 ?? '—' }}</strong>
        </div>
        <div>
          <span>恶堕积分</span><strong>{{ user.恶堕积分 ?? '—' }}</strong>
        </div>
      </div>
    </section>
    <section class="data-card profile-info-card">
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
      <p v-else class="data-prose">
        {{ user.基础信息.身份.join('、') }}<br />{{ user.基础信息.背景 || '暂无基本信息' }}
      </p>
      <p class="data-prose">{{ user.外貌 }}</p>
      <p class="data-prose">{{ user.性格 }}</p>
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
  () => props.data.角色?.user?.基础信息.背景,
  value => {
    if (!editing.value) draft.value = value ?? '';
  },
);
function startEdit() {
  draft.value = user.value?.基础信息.背景 ?? '';
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
