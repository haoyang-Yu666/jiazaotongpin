const { fileApi } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')
const constants = require('../../../utils/constants')

Page({
  data: {
    fileId: '',
    projectId: '',
    file: null,
    isClient: false,
    statusLabels: {
      pending: '待确认',
      confirmed: '已确认',
      rejected: '已驳回'
    },
    statusColors: {
      pending: '#FAAD14',
      confirmed: '#52C41A',
      rejected: '#FF4D4F'
    }
  },

  onLoad(options) {
    this.setData({
      fileId: options.fileId,
      projectId: options.projectId,
      isClient: auth.isClient()
    })
    this.loadFile()
  },

  async loadFile() {
    wx.showLoading({ title: '加载中' })
    try {
      const file = await fileApi.getFile(this.data.fileId)
      if (file) {
        const categoryLabel = constants.FILE_CATEGORY_LABELS[file.category] || '其他'
        this.setData({ file: { ...file, categoryLabel } })
      }
    } catch (err) {
      console.error('加载文件失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  onPreviewImage(e) {
    const { url } = e.currentTarget.dataset
    const urls = this.data.file.file_ids || []
    wx.previewImage({
      current: url,
      urls
    })
  },

  onOpenPdf() {
    const file = this.data.file
    if (!file || !file.file_ids || file.file_ids.length === 0) return

    wx.showLoading({ title: '打开文件' })
    wx.cloud.downloadFile({
      fileID: file.file_ids[0],
      success: (res) => {
        wx.openDocument({
          filePath: res.tempFilePath,
          showMenu: true,
          success: () => {
            wx.hideLoading()
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '打开文件失败', icon: 'none' })
          }
        })
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '下载文件失败', icon: 'none' })
      }
    })
  },

  onConfirm() {
    wx.navigateTo({
      url: `/pages/files/confirm/confirm?fileId=${this.data.fileId}&projectId=${this.data.projectId}`
    })
  },

  async onQuickConfirm(e) {
    const actionType = e.currentTarget.dataset.action
    const actionLabel = actionType === 'confirmed' ? '确认' : '驳回'

    wx.showModal({
      title: '确认操作',
      content: `确定要${actionLabel}此文件吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await fileApi.confirm(this.data.fileId, actionType)
            wx.showToast({ title: `已${actionLabel}`, icon: 'success' })
            this.loadFile()
          } catch (err) {
            console.error('操作失败:', err)
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  }
})
