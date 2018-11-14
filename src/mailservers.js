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
                    this.mailserver = mailserver;
    console.log("A");
                    if (!cb) return;
                    cb(null, true);
                }).catch((e) => {
                    if (!cb) return;
                    cb(e, false);
                });

          }
        );


        
    }

    requestMessages(cb){
        if(!this.mailserver){
            if(!cb) return;
            return cb("Mailserver is not set");
        }

        /*
        :topics         topics
        :mailServerPeer address
        :symKeyID       sym-key-id
        :timeout        request-timeout
        :from           from
        :to             to})
        */


        /*
       symKeyID - String (optional): ID of symmetric key for message encryption (Either symKeyID or pubKey must be present. Can not be both.).
       pubKey - String (optional): The public key for message encryption (Either symKeyID or pubKey must be present. Can not be both.).
       sig - String (optional): The ID of the signing key.
       ttl - Number: Time-to-live in seconds.
       topic - String: 4 Bytes (mandatory when key is symmetric): Message topic.
       payload - String: The payload of the message to be encrypted.
       padding - Number (optional): Padding (byte array of arbitrary length).
       powTime - Number (optional)?: Maximal time in seconds to be spent on proof of work.
       powTarget - Number (optional)?: Minimal PoW target required for this message.
       targetPeer - Number (optional): Peer ID (for peer-to-peer message only).  */

    }


}

module.exports = MailServers;
