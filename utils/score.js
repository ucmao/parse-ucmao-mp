// utils/score.js
// 引入已封装的 request 工具（路径需与实际项目一致）
import { request } from './request';

/**
 * 视频行为分数上报函数
 * @param {Array} videoIds - 视频ID数组（如 [123]）
 * @param {string} actionType - 行为类型（如 'validPlay'、'shareVideo'、'videoDownload'）
 * @returns {Promise} - 请求Promise，便于外部处理成功/失败
 */
export function uploadScore(videoIds, actionType) {
  // 发起POST请求，复用现有request工具
  return request('/api/upload_score', {
    method: 'POST',
    data: {
      video_ids: videoIds, // 接口要求的参数名（与原逻辑一致）
      action_type: actionType // 接口要求的参数名
    }
  })
  .then(res => {
    // 统一打印成功日志（也可去掉，让外部自行处理）
    if (res.retcode === 200) {
      console.log('Score Upload Success:', res);
    } else {
      console.error('Score Upload Error (Response Error):', res);
    }
    return res; // 将响应返回给外部，便于页面做后续处理（如弹窗）
  })
  .catch(err => {
    // 统一捕获请求异常（如网络错误）
    console.error('Score Upload Error (Request Failed):', err);
    return Promise.reject(err); // 抛出错误，让外部可通过 catch 捕获
  });
}