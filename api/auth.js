/**
 * 微信小程序认证相关API
 * 
 * 架构说明：
 * 1. 微信小程序登录：使用 Casdoor SDK 处理微信小程序登录流程
 * 2. 密码登录：通过后端API进行用户名密码认证
 * 3. 用户注册：通过后端API进行用户注册
 * 4. 状态管理：统一使用 SDK 和 userState 进行状态管理
 * 5. 错误处理：提供友好的错误提示和异常处理
 */

const { post, get, put } = require('../utils/request')

// 设置用户登录状态
function setUserLoginState(user, roles, token) {
  const { userState } = require('../utils/state.js')

  // 确保roles是数组，并且规范化角色数据
  if (!Array.isArray(roles)) {
    roles = []
  }
  
  // 规范化角色数据 - 支持字符串和对象格式
  const normalizedRoles = roles.map(role => {
    if (typeof role === 'string') {
      // 如果是字符串，直接返回
      return role
    } else if (typeof role === 'object' && role !== null) {
      // 如果是对象，提取角色代码
      return role.role_code || role.code || role.name || role.displayName || ''
    }
    return ''
  }).filter(role => role) // 过滤掉空字符串
  
  // 提取用户ID
  const userId = user.id || user.user_id || user.userId
  
  console.log('🔐 设置用户登录状态:', {
    userId: userId,
    originalRoles: roles,
    normalizedRoles: normalizedRoles,
    rolesCount: normalizedRoles.length,
    hasToken: !!token,
    roleTypes: roles.map(r => typeof r)
  })
  
  // 使用简化的登录方法，只保存必要信息
  userState.login(userId, token, normalizedRoles)
}

// 角色验证函数：检查用户是否有指定的角色权限
function validateUserRole(roles, requestedRole) {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return false
  }
  
  // 根据请求的角色类型匹配对应的角色代码
  const roleCodeMap = {
    'user': ['user'], // 普通用户角色
    'shop': ['merchant', 'shop'], // 商家角色
    'admin': ['admin', 'administrator'] // 管理员角色
  }
  
  const allowedRoleCodes = roleCodeMap[requestedRole] || []
  
  // 检查用户是否拥有任一所需角色
  return roles.some(role => {
    const roleCode = role.role_code || role.code
    return allowedRoleCodes.includes(roleCode)
  })
}

// ==================== 微信小程序认证流程相关方法 ====================

const { casdoorSDK } = require('../utils/casdoor.js')

// 获取用户信息
function getUserInfo() {
  return get('/auth/user-info')
}

// 更新用户信息
function updateUserInfo(data) {
  return put('/auth/profile', data)
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
  return put('/auth/password', data)
}

/**
 * 微信小程序登录 - 基本登录方式
 * @returns {Promise} 登录结果
 */
async function wechatMiniProgramLogin() {
  try {
    console.log('🚀 开始微信小程序登录')
    
    const result = await casdoorSDK.signin()
    
    // 使用新的帮助函数设置登录状态和角色信息
    setUserLoginState(result.user, result.roles,result.token)
    
    console.log('✅ 微信小程序登录成功:', result.user)
    return result
  } catch (error) {
    console.error('❌ 微信小程序登录失败:', error)
    throw error
  }
}

/**
 * 微信小程序登录 - 带用户资料
 * 会先请求用户授权获取微信用户资料，然后进行登录
 * @returns {Promise} 登录结果
 */
async function wechatMiniProgramLoginWithProfile() {
  try {
    console.log('🚀 开始微信小程序登录（带用户资料）')
    
    const result = await casdoorSDK.signinWithUserProfile()
    
    // 设置登录状态和角色信息
    setUserLoginState(result.user, result.roles, result.token)
    
    console.log('✅ 微信小程序登录成功（带用户资料）:', result.user)
    return result
  } catch (error) {
    console.error('❌ 微信小程序登录失败（带用户资料）:', error)
    throw error
  }
}

/**
 * 检查认证状态并自动进行身份验证
 * @param {object} options - 选项
 * @param {boolean} options.withUserProfile - 是否获取用户资料进行登录，默认false
 * @returns {Promise<boolean>} 是否已认证
 */
async function checkAuthAndLogin(options = {}) {
  try {
    console.log('🔍 检查认证状态并自动登录')
    
    // 检查是否已登录（silentSignin内部已经验证token有效性）
    const isLoggedIn = await casdoorSDK.silentSignin()
    
    if (isLoggedIn) {
      console.log('✅ 用户已登录，无需重新获取信息')
      // 已登录且token有效，直接返回
      return true
    }
    
    // 未登录，开始登录流程
    console.log('🔄 用户未登录，开始微信小程序身份验证流程')
    
    let result
    if (options.withUserProfile) {
      result = await wechatMiniProgramLoginWithProfile()
    } else {
      result = await wechatMiniProgramLogin()
    }
    
    if (result && result.user) {
      console.log('✅ 微信小程序登录成功，用户:', result.user.displayName || result.user.name)
      return true
    } else {
      throw new Error('登录返回结果异常')
    }
    
  } catch (error) {
    console.error('❌ 身份验证失败:', error)
    
    // 根据错误类型给出不同的提示
    let errorMessage = '登录失败，请重试'
    
    if (error.message && error.message.includes('获取微信登录code失败')) {
      errorMessage = '微信授权失败，请检查网络后重试'
    } else if (error.message && error.message.includes('身份验证失败')) {
      errorMessage = 'Casdoor身份验证失败，请联系管理员'
    } else if (error.message && error.message.includes('网络')) {
      errorMessage = '网络连接失败，请检查网络后重试'
    }
    
    // 不在这里显示Toast，让调用方处理显示逻辑
    throw new Error(errorMessage)
  }
}

/**
 * 检查认证状态（不自动登录）
 * @returns {Promise<boolean>} 是否已认证
 */
async function checkAuthStatus() {
  try {
    return await casdoorSDK.silentSignin()
  } catch (error) {
    console.error('检查认证状态失败:', error)
    return false
  }
}

/**
 * 更新用户微信资料到Casdoor
 * @returns {Promise} 更新结果
 */
async function updateWeChatUserProfile() {
  try {
    const userProfile = await casdoorSDK.getWeChatUserProfile()
    return await casdoorSDK.updateUserProfile(userProfile)
  } catch (error) {
    console.error('更新用户资料失败:', error)
    throw error
  }
}

/**
 * 登出处理 - 统一的登出逻辑
 * @returns {Promise} 登出结果
 */
async function logoutLogic() {
  try {
    console.log('🚪 开始登出处理')
    
    // 调用后端登出接口
    await logout()
    console.log('✅ 后端登出成功')
  } catch (error) {
    console.error('⚠️ 后端登出接口调用失败，继续清理本地状态:', error)
  } finally {
    // 使用 SDK 清除用户信息
    casdoorSDK.clearUserInfo()
    
    // 清除本地状态（保持向后兼容）
    const { userState } = require('../utils/state.js')
    userState.logout()
    
    console.log('🗑️ 用户已完全登出，本地状态已清除')
    
    // 显示登出成功提示
    wx.showToast({
      title: '已退出登录',
      icon: 'success'
    })
  }
}

/**
 * 获取当前用户信息（已废弃，建议通过API获取）
 * @returns {object|null} 用户信息
 */
function getCurrentUser() {
  const userId = casdoorSDK.getStoredUserId()
  if (!userId) return null
  
  // 返回基础用户对象，实际应该通过API获取完整信息
  return { id: userId, userId: userId }
}

/**
 * 获取当前访问令牌
 * @returns {string|null} 访问令牌
 */
function getCurrentToken() {
  return casdoorSDK.getStoredToken()
}

/**
 * 检查是否已登录
 * @returns {boolean} 是否已登录
 */
function isLoggedIn() {
  return casdoorSDK.isLoggedIn()
}

/**
 * 格式化用户ID为Casdoor标准格式 (owner/name)
 * @param {string} username - 用户名
 * @param {string} owner - 组织名称
 * @returns {string} 格式化后的用户ID
 */
function formatUserId(username, owner) {
  // 如果已经是 owner/name 格式，直接返回
  if (username.includes('/')) {
    return username
  }
  // 否则添加 owner 前缀
  return `${owner}/${username}`
}

/**
 * 处理用户信息，确保ID格式正确
 * @param {object} user - 用户信息
 * @param {string} owner - 组织名称
 * @returns {object} 处理后的用户信息
 */
function processUserInfo(user, owner) {
  if (user && user.name) {
    // 确保用户ID格式正确
    user.id = formatUserId(user.name, owner)
    
    // 如果没有显示名称，使用用户名
    if (!user.displayName) {
      user.displayName = user.name
    }
  }
  return user
}

/**
 * 密码登录 - 通过后端API进行密码认证
 * @param {object} credentials - 登录凭据
 * @param {string} credentials.username - 用户名/手机号/邮箱
 * @param {string} credentials.password - 密码
 * @returns {Promise} 登录结果
 */
async function passwordLogin(credentials) {
  try {
    console.log('🔑 开始密码登录')
    
    // 通过后端API进行密码认证
    const response = await post('/auth/login', {
      username: credentials.username,
      password: credentials.password
    })
    
    console.log('🔍 登录API响应:', response)
    
    // request.js返回的是 {code: 200, message: "...", data: {...}}
    // 实际的登录数据在 response.data 中
    const result = response.data || response
    
    console.log('🔍 提取的登录数据:', result)
    
    // 修改验证逻辑:只检查必须字段token和user,shop_info是可选的
    if (result && result.token && result.user) {
      console.log('✅ 密码登录成功', {
        userId: result.user.id || result.user.name,
        hasShop: result.has_shop || false,
        hasShopInfo: !!result.shop_info
      })
      
      // 设置登录状态和角色信息
      setUserLoginState(result.user, result.roles, result.token)
      
      // 如果有店铺信息,可以保存到本地(可选)
      if (result.shop_info) {
        console.log('📦 用户拥有店铺:', result.shop_info.name)
        // 这里可以选择保存店铺信息到本地存储
        // wx.setStorageSync('shop_info', result.shop_info)
      } else {
        console.log('ℹ️ 用户暂无店铺信息')
      }
      
      return {
        token: result.token,
        user: result.user,
        hasShop: result.has_shop || false,
        shopInfo: result.shop_info || null
      }
    } else {
      console.error('❌ 登录响应格式异常:', {
        hasResult: !!result,
        hasToken: !!(result && result.token),
        hasUser: !!(result && result.user),
        result: result
      })
      throw new Error('登录响应格式异常')
    }
    
  } catch (error) {
    console.error('❌ 密码登录失败:', error)
    
    // 根据错误类型给出不同的提示
    if (error.message && error.message.includes('401')) {
      throw new Error('用户名或密码错误')
    } else if (error.message && error.message.includes('Network')) {
      throw new Error('网络连接失败，请检查网络后重试')
    } else {
      throw new Error(error.message || '登录失败，请重试')
    }
  }
}


/**
 * 注册新用户 - 通过后端API进行用户注册
 * @param {object} userInfo - 用户信息
 * @param {string} userInfo.username - 用户名
 * @param {string} userInfo.password - 密码
 * @param {string} userInfo.phone - 手机号（可选）
 * @param {string} userInfo.email - 邮箱（可选）
 * @param {string} userInfo.displayName - 显示名称（可选）
 * @returns {Promise} 注册结果
 */
async function registerUser(userInfo) {
  try {
    console.log('📝 开始用户注册')
    
    // 通过后端API进行用户注册
    const result = await post('/auth/register', {
      username: userInfo.username,
      password: userInfo.password,
      phone: userInfo.phone || '',
      email: userInfo.email || '',
      displayName: userInfo.displayName || userInfo.username
    })
    
    if (result) {
      console.log('✅ 用户注册成功:', result)
      return result
    } else {
      throw new Error('注册响应格式异常')
    }
    
  } catch (error) {
    console.error('❌ 用户注册失败:', error)
    
    // 根据错误类型给出不同的提示
    if (error.message && error.message.includes('409')) {
      throw new Error('用户名已存在，请更换用户名')
    } else if (error.message && error.message.includes('400')) {
      throw new Error('注册信息格式有误，请检查输入')
    } else if (error.message && error.message.includes('Network')) {
      throw new Error('网络连接失败，请检查网络后重试')
    } else {
      throw new Error(error.message || '注册失败，请重试')
    }
  }
}

module.exports = {
  // 用户信息管理
  getUserInfo,
  updateUserInfo,
  logout,
  refreshToken,
  updatePassword,
  
  // 微信小程序认证相关
  wechatMiniProgramLogin,
  wechatMiniProgramLoginWithProfile,
  checkAuthAndLogin,
  checkAuthStatus,
  updateWeChatUserProfile,
  logoutLogic,
  
  // 用户状态相关
  getCurrentUser,
  getCurrentToken,
  isLoggedIn,
  setUserLoginState, // 添加统一的登录状态设置函数
  
  // 密码登录和注册相关
  passwordLogin,
  registerUser,
  
  // Casdoor SDK 实例
  casdoorSDK,
  
  // 工具函数
  validateUserRole
} 