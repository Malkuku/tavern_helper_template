<template>
  <div class="data-intro">
    <span>个人资料</span>
    <h1>我的档案</h1>
    <p>你的身份与故事</p>
  </div>
  <div v-if="user" class="data-sections">
    <section class="data-hero">
      <div class="hero-overline">当前身份</div>
      <h2>{{ user.基础信息?.身份 || '未记录身份' }}</h2>
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
    <section v-if="user.基础信息" class="data-card">
      <h3>基本信息</h3>
      <div v-if="user.基础信息.背景" class="data-field">
        <span>背景</span>
        <p>{{ user.基础信息.背景 }}</p>
      </div>
      <div v-if="user.基础信息.外貌" class="data-field">
        <span>外貌</span>
        <p>{{ user.基础信息.外貌 }}</p>
      </div>
      <div v-if="user.基础信息.性格" class="data-field">
        <span>性格</span>
        <p>{{ user.基础信息.性格 }}</p>
      </div>
    </section>
  </div>
  <div v-else class="data-empty"><strong>暂无 user 数据</strong></div>
</template>

<script setup lang="ts">
import type { stat_data } from '../../types';
import { computed } from 'vue';

const props = defineProps<{ data: stat_data }>();
const user = computed(() => props.data.角色?.user);
</script>
