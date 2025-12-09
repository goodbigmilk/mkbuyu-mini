// 导入API接口
const productApi = require('../../../api/product')
const cartApi = require('../../../api/cart')
const categoryApi = require('../../../api/category')
const shopApi = require('../../../api/shop')

Page({
  data: {
    // 搜索相关
    searchKeyword: '',
    searchTimer: null,
    
    // 商品列表
    productList: [],
    total: 0,
    noShopMessage: '', // 用户未绑定商家时的提示信息
    
    // 分页
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    loadingMore: false,
    
    // 筛选条件
    shopFilter: '', // 店铺筛选，空字符串表示全部店铺
    categoryFilter: 0,
    priceFilter: '',
    sortType: 'created_desc',
    
    // 筛选选项
    shopOptions: [
      { text: '全部店铺', value: '' }
    ],
    categoryOptions: [
      { text: '全部分类', value: 0 }
    ],
    priceOptions: [
      { text: '价格不限', value: '' },
      { text: '0-50元', value: '0-5000' },
      { text: '50-100元', value: '5000-10000' },
      { text: '100-200元', value: '10000-20000' },
      { text: '200元以上', value: '20000-0' }
    ],
    sortOptions: [
      { text: '综合排序', value: 'created_desc' },
      { text: '销量优先', value: 'sales_desc' },
      { text: '价格升序', value: 'price_asc' },
      { text: '价格降序', value: 'price_desc' }
    ]
  },

  onLoad(options) {
    // 处理分享或扫码进入的参数
    if (options.keyword) {
      this.setData({ searchKeyword: options.keyword })
    }
    if (options.categoryId) {
      this.setData({ categoryFilter: options.categoryId })
    }
    console.log("页面初始化，页面初始化，页面初始化，页面初始化，页面初始化，页面初始化，页面初始化")
    this.initPage()
  },

  onShow() {
    // 每次显示页面时更新tabbar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 0
      })
    }
  },

  onPullDownRefresh() {
    this.refreshData()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMore()
    }
  },

  // 初始化页面
  async initPage() {
    try {
      await Promise.all([
        this.loadBoundShops(),
        this.loadCategories(),
        this.loadProductList()
      ])
    } catch (error) {
      console.error('初始化页面失败:', error)
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  // 加载用户绑定的店铺列表
  async loadBoundShops() {
    try {
      const res = await shopApi.getMyBoundShops()
      if (res.code === 200) {
        const shops = res.data || []
        const shopOptions = [
          { text: '全部店铺', value: '' }
        ]
        
        shops.forEach(shop => {
          shopOptions.push({
            text: shop.shop_name || shop.name,
            value: shop.shop_id
          })
        })
        
        this.setData({ 
          shopOptions,
          boundShops: shops // 保存店铺列表
        })
      }
    } catch (error) {
      console.error('加载店铺列表失败:', error)
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({ 
      page: 1,
      productList: [],
      hasMore: true
    })
    await this.initPage()
  },

  // 加载分类（根据当前选择的店铺）
  async loadCategories() {
    try {
      let res
      // 如果选择了特定店铺，获取该店铺的分类
      if (this.data.shopFilter) {
        res = await categoryApi.getUserCategoriesByShop(this.data.shopFilter)
      } else {
        // 否则获取所有绑定店铺的分类
        res = await categoryApi.getUserAllCategories()
      }
      
      if (res.code === 200) {
        // 处理分类数据结构 - 兼容不同的返回格式
        const categoriesData = (res.data && res.data.items) || res.data || []
        const categories = Array.isArray(categoriesData) ? categoriesData : []
        
        // 构建分类树结构
        const categoryTree = this.buildCategoryTree(categories)
        
        // 更新分类筛选选项，包含层级结构
        const categoryOptions = [
          { text: '全部分类', value: 0 }
        ]
        
        // 递归添加分类选项，显示层级
        const addCategoryOptions = (categoryList, level = 0) => {
          categoryList.forEach(item => {
            const prefix = '　'.repeat(level) // 使用全角空格缩进
            categoryOptions.push({ 
              text: prefix + item.name, 
              value: item.id || item.category_id,
              level: level
            })
            
            if (item.children && item.children.length > 0) {
              addCategoryOptions(item.children, level + 1)
            }
          })
        }
        
        addCategoryOptions(categoryTree)
        
        this.setData({ 
          categoryOptions,
          rawCategories: categories // 保存原始分类数据
        })
      }
    } catch (error) {
      console.error('加载分类失败:', error)
    }
  },

  // 构建分类树结构
  buildCategoryTree(categories) {
    const categoryMap = {}
    const rootCategories = []
    
    // 创建分类映射
    categories.forEach(category => {
      categoryMap[category.id] = Object.assign({}, category, { children: [] })
    })
    
    // 构建树结构
    categories.forEach(category => {
      if (category.parent_id === 0 || !categoryMap[category.parent_id]) {
        // 根分类
        rootCategories.push(categoryMap[category.id])
      } else {
        // 子分类
        categoryMap[category.parent_id].children.push(categoryMap[category.id])
      }
    })
    
    return rootCategories
  },

  // 加载商品列表
  async loadProductList(reset = false) {
    if (this.data.loading || this.data.loadingMore) return
    
    const currentPage = reset ? 1 : this.data.page
    const setLoadingKey = reset ? 'loading' : 'loadingMore'
    
    const loadingState = {}
    loadingState[setLoadingKey] = true
    this.setData(loadingState)
    
    try {
      // 构建查询参数
      const params = {
        page: currentPage,
        page_size: this.data.pageSize,
        status: 1, // 只查询上架商品
        sort: this.data.sortType
      }
      
      // 添加店铺筛选
      if (this.data.shopFilter) {
        params.shop_id = this.data.shopFilter
      }
      
      // 添加搜索关键词
      if (this.data.searchKeyword) {
        params.keyword = this.data.searchKeyword
      }
      
      // 添加分类筛选
      if (this.data.categoryFilter && this.data.categoryFilter > 0) {
        params.category_id = parseInt(this.data.categoryFilter)
      }
      
      // 添加价格筛选
      if (this.data.priceFilter) {
        const priceParts = this.data.priceFilter.split('-').map(Number)
        const minPrice = priceParts[0]
        const maxPrice = priceParts[1]
        if (minPrice > 0) params.min_price = minPrice
        if (maxPrice > 0) params.max_price = maxPrice
      }
      
      // 清除undefined的参数
      Object.keys(params).forEach(key => {
        if (params[key] === undefined) {
          delete params[key]
        }
      })
      
      console.log('请求商品列表参数:', params)
      
      const res = await productApi.getPublicProductList(params)
      console.log('商品列表响应:', res)
      console.log('响应数据类型检查:', {
        responseType: typeof res,
        hasData: !!res.data,
        dataType: typeof res.data,
        itemsType: typeof (res.data && res.data.items),
        isItemsArray: Array.isArray(res.data && res.data.items)
      })
      
      if (res.code === 200) {
        // 处理商品列表数据结构 - 兼容不同的返回格式
        const responseData = res.data || {}
        const newProducts = responseData.items || responseData.list || responseData || []
        const total = responseData.total || 0
        const message = responseData.message || '' // 获取后端返回的消息（如未绑定商家提示）
        
        // 确保newProducts始终为数组
        const safeNewProducts = Array.isArray(newProducts) ? newProducts : []
        // 确保现有productList也是数组
        const currentProductList = Array.isArray(this.data.productList) ? this.data.productList : []
        const productList = reset ? safeNewProducts : currentProductList.concat(safeNewProducts)
        
        this.setData({
          productList,
          total: total,
          page: currentPage + 1,
          hasMore: safeNewProducts.length >= this.data.pageSize,
          noShopMessage: message // 设置提示信息
        })
      } else {
        throw new Error(res.message || '加载商品失败')
      }
    } catch (error) {
      console.error('加载商品列表失败:', error)
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      })
    } finally {
      const loadingState = {}
      loadingState[setLoadingKey] = false
      this.setData(loadingState)
    }
  },

  // 加载更多
  loadMore() {
    this.loadProductList(false)
  },

  // 搜索功能
  onSearch() {
    this.setData({ 
      page: 1,
      productList: [],
      hasMore: true
    })
    this.loadProductList(true)
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    this.performSearch() // 实时搜索
  },

  // 实时搜索（防抖）
  performSearch() {
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer)
    }

    this.data.searchTimer = setTimeout(() => {
      this.onSearch()
    }, 500) // 500ms 延迟
  },

  // 清空搜索
  clearSearch() {
    this.setData({
      searchKeyword: ''
    })
    this.performSearch() // 清空后重新加载列表
  },

  // 筛选功能
  onShopFilterChange(e) {
    this.setData({ 
      shopFilter: e.detail,
      categoryFilter: 0, // 切换店铺时重置分类筛选
      page: 1,
      productList: [],
      hasMore: true
    })
    // 重新加载分类和商品列表
    this.loadCategories()
    this.loadProductList(true)
  },

  onCategoryFilterChange(e) {
    this.setData({ 
      categoryFilter: e.detail,
      page: 1,
      productList: [],
      hasMore: true
    })
    this.loadProductList(true)
  },

  onPriceFilterChange(e) {
    this.setData({ 
      priceFilter: e.detail,
      page: 1,
      productList: [],
      hasMore: true
    })
    this.loadProductList(true)
  },

  onSortChange(e) {
    this.setData({ 
      sortType: e.detail,
      page: 1,
      productList: [],
      hasMore: true
    })
    this.loadProductList(true)
  },

  // 商品点击
  onProductTap(e) {
    const product = e.currentTarget.dataset.product
    // 使用product_id业务ID
    const productId = product.product_id
    wx.navigateTo({
      url: `/pages/user/product/detail/detail?id=${productId}`
    })
  },

  // 加入购物车
  async onAddToCart(e) {
    const product = e.currentTarget.dataset.product
    
    // 检查登录状态
    const token = wx.getStorageSync('token')
    if (!token) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/auth/login/login'
            })
          }
        }
      })
      return
    }

    try {
      wx.showLoading({ title: '加入中...' })
      
      // 使用product_id业务ID,后端会自动将字符串转为int64
      const res = await cartApi.addToCart({
        product_id: product.product_id,
        quantity: 1
      })
      
      if (res.code === 200) {
        wx.showToast({
          title: '已加入购物车',
          icon: 'success'
        })
        
        // 触发tabbar购物车数量更新
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
          this.getTabBar().updateCartCount()
        }
      } else {
        throw new Error(res.message || '加入购物车失败')
      }
    } catch (error) {
      console.error('加入购物车失败:', error)
      wx.showToast({
        title: error.message || '加入购物车失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 分享
  onShareAppMessage() {
    const searchKeyword = this.data.searchKeyword
    const categoryFilter = this.data.categoryFilter
    let path = '/pages/user/home/home'
    const params = []
    
    if (searchKeyword) params.push(`keyword=${encodeURIComponent(searchKeyword)}`)
    if (categoryFilter) params.push(`categoryId=${categoryFilter}`)
    
    if (params.length > 0) {
      path += '?' + params.join('&')
    }
    
    return {
      title: searchKeyword ? `搜索"${searchKeyword}"的商品` : '名酷布语商城',
      path: path
    }
  },

  onShareTimeline() {
    return {
      title: '名酷布语商城 - 优质商品等你来'
    }
  },
}) 