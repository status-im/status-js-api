enum Topics {
  CONTACT_DISCOVERY_TOPIC = "0xf8946aac",
}

export default {
  messageTags: {
    contactRequest: "c2",
    message: "c4",
  },
  messageTypes: {
    GROUP_MESSAGE: "public-group-user-message",
    USER_MESSAGE:  "user-message",
  },
  post: {
    POW_TARGET: 0.002,
    POW_TIME: 1,
    TTL: 10,
  },
  regExp: {
    CONTACT_CODE_REGEXP: /^(0x)?[0-9a-f]{130}$/i,
  },
  contentType: {
    JSON: "content/json",
    TEXT: "text/plain"
  },
  topics: Topics,
};
