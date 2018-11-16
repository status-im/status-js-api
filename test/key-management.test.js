const test = require('tape-async');
const StatusJS = require('../src/index.js');

const url = "ws://localhost:8546";
const PRIVATE_KEY = "0xf942d5d524ec07158df4354402bfba8d928c99d0ab34d0799a6158d56156d986";
const PUBLIC_KEY = "0x0420e743c1f804137c1995ac59478a83709f67ddcb5b7de12407e0c7508c46df7b5627634a8d5ef0221873f68bba0c37d19d2ad3483f2f84164353abb6824f5837"

test(
  'should generate the same whisper public key from wallet private key',
  async function (t) {
    const status = new StatusJS();
    await status.connect(url, PRIVATE_KEY);
    const pubKey = await status.getPublicKey();
    t.equal(PUBLIC_KEY, pubKey)
    t.end();
  }
)
test(
  'should generate a new whisper public key when no private key supplied',
  async function (t) {
    const status = new StatusJS();
    await status.connect(url);
    const pubKey = await status.getPublicKey();
    t.notEqual(PUBLIC_KEY, pubKey)
    t.end();
    process.exit();
  }
)
