// clipboard.js

/**
 * 获取剪贴板数据
 * @returns {Promise<string>} 剪贴板内容
 */
function getClipboardData() {
  return new Promise((resolve, reject) => {
    wx.getClipboardData({
      success: function(res) {
        if (res.data) {
          resolve(res.data);
        } else {
          wx.showToast({
            title: '剪切板无内容',
            icon: 'none',
            duration: 2000
          });
          reject(new Error('剪切板无内容'));
        }
      },
      fail: function(err) {
        wx.showToast({
          title: '无法获取剪切板数据',
          icon: 'none',
          duration: 2000
        });
        reject(err);
      }
    });
  });
}

/**
 * 复制文本到剪贴板
 * @param {string} data 要复制的文本内容
 * @param {object} options 可选参数
 * @param {string} options.title 复制成功后的提示文字，不传则不显示自定义提示
 * @param {string} options.icon 提示图标，默认'success'
 * @param {number} options.duration 提示时长，默认2000ms
 * @returns {Promise<void>}
 */
function copyToClipboard(data, options = {}) {
  return new Promise((resolve, reject) => {
    // 先隐藏可能存在的toast
    wx.hideToast();
    // 使用setTimeout确保hideToast生效
    setTimeout(() => {
      wx.setClipboardData({
        data: data,
        success: () => {
          // 如果传入了自定义提示信息，则显示自定义提示
          if (options.title) {
            // 隐藏微信默认的"内容已复制"提示
            wx.hideToast();
            // 显示自定义提示
            wx.showToast({
              title: options.title,
              icon: options.icon || 'none',
              duration: options.duration || 2000
            });
          }
          resolve();
        },
        fail: (err) => {
          console.error('复制失败:', err);
          reject(err);
        }
      });
    }, 100);
  });
}

export { getClipboardData, copyToClipboard };
