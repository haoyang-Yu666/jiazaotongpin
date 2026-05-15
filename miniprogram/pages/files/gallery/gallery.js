Page({
  data: {
    imageUrls: [],
    currentIndex: 0,
    currentUrl: '',
    showActions: false
  },

  onLoad(options) {
    const urls = options.fileIds ? options.fileIds.split(',') : []
    const index = parseInt(options.currentIndex) || 0

    this.setData({ imageUrls: urls, currentIndex: index })
    this.resolveCurrentUrl(urls[index])
  },

  async resolveCurrentUrl(fileId) {
    if (!fileId) return
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: [fileId] })
      if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
        this.setData({ currentUrl: res.fileList[0].tempFileURL })
      }
    } catch (err) {
      console.error('获取图片链接失败:', err)
    }
  },

  onSwiperChange(e) {
    const index = e.detail.current
    this.setData({ currentIndex: index })
    this.resolveCurrentUrl(this.data.imageUrls[index])
  },

  onPreviewImage() {
    wx.previewImage({
      current: this.data.currentUrl,
      urls: this.data.imageUrls
    })
  },

  onSaveImage() {
    if (!this.data.currentUrl) {
      wx.showToast({ title: '图片加载中', icon: 'none' })
      return
    }
    wx.downloadFile({
      url: this.data.currentUrl,
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => wx.showToast({ title: '已保存', icon: 'success' }),
          fail: () => wx.showToast({ title: '保存失败', icon: 'none' })
        })
      }
    })
  }
})
