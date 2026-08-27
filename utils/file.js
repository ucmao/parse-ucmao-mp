import { copyToClipboard } from './clipboard';
import { showToast } from './ui';


// 下载封面并保存到相册
// 功能：将指定 URL 的图片下载并保存到用户的手机相册
function downloadCoverToPhotosAlbum(url, showLoading = false, errorCallback = () => {}) {
  if (showLoading) {
    wx.showLoading({
      title: '下载中...',
      mask: true
    });
  }
  wx.downloadFile({
    url: url,
    success: (res) => {
      const filePath = res.tempFilePath;
      wx.saveImageToPhotosAlbum({
        filePath: filePath,
        success: () => {
          if (showLoading) {
            wx.hideLoading();
          }
          wx.showToast({
            title: '封面保存成功',
            icon: 'success'
          });
        },
        fail: (err) => {
          if (showLoading) {
            wx.hideLoading();
          }
          console.error('保存封面失败:', err);
          errorCallback(err);
        }
      });
    },
    fail: (err) => {
      if (showLoading) {
        wx.hideLoading();
      }
      console.error('下载封面失败:', err);
      errorCallback(err);
    }
  });
}

// 下载视频到相册
// media-parser 的 /api/parse 已返回可直接访问的媒体地址，无需旧版
// /api/download 中转接口。
function downloadVideoToPhotosAlbum(videoUrl, videoId) {
  return new Promise((resolve, reject) => {
    if (!videoUrl || !/^https:\/\//i.test(videoUrl)) {
      reject('未获取到可下载的视频地址');
      return;
    }

    wx.showLoading({
      title: '正在下载...',
    });
    const downloadTask = wx.downloadFile({
      url: videoUrl,
      success: (res) => {
        if (res.statusCode !== 200) {
          wx.hideLoading();
          reject(`下载失败（HTTP ${res.statusCode}）`);
          return;
        }

        wx.saveVideoToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading();
            resolve('视频保存成功');
          },
          fail: (err) => {
            wx.hideLoading();
            reject('保存到相册失败: ' + err.errMsg);
          }
        });
      },
      fail: (err) => {
        wx.hideLoading();
        reject('下载失败: ' + err.errMsg);
      }
    });

    downloadTask.onProgressUpdate(() => {});
  });
}


// 公共方法：处理下载错误
// 功能：统一处理文件下载错误，打印错误信息并复制链接
function handleDownloadError(error, url, type) {
  console.error(`${type}下载失败:`, error);
  copyToClipboard(url);
        showToast(`下载失败: ${type}地址已复制，您可以尝试手动下载`, 'none');
}

export { downloadCoverToPhotosAlbum, downloadVideoToPhotosAlbum, handleDownloadError };
