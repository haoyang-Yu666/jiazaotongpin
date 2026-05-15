const { fileApi } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')
const constants = require('../../../utils/constants')
const format = require('../../../utils/format')

Page({
  data: {
    fileId: '',
    projectId: '',
    file: null,
    confirmHistory: [],
    loading: true,
    categoryLabel: '',
    statusLabels: {
      pending: '待确认',
      confirmed: '已确认',
      rejected: '已驳回'
    }
  },

  onLoad(options) {
    this.setData({
      fileId: options.fileId,
      projectId: options.projectId
    })
    this.loadFile()
  },

  async loadFile() {
    wx.showLoading({ title: '加载中' })
    try {
      const file = await fileApi.getFile(this.data.fileId)
      if (file) {
        const categoryLabel = constants.FILE_CATEGORY_LABELS[file.category] || '其他'
        const confirmHistory = (file.confirmations || []).map(h => ({
          ...h,
          timeText: format.dateTime(h.timestamp),
          operatorName: '客户'
        }))
        const createdAtText = format.dateTime(file.created_at)
        this.setData({
          file: { ...file, categoryLabel, createdAtText },
          confirmHistory,
          loading: false
        })
      }
    } catch (err) {
      console.error('加载文件失败:', err)
      this.setData({ loading: false })
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

    wx.showLoading({ title: '下载文件' })
    wx.cloud.downloadFile({
      fileID: file.file_ids[0],
      success: (res) => {
        wx.openDocument({
          filePath: res.tempFilePath,
          showMenu: true,
          success: () => wx.hideLoading(),
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '打开文件失败', icon: 'none' })
          }
        })
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '下载失败', icon: 'none' })
      }
    })
  },

  onConfirmTap() {
    wx.showModal({
      title: '确认通过',
      content: '确认通过此设计文件？',
      confirmText: '确认通过',
      confirmColor: '#1A6D5C',
      success: async (res) => {
        if (res.confirm) {
          await this.doConfirm('confirmed')
        }
      }
    })
  },

  onRejectTap() {
    wx.showModal({
      title: '驳回文件',
      content: '确定驳回此设计文件？',
      confirmText: '确认驳回',
      confirmColor: '#FF4D4F',
      success: async (res) => {
        if (res.confirm) {
          await this.doConfirm('rejected')
        }
      }
    })
  },

  async doConfirm(actionType) {
    wx.showLoading({ title: '提交中' })
    try {
      await fileApi.confirm(this.data.fileId, actionType)
      wx.hideLoading()
      wx.showToast({
        title: actionType === 'confirmed' ? '已确认' : '已驳回',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1000)
    } catch (err) {
      wx.hideLoading()
      console.error('确认失败:', err)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  }
})
