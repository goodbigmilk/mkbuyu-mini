// 商品相关API
const { request } = require('../utils/request')
const { API_CONFIG } = require('../utils/constants')

// 获取商品列表（用户端，基于用户绑定商家）
function getProductList(params = {}) {
  return request({
    url: '/product/list',
    method: 'GET',
    data: params
  })
}

// 获取商家端商品列表（仅显示商家自己店铺的商品）
function getShopProductList(params = {}) {
  return request({
    url: '/product/shop/list',
    method: 'GET',
    data: params
  })
}

// 创建商品
function createProduct(data) {
  return request({
    url: '/product/',
    method: 'POST',
    data
  })
}

// 更新商品
function updateProduct(id, data) {
  return request({
    url: `/product/${id}`,
    method: 'PUT',
    data
  })
}

// 删除商品
function deleteProduct(id) {
  return request({
    url: `/product/${id}`,
    method: 'DELETE'
  })
}

// 获取用户可见商品详情
function getProductDetail(id) {
  return request({
    url: `/product/${id}`,
    method: 'GET'
  })
}

// 获取商家端商品详情（用于编辑）
function getShopProductDetail(id) {
  return request({
    url: `/product/${id}`,
    method: 'GET'
  })
}

// 上架商品
function publishProduct(id) {
  return request({
    url: `/product/${id}/publish`,
    method: 'PUT'
  })
}

// 下架商品
function unpublishProduct(id) {
  return request({
    url: `/product/${id}/unpublish`,
    method: 'PUT'
  })
}

// 批量操作商品（后端暂无此接口，预留）
// function batchProductOperation(data) {
//   return request({
//     url: '/product/batch',
//     method: 'POST',
//     data
//   })
// }

// 更新库存（通过发布/下架接口实现）
function updateStock(id, data) {
  // 根据库存情况决定是发布还是下架
  const isPublished = data.stock > 0 && data.status === 'published'
  const url = isPublished ? `/product/${id}/publish` : `/product/${id}/unpublish`
  return request({
    url: url,
    method: 'PUT',
    data
  })
}

// 获取用户可见商品列表（基于用户绑定商家）
function getPublicProductList(params = {}) {
  return request({
    url: '/product/list',
    method: 'GET',
    data: params
  })
}

// 获取用户可见热门商品
function getHotProducts(params = {}) {
  return request({
    url: '/product/hot',
    method: 'GET',
    data: params
  })
}

// 获取用户可见推荐商品
function getRecommendProducts(params = {}) {
  return request({
    url: '/product/recommend',
    method: 'GET',
    data: params
  })
}

// 获取轮播图（后端暂无此接口，预留）
// function getBanners(params = {}) {
//   return request({
//     url: '/product/banners',
//     method: 'GET',
//     data: params
//   })
// }

// 获取用户可见商品分类(商家端,需要分页参数)
function getCategories(params = {}) {
  // 确保有默认的分页参数
  const queryParams = {
    page: params.page || 1,
    page_size: params.page_size || 100,
    ...params
  }
  return request({
    url: '/product/categories',
    method: 'GET',
    data: queryParams
  })
}

// 上传图片
function uploadImage(filePath) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token')
    wx.uploadFile({
      url: API_CONFIG.BASE_URL + '/upload/image',
      filePath: filePath,
      name: 'file',
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      formData: {
        category: 'product'
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

module.exports = {
  getProductList,
  getShopProductList,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductDetail,
  getShopProductDetail,
  publishProduct,
  unpublishProduct,
  updateStock,
  getPublicProductList,
  getHotProducts,
  getRecommendProducts,
  getCategories,
  uploadImage
} 