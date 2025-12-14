import { request } from '../../utils/request';
import { getClipboardData, copyToClipboard } from '../../utils/clipboard';
import { extractUrl, truncateString } from '../../utils/util';
import { downloadCoverToPhotosAlbum, downloadVideoToPhotosAlbum } from '../../utils/file';
import { uploadScore } from '../../utils/score';
import { showToast, showConfirmModal } from '../../utils/ui';

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
      video_id: '' // 确保video_id存在
    },
    isClearMode: false
  },

  onInput: function(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  clearAndPaste: async function() {
    const isClearMode = this.data.isClearMode;
    if (isClearMode) {
      this.setData({
        inputValue: '',
        isClearMode: false
      });
    } else {
      try {
        const data = await getClipboardData();
        this.setData({
          inputValue: data,
          isClearMode: true
        });
      } catch (error) {
        console.error('获取剪贴板数据失败:', error);
      }
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
            showWhiteBackground: true
          });
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
      inputValue: ''
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
    showConfirmModal("去水印说明", "优创猫作为中立的技术服务提供者，旨在协助用户个人学习与素材赏析。我们郑重提醒用户，务必合法使用，任何因滥用而导致的侵权行为，责任将由用户自行承担。本程序不存储任何数字影像，资料版权归原平台及作者所有。优创猫致力于与用户携手，共同维护一个健康、积极的网络环境。此声明适用于本服务的所有功能。", (res) => {}, { showCancel: false, confirmText: "确定" });
  },

  onShareAppMessage: function () {
    const { video_url, cover_url, title, video_id } = this.data.response;
    if (video_url) {
      return {
        title: `分享视频：${truncateString(title, 30)}`,
        path: `/pages/videoPlayer/videoPlayer?url=${encodeURIComponent(video_url)}&`+
              `cover=${encodeURIComponent(cover_url)}&`+
              `title=${encodeURIComponent(truncateString(title, 80, ''))}&`+
              `videoid=${encodeURIComponent(video_id)}&`+
              `fromShare=true`,
        imageUrl: cover_url,
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
        title: '大爆单，带货大神都在用',
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
    const { video_url, cover_url, title, video_id } = this.data.response;
    if (video_url) {
      return {
        title: `分享视频: ${truncateString(title, 30)}`,
        query: `/pages/videoPlayer/videoPlayer?url=${encodeURIComponent(video_url)}&`+
               `cover=${encodeURIComponent(cover_url)}&`+
               `title=${encodeURIComponent(truncateString(title, 80, ''))}&`+
               `videoid=${encodeURIComponent(video_id)}&`+
               `fromShare=true`,
        imageUrl: cover_url,
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
        title: '大爆单，带货大神都在用',
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
  }

});
