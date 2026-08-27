const CATEGORIES = ['全部', '功能', '使用', '技术', '其他'];

Page({
  data: {
    categories: CATEGORIES,
    currentCategory: '全部',
    searchKeyword: '',
    statusBarHeight: 0,
    navBarHeight: 44,
    questions: [
      { id: 1, category: '其他', question: '免责声明与服务公约', answer: 'mini-parse 作为中立的技术服务提供者，帮助用户学习与素材赏析。请合法使用，避免侵权；本程序不存储视频，版权归原平台及作者所有。mini-parse 致力于维护健康、积极的网络环境，适用于所有功能。', showAnswer: false },
      { id: 2, category: '功能', question: '支持哪些平台的视频去水印？', answer: '目前支持抖音、快手、小红书、哔哩哔哩、微信视频号、梨视频、皮皮虾、好看视频等主流平台。如果遇到不支持的链接，可以联系客服反馈哦～', showAnswer: false },
      { id: 3, category: '技术', question: '解析视频时提示失败，怎么解决？', answer: '常见原因有两种：① 服务临时繁忙，建议等 1-2 分钟后重试；② 链接失效或平台限制。请确认分享链接完整、仍可在原平台打开；如仍失败，可联系客服反馈链接所属平台。', showAnswer: false },
      { id: 4, category: '技术', question: '为什么有些视频下载速度特别慢？', answer: '部分平台的视频格式特殊，小程序无法直接下载，需要通过服务器中转缓存，所以速度会稍慢（尤其是大文件）。建议在网络稳定的环境下下载，避免中途中断。', showAnswer: false },
      { id: 5, category: '使用', question: '下载后的视频打不开/无法播放，怎么办？', answer: '大概率是2个问题：① 下载时网络波动导致文件损坏，重新下载一次即可；② 视频格式不兼容（如某些特殊编码），可以用手机自带的「视频播放器」或第三方播放器尝试打开。', showAnswer: false },
      { id: 6, category: '使用', question: '下载过程中卡住不动了，怎么处理？', answer: '主要是网络不稳定导致的。先退出当前下载（关闭小程序再重新打开），检查Wi-Fi/5G信号后，重新尝试下载；如果多次卡住，建议换个时间再操作（避开网络高峰期）。', showAnswer: false },
      { id: 7, category: '使用', question: '批量下载时卡住，是什么原因？', answer: '通常是批量列表里有「超大文件」（比如超过200MB的长视频），超出了小程序的临时存储限制。可以先退出批量下载，单独下载那个大文件，剩下的再批量操作。', showAnswer: false },
      { id: 8, category: '功能', question: '在哪里能看到已经下载/解析过的视频？', answer: '当前版本不保存云端或本地解析历史。解析完成后请及时保存需要的视频、封面或链接；历史记录功能保留在开发模板中，后续可按需接入本地存储或后端服务。', showAnswer: false },
      { id: 9, category: '功能', question: '不想要的历史记录，怎么删除？', answer: '当前版本不会保存解析历史，因此无需手动清理。如果后续启用本地历史记录，会在个人中心提供单条和批量删除功能。', showAnswer: false },
      { id: 10, category: '功能', question: '历史记录存满了会怎么样？', answer: '当前版本不保存历史记录，不会占用历史列表空间。若后续启用本地保存，会设置数量上限并支持手动清理。', showAnswer: false },
      { id: 11, category: '技术', question: '小程序运行卡顿、界面错乱，怎么解决？', answer: '简单2步即可修复：① 关闭 mini-parse 小程序（在微信「最近使用的小程序」里删除）；② 重新打开 mini-parse，通常可解决卡顿或错乱。如仍有问题，建议重启微信后再试。', showAnswer: false },
      { id: 12, category: '其他', question: '遇到问题想联系客服，怎么找？', answer: '点击本页面底部的「联系客服」按钮，即可进入微信客服对话。', showAnswer: false }
    ],
    topQuestions: [],
    filteredQuestions: []
  },

  onLoad(options) {
    this.setNavSize();
    this.buildTopQuestions();
    this.applyFilters();

    // 如果是通过分享链接进入，并指定了问题 ID
    if (options && options.id) {
      setTimeout(() => {
        const targetId = parseInt(options.id);
        const questions = this.data.questions;
        const index = questions.findIndex(q => q.id === targetId);
        if (index !== -1) {
          // 自动展开并滚动到该问题
          this.openQuestionByIndex({ currentTarget: { dataset: { index } } });
        }
      }, 500); // 稍微延迟以确保渲染完成
    }
  },

  setNavSize() {
    const windowInfo = wx.getWindowInfo();
    const deviceInfo = wx.getDeviceInfo();
    const statusHeight = windowInfo.statusBarHeight || 0;
    const navHeight = deviceInfo.system.indexOf('iOS') > -1 ? 44 : 48;
    this.setData({ statusBarHeight: statusHeight, navBarHeight: navHeight });
  },

  onBack() {
    wx.navigateBack();
  },

  buildTopQuestions() {
    const questions = this.data.questions;
    const top = questions.slice(0, 4).map((q, i) => ({
      id: q.id,
      question: q.question,
      index: i,
      badge: i === 0 ? '必看' : (i === 2 ? '热点' : ''),
      badgeType: i === 0 ? 'must' : (i === 2 ? 'hot' : '')
    }));
    this.setData({ topQuestions: top });
  },

  applyFilters() {
    const { questions, currentCategory, searchKeyword } = this.data;
    let list = questions;
    if (currentCategory !== '全部') {
      list = list.filter(q => q.category === currentCategory);
    }
    const kw = (searchKeyword || '').trim().toLowerCase();
    if (kw) {
      list = list.filter(q =>
        (q.question || '').toLowerCase().includes(kw) ||
        (q.answer || '').toLowerCase().includes(kw)
      );
    }
    const filteredQuestions = list.map((item, i) => {
      const idx = questions.findIndex(q => q.id === item.id);
      return {
        ...item,
        dataIndex: idx,
        displayIndex: i + 1
      };
    });
    this.setData({ filteredQuestions });
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.applyFilters();
  },

  clearSearch() {
    this.setData({ searchKeyword: '' });
    this.applyFilters();
  },

  switchCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ currentCategory: category });
    this.applyFilters();
  },

  toggleAnswer(e) {
    const dataIndex = e.currentTarget.dataset.index;
    const questions = this.data.questions;
    if (dataIndex < 0 || dataIndex >= questions.length) return;
    questions[dataIndex].showAnswer = !questions[dataIndex].showAnswer;
    this.setData({ questions }, () => this.applyFilters());
  },

  openQuestionByIndex(e) {
    const index = e.currentTarget.dataset.index;
    const questions = this.data.questions.slice();
    const targetId = questions[index].id;
    questions[index].showAnswer = true;
    // 先切到「全部」并清空搜索，保证目标问题在列表中，再锚点滚动
    this.setData({
      currentCategory: '全部',
      searchKeyword: '',
      questions
    }, () => {
      this.applyFilters();
      // 等列表渲染后再滚动到锚点
      setTimeout(() => this.scrollToQuestion(targetId), 80);
    });
  },

  scrollToQuestion(questionId) {
    const query = wx.createSelectorQuery();
    query.select('#qa-' + questionId).boundingClientRect();
    query.selectViewport().scrollOffset();
    query.exec((res) => {
      if (res[0] && res[1]) {
        const scrollTop = res[0].top + res[1].scrollTop - 60;
        wx.pageScrollTo({
          scrollTop: Math.max(0, scrollTop),
          duration: 300
        });
      }
    });
  },

  handleContact(e) {
  },

  onShareAppMessage() {
    return {
      title: 'mini-parse 使用指南：解决解析失败、保存失败等常见问题',
      path: '/pages/questions/questions',
      success: (res) => { },
      fail: (err) => console.error('分享失败', err)
    };
  },

  onShareTimeline() {
    return {
      title: 'mini-parse：热门问题与解答手册',
      query: '',
      success: (res) => { },
      fail: (err) => console.error('分享失败', err)
    };
  }
});
