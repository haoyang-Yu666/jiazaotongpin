const { questionnaireApi } = require('../../../utils/cloud')
const format = require('../../../utils/format')
const auth = require('../../../utils/auth')

Page({
  data: {
    projectId: '',
    questionnaire: null,
    loading: true,
    reviewed: false,
    submitTime: '',
    isDesigner: false
  },

  onLoad(options) {
    const projectId = options.projectId
    if (!projectId) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1000)
      return
    }
    this.setData({ projectId, isDesigner: auth.isDesigner() })
    this.loadQuestionnaire()
  },

  async loadQuestionnaire() {
    this.setData({ loading: true })
    try {
      const res = await questionnaireApi.get(this.data.projectId)
      const reviewed = res && res.status === 'reviewed'
      const submitTime = res && res.submitted_at ? format.dateTime(res.submitted_at) : ''

      const qData = (res && res.data) || {}

      // 云函数已用管理员权限将 cloud:// 转为 https:// 临时链接，此处直接使用
      const questionnaire = {
        residents: qData.residents || '',
        familyStructure: qData.family_structure || '',
        coreNeeds: qData.core_needs || [],
        stylePreference: qData.style_preference || '',
        colorPreference: qData.color_preference || '',
        budgetRange: qData.budget_range || '',
        specialRequirements: qData.special_requirements || '',
        specialImages: qData.special_images || [],
        dislikedElements: qData.disliked || '',
        dislikedImages: qData.disliked_images || [],
        rooms: qData.rooms || [],
        snapshotQuestions: (qData.snapshot_questions || []).map((q, i) => ({ ...q, _qi: i })),
        customAnswers: qData.custom_answers || []
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
    console.log('[标记已阅] 点击, projectId:', this.data.projectId)
    try {
      await questionnaireApi.markReviewed(this.data.projectId)
      console.log('[标记已阅] 成功')
      wx.showToast({ title: '已标记已阅', icon: 'success' })
      this.setData({ reviewed: true })
    } catch (err) {
      console.error('[标记已阅] 失败:', err)
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  },

  onPreviewRoomImage(e) {
    const url = e.currentTarget.dataset.url
    const urls = e.currentTarget.dataset.urls
    wx.previewImage({ current: url, urls })
  },

  onEditQuestionnaire() {
    wx.navigateTo({
      url: `/pages/questionnaire/fill/fill?projectId=${this.data.projectId}`
    })
  },

  onImageError(e) {
    console.error('问卷图片加载失败:', e.detail)
  }
})
