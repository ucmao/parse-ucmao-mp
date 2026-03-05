import { request, config } from '../../utils/request';
import { getClipboardData, copyToClipboard } from '../../utils/clipboard';
import { extractUrl, truncateString } from '../../utils/util';
import { downloadCoverToPhotosAlbum, downloadVideoToPhotosAlbum } from '../../utils/file';
import { uploadScore } from '../../utils/score';
import { showToast, showConfirmModal } from '../../utils/ui';
import { updateStorageCurrent } from '../../utils/storage';

Page({
  data: {
    inputValue: '',
    showVideo: false,
    showArticle: false,
    showCoverButton: false,
    showSaveCoverButton: false,
    showSaveVideoButton: false,
    savingVideo: false,
    downloadProgress: 0,
    isButtonDisabled: false,
    isLoading: false,
    showWhiteBackground: false,
    response: {
      video_url: '',
      title: '',
      cover_url: '',
      video_id: ''
    },
    isClearMode: false,
    totalCount: 0, // 累计解析数据
    statusBarHeight: 0,
    navBarHeight: 0,
  },

  onLoad: function() {
    this.setNavSize();
    this.fetchTotalCount();
  },

  // 计算导航栏高度
  setNavSize: function() {
    const sysinfo = wx.getSystemInfoSync();
    const statusHeight = sysinfo.statusBarHeight;
    const isiOS = sysinfo.system.indexOf('iOS') > -1;
    const navHeight = isiOS ? 44 : 48; // iOS 导航栏高度 44，Android 48

    this.setData({
      statusBarHeight: statusHeight,
      navBarHeight: navHeight
    });
  },

  onShow: function() {
    // 每次进入页面刷新统计
  },

  onHide: function() {
  },

  onUnload: function() {
  },

  fetchTotalCount: function() {
    request('/api/records', {
      method: 'POST',
      data: { searchQuery: '' }
    })
    .then(res => {
      if (res.retcode === 200 && res.ranking) {
        const count = res.ranking.length || 0;
        updateStorageCurrent(count);
        this.setData({ totalCount: count });
      }
    })
    .catch(err => {
      console.error('Fetch total count error:', err);
    });
  },

  onInput: function(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  doPaste: async function() {
    try {
      const data = await getClipboardData();
      this.setData({
        inputValue: data,
        isClearMode: true
      });
      showToast('已粘贴', 'success', 1500);
    } catch (error) {
      showToast('剪贴板无内容', 'none', 1500);
    }
  },
  
  async onSubmit() {
    if (this.data.isButtonDisabled) return;
    this.setData({
      showVideo: false,
      showArticle: false,
      showCoverButton: false,
      showSaveCoverButton: false,
      showSaveVideoButton: false,
      savingVideo: false,
      downloadProgress: 0,
      isButtonDisabled: true,
      isLoading: true,
      showWhiteBackground: false,
      response: {
        video_url: '',
        title: '',
        cover_url: '',
        video_id: ''
      }
    });
    const { inputValue } = this.data;
    if (inputValue === '') {
      showToast('请输入或者粘贴分享链接', 'none', 2000);
      this.setData({
        isButtonDisabled: false,
        isLoading: false
      });
      return;
    }
    const url = extractUrl(inputValue);
    if (!url) {
      showToast('提取链接失败', 'none', 2000);
      this.setData({
        isButtonDisabled: false,
        isLoading: false
      });
      return;
    }
    try {
      console.log('Sending request with data:', { text: url });
      const response = await request('/api/parse', {
        method: 'POST',
        data: {
          text: url
        }
      });
      console.log('Received response:', response);
      if (response.retcode !== 200) {
        showToast(response.retdesc, 'none', 2000);
      } else {
        const data = response.data;
        if (data.video_id) {
          uploadScore([data.video_id], 'parse');
        }
        if (data.video_url === null && data.title === null && data.cover_url === null) {
          showToast('无法获取到该视频信息，请稍后再试', 'none', 2000);
        } else {
          this.setData({
            response: data,
            showVideo: !!data.video_url,
            showArticle: !!data.title,
            showCoverButton: !!data.cover_url,
            showSaveVideoButton: !!data.video_url,
            showSaveCoverButton: !!data.cover_url,
            showWhiteBackground: true,
            totalCount: this.data.totalCount + 1 // 解析成功后计数加1
          });
          // 同时更新本地缓存
          updateStorageCurrent(this.data.totalCount);
          console.log('data', data);
        }
      }
    } catch (error) {
      console.error('请求失败:', error);
    } finally {
      setTimeout(() => {
        this.setData({
          isButtonDisabled: false,
          isLoading: false
        });
      }, 1000);
    }
  },

  viewCoverImage() {
    const { cover_url } = this.data.response;
    wx.previewImage({
      urls: [cover_url],
      current: cover_url
    });
  },

  clearInput() {
    this.setData({
      inputValue: '',
      isClearMode: false
    });
  },

  async downloadVideo() {
    try {
      const { video_url, video_id } = this.data.response;
      uploadScore([video_id], 'videoDownload');
      const message = await downloadVideoToPhotosAlbum(video_url, video_id);
      showToast(message, 'success');
    } catch (error) {
      copyToClipboard(video_url);
      showToast('下载失败: 视频地址已复制，您可以尝试手动下载', 'none');
    }
  },

  async downloadCover() {
    try {
      const { cover_url, video_id } = this.data.response;
      downloadCoverToPhotosAlbum(cover_url, true, (error) => {
        if (error) {
          copyToClipboard(cover_url, { title: '下载失败: 封面地址已复制，您可以尝试手动下载', icon: 'none' });
        } else {
          uploadScore([video_id], 'imageDownload');
          console.log('下载成功');
        }
      });
    } catch (error) {
      showToast('出错，请重试', 'none', 2000);
    }
  },

  copyAllInfo() {
    const { title, cover_url, video_url, video_id } = this.data.response;
    let content = `标题：${title || '无'}\n`;
    content += `封面：${cover_url || '无'}\n`;
    content += `视频：${video_url || '无'}`;
    copyToClipboard(content, { title: '全部信息已复制' });
    uploadScore([video_id], 'copyAllInfo');
  },

  copyTitle() {
    const { title, video_id } = this.data.response;
    let content = `${title || '无'}`;
    copyToClipboard(content, { title: '标题已复制' });
    uploadScore([video_id], 'copyTitle');
  },

  copyCoverUrl() {
    const { cover_url, video_id } = this.data.response;
    let content = `${cover_url || '无'}`;
    copyToClipboard(content, { title: '封面链接已复制' });
    uploadScore([video_id], 'copyCoverUrl');
  },

  copyVideoUrl() {
    const { video_url, video_id } = this.data.response;
    let content = `${video_url || '无'}`;
    copyToClipboard(content, { title: '视频链接已复制' });
    uploadScore([video_id], 'copyVideoUrl');
  },

  showDisclaimer() {
    showConfirmModal("去水印说明", "MiniParse作为中立的技术服务提供者，旨在协助用户个人学习与素材赏析。我们郑重提醒用户，务必合法使用，任何因滥用而导致的侵权行为，责任将由用户自行承担。本程序不存储任何数字影像，资料版权归原平台及作者所有。MiniParse致力于与用户携手，共同维护一个健康、积极的网络环境。此声明适用于本服务的所有功能。", (res) => {}, { showCancel: false, confirmText: "确定" });
  },

  onShareAppMessage: function () {
    const { video_url, cover_url, title, video_id, heat } = this.data.response;
    if (video_url) {
      // 动态生成带播放按钮的分享封面地址
      const shareImageUrl = `${config.baseURL}/api/share/cover_image?video_id=${video_id}&cover_url=${encodeURIComponent(cover_url)}`;
      
      return {
        title: truncateString(title, 35) || '这个视频太赞了，快来看看！',
        path: `/pages/videoPlayer/videoPlayer?url=${encodeURIComponent(video_url)}&`+
              `cover=${encodeURIComponent(cover_url)}&`+
              `title=${encodeURIComponent(truncateString(title, 80, ''))}&`+
              `videoid=${encodeURIComponent(video_id)}&`+
              `heat=${encodeURIComponent(heat || 0)}&`+
              `fromShare=true`,
        imageUrl: shareImageUrl,
        success: (res) => {
          uploadScore([video_id], 'shareFriend');
          console.log('分享成功', res);
        },
        fail: (err) => {
          console.error('分享失败', err);
        }
      };
    } else {
      return {
        title: '发现一个超好用的去水印神器，免费还快！',
        path: '/pages/index/index',
        success: (res) => {
          console.log('右上角分享成功', res);
        },
        fail: (err) => {
          console.error('右上角分享失败', err);
        }
      };
    }
  },

  onShareTimeline: function () {
    const { video_url, cover_url, title, video_id, heat } = this.data.response;
    if (video_url) {
      // 动态生成带播放按钮的分享封面地址
      const shareImageUrl = `${config.baseURL}/api/share/cover_image?video_id=${video_id}&cover_url=${encodeURIComponent(cover_url)}`;

      return {
        title: '分享一个我一直在用的去水印神器',
        query: `/pages/videoPlayer/videoPlayer?url=${encodeURIComponent(video_url)}&`+
               `cover=${encodeURIComponent(cover_url)}&`+
               `title=${encodeURIComponent(truncateString(title, 80, ''))}&`+
               `videoid=${encodeURIComponent(video_id)}&`+
               `heat=${encodeURIComponent(heat || 0)}&`+
               `fromShare=true`,
        imageUrl: shareImageUrl,
        success: (res) => {
          uploadScore([video_id], 'shareTimeline');
          console.log('分享成功', res);
        },
        fail: function (err) {
          console.error('分享失败', err);
        }
      };
    } else {
      return {
        title: '分享一个我一直在用的去水印神器',
        query: '/pages/index/index',
        success: (res) => {
          console.log('分享成功', res);
        },
        fail: function (err) {
          console.error('分享失败', err);
        }
      };
    }
  },
  
  navigateToQuestions: function() {
    wx.navigateTo({
      url: '/pages/questions/questions'
    });
  },

});
