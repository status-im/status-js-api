const Web3 = require('web3');
const utils = require('./utils.js');
const { utils: { asciiToHex, hexToAscii, sha3  }  } = Web3;

const POW_TIME = 1;
const TTL = 10;
const POW_TARGET = 0.002;

const GROUP_MESSAGE = "~:public-group-user-message";
const USER_MESSAGE =  "~:user-message";

const CONTACT_DISCOVERY_TOPIC = '0xf8946aac';

const CONTACT_CODE_REGEXP = /^(0x)?[0-9a-f]{130}$/i;

function createStatusPayload(content, messageType, isJson) {
  const tag = '~#c4';
  const clockValue = (new Date().getTime()) * 100;
  const contentType = (isJson ? 'content/json' : 'text/plain');
  const timestamp = new Date().getTime();
  
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
    this.contacts = {};
    this.userMessagesSubscription = null;
  }

  async connect(url) {
    let web3 = new Web3();
    web3.setProvider(new Web3.providers.WebsocketProvider(url, {headers: {Origin: "statusjs"}}));
    this.shh = web3.shh;
    await web3.shh.setMinPoW(POW_TARGET);
    this.sig = await web3.shh.newKeyPair();
  }

  async getPublicKey(){
    const pubKey = await this.shh.getPublicKey(this.sig);
    return pubKey;
  }

  async getUserName(){
    const pubKey = await this.getPublicKey();
    return utils.generateUsernameFromSeed(pubKey);
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

  async addContact(contactCode, cb) {
    this.contacts[contactCode] = {
      'username': utils.generateUsernameFromSeed(contactCode)
    }
    if (cb) cb();
  }

  leaveChat(channelName) {
    this.channels[channelName].subscription.unsubscribe();
    delete this.channels[channelName];
  }

  async removeContact(contactCode, cb) {
    delete this.contacts[contactCode];
  }

  isSubscribedTo(channelName) {
    return !!this.channels[channelName];
  }

  onMessage(par1, par2) {
    if(typeof par1 === "function"){
      this.onUserMessage(par1);
    } else {
      this.onChannelMessage(par1, par2);
    }
  }

  onChannelMessage(channelName, cb) {
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

  onUserMessage(cb) {
    this.userMessagesSubscription = this.shh.subscribe("messages", {
      minPow: POW_TARGET,
      privateKeyID: this.sig,
      topics: [CONTACT_DISCOVERY_TOPIC]
    }).on('data', (data) => {
      let username = utils.generateUsernameFromSeed(data.sig);
      if(!this.contacts[data.sig]) this.contacts[data.sig] = {};
      this.contacts[data.sig].username = username;
      cb(null, {payload: hexToAscii(data.payload), data: data, username: username});
    }).on('error', (err) => {
      cb(err);
    });
  }

  sendUserMessage(contactCode, msg, cb) {    
    this.shh.post({
      pubKey: contactCode,
      sig: this.sig,
      ttl: TTL,
      topic: CONTACT_DISCOVERY_TOPIC,
      payload: createStatusPayload(msg, USER_MESSAGE),
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

  sendGroupMessage(channelName, msg, cb) {
    if (!this.channels[channelName]) {
      if(!cb) return;
      return cb("unknown channel: " + channelName);
    }

    this.shh.post({
      symKeyID: this.channels[channelName].channelKey,
      sig: this.sig,
      ttl: TTL,
      topic: this.channels[channelName].channelCode,
      payload: createStatusPayload(msg, GROUP_MESSAGE),
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






  sendJsonMessage(destination, msg, cb) {
    if (CONTACT_CODE_REGEXP.test(destination)) {
      this.shh.post({
        pubKey: destination,
        sig: this.sig,
        ttl: TTL,
        topic: CONTACT_DISCOVERY_TOPIC,
        payload: createStatusPayload(msg, USER_MESSAGE),
        powTime: POW_TIME,
        powTarget: POW_TARGET
      }).then(() => {
        if (!cb) return;
        cb(null, true);
      }).catch((e) => {
        if (!cb) return;
        cb(e, false);
      });   
    } else {
      this.shh.post({
        symKeyID: this.channels[destination].channelKey,
        sig: this.sig,
        ttl: TTL,
        topic: this.channels[destination].channelCode,
        payload: createStatusPayload(JSON.stringify(msg), GROUP_MESSAGE, true),
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








  
  sendMessage(destination, msg, cb){
    if (CONTACT_CODE_REGEXP.test(destination)) {
      this.sendUserMessage(destination, msg, cb);
    } else {
      this.sendGroupMessage(destination, msg, cb);
    }
  }

}

module.exports = StatusJS;


