const { questionnaireApi } = require('../../../utils/cloud')
const constants = require('../../../utils/constants')

Page({
  data: {
    projectId: '',
    submitting: false,

    // 表单数据
    form: {
      residents: '',
      familyStructure: '',
      coreNeeds: [],
      stylePreference: '',
      styleIndex: -1,
      colorPreference: '',
      budgetRange: '',
      budgetIndex: -1,
      specialRequirements: '',
      dislikedElements: ''
    },

    // 选项数据
    styleOptions: constants.STYLE_OPTIONS,
    budgetOptions: constants.BUDGET_OPTIONS,
    coreNeedsOptions: [
      '收纳空间', '开放式厨房', '智能家居', '儿童房',
      '书房/办公', '宠物友好', '无障碍设计', '环保材料',
      '中央空调', '地暖', '新风系统', '隔音'
    ]
  },

  onLoad(options) {
    const projectId = options.projectId
    if (!projectId) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1000)
      return
    }
    this.setData({ projectId })
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onCoreNeedToggle(e) {
    const need = e.currentTarget.dataset.need
    let coreNeeds = [...this.data.form.coreNeeds]
    const index = coreNeeds.indexOf(need)

    if (index > -1) {
      coreNeeds.splice(index, 1)
    } else {
      coreNeeds.push(need)
    }

    this.setData({ 'form.coreNeeds': coreNeeds })
  },

  onStyleChange(e) {
    const index = e.detail.value
    this.setData({
      'form.styleIndex': index,
      'form.stylePreference': this.data.styleOptions[index]
    })
  },

  onBudgetChange(e) {
    const index = e.detail.value
    this.setData({
      'form.budgetIndex': index,
      'form.budgetRange': this.data.budgetOptions[index]
    })
  },

  validateForm() {
    const { residents, familyStructure } = this.data.form
    if (!residents || !residents.trim()) {
      wx.showToast({ title: '请填写常住人口', icon: 'none' })
      return false
    }
    if (!familyStructure || !familyStructure.trim()) {
      wx.showToast({ title: '请填写家庭结构', icon: 'none' })
      return false
    }
    return true
  },

  async onSubmit() {
    if (!this.validateForm()) return
    if (this.data.submitting) return

    this.setData({ submitting: true })

    try {
      const { form } = this.data
      await questionnaireApi.submit({
        projectId: this.data.projectId,
        residents: form.residents.trim(),
        familyStructure: form.familyStructure.trim(),
        coreNeeds: form.coreNeeds,
        stylePreference: form.stylePreference,
        colorPreference: form.colorPreference.trim(),
        budgetRange: form.budgetRange,
        specialRequirements: form.specialRequirements.trim(),
        disliked: form.dislikedElements.trim()
      })

      wx.showToast({ title: '提交成功', icon: 'success' })

      setTimeout(() => {
        wx.navigateBack()
      }, 1000)
    } catch (err) {
      console.error('提交问卷失败:', err)
      wx.showToast({ title: err.message || '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
