status-js
===

<p align="center">
Javascript client for sending / receiving messages in Status
</p>
<p align="center">
<strong>WIP. DO NOT USE IN PRODUCTION. HIGH RISK ⚠</strong>
</p>
<br />

## Install
clone the repo via git:
```
$ git clone https://github.com/status-im/status-js.git
```
And then install the dependencies with `npm`.
```
$ cd status-js
$ npm install
```

`status-js` requires `geth` or `murmur` to be able to connect to Whisper. If using `geth`, you may start it with the following flags.

`geth --testnet --syncmode=light --ws --wsport=8546 --wsaddr=localhost --wsorigins=statusjs --rpc --maxpeers=25 --shh --shh.pow=0.002 --wsapi=eth,web3,net,shh,debug,admin`

Also, due to the lack of nodes with Whisper enabled, you need to create a [static-nodes.json](https://github.com/status-im/murmur/blob/master/src/data/static-nodes.json) file, that must be placed in a specific path (if using testnet and Linux, `~/.ethereum/testnet/geth/static-nodes.json`

## API
*TODO*
See test files for use in the meantime


## Contribution

Thank you for considering to help out with the source code! We welcome contributions from anyone on the internet, and are grateful for even the smallest of fixes!

If you'd like to contribute to `status-js`, please fork, fix, commit and send a pull request for the maintainers to review and merge into the main code base. If you wish to submit more complex changes though, please check up with the core devs first on [#status-js channel](https://get.status.im/chat/public/status-js) to ensure those changes are in line with the general philosophy of the project and/or get some early feedback which can make both your efforts much lighter as well as our review and merge procedures quick and simple.
