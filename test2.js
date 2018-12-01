const StatusJS = require('./dist/index.js');
const Web3 = require('web3');
const { utils: { asciiToHex, hexToAscii  }  } = Web3;

(async () => {
  let status1 = new StatusJS();
  await status1.connect("ws://localhost:8546");

  let status2 = new StatusJS();
  await status2.connect("ws://localhost:8546");


  const user1pubKey = await status1.getPublicKey();
  const user2pubKey = await status2.getPublicKey();

  console.log("user1 (" + await status1.getUserName() + "):\n" + user1pubKey);
  console.log("user2 (" + await status2.getUserName() + "):\n" + user2pubKey);
  console.log("\n")


  const receivedMessageCb = (username) =>  (err, data) => {
    console.log( username + " received a message from " + data.username);
    console.log(data.data.sig);
    console.log(data.payload)
  };


  status1.onMessage(receivedMessageCb('user1'));
  status2.onMessage(receivedMessageCb('user2'));

  status1.addContact(user2pubKey);
  status1.sendMessage(user2pubKey, "hello user2!");

  status2.sendMessage(user1pubKey, "hello user1!");


  // Text someone at status
  //status1.sendMessage("0xcontact_code_here", "hello!");


})()
