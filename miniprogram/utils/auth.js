/**
 * 登录态管理
 */

const STORAGE_KEYS = {
  USER_INFO: 'userInfo',
  ROLE: 'role',
  OPENID: 'openid'
}

const auth = {
  // 保存用户信息到本地
  saveUserInfo(userInfo) {
    wx.setStorageSync(STORAGE_KEYS.USER_INFO, userInfo)
    if (userInfo.role) {
      wx.setStorageSync(STORAGE_KEYS.ROLE, userInfo.role)
    }
    if (userInfo.openid) {
      wx.setStorageSync(STORAGE_KEYS.OPENID, userInfo.openid)
    }
  },

  // 获取本地用户信息
  getUserInfo() {
    return wx.getStorageSync(STORAGE_KEYS.USER_INFO) || null
  },

  // 获取角色
  getRole() {
    return wx.getStorageSync(STORAGE_KEYS.ROLE) || null
  },

  // 是否已登录
  isLoggedIn() {
    const userInfo = this.getUserInfo()
    return !!(userInfo && userInfo.openid)
  },

  // 是否是设计师
  isDesigner() {
    return this.getRole() === 'designer'
  },

  // 是否是客户
  isClient() {
    return this.getRole() === 'client'
  },

  // 清除登录态
  clearAuth() {
    wx.removeStorageSync(STORAGE_KEYS.USER_INFO)
    wx.removeStorageSync(STORAGE_KEYS.ROLE)
    wx.removeStorageSync(STORAGE_KEYS.OPENID)
  },

  // 检查登录，未登录则跳转登录页
  checkLogin() {
    if (!this.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return false
    }
    return true
  }
}

module.exports = auth
