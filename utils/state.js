// 轻量级状态管理工具
const { USER_ROLES } = require('./constants.js')

// 全局状态
const globalState = {
  // 用户相关状态
  user: {
    userInfo: null,
    isLogin: false,
    role: USER_ROLES.USER,
    token: ''
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
        userInfo: null,
        isLogin: false,
        role: USER_ROLES.USER,
        token: ''
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
      const userInfo = wx.getStorageSync('userInfo')
      
      if (token && userInfo) {
        const role = userInfo.role || USER_ROLES.USER
        this.setState('user', {
          token,
          userInfo,
          isLogin: true,
          role
        })
      }
    } catch (error) {
      console.error('加载用户状态失败', error)
    }
  }

  // 保存用户状态到本地存储
  saveUserState() {
    const { token, userInfo, role } = globalState.user
    try {
      if (token) wx.setStorageSync('token', token)
      if (userInfo) {
        // 确保userInfo中包含最新的角色信息
        const userInfoWithRole = {
          ...userInfo,
          role: role || userInfo.role
        }
        wx.setStorageSync('userInfo', userInfoWithRole)
        console.log('💾 保存用户信息到本地:', {
          id: userInfoWithRole.id,
          username: userInfoWithRole.username,
          role: userInfoWithRole.role
        })
      }
    } catch (error) {
      console.error('保存用户状态失败', error)
    }
  }

  // 清除用户状态
  clearUserState() {
    this.resetState('user')
    try {
      wx.removeStorageSync('token')
      wx.removeStorageSync('userInfo')
    } catch (error) {
      console.error('清除用户状态失败', error)
    }
  }
}

// 创建单例实例
const stateManager = new StateManager()

// 便捷的用户状态管理方法
const userState = {
  // 设置用户信息
  setUserInfo(userInfo) {
    if (!userInfo) {
      userInfo = {
        id: null,
        username: '',
        phone: '',
        avatar: '',
        role: USER_ROLES.USER,
        balance: 0
      }
    }
    
    const role = userInfo.role || USER_ROLES.USER
    stateManager.setState('user', {
      userInfo: { ...userInfo, role },
      role
    })
    stateManager.saveUserState()
  },

  // 设置登录状态
  setLoginStatus(isLogin, token = '') {
    stateManager.setState('user', { isLogin, token })
    if (token) {
      stateManager.saveUserState()
    }
  },

  // 设置用户角色
  setRole(role) {
    stateManager.setState('user', { role })
  },

  // 用户登录
  login(userInfo, token, role) {
    stateManager.setState('user', {
      userInfo: { ...userInfo, role },
      token,
      role,
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
    const { isLogin, token, userInfo } = stateManager.getState('user')
    return isLogin && token && userInfo
  },

  // 检查用户角色
  hasRole(expectedRole) {
    const { role } = stateManager.getState('user')
    return role === expectedRole
  },

  // 获取用户信息
  getUserInfo() {
    const { userInfo } = stateManager.getState('user')
    return userInfo
  },

  // 获取token
  getToken() {
    const { token } = stateManager.getState('user')
    return token
  },

  // 获取用户角色
  getRole() {
    const { role } = stateManager.getState('user')
    return role
  },

  // 是否是买家
  isBuyer() {
    return this.hasRole(USER_ROLES.USER)
  },

  // 是否是商家
  isMerchant() {
    return this.hasRole(USER_ROLES.MERCHANT)
  },

  // 是否是管理员
  isAdmin() {
    return this.hasRole(USER_ROLES.ADMIN)
  },

  // 调试：获取完整用户状态信息
  getDebugInfo() {
    const state = stateManager.getState('user')
    const localToken = wx.getStorageSync('token')
    const localUserInfo = wx.getStorageSync('userInfo')
    
    return {
      currentState: state,
      localStorage: {
        token: localToken ? `${localToken.substring(0, 20)}...(${localToken.length}字符)` : '❌ 无token',
        userInfo: localUserInfo,
        role: localUserInfo?.role || '❌ 无角色'
      }
    }
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
