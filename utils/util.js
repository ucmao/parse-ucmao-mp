// 生成复杂原文
// 功能：生成指定长度的随机字母字符串（包含大小写字母）
function generateComplexText(length = 32) {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Vigenère密码加密函数
// 功能：使用维吉尼亚密码（Vigenère cipher）对文本进行加密
function vigenereEncrypt(text, key) {
  let encrypted = '';
  let keyIndex = 0;
  for (let i = 0; i < text.length; i++) {
      let char = text.charAt(i);
      if (char.match(/[a-zA-Z]/)) {
          let shift = char === char.toUpperCase() ? 65 : 97;
          let keyChar = key.charAt(keyIndex % key.length);
          let keyShift = keyChar.toLowerCase().charCodeAt(0) - 97;
          encrypted += String.fromCharCode((char.charCodeAt(0) - shift + keyShift) % 26 + shift);
          keyIndex++;
      } else {
          encrypted += char;
      }
  }
  return encrypted;
}

// Vigenère密码解密函数
// 功能：使用维吉尼亚密码对加密文本进行解密
function vigenereDecrypt(text, key) {
  let decrypted = '';
  let keyIndex = 0;
  for (let i = 0; i < text.length; i++) {
      let char = text.charAt(i);
      if (char.match(/[a-zA-Z]/)) {
          let shift = char === char.toUpperCase() ? 65 : 97;
          let keyChar = key.charAt(keyIndex % key.length);
          let keyShift = keyChar.toLowerCase().charCodeAt(0) - 97;
          decrypted += String.fromCharCode((char.charCodeAt(0) - shift - keyShift + 26) % 26 + shift);
          keyIndex++;
      } else {
          decrypted += char;
      }
  }
  return decrypted;
}

// 功能：将数字字符串转换为字母字符串
function timestampToLetters(timestamp) {
  const digitsToLetters = 'abcdefghijklmnopqrstuvwxyz'; // 字母表
  let result = '';
  for (let i = 0; i < timestamp.length; i++) {
      let digit = timestamp.charAt(i);
      // 确保是数字字符并在0到25之间
      if (digit >= '0' && digit <= '9') {
          let index = parseInt(digit, 10); // 将字符转换为数字
          if (index >= 0 && index < digitsToLetters.length) {
              result += digitsToLetters[index]; // 映射到字母
          } else {
              // 处理超出范围的数字，如果需要的话
              result += '?'; // 或者抛出错误
          }
      } else {
          // 处理非数字字符，如果需要的话
          result += '?'; // 或者抛出错误
      }
  }
  return result;
}

// 提取URL
// 功能：从文本中提取第一个 URL
function extractUrl(text) {
  const urlPattern = /\bhttps?:\/\/(?:www\.|[-a-zA-Z0-9.@:%_+~#=]{1,256}\.[a-zA-Z0-9()]{1,6})\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)?/g;
  const urls = text.match(urlPattern);
  return urls ? urls[0] : null;
}

// 字符串截取函数
// 功能：将字符串截取到指定长度，并可选地添加省略符号
// 参数：
//   text - 要截取的字符串
//   maxLength - 指定的最大长度
//   ellipsis - 可选的省略符号，默认为"..."
function truncateString(text, maxLength, ellipsis = "...") {
  // 输入验证
  if (!text || typeof text !== "string" || maxLength <= 0) {
    return text;
  }
  
  // 如果字符串长度不超过指定长度，直接返回
  if (text.length <= maxLength) {
    return text;
  }
  
  // 确保省略符号不会超过指定长度
  if (ellipsis.length >= maxLength) {
    return text.substring(0, maxLength);
  }
  
  // 截取字符串并添加省略符号
  return text.substring(0, maxLength - ellipsis.length) + ellipsis;
}

// 功能：更新视频排名数据中的特定视频信息
function updateRankingVideos(data, updates) {
  // 输入验证
  if (!data || typeof data !== 'object' || !updates || !updates.video_id) {
    return data;
  }
  
  // 使用 Object.values 直接遍历所有值，避免 for...in 的性能问题
  Object.values(data).forEach(value => {
    // 检查是否为数组
    if (Array.isArray(value)) {
      // 遍历数组中的每个视频对象
      value.forEach(video => {
        // 检查视频对象的 video_id 是否匹配
        if (video && video.video_id === updates.video_id) {
          // 直接更新匹配的视频对象的属性
          video.title = updates.title;
          video.cover_url = updates.cover_url;
          video.video_url = updates.video_url;
        }
      });
    }
  });
  
  // 返回更新后的 data 对象
  return data;
}

// 功能：更新可见视频列表中的特定视频信息
function updateVideoData(visibleVideos, updateData) {
  return visibleVideos.map(video => {
      if (video.video_id === updateData.video_id) {
          return {
              ...video,
              title: updateData.title,
              video_url: updateData.video_url,
              cover_url: updateData.cover_url,
              showItem: true,
          };
      }
      return video;
  });
}

// 功能：判断 URL 是否使用 HTTPS 协议
function isHttpsUrl(url) {
  // 使用正则表达式判断 URL 是否以 "https" 开头
  return /^https:\/\//i.test(url);
}

// 功能：刷新视频信息
// 参数：
// - videoId: 视频ID
// - platform: 视频平台
// - data: 当前页面数据对象
// - updateDataCallback: 更新数据的回调函数
async function refreshVideo(videoId, platform, data, updateDataCallback) {
  try {
    const request = require('./request').request;
    const { showToast } = require('./ui');
    const response = await request('/api/refresh_video', {
      method: 'POST',
      data: {
        video_id: videoId,
        platform: platform
      }
    });
    console.log('Received response:', response);
    if (response.retcode !== 200) {
      showToast('去水印失败', 'none');
    } else {
      if (response.succ) {
        const newData = response.data;
        if (newData.video_url === null) {
          showToast('无法获取到该视频信息，请稍后再试', 'none', 2000);
        } else {
          updateDataCallback(newData);
          showToast('去水印成功', 'none');
        }
      } else {
        showToast('去水印失败', 'none');
      }
    }
  } catch (error) {
    const { showToast } = require('./ui');
    showToast('去水印失败', 'none');
  }
}


export { 
  generateComplexText, 
  vigenereEncrypt, 
  vigenereDecrypt, 
  timestampToLetters,
  extractUrl,
  updateRankingVideos,
  updateVideoData,
  isHttpsUrl,
  refreshVideo,
  truncateString
};
