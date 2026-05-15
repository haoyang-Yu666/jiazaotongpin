App({
  onLaunch: function () {
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-d1gdus2rn111ccb69',
        traceUser: true
      })
    }
  },

  globalData: {
    userInfo: null,
    role: null
  }
})
