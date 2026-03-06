import { request } from '../../utils/request';
import { copyToClipboard } from '../../utils/clipboard';
import { updateRankingVideos, updateVideoData, refreshVideo, truncateString } from '../../utils/util';
import { uploadScore } from '../../utils/score';
import { showToast, showConfirmModal } from '../../utils/ui';

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 40,
    coverImage: '../../images/cover-image.jpg',
    savingVideo: false,
    downloadProgress: 0,
    response: {
      video_url: '',
      title: ''
    },
    defaultCoverUrl: '../../images/default-cover.png',
    periods: [
      // { value: 'today', label: '今天' },
      // { value: 'yesterday', label: '昨天' },
      { value: '7days', label: '近7天' },
      { value: '30days', label: '近30天' },
      // { value: 'thisMonth', label: '本月' },
      // { value: 'lastMonth', label: '上月' },
      // { value: '60days', label: '近60天' },
      { value: '90days', label: '近90天' },
      { value: '180days', label: '近半年' },
      { value: '365days', label: '近一年' },
      { value: 'all', label: '全部' }
    ],
    currentPeriod: '7days',
    searchQuery: '',
    inputValue: '',
    rankingData: {},  // 存储所有时间段的排名数据
    visibleVideos: [], // 当前可见的视频数据
    page: 1,
    pageSize: 10,
    loading: false,
    noMoreData: false, // 是否还有更多数据的标志
    noMoreDataText: '没有更多数据了', // 到底时的提示文案（按是否满100条区分）
    maintenanceMode: false, // 全站隐身/维护时为 true，用于空状态文案区分
    selectedVideos: [], // 存储用户选择的视频索引
    batchMode: false, // 批量模式开关
    listHeight: 500 // 列表可视高度，onLoad 时按窗口动态计算
  },

  onLoad: function(options) {
    const windowInfo = wx.getWindowInfo();
    this.setData({ statusBarHeight: windowInfo.statusBarHeight || 0 });
    
    // 动态计算列表高度：等待渲染完成后测量顶部高度
    wx.createSelectorQuery().select('.top-wrap').boundingClientRect(rect => {
      if (rect) {
        const windowHeight = windowInfo.windowHeight || 600;
        // 列表高度 = 总高度 - 顶部测量高度 - 容器外间距(20) - 底部安全距离(20)
        const listHeight = windowHeight - rect.height - 40;
        this.setData({ listHeight: Math.max(300, listHeight) });
      }
    }).exec();

    const app = getApp();
    let currentPeriod = '7days';
    let searchQuery = '';
    // 优先从全局参数获取
    if (app?.globalData.rankingParams) {
      const { appCurrentPeriod, appSearchQuery } = app.globalData.rankingParams;
      if (appCurrentPeriod && appSearchQuery) {
        currentPeriod = appCurrentPeriod;
        searchQuery = appSearchQuery;
        app.globalData.rankingParams = null;
      }
    } else if (options) {
      // 从页面参数获取
      currentPeriod = options.currentperiod || currentPeriod;
      searchQuery = options.searchquery || searchQuery;
    }
    const decodedSearchQuery = searchQuery ? decodeURIComponent(searchQuery) : '';
    this.setData({
      currentPeriod,
      searchQuery: decodedSearchQuery,
      inputValue: decodedSearchQuery
    });
    this.fetchRanking(decodedSearchQuery);
  },

  fetchRanking: async function(searchQuery = '') {
    try {
      this.setData({ loading: true });
      const { currentPeriod } = this.data;
      const res = await request('/api/ranking', {
        method: 'POST',
        data: { 
          searchQuery,
          period: currentPeriod
        }
      });
      
      if (res.retcode === 200 && res.ranking) {
        this.setData({
          rankingData: res.ranking,
          maintenanceMode: !!res.ranking.maintenance_mode,
          page: 1,
          visibleVideos: [],
          noMoreData: false,
          noMoreDataText: '没有更多数据了'
        });
        this.loadData(); // 加载第一页数据
      } else {
        showToast('服务器返回数据格式不正确', 'none');
      }
    } catch (err) {
      showToast('请求失败', 'none');
      console.error('Request Error:', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  switchPeriod: function(e) {
    const period = e.currentTarget.dataset.period;
    if (period === this.data.currentPeriod) return;
    
    this.setData({
      currentPeriod: period,
      page: 1,
      visibleVideos: [],
      noMoreData: false,
      noMoreDataText: '没有更多数据了'
    });
    this.fetchRanking(this.data.searchQuery);
  },

  loadMore: function() {
    if (!this.data.loading && !this.data.noMoreData) {
      this.setData({ page: this.data.page + 1 });
      this.loadData();
    }
  },

  loadData: function() {
    // 不再使用不必要的延迟
    const { page, pageSize, rankingData, visibleVideos } = this.data;
    const allVideos = rankingData.list || [];
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageData = allVideos.slice(start, end);
    
    if (pageData.length > 0) {
      this.setData({
        visibleVideos: visibleVideos.concat(pageData),
        loading: false
      });
    } else {
      // 当前条数达到后端上限(100)时提示“前100条”，否则“没有更多数据了”
      const totalCount = allVideos.length;
      const noMoreDataText = totalCount >= 100
        ? '已展示前 100 条，更多可尝试其他关键词'
        : '没有更多数据了';
      this.setData({
        loading: false,
        noMoreData: true,
        noMoreDataText
      });
    }
  },

  onItemTap: function(e) {
    const index = e.currentTarget.dataset.index;
    if (this.data.batchMode) {
      this.toggleItemSelection(index);
    } else {
      // 检查是否有视频地址再打开，避免无效点击
      if (e.currentTarget.dataset.url) {
        this.openVideo(e);
      }
    }
  },

  toggleItemSelection: function(index) {
    let { selectedVideos } = this.data;
    const pos = selectedVideos.indexOf(index);
    if (pos > -1) {
      selectedVideos.splice(pos, 1);
    } else {
      selectedVideos.push(index);
    }
    this.setData({
      selectedVideos: selectedVideos
    }, () => {
      this.updateVisibleVideosCheckedState();
    });
  },

  openVideo: function(e) {
    const videoUrl = e.currentTarget.dataset.url;
    const title = e.currentTarget.dataset.title;
    const coverUrl = e.currentTarget.dataset.cover;
    const videoId = e.currentTarget.dataset.videoid;
    wx.navigateTo({
      url: `/pages/videoPlayer/videoPlayer?url=${encodeURIComponent(videoUrl)}&`+
           `cover=${encodeURIComponent(coverUrl)}&`+
           `videoid=${encodeURIComponent(videoId)}&`+
           `title=${encodeURIComponent(truncateString(title, 80, ''))}`
    });
  },

  copyTitle: function(e) {
    const title = e.currentTarget.dataset.title;
    const videoId = e.currentTarget.dataset.videoId;
    copyToClipboard(title, { title: '标题已复制' });
    uploadScore([videoId], 'copyTitle');
  },

  copyCoverUrl: function(e) {
    const coverUrl = e.currentTarget.dataset.coverUrl;
    const videoId = e.currentTarget.dataset.videoId;
    copyToClipboard(coverUrl, { title: '封面链接已复制喵~' });
    uploadScore([videoId], 'copyCoverUrl');
  },

  copyVideoUrl: function(e) {
    const videoUrl = e.currentTarget.dataset.videoUrl;
    const videoId = e.currentTarget.dataset.videoId;
    copyToClipboard(videoUrl, { title: '视频链接已复制喵~' });
    uploadScore([videoId], 'copyVideoUrl');
  },

  onSearchInput: function(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  onClearSearch: function() {
    this.setData({
      inputValue: '',
      searchQuery: ''
    });
    this.fetchRanking('');
  },

  onSearchButtonTap: function() {
    const searchQuery = this.data.inputValue;
    this.setData({ searchQuery });
    this.fetchRanking(searchQuery);
  },

  toggleSelection: function(e) {
    const selectedIndices = e.detail.value.map(Number);
    this.setData({
      selectedVideos: selectedIndices
    }, () => {
      this.updateVisibleVideosCheckedState();
    });
  },

  toggleBatchMode: function() {
    // 增加轻微震动反馈
    if (wx.vibrateShort) {
      wx.vibrateShort({ type: 'medium' });
    }
    
    this.setData({
      batchMode: !this.data.batchMode,
      selectedVideos: []
    });
  },

  selectAll: function() {
    const selectedVideos = this.data.visibleVideos.map((_, index) => index);
    this.setData({
      selectedVideos
    }, () => {
      this.updateVisibleVideosCheckedState();
    });
  },

  selectInverse: function() {
    const selectedVideos = this.data.visibleVideos.map((_, index) => index).filter(index => !this.data.selectedVideos.includes(index));
    this.setData({
      selectedVideos
    }, () => {
      this.updateVisibleVideosCheckedState();
    });
  },

  clearSelection: function() {
    this.setData({
      selectedVideos: []
    }, () => {
      this.updateVisibleVideosCheckedState();
    });
  },

  // 批量复制标题
  batchCopyTitles: function() {
    this.batchCopy('标题', '标题', 'batchCopyTitle', (video) => video.title || '');
  },

  // 批量复制封面链接
  batchCopyCoverUrls: function() {
    this.batchCopy('封面链接', '封面链接', 'batchCopyImageLink', (video) => video.cover_url || '');
  },

  // 批量复制视频链接
  batchCopyVideoUrls: function() {
    this.batchCopy('视频链接', '视频链接', 'batchCopyVideoLink', (video) => video.video_url || '');
  },

  // 批量复制标题与链接
  batchCopyAll: function() {
    this.batchCopy('标题与链接', '标题与链接', 'batchCopyAllInfo', (video) => {
      return `标题：${video.title || ''}\n封面：${video.cover_url || ''}\n视频：${video.video_url || ''}`;
    });
  },

  // 公共批量复制方法
  batchCopy: function(type, successMsg, scoreEvent, getContent) {
    const { visibleVideos, selectedVideos } = this.data;
    if (selectedVideos.length === 0) {
      showToast(`请选择要复制的${type}`, 'none');
      return;
    }
    const videoIds = [];
    const contents = [];
    selectedVideos.forEach(index => {
      const video = visibleVideos[index];
      if (video) {
        if (video.video_id) videoIds.push(video.video_id);
        const content = getContent(video);
        if (content) contents.push(content);
      }
    });
    if (contents.length === 0) {
      showToast(`没有可复制的${type}`, 'none');
      return;
    }
    const contentStr = contents.join('\n\n');
    copyToClipboard(contentStr, { title: `已复制${contents.length}条${successMsg}` });
    if (videoIds.length > 0) {
      uploadScore(videoIds, scoreEvent);
    }
  },
  
  // 更新 visibleVideos 中的 checked 属性
  updateVisibleVideosCheckedState: function() {
    const { visibleVideos, selectedVideos } = this.data;
    // 只更新需要改变的项，避免不必要的性能损耗
    const updatedVisibleVideos = visibleVideos.map((video, index) => ({
      ...video,
      checked: selectedVideos.includes(index)
    }));
    this.setData({ visibleVideos: updatedVisibleVideos });
  },

  onShareAppMessage: function () {
    const { searchQuery, currentPeriod } = this.data;
    const periodLabel = this.data.periods.find(p => p.value === currentPeriod)?.label || '全部';
    const title = searchQuery 
      ? `发现这些“${searchQuery}”爆款素材，去水印直接用！` 
      : `全网短视频${periodLabel}热门榜单，找灵感、找素材就用它！`;
    
    return {
      title: title,
      path: `/pages/ranking/ranking?currentperiod=${currentPeriod}&searchquery=${searchQuery}`,
      success: (res) => {},
      fail: (err) => console.error('分享失败', err)
    };
  },

  onShareTimeline: function () {
    const { searchQuery, currentPeriod } = this.data;
    const title = searchQuery 
      ? `今日份“${searchQuery}”热搜素材榜单，创作者必备。` 
      : `今日短视频爆款榜单已更新，看看大家都在下什么。`;

    return {
      title: title,
      query: `currentperiod=${currentPeriod}&searchquery=${searchQuery}`,
      success: (res) => {},
      fail: (err) => console.error('分享失败', err)
    };
  },

  showRefreshConfirm: function(event) {
    if (this.data.batchMode) return;
    const index = event.currentTarget.dataset.index;
    const video = this.data.visibleVideos[index];
    if (!video) return;

    showConfirmModal('确认重新获取', '确定要重新获取这条记录吗？', (res) => {
      if (res.confirm) {
        this.doRefreshVideo(video.video_id, video.platform);
      }
    });
  },

  // 抽离具体的刷新逻辑以便复用
  doRefreshVideo: async function(videoId, platform) {
    await refreshVideo(videoId, platform, this.data, (newData) => {
      const { rankingData, visibleVideos } = this.data;
      
      // 更新 rankingData.list
      if (rankingData && Array.isArray(rankingData.list)) {
        rankingData.list = rankingData.list.map(item => 
          item.video_id === videoId ? { ...item, ...newData } : item
        );
      }
      
      // 更新 visibleVideos，并重置加载状态，以便重新触发隐藏视频加载校验
      const newVisibleVideos = visibleVideos.map(item => 
        item.video_id === videoId ? { ...item, ...newData, loaded: false, showItem: false, hasRetried: false } : item
      );

      this.setData({
        visibleVideos: newVisibleVideos,
        rankingData: rankingData
      });
    });
  },

  RefreshVideo: async function(e) {
    const videoId = e.currentTarget.dataset.videoId;
    const platform = e.currentTarget.dataset.platform;
    
    showConfirmModal('确认重新获取', '确定要重新获取这条素材吗？', (res) => {
      if (res.confirm) {
        this.doRefreshVideo(videoId, platform);
      }
    });
  },

  onVideoLoadedMetadata: function(e) {
    const videoId = e.currentTarget.dataset.videoId;
    this.updateVideoLoadedStatus(videoId, true);
  },

  onVideoError: function(e) {
    const videoId = e.currentTarget.dataset.videoId;
    console.error('Video error:', e.detail);
    
    const { visibleVideos } = this.data;
    const index = visibleVideos.findIndex(item => item.video_id === videoId);
    
    if (index > -1) {
      const item = visibleVideos[index];
      // 如果没有重试过，则尝试自动重试一次
      if (!item.hasRetried) {
        console.log(`视频 ${videoId} 加载失败，正在尝试自动重试...`);
        
        // 标记为已重试
        const updatedVisibleVideos = [...visibleVideos];
        updatedVisibleVideos[index] = {
          ...item,
          hasRetried: true,
          // 通过在 URL 后添加随机参数来强制重新加载
          video_url: item.video_url.includes('?') 
            ? `${item.video_url}&retry=${Date.now()}` 
            : `${item.video_url}?retry=${Date.now()}`
        };
        
        this.setData({
          visibleVideos: updatedVisibleVideos
        });
        
        // 不执行 updateVideoLoadedStatus，让 video 标签继续尝试加载新 URL
        return;
      }
    }

    // 如果已经重试过或者找不到索引，则标记加载完成（但 showItem 为 false）
    this.updateVideoLoadedStatus(videoId);
  },

  onImageErrorCover: function(e) {
    // 处理封面图片加载失败的情况
    console.log('Cover image load error', e.detail.errMsg);
    // 可以设置一个默认封面图片路径
    const index = e.currentTarget.dataset.index;
    const { visibleVideos } = this.data;
    if (visibleVideos[index]) {
      visibleVideos[index].cover_url = this.data.defaultCoverUrl;
      this.setData({
        visibleVideos
      });
    }
  },

  // 更新视频加载状态
  updateVideoLoadedStatus: function(videoId, showItem = false) {
    const { visibleVideos } = this.data;
    const updatedVisibleVideos = visibleVideos.map(video => {
      if (video.video_id === videoId) {
        return {
          ...video,
          loaded: true,
          showItem: !!showItem
        };
      }
      return video;
    });
    this.setData({ visibleVideos: updatedVisibleVideos });
  }
});