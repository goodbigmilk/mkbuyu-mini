const authAPI = require('../../../api/auth.js')
const orderAPI = require('../../../api/order.js')
const { getStore } = require('../../../store/index.js')

Page({
  data: {
    userInfo: {},
    orderShortcuts: [
      { type: 'pending', label: '待付款', icon: 'pending-payment', count: 0 },
      { type: 'paid', label: '待发货', icon: 'tosend', count: 0 },
      { type: 'shipped', label: '待收货', icon: 'send-gift-o', count: 0 },
      { type: 'completed', label: '已完成', icon: 'checked', count: 0 }
    ],
    menuGroups: [
      {
        title: '我的服务',
        items: [
          { key: 'coupon', label: '优惠券', icon: 'coupon-o', extra: '0张' },
          { key: 'points', label: '积分商城', icon: 'gift-card-o' },
          { key: 'wallet', label: '我的钱包', icon: 'balance-o' }
        ]
      },
      {
        title: '购物助手',
        items: [
          { key: 'favorites', label: '我的收藏', icon: 'star-o' },
          { key: 'history', label: '浏览历史', icon: 'clock-o' },
          { key: 'follow', label: '关注店铺', icon: 'shop-o' },
          { key: 'feedback', label: '意见反馈', icon: 'comment-o' }
        ]
      },
      {
        title: '客户服务',
        items: [
          { key: 'service', label: '联系客服', icon: 'service-o' },
          { key: 'help', label: '帮助中心', icon: 'question-o' },
          { key: 'about', label: '关于我们', icon: 'info-o' },
          { key: 'logout', label: '退出登录', icon: 'sign-out' }
        ]
      }
    ],
    isLogin: false
  },

  onLoad() {
    this.checkLoginStatus()
    this.loadUserInfo()
    this.loadOrderCounts()
  },

  onShow() {
    // 每次显示时刷新数据
    this.checkLoginStatus()
    this.loadUserInfo()
    this.loadOrderCounts()
    
    // 更新自定义 tabbar 状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 3
      })
    }
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadUserInfo(),
      this.loadOrderCounts()
    ]).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token')
    this.setData({ isLogin: !!token })
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      if (!this.data.isLogin) {
        this.setData({ 
          userInfo: {
            nickname: '未登录',
            avatar: '/assets/images/default-avatar.png'
          }
        })
        return
      }

      const response = await authAPI.getUserInfo()
      
      if (response.code === 200) {
        const userInfo = response.data
        this.setData({ userInfo })
        
        // 更新本地存储，保留原有的role字段
        const existingUserInfo = wx.getStorageSync('userInfo') || {}
        const updatedUserInfo = {
          ...userInfo,
          role: existingUserInfo.role
        }
        wx.setStorageSync('userInfo', updatedUserInfo)
      } else if (response.code === 401) {
        // token失效，清除登录状态
        this.handleLogout()
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
      // 如果请求失败，使用本地存储的用户信息
      const localUserInfo = wx.getStorageSync('userInfo')
      if (localUserInfo) {
        this.setData({ userInfo: localUserInfo })
      }
    }
  },

  // 加载订单数量
  async loadOrderCounts() {
    try {
      if (!this.data.isLogin) {
        return
      }

      const response = await orderAPI.getOrderStats()
      
      if (response.code === 200) {
        const stats = response.data || {}
        const orderShortcuts = this.data.orderShortcuts.map(item => ({
          ...item,
          count: stats[item.type] || 0
        }))
        
        this.setData({ orderShortcuts })
      }
    } catch (error) {
      console.error('加载订单数量失败:', error)
    }
  },

  // 头像点击
  onAvatarTap() {
    if (!this.data.isLogin) {
      wx.navigateTo({
        url: '/pages/auth/login/login'
      })
    } else {
      wx.navigateTo({
        url: '/pages/user/edit-profile/edit-profile'
      })
    }
  },

  // 统计项点击
  onStatTap(e) {
    const { type } = e.currentTarget.dataset
    
    if (!this.data.isLogin) {
      wx.navigateTo({
        url: '/pages/auth/login/login'
      })
      return
    }
    
    switch (type) {
      case 'points':
        wx.navigateTo({
          url: '/pages/user/points/points'
        })
        break
      case 'coupons':
        wx.navigateTo({
          url: '/pages/user/coupon/coupon'
        })
        break
      case 'favorites':
        wx.navigateTo({
          url: '/pages/user/favorites/favorites'
        })
        break
      case 'history':
        wx.navigateTo({
          url: '/pages/user/history/history'
        })
        break
      default:
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        })
    }
  },

  // 订单快捷入口点击
  onOrderShortcut(e) {
    if (!this.data.isLogin) {
      wx.navigateTo({
        url: '/pages/auth/login/login'
      })
      return
    }

    const { type } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/user/order/order?status=${type}`
    })
  },

  // 查看全部订单
  onOrderMore() {
    if (!this.data.isLogin) {
      wx.navigateTo({
        url: '/pages/auth/login/login'
      })
      return
    }

    wx.navigateTo({
      url: '/pages/user/order/order'
    })
  },

  // 菜单项点击
  onMenuTap(e) {
    const { key } = e.currentTarget.dataset
    
    // 部分功能需要登录
    const needLogin = ['coupon', 'wallet', 'favorites', 'history', 'follow']
    if (needLogin.includes(key) && !this.data.isLogin) {
      wx.navigateTo({
        url: '/pages/auth/login/login'
      })
      return
    }
    
    switch (key) {
      case 'coupon':
        wx.navigateTo({
          url: '/pages/user/coupon/coupon'
        })
        break
      case 'points':
        wx.navigateTo({
          url: '/pages/user/points/points'
        })
        break
      case 'wallet':
        wx.navigateTo({
          url: '/pages/user/wallet/wallet'
        })
        break
      case 'favorites':
        wx.navigateTo({
          url: '/pages/user/favorites/favorites'
        })
        break
      case 'history':
        wx.navigateTo({
          url: '/pages/user/history/history'
        })
        break
      case 'follow':
        wx.navigateTo({
          url: '/pages/user/follow/follow'
        })
        break
      case 'feedback':
        wx.navigateTo({
          url: '/pages/user/feedback/feedback'
        })
        break
      case 'service':
        // 联系客服
        this.contactService()
        break
      case 'help':
        wx.navigateTo({
          url: '/pages/user/help/help'
        })
        break
      case 'about':
        wx.navigateTo({
          url: '/pages/user/about/about'
        })
        break
      case 'logout':
        this.showLogoutConfirm()
        break
      default:
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        })
    }
  },

  // 联系客服
  contactService() {
    wx.makePhoneCall({
      phoneNumber: '400-123-4567',
      fail: () => {
        wx.showModal({
          title: '客服电话',
          content: '400-123-4567',
          showCancel: false
        })
      }
    })
  },

  // 显示退出登录确认
  showLogoutConfirm() {
    if (!this.data.isLogin) {
      return
    }

    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          this.handleLogout()
        }
      }
    })
  },

  // 处理退出登录
  async handleLogout() {
    try {
      // 调用退出登录API
      await authAPI.logout()
    } catch (error) {
      console.error('退出登录失败:', error)
    } finally {
      // 清除本地数据
      wx.removeStorageSync('token')
      wx.removeStorageSync('userInfo')
      
      // 更新页面状态
      this.setData({
        isLogin: false,
        userInfo: {
          nickname: '未登录',
          avatar: '/assets/images/default-avatar.png'
        },
        orderShortcuts: this.data.orderShortcuts.map(item => ({
          ...item,
          count: 0
        }))
      })
      
      wx.showToast({
        title: '已退出登录',
        icon: 'success',
        duration: 1500
      })
      
      // 延迟跳转到登录页面
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/auth/login/login'
        })
      }, 1500)
    }
  },

  // 设置
  onSettings() {
    wx.navigateTo({
      url: '/pages/user/settings/settings'
    })
  }
}) 