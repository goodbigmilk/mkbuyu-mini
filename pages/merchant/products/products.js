// pages/merchant/products/products.js
const { getProductList, publishProduct, unpublishProduct, deleteProduct } = require('../../../api/product')
const { getAllCategories } = require('../../../api/category')
const { showToast, showModal, formatTime, throttle } = require('../../../utils/index')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 搜索关键词
    searchKeyword: '',
    
    // 商品列表
    productList: [],
    loading: false,
    loadingMore: false,
    
    // 分页参数
    page: 1,
    pageSize: 20,
    hasMore: true,
    
    // 筛选参数
    statusFilter: 0, // 0全部, 1上架, 2下架
    categoryFilter: 0, // 0全部
    sortType: 'created_desc', // 排序方式
    
    // 筛选选项
    statusOptions: [
      { text: '全部状态', value: 0 },
      { text: '已上架', value: 1 },
      { text: '已下架', value: 2 }
    ],
    categoryOptions: [
      { text: '全部分类', value: 0 }
    ],
    sortOptions: [
      { text: '创建时间倒序', value: 'created_desc' },
      { text: '创建时间正序', value: 'created_asc' },
      { text: '价格从低到高', value: 'price_asc' },
      { text: '价格从高到低', value: 'price_desc' },
      { text: '销量从高到低', value: 'sales_desc' },
      { text: '库存从高到低', value: 'stock_desc' }
    ],
    
    // 统计数据
    totalCount: 0,
    onSaleCount: 0, 
    offSaleCount: 0,
    stockWarningCount: 0,

    // merchant-tabbar当前选中状态
    tabbarCurrent: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('商品列表页面加载')
    this.loadCategories()
    this.loadProductList()
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 设置merchant-tabbar的选中状态（商品页面对应索引1）
    this.setData({
      tabbarCurrent: 1
    });
    
    // 从编辑页面返回时刷新列表
    if (this.data.productList.length > 0) {
      this.refreshList()
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.refreshList()
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMore()
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  // 加载分类选项
  async loadCategories() {
    try {
      const response = await getAllCategories()
      if (response.code === 200 && response.data) {
        // 构建分类树结构
        const categoryTree = this.buildCategoryTree(response.data)
        
        // 构建层级分类选项
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
          categoryOptions
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
  async loadProductList(isLoadMore = false) {
    if (this.data.loading || (isLoadMore && this.data.loadingMore)) {
      return
    }

    try {
      this.setData({
        [isLoadMore ? 'loadingMore' : 'loading']: true
      })

      const params = {
        page: isLoadMore ? this.data.page + 1 : 1,
        page_size: this.data.pageSize,
        keyword: this.data.searchKeyword || undefined,
        status: this.data.statusFilter || undefined,
        category_id: this.data.categoryFilter || undefined,
        sort: this.data.sortType
      }

      // 清除undefined的参数
      Object.keys(params).forEach(key => {
        if (params[key] === undefined) {
          delete params[key]
        }
      })

      console.log('请求商品列表参数:', params)

      const response = await getProductList(params)
      console.log('商品列表响应:', response)
      console.log('响应数据类型检查:', {
        responseType: typeof response,
        hasData: !!response.data,
        dataType: typeof response.data,
        itemsType: typeof response.data?.items,
        isItemsArray: Array.isArray(response.data?.items)
      })

      if (response.code === 200) {
        // 后端返回的是 items，不是 list
        const { items, total, page } = response.data
        
        // 确保 items 是数组
        const safeList = Array.isArray(items) ? items : []
        
        let productList
        if (isLoadMore) {
          // 确保 this.data.productList 是数组
          const currentList = Array.isArray(this.data.productList) ? this.data.productList : []
          productList = [...currentList, ...safeList]
        } else {
          productList = safeList
        }
        
        // 计算统计数据
        const stats = this.calculateStats(safeList, total)
        
        this.setData({
          productList,
          page,
          totalCount: total,
          hasMore: safeList.length === this.data.pageSize,
          ...stats
        })
      } else {
        showToast(response.message || '加载失败')
      }
    } catch (error) {
      console.error('加载商品列表失败:', error)
      showToast('加载失败，请重试')
    } finally {
      this.setData({
        loading: false,
        loadingMore: false
      })
      
      // 停止下拉刷新
      wx.stopPullDownRefresh()
    }
  },

  // 计算统计数据
  calculateStats(currentList, total) {
    let onSaleCount = 0
    let offSaleCount = 0
    let stockWarningCount = 0

    // 确保 currentList 是数组
    const safeList = Array.isArray(currentList) ? currentList : []

    // 基于当前显示的列表计算（实际应该从后端获取准确统计）
    safeList.forEach(item => {
      if (item && item.status === 1) {
        onSaleCount++
      } else if (item && item.status === 2) {
        offSaleCount++
      }
      
      if (item && item.stock <= 5) { // 假设库存预警阈值为5
        stockWarningCount++
      }
    })

    return {
      onSaleCount,
      offSaleCount,
      stockWarningCount
    }
  },

  // 刷新列表
  refreshList() {
    this.setData({
      page: 1,
      hasMore: true
    })
    this.loadProductList()
  },

  // 加载更多
  loadMore() {
    this.loadProductList(true)
  },

  // 搜索功能（防抖处理）
  onSearch: throttle(function(e) {
    this.setData({
      searchKeyword: e.detail
    })
    this.refreshList()
  }, 500),

  // 搜索输入变化
  onSearchChange(e) {
    this.setData({
      searchKeyword: e.detail
    })
  },

  // 清除搜索
  onSearchClear() {
    this.setData({
      searchKeyword: ''
    })
    this.refreshList()
  },

  // 状态筛选变化
  onStatusChange(e) {
    this.setData({
      statusFilter: e.detail
    })
    this.refreshList()
  },

  // 分类筛选变化
  onCategoryChange(e) {
    this.setData({
      categoryFilter: e.detail
    })
    this.refreshList()
  },

  // 排序变化
  onSortChange(e) {
    this.setData({
      sortType: e.detail
    })
    this.refreshList()
  },

  // 商品点击
  onProductTap(e) {
    const { item } = e.currentTarget.dataset
    // 这里可以跳转到商品详情或编辑页面
    this.onEditProduct(item)
  },

  // 操作按钮点击处理
  onActionTap(e) {
    
    const { item, action } = e.currentTarget.dataset
    
    console.log('操作按钮点击:', { item, action })
    
    switch (action) {
      case 'publish':
        this.onToggleStatus(item, action)
        break
      case 'unpublish':
        this.onToggleStatus(item, action)
        break
      case 'edit':
        this.onEditProduct(item)
        break
      case 'delete':
        this.onDeleteProduct(item)
        break
      default:
        console.warn('未知操作:', action)
    }
  },

  // 编辑商品
  onEditProduct(item) {
    console.log('编辑商品:', item)
    
    wx.navigateTo({
      url: `/pages/merchant/products/edit/edit?id=${item.id}`,
      fail: (error) => {
        console.error('跳转编辑页面失败:', error)
        showToast('页面跳转失败')
      }
    })
  },

  // 添加商品
  onAddProduct() {
    console.log('添加商品')
    wx.navigateTo({
      url: '/pages/merchant/products/edit/edit',
      fail: (error) => {
        console.error('跳转添加页面失败:', error)
        showToast('页面跳转失败')
      }
    })
  },

  // 切换商品状态（上架/下架）
  async onToggleStatus(item, action) {
    const isPublish = action === 'publish'
    
    console.log('切换商品状态:', { 
      item, 
      action, 
      isPublish, 
      itemId: item?.id,
      itemStatus: item?.status,
      itemName: item?.name
    })

    // 验证必要参数
    if (!item || !item.id) {
      console.error('商品信息不完整:', item)
      showToast('商品信息不完整，无法操作')
      return
    }
    
    try {
      wx.showLoading({ title: isPublish ? '上架中...' : '下架中...' })
      
      console.log(`开始${isPublish ? '上架' : '下架'}商品:`, {
        productId: item.id,
        productName: item.name,
        currentStatus: item.status,
        targetAction: action
      })
      
      const response = isPublish 
        ? await publishProduct(item.id)
        : await unpublishProduct(item.id)
      
      console.log('切换状态响应:', {
        response,
        responseCode: response?.code,
        responseMessage: response?.message,
        responseData: response?.data
      })
      
      if (response.code === 200) {
        const successMessage = isPublish ? '上架成功' : '下架成功'
        console.log(successMessage, { productId: item.id, productName: item.name })
        showToast(successMessage)
        this.refreshList()
      } else {
        const errorMessage = response.message || '操作失败'
        console.error('操作失败 - 后端返回错误:', {
          code: response.code,
          message: response.message,
          data: response.data,
          productId: item.id
        })
        showToast(errorMessage)
      }
    } catch (error) {
      console.error('切换商品状态失败 - 异常捕获:', {
        error,
        errorMessage: error.message,
        errorStack: error.stack,
        productId: item?.id,
        productName: item?.name,
        action,
        isPublish
      })
      showToast('操作失败，请重试')
    } finally {
      wx.hideLoading()
    }
  },

  // 删除商品
  onDeleteProduct(item) {
    showModal('确认删除', `确定要删除商品"${item.name}"吗？删除后不可恢复。`, async () => {
      try {
        wx.showLoading({ title: '删除中...' })
        
        const response = await deleteProduct(item.id)
        
        if (response.code === 200) {
          showToast('删除成功')
          this.refreshList()
        } else {
          showToast(response.message || '删除失败')
        }
      } catch (error) {
        console.error('删除商品失败:', error)
        showToast('删除失败，请重试')
      } finally {
        wx.hideLoading()
      }
    })
  },

  // 格式化时间
  formatTime
})