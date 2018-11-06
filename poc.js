const Web3 = require('web3');
const { utils: { asciiToHex, hexToAscii, sha3  }  } = Web3;

const POW_TIME = 1;
const TTL = 10;
const POW_TARGET = 0.002;

const CHANNEL_NAME ="mytest"
const CHANNEL = Web3.utils.sha3(CHANNEL_NAME).slice(0, 10);

function createStatusPayload() {
  let tag = '~#c4';
  let content = 'Hello everyone, it\s status js';
  let messageType = '~:public-group-user-message';
  let clockValue = (new Date().getTime()) * 100;
  let contentType = 'text/plain';
  let timestamp = new Date().getTime();
  return asciiToHex(
   JSON.stringify([
    tag,
    [
     content,
     contentType,
     messageType,
     clockValue,
     timestamp,
    ],
   ]),
  );
}

(async () => {

  let web3 = new Web3();
  web3.setProvider(new Web3.providers.WebsocketProvider('ws://localhost:8546', {headers: {Origin: "statusjs"}}));

  await web3.shh.setMinPoW(POW_TARGET);

  let keys = {};

  // keys.symKeyID = await web3.shh.newSymKey();
  // keys.sig = await web3.shh.newKeyPair();
  keys.symKeyID = await web3.shh.generateSymKeyFromPassword(CHANNEL_NAME);
  keys.sig = await web3.shh.newKeyPair();

  console.dir("keys generated");
  console.dir(keys);

  subscription = web3.shh.subscribe("messages", {
    minPow: POW_TARGET,
    symKeyID: keys.symKeyID,
    topics: [CHANNEL]
  }).on('data', (data) => {
     console.dir("message received!");
     console.dir(data);
     console.dir(JSON.parse(hexToAscii(data.payload)));
  }).on('error', () => {
     console.dir("error receiving message");
  });

  web3.shh.post({
    symKeyID: keys.symKeyID, // encrypts using the sym key ID
    sig: keys.sig, // signs the message using the keyPair ID
    ttl: TTL,
    topic: CHANNEL,
    payload: createStatusPayload(),
    powTime: POW_TIME,
    powTarget: POW_TARGET
  }).then(() => {
    console.dir('message sent!');
 }).catch((e) => {
    console.dir("error sending message");
    console.dir(e);
 });

})()
