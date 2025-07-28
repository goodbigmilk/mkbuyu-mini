const productStore = require('../../store/product.js');

Component({
  options: {
    addGlobalClass: true
  },

  properties: {
    // 搜索框值
    value: {
      type: String,
      value: ''
    },
    
    // 占位符文本
    placeholder: {
      type: String,
      value: '搜索商品'
    },
    
    // 是否自动聚焦
    focus: {
      type: Boolean,
      value: false
    },
    
    // 是否显示清除按钮
    showClear: {
      type: Boolean,
      value: true
    },
    
    // 是否显示取消按钮
    showCancel: {
      type: Boolean,
      value: true
    },
    
    // 是否显示搜索按钮
    showSearchBtn: {
      type: Boolean,
      value: false
    },
    
    // 是否显示搜索建议
    showSuggestions: {
      type: Boolean,
      value: true
    },
    
    // 是否显示搜索历史
    showHistory: {
      type: Boolean,
      value: true
    },
    
    // 是否显示热门搜索
    showHotSearches: {
      type: Boolean,
      value: true
    },
    
    // 搜索建议列表
    suggestions: {
      type: Array,
      value: []
    },
    
    // 热门搜索列表
    hotSearches: {
      type: Array,
      value: ['手机', '耳机', '数码', '服装', '美妆', '食品']
    },
    
    // 自定义样式类
    customClass: {
      type: String,
      value: ''
    }
  },

  data: {
    focused: false,
    history: [],
    suggestionsTimer: null
  },

  lifetimes: {
    attached() {
      this.loadSearchHistory();
    },
    
    detached() {
      // 清除定时器
      if (this.data.suggestionsTimer) {
        clearTimeout(this.data.suggestionsTimer);
      }
    }
  },

  methods: {
    // 输入事件
    onInput(e) {
      const value = e.detail.value;
      this.setData({ value });
      
      this.triggerEvent('input', { value });
      
      // 防抖获取搜索建议
      if (this.data.showSuggestions && value.trim()) {
        this.debounceGetSuggestions(value);
      }
    },

    // 确认搜索
    onConfirm(e) {
      const value = e.detail.value.trim();
      if (value) {
        this.performSearch(value);
      }
    },

    // 聚焦事件
    onFocus() {
      this.setData({ focused: true });
      this.triggerEvent('focus');
    },

    // 失焦事件
    onBlur() {
      // 延迟设置，防止点击建议项时立即失焦
      setTimeout(() => {
        this.setData({ focused: false });
        this.triggerEvent('blur');
      }, 200);
    },

    // 清除输入
    onClear() {
      this.setData({ value: '' });
      this.triggerEvent('clear');
      this.triggerEvent('input', { value: '' });
    },

    // 取消搜索
    onCancel() {
      this.setData({ 
        value: '', 
        focused: false 
      });
      this.triggerEvent('cancel');
    },

    // 搜索按钮点击
    onSearch() {
      const value = this.data.value.trim();
      if (value) {
        this.performSearch(value);
      }
    },

    // 建议项点击
    onSuggestionTap(e) {
      const keyword = e.currentTarget.dataset.keyword;
      this.setData({ value: keyword });
      this.performSearch(keyword);
    },

    // 历史记录点击
    onHistoryTap(e) {
      const keyword = e.currentTarget.dataset.keyword;
      this.setData({ value: keyword });
      this.performSearch(keyword);
    },

    // 热门搜索点击
    onHotSearchTap(e) {
      const keyword = e.currentTarget.dataset.keyword;
      this.setData({ value: keyword });
      this.performSearch(keyword);
    },

    // 清除搜索历史
    onClearHistory() {
      wx.showModal({
        title: '确认清除',
        content: '确定要清除所有搜索历史吗？',
        success: (res) => {
          if (res.confirm) {
            this.setData({ history: [] });
            this.saveSearchHistory();
            productStore.clearSearchHistory();
          }
        }
      });
    },

    // 执行搜索
    performSearch(keyword) {
      if (!keyword || !keyword.trim()) return;

      const trimmedKeyword = keyword.trim();
      
      // 添加到搜索历史
      this.addToHistory(trimmedKeyword);
      
      // 触发搜索事件
      this.triggerEvent('search', { keyword: trimmedKeyword });
      
      // 失焦
      this.setData({ focused: false });
    },

    // 防抖获取搜索建议
    debounceGetSuggestions(keyword) {
      // 清除之前的定时器
      if (this.data.suggestionsTimer) {
        clearTimeout(this.data.suggestionsTimer);
      }

      // 设置新的定时器
      const timer = setTimeout(() => {
        this.getSuggestions(keyword);
      }, 300);

      this.setData({ suggestionsTimer: timer });
    },

    // 获取搜索建议
    async getSuggestions(keyword) {
      if (!keyword || !keyword.trim()) {
        this.setData({ suggestions: [] });
        return;
      }

      try {
        // 这里可以调用API获取搜索建议
        // 暂时使用模拟数据
        const suggestions = this.generateMockSuggestions(keyword);
        this.setData({ suggestions });
        
        this.triggerEvent('suggestions', { 
          keyword, 
          suggestions 
        });
      } catch (error) {
        console.error('获取搜索建议失败:', error);
      }
    },

    // 生成模拟搜索建议
    generateMockSuggestions(keyword) {
      const mockSuggestions = [
        '手机壳', '手机充电器', '手机贴膜', '手机支架',
        '耳机有线', '耳机无线', '耳机蓝牙', '耳机降噪',
        '数码相机', '数码配件', '数码存储', '数码周边',
        '服装男装', '服装女装', '服装童装', '服装内衣',
        '美妆护肤', '美妆彩妆', '美妆工具', '美妆套装',
        '食品零食', '食品饮料', '食品保健', '食品生鲜'
      ];

      return mockSuggestions
        .filter(item => item.includes(keyword))
        .slice(0, 5);
    },

    // 添加到搜索历史
    addToHistory(keyword) {
      let history = [...this.data.history];
      
      // 移除已存在的相同关键词
      history = history.filter(item => item !== keyword);
      
      // 添加到开头
      history.unshift(keyword);
      
      // 最多保存10条
      history = history.slice(0, 10);
      
      this.setData({ history });
      this.saveSearchHistory();
    },

    // 加载搜索历史
    loadSearchHistory() {
      try {
        const history = wx.getStorageSync('searchHistory');
        if (history) {
          this.setData({ history: JSON.parse(history) });
        }
      } catch (error) {
        console.error('加载搜索历史失败:', error);
      }
    },

    // 保存搜索历史
    saveSearchHistory() {
      try {
        wx.setStorageSync('searchHistory', JSON.stringify(this.data.history));
      } catch (error) {
        console.error('保存搜索历史失败:', error);
      }
    }
  }
}); 