// 领域数据层：种子文献、初始场次、初始成员。纯数据，不包含任何规则或 UI 逻辑。

export const seedPapers = [
  {
    id: 1,
    title: 'The Extended Mind',
    authors: 'Clark, A. & Chalmers, D.',
    year: 1998,
    venue: 'Analysis',
    tags: ['具身认知', '经典'],
    abstract: '本文提出心智延展论：当外部环境稳定地承担认知功能时，心智边界可以超越头脑与身体。',
    status: '已读',
    review: '复盘要点：外部工具承担认知功能的两个判据——可随时调用、使用时默认认可；报告时与认知整合的证据链要分开讲。',
    cite: 'Clark, A. & Chalmers, D. (1998). The Extended Mind. Analysis.'
  },
  {
    id: 2,
    title: 'Situated Learning',
    authors: 'Lave, J. & Wenger, E.',
    year: 1991,
    venue: 'Cambridge University Press',
    tags: ['学习科学', '社会'],
    abstract: '学习发生在真实情境的参与过程中，知识与共同体实践不可分割。',
    status: '已读',
    review: '复盘要点：合法边缘参与是讨论主线；对照我们组新成员上手流程，识别缺少"脚手架"的环节。',
    cite: 'Lave, J. & Wenger, E. (1991). Situated Learning.'
  },
  {
    id: 3,
    title: 'Designing with Data',
    authors: 'Miller, S.',
    year: 2022,
    venue: 'MIT Press',
    tags: ['设计研究', '方法'],
    abstract: '一套面向设计师的数据研究方法，讨论如何把定性洞察转化为可行动的设计决策。',
    status: '已读',
    review: '复盘要点：定性洞察→设计决策的转化表可以直接复用；注意书中第 4 章样本量论证偏弱，讨论时要指出来。',
    cite: 'Miller, S. (2022). Designing with Data.'
  },
  {
    id: 4,
    title: 'Cognitive Load Theory and Its Applications',
    authors: 'Sweller, J. & Paas, F.',
    year: 2023,
    venue: 'Educational Psychology Review',
    tags: ['学习科学', '综述'],
    abstract: '系统回顾内在、外在与相关认知负荷的测量方法，及在教学设计中的最新应用。',
    status: '已读',
    review: '',
    cite: 'Sweller, J. & Paas, F. (2023). Cognitive Load Theory and Its Applications. Educational Psychology Review.'
  },
  {
    id: 5,
    title: 'Affordance Conventions in Interface Design',
    authors: 'Chen, Y.',
    year: 2024,
    venue: 'CHI Conference on Human Factors',
    tags: ['人机交互'],
    abstract: '通过对照实验考察惯例化可供性对新手用户操作路径的影响，并提出一个设计检查清单。',
    status: '待读',
    review: '',
    cite: 'Chen, Y. (2024). Affordance Conventions in Interface Design. CHI.'
  },
  {
    id: 6,
    title: 'Distributed Cognition Revisited',
    authors: 'Hollan, J., Pares, E. & Su, Z.',
    year: 2021,
    venue: 'Cognitive Science',
    tags: ['具身认知', '综述'],
    abstract: '重访分布式认知框架，梳理其在团队协作与座舱研究中的方法论遗产。',
    status: '待读',
    review: '',
    cite: 'Hollan, J., Pares, E. & Su, Z. (2021). Distributed Cognition Revisited. Cognitive Science.'
  },
  {
    id: 7,
    title: 'Transfer Learning for Qualitative Coding',
    authors: 'Okafor, N. & Reyes, M.',
    year: 2024,
    venue: 'Journal of Computational Social Science',
    tags: ['方法', '机器学习'],
    abstract: '评估预训练语言模型在扎根理论编码流程中的辅助边界，报告人机一致性与失效案例。',
    status: '待读',
    review: '',
    cite: 'Okafor, N. & Reyes, M. (2024). Transfer Learning for Qualitative Coding. JCSS.'
  },
  {
    id: 8,
    title: 'The Reflective Practitioner',
    authors: 'Schön, D. A.',
    year: 1983,
    venue: 'Basic Books',
    tags: ['经典', '实践'],
    abstract: '提出"行动中反思"概念，分析专业实践者如何在不确定情境下与情境对话。',
    status: '待读',
    review: '',
    cite: 'Schön, D. A. (1983). The Reflective Practitioner. Basic Books.'
  },
  {
    id: 9,
    title: 'Communities of Practice in Research Groups',
    authors: 'Tanaka, H.',
    year: 2020,
    venue: 'Studies in Higher Education',
    tags: ['学习科学', '社会'],
    abstract: '对十二个研究组的追踪研究，比较讨论班结构对知识共享与成员留存的影响。',
    status: '阅读中',
    review: '',
    cite: 'Tanaka, H. (2020). Communities of Practice in Research Groups. Studies in Higher Education.'
  }
];

export const seedMembers = ['陈牧', '林知远', '苏晴', 'Alex Rivera'];

// 生成一条已经确认的历史场次（十天前），用于演示冻结与冷却规则。
function shiftLocal(daysAgo, hour, minute) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(hour)}:${p(minute)}`;
}

export function buildSeedSessions() {
  const start = shiftLocal(10, 14, 0);
  const end = shiftLocal(10, 16, 0);
  return [
    {
      id: 's-seed-1',
      title: '第 1 期：经典理论回顾',
      host: '陈牧',
      start,
      end,
      paperIds: [1, 2, 3],
      confirmed: true,
      frozenAt: start,
      reviewDrafts: {},
      reason: '',
      history: []
    }
  ];
}
