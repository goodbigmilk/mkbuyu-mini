// store/order.js - 订单状态管理

class OrderStore {
  constructor() {
    this.state = {
      orderList: [],
      currentOrder: null,
      loading: false
    }
    this.init()
  }

  // 初始化
  init() {
    // 订单数据不缓存到本地，每次都从服务器获取
  }

  // 获取状态
  getState() {
    return { ...this.state }
  }

  // 设置订单列表
  setOrderList(orderList) {
    this.state.orderList = orderList
  }

  // 设置当前订单
  setCurrentOrder(order) {
    this.state.currentOrder = order
  }

  // 获取订单列表
  getOrderList() {
    return this.state.orderList
  }

  // 获取当前订单
  getCurrentOrder() {
    return this.state.currentOrder
  }

  // 更新订单状态
  updateOrderStatus(orderId, status) {
    this.state.orderList = this.state.orderList.map(order => {
      if (order.id === orderId) {
        return { ...order, status }
      }
      return order
    })

    if (this.state.currentOrder && this.state.currentOrder.id === orderId) {
      this.state.currentOrder = { ...this.state.currentOrder, status }
    }
  }

  // 重置状态
  reset() {
    this.state = {
      orderList: [],
      currentOrder: null,
      loading: false
    }
  }
}

// 创建单例实例
const orderStore = new OrderStore()

module.exports = orderStore 