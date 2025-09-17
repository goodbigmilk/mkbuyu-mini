// 导入统一的API配置
const { API_CONFIG } = require('./constants')

const config = {
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT
}

// 统一的请求函数
function request(options) {
  return new Promise((resolve, reject) => {
    // 获取存储的token
    const token = wx.getStorageSync('token')
    
    console.log('🔍 请求准备 - Token检查:', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenPreview: token ? `${token.substring(0, 20)}...` : '❌ 无token',
      url: options.url,
      method: options.method || 'GET'
    })
    
    // 如果没有token，检查本地存储中的所有相关数据
    if (!token) {
      console.error('❌ Token为空，检查本地存储状态:')
      try {
        const userInfo = wx.getStorageSync('userInfo')
        const allKeys = wx.getStorageInfoSync()
        console.error('📋 本地存储详情:', {
          userInfo: userInfo ? '✅ 存在' : '❌ 不存在',
          用户角色: userInfo?.role || '未知',
          用户ID: userInfo?.id || '未知',
          用户手机: userInfo?.phone || '未知',
          所有存储keys: allKeys.keys,
          存储使用量: `${allKeys.currentSize}KB / ${allKeys.limitSize}KB`
        })
      } catch (storageError) {
        console.error('❌ 读取本地存储失败:', storageError)
      }
    } else {
      console.log('✅ Token正常，长度:', token.length, '预览:', `${token.substring(0, 30)}...`)
    }

    // 构建完整URL
    let fullUrl = config.baseURL + options.url

    // 默认配置
    const defaultOptions = {
      url: fullUrl,
      method: options.method || 'GET',
      header: {
        'Content-Type': 'application/json',
        ...options.header
      },
      timeout: config.timeout,
      success: (res) => {
        console.log('API请求成功:', {
          url: options.url,
          fullUrl: fullUrl,
          method: options.method || 'GET',
          statusCode: res.statusCode,
          data: res.data
        })

        // 处理HTTP状态码
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 检查是否有响应数据
          if (res.data) {
            // 后端统一返回格式：{code: 200, message: "success", data: {...}}
            if (res.data.code === 200) {
              resolve(res.data)
            } else if (res.data.code === 401) {
              // token过期，跳转到登录页
              console.error('🚨 API返回401错误 - Token失效，清除登录状态')
              console.error('🚨 请求详情:', {
                url: options.url,
                method: options.method || 'GET',
                响应数据: res.data,
                当前token长度: wx.getStorageSync('token')?.length || 0
              })
              
              // 记录清除前的状态
              const tokenBeforeClear = wx.getStorageSync('token')
              const userInfoBeforeClear = wx.getStorageSync('userInfo')
              console.error('🗑️ 即将清除的数据:', {
                token长度: tokenBeforeClear?.length || 0,
                用户信息: userInfoBeforeClear ? '存在' : '不存在',
                用户角色: userInfoBeforeClear?.role
              })
              
              wx.removeStorageSync('token')
              wx.removeStorageSync('userInfo')
              
              console.error('🗑️ Token和用户信息已被清除')
              
              wx.showToast({
                title: '登录已过期',
                icon: 'none'
              })
              setTimeout(() => {
                wx.redirectTo({
                  url: '/pages/auth/login/login'
                })
              }, 1500)
              reject(new Error('登录已过期，请重新登录'))
            } else {
              const message = res.data.message || '请求失败'
              reject(new Error(message))
            }
          } else {
            // 如果没有响应数据，直接返回
            resolve({ code: 200, message: 'success', data: null })
          }
        } else {
          console.error('HTTP状态码错误:', res.statusCode, res.data)
          let errorMessage = '网络请求失败'
          if (res.statusCode === 404) {
            errorMessage = '接口不存在'
          } else if (res.statusCode === 500) {
            errorMessage = '服务器内部错误'
          } else if (res.statusCode === 401) {
            errorMessage = '认证失败，请重新登录'
            
            console.error('🚨 HTTP状态码401 - 认证失败，清除登录状态')
            console.error('🚨 请求详情:', {
              url: options.url,
              method: options.method || 'GET',
              HTTP状态码: res.statusCode,
              响应数据: res.data,
              当前token长度: wx.getStorageSync('token')?.length || 0
            })
            
            // 记录清除前的状态
            const tokenBeforeClear = wx.getStorageSync('token')
            const userInfoBeforeClear = wx.getStorageSync('userInfo')
            console.error('🗑️ 即将清除的数据:', {
              token长度: tokenBeforeClear?.length || 0,
              用户信息: userInfoBeforeClear ? '存在' : '不存在',
              用户角色: userInfoBeforeClear?.role
            })
            
            // 清除token
            wx.removeStorageSync('token')
            wx.removeStorageSync('userInfo')
            
            console.error('🗑️ Token和用户信息已被清除')
          }
          reject(new Error(errorMessage))
        }
      },
      fail: (err) => {
        console.error('API请求失败:', {
          url: options.url,
          fullUrl: fullUrl,
          method: options.method || 'GET',
          error: err
        })

        let errorMessage = '网络连接失败'
        if (err.errMsg) {
          if (err.errMsg.includes('timeout')) {
            errorMessage = '请求超时，请检查网络'
          } else if (err.errMsg.includes('fail')) {
            errorMessage = '网络连接失败，请检查网络设置'
          } else if (err.errMsg.includes('invalid url')) {
            errorMessage = 'URL格式错误'
          }
        }

        reject(new Error(errorMessage))
      }
    }

    // 添加token到请求头
    if (token) {
      defaultOptions.header.Authorization = `Bearer ${token}`
      console.log('已添加Authorization头:', `Bearer ${token.substring(0, 20)}...`)
    } else {
      console.warn('警告：没有token，请求可能会失败')
    }

    // 合并参数
    const finalOptions = {
      ...defaultOptions,
      ...options,
      url: fullUrl, // 确保使用完整URL
      header: {
        ...defaultOptions.header,
        ...options.header
      }
    }

    // 如果是GET请求且有data，转换为查询参数
    if (finalOptions.method === 'GET' && finalOptions.data) {
      const queryParams = Object.keys(finalOptions.data)
        .filter(key => finalOptions.data[key] !== undefined && finalOptions.data[key] !== null)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(finalOptions.data[key])}`)
        .join('&')

      if (queryParams) {
        finalOptions.url += (finalOptions.url.includes('?') ? '&' : '?') + queryParams
      }
      delete finalOptions.data
    }

    console.log('发起API请求:', {
      originalUrl: options.url,
      fullUrl: finalOptions.url,
      method: finalOptions.method,
      headers: finalOptions.header,
      data: finalOptions.data,
      hasAuth: !!finalOptions.header.Authorization
    })

    wx.request(finalOptions)
  })
}

// GET请求
function get(url, data = {}, options = {}) {
  return request({
    url,
    method: 'GET',
    data,
    ...options
  })
}

// POST请求
function post(url, data = {}, options = {}) {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  })
}

// PUT请求
function put(url, data = {}, options = {}) {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  })
}

// DELETE请求
function del(url, data = {}, options = {}) {
  return request({
    url,
    method: 'DELETE',
    data,
    ...options
  })
}

// 文件上传
function upload(url, filePath, formData = {}, options = {}) {
  return new Promise((resolve, reject) => {
    // 获取存储的token
    const token = wx.getStorageSync('token')
    
    // 构建完整URL
    const fullUrl = config.baseURL + url
    
    // 显示加载提示
    if (options.showLoading !== false) {
      wx.showLoading({
        title: options.loadingText || '上传中...',
        mask: true
      })
    }

    console.log('文件上传请求:', {
      url: url,
      fullUrl: fullUrl,
      filePath: filePath,
      name: options.name || 'file',
      formData: formData,
      hasToken: !!token
    })

    wx.uploadFile({
      url: fullUrl,
      filePath: filePath,
      name: options.name || 'file',
      formData: formData,
      header: {
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.header
      },
      success: (res) => {
        console.log('文件上传成功:', {
          url: url,
          statusCode: res.statusCode,
          data: res.data
        })

        try {
          const data = JSON.parse(res.data)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            if (data.code === 200) {
              resolve(data)
            } else if (data.code === 401) {
              // token过期
              wx.removeStorageSync('token')
              wx.removeStorageSync('userInfo')
              wx.showToast({
                title: '登录已过期',
                icon: 'none'
              })
              setTimeout(() => {
                wx.redirectTo({
                  url: '/pages/auth/login/login'
                })
              }, 1500)
              reject(new Error('登录已过期，请重新登录'))
            } else {
              const message = data.message || '上传失败'
              reject(new Error(message))
            }
          } else {
            let errorMessage = '上传失败'
            if (res.statusCode === 404) {
              errorMessage = '上传接口不存在'
            } else if (res.statusCode === 500) {
              errorMessage = '服务器内部错误'
            } else if (res.statusCode === 401) {
              errorMessage = '认证失败，请重新登录'
              wx.removeStorageSync('token')
              wx.removeStorageSync('userInfo')
            }
            reject(new Error(errorMessage))
          }
        } catch (parseError) {
          console.error('解析上传响应失败:', parseError, res.data)
          reject(new Error('服务器响应格式错误'))
        }
      },
      fail: (err) => {
        console.error('文件上传失败:', {
          url: url,
          error: err
        })

        let errorMessage = '上传失败'
        if (err.errMsg) {
          if (err.errMsg.includes('timeout')) {
            errorMessage = '上传超时，请检查网络'
          } else if (err.errMsg.includes('fail')) {
            errorMessage = '网络连接失败，请检查网络设置'
          } else if (err.errMsg.includes('file not exist')) {
            errorMessage = '文件不存在'
          }
        }

        reject(new Error(errorMessage))
      },
      complete: () => {
        // 隐藏加载提示
        if (options.showLoading !== false) {
          wx.hideLoading()
        }
      }
    })
  })
}

// 导出模块
module.exports = {
  request,
  get,
  post,
  put,
  delete: del,
  upload,
  config
}