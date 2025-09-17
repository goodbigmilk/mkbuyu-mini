// 工具函数集合

/**
 * 格式化价格（分转元）
 * @param {number} price 价格（分）
 * @param {number} decimals 小数位数
 * @returns {string} 格式化后的价格
 */
const formatPrice = (price, decimals = 2) => {
  if (typeof price !== 'number') {
    return '0.00'
  }
  return (price / 100).toFixed(decimals)
}

/**
 * 价格元转分
 * @param {number} price 价格（元）
 * @returns {number} 价格（分）
 */
const priceToFen = (price) => {
  if (typeof price !== 'number') {
    return 0
  }
  return Math.round(price * 100)
}

/**
 * 格式化时间
 * @param {Date|string|number} date 日期
 * @param {string} format 格式模板
 * @returns {string} 格式化后的时间
 */
const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return ''
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  const second = String(d.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second)
}

/**
 * 格式化时间（formatDate的别名）
 * @param {Date|string|number} date 日期
 * @param {string} format 格式模板
 * @returns {string} 格式化后的时间
 */
const formatTime = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return formatDate(date, format)
}

/**
 * 获取相对时间
 * @param {Date|string|number} date 日期
 * @returns {string} 相对时间
 */
const getRelativeTime = (date) => {
  if (!date) return ''
  
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const month = 30 * day
  const year = 365 * day
  
  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`
  } else if (diff < month) {
    return `${Math.floor(diff / day)}天前`
  } else if (diff < year) {
    return `${Math.floor(diff / month)}个月前`
  } else {
    return `${Math.floor(diff / year)}年前`
  }
}

/**
 * 防抖函数
 * @param {Function} func 要执行的函数
 * @param {number} wait 延迟时间
 * @returns {Function} 防抖后的函数
 */
const debounce = (func, wait) => {
  let timeout
  return function (...args) {
    const context = this
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(context, args), wait)
  }
}

/**
 * 节流函数
 * @param {Function} func 要执行的函数
 * @param {number} wait 间隔时间
 * @returns {Function} 节流后的函数
 */
const throttle = (func, wait) => {
  let timeout
  return function (...args) {
    const context = this
    if (!timeout) {
      timeout = setTimeout(() => {
        timeout = null
        func.apply(context, args)
      }, wait)
    }
  }
}

/**
 * 深拷贝
 * @param {any} obj 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item))
  }
  
  if (typeof obj === 'object') {
    const clonedObj = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
}

/**
 * 生成UUID
 * @returns {string} UUID
 */
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * 手机号验证
 * @param {string} phone 手机号
 * @returns {boolean} 是否有效
 */
const validatePhone = (phone) => {
  const reg = /^1[3-9]\d{9}$/
  return reg.test(phone)
}

/**
 * 身份证验证
 * @param {string} idCard 身份证号
 * @returns {boolean} 是否有效
 */
const validateIdCard = (idCard) => {
  const reg = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
  return reg.test(idCard)
}

/**
 * 邮箱验证
 * @param {string} email 邮箱
 * @returns {boolean} 是否有效
 */
const validateEmail = (email) => {
  const reg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return reg.test(email)
}

/**
 * 密码验证
 * @param {string} password 密码
 * @returns {boolean} 是否有效
 */
const validatePassword = (password) => {
  // 密码至少6位，包含字母和数字
  const reg = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/
  return reg.test(password)
}

/**
 * 获取文件扩展名
 * @param {string} filename 文件名
 * @returns {string} 扩展名
 */
const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

/**
 * 文件大小格式化
 * @param {number} bytes 字节数
 * @returns {string} 格式化后的大小
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 数组去重
 * @param {Array} arr 数组
 * @param {string} key 去重的键（用于对象数组）
 * @returns {Array} 去重后的数组
 */
const uniqueArray = (arr, key) => {
  if (!Array.isArray(arr)) return []
  
  if (key) {
    const seen = new Set()
    return arr.filter(item => {
      const value = item[key]
      if (seen.has(value)) {
        return false
      }
      seen.add(value)
      return true
    })
  }
  
  return [...new Set(arr)]
}

/**
 * 获取URL参数
 * @param {string} name 参数名
 * @param {string} url URL（可选，默认当前页面）
 * @returns {string|null} 参数值
 */
const getUrlParam = (name, url) => {
  if (!url) {
    const pages = getCurrentPages()
    if (pages.length > 0) {
      const currentPage = pages[pages.length - 1]
      url = currentPage.route + '?' + Object.keys(currentPage.options)
        .map(key => `${key}=${currentPage.options[key]}`)
        .join('&')
    }
  }
  
  const reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)')
  const r = url.match(reg)
  return r ? decodeURIComponent(r[2]) : null
}

/**
 * 存储封装
 */
const storage = {
  set(key, value, expire) {
    const data = {
      value,
      expire: expire ? Date.now() + expire * 1000 : null
    }
    wx.setStorageSync(key, JSON.stringify(data))
  },
  
  get(key) {
    try {
      const data = JSON.parse(wx.getStorageSync(key) || '{}')
      if (data.expire && Date.now() > data.expire) {
        wx.removeStorageSync(key)
        return null
      }
      return data.value
    } catch (e) {
      return null
    }
  },
  
  remove(key) {
    wx.removeStorageSync(key)
  },
  
  clear() {
    wx.clearStorageSync()
  }
}

/**
 * 选择图片
 * @param {Object} options 选项
 * @returns {Promise} 选择结果
 */
const chooseImage = (options = {}) => {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count: options.count || 1,
      sizeType: options.sizeType || ['original', 'compressed'],
      sourceType: options.sourceType || ['album', 'camera'],
      success: resolve,
      fail: reject
    })
  })
}

/**
 * 预览图片
 * @param {string} current 当前显示图片的链接
 * @param {Array} urls 需要预览的图片链接列表
 */
const previewImage = (current, urls = []) => {
  wx.previewImage({
    current,
    urls: urls.length > 0 ? urls : [current]
  })
}

/**
 * 复制到剪贴板
 * @param {string} data 要复制的数据
 * @returns {Promise} 复制结果
 */
const copyToClipboard = (data) => {
  return new Promise((resolve, reject) => {
    wx.setClipboardData({
      data: String(data),
      success: () => {
        wx.showToast({
          title: '复制成功',
          icon: 'success'
        })
        resolve()
      },
      fail: reject
    })
  })
}

/**
 * 显示Toast提示
 * @param {string} title 提示内容
 * @param {string} icon 图标类型 'success' | 'error' | 'loading' | 'none'
 * @param {number} duration 显示时长（毫秒）
 */
const showToast = (title, icon = 'success', duration = 2000) => {
  wx.showToast({
    title: title,
    icon: icon,
    duration: duration
  })
}

/**
 * 显示加载提示
 * @param {string} title 提示内容
 * @param {boolean} mask 是否显示透明蒙层
 */
const showLoading = (title = '加载中...', mask = true) => {
  wx.showLoading({
    title: title,
    mask: mask
  })
}

/**
 * 隐藏加载提示
 */
const hideLoading = () => {
  wx.hideLoading()
}

/**
 * 显示模态对话框
 * @param {Object|string} options 选项对象或标题字符串
 * @param {string} content 内容（当第一个参数为字符串时使用）
 * @returns {Promise} 用户选择结果
 */
const showModal = (options = {}, content = '') => {
  // 支持两种调用方式：
  // 1. showModal({ title: '标题', content: '内容' })
  // 2. showModal('标题', '内容')
  let modalOptions = {}
  
  if (typeof options === 'string') {
    // 第一种调用方式：showModal('标题', '内容')
    modalOptions = {
      title: options,
      content: content
    }
  } else {
    // 第二种调用方式：showModal({ title: '标题', content: '内容' })
    modalOptions = options
  }
  
  return new Promise((resolve) => {
    wx.showModal({
      title: modalOptions.title || '提示',
      content: modalOptions.content || '',
      showCancel: modalOptions.showCancel !== false,
      cancelText: modalOptions.cancelText || '取消',
      confirmText: modalOptions.confirmText || '确定',
      success: (res) => {
        resolve(res.confirm)
      },
      fail: () => {
        resolve(false)
      }
    })
  })
}

/**
 * 显示操作菜单
 * @param {Array} itemList 菜单项列表
 * @returns {Promise} 用户选择结果
 */
const showActionSheet = (itemList = []) => {
  return new Promise((resolve, reject) => {
    wx.showActionSheet({
      itemList,
      success: (res) => {
        resolve(res.tapIndex)
      },
      fail: reject
    })
  })
}

/**
 * 获取系统信息
 * @returns {Object} 系统信息
 */
const getSystemInfo = () => {
  try {
    return wx.getSystemInfoSync()
  } catch (e) {
    return {}
  }
}

/**
 * 获取设备信息
 * @returns {Object} 设备信息
 */
const getDeviceInfo = () => {
  const systemInfo = getSystemInfo()
  return {
    platform: systemInfo.platform || '',
    system: systemInfo.system || '',
    version: systemInfo.version || '',
    model: systemInfo.model || '',
    brand: systemInfo.brand || '',
    screenWidth: systemInfo.screenWidth || 0,
    screenHeight: systemInfo.screenHeight || 0,
    windowWidth: systemInfo.windowWidth || 0,
    windowHeight: systemInfo.windowHeight || 0,
    statusBarHeight: systemInfo.statusBarHeight || 0,
    safeArea: systemInfo.safeArea || {}
  }
}

/**
 * 检查网络状态
 * @returns {Promise} 网络状态
 */
const checkNetworkStatus = () => {
  return new Promise((resolve, reject) => {
    wx.getNetworkType({
      success: (res) => {
        resolve({
          networkType: res.networkType,
          isConnected: res.networkType !== 'none'
        })
      },
      fail: reject
    })
  })
}

/**
 * 振动反馈
 * @param {string} type 振动类型 'success' | 'warning' | 'error'
 */
const hapticFeedback = (type = 'success') => {
  if (wx.canIUse('vibrateShort')) {
    wx.vibrateShort({
      type: type === 'error' ? 'heavy' : type === 'warning' ? 'medium' : 'light'
    })
  }
}

module.exports = {
  formatPrice,
  priceToFen,
  formatDate,
  formatTime,
  getRelativeTime,
  debounce,
  throttle,
  deepClone,
  generateUUID,
  validatePhone,
  validateIdCard,
  validateEmail,
  validatePassword,
  getFileExtension,
  formatFileSize,
  uniqueArray,
  getUrlParam,
  storage,
  chooseImage,
  previewImage,
  copyToClipboard,
  showToast,
  showLoading,
  hideLoading,
  showModal,
  showActionSheet,
  getSystemInfo,
  getDeviceInfo,
  checkNetworkStatus,
  hapticFeedback
} 