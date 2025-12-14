App({
  async onLaunch() {
    try {
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        // 封装wx.login为Promise
        const loginRes = await new Promise((resolve, reject) => {
          wx.login({
            success: resolve,
            fail: reject
          });
        });
        
        if (loginRes.code) {
          // 将 code 发送到服务器
          await this.login(loginRes.code);
        } else {
          console.error('登录失败！', loginRes.errMsg);
        }
      }
    } catch (error) {
      console.error('登录过程发生错误:', error);
    }
  },
  
  // 封装login方法为Promise
  login: async function (code) {
    try {
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://parse.ucmao.cn/api/login', // 替换为你的服务器地址
          method: 'POST',
          data: {
            code: code
          },
          success: resolve,
          fail: reject
        });
      });
      
      console.log('服务器响应:', response.data);
      if (response.data && response.data.openid) {
        wx.setStorageSync('openid', response.data.openid);
        return response.data.openid;
      } else {
        console.error('服务器响应中没有 openid');
        throw new Error('服务器响应中没有 openid');
      }
    } catch (err) {
      console.error('登录请求失败:', err);
      throw err;
    }
  },
  globalData: {
    userInfo: null,
    rankingParams: null
  }
});
