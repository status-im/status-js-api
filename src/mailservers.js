const mailserverList = require('./data/mailservers.json');

class MailServers {
    constructor(web3){
        this.web3 = web3;
        this.mailserver = null;
    }

    useMailserver(mailserver, cb){
        if(!mailserverList[mailserver]){
            if(!cb) return;
            cb("unknown mailserver: " + mailserver);
        }

        this.web3.currentProvider.send({
            method: "admin_addPeer",
            params: [mailserverList[mailserver]],
            jsonrpc: "2.0",
            id: new Date().getTime()
          }, (err, res) => {
            if(err){
                if(cb) return cb(err);
                return;
            }

            if(!res.result){
                if(cb) return cb(err);
                return;
            }

            const peerId = mailserverList[mailserver].substr(8, 128);
            
            this.web3.shh.markTrustedPeer(peerId)
            .then(() => {
                this.mailserver = peerId;
                if (!cb) return;
                cb(null, true);
            }).catch((e) => {
                if (!cb) return;
                cb(e, false);
            });
          }
        );
    }

    async requestMessages(cb){
        if(!this.mailserver){
            if(!cb) return;
            return cb("Mailserver is not set");
        }

        const symKeyID = await this.web3.shh.generateSymKeyFromPassword("status-offline-inbox");

        // TODO: extract this as parameters
        const topic =  await this.web3.shh.generateSymKeyFromPassword("mytest");
        const from = (new Date("2018-11-13 00:00:00")).getTime();
        const to = (new Date("2018-11-14 20:00:00")).getTime();

        this.web3.currentProvider.send({
            method: "shh_requestMessages",
            params: [mailserverList[this.mailserver], topic, symKeyID, from, to ],
            jsonrpc: "2.0",
            id: new Date().getTime()
          }, (err, res) => {

            // TODO: implement result handling

            if(err){
                console.log(err);
            }

            console.log(res);
        });

       

    }


}

module.exports = MailServers;
