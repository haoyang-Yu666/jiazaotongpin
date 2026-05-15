const { progressApi } = require('../../../utils/cloud')
const upload = require('../../../utils/upload')
const constants = require('../../../utils/constants')

Page({
  data: {
    projectId: '',
    currentStage: 0,
    milestones: constants.MILESTONES,
    selectedStage: 0,
    content: '',
    imageList: [],
    submitting: false,
    maxImages: constants.MAX_IMAGES
  },

  onLoad(options) {
    const currentStage = parseInt(options.currentStage) || 0
    this.setData({
      projectId: options.projectId || '',
      currentStage,
      selectedStage: currentStage
    })
  },

  onStageChange(e) {
    this.setData({ selectedStage: Number(e.detail.value) })
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  onImageChange(e) {
    this.setData({ imageList: e.detail.imageList })
  },

  async onSubmit() {
    const { content, selectedStage, projectId, imageList } = this.data

    if (!content.trim()) {
      wx.showToast({ title: '请输入日志内容', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    try {
      // 上传图片
      let imageIds = []
      if (imageList.length > 0) {
        imageIds = await upload.uploadImages(
          imageList,
          `logs/${projectId}/${Date.now()}`
        )
      }

      await progressApi.createLog({
        projectId,
        content: content.trim(),
        milestoneId: selectedStage,
        images: imageIds
      })

      wx.showToast({ title: '发布成功', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1000)
    } catch (err) {
      console.error('发布失败:', err)
      this.setData({ submitting: false })
      wx.showToast({ title: '发布失败', icon: 'none' })
    }
  }
})
