<template>
  <div class="diary-container">
    <div class="diary-book">
      <transition :name="transitionName" mode="out-in">

        <!-- 封面 (新增 @click="nextPage" 让整个封面可点击) -->
        <div v-if="currentPage === 0" class="page cover-page" key="cover" @click="nextPage">
          <div class="cover-texture"></div>
          <div class="cover-content-wrapper">
            <div class="cover-corner top-left"></div>
            <div class="cover-corner top-right"></div>
            <div class="cover-corner bottom-left"></div>
            <div class="cover-corner bottom-right"></div>

            <div class="cover-header">
              <span class="cover-rune">NOX</span>
            </div>

            <h1 class="cover-title">异界<br>见闻录</h1>

            <div class="cover-divider">
              <span class="diamond">❖</span>
              <span class="line"></span>
              <span class="diamond">❖</span>
            </div>

            <div class="cover-symbol-container">
              <div class="cover-symbol">👁</div>
              <div class="cover-circle"></div>
            </div>

            <div class="cover-footer">
              <div class="cover-subtitle">—— 记录者：C ——</div>
              <div class="cover-warning">非请勿入 · 阅后即焚</div>
            </div>

            <!-- 新增：明显的翻页引导动画 -->
            <div class="cover-open-prompt">
              <span class="prompt-text">点击翻开</span>
              <span class="prompt-arrow">▾</span>
            </div>
          </div>
        </div>

        <!-- 日记内容页 -->
        <div v-else-if="currentPage <= pages.length" class="page content-page" :key="currentPage">
          <h2 class="chapter-title">{{ pages[currentPage - 1].title }}</h2>
          <div class="chapter-content" v-html="highlightText(pages[currentPage - 1].content)"></div>
        </div>

        <!-- 最后一页：爱丽丝的留言 -->
        <div v-else class="page message-page" key="message">
          <div class="message-card">
            <div class="avatar-wrapper">
              <img :src="aliceAvatarUrl" alt="爱丽丝" class="alice-avatar">
            </div>
            <div class="message-text">
              <p v-html="highlightText('父亲大人......')"></p>
              <p v-html="highlightText('如果您做好了准备，就来“书库”找我吧')"></p>
              <p v-html="highlightText('嗯...')"></p>
              <p v-html="highlightText('“书库”在状态栏里面，记得先按“启程”开局')"></p>
              <p v-html="highlightText('如果不能正常开局的话，请尝试切换到edge浏览器')"></p>
            </div>
            <div class="message-signature">
              by 爱丽丝
            </div>
          </div>
        </div>

      </transition>

      <!-- 翻页控制 (修改：在封面时完全隐藏整个控制栏，让封面更纯粹) -->
      <div class="diary-controls" v-show="currentPage > 0">
        <button
          class="control-btn prev-btn"
          @click="prevPage"
        >
          ◂
        </button>

        <span class="progress" :class="{ 'is-hidden': currentPage === totalPages }">
          - {{ currentPage }} -
        </span>

        <button
          class="control-btn next-btn"
          @click="nextPage"
          :class="{ 'is-hidden': currentPage === totalPages }"
        >
          ▸
        </button>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue';

// 页面状态
const currentPage = ref(0);
const transitionName = ref('page-next');

// 爱丽丝头像URL
const aliceAvatarUrl = 'https://gitgud.io/mouse789/dust-laden-obdurant/-/raw/main/女儿爱丽丝/头像.webp';

// 提前加载图片资源
onMounted(() => {
  const img = new Image();
  img.src = aliceAvatarUrl;
});

// 关键字分类定义 (新增了 启程、书库)
const goldKeywords = [
  '灯', '铸', '刃', '心', '辉光', '准则','启程'
];

const redKeywords = [
  '杯','蛾','冬','启','林地', '仪式', '秘传', '漫宿', '纯白之门', '器具', '献祭', '攥升', '委托', '书库', '龙牙山脉','edge'
];

const allKeywords = [...goldKeywords, ...redKeywords].sort((a, b) => b.length - a.length);
const keywordRegex = new RegExp(`(${allKeywords.join('|')})`, 'g');

// 日记数据
const pages = [
  {
    title: '【灰雾】',
    content: `咸腥的风从海上来，带着铁锈和某种燃烧过度的油脂味。这就是埃布尔——迷雾之海西岸的王国，四席议会统治下的君主立宪之地。<br><br>我站在港口，背后是灰白色的议会高塔，面前是龙牙山脉在远方天际线勾勒出的锯齿状剪影。<br><br>这里的科技停留在前工业蒸汽时代，没有无线电，但裁缝店里的蒸汽熨斗却烫出了类现代的服饰线条。我穿着刚买的粗呢外套，口袋里只有三枚磨损的金币。<br><br>街角传来铜管乐器的轰鸣，那是启明教会的晨祷。守夜人的信徒们穿着白袍，胸前的灯形徽章在蒸汽雾中忽明忽暗。<br><br>但我注意到那些白袍人袖口下的暗纹——裁定所的标记。他们在搜寻什么。一个衣衫褴褛的男人被按倒在地，他的手指在抽搐，瞳孔泛着不正常的惨白。"入迷者，"有人低声说，"过度钻研灯准则的疯子。"<br><br>教会会收编他，如果还有价值；或者把他关进圣殿地下，和那些彻底迷失的术士一起，成为禁忌的标本。<br><br>禁忌。我记住了这个词。在这个推崇“灯”“铸”“刃”“心”的国度，“蛾”“启”“冬”“杯”是绝对的禁区。<br><br>我得小心。一个来历不明的异乡人，最好的生存策略就是先学会闭嘴。`
  },
  {
    title: '【“术”】',
    content: `我曾以为这世界的奇迹遵循着某种能量守恒，直到我亲眼目睹那盏灯燃起。<br><br>没有燃料，没有灯芯。那是一个低阶的灯术士，他仅仅是念诵了一段关于“光与理性”的悖论，指尖便剥落下一片惨白的光屑。那光不是辐射，是一种纯粹的“揭示”。它照在墙角，原本空无一物的阴影里竟显出无数重叠的眼球涂鸦。<br><br>这就是“术”。它不是魔法，是漫宿墙皮上掉落的灰。那些被称作“准则”的东西——灯的理性、铸的毁灭、杯的欲望……它们根本不关心物理法则。术士们像窃贼，从高维的餐桌上偷取残羹冷炙。<br><br>但我看见那个术士的手指在颤抖。使用“术”是对现实的强行扭曲，而现实的反作用力会作用于大脑。即使是点燃这一点光，他的瞳孔也因为在那一瞬间窥见了过多的真理而处于涣散边缘。<br><br>力量是借来的，利息是理智。`
  },
  {
    title: '【无墙之屋】',
    content: `入梦不再是休息。自从那次高烧后，我就能在睡眠的边缘瞥见那片森林。<br><br>他们称之为“漫宿”，世界的表皮之下。没有墙壁，只有层层叠叠的门扉。<br><br>我最初只能在“林地”徘徊。那里的树木不是植物，是黑色气流凝固的狂乱线条。风声像死者的窃窃私语，那是“飞蛾”在振翅。我必须小心翼翼，因为林地是所有渴望飞升者的必经之路，也是疯子的乱葬岗。<br><br>昨夜，我试着向上走。穿过林地那令人窒息的黑色植被，我看见了那扇门。<br><br>纯白之门。<br><br>它伫立在虚空中，散发着比冬夜月光更冷冽的辉光。靠近它，体温在流失，思维却像被液氮冷冻般清晰。我想叩门，但直觉在尖叫——我的灵魂重量还不足以推开它。<br><br>我醒来时，枕头湿透了，不是汗，是融化的霜。`
  },
  {
    title: '【器具】',
    content: `黑市的空气里弥漫着发霉的香料味，那是为了掩盖更深层的腐臭。<br><br>那个瞎了一只眼的商人推给我一把匕首。锈迹斑斑，刃口却泛着一种不详的暗红。<br><br>“这东西吃过五个人的血，全是因爱生恨的情杀。”商人的声音像砂纸摩擦，“它是天然形成的‘器具’。这上面固化了‘杯’的准则。”<br><br>我握住刀柄。那一瞬间，我不觉得冷，反而感到一阵燥热的脉动从掌心钻入血管。它在渴望，渴望切开皮肤，渴望温热的液体。这不是金属，这是某种欲望的尸体。<br><br>人工制造的那些炼金产品与之相比，就像是拙劣的玩具。那些量产的护符力量死板且易逝，但这把匕首……它活着，且充满恶意。<br><br>我买下了它。虽然我知道，把这种东西带在身边，就像揣着一条毒蛇。长期接触这些器具，心智会被那种单一的准则侵染。我也许会变得嗜血，或者对血肉产生病态的迷恋。<br><br>但在这个世界，没有牙齿的人活不过第一章。`
  },
  {
    title: '【委托】',
    content: `那枚金币在桌面上旋转，最终倒下，发出沉闷的声响。它的边缘磨损严重，刻着前代君主的侧脸，那张脸已经被无数只肮脏的手摸得模糊不清。<br><br>
这就是报酬。<br><br>
委托人是黑市那个总是咳嗽的老头。任务地点在东区的下水道网格，代号“溃烂点”。有人在那里倾倒了炼金废料，导致一群老鼠发生了畸变。它们不再是啮齿动物，而是长着人指甲的肉球，会像水蛭一样吸附在管道壁上，等待路过的检修工。<br><br>
我的工作是清理它们，并带回一颗完整的“鼠王”心脏。<br><br>
多么体面。<br><br>
我想起今天在街角看到的那些年轻人。他们穿着学院的深蓝制服，胸口别着银质的徽章，谈论着关于“以太”和“星轨”的高深理论。他们的手干净、干燥，握着的是精装的羊皮纸书卷，而不是沾满污泥的短刀。<br><br>
如果我是他们中的一员，我现在应该坐在图书馆里练习最初级的照明术。我的委托会是“协助整理星图”或者“照看温室里的发光植物”。哪怕失误，也就是被扣掉几分学分，而不是被下水道里的怪物咬断喉咙。<br><br>
但我还是收起了金币。它很脏，带着一股铁锈味。<br><br>
而且，那颗“鼠王”的心脏……如果处理得当，或许能提炼出一点微弱的“蛾”之准则。`
  },
  {
    title: '【秘传】',
    content: `在废纸堆里翻出这本书时，我的手指被纸页边缘割破了。<br><br>
这是一本关于“灯”的秘传。残缺不全，封皮是用某种不知名生物的皮制成的。文字不是写上去的，而是烧灼上去的。<br><br>
阅读它是一种折磨。每一个字都在脑海里尖叫，试图把一段关于“辉光”的记忆强行塞进我的海马体。我不得不每读一页就停下来，盯着烛火发呆十分钟，以确认自己还处在三维空间。<br><br>
但我发现了文字排列的诡计。当把书页对着强光透视，那些烧灼的孔洞便不再是文字，而是星图与地貌的重叠。<br><br>
它指向龙牙山脉的北坡。<br><br>
不是那座显眼的红龙主峰，而是侧面那片终年被雾气笼罩的“盲区”。`
  },
  {
    title: '【余烬】',
    content: `我不该去的。贪婪是比疯狂更致命的毒药。<br><br>
龙牙山脉的深处没有风。那里安静得像是一幅静止的油画。但我听到了呼吸声，沉重、灼热，带着硫磺的味道。<br><br>
那是一只红龙。或者说，是一座由鳞片和火焰构成的山丘。它仅仅是翻了个身，释放出的威压就让我全身的骨骼都在呻吟。那是属于神话生物的力场，凡人在其面前渺小如尘埃。<br><br>
它守护着某种东西，也许是高阶的铸造器具，也许是通往漫宿深处的裂隙。但我根本不敢细看。在那一刻，我的“刃”属性也好，我的“灯”理性也罢，全都失效了。只有生物本能的恐惧支配了双腿。<br><br>
我逃了。连滚带爬，丢掉了所有的补给。`
  },
  {
    title: '【晋升】',
    content: `瓶颈期像是一堵看不见的墙。<br><br>
无论我如何练习那些低阶的戏法，我的术都不再有任何精进。那种感觉就像是试图用勺子挖穿地球。经验在积累，但质变遥遥无期。<br><br>
直到我解析出了那个仪式的含义。<br><br>从14级继续向上跨越，不是量的积累，是质的飞跃。凡人的模仿到此为止了。要想继续向上，必须接触禁忌。<br><br>
仪式图谱上画着复杂的循环：用“灯”照亮“铸”的熔炉，用“铸”锻造“刃”的锋芒……这是一个闭环。但这只是理论。<br><br>
真正的一行小字写在角落里：“唯有献祭，方能攥升。”<br><br>
献祭什么？理智？情感？还是更具体的东西？比如一个活生生的祭品，或者我自己的一部分人性。<br><br>
我看着镜子里的自己。眼底的青黑像两团散不开的墨。为了获得在这个世界站直的力量，我已经准备好支付代价了吗？`
  }
];

const totalPages = computed(() => pages.length + 1);

// 【关键修复】：改用内联样式 (Inline Style) 直接注入，彻底解决 Vue scoped CSS 导致 v-html 样式丢失/空白的问题
const highlightText = (text) => {
  if (!text) return '';

  return text.replace(keywordRegex, (match) => {
    if (goldKeywords.includes(match)) {
      return `<span style="color: #e2c068; font-weight: bold; text-shadow: 0 0 5px rgba(226, 192, 104, 0.4); padding: 0 1px;">${match}</span>`;
    } else {
      return `<span style="color: #ff4d4d; font-weight: bold; text-shadow: 0 0 5px rgba(255, 77, 77, 0.3); padding: 0 1px;">${match}</span>`;
    }
  });
};

// 翻页逻辑
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    transitionName.value = 'page-next';
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 0) {
    transitionName.value = 'page-prev';
    currentPage.value--;
  }
};
</script>

<style scoped>
/* 颜色变量定义 */
.diary-container {
  --c-text-main: #d0d0d0;
  --c-text-dim: #8a92a0;
  --c-gold: #e2c068;
  --c-gold-dim: #8a7b50;
  --c-red: #ff4d4d;
  --c-red-dim: #8a3232;
  --c-border: #4a4a4a;
  --c-bg-book: rgba(15, 18, 24, 0.85);
  --font-title: 'Georgia', 'SimSun', serif;
  --font-body: 'Helvetica Neue', 'Arial', sans-serif;

  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
  color: var(--c-text-main);
  font-family: var(--font-body);
  background: transparent;
}

/* 书本主体 */
.diary-book {
  width: 100%;
  max-width: 600px;
  height: 70vh;
  min-height: 550px;
  background: var(--c-bg-book);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(226, 192, 104, 0.15);
  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.5),
    inset 0 0 60px rgba(0, 0, 0, 0.6);
  position: relative;
  overflow: hidden;
  border-radius: 6px;
}

/* 页面通用样式 */
.page {
  position: absolute;
  inset: 0;
  padding: 40px 40px 70px 40px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow-y: auto;
  scrollbar-width: none;
}
.page::-webkit-scrollbar { display: none; }

/* ================= 封面样式 ================= */
.cover-page {
  justify-content: center;
  align-items: center;
  text-align: center;
  background-color: transparent;
  color: var(--c-gold);
  padding: 20px;
  cursor: pointer; /* 新增：鼠标悬浮变成小手，提示可点击 */
  transition: all 0.3s ease;
}

/* 新增：鼠标悬浮在封面时，边框微微发亮，增强交互感 */
.cover-page:hover .cover-content-wrapper {
  border-color: var(--c-gold);
  box-shadow: inset 0 0 30px rgba(226, 192, 104, 0.1);
}

.cover-page:hover .cover-corner {
  border-color: #fff;
  box-shadow: 0 0 10px rgba(226, 192, 104, 0.5);
}

.cover-texture {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 50% 30%, rgba(50, 40, 20, 0.15), transparent 60%),
    repeating-linear-gradient(45deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 2px, transparent 2px, transparent 4px);
  opacity: 0.5;
  pointer-events: none;
}

.cover-content-wrapper {
  width: 100%;
  height: 100%;
  border: 3px double var(--c-gold-dim);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 20px;
  box-sizing: border-box;
}

.cover-corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: var(--c-gold);
  border-style: solid;
  transition: all 0.3s ease;
}
.top-left { top: 10px; left: 10px; border-width: 2px 0 0 2px; }
.top-right { top: 10px; right: 10px; border-width: 2px 2px 0 0; }
.bottom-left { bottom: 10px; left: 10px; border-width: 0 0 2px 2px; }
.bottom-right { bottom: 10px; right: 10px; border-width: 0 2px 2px 0; }

.cover-header {
  margin-bottom: 20px;
  opacity: 0.6;
}
.cover-rune {
  font-size: 0.8rem;
  letter-spacing: 8px;
  border-bottom: 1px solid var(--c-gold-dim);
  padding-bottom: 5px;
}

.cover-title {
  font-family: var(--font-title);
  color: var(--c-gold);
  font-size: 3.5rem;
  line-height: 1.2;
  margin: 0;
  letter-spacing: 8px;
  text-shadow: 0 4px 10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(226, 192, 104, 0.2);
  background: linear-gradient(to bottom, #fff5d6, #c4a055);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.cover-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60%;
  margin: 20px 0;
  opacity: 0.8;
}
.cover-divider .line {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--c-gold), transparent);
  flex-grow: 1;
  margin: 0 10px;
}
.cover-divider .diamond {
  font-size: 12px;
  color: var(--c-gold);
}

.cover-symbol-container {
  position: relative;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 30px 0;
}
.cover-symbol {
  font-size: 4rem;
  color: var(--c-gold);
  z-index: 2;
  text-shadow: 0 0 15px rgba(226, 192, 104, 0.4);
}
.cover-circle {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 1px dashed var(--c-gold-dim);
  border-radius: 50%;
  animation: spin 20s linear infinite;
}

.cover-footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cover-subtitle {
  color: var(--c-text-dim);
  font-size: 1rem;
  letter-spacing: 3px;
  font-style: italic;
}
.cover-warning {
  font-size: 0.7rem;
  color: var(--c-red-dim);
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-top: 10px;
}

/* ================= 内容页样式 ================= */
.chapter-title {
  font-family: var(--font-title);
  color: var(--c-gold);
  font-size: 1.6rem;
  margin-bottom: 30px;
  text-align: center;
  border-bottom: 1px solid rgba(226, 192, 104, 0.2);
  padding-bottom: 15px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}
.chapter-content {
  font-size: 1.1rem;
  line-height: 1.9;
  color: #d0d0d0;
  text-align: justify;
  flex-grow: 1;
}

/* ================= 最后一页：爱丽丝留言样式 ================= */
.message-page {
  justify-content: center;
  align-items: center;
  background: transparent;
}

.message-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  border: 1px dashed var(--c-gold-dim);
  border-radius: 12px;
  padding: 40px 30px;
  width: 85%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(226, 192, 104, 0.05);
  position: relative;
}

.avatar-wrapper {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 2px solid var(--c-gold);
  padding: 4px;
  background: #000;
  box-shadow: 0 0 20px rgba(226, 192, 104, 0.3);
  margin-bottom: 25px;
  position: relative;
}

.avatar-wrapper::after {
  content: '';
  position: absolute;
  inset: -6px;
  border: 1px dashed var(--c-gold-dim);
  border-radius: 50%;
  animation: spin 15s linear infinite;
}

.alice-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.message-text {
  text-align: center;
  color: #e0e0e0;
  font-size: 1.15rem;
  line-height: 2;
  font-family: var(--font-title);
  letter-spacing: 1px;
  margin-bottom: 30px;
}

.message-text p {
  margin: 10px 0;
  text-shadow: 0 2px 4px rgba(0,0,0,0.8);
}

.message-signature {
  align-self: flex-end;
  color: var(--c-gold);
  font-family: var(--font-title);
  font-style: italic;
  font-size: 1.1rem;
  letter-spacing: 2px;
  margin-right: 10px;
}

/* ================= 动画与控制 ================= */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 融入书本的翻页控件 */
.diary-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-sizing: border-box;
  pointer-events: none;
  z-index: 10;
  background: linear-gradient(to top, rgba(15, 18, 24, 0.9), transparent);
}

.control-btn {
  pointer-events: auto;
  background: transparent;
  border: none;
  color: var(--c-gold-dim);
  font-size: 2.5rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-shadow: 0 2px 5px rgba(0,0,0,0.8);
}

.control-btn:hover {
  color: var(--c-gold);
  transform: scale(1.2);
  text-shadow: 0 0 15px rgba(226, 192, 104, 0.8);
}

.control-btn.is-hidden {
  opacity: 0;
  pointer-events: none;
  transform: scale(0.8);
}

.progress {
  pointer-events: auto;
  color: var(--c-text-dim);
  font-family: var(--font-title);
  font-size: 0.9rem;
  letter-spacing: 2px;
  transition: opacity 0.3s;
}

.progress.is-hidden {
  opacity: 0;
}

/* 翻页动画 */
.page-next-enter-active, .page-next-leave-active,
.page-prev-enter-active, .page-prev-leave-active {
  transition: all 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.page-next-enter-from { opacity: 0; transform: translateX(30px) scale(0.95); filter: blur(2px); }
.page-next-leave-to { opacity: 0; transform: translateX(-30px) scale(0.95); filter: blur(2px); }

.page-prev-enter-from { opacity: 0; transform: translateX(-30px) scale(0.95); filter: blur(2px); }
.page-prev-leave-to { opacity: 0; transform: translateX(30px) scale(0.95); filter: blur(2px); }

.cover-open-prompt {
  position: absolute;
  bottom: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  color: var(--c-gold);
  opacity: 0.8;
  animation: pulse-prompt 2s infinite ease-in-out;
}

.prompt-text {
  font-family: var(--font-title);
  font-size: 0.9rem;
  letter-spacing: 4px;
}

.prompt-arrow {
  font-size: 1.2rem;
  animation: bounce-arrow 2s infinite ease-in-out;
}

/* 呼吸灯动画 */
@keyframes pulse-prompt {
  0%, 100% { opacity: 0; text-shadow: none; }  /* 完全透明 */
  40% { opacity: 1; text-shadow: 0 0 15px rgba(226, 192, 104, 0.8); }  /* 在40%时达到最亮 */
  60% { opacity: 1; text-shadow: 0 0 15px rgba(226, 192, 104, 0.8); }  /* 保持最亮到60% */
}

/* 移动端适配 */
@media (max-width: 768px) {
  .diary-book { height: 65vh; }
  .page { padding: 25px 25px 60px 25px; }
  .cover-title { font-size: 2.5rem; }
  .cover-content-wrapper { border-style: solid; border-width: 1px; }
  .chapter-content { font-size: 1rem; }
  .message-card { width: 95%; padding: 30px 20px; }
  .message-text { font-size: 1rem; }
  .control-btn { font-size: 2rem; }
  .cover-open-prompt { bottom: 20px; }
  .prompt-text { font-size: 0.8rem; }
}
</style>
