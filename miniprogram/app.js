App({
  onLaunch: function () {
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-d1gdus2rn111ccb69',
        traceUser: true
      })
    }
    this.fetchUnreadCount()
  },

  onShow: function () {
    this.fetchUnreadCount()
  },

  async fetchUnreadCount() {
    try {
      const { notificationApi } = require('./utils/cloud')
      const res = await notificationApi.getUnreadCount()
      const count = res && res.count ? res.count : 0
      if (count > 0) {
        wx.setTabBarBadge({ index: 1, text: String(count > 99 ? '99+' : count) })
      } else {
        wx.removeTabBarBadge({ index: 1 })
      }
    } catch (err) {
      // 未登录或通知集合不存在，静默忽略
    }
  },

  globalData: {
    userInfo: null,
    role: null
  }
})
