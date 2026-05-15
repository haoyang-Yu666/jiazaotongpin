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
    onChoose() {
      const remaining = this.data.maxCount - this.data.imageList.length;
      if (remaining <= 0) return;

      wx.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const newImages = res.tempFiles.map(file => file.tempFilePath);
          const updatedList = [...this.data.imageList, ...newImages];
          this.triggerEvent('change', { imageList: updatedList });
        }
      });
    },

    onDelete(e) {
      const index = e.currentTarget.dataset.index;
      const updatedList = [...this.data.imageList];
      updatedList.splice(index, 1);
      this.triggerEvent('change', { imageList: updatedList });
    },

    onPreview(e) {
      const index = e.currentTarget.dataset.index;
      wx.previewImage({
        current: this.data.imageList[index],
        urls: this.data.imageList
      });
    }
  }
});
