Component({
  properties: {
    current: {
      type: Number,
      value: 0
    }
  },

  data: {
    list: [
      {
        text: '工作台',
        icon: 'chart-trending-o',
        activeIcon: 'chart-trending-o',
        url: '/pages/merchant/dashboard/dashboard'
      },
      {
        text: '商品',
        icon: 'goods-collect-o',
        activeIcon: 'goods-collect-o',
        url: '/pages/merchant/products/products'
      },
      {
        text: '订单',
        icon: 'orders-o',
        activeIcon: 'orders-o',
        url: '/pages/merchant/orders/orders'
      },
      {
        text: '设置',
        icon: 'setting-o',
        activeIcon: 'setting-o',
        url: '/pages/merchant/settings/settings'
      }
    ]
  },

  methods: {
    onChange(event) {
      const index = event.detail;
      const url = this.data.list[index].url;
      
      // 检查当前页面
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const currentRoute = '/' + currentPage.route;
      
      // 如果点击的是当前页面，不做任何操作
      if (currentRoute === url) {
        return;
      }
      
      // 使用redirectTo而不是navigateTo，避免页面栈堆积
      wx.redirectTo({
        url: url,
        fail: () => {
          // 如果redirectTo失败，使用navigateTo
          wx.navigateTo({
            url: url
          });
        }
      });
    }
  }
}); 