const StatusJS = require('../dist/index.js');

(async () => {
  const status = new StatusJS();
  await status.connect("ws://localhost:8547", "0x0011223344556677889900112233445566778899001122334455667788990011");

  console.log(await status.getPublicKey());

  const channel = "mytest";
  await status.joinChat(channel);

  status.onMessage(channel, (err, data) => {
    if(!err) 
      console.log("PubMessage: " + data.payload);
  });

  status.onMessage((err, data) => {
    if(!err) 
      console.log("PrivMessage: " + data.payload);
  });

  // mail-02.gc-us-central1-a.eth.beta
  const enode = "enode://015e22f6cd2b44c8a51bd7a23555e271e0759c7d7f52432719665a74966f2da456d28e154e836bee6092b4d686fe67e331655586c57b718be3997c1629d24167@35.226.21.19:30504";

  status.mailservers.useMailserver(enode, (err, res) => {
    let from = parseInt((new Date()).getTime() / 1000 - 86400, 10);
    let to = parseInt((new Date()).getTime() / 1000, 10);

    // Public channel messages
    status.mailservers.requestChannelMessages(channel, {from, to}, (err, res) => { 
      if(err) console.log(err); 
    }); 

    // Private user messages
    status.mailservers.requestUserMessages({from, to}, (err, res) => { 
      if(err) console.log(err); 
    });
  });

  setInterval(() => { }, 3000);
})();
