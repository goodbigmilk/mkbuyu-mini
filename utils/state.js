// 轻量级状态管理工具
const { USER_ROLES } = require('./constants.js')

// 全局状态
const globalState = {
  // 用户相关状态
  user: {
    userId: null,           // 用户ID
    isLogin: false,
    roles: [],              // 用户的所有角色列表
    token: '',              // 访问令牌
    currentContext: 'user'  // 当前上下文：'user' 或 'shop'
  },
  // 商店相关状态  
  shop: {
    shopInfo: null,
    loading: false,
    error: null
  }
}

// 状态变化监听器
const listeners = {
  user: [],
  shop: [],
  global: []
}

// 状态管理器
class StateManager {
  
  // 获取状态
  getState(module = null) {
    if (module) {
      return { ...globalState[module] }
    }
    return JSON.parse(JSON.stringify(globalState))
  }

  // 更新状态
  setState(module, newState) {
    const oldState = { ...globalState[module] }
    globalState[module] = { ...oldState, ...newState }
    
    // 通知监听器
    this.notifyListeners(module, globalState[module], oldState)
    this.notifyListeners('global', globalState, null)
    
    // 更新全局数据（兼容现有代码）
    const app = getApp()
    if (app) {
      app.globalData.userStore = globalState.user
      app.globalData.shopStore = globalState.shop
    }
  }

  // 重置状态
  resetState(module) {
    const defaultStates = {
      user: {
        userId: null,
        isLogin: false,
        roles: [],
        token: '',
        currentContext: 'user'
      },
      shop: {
        shopInfo: null,
        loading: false,
        error: null
      }
    }
    
    if (module) {
      this.setState(module, defaultStates[module])
    } else {
      // 重置所有状态
      Object.keys(defaultStates).forEach(key => {
        this.setState(key, defaultStates[key])
      })
    }
  }

  // 添加状态监听器
  addListener(module, callback) {
    if (!listeners[module]) {
      listeners[module] = []
    }
    listeners[module].push(callback)
    
    // 返回取消监听的方法
    return () => {
      const index = listeners[module].indexOf(callback)
      if (index > -1) {
        listeners[module].splice(index, 1)
      }
    }
  }

  // 通知监听器
  notifyListeners(module, newState, oldState) {
    if (listeners[module]) {
      listeners[module].forEach(callback => {
        try {
          callback(newState, oldState)
        } catch (error) {
          console.error(`状态监听器执行错误 [${module}]:`, error)
        }
      })
    }
  }

  // 初始化状态（从本地存储加载）
  init() {
    this.loadUserState()
  }

  // 从本地存储加载用户状态
  loadUserState() {
    try {
      const token = wx.getStorageSync('token')
      const userId = wx.getStorageSync('userId')
      const storedRoles = wx.getStorageSync('roles')
      const currentContext = wx.getStorageSync('currentContext') || 'user'
      
      // 健壮处理：只要有token和userId就恢复用户状态
      if (token && userId) {
        // 确保roles是有效的数组格式
        let roles = []
        if (Array.isArray(storedRoles)) {
          roles = storedRoles.filter(role => role && (typeof role === 'string' || typeof role === 'object'))
        } else if (storedRoles) {
          console.warn('角色数据格式异常，重置为空数组:', storedRoles)
        }
        
        this.setState('user', {
          token,
          userId,
          roles,
          currentContext,
          isLogin: true
        })
        
        const logMessage = roles.length > 0 
          ? `💾 从本地加载用户状态: userId=${userId}, roles=[${roles.join(',')}], context=${currentContext}`
          : `💾 从本地加载用户状态(无角色数据): userId=${userId}, context=${currentContext} - 可能需要重新获取角色信息`
          
        console.log(logMessage)
        
        // 如果没有角色数据，记录警告
        if (roles.length === 0) {
          console.warn('⚠️ 用户角色数据缺失，建议在应用初始化时重新获取用户信息')
        }
      } else {
        console.log('💾 本地存储中没有有效的登录信息')
      }
    } catch (error) {
      console.error('加载用户状态失败', error)
    }
  }

  // 保存用户状态到本地存储
  saveUserState() {
    const { token, userId, roles, currentContext } = globalState.user
    try {
      if (token) wx.setStorageSync('token', token)
      if (userId) wx.setStorageSync('userId', userId)
      if (roles && Array.isArray(roles)) wx.setStorageSync('roles', roles)
      if (currentContext) wx.setStorageSync('currentContext', currentContext)
      
      console.log('💾 保存用户状态到本地:', {
        userId: userId,
        rolesCount: roles?.length || 0,
        currentContext: currentContext,
        hasToken: !!token
      })
    } catch (error) {
      console.error('保存用户状态失败', error)
    }
  }

  // 清除用户状态
  clearUserState() {
    this.resetState('user')
    try {
      // 清理存储
      wx.removeStorageSync('token')
      wx.removeStorageSync('userId')
      wx.removeStorageSync('roles')
      wx.removeStorageSync('currentContext')
      
      // 清理旧格式存储（兼容清理）
      wx.removeStorageSync('userInfo')
      wx.removeStorageSync('userRoles')
      wx.removeStorageSync('hasShop')
      wx.removeStorageSync('shopInfo')
      wx.removeStorageSync('access_token')
      wx.removeStorageSync('user_info')
      
      console.log('🧹 清除用户状态和本地存储')
    } catch (error) {
      console.error('清除用户状态失败', error)
    }
  }
}

// 创建单例实例
const stateManager = new StateManager()

// 便捷的用户状态管理方法
const userState = {
  // 用户登录
  login(userId, token, roles, context = 'user') {
    console.log('🔐 登录成功，设置用户状态:', {
      userId: userId,
      rolesCount: roles?.length || 0,
      currentContext: context,
      hasToken: !!token
    })
    
    stateManager.setState('user', {
      userId: userId,
      token: token,
      roles: roles || [],
      currentContext: context,
      isLogin: true
    })
    stateManager.saveUserState()
  },

  // 用户登出
  logout() {
    stateManager.clearUserState()
  },

  // 检查登录状态
  isLoggedIn() {
    const { isLogin, token, userId } = stateManager.getState('user')
    return isLogin && token && userId
  },

  // 获取当前上下文
  getCurrentContext() {
    const { currentContext } = stateManager.getState('user')
    return currentContext || 'user'
  },

  // 切换上下文（用户端/商家端）
  switchContext(newContext) {
    if (newContext !== 'user' && newContext !== 'shop') {
      console.error('无效的上下文:', newContext)
      return false
    }

    // 检查用户是否有对应的权限
    if (newContext === 'shop' && !this.hasRolePermission('shop')) {
      console.error('用户没有商家权限，无法切换到商家端')
      return false
    }

    if (newContext === 'user' && !this.hasRolePermission('user')) {
      console.error('用户没有用户权限，无法切换到用户端')
      return false
    }

    console.log(`🔄 切换上下文: ${this.getCurrentContext()} → ${newContext}`)
    stateManager.setState('user', { currentContext: newContext })
    stateManager.saveUserState()
    return true
  },

  // 当前是否在用户端
  isUserContext() {
    return this.getCurrentContext() === 'user'
  },

  // 当前是否在商家端
  isShopContext() {
    return this.getCurrentContext() === 'shop'
  },

  // 检查用户是否拥有某个角色权限
  hasRolePermission(requestedRole) {
    const { roles } = stateManager.getState('user')
    
    console.log(`🔍 检查角色权限: ${requestedRole}`, {
      roles: roles,
      rolesCount: roles?.length || 0,
      rolesType: typeof roles,
      isArray: Array.isArray(roles)
    })
    
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      console.log(`❌ 角色权限检查失败: 角色数据无效`)
      return false
    }

    // 根据请求的角色类型匹配对应的角色代码
    const roleCodeMap = {
      'user': ['user'], // 普通用户角色
      'shop': ['merchant', 'shop'], // 商家角色
    }

    const allowedRoleCodes = roleCodeMap[requestedRole] || []
    console.log(`🎯 允许的角色代码: ${JSON.stringify(allowedRoleCodes)}`)

    const hasPermission = roles.some(role => {
      const roleCode = typeof role === 'string' ? role : (role.role_code || role.code || role.name)
      console.log(`🔎 检查角色: ${JSON.stringify(role)} -> roleCode: ${roleCode}`)
      const matches = allowedRoleCodes.includes(roleCode)
      if (matches) {
        console.log(`✅ 角色匹配: ${roleCode}`)
      }
      return matches
    })

    console.log(`${hasPermission ? '✅' : '❌'} 角色权限检查结果: ${requestedRole} = ${hasPermission}`)
    return hasPermission
  },

  // 当前上下文是否有权限（核心权限检查方法）
  hasCurrentPermission() {
    const context = this.getCurrentContext()
    return this.hasRolePermission(context)
  },

  // 是否有用户权限
  hasUserRole() {
    return this.hasRolePermission('user')
  },

  // 是否有商家权限
  hasShopRole() {
    return this.hasRolePermission('shop')
  },

  // 是否有多重角色（可以切换端）
  hasMultipleRoles() {
    return this.hasUserRole() && this.hasShopRole()
  },

  // 获取用户ID
  getUserId() {
    const { userId } = stateManager.getState('user')
    return userId
  },

  // 获取token
  getToken() {
    const { token } = stateManager.getState('user')
    return token
  },

  // 获取用户所有角色
  getRoles() {
    const { roles } = stateManager.getState('user')
    return roles || []
  },

  // 获取完整用户状态
  getUserState() {
    return stateManager.getState('user')
  },

  // 获取当前上下文对应的角色（兼容旧代码）
  getRole() {
    const context = this.getCurrentContext()
    return context === 'shop' ? 'shop' : 'user'
  },

  // 获取用户信息对象（兼容旧代码）
  getUserInfo() {
    const { userId, roles } = stateManager.getState('user')
    if (!userId) return null
    
    return {
      id: userId,
      user_id: userId,
      userId: userId,
      role: this.getRole(),
      roles: roles || []
    }
  },

  // 调试信息
  getDebugInfo() {
    const state = stateManager.getState('user')
    const localToken = wx.getStorageSync('token')
    const localUserId = wx.getStorageSync('userId')
    const localRoles = wx.getStorageSync('roles')
    const localContext = wx.getStorageSync('currentContext')
    
    return {
      currentState: state,
      localStorage: {
        token: localToken ? `${localToken.substring(0, 20)}...(${localToken.length}字符)` : '❌ 无token',
        userId: localUserId || '❌ 无用户ID',
        roles: localRoles || [],
        currentContext: localContext || 'user',
        rolesCount: localRoles?.length || 0
      }
    }
  },

  // 角色诊断工具
  diagnoseRoles() {
    const state = stateManager.getState('user')
    const { roles } = state
    
    const diagnosis = {
      timestamp: new Date().toLocaleString(),
      isLoggedIn: this.isLoggedIn(),
      currentContext: this.getCurrentContext(),
      roles: {
        raw: roles,
        count: roles?.length || 0,
        isArray: Array.isArray(roles),
        stringified: JSON.stringify(roles)
      },
      permissions: {
        hasUserRole: this.hasUserRole(),
        hasShopRole: this.hasShopRole(),
        hasMultipleRoles: this.hasMultipleRoles(),
        hasCurrentPermission: this.hasCurrentPermission()
      },
      context: {
        isUserContext: this.isUserContext(),
        isShopContext: this.isShopContext()
      }
    }
    
    console.log('🔬 角色诊断报告:', diagnosis)
    
    // 检查常见问题
    const issues = []
    if (!Array.isArray(roles)) {
      issues.push('❌ 角色数据不是数组格式')
    }
    if (!roles || roles.length === 0) {
      issues.push('❌ 没有角色数据')
    }
    if (roles && roles.length > 0) {
      roles.forEach((role, index) => {
        if (typeof role !== 'string') {
          issues.push(`❌ 角色[${index}]不是字符串: ${JSON.stringify(role)}`)
        }
      })
    }
    
    if (issues.length > 0) {
      console.error('🚨 发现角色数据问题:', issues)
      diagnosis.issues = issues
    } else {
      console.log('✅ 角色数据格式正确')
      diagnosis.issues = []
    }
    
    return diagnosis
  }
}

// 便捷的商店状态管理方法
const shopState = {
  // 设置店铺信息
  setShopInfo(shopInfo) {
    stateManager.setState('shop', { shopInfo })
  },

  // 获取店铺信息
  getShopInfo() {
    const { shopInfo } = stateManager.getState('shop')
    return shopInfo
  },

  // 设置加载状态
  setLoading(loading) {
    stateManager.setState('shop', { loading })
  },

  // 设置错误状态
  setError(error) {
    stateManager.setState('shop', { error })
  },

  // 重置商店状态
  reset() {
    stateManager.resetState('shop')
  }
}

// 导出接口
module.exports = {
  // 核心状态管理器
  stateManager,
  
  // 便捷的状态管理方法
  userState,
  shopState,
  
  // 直接访问状态的方法（向后兼容）
  getState: stateManager.getState.bind(stateManager),
  setState: stateManager.setState.bind(stateManager),
  resetState: stateManager.resetState.bind(stateManager),
  addListener: stateManager.addListener.bind(stateManager)
}
