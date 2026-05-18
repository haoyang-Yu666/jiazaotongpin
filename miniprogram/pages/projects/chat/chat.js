const { projectApi } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')
const upload = require('../../../utils/upload')

Page({
  data: {
    projectId: '',
    project: null,
    otherName: '',
    messages: [],
    inputText: '',
    loading: true,
    hasMore: true,
    page: 1,
    pageSize: 20,
    currentUserOpenid: '',
    pollingTimer: null,
    lastMessageTimestamp: null,
    scrollToView: '',
    sending: false
  },

  onLoad(options) {
    const userInfo = auth.getUserInfo()
    this.setData({
      projectId: options.projectId || '',
      currentUserOpenid: userInfo ? userInfo.openid : ''
    })
    this.loadProject()
  },

  onShow() {
    if (this.data.projectId) {
      this.loadMessages(true)
      this.startPolling()
    }
  },

  onHide() {
    this.stopPolling()
  },

  onUnload() {
    this.stopPolling()
    if (this.data.projectId) {
      projectApi.markMessagesRead(this.data.projectId).catch(() => {})
    }
  },

  async loadProject() {
    try {
      const project = await projectApi.getDetail(this.data.projectId)
      const isDesigner = project.designer_openid === this.data.currentUserOpenid
      const otherName = isDesigner
        ? (project.client_info.nickname || '客户')
        : (project.designer_info.nickname || '设计师')
      this.setData({ project, otherName })
      wx.setNavigationBarTitle({ title: otherName })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async loadMessages(initial) {
    try {
      const params = {
        projectId: this.data.projectId,
        page: this.data.page,
        pageSize: this.data.pageSize
      }
      const res = await projectApi.getMessages(params)
      const list = res.list || []

      if (initial) {
        this.setData({
          messages: list,
          loading: false,
          hasMore: res.hasMore,
          unreadMessages: res.unreadCount || 0
        })
        this.scrollToBottom()
      } else {
        const merged = this.mergeMessages(this.data.messages, list)
        this.setData({ messages: merged })
      }

      if (list.length > 0) {
        const last = list[list.length - 1]
        this.setData({ lastMessageTimestamp: last.created_at })
      }
    } catch (err) {
      this.setData({ loading: false })
    }
  },

  mergeMessages(existing, incoming) {
    const idSet = new Set(existing.map(m => m._id))
    const newMsgs = incoming.filter(m => !idSet.has(m._id))
    if (newMsgs.length === 0) return existing
    const merged = existing.concat(newMsgs)
    merged.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    return merged
  },

  startPolling() {
    this.stopPolling()
    this._pollTimer = setInterval(() => {
      this.pollNewMessages()
    }, 4000)
  },

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
  },

  async pollNewMessages() {
    if (!this.data.lastMessageTimestamp) return
    try {
      const res = await projectApi.getMessages({
        projectId: this.data.projectId,
        page: 1,
        pageSize: 50,
        afterTimestamp: this.data.lastMessageTimestamp
      })
      const newMsgs = res.list || []
      if (newMsgs.length > 0) {
        const merged = this.mergeMessages(this.data.messages, newMsgs)
        this.setData({ messages: merged })
        if (newMsgs.length > 0) {
          this.setData({ lastMessageTimestamp: newMsgs[newMsgs.length - 1].created_at })
        }
        this.scrollToBottom()
      }
    } catch (err) {}
  },

  scrollToBottom() {
    const count = this.data.messages.length
    if (count > 0) {
      this.setData({ scrollToView: 'msg-' + (count - 1) })
    }
  },

  onLoadMore() {
    if (!this.data.hasMore || this.data.loading) return
    this.setData({ page: this.data.page + 1 })
    this.loadMessages(false)
  },

  onInputChange(e) {
    this.setData({ inputText: e.detail.value })
  },

  async onSend() {
    const text = this.data.inputText.trim()
    if (!text || this.data.sending) return

    this.setData({ sending: true, inputText: '' })

    // 乐观发送：先本地显示
    const optimisticMsg = {
      _id: 'temp_' + Date.now(),
      sender_openid: this.data.currentUserOpenid,
      sender_info: auth.getUserInfo() || {},
      type: 'text',
      content: text,
      created_at: new Date().toISOString(),
      is_read: false
    }
    const msgs = this.data.messages.concat([optimisticMsg])
    this.setData({ messages: msgs })
    this.scrollToBottom()

    try {
      await projectApi.sendMessage(this.data.projectId, 'text', text)
      // 下次轮询会替换临时消息
    } catch (err) {
      wx.showToast({ title: '发送失败', icon: 'none' })
      // 移除乐观消息
      this.setData({ messages: this.data.messages.filter(m => m._id !== optimisticMsg._id) })
    } finally {
      this.setData({ sending: false })
    }
  },

  async onChooseImage() {
    if (this.data.sending) return
    try {
      const images = await upload.chooseImage(1)
      if (!images || images.length === 0) return

      this.setData({ sending: true })

      // 上传图片
      const cloudPaths = await upload.uploadImages(images, 'chat/' + this.data.projectId)
      if (!cloudPaths || cloudPaths.length === 0) {
        wx.showToast({ title: '上传失败', icon: 'none' })
        this.setData({ sending: false })
        return
      }

      // 乐观显示
      const optimisticMsg = {
        _id: 'temp_img_' + Date.now(),
        sender_openid: this.data.currentUserOpenid,
        sender_info: auth.getUserInfo() || {},
        type: 'image',
        content: images[0],
        created_at: new Date().toISOString(),
        is_read: false
      }
      const msgs = this.data.messages.concat([optimisticMsg])
      this.setData({ messages: msgs })
      this.scrollToBottom()

      await projectApi.sendMessage(this.data.projectId, 'image', cloudPaths[0])
    } catch (err) {
      // 移除乐观消息
      this.setData({ messages: this.data.messages.filter(m => m._id !== optimisticMsg._id) })
      wx.showToast({ title: '发送失败', icon: 'none' })
    } finally {
      this.setData({ sending: false })
    }
  },

  onConfirm() {
    this.onSend()
  }
})
