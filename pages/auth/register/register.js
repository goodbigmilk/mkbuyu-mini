const { registerUser } = require('../../../api/auth.js')
const { getDefaultPageByRole } = require('../../../utils/constants.js')
const { casdoorSDK } = require('../../../utils/casdoor.js')
const { checkAuthAndLogin, isLoggedIn } = require('../../../api/auth.js')
const { userState } = require('../../../utils/state.js')

Page({
  data: {
    registering: false,
    
    // Casdoor web-view 相关
    casdoorSignupUrl: '',
    showCasdoorSignup: false,
    
    // 表单数据
    formData: {
      username: '',
      displayName: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    
    // 错误信息
    usernameError: '',
    phoneError: '',
    emailError: '',
    passwordError: '',
    confirmPasswordError: '',
    
    // 表单验证状态
    isFormValid: false
  },

  async onLoad(options) {
    console.log('📝 注册页面加载')
    
    // 检查是否有授权码回调（从 Casdoor 返回）
    if (options.code && options.state) {
      console.log('🔄 检测到 Casdoor 授权码回调（注册）')
      await this.handleCasdoorCallback(options.code, options.state)
      return
    }
  },

  // ==================== 表单输入处理 ====================

  onUsernameInput(event) {
    this.setFormData('username', event.detail)
    this.validateUsername(event.detail)
  },

  onDisplayNameInput(event) {
    this.setFormData('displayName', event.detail)
  },

  onPhoneInput(event) {
    this.setFormData('phone', event.detail)
    this.validatePhone(event.detail)
  },

  onEmailInput(event) {
    this.setFormData('email', event.detail)
    this.validateEmail(event.detail)
  },

  onPasswordInput(event) {
    this.setFormData('password', event.detail)
    this.validatePassword(event.detail)
    // 如果确认密码已有值，重新验证匹配性
    if (this.data.formData.confirmPassword) {
      this.validateConfirmPassword(this.data.formData.confirmPassword)
    }
  },

  onConfirmPasswordInput(event) {
    this.setFormData('confirmPassword', event.detail)
    this.validateConfirmPassword(event.detail)
  },

  // 设置表单数据的通用方法
  setFormData(key, value) {
    const newFormData = { ...this.data.formData, [key]: value }
    this.setData({ 
      [`formData.${key}`]: value
    })
    // 更新表单验证状态
    this.updateFormValidation(newFormData)
  },

  // ==================== 表单验证 ====================

  validateUsername(username) {
    let error = ''
    if (!username.trim()) {
      error = '用户名不能为空'
    } else if (username.length < 3) {
      error = '用户名至少3个字符'
    } else if (username.length > 20) {
      error = '用户名最多20个字符'
    } else if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
      error = '用户名只能包含字母、数字、下划线或中文'
    }
    this.setData({ usernameError: error })
    return !error
  },

  validatePhone(phone) {
    let error = ''
    if (phone && phone.trim()) {
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        error = '请输入正确的手机号'
      }
    }
    this.setData({ phoneError: error })
    return !error
  },

  validateEmail(email) {
    let error = ''
    if (email && email.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(email)) {
        error = '请输入正确的邮箱格式'
      }
    }
    this.setData({ emailError: error })
    return !error
  },

  validatePassword(password) {
    let error = ''
    if (!password) {
      error = '密码不能为空'
    } else if (password.length < 6) {
      error = '密码至少6个字符'
    } else if (password.length > 20) {
      error = '密码最多20个字符'
    }
    this.setData({ passwordError: error })
    return !error
  },

  validateConfirmPassword(confirmPassword) {
    let error = ''
    if (!confirmPassword) {
      error = '请确认密码'
    } else if (confirmPassword !== this.data.formData.password) {
      error = '两次密码输入不一致'
    }
    this.setData({ confirmPasswordError: error })
    return !error
  },

  // 更新表单验证状态
  updateFormValidation(formData) {
    const { username, password, confirmPassword } = formData || this.data.formData
    
    const isValid = 
      username.trim().length >= 3 &&
      password.length >= 6 &&
      confirmPassword === password &&
      !this.data.usernameError &&
      !this.data.phoneError &&
      !this.data.emailError &&
      !this.data.passwordError &&
      !this.data.confirmPasswordError

    this.setData({ isFormValid: isValid })
  },

  // ==================== 注册逻辑 ====================

  async onRegister() {
    const { formData } = this.data

    // 最终验证
    if (!this.validateAllFields()) {
      return
    }

    this.setData({ registering: true })

    try {
      wx.showToast({
        title: '正在注册...',
        icon: 'loading',
        duration: 2000
      })

      // 构建注册数据
      const registerData = {
        username: formData.username.trim(),
        password: formData.password,
        displayName: formData.displayName.trim() || formData.username.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim()
      }

      const result = await registerUser(registerData)

      if (result) {
        console.log('✅ 注册成功')
        wx.showToast({
          title: '注册成功',
          icon: 'success'
        })

        // 清空表单
        this.resetForm()

        // 延迟跳转到登录页面
        setTimeout(() => {
          wx.showModal({
            title: '注册成功',
            content: '账号创建成功！现在可以使用账号密码登录了。',
            showCancel: false,
            confirmText: '去登录',
            success: () => {
              wx.navigateBack()
            }
          })
        }, 1000)
      }

    } catch (error) {
      console.error('注册失败:', error)
      wx.showToast({
        title: error.message || '注册失败，请重试',
        icon: 'none',
        duration: 3000
      })
    } finally {
      this.setData({ registering: false })
    }
  },

  // 验证所有字段
  validateAllFields() {
    const { formData } = this.data
    
    const usernameValid = this.validateUsername(formData.username)
    const phoneValid = this.validatePhone(formData.phone)
    const emailValid = this.validateEmail(formData.email)
    const passwordValid = this.validatePassword(formData.password)
    const confirmPasswordValid = this.validateConfirmPassword(formData.confirmPassword)

    return usernameValid && phoneValid && emailValid && passwordValid && confirmPasswordValid
  },

  // 重置表单
  resetForm() {
    this.setData({
      formData: {
        username: '',
        displayName: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: ''
      },
      usernameError: '',
      phoneError: '',
      emailError: '',
      passwordError: '',
      confirmPasswordError: '',
      isFormValid: false
    })
  },

  // ==================== 导航和其他功能 ====================

  // 返回登录页面
  onGoToLogin() {
    wx.navigateBack()
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

  // ==================== Casdoor 注册相关方法 ====================

  /**
   * 打开 Casdoor 注册页面（使用 web-view）
   */
  onOpenCasdoorSignup() {
    console.log('🚀 打开 Casdoor 注册页面')
    
    // 生成 Casdoor 注册 URL
    // 注意：不需要手动编码，getSignupUrl 内部会统一处理编码
    const redirectUri = 'http://localhost:8080/api/auth/callback'
    const signupUrl = casdoorSDK.getSignupUrl(redirectUri)
    
    console.log('📝 Casdoor 注册 URL:', signupUrl)
    
    this.setData({
      casdoorSignupUrl: signupUrl,
      showCasdoorSignup: true
    })
  },

  /**
   * 关闭 Casdoor 注册页面
   */
  onCloseCasdoorSignup() {
    this.setData({
      showCasdoorSignup: false,
      casdoorSignupUrl: ''
    })
  },

  /**
   * 处理 web-view 消息（来自 Casdoor 页面）
   */
  onCasdoorMessage(event) {
    console.log('📨 收到 Casdoor 消息:', event.detail.data)
    
    const data = event.detail.data[0] || event.detail.data
    
    // 检查是否有授权码
    if (data.code) {
      this.handleCasdoorCallback(data.code, data.state || 'casdoor')
    } else if (data.type === 'close') {
      // Casdoor 页面请求关闭
      this.onCloseCasdoorSignup()
    }
  },

  /**
   * 处理 Casdoor 授权回调
   */
  async handleCasdoorCallback(code, state) {
    try {
      wx.showLoading({
        title: '正在处理...',
        mask: true
      })

      // 使用授权码换取访问令牌
      const result = await casdoorSDK.exchangeAuthCodeForToken(code, state)
      
      if (result && result.token) {
        console.log('✅ Casdoor 注册/登录成功:', result.user)
        
        wx.hideLoading()
        wx.showToast({
          title: '注册成功',
          icon: 'success'
        })

        // 关闭 web-view
        this.setData({
          showCasdoorSignup: false
        })

        // 注册成功后跳转到用户对应页面
        setTimeout(() => {
          const role = userState.getRole()
          const defaultPage = getDefaultPageByRole(role)
          
          if (defaultPage.startsWith('/pages/user/')) {
            wx.switchTab({
              url: defaultPage
            })
          } else {
            wx.reLaunch({
              url: defaultPage
            })
          }
        }, 1000)
      }
    } catch (error) {
      console.error('❌ Casdoor 注册/登录失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: error.message || '注册失败，请重试',
        icon: 'none',
        duration: 3000
      })
      
      // 关闭 web-view
      this.setData({
        showCasdoorSignup: false
      })
    }
  },

  /**
   * web-view 加载完成
   */
  onCasdoorLoad() {
    console.log('✅ Casdoor 注册页面加载完成')
  },

  /**
   * web-view 加载错误
   */
  onCasdoorError(event) {
    console.error('❌ Casdoor 注册页面加载失败:', event.detail)
    wx.showToast({
      title: '页面加载失败，请重试',
      icon: 'none'
    })
  }
})
