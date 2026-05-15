const { projectApi } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')
const constants = require('../../../utils/constants')

Page({
  data: {
    form: {
      name: '',
      community: '',
      area: '',
      style: '',
      budget: '',
      address: ''
    },
    styleOptions: constants.STYLE_OPTIONS,
    budgetOptions: constants.BUDGET_OPTIONS,
    styleIndex: -1,
    budgetIndex: -1,
    submitting: false
  },

  onLoad() {
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [`form.${field}`]: e.detail.value
    })
  },

  onStyleChange(e) {
    const index = e.detail.value
    this.setData({
      styleIndex: index,
      'form.style': this.data.styleOptions[index]
    })
  },

  onBudgetChange(e) {
    const index = e.detail.value
    this.setData({
      budgetIndex: index,
      'form.budget': this.data.budgetOptions[index]
    })
  },

  validateForm() {
    const { name, community, area } = this.data.form
    if (!name || !name.trim()) {
      wx.showToast({ title: '请输入项目名称', icon: 'none' })
      return false
    }
    if (!community || !community.trim()) {
      wx.showToast({ title: '请输入小区名称', icon: 'none' })
      return false
    }
    if (!area || !area.trim()) {
      wx.showToast({ title: '请输入面积', icon: 'none' })
      return false
    }
    if (isNaN(Number(area)) || Number(area) <= 0) {
      wx.showToast({ title: '请输入有效的面积', icon: 'none' })
      return false
    }
    return true
  },

  async onSubmit() {
    if (!this.validateForm()) return
    if (this.data.submitting) return

    this.setData({ submitting: true })

    try {
      const form = this.data.form
      await projectApi.create({
        name: form.name.trim(),
        community: form.community.trim(),
        area: Number(form.area),
        style: form.style,
        budget: form.budget,
        address: form.address.trim()
      })

      wx.showToast({ title: '创建成功', icon: 'success' })

      setTimeout(() => {
        wx.navigateBack()
      }, 1000)
    } catch (err) {
      console.error('创建项目失败:', err)
      wx.showToast({ title: err.message || '创建失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
