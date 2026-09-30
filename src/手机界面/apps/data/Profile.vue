<template>
  <div v-if="user" class="data-sections profile-page">
    <section class="profile-overview" aria-label="档案概览">
      <div class="profile-overview-heading">
        <div>
          <span>个人资料</span>
          <h1>我的档案</h1>
          <div class="profile-points" aria-label="恶堕积分" :title="corruptionPointsHelp">
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
          <RatingEmblem :rating="user.当前评级" tooltip-align="right" kind="contribution" />
        </div>
      </div>
      <div class="profile-rating-progress" aria-label="评级贡献进度">
        <div class="profile-rating-line">
          <span>
            累计评级贡献 <strong>{{ user.评级贡献 }}</strong
            ><span v-if="nextRating"> / {{ nextRating.threshold }}（晋升 {{ nextRating.rating }}）</span>
          </span>
          <span class="profile-rating-help">
            <button
              type="button"
              class="profile-rating-help-button"
              aria-label="查看评级贡献规则"
              :aria-describedby="ratingHelpId"
              @click="showRatingHelp = !showRatingHelp"
              @blur="showRatingHelp = false"
              @keydown.esc="showRatingHelp = false"
            >
              ?
            </button>
            <span :id="ratingHelpId" class="profile-rating-tooltip" :class="{ open: showRatingHelp }" role="tooltip">
              <strong>怎么升级？</strong>
              <span>做完任务后，记得领取奖励。领取时会增加评级贡献；攒够进度条上的数字就能升级。</span>
              <span>任务等级越高，贡献越多：D 级 +1、C 级 +3、B 级 +8、A 级 +24、S 级 +72。</span>
              <span>新出现的任务、技能和道具等级会受到评级的影响。</span>
            </span>
          </span>
        </div>
        <progress
          v-if="nextRating"
          :value="user.评级贡献 - currentThreshold"
          :max="nextRating.threshold - currentThreshold"
        />
        <progress v-else :value="1" :max="1" aria-label="已达最高评级" />
        <p v-if="!nextRating">已达最高评级，后续任务仍会累计贡献。</p>
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
import { computed, ref, useId } from 'vue';
import { useMagicGirlStatStore } from '../../store/StatStore';
import { profileFieldValue, type ProfileField } from './profileEdit';
import RatingEmblem from './RatingEmblem.vue';
import { ratingThreshold, ratings, userRatingFromContribution } from '../../store/userRating';
import { corruptionPointsHelp } from '../witch/corruptionPointsHelp';

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
const ratingHelpId = useId();
const showRatingHelp = ref(false);
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
.profile-rating-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.profile-rating-line strong {
  color: #fff1f7;
  font-variant-numeric: tabular-nums;
}
.profile-rating-help {
  position: relative;
  display: inline-flex;
  flex: none;
}
.profile-rating-help-button {
  display: grid;
  place-items: center;
  width: 19px;
  height: 19px;
  padding: 0;
  border: 1px solid #b984a3;
  border-radius: 50%;
  background: #ffffff12;
  color: #f4ccdf;
  font-size: 12px;
  line-height: 1;
  cursor: help;
}
.profile-rating-help-button:focus-visible {
  outline: 2px solid #f4ccdf;
  outline-offset: 2px;
}
.profile-rating-tooltip {
  position: absolute;
  z-index: 20;
  top: calc(100% + 9px);
  right: 0;
  display: grid;
  gap: 7px;
  width: min(252px, calc(100vw - 65px));
  padding: 11px 13px;
  border: 1px solid #b984a3;
  border-radius: 10px;
  background: #201523;
  box-shadow: 0 9px 22px #08040acb;
  color: #f5e9ef;
  font-size: 11px;
  line-height: 1.5;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition:
    opacity 0.16s ease,
    transform 0.16s ease,
    visibility 0.16s;
  pointer-events: none;
}
.profile-rating-tooltip strong {
  color: #f3b5d3;
  font-size: 12px;
}
.profile-rating-help:hover .profile-rating-tooltip,
.profile-rating-help-button:focus-visible + .profile-rating-tooltip,
.profile-rating-tooltip.open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
@media (prefers-reduced-motion: reduce) {
  .profile-rating-tooltip {
    transition: none;
  }
}
</style>
