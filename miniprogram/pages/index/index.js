Page({
  data: {},

  onLoad() {
    console.log('index page loaded')
  },

  onRoleSelect(e) {
    var role = e.currentTarget.dataset.role
    console.log('selected role:', role)
    wx.setStorageSync('role', role)
    wx.redirectTo({
      url: '/pages/login/login?role=' + role
    })
  }
})
