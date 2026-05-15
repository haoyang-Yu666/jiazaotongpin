const { questionnaireApi } = require('../../../utils/cloud')

Page({
  data: {
    projectId: '',
    customQuestions: [],
    showAddDialog: false,
    editingIndex: -1,
    // 添加/编辑表单
    formData: {
      question: '',
      type: 'text',
      options: [],
      required: false
    },
    typeOptions: ['短文本', '多行文本', '单选', '多选'],
    typeValues: ['text', 'textarea', 'single_select', 'multi_select'],
    typeIndex: 0,
    newOption: '',
    saving: false
  },

  onLoad(options) {
    this.setData({ projectId: options.projectId || '' })
    this.loadTemplate()
  },

  async loadTemplate() {
    try {
      const res = await questionnaireApi.get(this.data.projectId)
      if (res && res.custom_questions) {
        this.setData({ customQuestions: res.custom_questions })
      }
    } catch (err) {
      console.error('加载模板失败:', err)
    }
  },

  onShowAddDialog() {
    this.setData({
      showAddDialog: true,
      editingIndex: -1,
      formData: { question: '', type: 'text', options: [], required: false },
      typeIndex: 0,
      newOption: ''
    })
  },

  onEditQuestion(e) {
    const index = e.currentTarget.dataset.index
    const q = this.data.customQuestions[index]
    const typeIndex = this.data.typeValues.indexOf(q.type)
    this.setData({
      showAddDialog: true,
      editingIndex: index,
      formData: {
        question: q.question,
        type: q.type,
        options: q.options || [],
        required: q.required || false
      },
      typeIndex: typeIndex >= 0 ? typeIndex : 0,
      newOption: ''
    })
  },

  onDeleteQuestion(e) {
    const index = e.currentTarget.dataset.index
    wx.showModal({
      title: '确认删除',
      content: '确定删除这个问题吗？',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          const questions = this.data.customQuestions.slice()
          questions.splice(index, 1)
          this.setData({ customQuestions: questions })
        }
      }
    })
  },

  onMoveUp(e) {
    const index = e.currentTarget.dataset.index
    if (index === 0) return
    const questions = this.data.customQuestions.slice()
    const temp = questions[index]
    questions[index] = questions[index - 1]
    questions[index - 1] = temp
    this.setData({ customQuestions: questions })
  },

  onMoveDown(e) {
    const index = e.currentTarget.dataset.index
    if (index >= this.data.customQuestions.length - 1) return
    const questions = this.data.customQuestions.slice()
    const temp = questions[index]
    questions[index] = questions[index + 1]
    questions[index + 1] = temp
    this.setData({ customQuestions: questions })
  },

  onFormQuestionInput(e) {
    this.setData({ 'formData.question': e.detail.value })
  },

  onTypeChange(e) {
    const index = e.detail.value
    this.setData({
      typeIndex: index,
      'formData.type': this.data.typeValues[index],
      'formData.options': []
    })
  },

  onRequiredChange(e) {
    this.setData({ 'formData.required': e.detail.value })
  },

  onNewOptionInput(e) {
    this.setData({ newOption: e.detail.value })
  },

  onAddOption() {
    const opt = this.data.newOption.trim()
    if (!opt) return
    if (this.data.formData.options.length >= 6) {
      wx.showToast({ title: '最多6个选项', icon: 'none' })
      return
    }
    this.setData({
      'formData.options': this.data.formData.options.concat([opt]),
      newOption: ''
    })
  },

  onRemoveOption(e) {
    const index = e.currentTarget.dataset.index
    const options = this.data.formData.options.slice()
    options.splice(index, 1)
    this.setData({ 'formData.options': options })
  },

  onConfirmAdd() {
    const { formData, editingIndex } = this.data
    if (!formData.question.trim()) {
      wx.showToast({ title: '请输入问题内容', icon: 'none' })
      return
    }
    if ((formData.type === 'single_select' || formData.type === 'multi_select') && formData.options.length < 2) {
      wx.showToast({ title: '至少需要2个选项', icon: 'none' })
      return
    }

    const question = {
      question: formData.question.trim(),
      type: formData.type,
      options: formData.type === 'text' || formData.type === 'textarea' ? [] : formData.options,
      required: formData.required
    }

    const questions = this.data.customQuestions.slice()
    if (editingIndex >= 0) {
      questions[editingIndex] = question
    } else {
      questions.push(question)
    }

    this.setData({
      customQuestions: questions,
      showAddDialog: false
    })
  },

  onCancelAdd() {
    this.setData({ showAddDialog: false })
  },

  async onSave() {
    if (this.data.saving) return
    this.setData({ saving: true })

    try {
      await questionnaireApi.updateTemplate(this.data.projectId, this.data.customQuestions)
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  }
})
