const { questionnaireApi } = require('../../../utils/cloud')
const format = require('../../../utils/format')

Page({
  data: {
    projectId: '',
    questionnaire: null,
    loading: true,
    reviewed: false,
    submitTime: ''
  },

  onLoad(options) {
    const projectId = options.projectId
    if (!projectId) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1000)
      return
    }
    this.setData({ projectId })
    this.loadQuestionnaire()
  },

  async loadQuestionnaire() {
    this.setData({ loading: true })
    try {
      const res = await questionnaireApi.get(this.data.projectId)
      const reviewed = res && res.status === 'reviewed'
      const submitTime = res && res.submitted_at ? format.dateTime(res.submitted_at) : ''

      const qData = (res && res.data) || {}
      const questionnaire = {
        residents: qData.residents || '',
        familyStructure: qData.family_structure || '',
        coreNeeds: qData.core_needs || [],
        stylePreference: qData.style_preference || '',
        colorPreference: qData.color_preference || '',
        budgetRange: qData.budget_range || '',
        specialRequirements: qData.special_requirements || '',
        dislikedElements: qData.disliked || '',
        rooms: qData.rooms || []
      }

      this.setData({
        questionnaire,
        loading: false,
        reviewed,
        submitTime
      })
    } catch (err) {
      console.error('加载问卷失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async markReviewed() {
    try {
      await questionnaireApi.markReviewed(this.data.projectId)
      wx.showToast({ title: '已标记已阅', icon: 'success' })
      this.setData({ reviewed: true })
    } catch (err) {
      console.error('标记已阅失败:', err)
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  },

  onPreviewRoomImage(e) {
    const url = e.currentTarget.dataset.url
    const urls = e.currentTarget.dataset.urls
    wx.previewImage({ current: url, urls })
  }
})
