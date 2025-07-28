// pages/merchant/orders/orders.js
const { store, getStore } = require('../../../store/index.js')
const { formatPrice, formatTime, showToast, showModal } = require('../../../utils/index.js')

Page({
  data: {
    activeTab: 'all',
    orderList: [],
    loading: false,
    currentPage: 1,
    hasMore: true,
    refreshing: false,
    searchKeyword: '',
    selectedOrders: [],
    isEditing: false,
    tabs: [
      { key: 'all', title: '全部', count: 0 },
      { key: 'pending', title: '待付款', count: 0 },
      { key: 'paid', title: '待发货', count: 0 },
      { key: 'shipped', title: '已发货', count: 0 },
      { key: 'completed', title: '已完成', count: 0 },
      { key: 'cancelled', title: '已取消', count: 0 },
      { key: 'refunding', title: '退款中', count: 0 }
    ],
    
    // merchant-tabbar当前选中状态
    tabbarCurrent: 2
  },

  onLoad(options) {
    // 从参数中获取状态筛选
    if (options.status) {
      this.setData({ activeTab: options.status });
    }
    this.loadOrders();
    this.loadOrderCounts();
  },

  onShow() {
    // 设置merchant-tabbar的选中状态（订单页面对应索引2）
    this.setData({
      tabbarCurrent: 2
    });
    
    this.refreshData();
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.refreshData().finally(() => {
      wx.stopPullDownRefresh();
      this.setData({ refreshing: false });
    });
  },

  onReachBottom() {
    this.loadMoreOrders();
  },

  // 刷新数据
  async refreshData() {
    this.setData({ 
      currentPage: 1,
      hasMore: true,
      orderList: []
    });
    await Promise.all([
      this.loadOrders(),
      this.loadOrderCounts()
    ]);
  },

  // 加载订单列表
  async loadOrders() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      const shopStore = getStore('shop');
      const params = {
        page: this.data.currentPage,
        limit: 20,
        status: this.data.activeTab === 'all' ? undefined : this.data.activeTab,
        keyword: this.data.searchKeyword
      };
      
      const response = await shopStore.getShopOrders(params);
      
      if (response.success) {
        const newList = this.data.currentPage === 1 
          ? response.data.list 
          : [...this.data.orderList, ...response.data.list];
        
        this.setData({
          orderList: newList,
          hasMore: response.data.has_more,
          currentPage: this.data.currentPage + 1
        });
      }
    } catch (error) {
      console.error('加载订单列表失败:', error);
      showToast('加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载订单数量统计
  async loadOrderCounts() {
    try {
      const shopStore = getStore('shop');
      const counts = await shopStore.getOrderCounts();
      
      const tabs = this.data.tabs.map(tab => ({
        ...tab,
        count: counts[tab.key] || 0
      }));
      
      this.setData({ tabs });
    } catch (error) {
      console.error('加载订单统计失败:', error);
    }
  },

  // 加载更多订单
  loadMoreOrders() {
    if (!this.data.hasMore || this.data.loading) return;
    this.loadOrders();
  },

  // 标签页切换
  onTabChange(e) {
    const { key } = e.currentTarget.dataset;
    if (key === this.data.activeTab) return;
    
    this.setData({ 
      activeTab: key,
      selectedOrders: [],
      isEditing: false
    });
    this.refreshData();
  },

  // 搜索输入
  onSearchChange(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  // 搜索
  onSearch() {
    this.refreshData();
  },

  // 切换编辑模式
  onToggleEdit() {
    this.setData({ 
      isEditing: !this.data.isEditing,
      selectedOrders: []
    });
  },

  // 订单选择
  onOrderSelect(e) {
    const { orderId } = e.currentTarget.dataset;
    const { selectedOrders } = this.data;
    const index = selectedOrders.indexOf(orderId);
    
    if (index > -1) {
      selectedOrders.splice(index, 1);
    } else {
      selectedOrders.push(orderId);
    }
    
    this.setData({ selectedOrders });
  },

  // 批量操作
  async onBatchAction(e) {
    const { action } = e.currentTarget.dataset;
    const { selectedOrders } = this.data;
    
    if (selectedOrders.length === 0) {
      showToast('请选择订单');
      return;
    }
    
    let actionText = '';
    switch (action) {
      case 'ship':
        actionText = '发货';
        break;
      case 'complete':
        actionText = '完成';
        break;
      case 'cancel':
        actionText = '取消';
        break;
    }
    
    const confirmed = await showModal('确认操作', `确定要批量${actionText}选中的${selectedOrders.length}个订单吗？`);
    if (!confirmed) return;
    
    try {
      const shopStore = getStore('shop');
      await shopStore.batchUpdateOrderStatus(selectedOrders, action);
      
      showToast(`批量${actionText}成功`);
      this.refreshData();
      this.setData({ isEditing: false, selectedOrders: [] });
    } catch (error) {
      console.error('批量操作失败:', error);
      showToast('操作失败');
    }
  },

  // 订单点击
  onOrderTap(e) {
    if (this.data.isEditing) return;
    
    const { order } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/merchant/orders/detail/detail?id=${order.id}`
    });
  },

  // 更新订单状态
  async onUpdateOrderStatus(e) {
    e.stopPropagation();
    const { order, status } = e.currentTarget.dataset;
    
    let actionText = '';
    switch (status) {
      case 'shipped':
        actionText = '发货';
        break;
      case 'completed':
        actionText = '完成';
        break;
      case 'cancelled':
        actionText = '取消';
        break;
    }
    
    const confirmed = await showModal('确认操作', `确定要${actionText}订单"${order.order_no}"吗？`);
    if (!confirmed) return;
    
    try {
      const shopStore = getStore('shop');
      await shopStore.updateOrderStatus(order.id, status);
      
      // 更新列表中的订单状态
      const orderList = this.data.orderList.map(item => {
        if (item.id === order.id) {
          return { ...item, status };
        }
        return item;
      });
      
      this.setData({ orderList });
      showToast(`${actionText}成功`);
      
      // 重新加载统计数据
      this.loadOrderCounts();
    } catch (error) {
      console.error('更新订单状态失败:', error);
      showToast('操作失败');
    }
  },

  // 查看物流
  onViewExpress(e) {
    e.stopPropagation();
    const { order } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/common/express/express?orderNo=${order.order_no}`
    });
  },

  // 联系买家
  onContactBuyer(e) {
    e.stopPropagation();
    const { order } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/merchant/chat/chat?userId=${order.user_id}&orderNo=${order.order_no}`
    });
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'pending': '待付款',
      'paid': '待发货',
      'shipped': '已发货',
      'completed': '已完成',
      'cancelled': '已取消',
      'refunding': '退款中',
      'refunded': '已退款'
    };
    return statusMap[status] || status;
  },

  // 获取状态颜色
  getStatusColor(status) {
    const colorMap = {
      'pending': '#ff9800',
      'paid': '#1989fa',
      'shipped': '#4caf50',
      'completed': '#4caf50',
      'cancelled': '#969799',
      'refunding': '#f44336',
      'refunded': '#969799'
    };
    return colorMap[status] || '#969799';
  },

  // 工具方法
  formatPrice,
  formatTime
});