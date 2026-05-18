const { questionnaireApi } = require('../../../utils/cloud')
const constants = require('../../../utils/constants')
const upload = require('../../../utils/upload')

Page({
  data: {
    projectId: '',
    submitting: false,

    form: {
      residents: '',
      familyStructure: '',
      coreNeeds: [],
      stylePreference: '',
      styleIndex: -1,
      colorPreference: '',
      budgetRange: '',
      budgetIndex: -1,
      specialRequirements: '',
      specialImages: [],
      dislikedElements: '',
      dislikedImages: []
    },

    styleOptions: constants.STYLE_OPTIONS,
    budgetOptions: constants.BUDGET_OPTIONS,
    coreNeedsOptions: [
      '收纳空间', '开放式厨房', '智能家居', '儿童房',
      '书房/办公', '宠物友好', '无障碍设计', '环保材料',
      '中央空调', '地暖', '新风系统', '隔音'
    ],

    // 按房间
    roomTypes: constants.ROOM_TYPES,
    rooms: [],
    expandedRoom: -1,

    // 设计师自定义问题
    customQuestions: [],
    customAnswers: []
  },

  onLoad(options) {
    const projectId = options.projectId
    if (!projectId) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1000)
      return
    }

    const rooms = constants.ROOM_TYPES.map(r => ({
      room_type: r.key,
      room_label: r.label,
      style_preference: '',
      color_preference: '',
      special_requirements: '',
      reference_images: []
    }))

    this.setData({ projectId, rooms })
    this.loadCustomQuestions()
  },

  async loadCustomQuestions() {
    try {
      const res = await questionnaireApi.get(this.data.projectId)
      if (res && res.custom_questions && res.custom_questions.length > 0) {
        const answers = res.custom_questions.map(q => {
          if (q.type === 'multi_select') return []
          return ''
        })
        this.setData({ customQuestions: res.custom_questions, customAnswers: answers })
      }
    } catch (err) {
      console.error('加载自定义问题失败:', err)
    }
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onCoreNeedToggle(e) {
    const need = e.currentTarget.dataset.need
    let coreNeeds = [...this.data.form.coreNeeds]
    const index = coreNeeds.indexOf(need)
    if (index > -1) {
      coreNeeds.splice(index, 1)
    } else {
      coreNeeds.push(need)
    }
    this.setData({ 'form.coreNeeds': coreNeeds })
  },

  onStyleChange(e) {
    const index = e.detail.value
    this.setData({
      'form.styleIndex': index,
      'form.stylePreference': this.data.styleOptions[index]
    })
  },

  onBudgetChange(e) {
    const index = e.detail.value
    this.setData({
      'form.budgetIndex': index,
      'form.budgetRange': this.data.budgetOptions[index]
    })
  },

  // 按房间操作
  onRoomToggle(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ expandedRoom: this.data.expandedRoom === index ? -1 : index })
  },

  onRoomInput(e) {
    const { index, field } = e.currentTarget.dataset
    this.setData({ [`rooms[${index}].${field}`]: e.detail.value })
  },

  onRoomImageChange(e) {
    const index = this.data.expandedRoom
    if (index < 0) return
    this.setData({ [`rooms[${index}].reference_images`]: e.detail.imageList })
  },

  onCustomInput(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ [`customAnswers[${index}]`]: e.detail.value })
  },

  onSpecialImagesChange(e) {
    this.setData({ 'form.specialImages': e.detail.imageList })
  },

  onDislikedImagesChange(e) {
    this.setData({ 'form.dislikedImages': e.detail.imageList })
  },

  onCustomSelect(e) {
    const { index, option } = e.currentTarget.dataset
    this.setData({ [`customAnswers[${index}]`]: option })
  },

  onCustomMultiToggle(e) {
    const { index, option } = e.currentTarget.dataset
    let current = this.data.customAnswers[index] || []
    if (!Array.isArray(current)) current = []
    const arr = [...current]
    const pos = arr.indexOf(option)
    if (pos > -1) {
      arr.splice(pos, 1)
    } else {
      arr.push(option)
    }
    this.setData({ [`customAnswers[${index}]`]: arr })
  },

  validateForm() {
    const { residents, familyStructure } = this.data.form
    if (!residents || !residents.trim()) {
      wx.showToast({ title: '请填写常住人口', icon: 'none' })
      return false
    }
    if (!familyStructure || !familyStructure.trim()) {
      wx.showToast({ title: '请填写家庭结构', icon: 'none' })
      return false
    }
    return true
  },

  async onSubmit() {
    if (!this.validateForm()) return
    if (this.data.submitting) return
    this.setData({ submitting: true })

    try {
      const { form } = this.data

      // 上传特别要求参考图
      let specialImages = []
      if (form.specialImages && form.specialImages.length > 0) {
        specialImages = await upload.uploadImages(
          form.specialImages,
          `questionnaire/${this.data.projectId}/special`
        )
      }

      // 上传不喜欢元素参考图
      let dislikedImages = []
      if (form.dislikedImages && form.dislikedImages.length > 0) {
        dislikedImages = await upload.uploadImages(
          form.dislikedImages,
          `questionnaire/${this.data.projectId}/disliked`
        )
      }

      // 上传房间参考图
      const rooms = []
      for (let i = 0; i < this.data.rooms.length; i++) {
        const room = this.data.rooms[i]
        let refImages = []
        if (room.reference_images && room.reference_images.length > 0) {
          refImages = await upload.uploadImages(
            room.reference_images,
            `questionnaire/${this.data.projectId}/rooms/${room.room_type}`
          )
        }
        // 只提交有内容的房间
        if (room.style_preference || room.color_preference || room.special_requirements || refImages.length > 0) {
          rooms.push({
            room_type: room.room_type,
            style_preference: room.style_preference,
            color_preference: room.color_preference,
            special_requirements: room.special_requirements,
            reference_images: refImages
          })
        }
      }

      await questionnaireApi.submit({
        projectId: this.data.projectId,
        residents: form.residents.trim(),
        familyStructure: form.familyStructure.trim(),
        coreNeeds: form.coreNeeds,
        stylePreference: form.stylePreference,
        colorPreference: form.colorPreference.trim(),
        budgetRange: form.budgetRange,
        specialRequirements: form.specialRequirements.trim(),
        specialImages,
        disliked: form.dislikedElements.trim(),
        dislikedImages,
        rooms,
        customAnswers: this.data.customAnswers,
        snapshotQuestions: this.data.customQuestions
      })

      wx.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (err) {
      console.error('提交问卷失败:', err)
      wx.showToast({ title: err.message || '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
