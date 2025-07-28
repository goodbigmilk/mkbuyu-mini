// 导入API接口
const productApi = require('../../../api/product')
const cartApi = require('../../../api/cart')

Page({
  data: {
    // 搜索相关
    searchKeyword: '',
    
    // 轮播图
    banners: [],
    
    // 分类
    categories: [],
    
    // 商品列表
    productList: [],
    total: 0,
    
    // 分页
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    loadingMore: false,
    
    // 筛选条件
    categoryFilter: 0,
    priceFilter: '',
    sortType: 'created_desc',
    
    // 筛选选项
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
    this.setData({ loading: true })
    
    try {
      await Promise.all([
        this.loadBanners(),
        this.loadCategories(),
        this.loadProductList(true)
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

  // 刷新数据
  async refreshData() {
    this.setData({ 
      page: 1,
      productList: [],
      hasMore: true
    })
    await this.initPage()
  },

  // 加载轮播图
  async loadBanners() {
    try {
      const res = await productApi.getBanners({ position: 'home' })
      if (res.code === 200) {
        // 处理轮播图数据结构
        const banners = res.data?.items || res.data || []
        this.setData({ banners: Array.isArray(banners) ? banners : [] })
      }
    } catch (error) {
      console.error('加载轮播图失败:', error)
    }
  },

  // 加载分类
  async loadCategories() {
    try {
      const res = await productApi.getCategories()
      if (res.code === 200) {
        // 处理分类数据结构 - 兼容不同的返回格式
        const categoriesData = res.data?.items || res.data || []
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
              value: item.id,
              level: level
            })
            
            if (item.children && item.children.length > 0) {
              addCategoryOptions(item.children, level + 1)
            }
          })
        }
        
        addCategoryOptions(categoryTree)
        
        this.setData({ 
          categories: categoryTree.slice(0, 8), // 首页只显示前8个根分类
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
      categoryMap[category.id] = { ...category, children: [] }
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
    
    this.setData({ [setLoadingKey]: true })
    
    try {
      // 构建查询参数
      const params = {
        page: currentPage,
        page_size: this.data.pageSize,
        status: 1, // 只查询上架商品
        sort: this.data.sortType
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
        const [minPrice, maxPrice] = this.data.priceFilter.split('-').map(Number)
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
        itemsType: typeof res.data?.items,
        isItemsArray: Array.isArray(res.data?.items)
      })
      
      if (res.code === 200) {
        // 处理商品列表数据结构 - 兼容不同的返回格式
        const responseData = res.data || {}
        const newProducts = responseData.items || responseData.list || responseData || []
        const total = responseData.total || 0
        
        // 确保newProducts始终为数组
        const safeNewProducts = Array.isArray(newProducts) ? newProducts : []
        // 确保现有productList也是数组
        const currentProductList = Array.isArray(this.data.productList) ? this.data.productList : []
        const productList = reset ? safeNewProducts : [...currentProductList, ...safeNewProducts]
        
        this.setData({
          productList,
          total: total,
          page: currentPage + 1,
          hasMore: safeNewProducts.length >= this.data.pageSize
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
      this.setData({ [setLoadingKey]: false })
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

  onSearchChange(e) {
    this.setData({ searchKeyword: e.detail })
  },

  onSearchClear() {
    this.setData({ 
      searchKeyword: '',
      page: 1,
      productList: [],
      hasMore: true
    })
    this.loadProductList(true)
  },

  // 筛选功能
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

  // 轮播图点击
  onBannerTap(e) {
    const banner = e.currentTarget.dataset.banner
    if (banner.link_type === 'product' && banner.link_value) {
      // 跳转到商品详情
      wx.navigateTo({
        url: `/pages/user/product/detail/detail?id=${banner.link_value}`
      })
    } else if (banner.link_type === 'category' && banner.link_value) {
      // 筛选该分类商品
      this.setData({ 
        categoryFilter: banner.link_value,
        page: 1,
        productList: [],
        hasMore: true
      })
      this.loadProductList(true)
    } else if (banner.link_type === 'url' && banner.link_value) {
      // 跳转到网页
      wx.navigateTo({
        url: `/pages/webview/webview?url=${encodeURIComponent(banner.link_value)}`
      })
    }
  },

  // 分类点击
  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ 
      categoryFilter: category.id,
      page: 1,
      productList: [],
      hasMore: true
    })
    this.loadProductList(true)
  },

  // 商品点击
  onProductTap(e) {
    const product = e.currentTarget.dataset.product
    wx.navigateTo({
      url: `/pages/user/product/detail/detail?id=${product.id}`
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
      
      const res = await cartApi.addToCart({
        product_id: product.id,
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
    const { searchKeyword, categoryFilter } = this.data
    let path = '/pages/user/home/home'
    const params = []
    
    if (searchKeyword) params.push(`keyword=${encodeURIComponent(searchKeyword)}`)
    if (categoryFilter) params.push(`categoryId=${categoryFilter}`)
    
    if (params.length > 0) {
      path += '?' + params.join('&')
    }
    
    return {
      title: searchKeyword ? `搜索"${searchKeyword}"的商品` : '名酷布语商城',
      path: path,
      imageUrl: this.data.banners.length > 0 ? this.data.banners[0].image_url : ''
    }
  },

  onShareTimeline() {
    return {
      title: '名酷布语商城 - 优质商品等你来',
      imageUrl: this.data.banners.length > 0 ? this.data.banners[0].image_url : ''
    }
  }
}) 