// 公共方法：显示 toast 提示
// 功能：显示一个提示信息，默认无图标，持续1500毫秒
function showToast(title, icon = 'none', duration = 1500) {
  wx.showToast({ title, icon, duration });
}

// 公共方法：显示确认对话框
// 功能：显示一个确认对话框，用户确认后执行回调函数
function showConfirmModal(title, content, confirmCallback, options = {}) {
  wx.showModal({
    title,
    content,
    editable: options.editable || false,
    placeholderText: options.placeholderText || '',
    success: (res) => {
      if (confirmCallback) {
        confirmCallback(res);
      }
    }
  });
}

export { showToast, showConfirmModal };
