const Web3 = require('web3');
const { utils: { asciiToHex, hexToAscii, sha3  }  } = Web3;

const POW_TIME = 1;
const TTL = 10;
const POW_TARGET = 0.002;
const CHANNEL = Web3.utils.sha3("status").slice(0, 10);

function createStatusPayload(
	{
		tag = '~#c4',
		content = 'Hello everyone',
		messageType = '~:public-group-user-message',
		clockValue = (new Date().getTime()) * 100,
		contentType = 'text/plain',
		timestamp = new Date().getTime(),

	} = {},
) {
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
  web3.setProvider(new Web3.providers.WebsocketProvider('ws://localhost:8546', {headers: {Origin: "http://localhost:8080"}}));

  let keys = {};

  keys.symKeyID = await web3.shh.newSymKey();
  keys.sig = await web3.shh.newKeyPair();

  console.dir("keys generated");
  console.dir(keys);

	subscription = web3.shh.subscribe("messages", {
		symKeyID: keys.symKeyID,
		topics: [CHANNEL]
	}).on('data', (data) => {
    console.dir("message received!");
    console.dir(data);
	});

  web3.shh.post({
    symKeyID: keys.symKeyID, // encrypts using the sym key ID
    sig: keys.sig, // signs the message using the keyPair ID
    ttl: TTL,
    topic: CHANNEL,
    payload: createStatusPayload("hello there"),
    powTime: POW_TIME,
    powTarget: POW_TARGET
  }).then(() => {
    console.dir('message sent!');
  })

})()
