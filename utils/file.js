import { request } from './request';
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
// 功能：将指定视频下载并保存到用户的手机相册，返回一个 Promise 对象
function downloadVideoToPhotosAlbum(videoUrl, videoId) {
  return new Promise((resolve, reject) => {
    // 显示加载提示
    wx.showLoading({
      title: '正在下载...',
    });
    request('/api/download', {
      method: 'POST',
      data: {
        video_url: videoUrl,
        video_id: videoId
      }
    }).then(res => {
      console.info('Request Response:', res); // 打印请求响应
      if (res.retcode === 200) {
        const downloadUrl = res.data.download_url;
        console.info('downloadUrl', downloadUrl);
        // 开始下载文件
        const downloadTask = wx.downloadFile({
          url: downloadUrl,
          success: (res) => {
            console.info('Download Response:', res); // 打印下载响应
            if (res.statusCode === 200) {
              const filePath = res.tempFilePath;
              // 保存视频到相册
              wx.saveVideoToPhotosAlbum({
                filePath: filePath,
                success: () => {
                  wx.hideLoading(); // 隐藏加载提示
                  resolve('视频保存成功');
                },
                fail: (err) => {
                  wx.hideLoading(); // 隐藏加载提示
                  reject('保存到相册失败: ' + err.errMsg);
                }
              });
            } else {
              wx.hideLoading(); // 隐藏加载提示
              reject('下载失败');
            }
          },
          fail: (err) => {
            wx.hideLoading(); // 隐藏加载提示
            reject('下载失败: ' + err.errMsg);
          }
        });
        // 监听下载进度（不需要具体百分比，可以不处理）
        downloadTask.onProgressUpdate((res) => {
          // 这里可以不处理进度信息，只显示一个加载中的提示
        });
      } else {
        wx.hideLoading(); // 隐藏加载提示
        reject('请求失败');
      }
    }).catch(err => {
      wx.hideLoading(); // 隐藏加载提示
      console.info('Request Error:', err); // 打印请求错误
      reject('请求失败');
    });
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
