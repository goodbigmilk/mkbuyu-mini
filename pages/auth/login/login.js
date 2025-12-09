const { checkAuthAndLogin, isLoggedIn } = require('../../../api/auth.js')
const { userState } = require('../../../utils/state.js')
const { getDefaultPageByRole } = require('../../../utils/constants.js')
const { casdoorSDK } = require('../../../utils/casdoor.js')

Page({
  data: {
    // 旧的loading状态保持向后兼容
    loading: false,
    checking: true,
    
    // 新的分离式loading状态
    wechatLoading: false,
    passwordLoading: false,
    
    // Casdoor web-view 相关
    casdoorLoginUrl: '',
    showCasdoorLogin: false,
    
    // 密码登录表单数据
    username: '15629981111',
    password: 'a123456'
  },

  async onLoad(options) {
    console.log('🔐 登录页面加载', options)
    
    // 检查是否有 token（从后端 navigateTo 跳转过来）
    if (options.token) {
      console.log('✅ 检测到 token，直接登录')
      await this.handleTokenLogin(options.token)
      return
    }
    
    // 检查是否有授权码回调（从 Casdoor 返回）
    if (options.code && options.state) {
      console.log('🔄 检测到 Casdoor 授权码回调')
      await this.handleCasdoorCallback(options.code, options.state)
      return
    }
    
    // 快速检查本地token，如果已登录则跳转（不调用API）
    if (isLoggedIn()) {
      console.log('✅ 用户已登录，直接跳转')
      this.redirectToUserPage()
    } else {
      // 没有登录，显示登录界面
      console.log('❌ 用户未登录，显示登录选项')
      this.setData({ checking: false })
    }
  },

  // 跳转到用户对应页面
  redirectToUserPage() {
    const role = userState.getRole()
    const defaultPage = getDefaultPageByRole(role)
    
    setTimeout(() => {
      if (defaultPage.startsWith('/pages/user/')) {
        // 用户页面使用switchTab
        wx.switchTab({
          url: defaultPage
        })
      } else {
        // 其他页面使用reLaunch
        wx.reLaunch({
          url: defaultPage
        })
      }
    }, 500)
  },

  // 开始微信小程序登录
  async onStartLogin() {
    this.setData({ 
      wechatLoading: true,
      loading: true // 保持向后兼容
    })
    
    try {
      wx.showToast({
        title: '正在登录...',
        icon: 'loading',
        duration: 2000
      })

      // 使用微信小程序认证，可选择是否获取用户资料
      const isAuthenticated = await checkAuthAndLogin({
        withUserProfile: true // 获取用户资料进行登录
      })
      
      if (isAuthenticated) {
        console.log('✅ 微信小程序登录成功')
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
        
        // 登录成功后跳转到用户对应页面
        setTimeout(() => {
          this.redirectToUserPage()
        }, 1000)
      }

    } catch (error) {
      console.error('微信小程序登录失败:', error)
      wx.showToast({
        title: error.message || '登录失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ 
        wechatLoading: false,
        loading: false // 保持向后兼容
      })
    }
  },

  // 查看协议
  onViewUserAgreement() {
    wx.navigateTo({
      url: '/pages/policy/user-agreement/user-agreement'
    })
  },

  onViewPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/policy/privacy-policy/privacy-policy'
    })
  },

  // 联系客服
  onContactService() {
    wx.showModal({
      title: '联系客服',
      content: '如有问题，请联系客服协助处理',
      showCancel: false
    })
  },

  // ==================== 新增：密码登录相关方法 ====================

  // 用户名输入
  onUsernameInput(event) {
    this.setData({
      username: event.detail
    })
  },

  // 密码输入
  onPasswordInput(event) {
    this.setData({
      password: event.detail
    })
  },

  // 密码登录
  async onPasswordLogin() {
    const { username, password } = this.data

    // 基本验证
    if (!username.trim()) {
      wx.showToast({
        title: '请输入账号',
        icon: 'none'
      })
      return
    }

    if (!password.trim()) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      })
      return
    }

    this.setData({ passwordLoading: true })

    try {
      wx.showToast({
        title: '正在登录...',
        icon: 'loading',
        duration: 2000
      })

      // 调用密码登录API（需要先实现API方法）
      const { passwordLogin } = require('../../../api/auth.js')
      const result = await passwordLogin({
        username: username.trim(),
        password: password.trim()
      })

      if (result) {
        console.log('✅ 密码登录成功')
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })

        // 清空表单
        this.setData({
          username: '',
          password: ''
        })

        // 登录成功后跳转到用户对应页面
        setTimeout(() => {
          this.redirectToUserPage()
        }, 1000)
      }

    } catch (error) {
      console.error('密码登录失败:', error)
      wx.showToast({
        title: error.message || '登录失败，请检查账号密码',
        icon: 'none'
      })
    } finally {
      this.setData({ passwordLoading: false })
    }
  },

  // 跳转到注册页面
  onGoToRegister() {
    wx.navigateTo({
      url: '/pages/auth/register/register'
    })
  },

  // ==================== Casdoor 登录相关方法 ====================

  /**
   * 打开 Casdoor 登录页面（使用 web-view）
   */
  onOpenCasdoorLogin() {
    console.log('🚀 打开 Casdoor 登录页面')
    
    // 生成 Casdoor 登录 URL
    // 注意：redirect_uri 需要指向一个可以接收回调的页面
    // 这里我们使用当前页面，通过 URL 参数传递 code
    // 注意：不需要手动编码，getSigninUrl 内部会统一处理编码
    const redirectUri = 'http://localhost:8080/api/auth/callback?client=miniprogram'
    const loginUrl = casdoorSDK.getSigninUrl(redirectUri)
    
    console.log('📝 Casdoor 登录 URL:', loginUrl)
    
    this.setData({
      casdoorLoginUrl: loginUrl,
      showCasdoorLogin: true
    })
  },

  /**
   * 关闭 Casdoor 登录页面
   */
  onCloseCasdoorLogin() {
    console.log('🔒 关闭 Casdoor 登录页面')
    this.setData({
      showCasdoorLogin: false,
      casdoorLoginUrl: ''
    })
  },
  
  /**
   * 页面显示时检查是否有待处理的消息
   */
  onShow() {
    // 如果 web-view 已关闭，检查是否有待处理的消息
    // 注意：bindmessage 事件可能在页面显示后才触发
    if (!this.data.showCasdoorLogin) {
      // 这里可以添加额外的检查逻辑
    }
  },

  /**
   * 处理 web-view 消息（来自 Casdoor 页面）
   * 支持 navigateTo 跳转失败时的 postMessage 后备方案
   */
  onCasdoorMessage(event) {
    console.log('📨 收到 Casdoor 消息:', event.detail)
    
    // 处理不同的数据格式
    let data = null
    
    // 情况1: data 是数组
    if (Array.isArray(event.detail.data) && event.detail.data.length > 0) {
      data = event.detail.data[0]
    } 
    // 情况2: data 是对象
    else if (event.detail.data && typeof event.detail.data === 'object') {
      data = event.detail.data
    }
    // 情况3: 直接是对象
    else if (event.detail && typeof event.detail === 'object' && event.detail.type) {
      data = event.detail
    }
    
    if (!data) {
      console.error('❌ 无法解析消息数据:', event.detail)
      return
    }
    
    console.log('📨 解析后的数据:', data)
    
    // 检查是否是 OAuth 成功消息（来自后端的 postMessage）
    if (data.type === 'oauth_success' && data.token) {
      console.log('✅ 收到 OAuth 成功消息，使用 token 登录')
      // 关闭 web-view
      this.setData({
        showCasdoorLogin: false
      })
      // 处理登录
      this.handleTokenLogin(data.token)
      return
    }
    
    // 检查是否有授权码
    if (data.code) {
      this.handleCasdoorCallback(data.code, data.state || 'casdoor')
      return
    }
    
    // 检查关闭请求
    if (data.type === 'close') {
      console.log('✅ 收到关闭请求')
      this.onCloseCasdoorLogin()
      return
    }
    
    console.warn('⚠️ 未识别的消息类型:', data)
  },

  /**
   * 使用 token 直接登录（后端已处理授权码）
   */
  async handleTokenLogin(token) {
    try {
      wx.showLoading({
        title: '正在登录...',
        mask: true
      })

      // 先保存 token 到本地存储，以便后续请求使用
      wx.setStorageSync('token', token)
      console.log('✅ Token 已保存到本地存储')

      // 使用 token 获取用户信息
      const { getUserInfo, setUserLoginState } = require('../../../api/auth.js')
      const userInfoResponse = await getUserInfo()
      const userInfo = userInfoResponse.data
      if (userInfo && (userInfo.user || userInfo.id)) {
        const validUserInfo = userInfo.user
        const roles = userInfo.roles || []
        
        console.log('✅ Token 登录成功:', validUserInfo)
        
        // 设置登录状态（会再次保存 token，但这是安全的）
        setUserLoginState(validUserInfo, roles, token)
        
        wx.hideLoading()
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })

        // 关闭 web-view
        this.setData({
          showCasdoorLogin: false
        })

        // 登录成功后跳转到用户对应页面
        setTimeout(() => {
          this.redirectToUserPage()
        }, 1000)
      } else {
        throw new Error('获取用户信息失败')
      }
    } catch (error) {
      console.error('❌ Token 登录失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: error.message || '登录失败，请重试',
        icon: 'none',
        duration: 3000
      })
      
      // 关闭 web-view
      this.setData({
        showCasdoorLogin: false
      })
    }
  },

  /**
   * 处理 Casdoor 授权回调
   */
  async handleCasdoorCallback(code, state) {
    try {
      wx.showLoading({
        title: '正在登录...',
        mask: true
      })

      // 使用授权码换取访问令牌
      const result = await casdoorSDK.exchangeAuthCodeForToken(code, state)
      
      if (result && result.token) {
        console.log('✅ Casdoor 登录成功:', result.user)
        
        wx.hideLoading()
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })

        // 关闭 web-view
        this.setData({
          showCasdoorLogin: false
        })

        // 登录成功后跳转到用户对应页面
        setTimeout(() => {
          this.redirectToUserPage()
        }, 1000)
      }
    } catch (error) {
      console.error('❌ Casdoor 登录失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: error.message || '登录失败，请重试',
        icon: 'none',
        duration: 3000
      })
      
      // 关闭 web-view
      this.setData({
        showCasdoorLogin: false
      })
    }
  },

  /**
   * web-view 加载完成
   */
  onCasdoorLoad() {
    console.log('✅ Casdoor 登录页面加载完成')
  },

  /**
   * web-view 加载错误
   */
  onCasdoorError(event) {
    console.error('❌ Casdoor 登录页面加载失败:', event.detail)
    wx.showToast({
      title: '页面加载失败，请重试',
      icon: 'none'
    })
  }
})