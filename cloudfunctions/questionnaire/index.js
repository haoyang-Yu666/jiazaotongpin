const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (event.action) {
    case 'submit':
      return handleSubmit(openid, event)
    case 'get':
      return handleGet(event.projectId)
    case 'markReviewed':
      return handleMarkReviewed(openid, event.projectId)
    case 'updateTemplate':
      return handleUpdateTemplate(openid, event)
    default:
      return { code: -1, message: '未知操作' }
  }
}

async function handleSubmit(openid, event) {
  try {
    // 检查是否已提交
    const { data: existing } = await db.collection('jt_questionnaires')
      .where({ project_id: event.projectId })
      .get()

    if (existing.length > 0 && existing[0].status === 'submitted') {
      return { code: -1, message: '问卷已提交，不可重复填写' }
    }

    const questionnaire = {
      project_id: event.projectId,
      status: 'submitted',
      data: {
        residents: event.residents || '',
        family_structure: event.familyStructure || '',
        core_needs: event.coreNeeds || [],
        style_preference: event.stylePreference || '',
        color_preference: event.colorPreference || '',
        budget_range: event.budgetRange || '',
        special_requirements: event.specialRequirements || '',
        special_images: event.specialImages || [],
        disliked: event.disliked || '',
        disliked_images: event.dislikedImages || [],
        rooms: event.rooms || [],
        custom_answers: event.customAnswers || [],
        snapshot_questions: event.snapshotQuestions || []
      },
      submitted_at: db.serverDate(),
      reviewed_at: null
    }

    if (existing.length > 0) {
      // 更新已有的草稿
      await db.collection('jt_questionnaires').doc(existing[0]._id).update({
        data: questionnaire
      })
      // 通知设计师
      try {
        const { data: project } = await db.collection('jt_projects').doc(event.projectId).get()
        if (project && project.designer_openid) {
          await db.collection('jt_notifications').add({
            data: {
              user_openid: project.designer_openid,
              project_id: event.projectId,
              project_name: project.name,
              type: 'questionnaire_submit',
              title: '问卷已提交',
              content: '客户已提交需求问卷，请查阅',
              related_id: event.projectId,
              is_read: false,
              created_at: db.serverDate()
            }
          })
        }
      } catch (e) {}
      return { code: 0, data: null, message: '问卷提交成功' }
    }

    const result = await db.collection('jt_questionnaires').add({ data: questionnaire })
    // 通知设计师
    try {
      const { data: project } = await db.collection('jt_projects').doc(event.projectId).get()
      if (project && project.designer_openid) {
        await db.collection('jt_notifications').add({
          data: {
            user_openid: project.designer_openid,
            project_id: event.projectId,
            project_name: project.name,
            type: 'questionnaire_submit',
            title: '问卷已提交',
            content: '客户已提交需求问卷，请查阅',
            related_id: event.projectId,
            is_read: false,
            created_at: db.serverDate()
          }
        })
      }
    } catch (e) {}
    return { code: 0, data: { _id: result._id }, message: '问卷提交成功' }
  } catch (err) {
    return { code: -1, message: '提交失败: ' + err.message }
  }
}

const DEFAULT_CUSTOM_QUESTIONS = [
  {
    question: '您目前的房屋是什么类型？',
    type: 'single_select',
    options: ['毛坯新房', '精装房改造', '二手房翻新', '老房局部改造'],
    required: true
  },
  {
    question: '本次装修计划入住的家庭成员有哪些？',
    type: 'multi_select',
    options: ['夫妻二人', '学龄前儿童', '学龄儿童', '老人同住', '宠物', '其他'],
    required: true
  },
  {
    question: '您对哪个空间最看重、希望重点设计？',
    type: 'multi_select',
    options: ['客厅', '主卧', '厨房', '卫生间', '书房', '儿童房', '阳台'],
    required: false
  },
  {
    question: '您偏好哪种装修风格？',
    type: 'single_select',
    options: ['现代简约', '北欧风', '日式原木', '新中式', '轻奢法式', '美式', '工业风', '混搭'],
    required: true
  },
  {
    question: '您对色彩的整体倾向是？',
    type: 'single_select',
    options: ['黑白灰简约', '暖色调（米白/原木/奶茶色）', '冷色调（蓝/绿/灰）', '活泼明亮（黄/橙/粉）', '没有偏好'],
    required: false
  },
  {
    question: '家里是否有中央空调、地暖、新风系统的需求？',
    type: 'multi_select',
    options: ['中央空调', '地暖', '新风系统', '净水系统', '智能家居', '暂不考虑'],
    required: false
  },
  {
    question: '厨房的使用习惯是？',
    type: 'single_select',
    options: ['经常做饭，偏好封闭式厨房', '经常做饭，偏好开放式厨房', '偶尔做饭，西式简餐为主', '很少做饭'],
    required: false
  },
  {
    question: '对收纳空间有什么特别要求？',
    type: 'multi_select',
    options: ['需要大量柜体收纳', '隐藏式收纳为主', '展示型收纳（开放格架）', '衣帽间', '储物间', '按需即可'],
    required: false
  },
  {
    question: '是否有老人或特殊人群需要考虑无障碍设计？',
    type: 'single_select',
    options: ['有老人需要适老化设计', '有行动不便者需无障碍', '暂无特殊需求'],
    required: false
  },
  {
    question: '您希望家里的整体氛围是怎样的？',
    type: 'textarea',
    options: [],
    required: false
  },
  {
    question: '有没有特别喜欢或参考的装修案例图片链接？',
    type: 'textarea',
    options: [],
    required: false
  },
  {
    question: '还有什么想告诉设计师的特别需求或想法？',
    type: 'textarea',
    options: [],
    required: false
  }
]

async function handleGet(projectId) {
  try {
    const { data: questionnaires } = await db.collection('jt_questionnaires')
      .where({ project_id: projectId })
      .get()

    if (questionnaires.length === 0) {
      return { code: 0, data: { custom_questions: DEFAULT_CUSTOM_QUESTIONS } }
    }

    const record = questionnaires[0]
    if (!record.custom_questions || record.custom_questions.length === 0) {
      record.custom_questions = DEFAULT_CUSTOM_QUESTIONS
    }

    return { code: 0, data: record }
  } catch (err) {
    return { code: -1, message: '查询失败: ' + err.message }
  }
}

async function handleMarkReviewed(openid, event) {
  try {
    // 校验：只有设计师可以标记已阅
    const { data: users } = await db.collection('jt_users')
      .where({ openid })
      .get()

    if (users.length === 0 || users[0].role !== 'designer') {
      return { code: -1, message: '无权操作，仅设计师可标记已阅' }
    }

    const { data: questionnaires } = await db.collection('jt_questionnaires')
      .where({ project_id: event.projectId })
      .get()

    if (questionnaires.length === 0) {
      return { code: -1, message: '问卷不存在' }
    }

    await db.collection('jt_questionnaires').doc(questionnaires[0]._id).update({
      data: {
        status: 'reviewed',
        reviewed_at: db.serverDate()
      }
    })

    return { code: 0, data: null, message: '已标记已阅' }
  } catch (err) {
    return { code: -1, message: '操作失败: ' + err.message }
  }
}

async function handleUpdateTemplate(openid, event) {
  try {
    const { data: users } = await db.collection('jt_users')
      .where({ openid })
      .get()

    if (users.length === 0 || users[0].role !== 'designer') {
      return { code: -1, message: '仅设计师可编辑问卷模板' }
    }

    const customQuestions = event.customQuestions || []
    const projectId = event.projectId

    const { data: existing } = await db.collection('jt_questionnaires')
      .where({ project_id: projectId })
      .get()

    if (existing.length > 0) {
      await db.collection('jt_questionnaires').doc(existing[0]._id).update({
        data: {
          custom_questions: customQuestions,
          updated_at: db.serverDate()
        }
      })
    } else {
      await db.collection('jt_questionnaires').add({
        data: {
          project_id: projectId,
          status: 'template',
          custom_questions: customQuestions,
          data: {},
          created_at: db.serverDate(),
          updated_at: db.serverDate()
        }
      })
    }

    return { code: 0, data: null, message: '模板保存成功' }
  } catch (err) {
    return { code: -1, message: '保存失败: ' + err.message }
  }
}
