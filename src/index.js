const Web3 = require('web3');
const utils = require('./utils.js');
const { utils: { asciiToHex, hexToAscii, sha3  }  } = Web3;

const POW_TIME = 1;
const TTL = 10;
const POW_TARGET = 0.002;

function createStatusPayload(msg, isJson) {
  let tag = '~#c4';
  let content = msg;
  let messageType = '~:public-group-user-message';
  let clockValue = (new Date().getTime()) * 100;
  let contentType = (isJson ? 'content/json' : 'text/plain');
  let timestamp = new Date().getTime();
  return asciiToHex(
    JSON.stringify([
      tag,
      [content, contentType, messageType, clockValue, timestamp],
    ]),
  );
}

class StatusJS {

  constructor() {
    this.channels = {};
  }

  async connect(url) {
    let web3 = new Web3();
    web3.setProvider(new Web3.providers.WebsocketProvider(url, {headers: {Origin: "statusjs"}}));
    this.shh = web3.shh;
    await web3.shh.setMinPoW(POW_TARGET);
    this.sig = await web3.shh.newKeyPair();
  }

  async joinChat(channelName, cb) {
    let channelKey = await this.shh.generateSymKeyFromPassword(channelName);
    this.channels[channelName] = {
      channelName,
      channelKey,
      channelCode: Web3.utils.sha3(channelName).slice(0, 10)
    }
    if (cb) cb();
  }

  leaveChat(channelName) {
    this.channels[channelName].unsubscribe();
    delete this.channels[channelName];
  }

  isSubscribedTo(channelName) {
    return !!this.channels[channelName];
  }

  onMessage(channelName, cb) {
    if (!this.channels[channelName]) {
      return cb("unknown channel: " + channelName);
    }
    this.channels[channelName].subscription = this.shh.subscribe("messages", {
      minPow: POW_TARGET,
      symKeyID: this.channels[channelName].channelKey,
      topics: [this.channels[channelName].channelCode]
    }).on('data', (data) => {
      let username = utils.generateUsernameFromSeed(data.sig);
      cb(null, {payload: hexToAscii(data.payload), data: data, username: username});
    }).on('error', (err) => {
      cb(err);
    });
  }

  sendMessage(channelName, msg, cb) {
    if (!this.channels[channelName]) {
      return cb("unknown channel: " + channelName);
    }
    this.shh.post({
      symKeyID: this.channels[channelName].channelKey,
      sig: this.sig,
      ttl: TTL,
      topic: this.channels[channelName].channelCode,
      payload: createStatusPayload(msg),
      powTime: POW_TIME,
      powTarget: POW_TARGET
    }).then(() => {
      if (!cb) return;
      cb(null, true);
    }).catch((e) => {
      if (!cb) return;
      cb(e, false);
    });
  }

  sendJsonMessage(channelName, msg, cb) {
    if (!this.channels[channelName]) {
      return cb("unknown channel: " + channelName);
    }
    this.shh.post({
      symKeyID: this.channels[channelName].channelKey,
      sig: this.sig,
      ttl: TTL,
      topic: this.channels[channelName].channelCode,
      payload: createStatusPayload(JSON.stringify(msg), true),
      powTime: POW_TIME,
      powTarget: POW_TARGET
    }).then(() => {
      if (!cb) return;
      cb(null, true);
    }).catch((e) => {
      if (!cb) return;
      cb(e, false);
    });
  }

}

module.exports = StatusJS;


