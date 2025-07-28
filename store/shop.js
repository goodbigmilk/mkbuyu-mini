const shopApi = require('../api/shop.js');

class ShopStore {
  constructor() {
    this.shopInfo = null;
    this.shopProducts = [];
    this.shopOrders = [];
    this.statistics = {
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      thisMonthRevenue: 0,
      thisMonthOrders: 0,
      todayOrders: 0,
      yesterdayOrders: 0
    };
    this.analytics = {
      salesTrend: [],
      orderTrend: [],
      productSales: [],
      categoryStats: []
    };
    this.followers = [];
    this.reviews = [];
    this.filters = {
      orderStatus: null,
      productStatus: null,
      dateRange: null,
      startDate: null,
      endDate: null
    };
    this.pagination = {
      products: { page: 1, pageSize: 20, total: 0, hasMore: true },
      orders: { page: 1, pageSize: 20, total: 0, hasMore: true },
      followers: { page: 1, pageSize: 20, total: 0, hasMore: true }
    };
    this.loading = false;
    this.submitting = false;
    this.error = null;
  }

  // 获取店铺信息
  async fetchShopInfo() {
    try {
      this.loading = true;
      this.error = null;
      
      const response = await shopApi.getShopInfo();
      this.shopInfo = response.data;
      
      return response;
    } catch (error) {
      console.error('获取店铺信息失败:', error);
      this.error = error.message || '获取店铺信息失败';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  // 更新店铺信息
  async updateShopInfo(shopData) {
    try {
      this.submitting = true;
      this.error = null;
      
      const response = await shopApi.updateShopInfo(shopData);
      this.shopInfo = { ...this.shopInfo, ...response.data };
      
      return response;
    } catch (error) {
      console.error('更新店铺信息失败:', error);
      this.error = error.message || '更新店铺信息失败';
      throw error;
    } finally {
      this.submitting = false;
    }
  }

  // 获取店铺商品列表
  async fetchShopProducts(options = {}) {
    try {
      this.loading = true;
      this.error = null;
      
      const params = {
        page: options.page || this.pagination.products.page,
        pageSize: options.pageSize || this.pagination.products.pageSize,
        status: options.status || this.filters.productStatus,
        ...options
      };

      const response = await shopApi.getShopProducts(params);
      
      if (options.page === 1 || !options.page) {
        this.shopProducts = response.data.products || [];
      } else {
        this.shopProducts = [...this.shopProducts, ...(response.data.products || [])];
      }
      
      this.pagination.products = {
        page: response.data.page || 1,
        pageSize: response.data.pageSize || 20,
        total: response.data.total || 0,
        hasMore: (response.data.page || 1) * (response.data.pageSize || 20) < (response.data.total || 0)
      };
      
      return response;
    } catch (error) {
      console.error('获取店铺商品失败:', error);
      this.error = error.message || '获取店铺商品失败';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  // 获取店铺订单列表
  async fetchShopOrders(options = {}) {
    try {
      this.loading = true;
      this.error = null;
      
      const params = {
        page: options.page || this.pagination.orders.page,
        pageSize: options.pageSize || this.pagination.orders.pageSize,
        status: options.status || this.filters.orderStatus,
        startDate: this.filters.startDate,
        endDate: this.filters.endDate,
        ...options
      };

      const response = await shopApi.getShopOrders(params);
      
      if (options.page === 1 || !options.page) {
        this.shopOrders = response.data.orders || [];
      } else {
        this.shopOrders = [...this.shopOrders, ...(response.data.orders || [])];
      }
      
      this.pagination.orders = {
        page: response.data.page || 1,
        pageSize: response.data.pageSize || 20,
        total: response.data.total || 0,
        hasMore: (response.data.page || 1) * (response.data.pageSize || 20) < (response.data.total || 0)
      };
      
      return response;
    } catch (error) {
      console.error('获取店铺订单失败:', error);
      this.error = error.message || '获取店铺订单失败';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  // 获取店铺统计数据
  async fetchShopStatistics(timeRange = '30d') {
    try {
      const response = await shopApi.getShopStatistics({ timeRange });
      this.statistics = { ...this.statistics, ...response.data };
      
      return response;
    } catch (error) {
      console.error('获取店铺统计失败:', error);
      throw error;
    }
  }

  // 获取店铺分析数据
  async fetchShopAnalytics(timeRange = '30d') {
    try {
      const response = await shopApi.getShopAnalytics({ timeRange });
      this.analytics = { ...this.analytics, ...response.data };
      
      return response;
    } catch (error) {
      console.error('获取店铺分析数据失败:', error);
      throw error;
    }
  }

  // 商品管理：上架商品
  async publishProduct(productId) {
    try {
      this.submitting = true;
      this.error = null;
      
      const response = await shopApi.publishProduct(productId);
      
      // 更新本地商品状态
      this.updateProductStatus(productId, 'active');
      
      return response;
    } catch (error) {
      console.error('上架商品失败:', error);
      this.error = error.message || '上架商品失败';
      throw error;
    } finally {
      this.submitting = false;
    }
  }

  // 商品管理：下架商品
  async unpublishProduct(productId) {
    try {
      this.submitting = true;
      this.error = null;
      
      const response = await shopApi.unpublishProduct(productId);
      
      // 更新本地商品状态
      this.updateProductStatus(productId, 'inactive');
      
      return response;
    } catch (error) {
      console.error('下架商品失败:', error);
      this.error = error.message || '下架商品失败';
      throw error;
    } finally {
      this.submitting = false;
    }
  }

  // 商品管理：删除商品
  async deleteProduct(productId) {
    try {
      this.submitting = true;
      this.error = null;
      
      const response = await shopApi.deleteProduct(productId);
      
      // 从本地列表中移除
      this.shopProducts = this.shopProducts.filter(product => product.id !== productId);
      
      return response;
    } catch (error) {
      console.error('删除商品失败:', error);
      this.error = error.message || '删除商品失败';
      throw error;
    } finally {
      this.submitting = false;
    }
  }

  // 商品管理：批量操作
  async batchProductOperation(productIds, operation) {
    try {
      this.submitting = true;
      this.error = null;
      
      const response = await shopApi.batchProductOperation(productIds, operation);
      
      // 更新本地商品状态
      productIds.forEach(productId => {
        if (operation === 'publish') {
          this.updateProductStatus(productId, 'active');
        } else if (operation === 'unpublish') {
          this.updateProductStatus(productId, 'inactive');
        } else if (operation === 'delete') {
          this.shopProducts = this.shopProducts.filter(product => product.id !== productId);
        }
      });
      
      return response;
    } catch (error) {
      console.error('批量操作失败:', error);
      this.error = error.message || '批量操作失败';
      throw error;
    } finally {
      this.submitting = false;
    }
  }

  // 订单管理：发货
  async shipOrder(orderId, shippingData) {
    try {
      this.submitting = true;
      this.error = null;
      
      const response = await shopApi.shipOrder(orderId, shippingData);
      
      // 更新本地订单状态
      this.updateOrderStatus(orderId, 'shipped');
      
      return response;
    } catch (error) {
      console.error('发货失败:', error);
      this.error = error.message || '发货失败';
      throw error;
    } finally {
      this.submitting = false;
    }
  }

  // 订单管理：处理退款
  async processRefund(orderId, approved, reason = '') {
    try {
      this.submitting = true;
      this.error = null;
      
      const response = await shopApi.processRefund(orderId, { approved, reason });
      
      // 更新本地订单状态
      this.updateOrderStatus(orderId, approved ? 'refunded' : 'paid');
      
      return response;
    } catch (error) {
      console.error('处理退款失败:', error);
      this.error = error.message || '处理退款失败';
      throw error;
    } finally {
      this.submitting = false;
    }
  }

  // 获取店铺粉丝列表
  async fetchShopFollowers(options = {}) {
    try {
      this.loading = true;
      this.error = null;
      
      const params = {
        page: options.page || this.pagination.followers.page,
        pageSize: options.pageSize || this.pagination.followers.pageSize,
        ...options
      };

      const response = await shopApi.getShopFollowers(params);
      
      if (options.page === 1 || !options.page) {
        this.followers = response.data.followers || [];
      } else {
        this.followers = [...this.followers, ...(response.data.followers || [])];
      }
      
      this.pagination.followers = {
        page: response.data.page || 1,
        pageSize: response.data.pageSize || 20,
        total: response.data.total || 0,
        hasMore: (response.data.page || 1) * (response.data.pageSize || 20) < (response.data.total || 0)
      };
      
      return response;
    } catch (error) {
      console.error('获取店铺粉丝失败:', error);
      this.error = error.message || '获取店铺粉丝失败';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  // 获取店铺评价列表
  async fetchShopReviews(options = {}) {
    try {
      this.loading = true;
      this.error = null;
      
      const response = await shopApi.getShopReviews(options);
      
      if (options.page === 1 || !options.page) {
        this.reviews = response.data.reviews || [];
      } else {
        this.reviews = [...this.reviews, ...(response.data.reviews || [])];
      }
      
      return response;
    } catch (error) {
      console.error('获取店铺评价失败:', error);
      this.error = error.message || '获取店铺评价失败';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  // 店铺设置：营业状态
  async toggleShopStatus() {
    try {
      this.submitting = true;
      this.error = null;
      
      const response = await shopApi.toggleShopStatus();
      
      if (this.shopInfo) {
        this.shopInfo.isOpen = !this.shopInfo.isOpen;
      }
      
      return response;
    } catch (error) {
      console.error('切换营业状态失败:', error);
      this.error = error.message || '切换营业状态失败';
      throw error;
    } finally {
      this.submitting = false;
    }
  }

  // 店铺认证
  async verifyShop(verificationData) {
    try {
      this.submitting = true;
      this.error = null;
      
      const response = await shopApi.verifyShop(verificationData);
      
      if (this.shopInfo) {
        this.shopInfo.verificationStatus = 'pending';
      }
      
      return response;
    } catch (error) {
      console.error('店铺认证失败:', error);
      this.error = error.message || '店铺认证失败';
      throw error;
    } finally {
      this.submitting = false;
    }
  }

  // 筛选设置
  setFilters(filters) {
    this.filters = { ...this.filters, ...filters };
  }

  resetFilters() {
    this.filters = {
      orderStatus: null,
      productStatus: null,
      dateRange: null,
      startDate: null,
      endDate: null
    };
  }

  // 应用筛选
  async applyOrderFilters() {
    return this.fetchShopOrders({ page: 1 });
  }

  async applyProductFilters() {
    return this.fetchShopProducts({ page: 1 });
  }

  // 加载更多数据
  async loadMoreProducts() {
    if (!this.pagination.products.hasMore || this.loading) {
      return;
    }
    
    return this.fetchShopProducts({
      page: this.pagination.products.page + 1
    });
  }

  async loadMoreOrders() {
    if (!this.pagination.orders.hasMore || this.loading) {
      return;
    }
    
    return this.fetchShopOrders({
      page: this.pagination.orders.page + 1
    });
  }

  async loadMoreFollowers() {
    if (!this.pagination.followers.hasMore || this.loading) {
      return;
    }
    
    return this.fetchShopFollowers({
      page: this.pagination.followers.page + 1
    });
  }

  // 内部方法：更新商品状态
  updateProductStatus(productId, status) {
    this.shopProducts = this.shopProducts.map(product => 
      product.id === productId ? { ...product, status } : product
    );
  }

  // 内部方法：更新订单状态
  updateOrderStatus(orderId, status) {
    this.shopOrders = this.shopOrders.map(order => 
      order.id === orderId ? { ...order, status } : order
    );
  }

  // 获取待处理订单数量
  getPendingOrderCount() {
    return this.shopOrders.filter(order => order.status === 'paid').length;
  }

  // 获取待发货订单数量
  getShippingOrderCount() {
    return this.shopOrders.filter(order => order.status === 'paid').length;
  }

  // 获取退款订单数量
  getRefundOrderCount() {
    return this.shopOrders.filter(order => order.status === 'refunding').length;
  }

  // 获取活跃商品数量
  getActiveProductCount() {
    return this.shopProducts.filter(product => product.status === 'active').length;
  }

  // 获取下架商品数量
  getInactiveProductCount() {
    return this.shopProducts.filter(product => product.status === 'inactive').length;
  }

  // 重置所有状态
  reset() {
    this.shopInfo = null;
    this.shopProducts = [];
    this.shopOrders = [];
    this.followers = [];
    this.reviews = [];
    this.statistics = {
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      thisMonthRevenue: 0,
      thisMonthOrders: 0,
      todayOrders: 0,
      yesterdayOrders: 0
    };
    this.analytics = {
      salesTrend: [],
      orderTrend: [],
      productSales: [],
      categoryStats: []
    };
    this.pagination = {
      products: { page: 1, pageSize: 20, total: 0, hasMore: true },
      orders: { page: 1, pageSize: 20, total: 0, hasMore: true },
      followers: { page: 1, pageSize: 20, total: 0, hasMore: true }
    };
    this.resetFilters();
    this.loading = false;
    this.submitting = false;
    this.error = null;
  }

  // 获取当前状态
  getState() {
    return {
      shopInfo: this.shopInfo,
      shopProducts: this.shopProducts,
      shopOrders: this.shopOrders,
      statistics: this.statistics,
      analytics: this.analytics,
      followers: this.followers,
      reviews: this.reviews,
      filters: this.filters,
      pagination: this.pagination,
      loading: this.loading,
      submitting: this.submitting,
      error: this.error
    };
  }
}

// 创建实例
const shopStore = new ShopStore();

module.exports = shopStore; 