module.exports = {
  post: {
    POW_TIME: 1,
    TTL: 10,
    POW_TARGET: 0.002
  },
  messageTypes: {
    GROUP_MESSAGE: "~:public-group-user-message",
    USER_MESSAGE:  "~:user-message"
  },
  messageTags: {
    message: "~#c4",
    chatRequest: "~#c2"
  },
  topics: {
    CONTACT_DISCOVERY_TOPIC: '0xf8946aac'
  },
  regExp: {
    CONTACT_CODE_REGEXP: /^(0x)?[0-9a-f]{130}$/i
  }
};
