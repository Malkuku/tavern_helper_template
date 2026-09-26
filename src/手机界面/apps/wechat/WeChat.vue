<template>
  <div class="wechat" :class="{ 'wx-dark': darkMode }">
    <p v-if="store.wechatLogError" class="wx-log-error" role="alert">
      微信消息同步失败：{{ store.wechatLogError }}
      <button type="button" @click="clearFailedLog">清除本楼微信日志</button>
    </p>
    <template v-if="selectedSession && selectedKey">
      <header class="wx-header wx-chat-header">
        <button class="wx-back" type="button" aria-label="返回微信" @click="selectedKey = null">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m15 4-8 8 8 8" />
          </svg>
        </button>
        <strong>{{ selectedTitle }}</strong>
        <button class="wx-chat-more" type="button" aria-label="聊天详情" @click="openDetails">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
          </svg>
        </button>
      </header>
      <div ref="messagesElement" class="wx-messages">
        <p v-if="!selectedSession.消息.length && !pending" class="wx-empty">还没有消息，发一条开始聊天。</p>
        <template v-for="(message, index) in selectedSession.消息" :key="index">
          <time v-if="showMessageTime(index)" class="wx-time-divider">{{ displayTime(message.时间) }}</time>
          <div v-if="!isWeChatMessage(message)" class="wx-system-tip">{{ operationSummary(message) }}</div>
          <template v-else>
            <div
              v-for="(part, contentIndex) in message.内容"
              :key="contentIndex"
              class="wx-message"
              :class="{ mine: message.发送者 === 'user' }"
            >
              <button
                v-if="message.发送者 !== 'user'"
                class="wx-avatar-action"
                type="button"
                :aria-label="`拍一拍${accounts[message.发送者]?.昵称 || message.发送者}`"
                @click="poke(message.发送者)"
              >
                <WeChatAvatar :id="message.发送者" :accounts="accounts" />
              </button>
              <WeChatAvatar v-else :id="message.发送者" :accounts="accounts" />
              <div class="wx-message-main">
                <small v-if="selectedSession.类型 === '群聊' && message.发送者 !== 'user'">{{
                  accounts[message.发送者]?.昵称 || message.发送者
                }}</small>
                <div
                  class="wx-bubble"
                  :class="{ 'wx-bubble-special': isSpecialCard(part) }"
                  @contextmenu.prevent="openMessageMenu(message, part, contentIndex)"
                  @touchstart.passive="startMessageHold(message, part, contentIndex)"
                  @touchend="cancelMessageHold"
                  @touchmove="cancelMessageHold"
                  @touchcancel="cancelMessageHold"
                >
                  <WeChatMessageContent
                    :items="[part]"
                    :accounts="accounts"
                    :sender="message.发送者"
                    :states="message.特殊内容状态"
                    :start-index="contentIndex"
                    @open-payment="openPayment(message, $event)"
                    @open-card="openCard"
                  />
                </div>
                <div v-if="contentIndex === 0 && message.引用" class="wx-rich wx-quote">
                  <small>{{ accounts[message.引用.发送者]?.昵称 || message.引用.发送者 }}：</small>
                  <span>{{ contentSummary(message.引用.内容) }}</span>
                </div>
              </div>
            </div>
          </template>
        </template>
        <template v-if="pending">
          <div v-for="(part, contentIndex) in pending.内容" :key="contentIndex" class="wx-message mine wx-pending">
            <WeChatAvatar id="user" :accounts="accounts" />
            <div class="wx-message-main">
              <div class="wx-bubble" :class="{ 'wx-bubble-special': isSpecialCard(part) }">
                <WeChatMessageContent :items="[part]" :accounts="accounts" sender="user" />
              </div>
              <div v-if="contentIndex === 0 && pending.引用" class="wx-rich wx-quote">
                {{ accounts[pending.引用.发送者]?.昵称 || pending.引用.发送者 }}：{{
                  contentSummary(pending.引用.内容)
                }}
              </div>
              <small v-if="contentIndex === pending.内容.length - 1">
                {{ pending.已确认 === false ? '待确认发送' : '等待正文确认' }}
                <button v-if="pending.已确认 !== false" type="button" @click="retrySend">重试生成</button>
              </small>
            </div>
          </div>
        </template>
        <div v-if="pending && generating" class="wx-typing">
          <span class="wx-typing-dots"><i></i><i></i><i></i></span>对方正在输入中...
        </div>
      </div>
      <div v-if="pending?.已确认 === false" class="wx-send-confirm">
        <span>待发送 {{ pending.内容.length }} 条给 {{ selectedTitle }}</span>
        <button class="wx-send-discard" type="button" :disabled="sending" @click="discardDraft">清空</button>
        <button type="button" :disabled="sending" @click="confirmSend">确认发送给对方</button>
      </div>
      <div v-if="messageMenu" class="wx-message-menu-backdrop" @click="messageMenu = null">
        <div class="wx-message-menu" role="menu" @click.stop>
          <button
            type="button"
            role="menuitem"
            @click="
              startForward(messageMenu);
              messageMenu = null;
            "
          >
            转发
          </button>
          <button
            type="button"
            role="menuitem"
            @click="
              quoteMessage(messageMenu);
              messageMenu = null;
            "
          >
            引用
          </button>
          <button type="button" role="menuitem" @click="deleteMessageFloor">删除本楼及后续消息</button>
        </div>
      </div>
      <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
      <div v-if="quoted" class="wx-compose-quote">
        <span>引用 {{ accounts[quoted.发送者]?.昵称 || quoted.发送者 }}：{{ contentSummary(quoted.内容) }}</span>
        <button type="button" aria-label="取消引用" @click="quoted = null">×</button>
      </div>
      <div v-if="stickerOpen" class="wx-sticker-picker">
        <p v-if="!stickerNames.length" class="wx-sticker-empty">还没有表情包，添加图片后就能在聊天中发送。</p>
        <button
          v-for="name in stickerNames"
          :key="name"
          class="wx-sticker-choice"
          type="button"
          :disabled="pendingLocked || sending || !worldTime"
          @click="sendSticker(name)"
        >
          <img :src="self?.表情包[name]" :alt="name" /><small>{{ name }}</small>
        </button>
        <button class="wx-sticker-add" type="button" @click="stickerFileInput?.click()">
          <WeChatIcon name="plus" />添加表情包
        </button>
        <input ref="stickerFileInput" class="wx-hidden-file" type="file" accept="image/*" @change="readStickerFile" />
        <form v-if="newStickerSource" class="wx-sticker-form" @submit.prevent="saveSticker">
          <img :src="newStickerSource" alt="新表情包预览" />
          <input v-model="newStickerName" aria-label="表情包名称" maxlength="30" placeholder="给表情包起个名字" />
          <button type="submit" :disabled="savingSticker">保存</button>
        </form>
      </div>
      <form class="wx-compose" @submit.prevent="sendMessage">
        <button
          class="wx-compose-voice"
          type="button"
          aria-label="语音"
          :aria-pressed="voiceOpen"
          @click="voiceOpen = !voiceOpen"
        >
          <WeChatIcon name="voice" />
        </button>
        <input
          v-model="draft"
          aria-label="输入消息"
          :placeholder="worldTime ? '' : '世界时间未设置'"
          :disabled="pendingLocked || sending || !worldTime"
        />
        <button class="wx-compose-sticker" type="button" aria-label="选择表情包" @click="stickerOpen = !stickerOpen">
          <WeChatIcon name="emoji" />
        </button>
        <button v-if="draft.trim()" type="submit" :disabled="pendingLocked || sending || !worldTime">添加</button>
        <button
          v-else
          class="wx-compose-plus"
          type="button"
          aria-label="更多聊天功能"
          @click="extrasOpen = !extrasOpen"
        >
          <WeChatIcon name="plus" />
        </button>
      </form>
      <div v-if="extrasOpen" class="wx-chat-extras">
        <button v-for="item in extraActions" :key="item.label" type="button" @click="openExtra(item.label)">
          <span><WeChatIcon :name="item.icon" /></span>{{ item.label }}
        </button>
      </div>
      <form v-if="paymentKind" class="wx-payment-compose" @submit.prevent="sendPayment">
        <button class="wx-transfer-back" type="button" @click="paymentKind = null">‹</button>
        <div class="wx-transfer-recipient">
          <span>转账给 {{ selectedTitle }}</span
          ><WeChatAvatar :id="selectedSession.成员.find(id => id !== 'user') || 'user'" :accounts="accounts" />
        </div>
        <label class="wx-transfer-label" for="wx-transfer-amount">转账金额</label>
        <div class="wx-transfer-amount">
          ¥
          <input
            id="wx-transfer-amount"
            v-model="paymentAmount"
            aria-label="金额"
            placeholder="0.00"
            inputmode="decimal"
          />
        </div>
        <p class="wx-transfer-balance">零钱余额 ¥{{ walletBalance }}</p>
        <p v-if="transferInsufficient" class="wx-picker-error" role="alert">余额不足</p>
        <input v-model="paymentRemark" aria-label="转账说明" placeholder="添加转账说明" />
        <p v-if="error" class="wx-picker-error" role="alert">{{ error }}</p>
        <button class="wx-transfer-submit" type="submit" :disabled="pendingLocked || sending || !worldTime || transferInsufficient">
          加入待发送
        </button>
      </form>
      <form v-if="voiceOpen" class="wx-action-panel" @submit.prevent="sendVoice">
        <strong>发送语音消息</strong
        ><input v-model="voiceText" aria-label="语音转写内容" placeholder="输入语音转写内容" /><input
          v-model="voiceDuration"
          aria-label="语音时长"
          placeholder="时长（秒）"
          inputmode="numeric"
        /><button type="submit" :disabled="pendingLocked || sending">添加</button
        ><button type="button" @click="voiceOpen = false">取消</button>
      </form>
      <div v-if="cardPickerOpen" class="wx-contact-picker">
        <header>
          <button
            type="button"
            @click="
              cardPickerOpen = false;
              selectedCard = null;
            "
          >
            ‹</button
          ><strong>选择联系人</strong>
        </header>
        <input v-model="cardQuery" aria-label="搜索联系人" placeholder="搜索" />
        <div class="wx-picker-list">
          <button v-for="[id, account] in filteredCardCandidates" :key="id" type="button" @click="selectedCard = id">
            <WeChatAvatar :id="id" :accounts="accounts" /><span>{{ account.昵称 || id }}</span>
          </button>
        </div>
        <div v-if="selectedCard" class="wx-picker-confirm">
          <strong>发送给：</strong><span>{{ selectedTitle }}</span>
          <div class="wx-picker-preview">
            <WeChatAvatar :id="selectedCard" :accounts="accounts" /><span
              >{{ accounts[selectedCard]?.昵称 || selectedCard }}<small>个人名片</small></span
            >
          </div>
          <input v-model="cardMessage" aria-label="名片附言" placeholder="给朋友留言（可选）" />
          <p v-if="error" class="wx-picker-error" role="alert">{{ error }}</p>
          <div class="wx-picker-buttons">
            <button type="button" @click="selectedCard = null">取消</button
            ><button type="button" :disabled="sending" @click="sendCard(selectedCard)">发送</button>
          </div>
        </div>
      </div>
      <div v-if="forwarding" class="wx-contact-picker wx-floating-picker">
        <header>
          <button
            type="button"
            @click="
              forwarding = null;
              forwardDestination = null;
            "
          >
            ‹</button
          ><strong>选择聊天</strong>
        </header>
        <input v-model="forwardQuery" aria-label="搜索聊天" placeholder="搜索" />
        <div class="wx-picker-list">
          <button
            v-for="item in filteredForwardChats"
            :key="item.key"
            type="button"
            @click="forwardDestination = item.key"
          >
            <WeChatAvatar :id="item.avatarId" :accounts="accounts" /><span>{{ item.title }}</span>
          </button>
        </div>
        <div v-if="forwardDestination" class="wx-picker-confirm">
          <strong>发送给：</strong><span>{{ chats.find(item => item.key === forwardDestination)?.title }}</span>
          <p>{{ contentSummary(forwarding.内容) }}</p>
          <div class="wx-picker-buttons">
            <button type="button" @click="forwardDestination = null">取消</button
            ><button type="button" :disabled="sending" @click="sendForward(forwardDestination)">发送</button>
          </div>
        </div>
      </div>
      <div v-if="detailsOpen" class="wx-details-page">
        <header class="wx-header">
          <button
            class="wx-back"
            type="button"
            aria-label="返回聊天"
            @click="
              detailsOpen = false;
              groupPickerOpen = false;
            "
          >
            ‹</button
          ><strong>{{ groupPickerOpen ? '发起群聊' : '聊天信息' }}</strong>
        </header>
        <template v-if="groupPickerOpen">
          <label class="wx-search"
            ><span>⌕</span><input v-model="groupQuery" aria-label="搜索好友" placeholder="搜索"
          /></label>
          <div class="wx-section-label">选择群聊中的朋友</div>
          <div class="wx-details-scroll">
            <label v-for="[id, account] in groupCandidates" :key="id" class="wx-list-row wx-group-choice"
              ><input v-model="groupMembers" type="checkbox" :value="id" /><WeChatAvatar
                :id="id"
                :accounts="accounts"
              /><strong>{{ account.昵称 || id }}</strong></label
            >
            <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
          </div>
          <div class="wx-group-footer">
            <button type="button" @click="groupPickerOpen = false">取消</button
            ><button type="button" :disabled="!groupMembers.length || sending" @click="createGroup">
              完成（{{ groupMembers.length }}）
            </button>
          </div>
        </template>
        <template v-else>
          <div class="wx-details-scroll">
            <div class="wx-detail-members">
              <div v-for="id in selectedSession.成员.filter(id => id !== 'user')" :key="id" class="wx-detail-member">
                <WeChatAvatar :id="id" :accounts="accounts" /><small>{{ accounts[id]?.昵称 || id }}</small>
              </div>
              <button
                type="button"
                class="wx-detail-add"
                :aria-label="selectedSession.类型 === '群聊' ? '邀请好友' : '发起群聊'"
                @click="openGroupPicker"
              >
                ＋
              </button>
            </div>
            <div v-if="detailImage" class="wx-detail-section wx-detail-image">
              <img :src="detailImage" alt="自定义聊天图片" />
            </div>
            <div class="wx-detail-section">
              <label class="wx-detail-edit"
                >查找聊天记录<input v-model="detailSearch" placeholder="搜索消息内容"
              /></label>
              <div v-if="detailSearch.trim()" class="wx-detail-results">
                <div v-for="item in detailSearchResults" :key="item.楼层ID">
                  {{ item.发送者 === 'user' ? '我' : accounts[item.发送者]?.昵称 || item.发送者 }}：{{
                    contentSummary(item.内容)
                  }}
                </div>
                <small v-if="!detailSearchResults.length">没有匹配的消息</small>
              </div>
            </div>
            <div class="wx-detail-section">
              <label class="wx-detail-row"
                >消息免打扰 <input v-model="detailMuted" type="checkbox" @change="saveAppearance" /></label
              ><label class="wx-detail-row"
                >置顶聊天 <input v-model="detailPinned" type="checkbox" @change="saveAppearance"
              /></label>
            </div>
            <div class="wx-detail-section">
              <label class="wx-detail-edit"
                >显示昵称<input
                  v-model="detailName"
                  :placeholder="selectedSession.名称 || selectedTitle"
                  @change="saveAppearance" /></label
              ><label class="wx-detail-edit"
                >显示图片<input type="file" accept="image/*" @change="setDetailImage" /></label
              ><button
                v-if="detailImage"
                type="button"
                class="wx-detail-row"
                @click="
                  detailImage = '';
                  saveAppearance();
                "
              >
                移除自定义图片
              </button>
            </div>
            <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
          </div>
        </template>
      </div>
    </template>

    <template v-else-if="subPage === 'requests'">
      <header class="wx-header">
        <button class="wx-back" type="button" aria-label="返回通讯录" @click="subPage = null">‹</button>
        <strong>朋友申请</strong>
      </header>
      <div class="wx-body">
        <div class="wx-section-label">收到的申请</div>
        <div v-for="[id, request] in incomingRequests" :key="id" class="wx-list-row wx-request-row">
          <WeChatAvatar :id="id" :accounts="accounts" />
          <div class="wx-row-main">
            <strong>{{ accounts[id]?.昵称 || id }}</strong
            ><small>{{ request.验证消息 }}</small>
          </div>
          <button type="button" class="wx-small-action" @click="respondFriend(id, true)">同意</button>
          <button type="button" class="wx-small-action muted" @click="respondFriend(id, false)">拒绝</button>
        </div>
        <p v-if="!incomingRequests.length" class="wx-empty">暂无待处理申请</p>
        <div class="wx-section-label">已发送</div>
        <div v-for="[id, request] in outgoingRequests" :key="id" class="wx-list-row">
          <WeChatAvatar :id="id" :accounts="accounts" />
          <div class="wx-row-main">
            <strong>{{ accounts[id]?.昵称 || id }}</strong
            ><small>{{ request.验证消息 }}</small>
          </div>
          <span class="wx-muted">等待同意</span>
        </div>
        <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
      </div>
    </template>

    <template v-else-if="subPage === 'nearby'">
      <header class="wx-header">
        <button class="wx-back" type="button" aria-label="返回发现" @click="subPage = null">‹</button>
        <strong>附近的人</strong>
      </header>
      <div class="wx-body">
        <button v-for="person in nearbyPeople" :key="person.id" class="wx-list-row" type="button" @click="openNearby(person)">
          <img class="wx-avatar" :src="accounts[person.id]?.头像 || nearbyAvatar(person.id)" alt="" />
          <strong>{{ accounts[person.id]?.昵称 || person.name }}</strong>
          <span class="wx-muted">{{ self?.好友.includes(person.id) ? '已是好友' : '查看' }}</span>
        </button>
        <p v-if="!nearbyPeople.length" class="wx-empty">最近正文中没有匹配到附近的人</p>
        <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
      </div>
    </template>

    <template v-else-if="subPage === 'add'">
      <header class="wx-header">
        <button class="wx-back" type="button" aria-label="返回通讯录" @click="subPage = null">‹</button>
        <strong>添加朋友</strong>
      </header>
      <div class="wx-body">
        <label class="wx-search"
          ><span>⌕</span><input v-model="query" aria-label="搜索账号" placeholder="搜索昵称或账号"
        /></label>
        <label class="wx-request-message"
          >验证消息<input v-model="requestMessage" maxlength="100" placeholder="请求添加好友"
        /></label>
        <div v-for="[id, account] in addCandidates" :key="id" class="wx-list-row">
          <WeChatAvatar :id="id" :accounts="accounts" />
          <strong>{{ account.昵称 || id }}</strong>
          <button type="button" class="wx-small-action" :disabled="!!outgoingRequest(id)" @click="requestFriend(id)">
            {{ outgoingRequest(id) ? '已申请' : '申请' }}
          </button>
        </div>
        <p v-if="!addCandidates.length" class="wx-empty">没有可添加的账号</p>
        <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
      </div>
    </template>

    <template v-else-if="!accountPage">
      <header v-if="tab !== 'me'" class="wx-header wx-main-header">
        <strong>{{
          tab === 'chats' ? `微信${chats.length ? `(${chats.length})` : ''}` : tabs.find(item => item.id === tab)?.label
        }}</strong>
        <div class="wx-header-actions">
          <button type="button" aria-label="搜索" @click="searchOpen = !searchOpen">
            <WeChatIcon name="search" />
          </button>
          <button
            type="button"
            aria-label="添加附近的人"
            @click="openNearbyPage"
          >
            <WeChatIcon name="plus" />
          </button>
        </div>
      </header>
      <div class="wx-body" :class="{ 'wx-me-body': tab === 'me' }">
        <template v-if="!wechat"><p class="wx-empty">当前楼层尚无微信数据，请重新打开手机完成初始化。</p></template>
        <template v-else-if="tab === 'chats'">
          <label v-if="searchOpen" class="wx-search"
            ><span>⌕</span><input v-model="query" aria-label="搜索聊天" placeholder="搜索会话"
          /></label>
          <button
            v-for="item in visibleChats"
            :key="item.key"
            class="wx-chat-row"
            type="button"
            @click="openChat(item.key)"
          >
            <img
              v-if="chatAppearance[item.key]?.image"
              class="wx-avatar"
              :src="chatAppearance[item.key].image"
              alt=""
            />
            <span v-else-if="item.group" class="wx-avatar wx-group-avatar">群</span>
            <WeChatAvatar v-else :id="item.avatarId" :accounts="accounts" />
            <span class="wx-row-main"
              ><strong>{{ item.title }}</strong
              ><small>{{ item.preview }}</small></span
            >
            <time>{{ displayTime(item.time) }}</time>
          </button>
          <p v-if="!visibleChats.length" class="wx-empty">暂无会话，可从通讯录选择好友开始聊天。</p>
        </template>
        <template v-else-if="tab === 'contacts'">
          <label v-if="searchOpen" class="wx-search"
            ><span>⌕</span><input v-model="query" aria-label="搜索联系人" placeholder="搜索好友"
          /></label>
          <button class="wx-list-row wx-contact-feature" type="button" @click="subPage = 'requests'">
            <span class="wx-feature-icon orange"><WeChatIcon name="new-friend" /></span><strong>新的朋友</strong>
            <span v-if="incomingRequests.length" class="wx-count">{{ incomingRequests.length }}</span>
          </button>
          <button
            v-for="item in contactFeatures"
            :key="item.label"
            class="wx-list-row wx-contact-feature"
            type="button"
            @click="showUnavailable(item.label)"
          >
            <span class="wx-feature-icon" :class="item.color"><WeChatIcon :name="item.icon" /></span
            ><strong>{{ item.label }}</strong>
          </button>
          <div class="wx-section-label">{{ contacts.length ? '好友' : '暂无好友' }}</div>
          <button
            v-for="[id, account] in visibleContacts"
            :key="id"
            class="wx-list-row"
            type="button"
            @click="openContact(id)"
          >
            <WeChatAvatar :id="id" :accounts="accounts" /><strong>{{ account.昵称 || id }}</strong>
          </button>
        </template>
        <template v-else-if="tab === 'discover'">
          <div v-for="(group, index) in discoverGroups" :key="index" class="wx-menu-group">
            <button
              v-for="item in group"
              :key="item.label"
              class="wx-list-row wx-menu-row"
              type="button"
              @click="item.label === '附近的人' ? openNearbyPage() : showUnavailable(item.label)"
            >
              <span class="wx-line-icon" :class="item.color"><WeChatIcon :name="item.icon" /></span
              ><strong>{{ item.label }}</strong
              ><WeChatIcon class="wx-row-chevron" name="chevron" />
            </button>
          </div>
        </template>
        <template v-else>
          <button class="wx-profile" type="button" @click="accountPage = 'profile'">
            <WeChatAvatar id="user" :accounts="accounts" />
            <div>
              <strong>{{ self?.昵称 || '我' }}</strong
              ><small>微信号：{{ self?.昵称 || 'user' }}</small>
            </div>
            <WeChatIcon class="wx-row-chevron" name="chevron" />
          </button>
          <div v-for="(group, index) in meGroups" :key="index" class="wx-menu-group">
            <button
              v-for="item in group"
              :key="item.label"
              class="wx-list-row wx-menu-row"
              type="button"
              @click="item.label === '服务' ? (accountPage = 'services') : showUnavailable(item.label)"
            >
              <span class="wx-line-icon" :class="item.color"><WeChatIcon :name="item.icon" /></span
              ><strong>{{ item.label }}</strong
              ><WeChatIcon class="wx-row-chevron" name="chevron" />
            </button>
          </div>
        </template>
      </div>
      <nav class="wx-tabs" aria-label="微信导航">
        <button
          v-for="item in tabs"
          :key="item.id"
          type="button"
          :class="{ selected: tab === item.id }"
          @click="selectTab(item.id)"
        >
          <span class="wx-tab-icon"><WeChatIcon :name="item.id" /></span><small>{{ item.label }}</small>
        </button>
      </nav>
    </template>
    <section v-if="accountPage" class="wx-account-page">
      <header class="wx-header">
        <button
          class="wx-back"
          type="button"
          aria-label="返回"
          @click="accountPage = accountPage === 'wallet' || accountPage === 'payments' ? 'services' : null"
        >
          ‹</button
        ><strong>{{
          accountPage === 'profile'
            ? '个人信息'
            : accountPage === 'services'
              ? '服务'
              : accountPage === 'payments'
                ? '收付款'
                : '钱包'
        }}</strong>
      </header>
      <template v-if="accountPage === 'profile'">
        <label class="wx-account-row">头像<input type="file" accept="image/*" @change="chooseProfileImage" /></label>
        <div v-if="profileImage" class="wx-account-preview"><img :src="profileImage" alt="头像预览" /></div>
        <label class="wx-account-row">名字<input v-model="profileName" maxlength="40" aria-label="名字" /></label>
        <div class="wx-account-row">微信号 <span>user</span></div>
        <button class="wx-account-save" type="button" :disabled="savingProfile" @click="saveProfile">保存</button>
      </template>
      <template v-else-if="accountPage === 'services'">
        <div class="wx-service-card">
          <button type="button" @click="accountPage = 'payments'"><span>▣</span>收付款</button
          ><button type="button" @click="accountPage = 'wallet'">
            <span>▱</span>钱包<small>¥{{ walletBalance }}</small>
          </button>
        </div>
        <div class="wx-service-group">
          <p>金融理财</p>
          <button
            v-for="label in ['信用卡还款', '微粒贷借钱', '理财通', '保险服务']"
            :key="label"
            type="button"
            @click="showUnavailable(label)"
          >
            {{ label }}
          </button>
        </div>
        <div class="wx-service-group">
          <p>生活服务</p>
          <button
            v-for="label in ['手机充值', '生活缴费', 'Q币充值', '城市服务', '腾讯公益', '医疗健康']"
            :key="label"
            type="button"
            @click="showUnavailable(label)"
          >
            {{ label }}
          </button>
        </div>
        <div class="wx-service-group">
          <p>交通出行</p>
          <button
            v-for="label in ['出行服务', '火车票机票', '滴滴出行', '酒店民宿']"
            :key="label"
            type="button"
            @click="showUnavailable(label)"
          >
            {{ label }}
          </button>
        </div>
      </template>
      <template v-else-if="accountPage === 'payments'"
        ><div class="wx-wallet-card">
          <span>零钱余额</span><strong>¥{{ walletBalance }}</strong
          ><small>选择好友发起转账；收到的款项在聊天中确认收款</small>
        </div>
        <div class="wx-service-group wx-payment-contacts">
          <p>转账给好友</p>
          <button v-for="[id, account] in contacts" :key="id" type="button" @click="startServiceTransfer(id)">
            {{ account.昵称 || id }}
          </button>
        </div></template
      >
      <template v-else
        ><div class="wx-wallet-card">
          <span>零钱</span><strong>¥{{ walletBalance }}</strong>
        </div></template
      >
      <p v-if="error" class="wx-error" role="alert">{{ error }}</p>
    </section>
    <div v-if="unavailable" class="wx-dialog-backdrop" @click.self="unavailable = ''">
      <div class="wx-dialog" role="alertdialog" aria-modal="true">
        <p>{{ unavailable }}暂未开放</p>
        <button type="button" @click="unavailable = ''">知道了</button>
      </div>
    </div>
    <div v-if="paymentView" class="wx-dialog-backdrop" @click.self="paymentView = null">
      <div class="wx-payment-dialog" role="dialog" aria-modal="true" aria-label="款项详情">
        <button class="wx-dialog-close" type="button" @click="paymentView = null">×</button
        ><span class="wx-payment-dialog-icon">{{ paymentView.kind === '红包' ? '🧧' : '⇄' }}</span
        ><strong>{{ paymentView.kind === '红包' ? '微信红包' : '微信转账' }}</strong
        ><b>{{ paymentView.kind === '转账' ? `¥${paymentView.amount.replace(/g$/i, '')}` : paymentView.amount }}</b>
        <p>{{ paymentView.remark || (paymentView.kind === '红包' ? '微信红包' : '转账') }}</p>
        <small>{{ paymentView.status || '待处理' }}</small>
        <div v-if="paymentView.message.发送者 !== 'user' && !paymentView.status" class="wx-payment-dialog-actions">
          <button
            type="button"
            :disabled="sending"
            @click="resolvePayment(paymentView.kind === '红包' ? '领取红包' : '领取转账')"
          >
            {{ paymentView.kind === '红包' ? '开红包' : '确认收款' }}</button
          ><button
            v-if="paymentView.kind === '转账'"
            type="button"
            :disabled="sending"
            @click="resolvePayment('退回转账')"
          >
            退回
          </button>
        </div>
      </div>
    </div>
    <div v-if="cardView" class="wx-dialog-backdrop" @click.self="cardView = null">
      <div class="wx-card-dialog" role="dialog" aria-modal="true" aria-label="联系人名片">
        <WeChatAvatar :id="cardView" :accounts="accounts" /><strong>{{ accounts[cardView]?.昵称 || cardView }}</strong
        ><small>微信号：{{ cardView }}</small
        ><button v-if="self?.好友.includes(cardView)" type="button" @click="openCardChat">发消息</button
        ><button v-else-if="!outgoingRequest(cardView)" type="button" @click="requestCardFriend">添加朋友</button
        ><small v-else>好友申请已发送</small><button type="button" @click="cardView = null">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useMagicGirlStatStore } from '../../store/StatStore';
import type { 微信会话, 微信数据, 微信消息, 微信消息内容, 地图节点 } from '../../types';
import {
  chatTitle,
  contentSummary,
  friendRequest,
  isWeChatMessage,
  operationSummary,
  privateChatKey,
} from './wechatData';
import type { OperationEvent } from './wechatData';
import WeChatAvatar from './WeChatAvatar.vue';
import WeChatIcon from './WeChatIcon.vue';
import WeChatMessageContent from './WeChatMessageContent.vue';
import { nearbyAvatars } from './nearbyAvatars';

type Tab = 'chats' | 'contacts' | 'discover' | 'me';
const tabs: { id: Tab; label: string }[] = [
  { id: 'chats', label: '微信' },
  { id: 'contacts', label: '通讯录' },
  { id: 'discover', label: '发现' },
  { id: 'me', label: '我' },
];
const contactFeatures = [
  { label: '仅聊天的朋友', icon: 'contacts', color: 'orange' },
  { label: '群聊', icon: 'group', color: 'green' },
  { label: '标签', icon: 'tag', color: 'blue' },
  { label: '公众号', icon: 'book', color: 'blue' },
  { label: '服务号', icon: 'book', color: 'cyan' },
];
const discoverGroups = [
  [{ label: '朋友圈', icon: 'moments', color: 'multi' }],
  [
    { label: '视频号', icon: 'video', color: 'orange-text' },
    { label: '直播', icon: 'live', color: 'red' },
  ],
  [
    { label: '扫一扫', icon: 'scan', color: 'blue-text' },
    { label: '听一听', icon: 'music', color: 'red' },
  ],
  [
    { label: '看一看', icon: 'look', color: 'gold' },
    { label: '搜一搜', icon: 'search', color: 'red' },
  ],
  [{ label: '附近的人', icon: 'people', color: 'blue-text' }],
  [{ label: '游戏', icon: 'discover', color: 'multi' }],
  [{ label: '小程序', icon: 'discover', color: 'purple' }],
];
const meGroups = [
  [{ label: '服务', icon: 'chats', color: 'green-text' }],
  [
    { label: '收藏', icon: 'look', color: 'multi' },
    { label: '朋友圈', icon: 'moments', color: 'blue-text' },
    { label: '作品', icon: 'video', color: 'blue-text' },
    { label: '小店与卡包', icon: 'tag', color: 'red' },
    { label: '表情', icon: 'discover', color: 'gold' },
  ],
  [{ label: '设置', icon: 'settings', color: 'blue-text' }],
];
const darkMode = ref(false);
const unavailable = ref('');
const searchOpen = ref(false);
const generating = ref(false);
const extrasOpen = ref(false);
const paymentKind = ref<'转账' | null>(null);
const paymentAmount = ref('');
const transferInsufficient = computed(() => {
  if (!/^\d+(?:\.\d{1,2})?$/.test(paymentAmount.value)) return false;
  const amountCents = Math.round(Number(paymentAmount.value) * 100);
  const balanceCents = Math.round((store.statData?.角色?.user?.金钱 ?? 0) * 100);
  return amountCents > balanceCents;
});
const paymentRemark = ref('');
const paymentView = ref<{
  message: 微信消息;
  index: number;
  kind: '红包' | '转账';
  amount: string;
  remark: string;
  status?: string;
} | null>(null);
const cardView = ref<string | null>(null);
const cardPickerOpen = ref(false);
const cardQuery = ref('');
const cardMessage = ref('');
const selectedCard = ref<string | null>(null);
const forwarding = ref<微信消息 | null>(null);
const forwardQuery = ref('');
const forwardDestination = ref<string | null>(null);
const detailsOpen = ref(false);
type ChatAppearance = { name?: string; image?: string; muted?: boolean; pinned?: boolean };
const chatAppearance = ref<Record<string, ChatAppearance>>({});
const detailName = ref('');
const detailSearch = ref('');
const detailImage = ref('');
const detailMuted = ref(false);
const detailPinned = ref(false);
const groupPickerOpen = ref(false);
const groupQuery = ref('');
const groupMembers = ref<string[]>([]);
const voiceOpen = ref(false);
const voiceText = ref('');
const voiceDuration = ref('');
function openExtra(label: string) {
  extrasOpen.value = false;
  if (label === '转账') paymentKind.value = label;
  else if (label === '名片') {
    cardQuery.value = '';
    cardMessage.value = '';
    selectedCard.value = null;
    cardPickerOpen.value = true;
  } else showUnavailable(label);
}
async function sendPayment() {
  if (!paymentKind.value || !selectedKey.value || sending.value) return;
  if (!/^\d+(?:\.\d{1,2})?$/.test(paymentAmount.value) || Number(paymentAmount.value) <= 0) {
    error.value = '请输入有效金额。';
    return;
  }
  if (transferInsufficient.value) {
    error.value = '余额不足。';
    return;
  }
  if (/[<>]/.test(paymentRemark.value)) {
    error.value = '备注不能包含尖括号。';
    return;
  }
  sending.value = true;
  error.value = '';
  const conversation = selectedKey.value;
  const content = [`<转账 金额="${paymentAmount.value}">${paymentRemark.value}</转账>`];
  let accepted = false;
  try {
    await store.sendWeChatMessage(conversation, content);
    accepted = true;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '发送失败';
  } finally {
    if (accepted) {
      paymentKind.value = null;
      paymentAmount.value = '';
      paymentRemark.value = '';
    }
    sending.value = false;
  }
}
const extraActions = [
  { label: '相册', icon: 'photo' },
  { label: '拍摄', icon: 'camera' },
  { label: '视频通话', icon: 'video-call' },
  { label: '位置', icon: 'location' },
  { label: '礼物', icon: 'gift' },
  { label: '转账', icon: 'transfer' },
  { label: '名片', icon: 'contacts' },
  { label: '收藏', icon: 'favorite' },
];
const stickerFileInput = ref<HTMLInputElement>();
const newStickerName = ref('');
const newStickerSource = ref('');
const savingSticker = ref(false);
async function readStickerFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  error.value = '';
  try {
    newStickerSource.value = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error('无法读取图片。'));
      reader.readAsDataURL(file);
    });
    newStickerName.value = file.name.replace(/\.[^.]+$/, '');
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '无法读取图片。';
  } finally {
    input.value = '';
  }
}
async function saveSticker() {
  if (!newStickerSource.value || savingSticker.value) return;
  savingSticker.value = true;
  error.value = '';
  try {
    await store.addWeChatSticker(newStickerName.value, newStickerSource.value);
    newStickerName.value = '';
    newStickerSource.value = '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '保存表情包失败。';
  } finally {
    savingSticker.value = false;
  }
}
function showUnavailable(label: string) {
  unavailable.value = label;
}
function syncTheme() {
  darkMode.value = getVariables({ type: 'script', script_id: getScriptId() })?.darkMode === true;
}
function loadAppearance() {
  const value = getVariables({ type: 'script', script_id: getScriptId() })?.magicGirlWeChatAppearance;
  chatAppearance.value = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
onMounted(() => {
  syncTheme();
  loadAppearance();
  eventOn('mag_variable_update_ended', syncTheme);
  eventOn(tavern_events.GENERATION_STARTED, onGenerationStart);
  eventOn(tavern_events.GENERATION_ENDED, onGenerationEnd);
  eventOn(tavern_events.GENERATION_STOPPED, onGenerationEnd);
});
onUnmounted(() => {
  eventRemoveListener('mag_variable_update_ended', syncTheme);
  eventRemoveListener(tavern_events.GENERATION_STARTED, onGenerationStart);
  eventRemoveListener(tavern_events.GENERATION_ENDED, onGenerationEnd);
  eventRemoveListener(tavern_events.GENERATION_STOPPED, onGenerationEnd);
});
function onGenerationStart() {
  generating.value = true;
}
function onGenerationEnd() {
  generating.value = false;
}
const store = useMagicGirlStatStore();
const wechat = computed(() => store.statData?.手机?.微信);
const accounts = computed<微信数据['账号']>(() => wechat.value?.账号 ?? {});
const self = computed(() => accounts.value.user);
const accountPage = ref<'profile' | 'services' | 'wallet' | 'payments' | null>(null);
const profileName = ref('');
const profileImage = ref('');
const savingProfile = ref(false);
const walletBalance = computed(() => (store.statData?.角色?.user?.金钱 ?? 0).toFixed(2));
watch(accountPage, page => {
  if (page === 'profile') {
    profileName.value = self.value?.昵称 || '';
    profileImage.value = self.value?.头像 || '';
  }
  error.value = '';
});
async function chooseProfileImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    profileImage.value = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('无法读取头像。'));
      reader.readAsDataURL(file);
    });
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '无法读取头像。';
  }
}
async function saveProfile() {
  if (savingProfile.value) return;
  savingProfile.value = true;
  error.value = '';
  try {
    await store.updateWeChatProfile(profileName.value, profileImage.value);
    accountPage.value = null;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '保存个人信息失败。';
  } finally {
    savingProfile.value = false;
  }
}
function startServiceTransfer(id: string) {
  accountPage.value = null;
  openChat(privateChatKey(id));
  paymentKind.value = '转账';
}
const worldTime = computed(() => store.statData?.世界?.时间 || '');
const stickerNames = computed(() => Object.keys(self.value?.表情包 ?? {}));
const tab = ref<Tab>('chats');
const subPage = ref<'requests' | 'add' | 'nearby' | null>(null);
const nearbyText = ref('');
const nearbyAvatarChoices = new Map<string, string>();
function openNearbyPage() {
  nearbyText.value = (getChatMessages(-3) || []).map(message => message.message || '').join('\n');
  nearbyAvatarChoices.clear();
  error.value = '';
  subPage.value = 'nearby';
}
function findNode(tree: Record<string, 地图节点>, name: string): 地图节点 | null {
  for (const [key, node] of Object.entries(tree)) {
    if (key === name) return node;
    const found = findNode(node.子地图 || {}, name);
    if (found) return found;
  }
  return null;
}
function containsLocation(node: 地图节点 | null, name: string): boolean {
  return !!node && Object.entries(node.子地图 || {}).some(([key, child]) => key === name || containsLocation(child, name));
}
const nearbyPeople = computed(() => {
  const data = store.statData;
  if (!data) return [];
  const location = data.世界.地图索引;
  const entries = [
    ...Object.entries(data.角色.主要角色).map(([id, person]) => ({ id, name: id, person })),
    ...Object.entries(data.角色.次要角色).filter(([id]) => id !== '$template').map(([id, person]) => ({ id, name: person.名称 || id, person })),
  ];
  return entries.filter(({ person }) =>
    person.在场 === true ||
    person.名称检索词?.some(word => word === '$all' || (!!word && nearbyText.value.includes(word))) ||
    person.区域检索词?.some(area => area === '$all' || area === location || containsLocation(findNode(data.地图, area), location)),
  );
});
function nearbyAvatar(id: string): string {
  let avatar = nearbyAvatarChoices.get(id);
  if (!avatar) {
    avatar = nearbyAvatars[Math.floor(Math.random() * nearbyAvatars.length)];
    nearbyAvatarChoices.set(id, avatar);
  }
  return avatar;
}
async function openNearby(person: { id: string; name: string }) {
  error.value = '';
  try {
    await store.ensureNearbyAccount(person.id, person.name, nearbyAvatar(person.id));
    if (self.value?.好友.includes(person.id)) openChat(privateChatKey(person.id));
    else cardView.value = person.id;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '创建账号失败。';
  }
}
const selectedKey = ref<string | null>(null);
const selectedSession = computed<微信会话 | null>(() => {
  if (!selectedKey.value) return null;
  const existing = wechat.value?.会话?.[selectedKey.value];
  if (existing) return existing;
  const other = selectedKey.value.startsWith('私聊:user&') ? selectedKey.value.slice('私聊:user&'.length) : '';
  return other && self.value?.好友.includes(other) && accounts.value[other]
    ? { 类型: '私聊', 成员: ['user', other], 消息: [] }
    : null;
});
const selectedTitle = computed(() =>
  selectedKey.value && selectedSession.value && wechat.value
    ? chatAppearance.value[selectedKey.value]?.name || chatTitle(selectedKey.value, selectedSession.value, wechat.value)
    : '聊天',
);
const pending = computed(() => (wechat.value?.准备发送?.会话 === selectedKey.value ? wechat.value.准备发送 : null));
const pendingLocked = computed(() => !!pending.value && pending.value.已确认 !== false);
const chats = computed(() =>
  Object.entries(wechat.value?.会话 ?? {})
    .filter(([, session]) => session.成员?.includes('user'))
    .map(([key, session]) => {
      const last = session.消息.at(-1);
      return {
        key,
        title: chatAppearance.value[key]?.name || chatTitle(key, session, wechat.value!),
        group: session.类型 === '群聊',
        avatarId: session.类型 === '私聊' ? session.成员.find(id => id !== 'user') || 'user' : 'user',
        preview: last
          ? isWeChatMessage(last)
            ? `${last.发送者 === 'user' ? '我' : accounts.value[last.发送者]?.昵称 || last.发送者}：${contentSummary(last.内容)}`
            : operationSummary(last)
          : '暂无消息',
        time: last?.时间 || '',
      };
    })
    .sort(
      (a, b) =>
        Number(!!chatAppearance.value[b.key]?.pinned) - Number(!!chatAppearance.value[a.key]?.pinned) ||
        b.time.localeCompare(a.time),
    ),
);
const contacts = computed(() =>
  (self.value?.好友 ?? [])
    .filter(id => !!accounts.value[id])
    .map(id => [id, accounts.value[id]] as const)
    .sort((a, b) => (a[1].昵称 || a[0]).localeCompare(b[1].昵称 || b[0], 'zh-CN')),
);
const cardCandidates = computed(() => Object.entries(accounts.value).filter(([id]) => id !== 'user'));
const filteredCardCandidates = computed(() =>
  cardCandidates.value.filter(([id, account]) => `${id} ${account.昵称}`.includes(cardQuery.value.trim())),
);
const filteredForwardChats = computed(() => chats.value.filter(item => item.title.includes(forwardQuery.value.trim())));
const inviteCandidates = computed(() =>
  cardCandidates.value.filter(([id]) => self.value?.好友.includes(id) && !selectedSession.value?.成员.includes(id)),
);
const groupCandidates = computed(() =>
  (selectedSession.value?.类型 === '群聊' ? inviteCandidates.value : contacts.value).filter(([id, account]) =>
    `${id} ${account.昵称}`.includes(groupQuery.value.trim()),
  ),
);
const detailSearchResults = computed(() =>
  (selectedSession.value?.消息 || [])
    .filter(isWeChatMessage)
    .filter(item => contentSummary(item.内容).includes(detailSearch.value.trim())),
);
const incomingRequests = computed(() =>
  Object.entries(wechat.value?.会话 ?? {})
    .map(([, session]) => friendRequest(session))
    .filter((item): item is NonNullable<typeof item> => !!item && item.目标 === 'user')
    .map(item => [item.操作者, item] as const),
);
const outgoingRequests = computed(() =>
  Object.entries(wechat.value?.会话 ?? {})
    .map(([, session]) => friendRequest(session))
    .filter((item): item is NonNullable<typeof item> => !!item && item.操作者 === 'user')
    .map(item => [item.目标!, item] as const),
);
function outgoingRequest(id: string) {
  return friendRequest(wechat.value?.会话[privateChatKey(id)])?.操作者 === 'user';
}
const addCandidates = computed(() =>
  Object.entries(accounts.value).filter(
    ([id, account]) =>
      id !== 'user' &&
      !self.value?.好友.includes(id) &&
      !friendRequest(wechat.value?.会话[privateChatKey(id)]) &&
      `${id} ${account.昵称}`.includes(query.value.trim()),
  ),
);
const visibleContacts = computed(() =>
  contacts.value.filter(([id, account]) => `${id} ${account.昵称}`.includes(query.value.trim())),
);
const visibleChats = computed(() => chats.value.filter(item => item.title.includes(query.value.trim())));
const query = ref('');
const draft = ref('');
const requestMessage = ref('');
const error = ref('');
const sending = ref(false);
type SelectedMessage = 微信消息 & { 内容下标?: number };
const quoted = ref<SelectedMessage | null>(null);
const messageMenu = ref<SelectedMessage | null>(null);
function isSpecialCard(item: 微信消息内容): boolean {
  return typeof item === 'string' && /^<(?:转账|红包|名片)(?:\s|>)/.test(item);
}
let messageHoldTimer: ReturnType<typeof setTimeout> | undefined;
function openMessageMenu(message: 微信消息, part: 微信消息内容, index: number) {
  cancelMessageHold();
  messageMenu.value = { ...message, 内容: [part], 内容下标: index };
}
function startMessageHold(message: 微信消息, part: 微信消息内容, index: number) {
  cancelMessageHold();
  messageHoldTimer = setTimeout(() => openMessageMenu(message, part, index), 500);
}
function cancelMessageHold() {
  if (messageHoldTimer) clearTimeout(messageHoldTimer);
  messageHoldTimer = undefined;
}
const stickerOpen = ref(false);
const messagesElement = ref<HTMLElement>();

function displayTime(value: string): string {
  return value.match(/T(\d{1,2}:\d{2})/)?.[1] || value;
}
function showMessageTime(index: number): boolean {
  const messages = selectedSession.value?.消息;
  if (!messages || index === 0) return true;
  const current = messages[index].时间.match(/T(\d{1,2}):(\d{2})/);
  const previous = messages[index - 1].时间.match(/T(\d{1,2}):(\d{2})/);
  if (!current || !previous) return false;
  return Number(current[1]) * 60 + Number(current[2]) - (Number(previous[1]) * 60 + Number(previous[2])) >= 5;
}
function selectTab(next: Tab) {
  tab.value = next;
  query.value = '';
  searchOpen.value = false;
  error.value = '';
}
function openChat(key: string) {
  selectedKey.value = key;
  draft.value = '';
  quoted.value = null;
  messageMenu.value = null;
  stickerOpen.value = false;
  extrasOpen.value = false;
  detailsOpen.value = false;
  cardView.value = null;
  error.value = '';
  scrollBottom();
}
function openDetails() {
  detailSearch.value = '';
  const appearance = chatAppearance.value[selectedKey.value || ''] || {};
  detailName.value = appearance.name || '';
  detailImage.value = appearance.image || '';
  detailMuted.value = !!appearance.muted;
  detailPinned.value = !!appearance.pinned;
  groupPickerOpen.value = false;
  detailsOpen.value = true;
}
async function saveAppearance() {
  if (!selectedKey.value) return;
  const key = selectedKey.value;
  const appearance = {
    name: detailName.value.trim(),
    image: detailImage.value,
    muted: detailMuted.value,
    pinned: detailPinned.value,
  };
  try {
    await updateVariablesWith(
      variables => ({
        ...variables,
        magicGirlWeChatAppearance: { ...(variables.magicGirlWeChatAppearance || {}), [key]: appearance },
      }),
      { type: 'script', script_id: getScriptId() },
    );
    chatAppearance.value = { ...chatAppearance.value, [key]: appearance };
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '保存聊天外观失败。';
  }
}
async function setDetailImage(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    detailImage.value = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('图片读取失败。'));
      reader.readAsDataURL(file);
    });
    await saveAppearance();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '保存图片失败。';
  }
  input.value = '';
}
function openGroupPicker() {
  groupQuery.value = '';
  groupMembers.value =
    selectedSession.value?.类型 === '私聊' ? selectedSession.value.成员.filter(id => id !== 'user') : [];
  groupPickerOpen.value = true;
}
async function createGroup() {
  if (!groupMembers.value.length || sending.value) return;
  sending.value = true;
  error.value = '';
  try {
    if (selectedSession.value?.类型 === '群聊' && selectedKey.value) {
      for (const id of groupMembers.value)
        await store.performWeChatOperation({
          类型: '操作',
          操作: '邀请进群',
          操作者: 'user',
          会话: selectedKey.value,
          目标: id,
          时间: worldTime.value,
        });
      groupPickerOpen.value = false;
    } else {
      const name = groupMembers.value.map(id => accounts.value[id]?.昵称 || id).join('、');
      const key = await store.createWeChatGroup(name, groupMembers.value);
      openChat(key);
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '创建群聊失败。';
  } finally {
    sending.value = false;
  }
}
function openCard(id: string) {
  if (!accounts.value[id]) {
    error.value = '名片中的账号不存在。';
    return;
  }
  cardView.value = id;
}
function openCardChat() {
  if (!cardView.value) return;
  openContact(cardView.value);
}
async function requestCardFriend() {
  if (!cardView.value) return;
  await requestFriend(cardView.value);
  if (!error.value) cardView.value = null;
}
function openPayment(message: 微信消息, index: number) {
  const item = message.内容[index];
  if (typeof item !== 'string') return;
  const match = item.match(/^<(红包|转账) 金额="([^"]+)">([\s\S]*?)<\/\1>$/);
  if (!match) return;
  paymentView.value = {
    message,
    index,
    kind: match[1] as '红包' | '转账',
    amount: match[2],
    remark: match[3],
    status: message.特殊内容状态?.[index],
  };
}
async function performOperation(event: Omit<OperationEvent, '类型' | '时间'>) {
  if (sending.value || !selectedKey.value) return;
  sending.value = true;
  error.value = '';
  try {
    await store.performWeChatOperation({ 类型: '操作', 时间: worldTime.value, ...event });
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '微信操作失败。';
  } finally {
    sending.value = false;
  }
}
async function resolvePayment(operation: '领取红包' | '领取转账' | '退回转账') {
  const view = paymentView.value;
  if (!view || !selectedKey.value) return;
  const conversation = selectedKey.value;
  await performOperation({
    操作: operation,
    操作者: 'user',
    会话: conversation,
    目标: { 楼层ID: view.message.楼层ID, 内容下标: view.index },
  });
  const updated = wechat.value?.会话[conversation]?.消息.find(
    item => isWeChatMessage(item) && item.楼层ID === view.message.楼层ID,
  );
  if (!error.value || (updated && isWeChatMessage(updated) && updated.特殊内容状态?.[view.index])) {
    paymentView.value = null;
  }
}
async function poke(id: string) {
  if (!selectedKey.value || id === 'user') return;
  await performOperation({ 操作: '拍一拍', 操作者: 'user', 目标: id, 会话: selectedKey.value });
}
function startForward(message: 微信消息) {
  forwarding.value = message;
  forwardQuery.value = '';
  forwardDestination.value = null;
}
async function sendForward(destination: string) {
  const source = selectedSession.value;
  const message = forwarding.value;
  if (!source || !message || !selectedKey.value) return;
  sending.value = true;
  error.value = '';
  try {
    const snapshot = { 楼层ID: message.楼层ID, 发送者: message.发送者, 时间: message.时间, 内容: message.内容 };
    const forwarded: 微信消息内容 =
      source.类型 === '私聊'
        ? { 转发: { 私聊: { 成员: [...source.成员], 消息: [snapshot] } } }
        : { 转发: { 群聊: { 名称: source.名称 || selectedKey.value, 成员: [...source.成员], 消息: [snapshot] } } };
    await store.sendWeChatMessage(destination, [forwarded]);
    forwarding.value = null;
    forwardDestination.value = null;
    openChat(destination);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '转发失败。';
  } finally {
    sending.value = false;
  }
}
async function sendCard(id: string) {
  if (!selectedKey.value) return;
  sending.value = true;
  error.value = '';
  const conversation = selectedKey.value;
  const content = [`<名片 角色="${id}">`, ...(cardMessage.value.trim() ? [cardMessage.value.trim()] : [])];
  let accepted = false;
  try {
    await store.sendWeChatMessage(conversation, content);
    accepted = true;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '名片发送失败。';
  } finally {
    if (accepted) {
      cardPickerOpen.value = false;
      selectedCard.value = null;
      cardMessage.value = '';
    }
    sending.value = false;
  }
}
async function sendVoice() {
  if (
    !selectedKey.value ||
    !voiceText.value.trim() ||
    !/^\d+$/.test(voiceDuration.value) ||
    Number(voiceDuration.value) <= 0
  ) {
    error.value = '请填写语音转写内容和有效时长。';
    return;
  }
  if (/[<>]/.test(voiceText.value)) {
    error.value = '转写内容不能包含尖括号。';
    return;
  }
  sending.value = true;
  error.value = '';
  try {
    await store.sendWeChatMessage(selectedKey.value, [
      `<语音 时长="${voiceDuration.value}s">${voiceText.value.trim()}</语音>`,
    ]);
    voiceOpen.value = false;
    voiceText.value = '';
    voiceDuration.value = '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '语音消息发送失败。';
  } finally {
    sending.value = false;
  }
}
function openContact(id: string) {
  openChat(privateChatKey(id));
}
async function scrollBottom() {
  await nextTick();
  messagesElement.value?.scrollTo({ top: messagesElement.value.scrollHeight });
}
async function sendMessage() {
  const text = draft.value.trim();
  if (!text || !selectedKey.value || sending.value) return;
  sending.value = true;
  error.value = '';
  try {
    await store.sendWeChatMessage(selectedKey.value, [text], quoted.value ?? undefined);
    draft.value = '';
    quoted.value = null;
    await scrollBottom();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '发送失败';
  } finally {
    sending.value = false;
  }
}
function quoteMessage(message: 微信消息) {
  quoted.value = message;
  stickerOpen.value = false;
}
async function deleteMessageFloor() {
  const message = messageMenu.value;
  if (!message || !selectedKey.value) return;
  messageMenu.value = null;
  error.value = '';
  try {
    await store.deleteWeChatFloor(selectedKey.value, message.楼层ID);
    quoted.value = null;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '删除失败。';
  }
}
async function clearFailedLog() {
  try {
    await store.clearFailedWeChatLog();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '清除失败日志失败。';
  }
}
async function sendSticker(name: string) {
  if (!selectedKey.value || sending.value) return;
  sending.value = true;
  error.value = '';
  try {
    await store.sendWeChatMessage(selectedKey.value, [`<表情包>${name}</表情包>`], quoted.value ?? undefined);
    quoted.value = null;
    stickerOpen.value = false;
    await scrollBottom();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '发送失败';
  } finally {
    sending.value = false;
  }
}
async function retrySend() {
  error.value = '';
  try {
    await store.retryWeChatSend();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '重试失败';
  }
}
async function confirmSend() {
  if (sending.value || !pending.value) return;
  sending.value = true;
  error.value = '';
  try {
    await store.confirmWeChatSend();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '确认发送失败。';
  } finally {
    sending.value = false;
  }
}
async function discardDraft() {
  if (sending.value || !pending.value) return;
  sending.value = true;
  error.value = '';
  try {
    await store.discardWeChatDraft();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '清空待发送消息失败。';
  } finally {
    sending.value = false;
  }
}
async function requestFriend(id: string) {
  error.value = '';
  try {
    await store.requestWeChatFriend(id, requestMessage.value.trim());
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '申请失败';
  }
}
async function respondFriend(id: string, accept: boolean) {
  error.value = '';
  try {
    await store.respondWeChatFriend(id, accept);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '处理失败';
  }
}
watch(() => selectedSession.value?.消息.length, scrollBottom);
</script>

<style src="../../styles/wechat.css"></style>
