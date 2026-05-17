const constants = {
  // 用户角色
  ROLE_DESIGNER: 'designer',
  ROLE_CLIENT: 'client',

  // 项目状态
  PROJECT_STATUS: {
    WAITING: 'waiting',    // 等待客户加入
    ACTIVE: 'active',      // 进行中
    COMPLETED: 'completed', // 已完成
    ARCHIVED: 'archived'   // 已归档
  },

  // 问卷状态
  QUESTIONNAIRE_STATUS: {
    PENDING: 'pending',
    SUBMITTED: 'submitted',
    REVIEWED: 'reviewed'
  },

  // 文件类型
  FILE_TYPE: {
    IMAGE: 'image',
    PDF: 'pdf'
  },

  // 文件分类
  FILE_CATEGORY: {
    FLOOR_PLAN: 'floor_plan',
    RENDERING: 'rendering',
    BUDGET: 'budget',
    OTHER: 'other'
  },

  // 文件分类中文映射
  FILE_CATEGORY_LABELS: {
    floor_plan: '平面图',
    rendering: '效果图',
    budget: '预算单',
    other: '其他'
  },

  // 文件版本
  FILE_VERSION: {
    V1: 'V1',
    V2: 'V2',
    V3: 'V3',
    FINAL: '最终版'
  },

  // 文件确认状态
  FILE_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    REJECTED: 'rejected'
  },

  // 预设里程碑阶段
  MILESTONES: [
    { order: 0, name: '设计确认', icon: '📐' },
    { order: 1, name: '拆旧改造', icon: '🔨' },
    { order: 2, name: '水电工程', icon: '⚡' },
    { order: 3, name: '泥瓦工程', icon: '🧱' },
    { order: 4, name: '木工工程', icon: '🪵' },
    { order: 5, name: '油漆工程', icon: '🎨' },
    { order: 6, name: '软装进场', icon: '🛋️' },
    { order: 7, name: '竣工验收', icon: '✅' }
  ],

  // 装修风格选项
  STYLE_OPTIONS: [
    '现代简约', '北欧', '日式', '新中式',
    '轻奢', '美式', '法式', '工业风',
    '混搭', '其他'
  ],

  // 预算范围选项
  BUDGET_OPTIONS: [
    '10万以内', '10-20万', '20-30万',
    '30-50万', '50-80万', '80万以上'
  ],

  // 分页大小
  PAGE_SIZE: 10,

  // 图片上传最大数量
  MAX_IMAGES: 9,

  // 邀请码长度
  INVITE_CODE_LENGTH: 6,

  // 房间类型（按房间问卷用）
  ROOM_TYPES: [
    { key: 'living_room', label: '客厅' },
    { key: 'master_bedroom', label: '主卧' },
    { key: 'second_bedroom', label: '次卧' },
    { key: 'kitchen', label: '厨房' },
    { key: 'bathroom', label: '卫生间' },
    { key: 'study', label: '书房' },
    { key: 'balcony', label: '阳台' },
    { key: 'dining', label: '餐厅' },
    { key: 'children_room', label: '儿童房' },
    { key: 'other', label: '其他' }
  ],

  // 通知类型
  NOTIFICATION_TYPES: {
    FILE_UPLOAD: 'file_upload',
    FILE_CONFIRM: 'file_confirm',
    FILE_REJECT: 'file_reject',
    PROGRESS_PUBLISH: 'progress_publish',
    QUESTIONNAIRE_SUBMIT: 'questionnaire_submit',
    PROJECT_JOIN: 'project_join',
    NEW_MESSAGE: 'new_message'
  }
}

module.exports = constants
