var StatusJS = require('./src/index.js');

(async () => {
var status = new StatusJS();
  await status.connect("ws://localhost:8546");

  await status.joinChat("mytest");
  await status.joinChat("mytest2");

  status.onMessage("mytest", (err, data) => {
    console.dir("received from api");
    console.dir("message received!");
    console.dir(data);
  });

  status.onMessage("mytest2", (err, data) => {
    console.dir("received from mytest2");
    console.dir("message received!");
    console.dir(data);
  });

  status.sendMessage("mytest", "hello world!");

  setInterval(() => {
    status.sendMessage("mytest", "hello world!");
    status.sendMessage("mytest2", "hello world!2");
  }, 3000);

})()
