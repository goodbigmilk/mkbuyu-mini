const config = {
  baseURL: 'http://localhost:8080/api',
  timeout: 15000
}

// 统一的请求函数
function request(options) {
  return new Promise((resolve, reject) => {
    // 获取存储的token
    const token = wx.getStorageSync('token')
    
    console.log('请求准备 - Token检查:', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      url: options.url,
      method: options.method || 'GET'
    })

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
              console.log('Token失效，清除登录状态')
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
            // 清除token
            wx.removeStorageSync('token')
            wx.removeStorageSync('userInfo')
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

// 导出模块
module.exports = {
  request,
  get,
  post,
  put,
  delete: del,
  config
}