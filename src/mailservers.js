const mailserverList = require('./data/mailservers.json');

class MailServers {
    constructor(web3){
        this.web3 = web3;
        this.mailserver = null;
    }

    async useMailserver(mailserver, cb){
        var enode = mailserverList[mailserver];

        if(!enode){
            if(!cb) return;
            cb("unknown mailserver: " + mailserver);
        }

        this.symKeyID = await this.web3.shh.generateSymKeyFromPassword("status-offline-inbox");

        this.web3.currentProvider.send({
            method: "admin_addPeer",
            params: [enode],
            jsonrpc: "2.0",
            id: new Date().getTime()
        }, (err, res) => {
            if(err){
                if(cb) return cb(err, false);
                return;
            }

            if(!res.result){
                if(cb) return cb(err, false);
                return;
            }

            this.web3.shh.markTrustedPeer(enode)
                .then(res => {
                    this.mailserver = enode;
                    if (!cb) return true;
                    cb(null, true);
                }).catch((e) => {
                    console.log(e);
                    if (!cb) return;
                    cb(e, false);
                });
        });
    }

    async requestMessages(topic, options, cb){
        if(!this.mailserver){
            if(!cb) return;
            return cb("Mailserver is not set", false);
        }

        const topics =   [this.web3.utils.sha3(topic).slice(0, 10)];
        const mailserverPeer = this.mailserver;
        const timeout = options.timeout || 30; // seconds
        const symKeyID = this.symKeyID;
        const from = options.from || 0; // unix timestamp
        const to = options.to || 0;
        const limit = options.limit || 0;

        this.web3.currentProvider.send({
            method: "shhext_requestMessages",
            params: [{
                mailserverPeer, 
                symKeyID,
                timeout,
                topics,
                from,
                to,
                limit
            }],
            jsonrpc: "2.0",
            id: new Date().getTime()
        }, (err, res) => {
            if(err){
                if(cb) return cb(err);
                return false;
            }

            if(cb) return cb(null, true);
            return true;
        });
    }
}

module.exports = MailServers;
