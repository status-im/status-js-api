const StatusJS = require('./dist/index.js');

(async () => {
  const status = new StatusJS();
  
  await status.connect("ws://localhost:8546");

  await status.joinChat("mytest");

  status.onMessage("mytest", (err, data) => {
    if(err) {
      console.error("Error: " + err);
      return;
    }

    console.log("message received:");
    console.dir(data);
  });

  setInterval(() => {
    status.sendMessage("#mytest", "hello world!");
  }, 3000);
})();
