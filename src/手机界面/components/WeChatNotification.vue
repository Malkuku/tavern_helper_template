<template>
  <div class="phone-notification" role="status">
    <button class="phone-notification-open" type="button" :aria-label="`打开${title}的微信消息`" @click="emit('open')">
      <span v-if="appearance.image" class="phone-notification-avatar"><img :src="appearance.image" alt="" /></span>
      <span v-else-if="session?.类型 === '群聊'" class="phone-notification-avatar phone-notification-group">群</span>
      <WeChatAvatar v-else :id="avatarId" :accounts="data.账号" />
      <span class="phone-notification-copy">
        <strong>{{ title }}</strong>
        <small>{{ preview }}</small>
      </span>
    </button>
    <button class="phone-notification-close" type="button" aria-label="关闭微信消息提示" @click="emit('close')">
      ×
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { 微信数据, 微信消息 } from '../types';
import { chatTitle, contentSummary } from '../apps/wechat/wechatData';
import WeChatAvatar from '../apps/wechat/WeChatAvatar.vue';

const props = defineProps<{ data: 微信数据; notice: { key: string; message: 微信消息 } }>();
const emit = defineEmits<{ open: []; close: [] }>();
const session = computed(() => props.data.会话[props.notice.key]);
const appearance = computed<{ name?: string; image?: string }>(() => {
  try {
    return (
      getVariables({ type: 'script', script_id: getScriptId() })?.magicGirlWeChatAppearance?.[props.notice.key] || {}
    );
  } catch {
    return {};
  }
});
const title = computed(
  () => appearance.value.name || (session.value ? chatTitle(props.notice.key, session.value, props.data) : '微信'),
);
const avatarId = computed(() => session.value?.成员.find(id => id !== 'user') || props.notice.message.发送者);
const preview = computed(() => {
  const summary = contentSummary(props.notice.message.内容);
  return session.value?.类型 === '群聊'
    ? `${props.data.账号[props.notice.message.发送者]?.昵称 || props.notice.message.发送者}：${summary}`
    : summary;
});
</script>
