// 认证相关API
const { post, get, put } = require('../utils/request')

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

// 获取推荐信息
function getReferralInfo() {
  return get('/user/referral')
}

// 绑定推荐人
function bindReferrer(referralCode) {
  return post('/user/referral/bind', { referral_code: referralCode })
}

// 修改推荐人
function updateReferrer(referralCode) {
  return put('/user/referral/bind', { referral_code: referralCode })
}

// 绑定手机号
function bindPhone(data) {
  return post('/auth/bind-phone', data)
}

// 带业务逻辑的用户登录（处理登录成功后的逻辑）
async function loginWithLogic(loginData) {
  try {
    console.log('🚀 开始登录，用户角色:', loginData.role)
    const response = await login(loginData)
    
    if (response.code === 200 && response.data) {
      const { token, user_info, role } = response.data
      
      // 确定最终的用户角色
      const finalRole = role || user_info?.role || 'user'
      
      if (!user_info || !token) {
        throw new Error('登录响应数据格式错误')
      }
      
      // 更新状态，确保传入最终角色
      const { userState } = require('../utils/state.js')
      userState.login(user_info, token, finalRole)
      
      return response.data
    } else {
      throw new Error(response.message || '登录失败')
    }
  } catch (error) {
    console.error('❌ 登录过程发生错误:', error)
    throw error
  }
}

// 带业务逻辑的短信登录
async function loginWithSmsLogic(loginData) {
  try {
    console.log('🚀 开始短信登录，用户角色:', loginData.role)
    const response = await loginWithSms(loginData)
    
    if (response.code === 200 && response.data) {
      const { token, user_info, role } = response.data
      
      // 确定最终的用户角色
      const finalRole = role || user_info?.role || 'user'
      
      if (!user_info || !token) {
        throw new Error('短信登录响应数据格式错误')
      }
      
      // 更新状态，确保传入最终角色
      const { userState } = require('../utils/state.js')
      userState.login(user_info, token, finalRole)
      
      return response.data
    } else {
      throw new Error(response.message || '短信登录失败')
    }
  } catch (error) {
    console.error('❌ 短信登录过程发生错误:', error)
    throw error
  }
}

// 带业务逻辑的微信登录
async function wxLoginLogic() {
  try {
    console.log('🚀 开始微信登录')
    
    // 获取微信授权码
    const { code } = await new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject
      })
    })
    
    if (!code) {
      throw new Error('获取微信授权码失败')
    }
    
    const response = await wxLogin({ code })
    
    if (response.code === 200 && response.data) {
      const { token, user_info, role } = response.data
      
      // 确定最终的用户角色
      const finalRole = role || user_info?.role || 'user'
      
      if (!user_info) {
        throw new Error('微信登录响应数据格式错误')
      }
      
      // 更新状态，确保传入最终角色
      const { userState } = require('../utils/state.js')
      userState.login(user_info, token, finalRole)
      
      return response.data
    } else {
      throw new Error(response.message || '微信登录失败')
    }
  } catch (error) {
    console.error('微信登录失败', error)
    throw error
  }
}

// 登出处理
async function logoutLogic() {
  try {
    await logout()
  } catch (error) {
    console.error('登出接口调用失败', error)
  } finally {
    const { userState } = require('../utils/state.js')
    userState.logout()
  }
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
  updatePassword,
  getReferralInfo,
  bindReferrer,
  updateReferrer,
  bindPhone,
  // 带业务逻辑的方法
  loginWithLogic,
  loginWithSmsLogic,
  wxLoginLogic,
  logoutLogic
} 