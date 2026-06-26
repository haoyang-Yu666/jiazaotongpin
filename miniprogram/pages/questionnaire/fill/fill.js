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
      coreNeeds: {},
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
    customAnswers: [],
    customActive: []
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
        const questions = res.custom_questions.map((q, i) => ({ ...q, _qi: i }))
        const prevData = res.data || {}  // 已提交的答案（修改问卷时回填）
        const prevAnswers = prevData.custom_answers || []

        // 回填自定义问题答案（按题目文本匹配，避免模板顺序变化导致错位）
        const answerMap = {}
        if (prevData.snapshot_questions && prevData.custom_answers) {
          prevData.snapshot_questions.forEach((sq, i) => {
            if (prevData.custom_answers[i] !== undefined) {
              answerMap[sq.question] = prevData.custom_answers[i]
            }
          })
        }

        const answers = questions.map(q => {
          if (answerMap.hasOwnProperty(q.question)) return answerMap[q.question]
          if (q.type === 'multi_select') return []
          return ''
        })
        const active = questions.map((q, i) => {
          if (q.type === 'multi_select') {
            const act = {}
            const ans = answers[i]
            if (Array.isArray(ans)) ans.forEach(o => { act[o] = true })
            return act
          }
          return null
        })

        // 回填基础表单字段
        const coreNeeds = {}
        if (Array.isArray(prevData.core_needs)) {
          prevData.core_needs.forEach(n => { coreNeeds[n] = true })
        }
        const styleOptions = this.data.styleOptions
        const budgetOptions = this.data.budgetOptions
        const styleIndex = prevData.style_preference ? styleOptions.indexOf(prevData.style_preference) : -1
        const budgetIndex = prevData.budget_range ? budgetOptions.indexOf(prevData.budget_range) : -1

        // 回填房间数据
        const prevRooms = prevData.rooms || []
        const rooms = this.data.rooms.map(room => {
          const prev = prevRooms.find(r => r.room_type === room.room_type)
          if (prev) {
            return {
              ...room,
              style_preference: prev.style_preference || '',
              color_preference: prev.color_preference || '',
              special_requirements: prev.special_requirements || '',
              reference_images: []  // 图片不回溯（cloud:// 不可用于 image-uploader）
            }
          }
          return room
        })

        this.setData({
          customQuestions: questions,
          customAnswers: answers,
          customActive: active,
          rooms,
          form: {
            ...this.data.form,
            residents: prevData.residents || '',
            familyStructure: prevData.family_structure || '',
            coreNeeds,
            stylePreference: prevData.style_preference || '',
            styleIndex,
            colorPreference: prevData.color_preference || '',
            budgetRange: prevData.budget_range || '',
            budgetIndex,
            specialRequirements: prevData.special_requirements || '',
            dislikedElements: prevData.disliked || ''
          }
        })
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
    const form = this.data.form
    const coreNeeds = { ...form.coreNeeds }
    if (coreNeeds[need]) {
      delete coreNeeds[need]
    } else {
      coreNeeds[need] = true
    }
    this.setData({ form: { ...form, coreNeeds } })
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
    // 同步更新 active 映射，避模板用 .indexOf()
    const active = { ...(this.data.customActive[index] || {}) }
    if (pos > -1) {
      delete active[option]
    } else {
      active[option] = true
    }
    this.setData({
      [`customAnswers[${index}]`]: arr,
      [`customActive[${index}]`]: active
    })
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
        coreNeeds: Object.keys(form.coreNeeds).filter(k => form.coreNeeds[k]),
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
