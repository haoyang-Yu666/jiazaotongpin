const { fileApi } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')
const constants = require('../../../utils/constants')

Page({
  data: {
    projectId: '',
    categories: [
      { key: '', label: '全部' },
      { key: 'floor_plan', label: '平面图' },
      { key: 'rendering', label: '效果图' },
      { key: 'budget', label: '预算单' }
    ],
    currentCategory: '',
    files: [],
    loading: false,
    isEmpty: false,
    isDesigner: false
  },

  onLoad(options) {
    this.setData({
      projectId: options.projectId || '',
      isDesigner: auth.isDesigner()
    })
    this.loadFiles()
  },

  onPullDownRefresh() {
    this.loadFiles().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onCategoryTap(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ currentCategory: key })
    this.loadFiles()
  },

  async loadFiles() {
    this.setData({ loading: true })
    try {
      const data = { projectId: this.data.projectId }
      if (this.data.currentCategory) {
        data.category = this.data.currentCategory
      }
      const res = await fileApi.list(data)
      const files = (res && res.list) || []
      this.setData({
        files,
        isEmpty: files.length === 0,
        loading: false
      })
    } catch (err) {
      console.error('加载文件失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onFileTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/files/preview/preview?fileId=${id}&projectId=${this.data.projectId}`
    })
  },

  onUploadTap() {
    wx.navigateTo({
      url: `/pages/files/upload/upload?projectId=${this.data.projectId}`
    })
  }
})