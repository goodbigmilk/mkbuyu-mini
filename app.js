// app.js
const { userState, stateManager } = require('./utils/state')
const { API_CONFIG } = require('./utils/constants')
const { casdoorSDK } = require('./api/auth.js')

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

    // 初始化认证状态标志
    this.globalData.isAuthenticating = false

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

  // 初始化用户状态（使用OAuth认证）
  async initUserState() {
    // 防止重复调用
    if (this.globalData.isAuthenticating) {
      console.log('正在认证中，跳过重复调用')
      return
    }

    try {
      this.globalData.isAuthenticating = true
      
      // 优先从 SDK 获取存储的token
      const token = wx.getStorageSync('token')
      const storedUserId = casdoorSDK.getStoredUserId()
      
      if (token && storedUserId) {
        // 使用 SDK 进行静默登录检查
        const isValidToken = await casdoorSDK.silentSignin()
        
        if (isValidToken) {
          // 使用OAuth验证token有效性并自动跳转
          await this.validateOAuthTokenAndRedirect(token, storedUserId)
          return
        } else {
          // Token无效，清除存储
          casdoorSDK.clearUserInfo()
        }
      }
      
      // 没有有效登录信息，使用OAuth认证
      console.log('用户未登录，启动OAuth认证检查')
      await this.checkOAuthAuthentication()
    } catch (error) {
      console.error('初始化用户状态失败', error)
      // 出错时启动OAuth认证
      await this.checkOAuthAuthentication()
    } finally {
      this.globalData.isAuthenticating = false
    }
  },

  // 使用OAuth验证token有效性并处理自动跳转
  async validateOAuthTokenAndRedirect(token, userId) {
    try {
      // 导入获取用户信息的方法和统一登录状态设置函数
      const { getUserInfo, setUserLoginState } = require('./api/auth.js')
      
      // token已通过silentSignin验证，直接获取用户信息
      console.log('Token已验证有效，获取用户信息')
      
      const userInfoResponse = await getUserInfo()
      console.log('获取用户信息响应:', userInfoResponse)
      
      if (userInfoResponse && (userInfoResponse.user || userInfoResponse.id)) {
        const validUserInfo = userInfoResponse.user || userInfoResponse
        
        // 获取用户角色
        const roles = validUserInfo.roles || userInfoResponse.roles || []
        let role = this.extractMainRole(roles) || 'user'
        
        console.log('OAuth验证成功，用户角色:', role, 'roles数组:', roles, '用户信息:', validUserInfo)
        
        // 使用统一的登录状态设置函数，确保角色数据正确规范化
        setUserLoginState(validUserInfo, roles, token)
        
        // 根据用户角色自动跳转
        this.autoRedirectByRole(role)
      } else {
        console.error('获取用户信息失败:', userInfoResponse)
        // 清除无效状态，跳转到登录页
        casdoorSDK.clearUserInfo()
        wx.reLaunch({
          url: '/pages/auth/login/login'
        })
      }
    } catch (error) {
      console.error('获取用户信息失败', error)
      // 获取失败，清除状态并跳转到登录页
      casdoorSDK.clearUserInfo()
      wx.reLaunch({
        url: '/pages/auth/login/login'
      })
    }
  },

  // 检查微信小程序认证状态
  async checkOAuthAuthentication() {
    console.log('认证状态无效，跳转到登录页面')
    // 跳转到登录页面，让用户重新登录
    wx.reLaunch({
      url: '/pages/auth/login/login'
    })
  },

  // 从角色数组中提取主要角色
  extractMainRole(roles) {
    if (!Array.isArray(roles) || roles.length === 0) {
      return 'user'
    }

    // 角色优先级：admin > shop > user
    const roleMap = {
      'admin': 'admin',
      'administrator': 'admin',
      'merchant': 'shop',
      'shop': 'shop',
      'shop_owner': 'shop',
      'user': 'user'
    }

    // 按优先级查找角色
    for (const role of roles) {
      const roleCode = typeof role === 'string' ? role : (role.role_code || role.code || role.name)
      if (roleCode === 'admin' || roleCode === 'administrator') {
        return 'admin'
      }
    }

    for (const role of roles) {
      const roleCode = typeof role === 'string' ? role : (role.role_code || role.code || role.name)
      if (roleMap[roleCode] === 'shop') {
        return 'shop'
      }
    }

    return 'user'
  },

  // 检查用户是否拥有商家角色
  checkHasShopRole(roles) {
    if (!Array.isArray(roles) || roles.length === 0) {
      return false
    }
    
    // 商家相关角色代码
    const shopRoleCodes = ['merchant', 'shop', 'shop_owner']
    
    return roles.some(role => {
      const roleCode = typeof role === 'string' ? role : (role.role_code || role.code || role.name)
      return shopRoleCodes.includes(roleCode)
    })
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
    // 使用 SDK 清除用户信息
    casdoorSDK.clearUserInfo()
    
    // 清除本地状态（保持向后兼容）
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
    store: null,
    isAuthenticating: false,  // 添加认证状态标志
    
    // 角色测试工具（仅开发环境）
    roleTestTool: {
      // 测试双重角色功能
      testDualRole: function() {
        console.log('🧪 开始测试双重角色功能...')
        
        const diagnosis = userState.diagnoseRoles()
        const testResults = {
          timestamp: new Date().toLocaleString(),
          diagnosis: diagnosis,
          tests: []
        }
        
        // 测试1: 基础角色检查
        testResults.tests.push({
          name: '基础角色检查',
          hasUserRole: userState.hasUserRole(),
          hasShopRole: userState.hasShopRole(),
          hasMultipleRoles: userState.hasMultipleRoles(),
          passed: diagnosis.issues.length === 0
        })
        
        // 测试2: 上下文切换
        const originalContext = userState.getCurrentContext()
        let switchTestPassed = true
        let switchTestDetails = {}
        
        try {
          if (userState.hasUserRole() && userState.hasShopRole()) {
            // 测试切换到用户端
            const switchToUser = userState.switchContext('user')
            const afterUserSwitch = userState.getCurrentContext()
            
            // 测试切换到商家端
            const switchToShop = userState.switchContext('shop')
            const afterShopSwitch = userState.getCurrentContext()
            
            // 恢复原始上下文
            userState.switchContext(originalContext)
            
            switchTestDetails = {
              originalContext,
              switchToUser,
              afterUserSwitch,
              switchToShop,
              afterShopSwitch,
              restored: userState.getCurrentContext()
            }
            
            switchTestPassed = switchToUser && switchToShop && 
                               afterUserSwitch === 'user' && 
                               afterShopSwitch === 'shop'
          } else {
            switchTestPassed = false
            switchTestDetails = { reason: '用户没有双重角色，无法测试切换' }
          }
        } catch (error) {
          switchTestPassed = false
          switchTestDetails = { error: error.message }
        }
        
        testResults.tests.push({
          name: '上下文切换测试',
          passed: switchTestPassed,
          details: switchTestDetails
        })
        
        // 测试3: 权限验证
        testResults.tests.push({
          name: '权限验证测试',
          currentPermission: userState.hasCurrentPermission(),
          userContext: userState.isUserContext(),
          shopContext: userState.isShopContext(),
          passed: userState.hasCurrentPermission()
        })
        
        console.log('🧪 角色功能测试结果:', testResults)
        
        // 显示测试摘要
        const passedTests = testResults.tests.filter(t => t.passed).length
        const totalTests = testResults.tests.length
        console.log(`📊 测试摘要: ${passedTests}/${totalTests} 通过`)
        
        if (passedTests === totalTests) {
          console.log('✅ 所有测试通过！角色功能正常')
        } else {
          console.warn('❌ 部分测试失败，角色功能可能存在问题')
        }
        
        return testResults
      },
      
      // 模拟角色数据（仅测试用）
      simulateRoles: function(roles) {
        console.log('🎭 模拟角色数据:', roles)
        const originalRoles = userState.getRoles()
        
        try {
          // 临时修改角色数据进行测试
          const { stateManager } = require('./utils/state.js')
          stateManager.setState('user', { roles: roles })
          
          console.log('📊 模拟后的诊断结果:')
          const diagnosis = userState.diagnoseRoles()
          
          // 恢复原始角色数据
          stateManager.setState('user', { roles: originalRoles })
          console.log('🔄 已恢复原始角色数据')
          
          return diagnosis
        } catch (error) {
          // 确保恢复原始数据
          const { stateManager } = require('./utils/state.js')
          stateManager.setState('user', { roles: originalRoles })
          console.error('❌ 模拟测试失败:', error)
          return null
        }
      }
    }
  }
}) 