import { generateComplexText, vigenereEncrypt, timestampToLetters } from './util.js';
import { generateTimestamp } from './time.js';

// 配置项
const config = {
  baseURL: 'https://parse.ucmao.cn',
  timeout: 15000, // 请求超时时间（毫秒）
  maxRetries: 1   // 最大重试次数
};

// 生成请求头信息
function generateHeaders() {
  const timestamp = generateTimestamp().toString();
  const originalText = generateComplexText();
  const key = timestampToLetters(timestamp);
  const encryptedText = vigenereEncrypt(originalText, key);
  const openid = wx.getStorageSync('openid') || '';
  
  return {
    'X-Timestamp': timestamp,
    'X-GCLT-Text': originalText,
    'X-EGCT-Text': encryptedText,
    'WX-OPEN-ID': openid
  };
}

// 请求工具函数
function request(url, options = {}, retryCount = 0) {
  return new Promise((resolve, reject) => {
    // 处理URL，如果不是完整URL则添加baseURL
    const fullUrl = url.startsWith('http') ? url : `${config.baseURL}${url}`;
    
    // 合并请求头
    const requestHeaders = {
      ...generateHeaders(),
      ...options.header
    };
    
    // 构建请求参数
    const requestOptions = {
      ...options,
      header: requestHeaders
    };
    
    // 超时处理
    const timeoutId = setTimeout(() => {
      reject(new Error('请求超时'));
    }, options.timeout || config.timeout);
    
    // 创建请求任务
    const requestTask = wx.request({
      url: fullUrl,
      ...requestOptions,
      success(res) {
        clearTimeout(timeoutId);
        
        // 统一处理HTTP状态码
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 处理业务状态码
          if (res.data && res.data.retcode === 200) {
            resolve(res.data);
          } else {
            const errorMsg = res.data && res.data.msg || '请求失败';
            reject(new Error(errorMsg));
          }
        } else {
          reject(new Error(`HTTP错误: ${res.statusCode}`));
        }
      },
      fail(err) {
        clearTimeout(timeoutId);
        
        // 重试逻辑
        if (retryCount < config.maxRetries) {
          console.log(`请求失败，正在重试... (${retryCount + 1}/${config.maxRetries})`);
          resolve(request(url, options, retryCount + 1));
        } else {
          reject(new Error(`请求失败: ${err.errMsg || '未知错误'}`));
        }
      },
      complete() {
        clearTimeout(timeoutId);
      }
    });
    
    // 保存请求任务，允许外部取消
    requestTask.cancel = () => {
      clearTimeout(timeoutId);
      requestTask.abort();
      reject(new Error('请求已取消'));
    };
  });
};

// 导出请求工具和配置
export { request, config };
