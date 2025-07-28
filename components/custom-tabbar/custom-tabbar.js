Component({
  data: {
    active: 0,
    list: [
      {
        text: '首页',
        icon: 'home-o',
        activeIcon: 'home-o',
        url: '/pages/user/home/home'
      },
      {
        text: '购物车',
        icon: 'cart-o',
        activeIcon: 'cart-o',
        url: '/pages/user/cart/cart'
      },
      {
        text: '订单',
        icon: 'orders-o',
        activeIcon: 'orders-o',
        url: '/pages/user/order/order'
      },
      {
        text: '我的',
        icon: 'user-o',
        activeIcon: 'user-o',
        url: '/pages/user/profile/profile'
      }
    ]
  },

  attached() {
    this.setData({
      active: this.getCurrentPageIndex()
    });
  },

  methods: {
    onChange(event) {
      const index = event.detail;
      const url = this.data.list[index].url;
      
      wx.switchTab({
        url: url
      });
    },

    getCurrentPageIndex() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const route = '/' + currentPage.route;

      return this.data.list.findIndex(item => item.url === route) || 0;
    }
  }
}); 