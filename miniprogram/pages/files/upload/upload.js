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
    const idx = e.detail.value
    this.setData({ version: this.data.versionOptions[idx] })
  },

  onModeSwitch(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ isImageMode: mode === 'image' })
  },

  async onChooseImage() {
    try {
      const paths = await upload.chooseImage(1)
      this.setData({
        imageList: paths,
        fileUrl: '',
        fileName: '',
        fileType: 'image'
      })
    } catch (err) {
      console.error('选择图片失败:', err)
    }
  },

  async onChooseFile() {
    try {
      const file = await upload.chooseFile()
      const ext = file.path.split('.').pop().toLowerCase()
      this.setData({
        fileUrl: file.path,
        fileName: file.name,
        fileType: ext === 'pdf' ? 'pdf' : 'image',
        imageList: []
      })
    } catch (err) {
      console.error('选择文件失败:', err)
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
        const ext = this.data.fileName.split('.').pop()
        const cloudPath = `files/${projectId}/${Date.now()}_${this.data.fileName}`
        const fileId = await upload.uploadFile(this.data.fileUrl, cloudPath)
        fileIds = [fileId]
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
      wx.showToast({ title: '上传失败', icon: 'none' })
    }
  }
})