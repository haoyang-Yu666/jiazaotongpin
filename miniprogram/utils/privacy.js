/**
 * 隐私协议授权工具
 *
 * 微信要求涉及用户隐私的 API（chooseImage、chooseMedia、getLocation 等）
 * 必须在调用前完成隐私授权。本工具封装授权检查逻辑。
 */

const privacy = {
  _cachedSetting: null,

  /**
   * 确保隐私已授权，未授权则弹出授权弹窗
   * @returns {Promise<boolean>} true=已授权可继续, false=授权被拒绝
   */
  async ensureAuthorized() {
    try {
      // 先查是否需要授权
      const setting = await wx.getPrivacySetting()
      this._cachedSetting = setting

      if (!setting.needAuthorization) {
        // 无需授权，直接放行
        return true
      }

      // 需要授权，拉起隐私弹窗
      return new Promise((resolve) => {
        // 监听隐私接口需要授权的事件（用户点击"同意"后触发）
        const handleAgree = () => {
          wx.offPrivacyAuthorization(handleAgree)
          resolve(true)
        }

        wx.onPrivacyAuthorization(handleAgree)

        // 调用 requirePrivacyAuthorize 触发弹窗
        wx.requirePrivacyAuthorize({
          success: () => {
            // 已授权（理论上走到这里时 handleAgree 已触发）
            resolve(true)
          },
          fail: () => {
            wx.offPrivacyAuthorization(handleAgree)
            wx.showToast({ title: '需要同意隐私协议后才能使用', icon: 'none' })
            resolve(false)
          }
        })
      })
    } catch (err) {
      // API 可能不可用（低版本），降级放行
      console.warn('privacy check failed, fallback to allow:', err)
      return true
    }
  }
}

module.exports = privacy
