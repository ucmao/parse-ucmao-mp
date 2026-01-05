import { request } from '../../utils/request';
import config from '../../utils/config.js';
import { getUserInfo, getBenefitsInfo, updateStorageCurrent } from '../../utils/storage';
import { copyToClipboard } from '../../utils/clipboard';
import { downloadCoverToPhotosAlbum, downloadVideoToPhotosAlbum } from '../../utils/file';
import { updateVideoData, updateRankingVideos, refreshVideo, truncateString } from '../../utils/util';
import { showToast, showConfirmModal } from '../../utils/ui';

Page({
  data: {
    userInfo: {},
    defaultCoverUrl: '../../images/default-cover.png', // 默认封面图片路径
    periods: [
      { value: 'today', label: '今天' },
      { value: 'yesterday', label: '昨天' },
      { value: '7days', label: '近7天' },
      { value: '30days', label: '近30天' },
      // { value: 'thisMonth', label: '本月' },
      // { value: 'lastMonth', label: '上月' },
      { value: '60days', label: '近60天' },
      { value: '90days', label: '近90天' },
      { value: 'all', label: '全部' }
    ],
    currentPeriod: 'all', // 默认时间范围
    searchQuery: '', // 搜索关键词
    inputValue: '', // 搜索输入框值
    searchHistory: [],  // 获取本地所有视频数据
    filteredVideos: [], // 存储筛选后的视频数据
    visibleVideos: [], // 当前可见的视频数据
    page: 1,
    pageSize: 10,
    loading: false,
    noMoreData: false, // 是否还有更多数据的标志
    selectedVideos: [], // 存储用户选择的视频索引
    batchMode: false, // 批量模式开关
    storageLimit: 0,
    searchHistoryCount: 0
  },

  onLoad: function() {
    this.fetchRanking();
    this.updateData();
  },

  onShow: function() {
    this.updateData();
  },

  fetchRanking: function(searchQuery = '') {
    const that = this;
    request('/api/records', {
      method: 'POST',
      data: {
        searchQuery: searchQuery
      }
    })
    .then(res => {
      console.log('Server Response:', res);  // 打印完整的响应数据
      if (res.retcode === 200) {
        if (res.ranking) {
          that.setData({
            searchHistory: res.ranking,
            filteredVideos: res.ranking[that.data.currentPeriod],
            page: 1, // 重置页码
            visibleVideos: [], // 清空可见视频列表
            noMoreData: false,
            searchHistoryCount: res.ranking.length
          });
          updateStorageCurrent(res.ranking.length);
          that.loadData(); // 加载第一页数据
          console.log('Records Information:', res.ranking);  // 打印 ranking 信息
        } else {
          showToast('服务器返回数据格式不正确', 'none');
        }
      } else {
        showToast('请求失败', 'none');
      }
    })
    .catch(err => {
      showToast('请求失败', 'none');
      console.error('Request Error:', err);  // 打印详细的错误信息
    });
  },

  updateData: function() {
    const storageLimit = getBenefitsInfo().storageLimit;
    const newUserInfo = getUserInfo();
    this.setData({
      userInfo: newUserInfo,
      storageLimit: storageLimit
    });
  },

  loadMore: function() {
    if (!this.data.loading && !this.data.noMoreData) { // 确保数据没加载完时才继续加载
      this.setData({ page: this.data.page + 1 });
      this.loadData();
    }
  },

  loadData: function() {
    this.setData({ loading: true });
    // 添加一个延迟
    setTimeout(() => {
      const start = (this.data.page - 1) * this.data.pageSize;
      const end = start + this.data.pageSize;
      const pageData = this.data.filteredVideos.slice(start, end);
      if (pageData.length > 0) {
        this.setData({
          visibleVideos: this.data.visibleVideos.concat(pageData),
          loading: false
        });
      } else {
        this.setData({
          loading: false,
          noMoreData: true // 添加这个标志
        });
      }
    }, 300); // 延迟300毫秒执行
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
    this.updateData();
  },

  onSearchButtonTap: function() {
    const query = this.data.inputValue;
    this.setData({ searchQuery: query });
    this.fetchRanking(query);
    this.updateData();
  },

  switchPeriod: function(e) {
    const period = e.currentTarget.dataset.period;
    this.setData({
      currentPeriod: period,
      filteredVideos: this.data.searchHistory[period] || [],
      page: 1, // 重置页码
      visibleVideos: [], // 清空可见视频列表
      noMoreData: false
    });
    this.loadData(); // 加载第一页数据
  },

  onImageError: function(e) {
    // 处理头像图片加载失败的情况
    console.log('Image load error', e.detail.errMsg);
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

  showDeleteConfirm: function(e) {
    const index = e.currentTarget.dataset.index;
    showConfirmModal('确认删除', '您确定要删除此记录吗？', (res) => {
      if (res.confirm) {
        this.deleteHistoryItem(index);
      }
    });
  },

  deleteHistoryItem: function(index) {
    const { visibleVideos, searchHistory } = this.data;
    // 检查 index 是否在有效范围内
    if (index < 0 || index >= visibleVideos.length) {
        console.error('Index out of range');
        return;
    }
    // 获取要删除的数据的 video_id
    const videoIdToDelete = visibleVideos[index].video_id;
    // 从 visibleVideos 中删除对应的数据
    visibleVideos.splice(index, 1);
    // 遍历 searchHistory 对象，删除指定的 video_id
    for (const key in searchHistory) {
      if (Array.isArray(searchHistory[key])) {
        searchHistory[key] = searchHistory[key].filter(item => item.video_id !== videoIdToDelete);
      }
    }
    this.UploadRecord([videoIdToDelete], 'delete');
    this.setData({
        visibleVideos: visibleVideos,
        searchHistory: searchHistory,
        searchHistoryCount: this.data.searchHistoryCount - 1
    });
  },

  // 确认批量删除
  confirmBatchDelete: function() {
    if (this.data.selectedVideos.length === 0) {
      showToast('请选择要删除的记录', 'none');
      return;
    }
    showConfirmModal('确认删除', '是否确认批量删除记录？', (res) => {
      if (res.confirm) {
        this.batchDeleteHistoryItem();
      }
    });
  },

  // 批量删除历史记录项
  batchDeleteHistoryItem: function() {
    const { visibleVideos, searchHistory, selectedVideos } = this.data;
    const videoIds = selectedVideos.map(index => visibleVideos[index].video_id).filter(id => id);
    // 使用 videoIds 过滤 visibleVideos 数组
    const newVisibleVideos = visibleVideos.filter(item => !videoIds.includes(item.video_id));
    // 遍历 searchHistory 对象，删除指定的 video_id
    for (const key in searchHistory) {
      if (Array.isArray(searchHistory[key])) {
        searchHistory[key] = searchHistory[key].filter(item => !videoIds.includes(item.video_id));
      }
    }
    // 上传删除记录
    this.UploadRecord(videoIds, 'delete');
    // 更新数据
    this.setData({
      visibleVideos: newVisibleVideos,
      searchHistory: searchHistory,
      searchHistoryCount: this.data.searchHistoryCount - selectedVideos.length,
      selectedVideos: [] // 清空已选中的视频
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
    copyToClipboard(title, { title: '标题已复制' });
  },

  downloadCover: function(e) {
    const coverUrl = e.currentTarget.dataset.coverUrl;
    showConfirmModal('确认下载', '您确定要下载封面吗？', (res) => {
        if (res.confirm) {
          downloadCoverToPhotosAlbum(coverUrl, true, (error) => {
            if (error) {
              console.error('下载失败:', error);
              copyToClipboard(coverUrl, { title: '下载失败: 封面地址已复制，您可以尝试手动下载', icon: 'none' });
            }
          });
          // 查找 visibleVideos 中与 coverUrl 匹配的记录
          const videoIndex = this.data.visibleVideos.findIndex(video => video.cover_url === coverUrl);
          const videoData = this.data.visibleVideos[videoIndex];
          // 这里可以添加上传records
          // this.UploadRecord([videoData.video_id], 'update');
        }
    });
  },
  
  downloadVideo: function(e) {
    const videoUrl = e.currentTarget.dataset.videoUrl;
    const videoId = e.currentTarget.dataset.videoId;
    showConfirmModal('确认下载', '您确定要下载视频吗？', (res) => {
          if (res.confirm) {
            downloadVideoToPhotosAlbum(videoUrl, videoId)
            .then((message) => {
              showToast(message, 'success');
            })
            .catch((error) => {
              copyToClipboard(videoUrl, { title: '下载失败: 视频地址已复制，您可以尝试手动下载', 'icon': 'none' });
            });
            // 查找 visibleVideos 中与 videoUrl 匹配的记录
            const videoIndex = this.data.visibleVideos.findIndex(video => video.video_url === videoUrl);
            const videoData = this.data.visibleVideos[videoIndex];
            // 这里可以添加上传records
            // this.UploadRecord([videoData.video_id], 'update');
          }
    });
  },

  UploadRecord: function(video_ids, type) {
    request('/api/upload_record', {
      method: 'POST',
      data: {
        video_ids: video_ids,
        type: type
      }
    })
    .then(res => {
      if (res.retcode === 200) {
        console.log('Request Success:', res);
      } else {
        console.error('Request Error:', res);
      }
    })
    .catch(err => {
      console.error('Request Error:', err);
    });
  },

  toggleSelection: function(e) {
    const selectedIndices = e.detail.value.map(Number); // 将字符串数组转换为数字数组
    // 更新 selectedVideos 数组
    this.setData({
      selectedVideos: selectedIndices
    }, () => {
      console.log('更新后的 selectedVideos', this.data.selectedVideos);
      // 更新 visibleVideos 中的 checked 属性
      this.updateVisibleVideosCheckedState();
    });
  },

  toggleBatchMode: function() {
    this.setData({
      batchMode: !this.data.batchMode,
      selectedVideos: [] // 切换批量模式时清空选择
    });
  },

  selectAll: function() {
    const selectedVideos = this.data.visibleVideos.map((_, index) => index);
    this.setData({
      selectedVideos
    }, () => {
      // 更新 visibleVideos 中的 checked 属性
      this.updateVisibleVideosCheckedState();
    });
  },

  selectInverse: function() {
    const selectedVideos = this.data.visibleVideos.map((_, index) => index).filter(index => !this.data.selectedVideos.includes(index));
    this.setData({
      selectedVideos
    }, () => {
      // 更新 visibleVideos 中的 checked 属性
      this.updateVisibleVideosCheckedState();
    });
  },

  clearSelection: function() {
    this.setData({
      selectedVideos: []
    }, () => {
      // 更新 visibleVideos 中的 checked 属性
      this.updateVisibleVideosCheckedState();
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
      // this.UploadRecord(videoIds, 'update');
    }
  },

  // 批量复制标题
  batchCopyTitles: function() {
    this.batchCopy('标题', '标题', 'batchCopyTitles', (video) => {
      return video.title;
    });
  },

  // 批量复制封面链接（仅保留纯链接）
  batchCopyCoverUrls: function() {
    this.batchCopy('封面链接', '封面链接', 'batchCopyCoverUrls', (video) => {
      return video.cover_url;
    });
  },

  // 批量复制视频链接（仅保留纯链接）
  batchCopyVideoUrls: function() {
    this.batchCopy('视频链接', '视频链接', 'batchCopyVideoUrls', (video) => {
      return video.video_url;
    });
  },

  // 批量复制标题与链接
  batchCopyAll: function() {
    this.batchCopy('标题与链接', '标题与链接', 'batchCopyAllInfo', (video) => {
      return `标题：${video.title || ''}\n封面：${video.cover_url || ''}\n视频：${video.video_url || ''}`;
    });
  },

  // 更新 visibleVideos 中的 checked 属性
  updateVisibleVideosCheckedState: function() {
    const { visibleVideos, selectedVideos } = this.data;
    const updatedVisibleVideos = visibleVideos.map((video, index) => {
      return {
        ...video,
        checked: selectedVideos.includes(index)
      };
    });
    this.setData({
      visibleVideos: updatedVisibleVideos
    });
  },

  // 处理头像选择 (微信原生头像选择)
  onChooseAvatar: function(e) {
    const avatarUrl = e.detail.avatarUrl;
    this.uploadAvatar(avatarUrl);
  },

  // 上传头像到服务器
  uploadAvatar: function(tempFilePath) {
    showToast('正在上传...', 'loading');
    
    wx.uploadFile({
      url: `${config.baseURL}/api/upload_avatar`,
      filePath: tempFilePath,
      name: 'file',
      header: {
        'WX-OPEN-ID': wx.getStorageSync('openid')
      },
      success: (uploadRes) => {
        const data = JSON.parse(uploadRes.data);
        if (data.success) {
          const permanentUrl = data.url;
          const updatedUserInfo = {
            ...this.data.userInfo,
            avatarUrl: permanentUrl
          };
          
          this.setData({
            'userInfo': updatedUserInfo
          });
          wx.setStorageSync('userInfo', updatedUserInfo);
          this.syncUserInfo(updatedUserInfo);
          showToast('头像已更新');
        } else {
          showToast('上传失败: ' + data.message, 'none');
        }
      },
      fail: (err) => {
        console.error('上传头像失败:', err);
        showToast('网络错误，上传失败', 'none');
      }
    });
  },

  // 处理昵称变化 (微信原生昵称填入)
  onNicknameChange: function(e) {
    const newNickname = e.detail.value;
    if (newNickname && newNickname !== this.data.userInfo.nickName) {
      const updatedUserInfo = {
        ...this.data.userInfo,
        nickName: newNickname
      };
      this.setData({
        'userInfo': updatedUserInfo
      });
      wx.setStorageSync('userInfo', updatedUserInfo);
      this.syncUserInfo(updatedUserInfo);
      showToast('昵称已更新');
    }
  },

  showActionSheet: function() {
    // 保留原有的手动选择功能，作为备选
    wx.showActionSheet({
      itemList: ['从相册选择', '拍照'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.chooseImage('album');
        } else if (res.tapIndex === 1) {
          this.chooseImage('camera');
        }
      }
    });
  },

  chooseImage: function(sourceType) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: [sourceType],
      success: (res) => {
        this.uploadAvatar(res.tempFiles[0].tempFilePath);
      }
    });
  },

  editNickname: function() {
    showConfirmModal('更改昵称', '', (res) => {
      if (res.confirm) {
        const newNickname = res.content;
        if (newNickname) {
          const updatedUserInfo = {
            ...this.data.userInfo,
            nickName: newNickname
          };
          this.setData({
            'userInfo': updatedUserInfo
          });
          wx.setStorageSync('userInfo', updatedUserInfo);
          this.syncUserInfo(updatedUserInfo); // 同步到服务器
        } else {
          showToast('昵称不能为空', 'none');
        }
      }
    }, { editable: true, placeholderText: '新的昵称' });
  },

  syncUserInfo: function(userInfo) {
    request('/api/upload_userinfo', {
      method: 'POST',
      data: {
        userInfo: userInfo
      }
    }).then(res => {
      console.log('用户信息同步成功');
    }).catch(err => {
      console.error('用户信息同步失败:', err);
    });
  },

  navigateToQuestions: function() {
    wx.navigateTo({
      url: '/pages/questions/questions'
    });
  },

  onVideoLoadedMetadata: function(e) {
    const videoId = e.currentTarget.dataset.videoId;
    // 更新 visibleVideos 中的 showitem 状态
    const visibleVideos = this.data.visibleVideos;
    const updatedVisibleVideos = visibleVideos.map(video => {
      if (video.video_id === videoId) {
        video.showItem = true;
        video.loaded = true;  // 标记为已加载
      }
      return video;
    });
    this.setData({
      visibleVideos: updatedVisibleVideos
    });
  },

  onVideoError: function(e) {
    const videoId = e.currentTarget.dataset.videoId;
    console.error('Video error:', e.detail);
    // 更新 visibleVideos 中的 showitem 状态
    const visibleVideos = this.data.visibleVideos;
    const updatedVisibleVideos = visibleVideos.map(video => {
      if (video.video_id === videoId) {
        video.loaded = true;  // 标记为已加载
      }
      return video;
    });
    this.setData({
      visibleVideos: updatedVisibleVideos
    });
  },

  RefreshVideo: async function(e) {
    const videoId = e.currentTarget.dataset.videoId;
    const platform = e.currentTarget.dataset.platform;
    
    await refreshVideo(videoId, platform, this.data, (newData) => {
      const newvisibleVideos = updateVideoData(this.data.visibleVideos, newData);
      const newsearchHistory = updateRankingVideos(this.data.searchHistory, newData);
      this.setData({
        visibleVideos: newvisibleVideos,
        searchHistory: newsearchHistory
      });
    });
  }
});