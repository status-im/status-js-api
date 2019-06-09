import web3Lib from "web3";
import utils from "./utils.js";
import mailservers from "./mailservers";
import constants from "./constants";
import Bourne from "bourne";
import transit from "transit-js";

declare global {
  interface Window { web3: any; }
}

if (typeof window !== "undefined") {
  window.web3 = window.web3 || {};
}

class Message {
  public content: string;
  public contentType: string;
  public messageType: string;
  public clockValue: number;
  public timestamp: number;

  constructor(content: string, contentType: string, messageType: string, clockValue: number, timestamp: number){
    this.content = content;
    this.contentType = contentType;
    this.messageType = messageType;
    this.clockValue = clockValue;
    this.timestamp = timestamp;
  }
}

const mh = transit.makeWriteHandler({
  tag: function() { return constants.messageTags.message; },
  rep: function(v) { return [v.content, v.contentType, transit.keyword(v.messageType), v.clockValue, v.timestamp]; },
  stringRep: function() { return null; }
})

const Web3 = typeof window !== "undefined" && window.web3 ? new web3Lib(window.web3.currentProvider) : web3Lib;
const { utils: { stringToHex, hexToUtf8  }  } = Web3;
// TODO: create a transit-js reader
const reader = transit.reader("json");
const writer = transit.writer("json", {
  "handlers": transit.map([Message, mh])
});

function createStatusPayload(content: any, messageType: string, clockValue: number, contentType: string) {
  const oneMonthInMs: number = 60 * 60 * 24 * 31 * 1000;
  if (clockValue < (new Date().getTime())) {
    clockValue = (new Date().getTime() + oneMonthInMs) * 100;
  }

  const timestamp = new Date().getTime();

  const message = new Message(content, contentType, messageType, clockValue, timestamp);
  const payload = writer.write(message);

  return stringToHex(payload);
}

const sig = new WeakMap();

class StatusJS {
  private channels: any;
  private contacts: any;
  private userMessagesSubscription: any;
  private mailservers: any;
  private isHttpProvider: boolean;
  private shh: any;
  private contactRequestCb: any;

  constructor() {
    this.channels = {};
    this.contacts = {};
    this.userMessagesSubscription = null;
    this.mailservers = null;
    this.isHttpProvider = false;
  }

  public async connect(url: string, privateKey?: string) {
    const web3: any = new web3Lib();
    if (url.startsWith("ws://")) {
      web3.setProvider(new Web3.providers.WebsocketProvider(url, {headers: {Origin: "statusjs"}}));
    } else if (url.startsWith("http://") || url.startsWith("https://")) {
      // Deprecated but required for statusd
      web3.setProvider(new Web3.providers.HttpProvider(url));
      this.isHttpProvider = true;
    } else {
      const net = require("net");
      web3.setProvider(new Web3.providers.IpcProvider(url, net));
    }

    this.shh = web3.shh;
    this.mailservers = new mailservers(web3);

    await web3.shh.setMinPoW(constants.post.POW_TARGET);
    sig.set(
      this,
      privateKey ? await this.generateWhisperKeyFromWallet(privateKey) : await web3.shh.newKeyPair(),
    );
  }

  public async connectToProvider(provider: any, privateKey: any) {
    const web3: any = new web3Lib(provider);

    this.shh = web3.shh;
    this.mailservers = new mailservers(web3);

    await web3.shh.setMinPoW(constants.post.POW_TARGET);
    sig.set(
      this,
      privateKey ? await this.generateWhisperKeyFromWallet(privateKey) : await web3.shh.newKeyPair(),
    );
  }

  public isConnected() {
    return this.shh.isListening();
  }

  private async generateWhisperKeyFromWallet(key: string) {
    const keyId = await this.shh.addPrivateKey(key);
    return keyId;
  }

  public async getPublicKey() {
    const pubKey = await this.shh.getPublicKey(sig.get(this));
    return pubKey;
  }

  public async getUserName(pubKey?: any) {
    if (!pubKey) {
      pubKey = await this.getPublicKey();
    }

    return utils.generateUsernameFromSeed(pubKey);
  }

  private cleanChannelName(c: string) {
    if(c.startsWith('#')) return c.substr(1);
    return c;
  }

  public async joinChat(channelName: string, cb?: any) {
    channelName = this.cleanChannelName(channelName);

    const channelKey = await this.shh.generateSymKeyFromPassword(channelName);
    this.channels[channelName] = {
      channelCode: Web3.utils.sha3(channelName).slice(0, 10),
      channelKey,
      channelName,
      lastClockValue: 0,
    };
    if (cb) {
      cb();
    }
  }

  public async addContact(contactCode: string, cb?: any) {
    this.contacts[contactCode] = {
      lastClockValue: 0,
      username: utils.generateUsernameFromSeed(contactCode),
    };
    if (cb) {
      cb();
    }
  }

  public leaveChat(channelName: string) {
    channelName = this.cleanChannelName(channelName);

    if (!this.isHttpProvider) {
      this.channels[channelName].subscription.unsubscribe();
    } else {
      this.shh.deleteMessageFilter(this.channels[channelName].filterId)
        .then(() => {
          clearInterval(this.channels[channelName].interval);
        });
    }
    delete this.channels[channelName];
  }

  public async removeContact(contactCode: string) {
    delete this.contacts[contactCode];
  }

  public isSubscribedTo(channelName: string) {
    channelName = this.cleanChannelName(channelName);
    return !!this.channels[channelName];
  }

  public onMessage(par1: any, par2: any) {
    if (typeof par1 === "function") {
      this.onUserMessage(par1);
    } else {
      this.onChannelMessage(par1, par2);
    }
  }

  public onContactRequest(cb: any) {
    this.contactRequestCb = cb;
  }

  public onChannelMessage(channelName: string, cb: any) {
    channelName = this.cleanChannelName(channelName);

    if (!this.channels[channelName]) {
      return cb("unknown channel: " + channelName);
    }

    const filters = {
      allowP2P: true,
      symKeyID: this.channels[channelName].channelKey,
      topics: [this.channels[channelName].channelCode],
    };

    const messageHandler = (data: any) => {
      try {
        const username = utils.generateUsernameFromSeed(data.sig);
        const payload = reader.read(hexToUtf8(data.payload));
        const clockValue = payload.rep[3];
        if (this.channels[channelName].lastClockValue < clockValue) {
          this.channels[channelName].lastClockValue = clockValue;
        }
        cb(null, {payload: [payload.rep[0], payload.rep[1], payload.rep[2]._name, payload.rep[3], payload.rep[4]], data, username});
      } catch (err) {
        cb("Discarding invalid message received");
      }
    };

    if (this.isHttpProvider) {
      this.shh.newMessageFilter(filters)
      .then((filterId: any) => {
        this.channels[channelName].filterId = filterId;
        this.channels[channelName].interval = setInterval(() => {
          this.shh.getFilterMessages(filterId)
          .then((data: any) => {
            data.map((d: any) => {
              messageHandler(d);
            });
          })
          .catch((err: any) => { cb(err); });
        }, 250);
      });
    } else {
      this.channels[channelName].subscription = this.shh.subscribe("messages", filters)
                                                              .on("data", messageHandler)
                                                              .on("error", (err: any) => { cb(err); });
    }
  }

  public onUserMessage(cb: any) {
    const filters = {
      allowP2P: true,
      minPow: 0,
      privateKeyID: sig.get(this),
      topics: [constants.topics.CONTACT_DISCOVERY_TOPIC],
    };

    const messageHandler = (data: any) => {
      if (!this.contacts[data.sig]) {
        this.addContact(data.sig);
      }

      try {
        const payload = reader.read(hexToUtf8(data.payload));
        const tag = payload.tag;
        const clockValue = payload.rep[3];
        if (this.contacts[data.sig].lastClockValue < clockValue) {
          this.contacts[data.sig].lastClockValue = clockValue;
        }

        if (tag === constants.messageTags.message) {
          cb(null, {payload: [payload.rep[0], payload.rep[1], payload.rep[2]._name, payload.rep[3], payload.rep[4]], data, username: this.contacts[data.sig].username});
        } else if (tag === constants.messageTags.contactRequest) {
          this.contacts[data.sig].displayName = payload.rep[0];
          this.contacts[data.sig].profilePic = payload.rep[1];

          if (this.contactRequestCb) {
            this.contactRequestCb(null, {
              displayName: this.contacts[data.sig].displayName,
              profilePic: this.contacts[data.sig].profilePic,
              username: this.contacts[data.sig].username,
            });
          }
        }
      } catch (err) {
        cb("Discarding invalid message received");
      }
    };

    if (this.isHttpProvider) {
      this.shh.newMessageFilter(filters)
      .then((filterId: any) => {
        this.userMessagesSubscription = {};
        this.userMessagesSubscription.filterId = filterId;
        this.userMessagesSubscription.interval = setInterval(() => {
          this.shh.getFilterMessages(filterId)
          .then((data: any) => {
            data.map((d: any) => {
              messageHandler(d);
            });
          })
          .catch((err: any) => { cb(err); });
        }, 250);
      });
    } else {
      this.userMessagesSubscription = this.shh.subscribe("messages", filters)
                                                     .on("data", (data: any) => { messageHandler(data); })
                                                     .on("error", (err: any) => { cb(err); });
    }
  }

  public sendUserMessage(contactCode: string, msg: string, cb?: any) {
    if (!this.contacts[contactCode]) {
      this.addContact(contactCode);
    }
    this.contacts[contactCode].lastClockValue++;

    this.shh.post({
      payload: createStatusPayload(msg, constants.messageTypes.USER_MESSAGE, this.contacts[contactCode].lastClockValue,
                                   constants.contentType.TEXT),
      powTarget: constants.post.POW_TARGET,
      powTime: constants.post.POW_TIME,
      pubKey: contactCode,
      sig: sig.get(this),
      topic: constants.topics.CONTACT_DISCOVERY_TOPIC,
      ttl: constants.post.TTL,
    }).then(() => {
      if (!cb) {
        return;
      }
      cb(null, true);
    }).catch((e: any) => {
      if (!cb) {
        return;
      }
      cb(e, false);
    });
  }

  public sendGroupMessage(channelName: string, msg: string, cb?: any) {
    channelName = this.cleanChannelName(channelName);
    if (!this.channels[channelName]) {
      if (!cb) {
        return;
      }
      return cb("unknown channel: " + channelName);
    }

    this.channels[channelName].lastClockValue++;

    this.shh.post({
      payload: createStatusPayload(msg, constants.messageTypes.GROUP_MESSAGE, this.channels[channelName].lastClockValue,
                                   constants.contentType.TEXT),
      powTarget: constants.post.POW_TARGET,
      powTime: constants.post.POW_TIME,
      sig: sig.get(this),
      symKeyID: this.channels[channelName].channelKey,
      topic: this.channels[channelName].channelCode,
      ttl: constants.post.TTL,
    }).then(() => {
      if (!cb) {
        return;
      }
      cb(null, true);
    }).catch((e: any) => {
      if (!cb) {
        return;
      }
      cb(e, false);
    });
  }

  public sendJsonMessage(destination: string, msg: string, cb?: any) {
    if (constants.regExp.CONTACT_CODE_REGEXP.test(destination)) {
      if (!this.contacts[destination]) {
        this.addContact(destination);
      }
      this.contacts[destination].lastClockValue++;

      this.shh.post({
        payload: createStatusPayload(msg, constants.messageTypes.USER_MESSAGE, this.contacts[destination].lastClockValue,
                                     constants.contentType.JSON),
        powTarget: constants.post.POW_TARGET,
        powTime: constants.post.POW_TIME,
        pubKey: destination,
        sig: sig.get(this),
        topic: constants.topics.CONTACT_DISCOVERY_TOPIC,
        ttl: constants.post.TTL,
      }).then(() => {
        if (!cb) {
          return;
        }
        cb(null, true);
      }).catch((e: any) => {
        if (!cb) {
          return;
        }
        cb(e, false);
      });
    } else {
      this.channels[destination].lastClockValue++;

      this.shh.post({
        payload: createStatusPayload(JSON.stringify(msg), constants.messageTypes.GROUP_MESSAGE,
                                     this.channels[destination].lastClockValue, constants.contentType.JSON),
        powTarget: constants.post.POW_TARGET,
        powTime: constants.post.POW_TIME,
        sig: sig.get(this),
        symKeyID: this.channels[destination].channelKey,
        topic: this.channels[destination].channelCode,
        ttl: constants.post.TTL,
      }).then(() => {
        if (!cb) {
          return;
        }
        cb(null, true);
      }).catch((e: any) => {
        if (!cb) {
          return;
        }
        cb(e, false);
      });
    }
  }

  public sendMessage(destination: string, msg: string, cb?: any) {
    if (constants.regExp.CONTACT_CODE_REGEXP.test(destination)) {
      this.sendUserMessage(destination, msg, cb);
    } else {
      this.sendGroupMessage(destination, msg, cb);
    }
  }

  public sendContent(contactCode: string, content: any, contentType: string, cb?: any) {
    if (!this.contacts[contactCode]) {
      this.addContact(contactCode);
    }
    this.contacts[contactCode].lastClockValue++;

    this.shh.post({
      payload: createStatusPayload(content, constants.messageTypes.USER_MESSAGE, this.contacts[contactCode].lastClockValue,
                                   contentType),
      powTarget: constants.post.POW_TARGET,
      powTime: constants.post.POW_TIME,
      pubKey: contactCode,
      sig: sig.get(this),
      topic: constants.topics.CONTACT_DISCOVERY_TOPIC,
      ttl: constants.post.TTL,
    }).then(() => {
      if (!cb) {
        return;
      }
      cb(null, true);
    }).catch((e: any) => {
      if (!cb) {
        return;
      }
      cb(e, false);
    });
  }
}

module.exports = StatusJS;
