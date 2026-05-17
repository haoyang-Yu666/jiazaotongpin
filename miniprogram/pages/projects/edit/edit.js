const { projectApi } = require('../../../utils/cloud')
const constants = require('../../../utils/constants')

Page({
  data: {
    projectId: '',
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
    submitting: false,
    projectStatus: '',
    showArchiveDialog: false,
    showDeleteDialog: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ projectId: options.id })
      this.loadProject(options.id)
    }
  },

  async loadProject(projectId) {
    try {
      const project = await projectApi.getDetail(projectId)
      const { styleOptions, budgetOptions } = this.data
      this.setData({
        form: {
          name: project.name || '',
          community: project.community || '',
          area: project.area ? String(project.area) : '',
          style: project.style || '',
          budget: project.budget || '',
          address: project.address || ''
        },
        styleIndex: project.style ? styleOptions.indexOf(project.style) : -1,
        budgetIndex: project.budget ? budgetOptions.indexOf(project.budget) : -1,
        projectStatus: project.status
      })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onStyleChange(e) {
    const index = e.detail.value
    this.setData({ styleIndex: index, 'form.style': this.data.styleOptions[index] })
  },

  onBudgetChange(e) {
    const index = e.detail.value
    this.setData({ budgetIndex: index, 'form.budget': this.data.budgetOptions[index] })
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
    return true
  },

  async onSubmit() {
    if (!this.validateForm()) return
    if (this.data.submitting) return

    this.setData({ submitting: true })
    try {
      const form = this.data.form
      await projectApi.update(this.data.projectId, {
        name: form.name.trim(),
        community: form.community.trim(),
        area: Number(form.area),
        style: form.style,
        budget: form.budget,
        address: form.address.trim()
      })
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 归档
  onShowArchiveDialog() {
    this.setData({ showArchiveDialog: true })
  },

  onCancelArchive() {
    this.setData({ showArchiveDialog: false })
  },

  async onConfirmArchive() {
    this.setData({ showArchiveDialog: false })
    try {
      await projectApi.archive(this.data.projectId)
      wx.showToast({ title: '已归档', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (err) {
      wx.showToast({ title: err.message || '归档失败', icon: 'none' })
    }
  },

  // 恢复归档
  async onUnarchive() {
    try {
      await projectApi.unarchive(this.data.projectId)
      wx.showToast({ title: '已恢复', icon: 'success' })
      this.setData({ projectStatus: 'completed' })
    } catch (err) {
      wx.showToast({ title: err.message || '恢复失败', icon: 'none' })
    }
  },

  // 删除
  onShowDeleteDialog() {
    this.setData({ showDeleteDialog: true })
  },

  onCancelDelete() {
    this.setData({ showDeleteDialog: false })
  },

  async onConfirmDelete() {
    this.setData({ showDeleteDialog: false })
    try {
      await projectApi.delete(this.data.projectId)
      wx.showToast({ title: '已删除', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack({ delta: 2 })
      }, 1000)
    } catch (err) {
      wx.showToast({ title: err.message || '删除失败', icon: 'none' })
    }
  }
})
