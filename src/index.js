const Web3 = require('web3');
const utils = require('./utils.js');
const mailservers = require('./mailservers.js');

const { utils: { asciiToHex, hexToAscii, sha3  }  } = Web3;

const POW_TIME = 1;
const TTL = 10;
const POW_TARGET = 0.002;

const GROUP_MESSAGE = "~:public-group-user-message";
const USER_MESSAGE =  "~:user-message";

const CONTACT_DISCOVERY_TOPIC = '0xf8946aac';

const CONTACT_CODE_REGEXP = /^(0x)?[0-9a-f]{130}$/i;

function createStatusPayload(content, messageType, clockValue, isJson) {
  const tag = '~#c4';
  const oneMonthInMs = 60 * 60 * 24 * 31 * 1000;
  if(clockValue < (new Date().getTime())){
    clockValue = (new Date().getTime() + oneMonthInMs) * 100;
  }

  const contentType = (isJson ? 'content/json' : 'text/plain');
  const timestamp = new Date().getTime();

  return asciiToHex(
    JSON.stringify([
      tag,
      [content, contentType, messageType, clockValue, timestamp, ["^ ","~:text", content]],
    ]),
  );
}

const _sig = new WeakMap();
class StatusJS {

  constructor() {
    this.channels = {};
    this.contacts = {};
    this.userMessagesSubscription = null;
    this.mailservers = null;
  }

  async connect(url, privateKey) {
    let web3 = new Web3();
    if(url.startsWith("ws://")){
      web3.setProvider(new Web3.providers.WebsocketProvider(url, {headers: {Origin: "statusjs"}}));
    } else {
      const net = require('net');
      web3.setProvider(new Web3.providers.IpcProvider(url, net));
    }

    this.shh = web3.shh;
    this.mailservers = new mailservers(web3);

    await web3.shh.setMinPoW(POW_TARGET);
    _sig.set(
      this,
      privateKey ? await this.generateWhisperKeyFromWallet(privateKey) : await web3.shh.newKeyPair()
    );
  }

  async connectToProvider(provider, privateKey) {
    let web3 = new Web3();
    web3.setProvider(provider);

    this.shh = web3.shh;
    this.mailservers = new mailservers(web3);

    await web3.shh.setMinPoW(POW_TARGET);
    _sig.set(
      this,
      privateKey ? await this.generateWhisperKeyFromWallet(privateKey) : await web3.shh.newKeyPair()
    );
  }

  isConnected() {
    return this.shh.isListening();
  }

  async generateWhisperKeyFromWallet(key){
    return await this.shh.addPrivateKey(key);
  }

  async getPublicKey(){
    const pubKey = await this.shh.getPublicKey(_sig.get(this));
    return pubKey;
  }

  async getUserName(pubKey){
    if(!pubKey)
      pubKey = await this.getPublicKey();
    return utils.generateUsernameFromSeed(pubKey);
  }

  async joinChat(channelName, cb) {
    let channelKey = await this.shh.generateSymKeyFromPassword(channelName);
    this.channels[channelName] = {
      channelName,
      channelKey,
      lastClockValue: 0,
      channelCode: Web3.utils.sha3(channelName).slice(0, 10)
    }
    if (cb) cb();
  }

  async addContact(contactCode, cb) {
    this.contacts[contactCode] = {
      username: utils.generateUsernameFromSeed(contactCode),
      lastClockValue: 0
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
      symKeyID: this.channels[channelName].channelKey,
      topics: [this.channels[channelName].channelCode],
      allowP2P: true
    }).on('data', (data) => {
      let username = utils.generateUsernameFromSeed(data.sig);

      const payloadArray = JSON.parse(hexToAscii(data.payload));

      if(this.channels[channelName].lastClockValue < payloadArray[1][3]){
        this.channels[channelName].lastClockValue = payloadArray[1][3];
      }

      cb(null, {payload: hexToAscii(data.payload), data: data, username: username});
    }).on('error', (err) => {
      cb(err);
    });
  }

  onUserMessage(cb) {
    this.userMessagesSubscription = this.shh.subscribe("messages", {
      minPow: POW_TARGET,
      privateKeyID: _sig.get(this),
      topics: [CONTACT_DISCOVERY_TOPIC],
      allowP2P: true
    }).on('data', (data) => {
      if(!this.contacts[data.sig]){
        this.addContact(data.sig);
      }

      const payloadArray = JSON.parse(hexToAscii(data.payload));
      if(this.contacts[data.sig].lastClockValue < payloadArray[1][3]){
        this.contacts[data.sig].lastClockValue = payloadArray[1][3];
      }

      cb(null, {payload: hexToAscii(data.payload), data: data, username: this.contacts[data.sig].username});
    }).on('error', (err) => {
      cb(err);
    });
  }

  sendUserMessage(contactCode, msg, cb) {

    if(!this.contacts[contactCode]){
      this.addContact(contactCode);
    }
    this.contacts[contactCode].lastClockValue++;

    this.shh.post({
      pubKey: contactCode,
      sig: _sig.get(this),
      ttl: TTL,
      topic: CONTACT_DISCOVERY_TOPIC,
      payload: createStatusPayload(msg, USER_MESSAGE, this.contacts[contactCode].lastClockValue),
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

    this.channels[channelName].lastClockValue++;

    this.shh.post({
      symKeyID: this.channels[channelName].channelKey,
      sig: _sig.get(this),
      ttl: TTL,
      topic: this.channels[channelName].channelCode,
      payload: createStatusPayload(msg, GROUP_MESSAGE, this.channels[channelName].lastClockValue ),
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
      if(!this.contacts[destination]){
        this.addContact(destination);
      }
      this.contacts[destination].lastClockValue++;

      this.shh.post({
        pubKey: destination,
        sig: _sig.get(this),
        ttl: TTL,
        topic: CONTACT_DISCOVERY_TOPIC,
        payload: createStatusPayload(msg, USER_MESSAGE, this.contacts[destination].lastClockValue, true),
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
      this.channels[destination].lastClockValue++;

      this.shh.post({
        symKeyID: this.channels[destination].channelKey,
        sig: _sig.get(this),
        ttl: TTL,
        topic: this.channels[destination].channelCode,
        payload: createStatusPayload(JSON.stringify(msg), GROUP_MESSAGE, this.channels[destination].lastClockValue, true),
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
