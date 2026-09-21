export interface ArtPrincipleIntroduction {
  title: string;
  subtitle: string;
  description: string;
  expressions: string[];
  perspective: string;
  themeClass: string;
}

export const artPrinciples: Record<string, ArtPrincipleIntroduction> = {
  灯: {
    title: '灯',
    subtitle: '照见之物，亦会改变观看者',
    description:
      '灯关乎理性、知识、光与判断。追随它的人试图让混沌变得清晰，让隐藏之物显露轮廓；但知道得越多，也越难回到无知的安宁。',
    expressions: ['观察与显影', '学习与推理', '光与净化', '判断与揭示'],
    perspective: '灯的道路不只在于获得答案，也在于承担答案照亮之后留下的阴影。',
    themeClass: 'theme-lamp',
  },
  铸: {
    title: '铸',
    subtitle: '旧形崩毁之处，新物得以诞生',
    description:
      '铸关乎火焰、力量、材料与创造。它既是熔炉中的锤击，也是摧毁旧结构的决意；在铸的眼中，世界由可以拆解、加工和重塑的事物组成。',
    expressions: ['火焰与高温', '工艺与锻造', '力量与破坏', '材料与构筑'],
    perspective: '铸不会凭空赐予完美。每一次新生，都要求某种旧形先经受改变。',
    themeClass: 'theme-forge',
  },
  刃: {
    title: '刃',
    subtitle: '胜负诞生于真正发生的交锋',
    description:
      '刃关乎斗争、征服、切割与武备。它在对抗中辨认敌我，在压力下寻找破绽，并让一次已经取得的优势变得愈发锋利。',
    expressions: ['武器与格斗', '弱点与创伤', '压制与征服', '斗志与恐惧'],
    perspective: '刃所承认的从来不是空洞的威吓，而是行动、代价以及交锋留下的事实。',
    themeClass: 'theme-blade',
  },
  冬: {
    title: '冬',
    subtitle: '万物终将沉静，而静默不会遗忘',
    description:
      '冬关乎寒冷、静默、记忆与终结。它注视事物如何停息，也保存消逝之后留下的痕迹；死亡并非它唯一的面貌，安宁、克制与铭记同样属于冬。',
    expressions: ['寒冷与静止', '记忆与遗痕', '亡者与寂静', '终结与安宁'],
    perspective: '理解冬，意味着承认并非一切都应被挽留，也并非一切离去都会彻底消失。',
    themeClass: 'theme-winter',
  },
  心: {
    title: '心',
    subtitle: '只要仍在跳动，便仍有延续的可能',
    description:
      '心关乎生命、存续、情绪与意志。它维系尚未熄灭的事物，让伤者继续呼吸，让孤立的人彼此共鸣，也让信念在人群之中传递。',
    expressions: ['生命与恢复', '耐力与维系', '情绪与共鸣', '勇气与信念'],
    perspective: '心并不保证永恒；它珍视的是面对终点时，仍选择继续存在的力量。',
    themeClass: 'theme-heart',
  },
  杯: {
    title: '杯',
    subtitle: '欲望为生命塑形，也从不轻易餍足',
    description:
      '杯关乎欲望、血肉、生育与形变。饥饿、爱欲、吸引与生存本能都会在杯中获得形体，推动身体与关系朝满足需求的方向改变。',
    expressions: ['欲望与诱惑', '血肉与感官', '生育与成长', '吞噬与融合'],
    perspective: '杯会认真回应“想要什么”，却很少替人判断这种满足最终会将自己变成什么。',
    themeClass: 'theme-cup',
  },
  蛾: {
    title: '蛾',
    subtitle: '确定的边缘，总有另一种可能振翅',
    description:
      '蛾关乎变化、未知、欺骗与偶然。它让感官与真实错位，让身份和形态失去唯一答案，也让原本稳定的结果滑向意料之外的方向。',
    expressions: ['幻觉与伪装', '变化与蜕形', '混淆与未知', '巧合与失序'],
    perspective: '蛾带来自由，也带来失去锚点的危险；变化越彻底，昨日的自我便越难追认。',
    themeClass: 'theme-moth',
  },
  启: {
    title: '启',
    subtitle: '凡是封闭之物，便可能存在入口',
    description:
      '启关乎门、钥匙、秘密与突破。它寻找阻隔两端的边界，辨认锁与裂隙，并让原本无法抵达、无法理解或无法发挥的事物重新出现通路。',
    expressions: ['门与道路', '锁与秘密', '拆解与破除', '边界与潜能'],
    perspective: '启擅长打开，却不保证门后安全；有些界限既是阻碍，也是保护。',
    themeClass: 'theme-key',
  },
};
