// pages/merchant/settings/settings.js
const { store, getStore } = require('../../../store/index.js')
const { showToast, showModal } = require('../../../utils/index.js')

Page({
  data: {
    userInfo: {},
    shopInfo: {},
    todayStats: {
      orderCount: 0,
      sales: 0,
      viewCount: 0
    },
    
    // merchant-tabbar当前选中状态
    tabbarCurrent: 3,
    
    menuGroups: [
      {
        title: '店铺管理',
        items: [
          { key: 'shop-info', icon: 'shop-o', title: '店铺信息', desc: '店铺基本信息设置' },
          { key: 'product-categories', icon: 'label-o', title: '商品分类', desc: '管理店铺商品分类' },
          { key: 'shop-decoration', icon: 'brush-o', title: '店铺装修', desc: '自定义店铺页面' },
          { key: 'shop-notice', icon: 'volume-o', title: '店铺公告', desc: '发布店铺公告' }
        ]
      },
      {
        title: '数据分析',
        items: [
          { key: 'sales-analysis', icon: 'bar-chart-o', title: '销售分析', desc: '查看销售数据' },
          { key: 'customer-analysis', icon: 'user-circle-o', title: '客户分析', desc: '客户行为数据' },
          { key: 'product-analysis', icon: 'goods-collect-o', title: '商品分析', desc: '商品销售情况' }
        ]
      },
      {
        title: '营销工具',
        items: [
          { key: 'coupons', icon: 'coupon-o', title: '优惠券', desc: '创建和管理优惠券' },
          { key: 'activities', icon: 'gift-o', title: '营销活动', desc: '秒杀、拼团等活动' },
          { key: 'live-stream', icon: 'video-o', title: '直播带货', desc: '开启直播销售' }
        ]
      },
      {
        title: '客服工具',
        items: [
          { key: 'customer-service', icon: 'service-o', title: '客服中心', desc: '处理客户咨询' },
          { key: 'reviews', icon: 'comment-o', title: '评价管理', desc: '查看和回复评价' },
          { key: 'complaints', icon: 'warning-o', title: '投诉处理', desc: '处理客户投诉' }
        ]
      },
      {
        title: '财务管理',
        items: [
          { key: 'finance', icon: 'balance-o', title: '财务账户', desc: '查看账户余额' },
          { key: 'withdraw', icon: 'cash-o', title: '提现管理', desc: '申请资金提现' },
          { key: 'bills', icon: 'bill-o', title: '账单明细', desc: '查看收支明细' }
        ]
      },
      {
        title: '系统设置',
        items: [
          { key: 'account', icon: 'user-o', title: '账号设置', desc: '修改密码等' },
          { key: 'notification', icon: 'bell-o', title: '消息通知', desc: '通知设置' },
          { key: 'help', icon: 'question-o', title: '帮助中心', desc: '使用说明和常见问题' }
        ]
      }
    ]
  },

  onLoad() {
    this.loadUserInfo();
    this.loadShopInfo();
    this.loadTodayStats();
  },

  onShow() {
    // 设置merchant-tabbar的选中状态（设置页面对应索引3）
    this.setData({
      tabbarCurrent: 3
    });
    
    this.refreshData();
  },

  onPullDownRefresh() {
    this.refreshData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 刷新数据
  async refreshData() {
    await Promise.all([
      this.loadUserInfo(),
      this.loadShopInfo(),
      this.loadTodayStats()
    ]);
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const userStore = getStore('user');
      const userInfo = userStore.getUserInfo();
      this.setData({ userInfo });
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  },

  // 加载店铺信息
  async loadShopInfo() {
    try {
      const shopStore = getStore('shop');
      await shopStore.loadShopInfo();
      const shopInfo = shopStore.getShopInfo();
      this.setData({ shopInfo });
    } catch (error) {
      console.error('加载店铺信息失败:', error);
    }
  },

  // 加载今日统计
  async loadTodayStats() {
    try {
      const shopStore = getStore('shop');
      const stats = await shopStore.getTodayStats();
      this.setData({ 
        todayStats: {
          orderCount: stats.orderCount || 0,
          sales: stats.sales || 0,
          viewCount: stats.viewCount || 0
        }
      });
    } catch (error) {
      console.error('加载今日统计失败:', error);
    }
  },

  // 菜单项点击
  onMenuTap(e) {
    const { key } = e.currentTarget.dataset;
    
    switch (key) {
      case 'shop-info':
        wx.navigateTo({
          url: '/pages/merchant/shop/info/info'
        });
        break;
      case 'product-categories':
        wx.navigateTo({
          url: '/pages/merchant/categories/categories'
        });
        break;
      case 'shop-decoration':
        wx.navigateTo({
          url: '/pages/merchant/shop/decoration/decoration'
        });
        break;
      case 'shop-notice':
        wx.navigateTo({
          url: '/pages/merchant/shop/notice/notice'
        });
        break;
      case 'sales-analysis':
        wx.navigateTo({
          url: '/pages/merchant/analytics/sales/sales'
        });
        break;
      case 'customer-analysis':
        wx.navigateTo({
          url: '/pages/merchant/analytics/customer/customer'
        });
        break;
      case 'product-analysis':
        wx.navigateTo({
          url: '/pages/merchant/analytics/product/product'
        });
        break;
      case 'coupons':
        wx.navigateTo({
          url: '/pages/merchant/marketing/coupons/coupons'
        });
        break;
      case 'activities':
        wx.navigateTo({
          url: '/pages/merchant/marketing/activities/activities'
        });
        break;
      case 'live-stream':
        wx.navigateTo({
          url: '/pages/merchant/marketing/live/live'
        });
        break;
      case 'customer-service':
        wx.navigateTo({
          url: '/pages/merchant/service/chat/chat'
        });
        break;
      case 'reviews':
        wx.navigateTo({
          url: '/pages/merchant/service/reviews/reviews'
        });
        break;
      case 'complaints':
        wx.navigateTo({
          url: '/pages/merchant/service/complaints/complaints'
        });
        break;
      case 'finance':
        wx.navigateTo({
          url: '/pages/merchant/finance/account/account'
        });
        break;
      case 'withdraw':
        wx.navigateTo({
          url: '/pages/merchant/finance/withdraw/withdraw'
        });
        break;
      case 'bills':
        wx.navigateTo({
          url: '/pages/merchant/finance/bills/bills'
        });
        break;
      case 'account':
        wx.navigateTo({
          url: '/pages/merchant/account/account'
        });
        break;
      case 'notification':
        wx.navigateTo({
          url: '/pages/merchant/notification/notification'
        });
        break;
      case 'help':
        wx.navigateTo({
          url: '/pages/merchant/help/help'
        });
        break;
      default:
        showToast('功能开发中');
    }
  },

  // 编辑店铺信息
  onEditShop() {
    wx.navigateTo({
      url: '/pages/merchant/shop/info/info'
    });
  },

  // 查看完整数据
  onViewFullStats() {
    wx.navigateTo({
      url: '/pages/merchant/analytics/overview/overview'
    });
  },

  // 切换用户端
  onSwitchToUser() {
    wx.reLaunch({
      url: '/pages/user/home/home'
    });
  },

  // 退出登录
  async onLogout() {
    const confirmed = await showModal('确认退出', '确定要退出登录吗？');
    if (!confirmed) return;
    
    try {
      const userStore = getStore('user');
      await userStore.logout();
      
      wx.reLaunch({
        url: '/pages/auth/login/login'
      });
    } catch (error) {
      console.error('退出登录失败:', error);
      showToast('退出失败');
    }
  },

  // 联系客服
  onContactService() {
    wx.navigateTo({
      url: '/pages/common/service/service'
    });
  },

  // 意见反馈
  onFeedback() {
    wx.navigateTo({
      url: '/pages/common/feedback/feedback'
    });
  },

  // 关于我们
  onAbout() {
    wx.navigateTo({
      url: '/pages/common/about/about'
    });
  }
});