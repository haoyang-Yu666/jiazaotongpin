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
        disliked: event.disliked || ''
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

async function handleGet(projectId) {
  try {
    const { data: questionnaires } = await db.collection('jt_questionnaires')
      .where({ project_id: projectId })
      .get()

    if (questionnaires.length === 0) {
      return { code: 0, data: null }
    }

    return { code: 0, data: questionnaires[0] }
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
