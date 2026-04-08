<template>
  <div class="library-container">
    <BurnIntro v-if="showIntro" @complete="handleIntroComplete" />
    <LibraryHeader
      :currentMode="currentMode"
      :modes="modes"
      :redDots="redDots"
      :userHeterogeneity="userHeterogeneity"
      :aliceSetting="aliceSetting"
      @switchMode="switchMode"
      @changeSetting="handleAliceChange"
    />

    <div class="main-content-area">
      <ChatArea
        v-show="currentMode === '对话'"
        ref="chatAreaRef"
        :chatContents="chatContents"
        :isThinking="isThinking"
        :isDeleteMode="isDeleteMode"
        :selectedMessages="selectedMessages"
        :aliceSetting="aliceSetting"
        @toggleSelect="toggleSelect"
      />

      <ItemSellArea
        v-show="currentMode === '物品出售'"
        :itemSells="itemSells"
      />

      <!-- 监听 transaction-complete 事件，触发立即刷新 -->
      <SkillBuyArea
        v-show="currentMode === '技能购买'"
        :skillBuys="skillBuys"
        @transaction-complete="fetchAll"
      />

      <SecretBuyArea
        v-show="currentMode === '秘传购买'"
        :secretBuys="secretBuys"
      />

      <ExpBuyArea v-show="currentMode === '经验兑换'" />

      <!-- [REFACTORED] 聊天总结展示模块 -->
      <div v-show="currentMode === '聊天总结'" class="scroll-area log-view">
        <div class="log-container">
          <!-- Header -->
          <div class="log-header">
            <h3 class="log-title">图书馆日志</h3>
            <div class="log-tools">
              <button @click="toggleLogDeleteMode" class="tool-button" :class="{active: isLogDeleteMode}">
                {{ isLogDeleteMode ? '完成' : '批量管理' }}
              </button>
              <button v-if="isLogDeleteMode && selectedLogIds.length > 0" @click="deleteSelectedLogs" class="tool-button danger">
                删除选中 ({{ selectedLogIds.length }})
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="log-content">
            <div v-if="diaryLogs.length === 0" class="log-empty-state">
              <p>暂无日志记录</p>
              <span>请在对话页面点击下方工具栏生成总结</span>
            </div>
            <div v-else class="log-timeline">
              <div
                v-for="log in diaryLogs"
                :key="log.id"
                class="log-item"
                :class="{
                  expanded: log.expanded,
                  'selection-mode': isLogDeleteMode,
                  'selected-for-deletion': isLogDeleteMode && selectedLogIds.includes(log.id)
                }"
              >
                <div class="log-item__header" @click="!isLogDeleteMode && toggleLogExpansion(log.id)">
                  <div class="log-item__selection">
                    <label class="delete-checkbox-wrapper" @click.stop>
                      <input
                        v-if="isLogDeleteMode"
                        type="checkbox"
                        :value="log.id"
                        v-model="selectedLogIds"
                        class="delete-checkbox"
                      />
                      <div v-else class="timeline-marker"></div>
                    </label>
                  </div>
                  <div class="log-item__meta">
                    <span class="log-time">{{ log.time }}</span>
                    <span class="log-preview">{{ log.preview }}</span>
                  </div>
                  <div class="log-item__toggle">
                    <svg class="expand-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                  </div>
                </div>
                <div class="log-item__body-wrapper">
                  <div v-if="log.expanded" class="log-item__body">
                    <div class="log-text">{{ log.content }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <InputArea
      :isDeleteMode="isDeleteMode"
      :selectedCount="selectedMessages.length"
      @sendMessage="sendMessage"
      @toggleDeleteMode="toggleDeleteMode"
      @deleteSelected="deleteSelected"
      @clearAll="clearChat"
      @triggerSummary="handleTriggerSummary"
    />
  </div>
</template>


<script setup>
import { ref, reactive, inject, onMounted, onUnmounted, computed, watch } from 'vue';
import { MvuUtil } from '@/Utils/MvuUtil';
import { WorldInfoUtil } from '@/Utils/WorldInfoUtil';
import { useStatStore } from '@/尘史使徒/UI/store/StatStore';
import { welcomeMessage } from '@/尘史使徒/UI/components/library/开场白';
import LibraryHeader from '@/尘史使徒/UI/components/library/LibraryHeader.vue';
import BurnIntro from '@/尘史使徒/UI/components/library/BurnIntro.vue';
import ChatArea from '@/尘史使徒/UI/components/library/ChatArea.vue';
import ItemSellArea from '@/尘史使徒/UI/components/library/ItemSellArea.vue';
import SkillBuyArea from '@/尘史使徒/UI/components/library/SkillBuyArea.vue';
import SecretBuyArea from '@/尘史使徒/UI/components/library/SecretBuyArea.vue';
import InputArea from '@/尘史使徒/UI/components/library/InputArea.vue';
import ExpBuyArea from '@/尘史使徒/UI/components/library/ExpBuyArea.vue';
import { useAudioStore } from '@/尘史使徒/UI/store/AudioStore';

const showToast = inject('showToast', (msg) => console.log(msg));
const statStore = useStatStore();
const audioStore = useAudioStore();

// 1. 初始化音频资源（将列表注入底层 API）
audioStore.initAudioResources();

const modes = ['聊天总结','对话', '物品出售', '技能购买', '秘传购买', '经验兑换'];
const currentMode = ref('对话');
const isSending = ref(false);
const isThinking = ref(false);
const showIntro = ref(true);
const isDeleteMode = ref(false);
const selectedMessages = ref([]);
const chatContents = ref([]);
const welcomeContent = ref(''); // 仍然保留，用于清空记录时的原始文本
const chatAreaRef = ref(null);
const itemSells = ref({});
const skillBuys = ref({});
const secretBuys = ref({});
const redDots = reactive({ '物品出售': false, '技能购买': false, '秘传购买': false, '聊天总结': false });
const lastRawRecords = { ItemSell: null, SkillBuy: null, SecretBuy: null, Summary: null };
let pollingTimer = null;

// --- 日志总结相关状态 ---
const diaryLogs = ref([]); // { id, time, content, preview, expanded, fullBlock }
const isLogDeleteMode = ref(false);
const selectedLogIds = ref([]);
// ---

// 修复标签相关的状态
const isFixingTags = ref(false);
const lastFixTime = ref(0);

const userHeterogeneity = computed(() => statStore.stat_data?.角色?.user?.缥缈异质 || 0);

// 爱丽丝设定状态
const aliceSetting = ref('女儿爱丽丝');
let isSettingInitialized = false;
let welcomeMessageInitialized = false; // 【新增】欢迎语初始化旗标

// 监听并初始化爱丽丝设定
watch(() => statStore.stat_data?.['图书馆']?.['爱丽丝设定'], (newVal) => {
  if (newVal && !isSettingInitialized) {
    aliceSetting.value = newVal;
    isSettingInitialized = true;
  }
}, { immediate: true });

// 切换爱丽丝设定
const handleAliceChange = async (newSetting) => {
  if (aliceSetting.value === newSetting) return; // 防止重复触发

  const confirmSwitch = window.confirm(
    "切换人设将清空当前的聊天记录和聊天总结。\n此操作不可撤销，如有需要请在继续前自行保存条目内容。\n\n是否继续？"
  );
  if (!confirmSwitch) {
    return;
  }

  aliceSetting.value = newSetting;
  chatContents.value = [];
  welcomeContent.value = '';
  diaryLogs.value = []; // 清空前端显示的总结
  welcomeMessageInitialized = false; // 【修改】重置欢迎语旗标，以便为新会话重新判断

  try {
    // 同时清空聊天记录和聊天总结的 WI 条目
    await WorldInfoUtil.updateEntryContent('<图书馆>聊天记录', '');
    await WorldInfo_util.updateEntryContent('<图书馆>聊天总结', '');
    await MvuUtil.updateMvuDataByDiff({ "图书馆": { "爱丽丝设定": newSetting } });
    showToast(`已切换为：${newSetting}，聊天记录与总结已清空`);
    await syncChatRecord();
  } catch (error) {
    console.error("切换设定失败:", error);
    showToast("切换设定失败");
  }
};

const switchMode = (mode) => {
  currentMode.value = mode;
  if (redDots[mode]) redDots[mode] = false;
  if (mode === '对话' && chatAreaRef.value) chatAreaRef.value.scrollToBottom();
};

const toggleDeleteMode = () => {
  isDeleteMode.value = !isDeleteMode.value;
  if (!isDeleteMode.value) selectedMessages.value = [];
};

const toggleSelect = (id) => {
  const pos = selectedMessages.value.indexOf(id);
  if (pos === -1) selectedMessages.value.push(id);
  else selectedMessages.value.splice(pos, 1);
};

// 修改：清空聊天记录 (不再保留30条，直接清空)
const clearChat = async () => {
  const isConfirm = window.confirm("确定要清空所有聊天记录吗？\n（将仅保留开场白，此操作不可撤销）");
  if (!isConfirm) return;

  try {
    const entryName = '<图书馆>聊天记录';

    // 构造新的内容，仅保留开场白
    let newRaw = '';
    if (welcomeContent.value) {
      newRaw = `<welcome>\n${welcomeContent.value}\n</welcome>`;
    }

    await WorldInfoUtil.updateEntryContent(entryName, newRaw);
    showToast("记录已清空");
    await syncChatRecord(); // 刷新界面
  } catch (error) {
    console.error("清空记录失败:", error);
    showToast("清空失败");
  }
};

const deleteSelected = async () => {
  const selectedIds = selectedMessages.value;
  if (!selectedIds || selectedIds.length === 0) return;

  // 过滤掉被选中的消息
  const newMessages = chatContents.value.filter(msg => !selectedIds.includes(msg.id));
  chatContents.value = newMessages;

  const entryName = '<图书馆>聊天记录';
  let newRaw = '';
  let currentContentBlock = []; // 用于收集连续的 npc/aside

  // 辅助函数：将收集到的 npc/aside 打包成一个 <content>
  const flushContentBlock = () => {
    if (currentContentBlock.length > 0) {
      newRaw += `<content>\n${currentContentBlock.join('\n')}\n</content>\n`;
      currentContentBlock = [];
    }
  };

  // 遍历剩余消息，重组 XML (跳过欢迎语)
  for (const m of newMessages) {
    if (m.isWelcome) continue; // 跳过欢迎语部分

    if (m.type === 'user') {
      flushContentBlock(); // 遇到玩家发言，先结算之前的 content 块
      newRaw += `<user_say>\n${m.text}\n</user_say>\n`;
    } else if (m.type === 'aside') {
      currentContentBlock.push(`<旁白>${m.text}</旁白>`);
    } else if (m.type === 'npc') {
      currentContentBlock.push(`<对话>${m.text}</对话>`);
    }
  }
  flushContentBlock(); // 循环结束，结算最后剩余的 content 块

  newRaw = newRaw.trim();
  if (welcomeContent.value) newRaw += `\n<welcome>\n${welcomeContent.value}\n</welcome>`;

  try {
    await WorldInfoUtil.updateEntryContent(entryName, newRaw);
    showToast("删除成功");
  } catch (e) {
    console.error(e);
    showToast("删除失败");
  } finally {
    selectedMessages.value = [];
    isDeleteMode.value = false;
  }
};

const sendMessage = async (text) => {
  if (isDeleteMode.value) { isDeleteMode.value = false; selectedMessages.value = []; }
  isSending.value = true;
  chatContents.value.push({ id: 'msg_' + Date.now(), type: 'user', text: text });
  if (chatAreaRef.value) chatAreaRef.value.scrollToBottom();
  isThinking.value = true;
  try {
    const entryName = '<图书馆>聊天记录';
    let rawText = await WorldInfoUtil.getWorldBookContent([entryName]);
    const newUserTag = `<user_say>\n${text}\n</user_say>`;

    // 【修改】直接追加新消息，不再强制插入到 welcome 之前
    rawText += `\n${newUserTag}`;

    await WorldInfoUtil.updateEntryContent(entryName, rawText);
    await MvuUtil.updateMvuDataByDiff({ "图书馆": { "玩家输入": text } });
    eventEmit("图书馆对话");
    if (currentMode.value !== '对话') switchMode('对话');
  } catch (error) {
    console.error("发送失败:", error);
    showToast("发送失败");
    isThinking.value = false;
  } finally {
    isSending.value = false;
  }
};

// 触发总结功能
const handleTriggerSummary = async () => {
  try {
    // 触发全局事件
    if (typeof eventEmit === 'function') {
      eventEmit("总结图书馆聊天记录");
      showToast("正在请求爱丽丝整理记录...");
    } else {
      console.warn("eventEmit function not found");
    }
    // 切换到总结页面
    switchMode('聊天总结');
    // 尝试立即读取一次
    await fetchSummary();
  } catch (e) {
    console.error("触发总结失败", e);
  }
};

// --- 读取并解析总结内容 ---
const fetchSummary = async () => {
  try {
    const rawText = await WorldInfoUtil.getWorldBookContent(['<图书馆>聊天总结']);

    // 检查内容是否有变化，无变化则跳过解析
    if (lastRawRecords.Summary === rawText) {
      return;
    }

    if (lastRawRecords.Summary !== null && currentMode.value !== '聊天总结') {
      redDots['聊天总结'] = true;
    }
    lastRawRecords.Summary = rawText;

    const parsedLogs = [];
    const diaryRegex = /<DiaryLog>([\s\S]*?)<\/DiaryLog>/g;
    let match;
    let idCounter = 0;

    while ((match = diaryRegex.exec(rawText)) !== null) {
      const fullBlock = match[0];
      const innerContent = match[1].trim();
      const timeMatch = innerContent.match(/<time>(.*?)<\/time>/);
      const time = timeMatch ? timeMatch[1] : '未知时间';

      // 移除time标签，剩下的作为正文
      const content = innerContent.replace(/<time>.*?<\/time>\s*/, '').trim();
      const preview = content.substring(0, 40) + (content.length > 40 ? '...' : '');

      // 查找旧日志以保留展开状态
      const oldLog = diaryLogs.value.find(l => l.fullBlock === fullBlock);

      parsedLogs.push({
        id: idCounter++,
        time,
        content,
        preview,
        expanded: oldLog ? oldLog.expanded : false, // 保留旧的展开状态
        fullBlock, // 保存原始的完整XML块，便于删除和比对
      });
    }

    diaryLogs.value = parsedLogs.reverse(); // 让最新的日志显示在最上面

  } catch (e) {
    console.error("读取总结失败", e);
  }
};

// --- 日志条目展开/折叠逻辑 ---
const toggleLogExpansion = (logId) => {
  diaryLogs.value.forEach(log => {
    if (log.id === logId) {
      log.expanded = !log.expanded;
    } else {
      log.expanded = false; // 关闭其他所有条目
    }
  });
};

// --- 日志批量删除相关逻辑 ---
const toggleLogDeleteMode = () => {
  isLogDeleteMode.value = !isLogDeleteMode.value;
  if (!isLogDeleteMode.value) {
    selectedLogIds.value = []; // 退出删除模式时清空选项
  }
};

const deleteSelectedLogs = async () => {
  if (selectedLogIds.value.length === 0) return;

  const isConfirm = window.confirm(`确定要永久删除这 ${selectedLogIds.value.length} 条日志吗？\n此操作不可撤销。`);
  if (!isConfirm) return;

  try {
    // 过滤出需要保留的日志
    const logsToKeep = diaryLogs.value.filter(log => !selectedLogIds.value.includes(log.id));
    // 从保留的日志中重构WI内容 (注意，我们之前反转了数组，这里要反转回来再保存)
    const newRawContent = logsToKeep.reverse().map(log => log.fullBlock).join('\n\n');

    await WorldInfoUtil.updateEntryContent('<图书馆>聊天总结', newRawContent);
    showToast("选中的日志已删除");

    // 重置状态并刷新
    selectedLogIds.value = [];
    isLogDeleteMode.value = false;
    await fetchSummary(); // 重新获取数据刷新界面

  } catch (error) {
    console.error("删除日志失败:", error);
    showToast("删除日志失败");
  }
};


const syncChatRecord = async () => {
  if (isDeleteMode.value) return;
  try {
    const entryName = '<图书馆>聊天记录';
    let rawText = await WorldInfoUtil.getWorldBookContent([entryName]);

    // --- 智能修复标签逻辑 Start ---
    const fixRegexClose = /<\/(对话|旁白|content|user_say)\s*(?!>)/g;
    const fixRegexOpen = /<(对话|旁白|content|user_say)\s*(?!>)/g;

    let fixedText = rawText;
    let needsFix = false;

    if (fixRegexClose.test(fixedText)) {
      fixedText = fixedText.replace(fixRegexClose, '</$1>');
      needsFix = true;
    }
    if (fixRegexOpen.test(fixedText)) {
      fixedText = fixedText.replace(fixRegexOpen, '<$1>');
      needsFix = true;
    }

    if (needsFix && fixedText !== rawText) {
      const now = Date.now();
      if (!isFixingTags.value && (now - lastFixTime.value > 2000)) {
        isFixingTags.value = true;
        console.log("检测到XML标签缺失，正在智能修复...");
        try {
          await WorldInfoUtil.updateEntryContent(entryName, fixedText);
          rawText = fixedText;
          lastFixTime.value = now;
        } catch (e) {
          console.error("智能修复标签写入失败:", e);
        } finally {
          isFixingTags.value = false;
        }
      } else {
        rawText = fixedText;
      }
    }
    // --- 智能修复标签逻辑 End ---

    // 1. 提取外层区块
    const outerRegex = /<(content|user_say)>([\s\S]*?)<\/\1>/g;
    const outerBlocks = [];
    let match;
    while ((match = outerRegex.exec(rawText)) !== null) {
      outerBlocks.push({
        tag: match[1],
        innerRaw: match[2].trim(),
        fullRaw: match[0]
      });
    }

    // 2. 处理开场白逻辑
    let currentWelcome = '';
    const welcomeMatch = rawText.match(/<welcome>([\s\S]*?)<\/welcome>/);
    if (welcomeMatch) currentWelcome = welcomeMatch[1].trim();

    let needsUpdate = false;

    // 【修改】这段逻辑仅在会话初次加载时执行一次
    if (!welcomeMessageInitialized) {
      let w1, w2;
      if (aliceSetting.value === '妹妹爱丽丝') {
        w1 = welcomeMessage.sisterWelcome1; w2 = welcomeMessage.sisterWelcome2;
      } else if (aliceSetting.value === '妈妈爱丽丝') {
        w1 = welcomeMessage.motherWelcome1; w2 = welcomeMessage.motherWelcome2;
      } else {
        w1 = welcomeMessage.daughterWelcome1; w2 = welcomeMessage.daughterWelcome2;
      }

      const targetWelcome = outerBlocks.length === 0 ? w1 : w2;
      if (currentWelcome !== targetWelcome) {
        currentWelcome = targetWelcome;
        needsUpdate = true;
      }

      // 【修改】结构检查逻辑移至此处，仅在初始化时执行，避免后续操作改变位置
      const isStructureWrong = welcomeMatch && !rawText.trim().endsWith('</welcome>');
      if (isStructureWrong) {
        needsUpdate = true;
      }

      welcomeMessageInitialized = true; // 标记为已初始化
    }

    if (needsUpdate) {
      let newRaw = outerBlocks.map(b => b.fullRaw).join('\n');
      if (currentWelcome) newRaw += `\n<welcome>\n${currentWelcome}\n</welcome>`;
      await WorldInfoUtil.updateEntryContent(entryName, newRaw);
    }

    // 【重构】统一解析所有消息块，以保证其在文件流中的原始顺序
    const allMessages = [];
    const blockRegex = /<(content|user_say|welcome)>([\s\S]*?)<\/\1>/g;
    let blockMatch;
    let welcomeIndex = 0;
    let rawWelcomeForClear = ''; // 用于清空聊天功能

    while ((blockMatch = blockRegex.exec(rawText)) !== null) {
      const tag = blockMatch[1];
      const innerRaw = blockMatch[2].trim();

      // A. 如果是欢迎语块
      if (tag === 'welcome') {
        rawWelcomeForClear = innerRaw; // 保存原始欢迎语文本，用于"清空"功能
        const innerRegex = /<(对话|旁白)>([\s\S]*?)<\/\1>/g;
        let innerMatch;
        let hasInnerTags = false;
        while ((innerMatch = innerRegex.exec(innerRaw)) !== null) {
          hasInnerTags = true;
          allMessages.push({
            id: `welcome_${welcomeIndex++}`,
            type: innerMatch[1] === '对话' ? 'npc' : 'aside',
            text: innerMatch[2].trim(),
            isWelcome: true
          });
        }
        if (!hasInnerTags && innerRaw) {
          allMessages.push({ id: `welcome_${welcomeIndex++}`, type: 'npc', text: innerRaw, isWelcome: true });
        }
      }
      // B. 如果是用户发言块
      else if (tag === 'user_say') {
        allMessages.push({ type: 'user', text: innerRaw });
      }
      // C. 如果是NPC/旁白内容块
      else if (tag === 'content') {
        const innerRegex = /<(对话|旁白)>([\s\S]*?)<\/\1>/g;
        let innerMatch;
        let hasInnerTags = false;
        while ((innerMatch = innerRegex.exec(innerRaw)) !== null) {
          hasInnerTags = true;
          allMessages.push({
            type: innerMatch[1] === '对话' ? 'npc' : 'aside',
            text: innerMatch[2].trim()
          });
        }
        if (!hasInnerTags && innerRaw) {
          allMessages.push({ type: 'npc', text: innerRaw });
        }
      }
    }

    // ID 匹配与 UI 更新 (只对非欢迎语的聊天消息进行)
    allMessages.forEach((m) => {
      if (m.isWelcome) return; // 欢迎语使用简单ID，不参与此逻辑
      const oldMsg = chatContents.value.find(old => !old.isWelcome && old.text === m.text && old.type === m.type && !old._used);
      if (oldMsg) { m.id = oldMsg.id; oldMsg._used = true; }
      else { m.id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5); }
    });

    chatContents.value.forEach(old => delete old._used);

    // 组合最终数组并更新UI
    const isNewMessage = chatContents.value.length !== allMessages.length || JSON.stringify(chatContents.value) !== JSON.stringify(allMessages);
    chatContents.value = allMessages;
    welcomeContent.value = rawWelcomeForClear; // 更新它，为 clearChat 功能保留原始文本

    if (isNewMessage) {
      const lastMsg = allMessages[allMessages.length - 1];
      if (lastMsg && (lastMsg.type === 'npc' || lastMsg.type === 'aside')) isThinking.value = false;
    }
  } catch (error) { console.error("同步聊天记录失败:", error); }
};


const syncTransactionRecord = async () => {
  try {
    const rawText = await WorldInfoUtil.getWorldBookContent(['<图书馆>交易记录']);
    const extractTag = (tag) => { const m = rawText.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`)); return m ? m[1].trim() : ''; };
    const parse = (str) => { try { return JSON.parse(str); } catch { return {}; } };
    const update = (tag, mode, refVal) => {
      const str = extractTag(tag);
      if (lastRawRecords[tag] !== str) {
        const isInitial = lastRawRecords[tag] === null;
        lastRawRecords[tag] = str;
        refVal.value = parse(str);
        if (!isInitial && currentMode.value !== mode) redDots[mode] = true;
      }
    };
    update('ItemSell', '物品出售', itemSells);
    update('SkillBuy', '技能购买', skillBuys);
    update('SecretBuy', '秘传购买', secretBuys);
  } catch (e) { console.error(e); }
};

const fetchAll = async () => {
  await syncChatRecord();
  await syncTransactionRecord();
  await fetchSummary();
};

onMounted(async () => {
  if (typeof fetchAll === 'function') { await fetchAll(); pollingTimer = setInterval(fetchAll, 3000); }
  if (chatAreaRef.value) chatAreaRef.value.scrollToBottom();
});

// 2. 播放背景音乐逻辑极度简化
const handleIntroComplete = () => {
  showIntro.value = false;
  playLibraryBgm();
};

const playLibraryBgm = () => {
  const track = audioStore.getTrack('libBgm');
  if (track && track.url) {
    setAudioSettings('bgm', { mode: 'repeat_one' });
    playAudio('bgm', track);
  }
};

const recordExitTime = async () => {
  try {
    const entryName = '<图书馆>聊天记录';
    let rawText = await WorldInfoUtil.getWorldBookContent([entryName]);
    rawText = rawText.replace(/\s*<上次访问时间>[\s\S]*?<\/上次访问时间>/g, '');
    const now = new Date().toLocaleString();
    rawText = rawText.trim() + `\n<上次访问时间>${now}</上次访问时间>`;
    await WorldInfoUtil.updateEntryContent(entryName, rawText);
  } catch (error) {
    console.error("记录退出时间失败:", error);
  }
};

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer);
  pauseAudio('bgm');
  recordExitTime();
});
</script>


<style>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Lato:wght@400;700&display=swap');

.library-container {
  /* 全局暗金主题变量 */
  --c-gold: #d4af37;
  --c-gold-light: #f9e79f;
  --c-gold-dim: rgba(212, 175, 55, 0.3);
  --c-bg-dark: #0a0a0a;
  --c-bg-card: #141414;
  --c-text: #e0e0e0;
  --c-accent: #81d4fa;
  --c-danger: #e57373;
  --c-danger-dim: rgba(229, 115, 115, 0.3);
  --c-danger-hover: rgba(229, 115, 115, 0.5);

  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--c-bg-dark);
  color: var(--c-text);
  font-family: 'Lato', sans-serif;
  overflow: hidden;
}

.main-content-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background-image: radial-gradient(circle at 50% 50%, #1a1a1a 0%, #000 100%);
}

.alice-selector-container label {
  color: var(--c-gold-light);
}

.alice-selector-container select {
  background: transparent;
  color: var(--c-gold);
  border: none;
  outline: none;
  cursor: pointer;
  font-family: 'Lato', sans-serif;
}

.alice-selector-container select option {
  background: var(--c-bg-card);
  color: var(--c-text);
}

/* 滚动条样式 */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #0a0a0a; }
::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; border: 1px solid #222; }
::-webkit-scrollbar-thumb:hover { background: var(--c-gold); }

/* 通用卡片布局 */
.scroll-area { height: 100%; overflow-y: auto; padding: 20px; scroll-behavior: smooth; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; max-width: 1200px; margin: 0 auto; padding-bottom: 80px; }
.trade-card { border-radius: 4px; display: flex; flex-direction: column; transition: transform 0.3s ease, box-shadow 0.3s ease; }
.card-inner { padding: 20px; display: flex; flex-direction: column; height: 100%; }

/* --- [REFACTORED] 日志总结页面样式 --- */
.log-view {
  display: flex;
  justify-content: center;
  padding: 20px 10px;
}

.log-container {
  width: 100%;
  max-width: 900px;
  background: rgba(12, 12, 12, 0.8);
  border: 1px solid var(--c-gold-dim);
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.6);
  border-radius: 6px;
  margin-bottom: 40px;
  display: flex;
  flex-direction: column;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--c-gold-dim);
  padding: 15px 25px;
  flex-shrink: 0;
}

.log-title {
  margin: 0;
  color: var(--c-gold);
  font-family: 'Cinzel', serif;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: 1px;
}

.log-tools {
  display: flex;
  gap: 10px;
}

.tool-button {
  background: transparent;
  border: 1px solid #555;
  color: #aaa;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}
.tool-button:hover {
  background: #333;
  color: var(--c-gold-light);
  border-color: var(--c-gold-dim);
}
.tool-button.active {
  background: var(--c-gold-dim);
  color: var(--c-gold-light);
  border-color: var(--c-gold);
}
.tool-button.danger {
  border-color: var(--c-danger-dim);
  color: var(--c-danger);
}
.tool-button.danger:hover {
  background: var(--c-danger-hover);
  border-color: var(--c-danger);
  color: white;
}

.log-content {
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px 10px 20px 25px;
}

.log-timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
/* 时间轴的竖线 */
.log-timeline::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 10px;
  bottom: 10px;
  width: 2px;
  background-image: linear-gradient(to bottom, transparent, var(--c-gold-dim) 10%, var(--c-gold-dim) 90%, transparent);
}

.log-item {
  transition: background-color 0.3s ease;
  border-radius: 4px;
}
.log-item.selected-for-deletion {
  background-color: var(--c-danger-dim);
}

.log-item__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-radius: 3px;
  transition: background-color 0.2s ease;
}
.log-item:not(.selection-mode) .log-item__header {
  cursor: pointer;
}
.log-item:not(.selection-mode) .log-item__header:hover {
  background-color: rgba(255, 255, 255, 0.03);
}

.log-item__selection {
  flex-shrink: 0;
  width: 42px; /* (20px left) + 2px line + 20px right */
  display: flex;
  justify-content: center;
  align-items: center;
  height: 24px;
}

.delete-checkbox-wrapper {
  display: flex;
  cursor: pointer;
}

.delete-checkbox {
  cursor: pointer;
  width: 16px;
  height: 16px;
  accent-color: var(--c-gold);
}

.timeline-marker {
  width: 10px;
  height: 10px;
  background-color: #444;
  border: 2px solid #222;
  border-radius: 50%;
  transition: all 0.3s ease;
}
.log-item.expanded .timeline-marker,
.log-item:hover .timeline-marker {
  background-color: var(--c-gold);
  border-color: var(--c-gold-dim);
  transform: scale(1.2);
}

.log-item__meta {
  flex-grow: 1;
  display: flex;
  align-items: baseline;
  gap: 15px;
  overflow: hidden;
}

.log-time {
  font-weight: bold;
  color: var(--c-accent);
  flex-shrink: 0;
  font-size: 0.9rem;
}

.log-preview {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #888;
  font-size: 0.95rem;
  transition: color 0.3s ease;
}
.log-item:hover .log-preview {
  color: #bbb;
}

.log-item__toggle {
  flex-shrink: 0;
  padding: 0 15px;
  display: flex;
  align-items: center;
}

.expand-icon {
  width: 24px;
  height: 24px;
  fill: #666;
  transition: transform 0.3s ease, fill 0.3s ease;
}
.log-item.expanded .expand-icon {
  transform: rotate(180deg);
  fill: var(--c-gold);
}
.log-item:not(.selection-mode):hover .expand-icon {
  fill: #aaa;
}

.log-item__body-wrapper {
  overflow: hidden;
  transition: max-height 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
  max-height: 0;
}
.log-item.expanded .log-item__body-wrapper {
  max-height: 1000000px; /* 足够大的值 */
}

.log-item__body {
  padding: 5px 20px 20px 52px;
}

.log-text {
  white-space: pre-wrap;
  line-height: 1.8;
  color: #ddd;
  font-size: 1rem;
  text-align: justify;
  background: rgba(0,0,0,0.2);
  border-left: 3px solid var(--c-gold-dim);
  padding: 15px 20px;
  border-radius: 0 4px 4px 0;
}

.log-empty-state {
  color: #666;
  text-align: center;
  padding: 80px 20px;
  font-style: italic;
}
.log-empty-state p {
  font-size: 1.2rem;
  margin: 0 0 10px;
  color: #888;
}
.log-empty-state span {
  font-size: 0.9rem;
}
</style>
