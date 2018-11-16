var StatusJS = require('./src/index.js');

(async () => {
var status = new StatusJS();
  await status.connect("/home/richard/.statusd/geth.ipc");

  const channel = "mytest";

  await status.joinChat(channel);

  status.onMessage(channel, (err, data) => {
    console.dir(data.payload);
  });

  status.mailservers.useMailserver("mail-02.gc-us-central1-a.eth.beta", (err, res) => {
    status.mailservers.requestMessages(channel, {}, (err, res) => { if(err) console.log(err); });
  });

  setInterval(() => { }, 3000);
})()
