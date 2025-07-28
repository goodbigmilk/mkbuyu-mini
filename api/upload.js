// 文件上传相关API
const { post, delete: del } = require('../utils/request')

/**
 * 上传图片
 * @param {string} filePath 文件路径
 * @param {Object} options 上传选项
 * @param {string} options.category 图片分类 product|avatar|shop|order
 * @returns {Promise} 上传结果
 */
const uploadImage = (filePath, options = {}) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token')
    wx.uploadFile({
      url: 'http://localhost:8080/api/upload/image',
      filePath: filePath,
      name: 'file',
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      formData: {
        category: options.category || 'product'
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (data.code === 200) {
            resolve(data)
          } else {
            reject(new Error(data.message || '上传失败'))
          }
        } catch (error) {
          reject(new Error('上传响应解析失败'))
        }
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}

/**
 * 批量上传图片
 * @param {Array} filePaths 文件路径列表
 * @param {Object} options 上传选项
 * @returns {Promise} 上传结果
 */
const uploadImages = async (filePaths, options = {}) => {
  const results = []
  for (const filePath of filePaths) {
    try {
      const result = await uploadImage(filePath, options)
      results.push(result)
    } catch (error) {
      results.push({ error: error.message, filePath })
    }
  }
  return results
}

/**
 * 上传文件
 * @param {string} filePath 文件路径
 * @param {Object} options 上传选项
 * @param {string} options.category 文件分类 document|other
 * @returns {Promise} 上传结果
 */
const uploadFile = (filePath, options = {}) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token')
    wx.uploadFile({
      url: 'http://localhost:8080/api/upload/file',
      filePath: filePath,
      name: 'file',
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      formData: {
        category: options.category || 'document'
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (data.code === 200) {
            resolve(data)
          } else {
            reject(new Error(data.message || '上传失败'))
          }
        } catch (error) {
          reject(new Error('上传响应解析失败'))
        }
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}

/**
 * 获取上传凭证
 * @param {Object} params 参数
 * @param {string} params.type 文件类型
 * @param {string} params.filename 文件名
 * @returns {Promise} 上传凭证
 */
const getUploadToken = (params) => {
  return post('/upload/token', params)
}

/**
 * 删除文件
 * @param {Object} data 删除数据
 * @param {string} data.url 文件URL
 * @returns {Promise} 删除结果
 */
const deleteFile = (data) => {
  return del('/upload/file', data)
}

module.exports = {
  uploadImage,
  uploadImages,
  uploadFile,
  getUploadToken,
  deleteFile
} 