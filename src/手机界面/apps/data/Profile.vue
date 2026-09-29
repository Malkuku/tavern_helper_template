<template>
  <div v-if="user" class="data-sections profile-page">
    <section class="profile-overview" aria-label="档案概览">
      <div class="profile-overview-heading">
        <div>
          <span>个人资料</span>
          <h1>我的档案</h1>
          <div class="profile-points" aria-label="恶堕积分">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 3h10l5 7-10 12L2 10l5-7Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
              <path
                d="M2 10h20M7 3l-2 7 7 12 7-12-2-7M5 10h14"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linejoin="round"
              />
            </svg>
            <span>恶堕积分</span><strong>{{ user.恶堕积分 ?? '—' }}</strong>
          </div>
        </div>
        <div class="profile-rank">
          <span>当前评级</span>
          <RatingEmblem :rating="user.当前评级" tooltip-align="right" />
        </div>
      </div>
      <div class="profile-rating-progress" aria-label="评级贡献进度">
        <p>
          累计评级贡献 {{ user.评级贡献
          }}<span v-if="nextRating"> / {{ nextRating.threshold }}（晋升 {{ nextRating.rating }}）</span>
        </p>
        <progress
          v-if="nextRating"
          :value="user.评级贡献 - currentThreshold"
          :max="nextRating.threshold - currentThreshold"
        />
        <progress v-else :value="1" :max="1" aria-label="已达最高评级" />
        <p v-if="!nextRating">已达最高评级，后续任务仍会累计贡献。</p>
        <p>完成任务并领取奖励可累计评级贡献；D/C/B/A/S 任务分别贡献 1/3/8/24/72 点。积分可消费，贡献不会减少。</p>
        <p>任务、技能和道具正常生成时，最高为当前评级的后一档；低评级内容仍可出现。</p>
      </div>
    </section>
    <section class="data-card profile-info-card">
      <h3>身份</h3>
      <p class="data-prose">{{ user.基础信息.身份.join('、') || '暂无记录' }}</p>
    </section>
    <section v-for="field in editableFields" :key="field" class="data-card profile-info-card">
      <div class="item-heading">
        <h3>{{ field }}</h3>
        <button v-if="!editingField" type="button" class="data-text-button" @click="startEdit(field)">编辑</button>
      </div>
      <template v-if="editingField === field">
        <textarea v-model="draft" class="profile-editor" :aria-label="field" rows="6"></textarea>
        <p v-if="error" class="data-error" role="alert">{{ error }}</p>
        <div class="profile-actions">
          <button type="button" :disabled="saving" @click="cancelEdit">取消</button>
          <button type="button" class="primary" :disabled="saving" @click="save">
            {{ saving ? '保存中…' : '保存' }}
          </button>
        </div>
      </template>
      <p v-else class="data-prose">{{ profileFieldValue(user, field) || '暂无记录' }}</p>
    </section>
  </div>
  <div v-else class="data-empty"><strong>暂无个人资料</strong></div>
</template>

<script setup lang="ts">
import type { stat_data } from '../../types';
import { computed, ref } from 'vue';
import { useMagicGirlStatStore } from '../../store/StatStore';
import { profileFieldValue, type ProfileField } from './profileEdit';
import RatingEmblem from './RatingEmblem.vue';
import { ratingThreshold, ratings, userRatingFromContribution } from '../../store/userRating';

const props = defineProps<{ data: stat_data }>();
const user = computed(() => props.data.角色?.user);
const rating = computed(() => (user.value ? userRatingFromContribution(user.value.评级贡献) : 'D'));
const currentThreshold = computed(() => ratingThreshold[rating.value]);
const nextRating = computed(() => {
  const next = ratings[ratings.indexOf(rating.value) + 1];
  return next ? { rating: next, threshold: ratingThreshold[next] } : null;
});
const statStore = useMagicGirlStatStore();
const editableFields: ProfileField[] = ['背景', '外貌', '性格'];
const editingField = ref<ProfileField | null>(null);
const saving = ref(false);
const draft = ref('');
const error = ref('');
function startEdit(field: ProfileField) {
  if (!user.value) return;
  draft.value = profileFieldValue(user.value, field);
  error.value = '';
  editingField.value = field;
}
function cancelEdit() {
  editingField.value = null;
  error.value = '';
}
async function save() {
  const field = editingField.value;
  if (!field || saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    await statStore.saveProfileField(field, draft.value);
    editingField.value = null;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '保存失败，请重试。';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.profile-rating-progress {
  display: grid;
  gap: 6px;
  margin-top: 14px;
  color: #e6d6e1;
  font-size: 12px;
  line-height: 1.5;
}
.profile-rating-progress p {
  margin: 0;
}
.profile-rating-progress progress {
  width: 100%;
  height: 9px;
  accent-color: #d586b3;
}
</style>
