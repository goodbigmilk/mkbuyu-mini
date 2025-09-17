// app.js
const { userState, stateManager } = require('./utils/state')
const { API_CONFIG } = require('./utils/constants')

App({
  onLaunch(options) {
    console.log('小程序启动', options)
    
    // 初始化全局数据
    this.initApp()
    
    // 检查更新
    this.checkUpdate()
    
    // 初始化用户登录状态
    this.initUserState()
  },

  onShow(options) {
    console.log('小程序显示', options)
    
    // 检查网络状态
    this.checkNetworkStatus()
  },

  onHide() {
    console.log('小程序隐藏')
  },

  onError(error) {
    console.error('小程序错误', error)
    // 错误上报
    this.reportError(error)
  },

  // 初始化应用
  initApp() {
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync()
    this.globalData.systemInfo = systemInfo
    
    // 设置API基础路径
    this.globalData.apiBaseUrl = API_CONFIG.BASE_URL
    
    // 初始化状态管理
    stateManager.init()
    this.globalData.stateManager = stateManager
    this.globalData.userState = userState

    console.log('应用初始化完成', this.globalData)
  },

  // 检查小程序更新
  checkUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      
      updateManager.onCheckForUpdate((res) => {
        console.log('检查更新结果', res.hasUpdate)
      })
      
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate()
            }
          }
        })
      })
      
      updateManager.onUpdateFailed(() => {
        wx.showToast({
          title: '更新失败',
          icon: 'error'
        })
      })
    }
  },

  // 初始化用户状态
  initUserState() {
    try {
      const token = wx.getStorageSync('token')
      const userInfo = wx.getStorageSync('userInfo')
      
      if (token && userInfo) {
        // 设置用户信息到状态管理
        userState.setUserInfo(userInfo)
        userState.setLoginStatus(true, token)
        
        // 验证token有效性并自动跳转
        this.validateTokenAndRedirect(token, userInfo)
      } else {
        // 没有登录信息，清除可能的旧数据
        console.log('用户未登录，保持在登录页面')
        this.clearLoginState()
      }
    } catch (error) {
      console.error('初始化用户状态失败', error)
      // 出错时清除登录状态，保持在登录页面
      this.clearLoginState()
    }
  },

  // 验证token有效性并处理自动跳转
  async validateTokenAndRedirect(token, userInfo) {
    try {
      const response = await this.request({
        url: '/auth/user',
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('验证token响应:', response)
      
      if (response.code === 200) {
        // 更新用户信息
        userState.setUserInfo(response.data)
        
        // 获取用户角色
        let role = response.data?.role || 
                  userInfo?.role || 
                  'user'  // 默认为普通用户
        
        console.log('获取到的用户角色:', role, '来源数据:', {
          responseData: response.data,
          userInfo: userInfo
        })
        
        // token有效，根据用户角色自动跳转
        this.autoRedirectByRole(role)
      } else {
        // token失效，清除登录状态
        console.log('token验证失败:', response)
        this.clearLoginState()
      }
    } catch (error) {
      console.error('验证token失败', error)
      this.clearLoginState()
    }
  },

  // 根据用户角色自动跳转
  autoRedirectByRole(role) {

    // 延迟执行，确保页面已经初始化完成
    setTimeout(() => {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      
      // 导入用户角色常量
      const { USER_ROLES, getDefaultPageByRole } = require('./utils/constants.js')
      
      // 获取目标页面路径
      const targetPage = getDefaultPageByRole(role)
      
      console.log('跳转详情:', {
        originalRole: role,
        targetPage: targetPage,
        currentPage: currentPage?.route,
        USER_ROLES: USER_ROLES
      })
      
      // 特殊处理：如果是商家用户，强制跳转
      if (role === USER_ROLES.MERCHANT) {
        wx.reLaunch({
          url: targetPage,
          success: () => {
            console.log('商家页面跳转成功:', targetPage)
          },
          fail: (error) => {
            console.error('商家页面跳转失败:', error)
          }
        })
        return
      }
      
      // 如果当前页面已经是目标页面的一部分，则不需要跳转
      if (currentPage && currentPage.route) {
        const currentRoute = currentPage.route
        
        // 检查是否已经在正确的用户角色页面区域
        if (role === USER_ROLES.MERCHANT && currentRoute.includes('merchant/')) {
          console.log('已在商家页面区域，无需跳转')
          return
        }
        if (role === USER_ROLES.USER && currentRoute.includes('user/')) {
          console.log('已在用户页面区域，无需跳转')
          return
        }
        if (role === USER_ROLES.ADMIN && currentRoute.includes('admin/')) {
          console.log('已在管理员页面区域，无需跳转')
          return
        }
      }
      
      // 根据用户角色进行跳转
      if (role === USER_ROLES.ADMIN) {
        // 管理员用户，跳转到管理员首页
        wx.reLaunch({
          url: targetPage,
          success: () => console.log('管理员页面跳转成功'),
          fail: (error) => console.error('管理员页面跳转失败:', error)
        })
      } else {
        // 普通用户，跳转到用户端首页（使用switchTab因为是tabBar页面）
        wx.switchTab({
          url: targetPage,
          success: () => console.log('用户页面跳转成功'),
          fail: (error) => console.error('用户页面跳转失败:', error)
        })
      }
    }, 800)  // 增加延迟时间，确保编译后页面完全加载
  },

  // 清除登录状态
  clearLoginState() {
    userState.logout()
  },

  // 检查网络状态
  checkNetworkStatus() {
    wx.getNetworkType({
      success: (res) => {
        this.globalData.networkType = res.networkType
        if (res.networkType === 'none') {
          wx.showToast({
            title: '网络连接失败',
            icon: 'none'
          })
        }
      }
    })
  },

  // 错误上报
  reportError(error) {
    // 可以在这里集成错误监控服务
    console.log('上报错误', error)
  },

  // 全局请求方法
  request(options) {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('token')
      
      wx.request({
        url: this.globalData.apiBaseUrl + options.url,
        method: options.method || 'GET',
        data: options.data || {},
        header: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          ...options.header
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else if (res.statusCode === 401) {
            // token失效
            this.clearLoginState()
            wx.navigateTo({
              url: '/pages/auth/login/login'
            })
            reject(new Error('未授权'))
          } else {
            reject(new Error(res.data.message || '请求失败'))
          }
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  },

  // 显示加载
  showLoading(title = '加载中...') {
    wx.showLoading({
      title: title,
      mask: true
    })
  },

  // 隐藏加载
  hideLoading() {
    wx.hideLoading()
  },

  // 显示消息
  showToast(title, icon = 'success') {
    wx.showToast({
      title: title,
      icon: icon,
      duration: 2000
    })
  },

  // 全局数据
  globalData: {
    userInfo: null,
    systemInfo: null,
    apiBaseUrl: '',
    networkType: '',
    version: '1.0.0',
    store: null
  }
}) 