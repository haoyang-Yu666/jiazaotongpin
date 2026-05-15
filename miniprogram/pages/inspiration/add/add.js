const { inspirationApi } = require('../../../utils/cloud')
const upload = require('../../../utils/upload')
const constants = require('../../../utils/constants')

Page({
  data: {
    projectId: '',
    imageList: [],
    description: '',
    submitting: false,
    maxImages: constants.MAX_IMAGES
  },

  onLoad(options) {
    this.setData({ projectId: options.projectId || '' })
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value })
  },

  onImageChange(e) {
    this.setData({ imageList: e.detail.imageList })
  },

  async onSubmit() {
    if (this.data.imageList.length === 0) {
      wx.showToast({ title: '请选择至少一张图片', icon: 'none' })
      return
    }

    if (this.data.submitting) return
    this.setData({ submitting: true })

    try {
      const imageIds = await upload.uploadImages(
        this.data.imageList,
        `inspirations/${this.data.projectId}/${Date.now()}`
      )

      await inspirationApi.add({
        projectId: this.data.projectId,
        images: imageIds,
        description: this.data.description.trim()
      })

      wx.showToast({ title: '添加成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (err) {
      console.error('添加灵感失败:', err)
      this.setData({ submitting: false })
      wx.showToast({ title: '添加失败', icon: 'none' })
    }
  }
})
