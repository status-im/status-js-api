var StatusJS = require('./src/index.js');

(async () => {
var status = new StatusJS();
  await status.connect("ws://localhost:8546");

  status.mailservers.useMailserver("mail-02.gc-us-central1-a.eth.beta",  (err, res) => {
    console.log(err);
    console.log(res);
  });

})()
