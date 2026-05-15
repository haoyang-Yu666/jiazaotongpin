const auth = require('../../utils/auth')

Page({
  data: {},

  onShow() {
    if (auth.isLoggedIn()) {
      wx.switchTab({
        url: '/pages/projects/list/list'
      })
    }
  },

  onRoleSelect(e) {
    var role = e.currentTarget.dataset.role
    wx.setStorageSync('role', role)
    wx.redirectTo({
      url: '/pages/login/login?role=' + role
    })
  }
})
