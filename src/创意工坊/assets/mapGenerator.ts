import { parseMapJson } from './package';
import type { MapEntry } from '../scenario/types';

const exampleSvg =
  '<svg viewBox="0 0 72 48" width="72" height="48" role="img" aria-label="山地城镇"><path d="M4 43h64M10 43V27l12-9 12 9v16M38 43V20l10-9 12 9v23M17 43V32h10v11M45 43V29h9v14"/><path d="M8 15l10-8 9 8M43 10l5-6 7 6"/></svg>';

function mapFieldGuide(editing: boolean): string {
  return [
    '## MapEntry 顶层字段',
    '- author：字符串，地图作者署名。新建时根据用户要求填写；修改时默认保留现值。',
    '- desc：字符串，地图整体简介，也是工坊列表与预览标题的主要来源。它不是节点名。',
    '- data：对象，键是顶层地点名，值是地图节点。不得添加 UUID、key、type、root 或 data 之外的包装层。',
    '## 地图节点字段',
    '- 节点名：由父对象的键表达，必须是稳定且可供“地图索引”引用的真实地点名；同一张地图内尽量避免重名。',
    '- 名称检索词（可选）：字符串数组，用于正文检索该地点，可放简称、别称和稳定称呼；不是标签说明文字。',
    '- 描述：必填字符串，一句概括地点的辨识特征与作用。',
    '- 详情：必填字符串数组，每项是一条可独立展示的环境、社会、危险或叙事事实；不要把整篇散文塞进单项。',
    '- 图标：必填的完整 <svg>...</svg> 字符串，不是图标名、URL、HTML 或 Markdown。每个节点应按地点语义设计图形，保持同一套视觉语言。',
    '- 方位：必填对象 {"x":[最小值,最大值],"y":[最小值,最大值],"z":[最小值,最大值]}。界面以每个区间两端的平均值作为节点坐标；x 向右、y 向下，z 表示层高/深度。坐标相对于当前父节点的子地图画布，不是全图绝对坐标。两个端点可相同；必须都是有限数字。',
    '- 子地图（可选）：以相同节点结构递归组织的对象。只在地点确有可进入的下一级空间时提供；叶节点不要写空子地图。',
    '## 层级与布局规则',
    '- 顶层宜表达一个或少量世界级入口；进入某节点后，界面只布局其直接子节点。不要为了视觉分组制造无业务含义的空层级。',
    '- 同级节点使用统一坐标尺度并留出间距；先确定父级范围和交通关系，再安排子节点。方位不是经纬度，也不直接表达连线。',
    '- 地图索引引用节点名，因此修改已有节点名属于破坏性变化。修改任务中除非用户明确要求，不要改名、删节点或迁移层级。',
    '## SVG 安全与风格规则',
    '- 只允许 svg、g、path、circle、ellipse、rect、line、polyline、polygon、title、desc 标签。',
    '- 只使用 viewBox/xmlns、fill、fill-opacity、stroke、stroke-width、stroke-linecap、stroke-linejoin、stroke-opacity、opacity、d、cx、cy、r、rx、ry、x、y、x1、y1、x2、y2、width、height、points、transform、role、aria-label 属性。xmlns 只能写在 svg 根标签，且值必须精确为 http://www.w3.org/2000/svg；不要把它转换成 Markdown 链接。',
    '- 禁止 script、style、foreignObject、image、use、事件属性、href/src、外部资源、URL、data URI、CSS 和动画。颜色只能使用安全静态色值、none、transparent 或 currentColor。',
    '- 图标采用克制、清晰的金色线稿视觉：根据地点轮廓选择横向、纵向或方形 viewBox，并用多条简洁几何轮廓表达建筑、地貌或空间结构；不要把所有地点压成同一个 24×24 方形符号。',
    '- 渲染组件默认提供 fill: none、stroke: currentColor、stroke-width: 1.5，currentColor 会跟随地图节点的金色。常规线稿不要在 SVG 中重复输出这三个默认属性；只有确需填充、变色或改变局部线宽时，才在对应元素上显式设置 fill/stroke/stroke-width。',
    '- 默认继承色的图标保持统一金色；允许为确有语义需要的局部元素分别设置安全的 fill/stroke 多色，但应克制使用，不能破坏整套地图的统一感。',
    '- viewBox 的宽高同时决定未声明显示尺寸时的默认宽高与比例；地图按 1 个 viewBox 单位 = 2 CSS px 显示，因此 24×24 默认显示 48×48px、20×32 默认显示 40×64px、32×18 默认显示 64×36px。根标签也可用正数 width/height（无单位或 px）明确覆盖显示尺寸；只声明一轴时由 viewBox 比例推导另一轴。尺寸表达地点形态，不要无节制放大遮挡其他节点。',
    `- 合法图标示例：${exampleSvg}`,
    '## 设计与交付流程',
    '1. 先检查用户是否说明地图尺度、核心区域、层级、交通/空间关系、风格和用途；缺少高影响信息时只提最少问题，可多轮访谈。',
    '2. 信息充分后，先给出结构摘要，并输出一份自包含 HTML 方案稿：用 HTML/CSS/SVG 可视化层级、节点位置、名称和图标，加入图例与层级切换说明，方便用户在浏览器审阅。不得引用外部脚本、样式、字体或图片。',
    '3. HTML 仅用于外部对话中的方案审阅，不是工坊导入内容。等待用户确认或提出修改，不要在同一回复中同时给出最终 JSON。',
    '4. 用户确认方案后，最终回复只输出一个合法、完整的 MapEntry JSON 对象，不要 Markdown、代码围栏、HTML、解释或注释。',
    '5. 输出前递归检查每个节点的必填字段、方位数字、SVG 白名单、地点名唯一性和层级合理性。',
    editing
      ? '6. 这是修改任务：以当前地图为权威基线，只改动用户点名的范围；保留未点名字段、未知附加字段、节点顺序与现有内容。'
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildMapGenerationPrompt(idea: string, enhancement: string, currentMap?: MapEntry): string {
  if (!idea.trim()) throw new Error('请先填写地图创意或修改要求。');
  return [
    `你正在为“尘史使徒”创意工坊${currentMap ? '修改' : '创建'}一张地图。`,
    '这是一个可多轮对话的地图设计任务。先访谈和展示 HTML 方案，获得用户确认后再交付最终 JSON。',
    mapFieldGuide(!!currentMap),
    currentMap ? `当前完整 MapEntry JSON：\n${JSON.stringify(currentMap, null, 2)}` : '',
    `${currentMap ? '修改要求' : '地图创意'}：\n${idea.trim()}`,
    enhancement.trim() ? `提升词：\n${enhancement.trim()}` : '',
    `最小结构示意（只说明字段形状，不得照抄地点内容）：\n${JSON.stringify(
      {
        author: '作者署名',
        desc: '地图简介',
        data: {
          区域名: {
            名称检索词: ['区域别称'],
            描述: '一句地点概括',
            详情: ['一条可独立展示的地点事实'],
            图标: exampleSvg,
            方位: { x: [0, 0], y: [0, 0], z: [0, 0] },
          },
        },
      },
      null,
      2,
    )}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function parseGeneratedMap(text: string): MapEntry {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1];
  return parseMapJson(fenced ?? trimmed);
}
