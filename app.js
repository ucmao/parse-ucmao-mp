import config from './utils/config.js';

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
          url: `${config.baseURL}/api/login`, 
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
        const { openid, nickname, avatar_url } = response.data;
        wx.setStorageSync('openid', openid);
        
        // 如果后端有昵称和头像，同步到本地缓存
        if (nickname || avatar_url) {
          const userInfo = wx.getStorageSync('userInfo') || {};
          if (nickname) userInfo.nickName = nickname;
          if (avatar_url) userInfo.avatarUrl = avatar_url;
          wx.setStorageSync('userInfo', userInfo);
        }
        
        return openid;
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
