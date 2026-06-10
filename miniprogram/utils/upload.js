/**
 * 文件上传工具
 */

const privacy = require('./privacy')

const upload = {
  // 确保隐私授权（内部使用）
  async _ensurePrivacy() {
    const ok = await privacy.ensureAuthorized()
    if (!ok) {
      throw new Error('隐私授权未通过')
    }
  },

  // 压缩并上传单张图片
  async uploadImage(filePath, cloudPath) {
    // 先压缩
    const compressResult = await this.compressImage(filePath)
    const targetPath = compressResult.tempFilePath || filePath

    // 上传到云存储
    const result = await wx.cloud.uploadFile({
      cloudPath,
      filePath: targetPath
    })

    return result.fileID
  },

  // 批量上传图片
  async uploadImages(filePaths, cloudPathPrefix) {
    const tasks = filePaths.map((filePath, index) => {
      const ext = filePath.split('.').pop()
      const cloudPath = `${cloudPathPrefix}/${Date.now()}_${index}.${ext}`
      return this.uploadImage(filePath, cloudPath)
    })
    return Promise.all(tasks)
  },

  // 上传文件（PDF等）
  async uploadFile(filePath, cloudPath) {
    const result = await wx.cloud.uploadFile({
      cloudPath,
      filePath
    })
    return result.fileID
  },

  // 压缩图片
  compressImage(filePath) {
    return new Promise((resolve) => {
      wx.compressImage({
        src: filePath,
        quality: 80,
        success: resolve,
        fail: () => resolve({ tempFilePath: filePath })
      })
    })
  },

  // 选择图片（自动检查隐私授权）
  async chooseImage(count = 9) {
    await this._ensurePrivacy()
    return new Promise((resolve, reject) => {
      wx.chooseImage({
        count,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => resolve(res.tempFilePaths),
        fail: reject
      })
    })
  },

  // 选择文件（自动检查隐私授权）
  async chooseFile() {
    await this._ensurePrivacy()
    return new Promise((resolve, reject) => {
      wx.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['pdf', 'jpg', 'jpeg', 'png'],
        success: (res) => resolve(res.tempFiles[0]),
        fail: reject
      })
    })
  },

  // 删除云存储文件
  deleteFile(fileId) {
    return wx.cloud.deleteFile({
      fileList: [fileId]
    })
  },

  // 批量删除云存储文件
  deleteFiles(fileIds) {
    if (!fileIds || fileIds.length === 0) return Promise.resolve()
    return wx.cloud.deleteFile({
      fileList: fileIds
    })
  },

  // 获取云存储文件临时链接
  getTempFileURL(fileIds) {
    return wx.cloud.getTempFileURL({
      fileList: Array.isArray(fileIds) ? fileIds : [fileIds]
    })
  }
}

module.exports = upload
