// 认证相关API
const { post, get } = require('../utils/request')

// 买家登录（账号密码）
function login(data) {
  return post('/auth/login', data)
}

// 短信验证码登录
function loginWithSms(data) {
  return post('/auth/sms-login', data)
}

// 卖家注册
function registerShop(data) {
  return post('/auth/register-shop', data)
}

// 买家注册
function register(data) {
  return post('/auth/register', data)
}

// 管理员注册
function registerAdmin(data) {
  return post('/auth/register-admin', data)
}

// 管理员登录
function adminLogin(data) {
  return post('/auth/admin-login', data)
}

// 微信登录
function wxLogin(data) {
  return post('/auth/wx-login', data)
}

// 发送短信验证码
function sendSmsCode(phone, type = 'login') {
  return post('/auth/sms-code', { phone, type })
}

// 获取用户信息
function getUserInfo() {
  return get('/user/user')
}

// 更新用户信息
function updateUserInfo(data) {
  return post('/user/update', data)
}

// 退出登录
function logout() {
  return post('/auth/logout')
}

// 刷新Token
function refreshToken() {
  return post('/auth/refresh')
}

// 修改密码
function updatePassword(data) {
  return post('/auth/password', data)
}

module.exports = {
  login,
  loginWithSms,
  register,
  registerShop,
  registerAdmin,
  adminLogin,
  wxLogin,
  sendSmsCode,
  getUserInfo,
  updateUserInfo,
  logout,
  refreshToken,
  updatePassword
} 