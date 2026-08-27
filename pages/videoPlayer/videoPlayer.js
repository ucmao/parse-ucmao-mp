import { copyToClipboard } from '../../utils/clipboard';
import { downloadCoverToPhotosAlbum, downloadVideoToPhotosAlbum } from '../../utils/file';
import { truncateString } from '../../utils/util';
import config from '../../utils/config';


Page({
  data: {
    videoUrl: '', // 视频地址
    coverUrl: '', // 封面图地址
    title: '', // 标题内容
    truncatedTitle: '', // 截取后的标题内容
    videoId: '', // 视频ID
    heat: 0, // 热度
    fromShare: false, // 是否从分享进入
    showTips: false, // 是否显示播放提示
    hasRetried: false // 是否已重试过
  },

  onLoad: function (options) {
    // 获取传递的参数并解码
    const { url, cover, title, videoid, fromShare, heat} = options;
    const decodedVideoId = videoid ? decodeURIComponent(videoid) : '';
    if (url) {

      // 检查是否显示过提示
      const hasSeenTips = wx.getStorageSync('hasSeenVideoTips');
      let shouldShowTips = false;
      if (!hasSeenTips) {
        shouldShowTips = true;
        wx.setStorageSync('hasSeenVideoTips', true);
      }

      this.setData({
        videoUrl: decodeURIComponent(url),
        coverUrl: decodeURIComponent(cover),
        title: decodeURIComponent(title),
        truncatedTitle: truncateString(decodeURIComponent(title), 79, '...'),
        videoId: decodedVideoId,
        heat: heat ? decodeURIComponent(heat) : 0,
        fromShare: fromShare === 'true',
        hasParams: true,
        showTips: shouldShowTips
      });
      // 3.5秒后自动隐藏提示
      if (shouldShowTips) {
        setTimeout(() => {
          this.setData({
            showTips: false
          });
        }, 3500);
      }
    } else {
      // 如果没有参数，设置 hasParams 为 false
      this.setData({
        hasParams: false
      });
    }
  },

  closeVideo: function () {
    if (this.data.fromShare) {
      // 分享链接没有可返回的页面栈，回到当前已注册的首页。
      wx.reLaunch({
        url: '/pages/index/index'
      });
    } else {
      // 正常返回上一页
      wx.navigateBack();
    }
  },

  onFullScreenChange: function(e) {
    if (!e.detail.fullScreen) {
      wx.navigateBack();
    }
  },

  onShareAppMessage: function () {
    // 从页面数据中获取视频地址、封面图地址和标题
    const videoUrl = this.data.videoUrl;
    const coverUrl = this.data.coverUrl;
    const title = this.data.title;
    const videoId = this.data.videoId;
    
    // 返回分享配置
    return {
      title: truncateString(title, 35) || '这个视频太赞了，快来看看！',
      path: `/pages/videoPlayer/videoPlayer?url=${encodeURIComponent(videoUrl)}&` +
            `cover=${encodeURIComponent(coverUrl)}&` +
            `videoid=${encodeURIComponent(videoId)}&` +
            `title=${encodeURIComponent(title)}&` +
            `fromShare=true`,
      imageUrl: coverUrl,
      success: (res) => {
        // 转发成功时执行
      },
      fail: function (err) {
        // 转发失败时执行
        console.error('分享失败', err);
      }
    };
  },

  onShareTimeline: function () {
    // 从页面数据中获取视频地址、封面图地址和标题
    const videoUrl = this.data.videoUrl;
    const coverUrl = this.data.coverUrl;
    const title = this.data.title;
    const videoId = this.data.videoId;

    // 返回分享配置
    return {
      title: '分享一个我一直在用的去水印神器',
      query: `/pages/videoPlayer/videoPlayer?url=${encodeURIComponent(videoUrl)}&` +
             `cover=${encodeURIComponent(coverUrl)}&`+
             `videoid=${encodeURIComponent(videoId)}&`+
             `title=${encodeURIComponent(title)}&`+
             `fromShare=true`,
      imageUrl: coverUrl,
      success: (res) => {
        // 转发成功时执行
      },
      fail: function (err) {
        // 转发失败时执行
        console.error('分享失败', err);
      }
    }
  },

  onSaveTap: function(e) {
    const videoUrl = this.data.videoUrl;
    const coverUrl = this.data.coverUrl;
    const videoId = this.data.videoId;
    
    wx.showActionSheet({
      itemList: ['保存封面', '保存视频'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 保存封面
          downloadCoverToPhotosAlbum(coverUrl, true, (error) => {
            if (error) {
              console.error('下载封面失败:', error);
              copyToClipboard(coverUrl, { title: '下载失败: 封面地址已复制，您可以尝试手动下载', icon: 'none' });
            }
          });
        } else if (res.tapIndex === 1) {
          // 保存视频
          downloadVideoToPhotosAlbum(videoUrl, videoId)
            .then((message) => {
              wx.showToast({ title: message, icon: 'success' });
            })
            .catch((error) => {
              copyToClipboard(videoUrl, { title: '下载失败: 视频地址已复制，您可以尝试手动下载', icon: 'none' });
            });
        }
      },
      fail: (res) => {
        console.log(res.errMsg);
      }
    });
  },

  onCopyTitle: function() {
    const title = this.data.title;
    const videoId = this.data.videoId;
    if (!title) return;
    
    wx.showModal({
      title: '复制文案',
      content: '是否复制视频标题文案？',
      confirmText: '复制',
      success: (res) => {
        if (res.confirm) {
          copyToClipboard(title, { title: '文案已复制' });
        }
      }
    });
  },

  onVideoError: function(e) {
    console.error('Video player error:', e.detail);
    
    // 如果没有重试过，则尝试自动重试一次
    if (!this.data.hasRetried) {
      console.log('视频播放失败，正在尝试自动重试...');
      
      const originalUrl = this.data.videoUrl;
      const retryUrl = originalUrl.includes('?') 
        ? `${originalUrl}&retry=${Date.now()}` 
        : `${originalUrl}?retry=${Date.now()}`;
      
      this.setData({
        hasRetried: true,
        videoUrl: retryUrl
      });
    } else {
      // 如果重试过了还是失败
      wx.showToast({
        title: '视频加载失败，请检查网络或稍后重试',
        icon: 'none'
      });
    }
  },

});
