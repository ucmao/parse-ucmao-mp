// 生成时间戳
// 功能：获取当前时间的 毫秒级时间戳（从 1970 年 1 月 1 日 00:00:00 UTC 到当前时间的毫秒数），并转为字符串返回。
function generateTimestamp() {
  return Date.now().toString();
}

// 获取当前北京时间
// 功能：获取当前 Asia/Shanghai 时区（即北京时间，UTC+8） 的格式化时间，格式为 年/月/日 时:分:秒（如 2024/06/10 14:30:59）。
function getBeijingTime() {
  const date = new Date();
  const options = { 
    timeZone: 'Asia/Shanghai', 
    hour12: false, 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  };
  return date.toLocaleString('zh-CN', options).replace(/-/g, '/');
}

// 获取时间戳范围
// 功能：根据传入的「时间范围标识」（如 today/lastMonth），计算对应时间范围的 起始 / 结束毫秒级时间戳，用于数据筛选（如 “查询今日数据” 需传入今日 00:00 到明日 00:00 的时间戳范围）。
function getTimeRange(timeRange) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const timeRanges = {
    'today': new Date(currentDate.setHours(0, 0, 0, 0)).getTime(),
    'yesterday': new Date(currentDate.setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000).getTime(),
    'tomorrow': new Date(currentDate.setHours(0, 0, 0, 0) + 24 * 60 * 60 * 1000).getTime(),
    'thisMonth': new Date(currentYear, currentMonth, 1).getTime(),
    'lastMonthStart': new Date(currentYear, currentMonth - 1, 1).getTime(),
    'lastMonthEnd': new Date(currentYear, currentMonth, 0).getTime(),
    'all': 0 // 对于“全部”，不进行时间范围限制
  };
  let startDate = 0;
  let endDate = timeRanges.tomorrow;
  switch (timeRange) {
    case 'today':
      startDate = timeRanges.today;
      break;
    case 'yesterday':
      startDate = timeRanges.yesterday;
      endDate = timeRanges.today;
      break;
    case '3days':
    case '7days':
    case '30days':
    case '60days':
    case '90days':
    case '180days':
    case '365days':
      const days = parseInt(timeRange.replace('days', ''));
      startDate = new Date(currentDate - days * 24 * 60 * 60 * 1000).getTime();
      break;
    case 'thisMonth':
      startDate = timeRanges.thisMonth;
      break;
    case 'lastMonth':
      startDate = timeRanges.lastMonthStart;
      endDate = timeRanges.lastMonthEnd;
      break;
    case 'all':
      startDate = 0;
      break;
    default:
      startDate = 0;
      break;
  }
  return { startDate, endDate };  
}  

// 格式化日期
// 功能：将「日期字符串」（如 2024-06-10T12:30:00.000Z，常见于接口返回的 UTC 时间）转为 年-月-日 时:分 格式（如 2024-06-10 20:30）。
const formatDate = dateString => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// 格式化时间
// 功能：将「Date 对象」转为 年/月/日 时:分:秒 格式（如 2024/06/10 20:30:59），依赖 formatNumber 函数补 0。
const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

// 格式化数字
// 功能：将「单个数字」转为 2 位字符串（不足 2 位时前面补 0），是上述格式化函数的 “工具函数”。
const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

module.exports = {
  generateTimestamp,
  getBeijingTime,
  getTimeRange,
  formatDate,
  formatTime,
  formatNumber,
};
