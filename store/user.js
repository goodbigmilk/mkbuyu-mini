// 用户状态管理
const api = require('../api/index.js')
const { storage } = require('../utils/index.js')
const { USER_ROLES, isMerchant, isAdmin, isUser } = require('../utils/constants.js')

// 用户状态
const state = {
  // 用户信息
  userInfo: null,
  // 登录状态
  isLogin: false,
  // 用户角色
  role: USER_ROLES.USER,
  // token
  token: '',
  // 用户统计
  stats: {
    orderCount: 0,
    favoriteCount: 0,
    couponCount: 0,
    points: 0,
    balance: 0
  }
}

// 更新状态的辅助函数
const updateState = (newState) => {
  Object.assign(state, newState)
  // 触发页面更新
  const app = getApp()
  if (app) {
    app.globalData.userStore = { ...state }
  }
}

// 用户状态管理器
const userStore = {
  // 初始化
  init() {
    this.loadUserData()
  },

  // 获取状态
  getState() {
    return { ...state }
  },

  // 重置状态
  reset() {
    updateState({
      userInfo: null,
      isLogin: false,
      role: USER_ROLES.USER,
      token: '',
      stats: {
        orderCount: 0,
        favoriteCount: 0,
        couponCount: 0,
        points: 0,
        balance: 0
      }
    })
    
    // 清除本地存储
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
  },

  // 从本地存储加载用户数据
  loadUserData() {
    try {
      const token = wx.getStorageSync('token')
      const userInfo = wx.getStorageSync('userInfo')
      
      console.log('从本地存储加载用户数据:', { token: !!token, userInfo })
      
      if (token && userInfo) {
        // 获取用户类型，尝试多种字段名
        const role = userInfo.role || 
                        userInfo.Role || 
                        userInfo.role || 
                        USER_ROLES.USER  // 默认为普通用户
        
        console.log('加载用户数据 - 用户类型:', role)
        
        updateState({
          token,
          userInfo,
          isLogin: true,
          role: role
        })
        
        // 验证token有效性
        this.validateToken()
      } else {
        console.log('没有找到本地存储的token或用户信息')
      }
    } catch (error) {
      console.error('加载用户数据失败', error)
    }
  },

  // 验证token有效性
  async validateToken() {
    try {
      const response = await api.auth.getUserInfo()
      console.log('getUserInfo API响应:', response)
      
      if (response.code === 200) {
        if (response.data && typeof response.data === 'object') {
          this.setUserInfo(response.data)
        } else {
          console.error('API返回成功但用户数据为空或无效:', {
            code: response.code,
            data: response.data,
            fullResponse: response
          })
          // 如果数据为空，可能是token有效但用户数据获取失败
          // 这种情况下不应该logout，而是尝试从本地存储恢复数据
          const localUserInfo = wx.getStorageSync('userInfo')
          if (localUserInfo) {
            console.log('从本地存储恢复用户信息:', localUserInfo)
            this.setUserInfo(localUserInfo)
          } else {
            console.warn('本地存储也没有用户信息，保持当前登录状态但用户信息为空')
          }
        }
      } else {
        console.log('token验证失败，API返回:', response)
        this.logout()
      }
    } catch (error) {
      console.error('验证token失败', error)
      this.logout()
    }
  },

  // 设置用户信息
  setUserInfo(userInfo) {
    if (!userInfo) {
      console.error('用户信息为空，接收到的数据:', userInfo)
      console.error('调用堆栈:', new Error().stack)
      // 不直接return，而是设置为默认的空用户信息结构
      const defaultUserInfo = {
        id: null,
        username: '',
        phone: '',
        avatar: '',
        role: USER_ROLES.USER,
        balance: 0
      }
      userInfo = defaultUserInfo
      console.warn('使用默认用户信息结构:', defaultUserInfo)
    }
    
    // 获取用户类型，尝试多种字段名
    const role = userInfo.role || 
                    userInfo.Role || 
                    userInfo.role || 
                    USER_ROLES.USER  // 默认为普通用户
    
    console.log('设置用户信息:', {
      userInfo: userInfo,
      extractedRole: role,
      originalRole: userInfo.role || userInfo.Role || userInfo.role
    })
    
    updateState({
      userInfo,
      role: role
    })
    
    // 保存到本地存储
    // 确保用户信息包含role字段
    const userInfoToStore = {
      ...userInfo,
      role: userInfo.role || userInfo.Role || userInfo.role  // 确保有role字段
    }
    wx.setStorageSync('userInfo', userInfoToStore)
    
    console.log('用户信息已更新，当前状态:', this.getState())
  },

  // 设置登录状态
  setLoginStatus(isLogin, token = '') {
    updateState({ isLogin, token })
    
    if (token) {
      wx.setStorageSync('token', token)
    }
  },

  // 用户登录
  async login(loginData) {
    try {
      const response = await api.auth.login(loginData)
      
      if (response.code === 200 && response.data) {
        // 根据实际返回结构解析数据
        const { token, user_info, role } = response.data
        
        if (!user_info) {
          throw new Error('登录响应数据格式错误')
        }
        
        updateState({
          userInfo: user_info,
          isLogin: true,
          token,
          role
        })
        
        // 保存到本地存储
        wx.setStorageSync('token', token)
        wx.setStorageSync('userInfo', { ...user_info, role })
        
        // 加载用户统计（仅买家需要）
        if (role === USER_ROLES.USER) {
          this.loadUserStats()
        }
        
        return response.data
      } else {
        throw new Error(response.message || '登录失败')
      }
    } catch (error) {
      console.error('登录失败', error)
      throw error
    }
  },

  // 短信验证码登录
  async loginWithSms(loginData) {
    try {
      const response = await api.auth.loginWithSms(loginData)
      
      if (response.code === 200 && response.data) {
        const { token, user_info, role } = response.data
        
        if (!user_info) {
          throw new Error('短信登录响应数据格式错误')
        }
        
        updateState({
          userInfo: user_info,
          isLogin: true,
          token,
          role
        })
        
        // 保存到本地存储
        wx.setStorageSync('token', token)
        wx.setStorageSync('userInfo', { 
          ...user_info, 
          role
        })
        
        // 加载用户统计（仅买家需要）
        if (role === USER_ROLES.USER) {
          this.loadUserStats()
        }
        
        return response.data
      } else {
        throw new Error(response.message || '短信登录失败')
      }
    } catch (error) {
      console.error('短信登录失败', error)
      throw error
    }
  },

  // 卖家注册
  async registerShop(registerData) {
    try {
      const response = await api.auth.registerShop(registerData)
      
      if (response.code === 200) {
        return response.data
      } else {
        throw new Error(response.message || '卖家注册失败')
      }
    } catch (error) {
      console.error('卖家注册失败', error)
      throw error
    }
  },

  // 买家注册
  async register(registerData) {
    try {
      const response = await api.auth.register(registerData)
      
      if (response.code === 200) {
        return response.data
      } else {
        throw new Error(response.message || '注册失败')
      }
    } catch (error) {
      console.error('注册失败', error)
      throw error
    }
  },

  // 微信登录
  async loginWithWechat() {
    try {
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
      
      const response = await api.auth.wxLogin({ code })
      
      if (response.code === 200 && response.data) {
        const { token, user_info, role } = response.data
        
        if (!user_info) {
          throw new Error('微信登录响应数据格式错误')
        }
        
        updateState({
          userInfo: user_info,
          isLogin: true,
          token,
          role
        })
        
        // 保存到本地存储
        wx.setStorageSync('token', token)
        wx.setStorageSync('userInfo', { 
          ...user_info, 
          role
        })
        
        // 加载用户统计（仅买家需要）
        if (role === USER_ROLES.USER) {
          this.loadUserStats()
        }
        
        return response.data
      } else {
        throw new Error(response.message || '微信登录失败')
      }
    } catch (error) {
      console.error('微信登录失败', error)
      throw error
    }
  },

  // 用户登出
  async logout() {
    try {
      await api.auth.logout()
    } catch (error) {
      console.error('登出接口调用失败', error)
    } finally {
      this.reset()
    }
  },

  // 更新用户信息
  async updateUserInfo(data) {
    try {
      const response = await api.auth.updateUserInfo(data)
      console.log('updateUserInfo API响应:', response)
      
      if (response.code === 200) {
        if (response.data && typeof response.data === 'object') {
          this.setUserInfo(response.data)
          return response.data
        } else {
          console.error('更新用户信息API返回成功但数据为空或无效:', {
            code: response.code,
            data: response.data,
            fullResponse: response
          })
          throw new Error('更新成功但返回数据无效')
        }
      } else {
        throw new Error(response.message || '更新失败')
      }
    } catch (error) {
      console.error('更新用户信息失败', error)
      throw error
    }
  },

  // 修改密码
  async updatePassword(data) {
    try {
      const response = await api.auth.updatePassword(data)
      
      if (response.code === 200) {
        wx.showToast({
          title: '密码修改成功',
          icon: 'success'
        })
        return response.data
      } else {
        throw new Error(response.message || '修改密码失败')
      }
    } catch (error) {
      console.error('修改密码失败', error)
      throw error
    }
  },

  // 加载用户统计数据
  async loadUserStats() {
    try {
      const response = await api.user.getUserStats()
      
      if (response.code === 200) {
        updateState({
          stats: response.data
        })
      }
    } catch (error) {
      console.error('加载用户统计失败', error)
    }
  },

  // 检查是否已登录
  checkLoginStatus() {
    return state.isLogin && state.token && state.userInfo
  },

  // 检查用户角色
  checkRole(expectedRole) {
    return state.role === expectedRole
  },

  // 是否是买家
  isBuyer() {
    return this.checkRole(USER_ROLES.USER)
  },

  // 是否是卖家
  isSeller() {
    return this.checkRole(USER_ROLES.MERCHANT)
  },

  // 是否是管理员
  isAdmin() {
    return this.checkRole(USER_ROLES.ADMIN)
  },

  // 获取用户信息
  getUserInfo() {
    return state.userInfo
  },

  // 获取token
  getToken() {
    return state.token
  },

  // 获取用户统计
  getUserStats() {
    return state.stats
  },

  // 刷新token
  async refreshToken() {
    try {
      const response = await api.auth.refreshToken()
      
      if (response.code === 200 && response.data) {
        const { token } = response.data
        updateState({ token })
        wx.setStorageSync('token', token)
        return token
      } else {
        throw new Error(response.message || '刷新token失败')
      }
    } catch (error) {
      console.error('刷新token失败', error)
      this.logout()
      throw error
    }
  },

  // 绑定手机号
  async bindPhone(data) {
    try {
      const response = await api.auth.bindPhone(data)
      console.log('bindPhone API响应:', response)
      
      if (response.code === 200) {
        if (response.data && typeof response.data === 'object') {
          this.setUserInfo(response.data)
          wx.showToast({
            title: '绑定成功',
            icon: 'success'
          })
          return response.data
        } else {
          console.error('绑定手机号API返回成功但数据为空或无效:', {
            code: response.code,
            data: response.data,
            fullResponse: response
          })
          // 绑定成功但数据无效，仍然显示成功提示，但不更新用户信息
          wx.showToast({
            title: '绑定成功',
            icon: 'success'
          })
          return null
        }
      } else {
        throw new Error(response.message || '绑定失败')
      }
    } catch (error) {
      console.error('绑定手机号失败', error)
      throw error
    }
  },

  // 发送短信验证码
  async sendSmsCode(phone, type) {
    try {
      const response = await api.auth.sendSmsCode(phone, type)
      
      if (response.code === 200) {
        wx.showToast({
          title: '验证码已发送',
          icon: 'success'
        })
        return response.data
      } else {
        throw new Error(response.message || '验证码发送失败')
      }
    } catch (error) {
      console.error('发送验证码失败', error)
      throw error
    }
  }
}

module.exports = userStore 