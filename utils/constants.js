// API配置
const API_CONFIG = {
  BASE_URL: 'http://localhost:8080/api',
  TIMEOUT: 15000
}

// Casdoor认证配置（微信小程序专用）
const CASDOOR_CONFIG = {
  serverUrl: 'http://localhost:8000',          // Casdoor 服务地址
  clientId: '44fd0ccbfe1beafa8fa6',            // 应用的客户端 ID
  organizationName: 'milk',                  // 组织名称
  applicationName: 'mkbuyu',                   // 应用名称
  
  // 微信小程序专用配置
  wechatMiniProgramConfig: {
    // 微信小程序的 AppID，需要在 Casdoor 中配置微信小程序 IDP
    appId: 'wxacbae1b6db00066d', // 请在此处填入您的微信小程序 AppID
    
    // 微信小程序登录接口路径
    loginPath: '/api/login/oauth/access_token',
    
    // 用户信息更新接口路径
    updateUserPath: '/api/update-user'
  },
}

// 用户角色常量
const USER_ROLES = {
  USER: 'user',        // 普通用户
  MERCHANT: 'shop',    // 商家
  ADMIN: 'admin'       // 管理员
}

// 用户角色标签
const USER_ROLE_LABELS = {
  [USER_ROLES.USER]: '用户',
  [USER_ROLES.MERCHANT]: '商家', 
  [USER_ROLES.ADMIN]: '管理员'
}

// 根据用户角色获取默认首页路径
const getDefaultPageByRole = (role) => {
  switch (role) {
    case USER_ROLES.MERCHANT:
      return '/pages/merchant/dashboard/dashboard'
    case USER_ROLES.ADMIN:
      return '/pages/admin/dashboard/dashboard'  // 如果有管理员页面
    case USER_ROLES.USER:
    default:
      return '/pages/user/home/home'
  }
}

// 判断是否为商家用户
const isMerchant = (role) => {
  return role === USER_ROLES.MERCHANT
}

// 判断是否为管理员
const isAdmin = (role) => {
  return role === USER_ROLES.ADMIN
}

// 判断是否为普通用户
const isUser = (role) => {
  return role === USER_ROLES.USER
}

// 微信小程序登录相关常量
const WECHAT_LOGIN_CONFIG = {
  // 用户授权描述
  USER_PROFILE_DESC: '用于完善用户资料',
  
  // 登录状态
  LOGIN_STATUS: {
    SUCCESS: 'success',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
  },
  
  // 错误信息
  ERROR_MESSAGES: {
    LOGIN_FAILED: '登录失败，请重试',
    PROFILE_FAILED: '获取用户资料失败',
    TOKEN_EXPIRED: 'Token已过期，请重新登录',
    NETWORK_ERROR: '网络请求失败，请检查网络连接'
  }
}

/*
微信小程序 Casdoor 配置说明：

1. 在 Casdoor 管理后台配置微信小程序 IDP：
   - IDP 类型：选择 "WeChat MiniProgram"  
   - AppID：填入您的微信小程序 AppID
   - App Secret：填入您的微信小程序 App Secret
   
2. 将微信小程序 IDP 添加到您的 Casdoor 应用中

3. 更新 CASDOOR_CONFIG.wechatMiniProgramConfig.appId 为您的微信小程序 AppID

4. 确保 Casdoor 服务器地址正确，并且小程序可以访问

5. 在小程序开发工具或真机调试中测试登录流程
*/

module.exports = {
  API_CONFIG,
  CASDOOR_CONFIG,
  USER_ROLES,
  USER_ROLE_LABELS,
  WECHAT_LOGIN_CONFIG,
  getDefaultPageByRole,
  isMerchant,
  isAdmin,
  isUser
} 