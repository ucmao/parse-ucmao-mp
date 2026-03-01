const DEFAULT_AVATAR_URL = '../../images/default-avatar.png';
const DEFAULT_NICKNAME = '用户昵称';

// 读取用户信息
export function getUserInfo() {
  const userInfo = wx.getStorageSync('userInfo') || {
    avatarUrl: DEFAULT_AVATAR_URL,
    nickName: DEFAULT_NICKNAME
  };
  return userInfo;
}

// 读取用户权益数据
export function getBenefitsInfo() {
  const benefits = wx.getStorageSync('benefits') || {
    storageCurrent: 0,
    storageLimit: 100,
  };
  return benefits;
}

// 更新 storageCurrent
export function updateStorageCurrent(currentCount) {
  const benefits = getBenefitsInfo();
  benefits.storageCurrent = currentCount;
  wx.setStorageSync('benefits', benefits);
  return currentCount;
}

// 更新 storageLimit
export function updateStorageLimit(currentLimit) {
  let newStorageLimit = currentLimit + 100;
  if (newStorageLimit > 10000) {
    newStorageLimit = 10000;
  }
  const benefits = getBenefitsInfo();
  benefits.storageLimit = newStorageLimit;
  wx.setStorageSync('benefits', benefits);
  return newStorageLimit;
}

// 从本地存储中获取存储条数上限
export function initializePage() {
  const benefitsInfo = getBenefitsInfo();
  return benefitsInfo.storageLimit;
}
