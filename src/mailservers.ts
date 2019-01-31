import constants from "./constants.js";

const Topics = constants.topics;

class MailServers {
  private web3: any;
  private mailserver: string = "";
  private symKeyID: string = "";

  constructor(web3: any) {
    this.web3 = web3;
  }

  public async useMailserver(enode: string, cb?: any) {
    this.symKeyID = await this.web3.shh.generateSymKeyFromPassword("status-offline-inbox");

    this.web3.currentProvider.send({
      id: new Date().getTime(),
      jsonrpc: "2.0",
      method: "admin_addPeer",
      params: [enode],
    },
    (err: any, res: any) => {
      if (err) {
        if (cb) {
          return cb(err, false);
        }
        return;
      }

      if (!res.result) {
        if (cb) {
          return cb(err, false);
        }
        return;
      }

      setTimeout(() => {
        this.web3.shh.markTrustedPeer(enode)
        .then(() => {
          this.mailserver = enode;
          if (!cb) {
            return true;
          }
          cb(null, true);
        }).catch((e?: any) => {
          if (!cb) {
            return;
          }
          cb(e, false);
        });
      }, 1000);
    });
  }

  public async requestUserMessages(options: any, cb?: any) {
    await this.requestChannelMessages(constants.topics.CONTACT_DISCOVERY_TOPIC, options, cb);
  }

  public async requestChannelMessages(topic: string|Topics, options: any, cb?: any) {
    if (this.mailserver === "") {
      if (!cb) {
        return;
      }
      return cb("Mailserver is not set", false);
    }

    const topics = [ topic.slice(0, 2) === "0x" ? topic : this.web3.utils.sha3(topic).slice(0, 10)];

    const mailserverPeer = this.mailserver;

    const timeout = options.timeout || 30; // seconds
    const symKeyID = this.symKeyID;
    const from = options.from || 0; // unix timestamp
    const to = options.to || 0;
    const limit = options.limit || 0;

    this.web3.currentProvider.send({
      id: new Date().getTime(),
      jsonrpc: "2.0",
      method: "shhext_requestMessages",
      params: [
        {
          from,
          limit,
          mailserverPeer,
          symKeyID,
          timeout,
          to,
          topics,
        },
      ],
    },
    (err?: any, res?: any) => {
      if (err) {
        if (cb) {
          return cb(err);
        }
        return false;
      }

      if (cb) {
       return cb(null, true);
      }
      return true;
    });
  }
}

export default MailServers;
