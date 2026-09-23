import { createStore } from './store';

export { useStore } from './store';

// 文献（领域数据）：review 为「复盘要点」，只有已读文献在排入讨论时必须填写。
const seedPapers = [
  {
    id: 1,
    title: 'The Extended Mind',
    authors: 'Clark, A. & Chalmers, D.',
    year: 1998,
    venue: 'Analysis',
    tags: ['具身认知', '经典'],
    abstract: '本文提出心智延展论：当外部环境稳定地承担认知功能时，心智边界可以超越头脑与身体。',
    status: '阅读中',
    cite: 'Clark, A. & Chalmers, D. (1998). The Extended Mind. Analysis.',
    notes: '',
    review: '',
  },
  {
    id: 2,
    title: 'Situated Learning: Legitimate Peripheral Participation',
    authors: 'Lave, J. & Wenger, E.',
    year: 1991,
    venue: 'Cambridge University Press',
    tags: ['学习科学', '社会'],
    abstract: '学习发生在真实情境的参与过程中，知识与共同体实践不可分割。',
    status: '待读',
    cite: 'Lave, J. & Wenger, E. (1991). Situated Learning.',
    notes: '',
    review: '',
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
    cite: 'Miller, S. (2022). Designing with Data.',
    notes: '',
    review: '关键洞察：定性编码与设计原型应快速迭代；可复用访谈编码表，但样本量偏小，结论外推需谨慎。',
  },
  {
    id: 4,
    title: 'Steps to an Ecology of Mind',
    authors: 'Bateson, G.',
    year: 1972,
    venue: 'University of Chicago Press',
    tags: ['系统思维', '经典'],
    abstract: '贝特森论文集，以信息与反馈重新定义心智，奠定系统取向的认知与传播研究基础。',
    status: '已读',
    cite: 'Bateson, G. (1972). Steps to an Ecology of Mind.',
    notes: '',
    review: '关键洞察：「产生差异的差异」是信息的核心；双重束缚理论可用于分析协作沟通中的反馈失灵。',
  },
  {
    id: 5,
    title: 'The Cultural Nature of Human Development',
    authors: 'Rogoff, B.',
    year: 2003,
    venue: 'Oxford University Press',
    tags: ['发展心理', '文化'],
    abstract: '从文化共同体的视角重述人类发展，强调引导式参与与代代相传的实践安排。',
    status: '待读',
    cite: 'Rogoff, B. (2003). The Cultural Nature of Human Development.',
    notes: '',
    review: '',
  },
  {
    id: 6,
    title: 'Communities of Practice: Learning, Meaning, and Identity',
    authors: 'Wenger, E.',
    year: 1998,
    venue: 'Cambridge University Press',
    tags: ['学习科学', '共同体'],
    abstract: '系统阐述实践共同体理论：学习是在共同事业中协商意义与建构身份的过程。',
    status: '待读',
    cite: 'Wenger, E. (1998). Communities of Practice.',
    notes: '',
    review: '',
  },
  {
    id: 7,
    title: 'Research is Ceremony: Indigenous Research Methods',
    authors: 'Wilson, S.',
    year: 2008,
    venue: 'Fernwood Publishing',
    tags: ['方法论', '研究伦理'],
    abstract: '以关系性本体论讨论原住民研究方法，强调研究即仪式、研究者与研究对象之间的责任关系。',
    status: '已读',
    cite: 'Wilson, S. (2008). Research is Ceremony.',
    notes: '',
    review: '关键洞察：方法论不仅是技术选择，更是伦理立场；田野章节可作为课题组研究伦理讨论材料。',
  },
  {
    id: 8,
    title: 'Tiny Habits: Why Everything Starts Small',
    authors: 'Fogg, B. J.',
    year: 2019,
    venue: 'Houghton Mifflin Harcourt',
    tags: ['行为设计'],
    abstract: '福格行为模型（B=MAP）：行为发生于动机、能力与提示三者交汇处，小习惯可撬动持久改变。',
    status: '待读',
    cite: 'Fogg, B. J. (2019). Tiny Habits.',
    notes: '',
    review: '',
  },
];

// 兼容旧版本（没有 review 字段的记录）
const normalize = (items) =>
  items.map((p) => ({
    notes: '',
    review: '',
    tags: [],
    ...p,
  }));

export const paperStore = createStore(
  'research-library',
  () => seedPapers,
  normalize,
);

export const addPaper = (paper) =>
  paperStore.setState((items) => [
    ...items,
    { ...paper, id: Date.now(), status: '待读', notes: '', review: '' },
  ]);

export const updatePaper = (id, patch) =>
  paperStore.setState((items) =>
    items.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  );
