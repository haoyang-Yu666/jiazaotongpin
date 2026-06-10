const { fileApi } = require('../../../utils/cloud')
const upload = require('../../../utils/upload')
const constants = require('../../../utils/constants')

Page({
  data: {
    projectId: '',
    title: '',
    category: 'floor_plan',
    categoryOptions: [
      { value: 'floor_plan', label: '平面图' },
      { value: 'rendering', label: '效果图' },
      { value: 'budget', label: '预算单' },
      { value: 'other', label: '其他' }
    ],
    version: 'V1',
    versionIndex: 0,
    versionOptions: ['V1', 'V2', 'V3', '最终版'],
    description: '',
    fileUrl: '',
    fileName: '',
    fileType: '',
    imageList: [],
    isImageMode: true,
    submitting: false
  },

  onLoad(options) {
    this.setData({ projectId: options.projectId || '' })
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value })
  },

  onCategoryChange(e) {
    this.setData({ category: e.detail.value })
  },

  onVersionChange(e) {
    const idx = parseInt(e.detail.value)
    this.setData({
      versionIndex: idx,
      version: this.data.versionOptions[idx]
    })
  },

  onModeSwitch(e) {
    const mode = e.currentTarget.dataset.mode
    // 切换模式时清除已选文件
    this.setData({
      isImageMode: mode === 'image',
      imageList: [],
      fileUrl: '',
      fileName: '',
      fileType: ''
    })
  },

  async onChooseImage() {
    try {
      const paths = await upload.chooseImage(1)
      if (paths && paths.length > 0) {
        this.setData({
          imageList: paths,
          fileUrl: '',
          fileName: '',
          fileType: 'image'
        })
      }
    } catch (err) {
      // 用户取消选择不提示
      if (err && err.errMsg && err.errMsg.indexOf('cancel') === -1) {
        console.error('选择图片失败:', err)
        wx.showToast({ title: '选择图片失败', icon: 'none' })
      }
    }
  },

  async onChooseFile() {
    try {
      const file = await upload.chooseFile()
      if (file && file.path) {
        const ext = file.path.split('.').pop().toLowerCase()
        this.setData({
          fileUrl: file.path,
          fileName: file.name || '未命名文件',
          fileType: ext === 'pdf' ? 'pdf' : 'image',
          imageList: []
        })
      }
    } catch (err) {
      // 用户取消选择不提示
      if (err && err.errMsg && err.errMsg.indexOf('cancel') !== -1) {
        return
      }
      // 开发工具中 wx.chooseMessageFile 不可用时提示
      console.error('选择文件失败:', err)
      wx.showModal({
        title: '选择文件',
        content: '请先将PDF或图片文件发送到微信聊天（如"文件传输助手"），再重新选择。\n\n当前仅支持从微信聊天记录中选取文件。',
        showCancel: false
      })
    }
  },

  onRemoveFile() {
    this.setData({
      fileUrl: '',
      fileName: '',
      fileType: '',
      imageList: []
    })
  },

  async onSubmit() {
    const { title, category, version, description, projectId } = this.data

    if (!title.trim()) {
      wx.showToast({ title: '请输入文件标题', icon: 'none' })
      return
    }

    const hasFile = this.data.imageList.length > 0 || this.data.fileUrl
    if (!hasFile) {
      wx.showToast({ title: '请选择文件', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    try {
      let fileIds = []

      // 上传图片
      if (this.data.imageList.length > 0) {
        fileIds = await upload.uploadImages(
          this.data.imageList,
          `files/${projectId}/${Date.now()}`
        )
      }

      // 上传文件（PDF等）
      if (this.data.fileUrl && this.data.fileType === 'pdf') {
        const cloudPath = `files/${projectId}/${Date.now()}_${this.data.fileName}`
        const fileId = await upload.uploadFile(this.data.fileUrl, cloudPath)
        fileIds = [fileId]
      }

      // 如果文件模式选的是图片，走图片上传
      if (this.data.fileUrl && this.data.fileType === 'image') {
        fileIds = await upload.uploadImages(
          [this.data.fileUrl],
          `files/${projectId}/${Date.now()}`
        )
      }

      await fileApi.save({
        projectId,
        title: title.trim(),
        category,
        version,
        description: description.trim(),
        fileType: this.data.fileType,
        fileIds
      })

      wx.showToast({ title: '上传成功', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1000)
    } catch (err) {
      console.error('上传失败:', err)
      this.setData({ submitting: false })
      wx.showToast({ title: '上传失败，请重试', icon: 'none' })
    }
  }
})