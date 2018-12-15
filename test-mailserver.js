var StatusJS = require('./dist/index.js');

(async () => {
var status = new StatusJS();
  await status.connect("ws://localhost:8546");
 // await status.connect("/home/richard/.statusd/geth.ipc");

  const channel = "mytest";

  await status.joinChat(channel);

  status.onMessage(channel, (err, data) => {
    console.log(data.payload);
  });

  status.mailservers.useMailserver("mail-02.gc-us-central1-a.eth.beta", (err, res) => {

    const from = 1544783388; // unix timestamp
    const to = 1544846928;

    status.mailservers.requestMessages(channel, {from, to}, (err, res) => { 
      if(err) console.log(err); 
    });
  });

  setInterval(() => { }, 3000);
})();
