const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (event.action) {
    case 'login':
      return handleLogin(openid, event)
    case 'getProfile':
      return handleGetProfile(openid)
    case 'updateProfile':
      return handleUpdateProfile(openid, event)
    default:
      return { code: -1, message: '未知操作' }
  }
}

async function handleLogin(openid, event) {
  try {
    const { data: users } = await db.collection('jt_users')
      .where({ openid })
      .get()

    if (users.length > 0) {
      const user = users[0]
      return {
        code: 0,
        data: user,
        message: '登录成功'
      }
    }

    const newUser = {
      openid,
      role: event.role || null,
      nickname: event.nickname || '',
      avatar: event.avatar || '',
      phone: '',
      company: '',
      position: '',
      styles: '',
      bio: '',
      email: '',
      wechat: '',
      created_at: db.serverDate(),
      updated_at: db.serverDate()
    }

    const result = await db.collection('jt_users').add({ data: newUser })

    return {
      code: 0,
      data: { _id: result._id, ...newUser },
      message: '注册成功'
    }
  } catch (err) {
    return { code: -1, message: '登录失败: ' + err.message }
  }
}

async function handleGetProfile(openid) {
  try {
    const { data: users } = await db.collection('jt_users')
      .where({ openid })
      .get()

    if (users.length === 0) {
      return { code: -1, message: '用户不存在' }
    }

    return { code: 0, data: users[0] }
  } catch (err) {
    return { code: -1, message: '获取失败: ' + err.message }
  }
}

async function handleUpdateProfile(openid, event) {
  try {
    const updateData = {}
    const fields = ['nickname', 'avatar', 'phone', 'company', 'position', 'styles', 'bio', 'email', 'wechat']

    fields.forEach(field => {
      if (event[field] !== undefined) {
        updateData[field] = event[field]
      }
    })

    updateData.updated_at = db.serverDate()

    await db.collection('jt_users')
      .where({ openid })
      .update({ data: updateData })

    return { code: 0, data: null, message: '更新成功' }
  } catch (err) {
    return { code: -1, message: '更新失败: ' + err.message }
  }
}
