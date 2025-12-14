import { request } from '../../utils/request';
import { copyToClipboard } from '../../utils/clipboard';
import { downloadCoverToPhotosAlbum, downloadVideoToPhotosAlbum, handleDownloadError } from '../../utils/file';
import { updateRankingVideos, updateVideoData, refreshVideo, truncateString } from '../../utils/util';
import { uploadScore } from '../../utils/score';
import { showToast, showConfirmModal } from '../../utils/ui';

Page({
  data: {
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
    selectedVideos: [], // 存储用户选择的视频索引
    batchMode: false // 批量模式开关
  },

  onLoad: function(options) {
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
      const res = await request('/api/ranking', {
        method: 'POST',
        data: { searchQuery }
      });
      
      console.log('Server Response:', res);
      if (res.retcode === 200 && res.ranking) {
        this.setData({
          rankingData: res.ranking,
          page: 1,
          visibleVideos: [],
          noMoreData: false
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
    this.setData({
      currentPeriod: period,
      page: 1,
      visibleVideos: [],
      noMoreData: false
    });
    this.loadData();
  },

  loadMore: function() {
    if (!this.data.loading && !this.data.noMoreData) {
      this.setData({ page: this.data.page + 1 });
      this.loadData();
    }
  },

  loadData: function() {
    this.setData({ loading: true });
    // 不再使用不必要的延迟
    const { page, pageSize, currentPeriod, rankingData, visibleVideos } = this.data;
    const filteredVideos = rankingData[currentPeriod] || [];
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageData = filteredVideos.slice(start, end);
    if (pageData.length > 0) {
      this.setData({
        visibleVideos: visibleVideos.concat(pageData),
        loading: false
      });
    } else {
      this.setData({
        loading: false,
        noMoreData: true
      });
    }
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

  downloadCover: function(e) {
    const coverUrl = e.currentTarget.dataset.coverUrl;
    const videoId = e.currentTarget.dataset.videoId;
    showConfirmModal('确认下载', '您确定要下载封面吗？', async () => {
      try {
        await downloadCoverToPhotosAlbum(coverUrl, true);
        uploadScore([videoId], 'imageDownload');
      } catch (error) {
        this.handleDownloadError(error, coverUrl, '封面');
      }
    });
  },

  downloadVideo: function(e) {
    const videoUrl = e.currentTarget.dataset.videoUrl;
    const videoId = e.currentTarget.dataset.videoId;
    showConfirmModal('确认下载', '您确定要下载视频吗？', async (res) => {
      if (res.confirm) {
          try {
            const message = await downloadVideoToPhotosAlbum(videoUrl, videoId);
            showToast(message, 'success');
            uploadScore([videoId], 'videoDownload');
          } catch (error) {
            copyToClipboard(videoUrl, { title: '下载失败: 视频地址已复制，您可以尝试手动下载', icon: 'none' });
          }
        }
    });
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
    return {
      title: `${searchQuery}素材热度很高，快试试`,
      path: `/pages/ranking/ranking?currentperiod=${currentPeriod}&searchquery=${searchQuery}`,
      success: (res) => console.log('分享成功', res),
      fail: (err) => console.error('分享失败', err)
    };
  },

  onShareTimeline: function () {
    const { searchQuery, currentPeriod } = this.data;
    return {
      title: `${searchQuery}素材热度很高，快试试`,
      query: `/pages/ranking/ranking?currentperiod=${currentPeriod}&searchquery=${searchQuery}`,
      success: (res) => console.log('分享成功', res),
      fail: (err) => console.error('分享失败', err)
    };
  },

  showHiddenConfirm: function(event) {
    const index = event.currentTarget.dataset.index;
    showConfirmModal('确认隐藏', '确定要隐藏这条记录吗？', (res) => {
      if (res.confirm) {
        this.hiddenVideo(index);
      }
    });
  },

  // 隐藏视频
  hiddenVideo: function(index) {
    const { visibleVideos, rankingData } = this.data;
    const videoId = visibleVideos[index].video_id;
    // 从可见视频列表中删除
    visibleVideos.splice(index, 1);
    // 从所有时间段数据中删除
    const updatedRankingData = { ...rankingData };
    Object.keys(updatedRankingData).forEach(key => {
      if (Array.isArray(updatedRankingData[key])) {
        updatedRankingData[key] = updatedRankingData[key].filter(item => item.video_id !== videoId);
      }
    });
    this.setData({
      visibleVideos,
      rankingData: updatedRankingData
    });
  },

  onVideoLoadedMetadata: function(e) {
    const videoId = e.currentTarget.dataset.videoId;
    this.updateVideoLoadedStatus(videoId, true);
  },

  onVideoError: function(e) {
    const videoId = e.currentTarget.dataset.videoId;
    console.error('Video error:', e.detail);
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

  RefreshVideo: async function(e) {
    const videoId = e.currentTarget.dataset.videoId;
    const platform = e.currentTarget.dataset.platform;
    
    await refreshVideo(videoId, platform, this.data, (newData) => {
      const newrankingData = updateRankingVideos(this.data.rankingData, newData);
      const newvisibleVideos = updateVideoData(this.data.visibleVideos, newData);
      this.setData({
        visibleVideos: newvisibleVideos,
        rankingData: newrankingData
      });
    });
  },

  // 更新视频加载状态
  updateVideoLoadedStatus: function(videoId, showItem = false) {
    const { visibleVideos } = this.data;
    const updatedVisibleVideos = visibleVideos.map(video => {
      if (video.video_id === videoId) {
        return {
          ...video,
          loaded: true,
          showItem: showItem ? true : video.showItem
        };
      }
      return video;
    });
    this.setData({ visibleVideos: updatedVisibleVideos });
  }
});