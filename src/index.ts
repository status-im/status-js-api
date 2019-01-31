import web3Lib from "web3";
import utils from "./utils.js";
import mailservers from "./mailservers.js";
import constants from "./constants.js";

const Web3 = window && window.web3 ? new web3Lib(window.web3.currentProvider) : web3Lib;
const { utils: { asciiToHex, hexToAscii  }  } = Web3;

function createStatusPayload(content: string, messageType: string, clockValue: number, isJson = false) {
  const tag: string = constants.messageTags.message;
  const oneMonthInMs: number = 60 * 60 * 24 * 31 * 1000;
  if (clockValue < (new Date().getTime())) {
    clockValue = (new Date().getTime() + oneMonthInMs) * 100;
  }

  const contentType = (isJson ? "content/json" : "text/plain");
  const timestamp = new Date().getTime();

  return asciiToHex(
    JSON.stringify([
      tag,
      [content, contentType, messageType, clockValue, timestamp, ["^ ", "~:text", content]],
    ]),
  );
}

const sig = new WeakMap();

class StatusJS {
  private channels: any;
  private contacts: any;
  private userMessagesSubscription: any;
  private mailservers: any;
  private isHttpProvider: boolean;
  private shh: any;
  private chatRequestCb: any;

  constructor() {
    this.channels = {};
    this.contacts = {};
    this.userMessagesSubscription = null;
    this.mailservers = null;
    this.isHttpProvider = false;
  }

  public async connect(url: string, privateKey?: string) {
    const web3: any = new Web3();
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
    const web3: any = new Web3();
    web3.setProvider(provider);

    this.shh = web3.shh;
    this.mailservers = new mailservers(web3);

    await web3.shh.setMinPoW(constants.post.POW_TARGET);
    _sig.set(
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

  public async joinChat(channelName: string, cb?: any) {
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
    return !!this.channels[channelName];
  }

  public onMessage(par1: any, par2: any) {
    if (typeof par1 === "function") {
      this.onUserMessage(par1);
    } else {
      this.onChannelMessage(par1, par2);
    }
  }

  public onChatRequest(cb: any) {
    this.chatRequestCb = cb;
  }

  public onChannelMessage(channelName: string, cb: any) {
    if (!this.channels[channelName]) {
      return cb("unknown channel: " + channelName);
    }

    const filters = {
      allowP2P: true,
      symKeyID: this.channels[channelName].channelKey,
      topics: [this.channels[channelName].channelCode],
    };

    const messageHandler = (data: any) => {
      const username = utils.generateUsernameFromSeed(data.sig);
      const payloadArray = JSON.parse(hexToAscii(data.payload));
      if (this.channels[channelName].lastClockValue < payloadArray[1][3]) {
        this.channels[channelName].lastClockValue = payloadArray[1][3];
      }
      cb(null, {payload: hexToAscii(data.payload), data, username});
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

      const payloadArray = JSON.parse(hexToAscii(data.payload));
      if (this.contacts[data.sig].lastClockValue < payloadArray[1][3]) {
        this.contacts[data.sig].lastClockValue = payloadArray[1][3];
      }

      if (payloadArray[0] === constants.messageTags.message) {
        cb(null, {payload: hexToAscii(data.payload), data, username: this.contacts[data.sig].username});
      } else if (payloadArray[0] === constants.messageTags.chatRequest) {
        this.contacts[data.sig].displayName = payloadArray[1][0];
        this.contacts[data.sig].profilePic = payloadArray[1][1];

        if (this.chatRequestCb) {
          this.chatRequestCb(null, {
            displayName: this.contacts[data.sig].displayName,
            profilePic: this.contacts[data.sig].profilePic,
            username: this.contacts[data.sig].username,
          });
        }
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
      payload: createStatusPayload(msg, constants.messageTypes.USER_MESSAGE, this.contacts[contactCode].lastClockValue),
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
    if (!this.channels[channelName]) {
      if (!cb) {
        return;
      }
      return cb("unknown channel: " + channelName);
    }

    this.channels[channelName].lastClockValue++;

    this.shh.post({
      payload: createStatusPayload(msg, constants.messageTypes.GROUP_MESSAGE, this.channels[channelName].lastClockValue),
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
        payload: createStatusPayload(msg, constants.messageTypes.USER_MESSAGE, this.contacts[destination].lastClockValue, true),
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
        payload: createStatusPayload(JSON.stringify(msg), constants.messageTypes.GROUP_MESSAGE, this.channels[destination].lastClockValue, true),
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

}

module.exports = StatusJS;
