/**
 * 小程序全局配置文件
 */
const config = {
  // 后端服务器基础域名 (部署时请替换为您自己的域名)
  // 注意：必须以 https:// 开头，且末尾不要带斜杠 /
  baseURL: 'https://parse.ucmao.cn',
  
  // 请求超时时间（毫秒）
  timeout: 15000,
  
  // 最大重试次数
  maxRetries: 1
};

export default config;

