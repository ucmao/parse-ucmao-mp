Page({
  data: {
    questions: [
      {
        id: 1,
        question: "解析视频时提示失败，怎么解决？",
        answer: "常见原因有2种：① 同时使用的人太多，服务器临时繁忙，建议等1-2分钟再试；② 链接失效或平台限制，这种情况可以直接去「热门榜单」搜索同类素材，无需解析。",
        showAnswer: false
      },
      {
        id: 2,
        question: "支持哪些平台的视频去水印？",
        answer: "目前支持抖音、快手、小红书、哔哩哔哩、微信视频号、梨视频、皮皮虾、好看视频等主流平台。如果遇到不支持的链接，可以联系客服反馈哦～",
        showAnswer: false
      },
      {
        id: 3,
        question: "为什么有些视频下载速度特别慢？",
        answer: "部分平台的视频格式特殊，小程序无法直接下载，需要通过服务器中转缓存，所以速度会稍慢（尤其是大文件）。建议在网络稳定的环境下下载，避免中途中断。",
        showAnswer: false
      },
      {
        id: 4,
        question: "下载后的视频打不开/无法播放，怎么办？",
        answer: "大概率是2个问题：① 下载时网络波动导致文件损坏，重新下载一次即可；② 视频格式不兼容（如某些特殊编码），可以用手机自带的「视频播放器」或第三方播放器尝试打开。",
        showAnswer: false
      },
      {
        id: 5,
        question: "下载过程中卡住不动了，怎么处理？",
        answer: "主要是网络不稳定导致的。先退出当前下载（关闭小程序再重新打开），检查Wi-Fi/5G信号后，重新尝试下载；如果多次卡住，建议换个时间再操作（避开网络高峰期）。",
        showAnswer: false
      },
      {
        id: 6,
        question: "批量下载时卡住，是什么原因？",
        answer: "通常是批量列表里有「超大文件」（比如超过200MB的长视频），超出了小程序的临时存储限制。可以先退出批量下载，单独下载那个大文件，剩下的再批量操作。",
        showAnswer: false
      },
      {
        id: 7,
        question: "在哪里能看到已经下载/解析过的视频？",
        answer: "打开优创猫首页，点击底部「我的」进入个人中心，在「历史记录」里就能看到所有解析、下载过的视频，还能按时间排序查找。",
        showAnswer: false
      },
      {
        id: 8,
        question: "不想要的历史记录，怎么删除？",
        answer: "有2种方式：① 长按单条记录，会弹出「删除」按钮，点击即可删除；② 进入「历史记录」页面，点击右上角「批量删除」，勾选要删除的记录后确认即可。",
        showAnswer: false
      },
      {
        id: 9,
        question: "历史记录存满了会怎么样？",
        answer: "系统会自动保留最新的100条记录（超出上限后，最早的记录会被自动覆盖）。如果有重要记录，建议及时导出或收藏，避免被覆盖。",
        showAnswer: false
      },
      {
        id: 10,
        question: "小程序运行卡顿、界面错乱，怎么解决？",
        answer: "简单2步就能修复：① 关闭优创猫小程序（在微信「最近使用的小程序」里删掉）；② 重新打开优创猫，大部分卡顿/错乱问题都会解决。如果还不行，建议重启微信再试。",
        showAnswer: false
      },
      {
        id: 11,
        question: "遇到问题想联系客服，怎么找？",
        answer: "两种方式都能联系到客服：① 本页面底部点击「联系客服」按钮，直接跳转到微信客服对话；② 个人中心页面，找到「帮助与反馈」，里面也有客服入口，客服会及时回复哦～",
        showAnswer: false
      }
    ]
  },

  toggleAnswer: function(e) {
    const index = e.currentTarget.dataset.index;
    const questions = this.data.questions;
    questions[index].showAnswer = !questions[index].showAnswer;
    this.setData({
      questions: questions
    });
  },

  handleContact: function(e) {
    console.log('用户点击了联系客服按钮', e.detail);
    // 在这里可以处理用户点击客服按钮后的逻辑
  }

});