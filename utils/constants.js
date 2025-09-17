// API配置
const API_CONFIG = {
  BASE_URL: 'http://localhost:8080/api',
  TIMEOUT: 15000
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

module.exports = {
  API_CONFIG,
  USER_ROLES,
  USER_ROLE_LABELS,
  getDefaultPageByRole,
  isMerchant,
  isAdmin,
  isUser
} 