const { projectApi } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')

Page({
  data: {
    projectId: '',
    project: null,
    qrCodeUrl: '',
    posterUrl: '',
    generating: false,
    saved: false
  },

  onLoad(options) {
    this.setData({ projectId: options.projectId || '' })
    this.loadProject()
  },

  async loadProject() {
    try {
      const project = await projectApi.getDetail(this.data.projectId)
      this.setData({ project })

      // 获取二维码
      try {
        const qrRes = await projectApi.getQrCode(this.data.projectId)
        if (qrRes && qrRes.fileID) {
          const tempRes = await wx.cloud.getTempFileURL({ fileList: [qrRes.fileID] })
          this.setData({ qrCodeUrl: tempRes.fileList[0].tempFileURL })
        }
      } catch (err) {
        console.error('获取二维码失败:', err)
      }

      this.generatePoster()
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  generatePoster() {
    this.setData({ generating: true })
    const query = wx.createSelectorQuery()
    query.select('#posterCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) {
        this.setData({ generating: false })
        return
      }

      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = wx.getWindowInfo().pixelRatio
      const width = 540
      const height = 800
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)

      // 背景
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, '#1A6D5C')
      gradient.addColorStop(1, '#0D4F42')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // 标题
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('家造同频', width / 2, 80)

      ctx.font = '24px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillText('让设计与生活同频共振', width / 2, 120)

      // 项目信息
      const project = this.data.project
      if (project) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.font = 'bold 30px sans-serif'
        ctx.fillText(project.name || '', width / 2, 200)

        ctx.font = '22px sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        const meta = [project.community, project.area ? project.area + 'm²' : ''].filter(Boolean).join(' · ')
        ctx.fillText(meta, width / 2, 240)

        // 邀请码
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        this._roundRect(ctx, width / 2 - 150, 280, 300, 50, 25)
        ctx.fill()

        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 28px sans-serif'
        ctx.fillText('邀请码: ' + (project.invite_code || ''), width / 2, 312)
      }

      // 二维码区域
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      this._roundRect(ctx, width / 2 - 120, 380, 240, 240, 20)
      ctx.fill()

      if (this.data.qrCodeUrl) {
        const img = canvas.createImage()
        img.onload = () => {
          ctx.drawImage(img, width / 2 - 100, 400, 200, 200)
          this._finalize(canvas, width, height)
        }
        img.onerror = () => this._finalize(canvas, width, height)
        img.src = this.data.qrCodeUrl
      } else {
        ctx.fillStyle = '#ffffff'
        ctx.font = '22px sans-serif'
        ctx.fillText('扫码加入项目', width / 2, 500)
        this._finalize(canvas, width, height)
      }
    })
  },

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  },

  _finalize(canvas, width, height) {
    setTimeout(() => {
      wx.canvasToTempFilePath({
        canvas,
        width,
        height,
        success: (res) => {
          this.setData({ posterUrl: res.tempFilePath, generating: false })
        },
        fail: () => {
          this.setData({ generating: false })
          wx.showToast({ title: '生成失败', icon: 'none' })
        }
      })
    }, 300)
  },

  onSavePoster() {
    if (!this.data.posterUrl) return
    wx.saveImageToPhotosAlbum({
      filePath: this.data.posterUrl,
      success: () => {
        this.setData({ saved: true })
        wx.showToast({ title: '已保存到相册', icon: 'success' })
      },
      fail: () => wx.showToast({ title: '保存失败，请授权', icon: 'none' })
    })
  },

  onShareAppMessage() {
    const project = this.data.project
    return {
      title: '邀请你加入项目「' + (project ? project.name : '') + '」',
      path: '/pages/projects/invite/invite?code=' + (project ? project.invite_code : '')
    }
  }
})
