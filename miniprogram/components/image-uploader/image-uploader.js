const privacy = require('../../utils/privacy')

Component({
  properties: {
    imageList: {
      type: Array,
      value: []
    },
    maxCount: {
      type: Number,
      value: 9
    }
  },

  methods: {
    async onChoose() {
      const remaining = this.data.maxCount - this.data.imageList.length
      if (remaining <= 0) return

      // 检查隐私授权
      const ok = await privacy.ensureAuthorized()
      if (!ok) return

      wx.chooseImage({
        count: remaining,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const updatedList = [...this.data.imageList, ...res.tempFilePaths]
          this.triggerEvent('change', { imageList: updatedList })
        }
      })
    },

    onDelete(e) {
      const index = e.currentTarget.dataset.index
      const updatedList = [...this.data.imageList]
      updatedList.splice(index, 1)
      this.triggerEvent('change', { imageList: updatedList })
    },

    onPreview(e) {
      const index = e.currentTarget.dataset.index
      wx.previewImage({
        current: this.data.imageList[index],
        urls: this.data.imageList
      })
    }
  }
})