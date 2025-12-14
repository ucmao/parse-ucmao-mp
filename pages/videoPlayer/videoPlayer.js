import { copyToClipboard } from '../../utils/clipboard';
import { downloadVideoToPhotosAlbum } from '../../utils/file';
import { uploadScore } from '../../utils/score';
import { truncateString } from '../../utils/util';


Page({
  data: {
    videoUrl: '', // 视频地址
    coverUrl: '', // 封面图地址
    title: '', // 标题内容
    truncatedTitle: '', // 截取后的标题内容
    videoId: '', // 视频ID
    fromShare: false // 是否从分享进入
  },

  onLoad: function (options) {
    // 获取传递的参数并解码
    const { url, cover, title, videoid, fromShare} = options;
    const decodedVideoId = videoid ? decodeURIComponent(videoid) : '';
    if (url) {
      uploadScore([decodedVideoId], 'validPlay');
      this.setData({
        videoUrl: decodeURIComponent(url),
        coverUrl: decodeURIComponent(cover),
        title: decodeURIComponent(title),
        truncatedTitle: truncateString(decodeURIComponent(title), 79, '...'),
        videoId: decodedVideoId,
        fromShare: fromShare === 'true',
        hasParams: true
      });
      console.log("videoUrl", this.data.videoUrl);
    } else {
      // 如果没有参数，设置 hasParams 为 false
      this.setData({
        hasParams: false
      });
    }
  },

  closeVideo: function () {
    if (this.data.fromShare) {
      // 在跳转前存储参数
      const app = getApp();
      app.globalData.rankingParams = {
        appCurrentPeriod: 'all',
        appSearchQuery: encodeURIComponent(this.data.title)
      };
      // 从分享进入，跳转到 ranking 页面，并传递参数
      wx.switchTab({
        url: `/pages/ranking/ranking`
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
      title: `分享视频: ${truncateString(title, 30)}`,
      path: `/pages/videoPlayer/videoPlayer?url=${encodeURIComponent(videoUrl)}&` +
            `cover=${encodeURIComponent(coverUrl)}&` +
            `videoid=${encodeURIComponent(videoId)}&` +
            `title=${encodeURIComponent(title)}&` +
            `fromShare=true`,
      imageUrl: coverUrl, // 设置封面图为 cover_url
      success: (res) => {
        // 转发成功时执行
        uploadScore([videoId], 'shareFriend');
        console.log('分享成功', res);
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
      title: `分享视频：${truncateString(title, 30)}`,
      query: `/pages/videoPlayer/videoPlayer?url=${encodeURIComponent(videoUrl)}&` +
             `cover=${encodeURIComponent(coverUrl)}&`+
             `videoid=${encodeURIComponent(videoId)}&`+
             `title=${encodeURIComponent(title)}&`+
             `fromShare=true`,
      imageUrl: coverUrl, // 设置封面图为 cover_url
      success: (res) => {
        // 转发成功时执行
        uploadScore([videoId], 'shareTimeline');
        console.log('分享成功', res);
      },
      fail: function (err) {
        // 转发失败时执行
        console.error('分享失败', err);
      }
    }
  },

  downloadVideo: function(e) {
    const videoUrl = this.data.videoUrl;
    const videoId = this.data.videoId;
    wx.showModal({
        title: '确认下载',
        content: '您确定要下载视频吗？',
        success: async(res) => {
          if (res.confirm) {
            downloadVideoToPhotosAlbum(videoUrl, videoId)
            .then((message) => {
              uploadScore([videoId], 'videoDownload');
              wx.showToast({ title: message,icon: 'success' });
            })
            .catch((error) => {
              copyToClipboard(videoUrl, { title: '下载失败: 视频地址已复制，您可以尝试手动下载', icon: 'none' });
            });
          }
        }
    });
  },

});