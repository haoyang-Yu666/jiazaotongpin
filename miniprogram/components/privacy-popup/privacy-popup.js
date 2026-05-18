Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onAgree() {
      this.triggerEvent('agree')
    },

    onDisagree() {
      this.triggerEvent('disagree')
    },

    onViewPrivacy() {
      wx.openPrivacyContract()
    }
  }
})
