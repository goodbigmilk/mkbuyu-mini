// pages/merchant/group-pricing/group-pricing.js
const { showToast, showModal } = require('../../../utils/index.js')
const { userGroups: userGroupsApi, product: productApi } = require('../../../api/index.js')

Page({
  data: {
    groupId: '',  // 改为字符串类型,避免大数精度丢失
    groupName: '',
    priceList: [],
    allProductList: [],
    loading: false,
    refreshing: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    total: 0,
    showAddDialog: false,
    showBatchDialog: false,
    showProductSearchDialog: false, // 商品搜索添加对话框
    selectedProducts: [],
    searchKeyword: '',
    
    // 批量删除相关
    isBatchMode: false,
    selectedPrices: [],
    
    // 单个定价表单
    formData: {
      product_id: '',
      price: '',
      start_time: '',
      end_time: ''
    },
    selectedProductName: '', // 选中产品的名称
    editingPrice: null,
    
    // 批量定价表单
    batchFormData: {
      pricingMode: 'fixed', // 定价模式：'fixed' 固定价格，'percentage' 百分比定价
      price: '0.00',
      percentage: '100', // 百分比，默认100%（原价）
      start_time: '',
      end_time: ''
    },
    
    // 全选商品状态
    allProductsSelected: false,
    
    // merchant-tabbar当前选中状态 
    tabbarCurrent: 3
  },

  onLoad(options) {
    const { groupId, groupName } = options
    // 保持 groupId 为字符串，避免大数精度丢失
    this.setData({
      groupId: String(groupId),  // 确保为字符串类型
      groupName: decodeURIComponent(groupName || '')
    })
    
    this.loadPriceList()
  },

  onShow() {
    // 设置merchant-tabbar的选中状态
    this.setData({
      tabbarCurrent: 3
    })
  },

  onPullDownRefresh() {
    this.refreshData()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({
      refreshing: true,
      page: 1,
      hasMore: true
    })
    
    try {
      await this.loadPriceList(true)
    } finally {
      this.setData({ refreshing: false })
      wx.stopPullDownRefresh()
    }
  },

  // 加载定价列表
  async loadPriceList(reset = false) {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const page = reset ? 1 : this.data.page
      const res = await userGroupsApi.getGroupProductPrices(this.data.groupId, {
        page,
        page_size: this.data.pageSize
      })
      
      if (res.code === 200) {
        // 1. 先处理res.data可能为null的情况（设置默认空对象）
        const data = res.data || {};
        // 2. 解构时给list/total设默认值，同时校验list是否为数组（非数组则转为空数组）
        const { list = [], total = 0 } = data;
        const safeList = Array.isArray(list) ? list : []; // 关键：确保list是数组

        console.log('后端返回的定价列表:', safeList)
        // 为每个定价项添加计算好的字段（用safeList代替list）
        const processedList = safeList.map(item => {
          console.log('处理定价项:', item.product_name, 'group_pricing_id:', item.group_pricing_id)
          return {
            ...item,
            // 使用后端返回的product对象，如果没有则构建一个
            product: item.product || {
              id: item.product_id,
              name: item.product_name,
              price: item.origin_price, // 原价
              originalPrice: item.origin_price, // 原价
              description: '', // 后端没有返回描述，设为空字符串
              images: item.main_image ? [item.main_image] : [] // 使用后端返回的main_image字段
            },
            discountRate: item.origin_price > 0 && item.price > 0
                ? ((item.origin_price - item.price) / item.origin_price * 100).toFixed(1)
                : '0.0',
            isSelected: false, // 初始化选中状态
            // 确保价格数据正确
            originalPrice: item.origin_price || 0,
            groupPrice: item.price || 0,
            // 确保 group_pricing_id 被正确传递
            group_pricing_id: item.group_pricing_id
          }
        });
        const priceList = reset ? processedList : [...this.data.priceList, ...processedList];
        this.setData({
          priceList,
          total,
          page: page + 1,
          hasMore: priceList.length < total,
          // 重置批量选择状态
          selectedPrices: []
        });
      } else {
        throw new Error(res.message || '获取定价列表失败')
      }
    } catch (error) {
      console.error('获取定价列表失败:', error)
      showToast(error.message || '获取定价列表失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载更多
  loadMore() {
    this.loadPriceList()
  },

  // 显示添加定价对话框
  async showAddDialog() {
    await this.loadAllProducts()
    this.setData({
      showAddDialog: true,
      editingPrice: null,
      selectedProductName: '',
      formData: {
        product_id: '',
        price: '0.00',
        start_time: '',
        end_time: ''
      }
    })
  },

  // 显示编辑定价对话框
  showEditDialog(e) {
    const { price } = e.currentTarget.dataset
    console.log("编辑定价数据:", price)
    this.setData({
      showAddDialog: true,
      editingPrice: price,
      selectedProductName: price.product?.name || price.product_name || '',
      formData: {
        product_id: price.product_id,
        price: (price.price / 100).toFixed(2), // 分转元
        start_time: price.start_time || '',
        end_time: price.end_time || ''
      }
    })
  },

  // 显示批量定价对话框
  async showBatchDialog() {
    await this.loadAllProducts()
    this.setData({
      showBatchDialog: true,
      selectedProducts: [],
      allProductsSelected: false,
      batchFormData: {
        pricingMode: 'fixed',
        price: '0.00',
        percentage: '100',
        start_time: '',
        end_time: ''
      }
    })
  },

  // 显示商品搜索添加对话框
  async showProductSearchDialog() {
    await this.loadAllProducts()
    this.setData({
      showProductSearchDialog: true,
      selectedProducts: [],
      searchKeyword: ''
    })
  },

  // 加载所有商品列表
  async loadAllProducts() {
    try {
      const params = {
        page: 1,
        page_size: 100 // 暂时加载较多商品，实际可分页
      }
      
      // 如果有搜索关键词，添加到参数中
      if (this.data.searchKeyword && this.data.searchKeyword.trim()) {
        params.keyword = this.data.searchKeyword.trim()
      }
      
      const res = await productApi.getProductList(params)
      
      if (res.code === 200) {
        const productList = res.data.items || []
        
        // 获取当前分组已有的商品ID列表
        const existingProductIds = this.data.priceList.map(price => price.product_id)
        
        // 过滤掉已在分组中的商品，避免重复(使用product_id业务ID)
        const filteredProducts = productList.filter(product => 
          !existingProductIds.includes(product.product_id)
        )
        
        // 为每个商品添加选中状态
        const processedProducts = filteredProducts.map(product => ({
          ...product,
          isSelected: this.data.selectedProducts.some(p => p.product_id === product.product_id)
        }))
        
        this.setData({
          allProductList: processedProducts
        })
      }
    } catch (error) {
      console.error('获取商品列表失败:', error)
      showToast('获取商品列表失败')
    }
  },

  // 关闭对话框
  closeDialog() {
    this.setData({
      showAddDialog: false,
      showBatchDialog: false,
      showProductSearchDialog: false, // 关闭商品搜索对话框
      editingPrice: null,
      selectedProductName: '',
      formData: {
        product_id: '',
        price: '0.00',
        start_time: '',
        end_time: ''
      },
      selectedProducts: [],
      allProductsSelected: false,
      batchFormData: {
        pricingMode: 'fixed',
        price: '0.00',
        percentage: '100',
        start_time: '',
        end_time: ''
      },
      searchKeyword: ''
    })
  },

  // 表单输入处理
  onFormInput(e) {
    const { field, type } = e.currentTarget.dataset

    // 检查field是否存在
    if (!field) {
      console.error('缺少data-field属性')
      return
    }

    // 对于van-field的input事件，值直接就是e.detail
    const value = e.detail

    console.log('表单输入:', field, value, type) // 调试日志
    
    // 根据type决定更新哪个表单数据
    if (type === 'batch') {
      this.setData({
        [`batchFormData.${field}`]: value
      })
    } else {
      this.setData({
        [`formData.${field}`]: value
      })
    }
  },

  // 选择商品
  onSelectProduct(e) {
    const { value } = e.detail
    this.setData({
      'formData.product_id': value
    })
  },

  // 显示商品选择器
  async showProductSelector() {
    await this.loadAllProducts()
    
    const productOptions = this.data.allProductList.map(product => ({
      text: product.name,
      value: product.product_id
    }))
    
    wx.showActionSheet({
      itemList: productOptions.map(option => option.text),
      success: (res) => {
        const selectedProduct = this.data.allProductList[res.tapIndex]
        this.setData({
          'formData.product_id': selectedProduct.product_id,
          selectedProductName: selectedProduct.name
        })
      }
    })
  },

  // 搜索商品
  onSearchProduct(e) {
    const keyword = e.detail.value
    this.setData({ searchKeyword: keyword })
  },

  // 点击搜索按钮
  onSearchClick() {
    this.loadAllProducts()
  },

  // 选择/取消选择商品（批量）
  toggleProductSelection(e) {
    const { product } = e.currentTarget.dataset
    const { selectedProducts, allProductList } = this.data
    const index = selectedProducts.findIndex(p => p.product_id === product.product_id)
    
    if (index > -1) {
      selectedProducts.splice(index, 1)
    } else {
      selectedProducts.push(product)
    }
    
    // 更新产品列表中的选中状态
    const updatedProductList = allProductList.map(p => ({
      ...p,
      isSelected: selectedProducts.some(sp => sp.product_id === p.product_id)
    }))
    
    // 检查是否全选
    const allSelected = updatedProductList.length > 0 && selectedProducts.length === updatedProductList.length
    
    this.setData({ 
      selectedProducts: [...selectedProducts],
      allProductList: updatedProductList,
      allProductsSelected: allSelected
    })
  },

  // 切换全选商品状态（批量定价对话框）
  toggleSelectAllProducts() {
    const { allProductList, allProductsSelected } = this.data
    
    if (allProductsSelected) {
      // 取消全选
      const updatedProductList = allProductList.map(product => ({
        ...product,
        isSelected: false
      }))
      
      this.setData({
        selectedProducts: [],
        allProductList: updatedProductList,
        allProductsSelected: false
      })
    } else {
      // 全选
      const updatedProductList = allProductList.map(product => ({
        ...product,
        isSelected: true
      }))
      
      this.setData({
        selectedProducts: [...allProductList],
        allProductList: updatedProductList,
        allProductsSelected: true
      })
    }
  },

  // 定价模式切换处理
  onPricingModeChange(e) {
    const pricingMode = e.detail
    console.log('定价模式切换到:', pricingMode)
    
    this.setData({
      'batchFormData.pricingMode': pricingMode,
      // 切换模式时重置相关值
      'batchFormData.price': '0.00',
      'batchFormData.percentage': '100'
    })
  },

  // 提交单个定价表单
  async submitForm() {
    const { formData, editingPrice, groupId, priceList } = this.data
    
    if (!formData.product_id) {
      showToast('请选择商品')
      return
    }
    
    if (!formData.price || isNaN(formData.price) || parseFloat(formData.price) <= 0) {
      showToast('请输入有效的价格')
      return
    }
    
    // 检查是否重复（仅在新增时检查）
    if (!editingPrice) {
      const existingPrice = priceList.find(price => String(price.product_id) === String(formData.product_id))
      if (existingPrice) {
        showToast('该商品已存在定价，请直接编辑')
        return
      }
    }
    
    try {
      // 直接使用字符串product_id，后端会自动转换为int64
      const data = {
        group_id: groupId,
        product_id: formData.product_id,
        price: Math.round(parseFloat(formData.price) * 100), // 元转分
        start_time: formData.start_time || undefined,
        end_time: formData.end_time || undefined
      }
      
      if (editingPrice) {
        // 编辑定价 - 使用group_pricing_id(字符串类型)
        await userGroupsApi.updateGroupProductPrice(editingPrice.group_pricing_id, {
          product_id: data.product_id, // 添加商品ID
          price: data.price,
          start_time: data.start_time,
          end_time: data.end_time
        })
        showToast('更新成功')
      } else {
        // 创建定价
        await userGroupsApi.createGroupProductPrice(data)
        showToast('创建成功')
      }
      
      this.closeDialog()
      this.refreshData()
    } catch (error) {
      console.error('操作失败:', error)
      showToast(error.message || '操作失败')
    }
  },

  // 提交批量定价表单
  async submitBatchForm() {
    const { batchFormData, selectedProducts, groupId, priceList } = this.data
    
    if (selectedProducts.length === 0) {
      showToast('请选择商品')
      return
    }
    
    // 根据定价模式验证输入
    if (batchFormData.pricingMode === 'fixed') {
      if (!batchFormData.price || isNaN(batchFormData.price) || parseFloat(batchFormData.price) <= 0) {
        showToast('请输入有效的价格')
        return
      }
    } else if (batchFormData.pricingMode === 'percentage') {
      if (!batchFormData.percentage || isNaN(batchFormData.percentage) || parseFloat(batchFormData.percentage) <= 0) {
        showToast('请输入有效的百分比')
        return
      }
      if (parseFloat(batchFormData.percentage) > 1000) {
        showToast('百分比不能超过1000%')
        return
      }
    }
    
    // 检查是否有重复商品
    const existingProductIds = priceList.map(price => price.product_id)
    const duplicateProducts = selectedProducts.filter(product => 
      existingProductIds.includes(product.product_id)
    )
    
    if (duplicateProducts.length > 0) {
      const duplicateNames = duplicateProducts.map(p => p.name).join('、')
      showToast(`以下商品已存在定价：${duplicateNames}`)
      return
    }
    
    try {
      let products
      
      if (batchFormData.pricingMode === 'fixed') {
        // 固定价格模式
        products = selectedProducts.map(product => ({
          product_id: product.product_id,
          price: Math.round(parseFloat(batchFormData.price) * 100) // 元转分
        }))
      } else {
        // 百分比定价模式
        const percentage = parseFloat(batchFormData.percentage) / 100 // 转换为小数
        products = selectedProducts.map(product => ({
          product_id: product.product_id,
          price: Math.round(product.price * percentage) // 原价 * 百分比
        }))
      }
      
      const data = {
        group_id: groupId,
        products,
        start_time: batchFormData.start_time || undefined,
        end_time: batchFormData.end_time || undefined
      }
      
      await userGroupsApi.batchCreateGroupProductPrice(data)
      showToast(`批量创建成功（${batchFormData.pricingMode === 'percentage' ? '百分比定价' : '固定定价'}）`)
      
      this.closeDialog()
      this.refreshData()
    } catch (error) {
      console.error('批量创建失败:', error)
      showToast(error.message || '批量创建失败')
    }
  },

  // 一键添加选中商品（使用原价）
  async addSelectedProductsWithOriginalPrice() {
    const { selectedProducts, groupId, priceList } = this.data
    
    if (selectedProducts.length === 0) {
      showToast('请选择商品')
      return
    }
    
    // 检查是否有重复商品
    const existingProductIds = priceList.map(price => price.product_id)
    const duplicateProducts = selectedProducts.filter(product => 
      existingProductIds.includes(product.product_id)
    )
    
    if (duplicateProducts.length > 0) {
      const duplicateNames = duplicateProducts.map(p => p.name).join('、')
      showToast(`以下商品已存在定价：${duplicateNames}`)
      return
    }
    
    try {
      const data = {
        group_id: groupId,
        products: selectedProducts.map(product => ({
          product_id: product.product_id,
          price: product.price // 使用商品原价
        }))
        // 不设置时间限制，永久有效
      }
      
      await userGroupsApi.batchCreateGroupProductPrice(data)
      showToast(`成功添加 ${selectedProducts.length} 个商品到分组`)
      
      this.closeDialog()
      this.refreshData()
    } catch (error) {
      console.error('添加商品失败:', error)
      showToast(error.message || '添加商品失败')
    }
  },

  // 删除定价
  async deletePrice(e) {
    const { price } = e.currentTarget.dataset
    
    const confirmed = await showModal('删除确认', `确定要删除商品"${price.product?.name || '未知商品'}"的定价吗？`)
    if (!confirmed) return
    
    try {
      // 使用group_pricing_id(字符串类型)
      await userGroupsApi.deleteGroupProductPrice(price.group_pricing_id)
      showToast('删除成功')
      this.refreshData()
    } catch (error) {
      console.error('删除失败:', error)
      showToast(error.message || '删除失败')
    }
  },

  // 切换定价状态
  async togglePriceStatus(e) {
    const { price } = e.currentTarget.dataset
    const newStatus = price.status === 1 ? 2 : 1
    
    try {
      // 使用group_pricing_id(字符串类型)
      await userGroupsApi.updateGroupProductPrice(price.group_pricing_id, {
        price: price.price,
        start_time: price.start_time,
        end_time: price.end_time,
        status: newStatus
      })
      
      showToast(newStatus === 1 ? '已启用' : '已禁用')
      this.refreshData()
    } catch (error) {
      console.error('状态更新失败:', error)
      showToast(error.message || '状态更新失败')
    }
  },
  
  // 切换批量模式
  toggleBatchMode() {
    const isBatchMode = !this.data.isBatchMode
    
    // 退出批量模式时重置选中状态
    if (!isBatchMode) {
      const updatedPriceList = this.data.priceList.map(price => ({
        ...price,
        isSelected: false
      }))
      
      this.setData({
        isBatchMode,
        selectedPrices: [],
        priceList: updatedPriceList
      })
    } else {
      // 进入批量模式时也重置选中状态
      this.setData({
        isBatchMode,
        selectedPrices: []
      })
    }
  },

  // 全选/取消全选
  toggleSelectAll() {
    const { priceList, selectedPrices } = this.data
    const isAllSelected = selectedPrices.length === priceList.length
    
    if (isAllSelected) {
      // 取消全选
      const updatedPriceList = priceList.map(price => ({
        ...price,
        isSelected: false
      }))
      
      this.setData({
        selectedPrices: [],
        priceList: updatedPriceList
      })
    } else {
      // 全选
      const updatedPriceList = priceList.map(price => ({
        ...price,
        isSelected: true
      }))
      
      this.setData({
        selectedPrices: [...priceList],
        priceList: updatedPriceList
      })
    }
  },

  // 选择/取消选择定价项（批量删除模式）
  togglePriceSelection(e) {
    if (!this.data.isBatchMode) return
    
    const { price } = e.currentTarget.dataset
    const { selectedPrices, priceList } = this.data
    // 使用group_pricing_id(业务ID字符串)进行比较
    const index = selectedPrices.findIndex(p => p.group_pricing_id === price.group_pricing_id)
    
    if (index > -1) {
      selectedPrices.splice(index, 1)
    } else {
      selectedPrices.push(price)
    }
    
    // 更新定价列表中的选中状态
    const updatedPriceList = priceList.map(p => ({
      ...p,
      isSelected: selectedPrices.some(sp => sp.group_pricing_id === p.group_pricing_id)
    }))
    
    this.setData({ 
      selectedPrices: [...selectedPrices],
      priceList: updatedPriceList
    })
  },

  // 批量删除选中的定价
  async batchDeleteSelectedPrices() {
    const { selectedPrices } = this.data
    
    if (selectedPrices.length === 0) {
      showToast('请选择要删除的定价')
      return
    }
    
    const confirmed = await showModal('批量删除', `确定要删除选中的 ${selectedPrices.length} 个定价吗？`)
    if (!confirmed) return
    
    try {
      // 批量删除API调用 - 使用group_pricing_id(字符串类型)
      for (const price of selectedPrices) {
        await userGroupsApi.deleteGroupProductPrice(price.group_pricing_id)
      }
      
      showToast('批量删除成功')
      this.setData({
        isBatchMode: false,
        selectedPrices: []
      })
      this.refreshData()
    } catch (error) {
      console.error('批量删除失败:', error)
      showToast(error.message || '批量删除失败')
    }
  },

  // 格式化价格显示
  formatPrice(price) {
    return (price / 100).toFixed(2)
  }
})