/**
 * Casdoor SDK 微信小程序适配器
 * 专为微信小程序环境设计，使用微信小程序专用的身份验证流程
 */

const { CASDOOR_CONFIG } = require('./constants.js')

/**
 * Casdoor 微信小程序 SDK 类
 */
class CasdoorMiniProgramSDK {
  constructor(config = CASDOOR_CONFIG) {
    this.config = config
  }

  /**
   * 微信小程序登录
   * 使用微信小程序登录接口获取code，然后发送到Casdoor进行身份验证
   * @param {object} options - 登录选项
   * @param {string} options.username - 用户昵称（可选）
   * @param {string} options.avatar - 用户头像URL（可选）
   * @returns {Promise} 登录结果
   */
  signin(options = {}) {
    return new Promise((resolve, reject) => {
      console.log('🚀 开始微信小程序登录流程')
      
      // 使用微信小程序登录接口
      wx.login({
        success: (res) => {
          if (res.code) {
            console.log('✅ 获取到微信登录code:', res.code)
            
            // 发送code到Casdoor进行身份验证
            this.exchangeCodeForToken(res.code, options)
              .then(resolve)
              .catch(reject)
          } else {
            console.error('❌ 获取微信登录code失败:', res.errMsg)
            reject(new Error('获取微信登录code失败: ' + res.errMsg))
          }
        },
        fail: (error) => {
          console.error('❌ 微信登录失败:', error)
          reject(new Error('微信登录失败: ' + error.errMsg))
        }
      })
    })
  }

  /**
   * 使用微信登录code换取Casdoor访问令牌
   * @param {string} code - 微信小程序登录code
   * @param {object} options - 登录选项
   * @returns {Promise} 访问令牌和用户信息
   */
  exchangeCodeForToken(code, options = {}) {
    return new Promise((resolve, reject) => {
      const { serverUrl, clientId } = this.config
      
      // 构建请求数据
      const requestData = {
        tag: 'wechat_miniprogram', // 必须参数：告诉Casdoor这是微信小程序请求
        client_id: clientId,
        code: code
      }
      
      // 可选参数：用户昵称和头像
      if (options.username) {
        requestData.username = options.username
      }
      if (options.avatar) {
        requestData.avatar = options.avatar
      }
      
      console.log('🔄 向Casdoor发送身份验证请求:', {
        url: `${serverUrl}/api/login/oauth/access_token`,
        data: { ...requestData, code: 'xxx' } // 隐藏code用于日志
      })
      
      wx.request({
        url: `${serverUrl}/api/login/oauth/access_token`,
        method: 'POST',
        data: requestData,
        header: {
          'content-type': 'application/x-www-form-urlencoded'
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data && res.data.access_token) {
            const accessToken = res.data.access_token
            console.log('✅ 成功获取Casdoor访问令牌')
            
            // 使用访问令牌获取用户详细信息
            this.getUserInfoByToken(accessToken)
              .then((result) => {
                // 处理用户信息，确保格式正确
                const userInfo = this.processUserInfo(result.user || result)
                
                // 使用统一的setUserLoginState函数保存用户信息，而不是直接保存到存储
                const { setUserLoginState } = require('../api/auth.js')
                setUserLoginState(userInfo, result.roles || [], accessToken)
                
                resolve({
                  token: accessToken,
                  user: userInfo,
                  roles: result.roles || []
                })
              })
              .catch(reject)
          } else {
            console.error('❌ Casdoor身份验证失败:', res.data)
            reject(new Error('身份验证失败: ' + (res.data?.error || res.data?.msg || '未知错误')))
          }
        },
        fail: (error) => {
          console.error('❌ 请求Casdoor身份验证接口失败:', error)
          reject(new Error('网络请求失败: ' + error.errMsg))
        }
      })
    })
  }

  /**
   * 格式化用户ID为Casdoor标准格式 (owner/name)
   * @param {string} username - 用户名
   * @param {string} owner - 组织名称
   * @returns {string} 格式化后的用户ID
   */
  formatUserId(username, owner) {
    // 如果已经是 owner/name 格式，直接返回
    if (username && username.includes('/')) {
      return username
    }
    // 否则添加 owner 前缀
    return `${owner}/${username}`
  }

  /**
   * 处理用户信息，确保ID格式正确
   * @param {object} user - 用户信息
   * @returns {object} 处理后的用户信息
   */
  processUserInfo(user) {
    if (user && user.name) {
      const { organizationName } = this.config
      
      // 如果没有显示名称，使用用户名
      if (!user.displayName) {
        user.displayName = user.name
      }
      
      console.log('🔧 用户信息处理完成:', user)
    }
    return user
  }

  /**
   * 使用访问令牌获取用户信息
   * @param {string} token - 访问令牌
   * @returns {Promise} 用户信息
   */
  getUserInfoByToken(token) {
    return new Promise((resolve, reject) => {
      const { API_CONFIG } = require('./constants.js')
      
      wx.request({
        url: `${API_CONFIG.BASE_URL}/auth/user-info`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`,
          'content-type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data && res.data.code === 200) {
            console.log('✅ 成功获取用户信息，原始数据:', res.data.data)
            
            const responseData = res.data.data
            // 处理用户信息，确保格式正确
            let userInfo = this.processUserInfo(responseData.user || responseData)
            
            console.log('✅ 处理后的用户信息:', userInfo)
            console.log('✅ 角色信息:', responseData.roles)
            
            // 返回包含用户和角色信息的完整结构
            resolve({
              user: userInfo,
              roles: responseData.roles || []
            })
          } else {
            console.error('❌ 获取用户信息失败:', res.data)
            reject(new Error('获取用户信息失败: ' + (res.data?.message || '未知错误')))
          }
        },
        fail: (error) => {
          console.error('❌ 请求用户信息接口失败:', error)
          reject(new Error('网络请求失败: ' + error.errMsg))
        }
      })
    })
  }

  /**
   * 获取微信用户资料（需要用户授权）
   * @returns {Promise} 用户资料
   */
  getWeChatUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          console.log('✅ 获取微信用户资料成功:', res.userInfo)
          resolve(res.userInfo)
        },
        fail: (error) => {
          console.log('❌ 获取微信用户资料失败:', error)
          // 如果用户拒绝授权，使用默认值
          resolve({
            nickName: '微信用户',
            avatarUrl: ''
          })
        }
      })
    })
  }

  /**
   * 带用户资料的登录
   * 先获取用户微信资料，再进行登录
   * @returns {Promise} 登录结果
   */
  async signinWithUserProfile() {
    try {
      // 获取微信用户资料
      const userProfile = await this.getWeChatUserProfile()
      
      // 使用用户资料进行登录
      return await this.signin({
        username: userProfile.nickName,
        avatar: userProfile.avatarUrl
      })
    } catch (error) {
      // 如果获取用户资料失败，使用基本登录方式
      console.log('⚠️ 获取用户资料失败，使用基本登录方式')
      return await this.signin()
    }
  }

  /**
   * 更新用户资料到Casdoor
   * @param {object} userProfile - 用户资料
   * @returns {Promise} 更新结果
   */
  updateUserProfile(userProfile) {
    return new Promise((resolve, reject) => {
      const token = this.getStoredToken()
      if (!token) {
        reject(new Error('未找到访问令牌'))
        return
      }
      
      const { serverUrl } = this.config
      
      wx.request({
        url: `${serverUrl}/api/update-user`,
        method: 'POST',
        data: {
          owner: this.config.organizationName,
          name: this.getStoredUserId()?.split('/')[1] || this.getStoredUserId(),
          displayName: userProfile.nickName,
          avatar: userProfile.avatarUrl
        },
        header: {
          'Authorization': `Bearer ${token}`,
          'content-type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            console.log('✅ 用户资料更新成功')
            resolve(res.data)
          } else {
            console.error('❌ 用户资料更新失败:', res.data)
            reject(new Error('用户资料更新失败: ' + res.data?.error))
          }
        },
        fail: (error) => {
          console.error('❌ 请求用户资料更新接口失败:', error)
          reject(new Error('网络请求失败: ' + error.errMsg))
        }
      })
    })
  }

  /**
   * 静默登录检查
   * @returns {Promise<boolean>} 是否已登录
   */
  async silentSignin() {
    const token = this.getStoredToken()
    if (!token) {
      return false
    }
    
    try {
      // 验证token有效性
      await this.getUserInfoByToken(token)
      return true
    } catch (error) {
      console.log('⚠️ Token已失效，清除本地存储')
      this.clearUserInfo()
      return false
    }
  }

  /**
   * 获取存储的访问令牌
   * @returns {string|null} 访问令牌
   */
  getStoredToken() {
    return wx.getStorageSync('token') || null
  }

  /**
   * 获取存储的用户ID
   * @returns {string|null} 用户ID
   */
  getStoredUserId() {
    return wx.getStorageSync('userId') || null
  }

  /**
   * 清除用户信息
   */
  clearUserInfo() {
    // 清除当前版本的存储
    wx.removeStorageSync('token')
    wx.removeStorageSync('userId')
    
    // 清除旧版本的存储（兼容清理）
    wx.removeStorageSync('access_token')
    wx.removeStorageSync('user_info')
    
    console.log('🗑️ 清除用户信息（token, userId等）')
  }

  /**
   * 检查是否已登录
   * @returns {boolean} 是否已登录
   */
  isLoggedIn() {
    const token = this.getStoredToken()
    const userId = this.getStoredUserId()
    return !!(token && userId)
  }

  /**
   * 构建 URL 查询参数（兼容小程序环境）
   * @param {object} params - 参数对象
   * @returns {string} 查询字符串
   */
  buildQueryString(params) {
    const parts = []
    for (const key in params) {
      if (params.hasOwnProperty(key) && params[key] !== null && params[key] !== undefined) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      }
    }
    return parts.join('&')
  }

  /**
   * 获取 Casdoor 登录页面 URL（用于 web-view）
   * @param {string} redirectUri - 回调地址（小程序页面路径）
   * @returns {string} 登录页面 URL
   */
  getSigninUrl(redirectUri = '') {
    const { serverUrl, clientId, organizationName, applicationName } = this.config
    
    // 构建登录 URL
    // 格式: /login/oauth/authorize?client_id=xxx&response_type=code&redirect_uri=xxx&scope=read&state=casdoor
    const params = {
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri || `${serverUrl}/callback`,
      scope: 'read',
      state: 'casdoor'
    }
    
    // 如果指定了应用名称，使用应用特定的登录路径
    const loginPath = `/login/oauth/authorize`
    
    return `${serverUrl}${loginPath}?${this.buildQueryString(params)}`
  }

  /**
   * 获取 Casdoor 注册页面 URL（用于 web-view）
   * @param {string} redirectUri - 回调地址（小程序页面路径）
   * @returns {string} 注册页面 URL
   */
  getSignupUrl(redirectUri = '') {
    const { serverUrl, clientId, organizationName, applicationName } = this.config
    
    // 构建注册 URL
    const params = {
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri || `${serverUrl}/callback`,
      scope: 'read',
      state: 'casdoor'
    }
    
    const signupPath = `/signup/oauth/authorize`
    
    return `${serverUrl}${signupPath}?${this.buildQueryString(params)}`
  }

  /**
   * 使用授权码换取访问令牌（OAuth 回调处理）
   * @param {string} code - 授权码
   * @param {string} state - 状态参数
   * @returns {Promise} 访问令牌和用户信息
   */
  exchangeAuthCodeForToken(code, state) {
    return new Promise((resolve, reject) => {
      const { serverUrl, clientId } = this.config
      
      // 构建请求数据
      const requestData = {
        grant_type: 'authorization_code',
        client_id: clientId,
        code: code,
        state: state || 'casdoor'
      }
      
      console.log('🔄 使用授权码换取访问令牌:', {
        url: `${serverUrl}/api/login/oauth/access_token`,
        data: { ...requestData, code: 'xxx' } // 隐藏code用于日志
      })
      
      wx.request({
        url: `${serverUrl}/api/login/oauth/access_token`,
        method: 'POST',
        data: requestData,
        header: {
          'content-type': 'application/x-www-form-urlencoded'
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data && res.data.access_token) {
            const accessToken = res.data.access_token
            console.log('✅ 成功获取Casdoor访问令牌')
            
            // 使用访问令牌获取用户详细信息
            this.getUserInfoByToken(accessToken)
              .then((result) => {
                // 处理用户信息，确保格式正确
                const userInfo = this.processUserInfo(result.user || result)
                
                // 使用统一的setUserLoginState函数保存用户信息
                const { setUserLoginState } = require('../api/auth.js')
                setUserLoginState(userInfo, result.roles || [], accessToken)
                
                resolve({
                  token: accessToken,
                  user: userInfo,
                  roles: result.roles || []
                })
              })
              .catch(reject)
          } else {
            console.error('❌ Casdoor授权码换取令牌失败:', res.data)
            reject(new Error('授权码换取令牌失败: ' + (res.data?.error || res.data?.msg || '未知错误')))
          }
        },
        fail: (error) => {
          console.error('❌ 请求Casdoor授权码换取令牌接口失败:', error)
          reject(new Error('网络请求失败: ' + error.errMsg))
        }
      })
    })
  }
}

// 创建全局实例
const casdoorSDK = new CasdoorMiniProgramSDK()

module.exports = {
  CasdoorMiniProgramSDK,
  casdoorSDK
}
