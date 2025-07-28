// 测试模块导入
console.log('🔍 开始测试模块导入...\n');

// 模拟微信小程序环境
global.wx = {
  getStorageSync: () => null,
  setStorageSync: () => {},
  removeStorageSync: () => {},
  clearStorageSync: () => {},
  showToast: () => {},
  showLoading: () => {},
  hideLoading: () => {},
  showModal: () => {},
  getSystemInfoSync: () => ({}),
  getNetworkType: () => {},
  canIUse: () => true,
  getUpdateManager: () => ({
    onCheckForUpdate: () => {},
    onUpdateReady: () => {},
    onUpdateFailed: () => {},
    applyUpdate: () => {}
  }),
  request: () => {},
  navigateTo: () => {},
  login: () => {},
  setClipboardData: () => {},
  previewImage: () => {},
  chooseImage: () => {},
  showActionSheet: () => {},
  vibrateShort: () => {},
  uploadFile: () => {},
  downloadFile: () => {}
};

global.getApp = () => ({
  globalData: {
    apiBaseUrl: 'http://localhost:8080/api'
  },
  request: () => Promise.resolve({ code: 200, data: {} })
});

global.getCurrentPages = () => [];

// 测试工具函数
try {
  const utils = require('./utils/index.js');
  console.log('✅ utils/index.js 导入成功');
  console.log('  - formatPrice:', typeof utils.formatPrice);
  console.log('  - showToast:', typeof utils.showToast);
  console.log('  - showLoading:', typeof utils.showLoading);
  console.log('  - hideLoading:', typeof utils.hideLoading);
  console.log('  - showModal:', typeof utils.showModal);
  console.log('  - formatTime:', typeof utils.formatTime);
  console.log('  - validatePassword:', typeof utils.validatePassword);
} catch (e) {
  console.error('❌ utils/index.js 导入失败:', e.message);
}

console.log('');

// 测试API模块
try {
  const api = require('./api/index.js');
  console.log('✅ api/index.js 导入成功');
  console.log('  - auth:', typeof api.auth);
  console.log('  - product:', typeof api.product);
  console.log('  - cart:', typeof api.cart);
  console.log('  - order:', typeof api.order);
} catch (e) {
  console.error('❌ api/index.js 导入失败:', e.message);
}

console.log('');

// 测试Store模块
try {
  const { store, storeManager } = require('./store/index.js');
  console.log('✅ store/index.js 导入成功');
  console.log('  - store:', typeof store);
  console.log('  - storeManager:', typeof storeManager);
  console.log('  - store.user:', typeof store.user);
  console.log('  - store.cart:', typeof store.cart);
  console.log('  - store.product:', typeof store.product);
  console.log('  - store.order:', typeof store.order);
  console.log('  - store.shop:', typeof store.shop);
} catch (e) {
  console.error('❌ store/index.js 导入失败:', e.message);
}

console.log('');

// 测试各个Store文件
const storeFiles = ['user', 'cart', 'product', 'order', 'shop'];
storeFiles.forEach(file => {
  try {
    const storeModule = require(`./store/${file}.js`);
    console.log(`✅ store/${file}.js 导入成功`);
  } catch (e) {
    console.error(`❌ store/${file}.js 导入失败:`, e.message);
  }
});

console.log('\n🎉 模块导入测试完成！'); 