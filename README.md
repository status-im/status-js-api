status-js
===

<p align="center">
Javascript client for sending / receiving messages in Status
</p>
<p align="center">
<strong>WIP. DO NOT USE IN PRODUCTION. HIGH RISK ⚠</strong>
</p>
<br />



## Installation

```
npm install status-js-api
```
Alternatively, you can use `yarn`.

## Usage

### Requirements
This package requires `geth`, `status-go`, or `murmur` to be able to connect to Whisper v6.

#### Using `geth`

Use the following command and flags to start `geth`

```
$ geth --testnet --syncmode=light --ws --wsport=8546 --wsaddr=localhost --wsorigins=statusjs --rpc --maxpeers=25 --shh --shh.pow=0.002 --wsapi=web3,shh,admin
```

Also, due to the lack of nodes with Whisper enabled, you need to create a [static-nodes.json](https://github.com/status-im/status-js/blob/master/static-nodes.json) file, that must be placed in a specific path (if using `ropsten` in a linux environment, `~/.ethereum/testnet/geth/static-nodes.json`

#### Using `murmur`
```
$ murmur-client --ws --no-bridge
```
See `murmur` [documentation](https://github.com/status-im/murmur) for additional details.

#### Using `status-go`
```
$ /path/to/status-go/statusd
```
See `status-go` [documentation](https://github.com/status-im/status-go) for additional details. 


## API
### constructor
Constructs a new status client object

```javascript
new StatusJS();
```
```javascript
// basic instantiation
const StatusJS = require('status-js-api');
const status = new StatusJS();
```



### connect
Connect to a web3 whisper provider

```javascript
status.connect(url, [privateKey]);
```

```javascript
await status.connect("ws://localhost:8546", "0x1122...9900");
```

Arguments
* _url_ - an address of a valid http, websocket or ipc provider.
* _privateKey_ - private key of the user that will send / receive messages. It will be added to the whisper node. Default: random private key. Optional



### connectToProvider
Connect to a custom web3 whisper provider

```javascript
status.connectToProvider(provider, [privateKey]);
```

```javascript
await status.connect(murmurClient.provider, "0x1122...9900");
```

Arguments
* _provider_ - Custom web3 provider
* _privateKey_ - private key of the user that will send / receive messages. It will be added to the whisper node. Default: random private key. Optional



### isListening
Checks if the node is listening for peers.

```javascript
status.isListening()
```

```javascript
if (status.isListening()) {
  // Do something
}
```



### joinChat
Joins a public channel

```javascript
status.joinChat(channel);
```

```javascript
await status.joinChat("#mytest");
```

Arguments
* _channel_ - public channel name.



### onUserMessage
Process incoming private messages

```javascript
status.onUserMessage(cb); // private messages
```

```javascript
status.onUserMessage((err, data) => {
  if(err) 
    console.error(err);
  else
    console.dir(data); // message information
});
```

Arguments
* _cb_ -  a callback that will be called, possibly with an error, when a message is received. If there is no error, the first argument will be null.



### onChannelMessage
Process incoming public messages

```javascript
status.onChannelMessage(channel, cb); // public messages
```

```javascript
status.onChannelMessage("#mytest", (err, data) => {
  if(err) 
    console.error(err);
  else
    console.dir(data); // message information
});
```

Arguments
* _channel_ - public channel name.
* _cb_ -  a callback that will be called, possibly with an error, when a message is received. If there is no error, the first argument will be null.



### onMessage
Process both incoming public and private messages

```javascript
status.onMessage(channel, cb); // public messages
status.onMessage(cb); // private messages
```

```javascript
status.onMessage("#mytest", (err, data) => {
  if(err) 
    console.error(err);
  else
    console.dir(data); // message information
});
```

Arguments
* _channel_ - public channel name. Optional
* _cb_ -  a callback that will be called, possibly with an error, when a message is received. If there is no error, the first argument will be null.



### onChatRequest
Process incoming chat requests messages from other users

```javascript
status.onChatRequest(cb);
```

```javascript
status.onChatRequest((err, data) => {
  if(err) 
    console.error(err);
  else
    console.dir(data); 
    // message information
    // {
    //    displayName, // Display Name
    //    profilePic, // Base64 Profile picture
    //    username // Random username (Adjective1 Adjective2 Animal)
    // }
});
```

Arguments
* _cb_ -  a callback that will be called, possibly with an error, when a chat request is received. If there is no error, the first argument will be null.



### isSubscribedTo
Check if client has joined a channel

```javascript
status.isSubscribedTo(channel);
```

```javascript
if (status.isSubscribedTo("#mytest")) {
  // Do something
}
```

Arguments
* _channel_ - public channel name.



### leaveChat
Leaves a public channel

```javascript
status.leaveChat(channel);
```

```javascript
status.leaveChat("#mytest");
```

Arguments
* _channel_ - public channel name.



### getPublicKey
Returns a string with the public key

```javascript
status.getPublicKey();
```

```javascript
await status.getPublicKey(); // "0x1122...9900"
```



### getUserName
Returns the random username for the public key

```javascript
status.getUserName([pubKey]);
```

```javascript
await status.getUserName(); // "Adjective1 Adjective2 Animal"
await status.getUserName("0x1122...9900");
```

Arguments
* _pubKey_ - public key to obtain the username. Default: generate username for the current user. Optional.



### addContact
Add a contact by pubKey. (TODO: send contact request msg)

```javascript
status.addContact(pubKey, [cb]);
```

```javascript
status.addContact("0x1122...9900");
```

Arguments
* _pubKey_ - public key to add as a contact.
* _cb_ - a callback that will be called, possibly with an error, when the contact is added. If there is no error, the first argument will be null. Optional.



### removeContact
Remove a contact by pubKey.

```javascript
status.removeContact(pubKey);
```

```javascript
status.removeContact("0x1122...9900");
```

Arguments
* _pubKey_ - public key to remove from known contacts.



## TODO: Create documentation for sending messages
* sendUserMessage(contactCode, msg, [cb])
* sendGroupMessage(channelName, msg, [cb]) 
* sendJsonMessage(destination, msg, [cb])
* sendMessage(destination, msg, [cb])



### mailservers.useMailserver
Use a specific mailserver to obtain old messages. Active mailservers from Status.im can be found [here](https://fleets.status.im/)

```javascript
status.mailservers.useMailserver(enode, [cb]);
```

```javascript
const enode = "enode://0011...aabb@111.222.33.44:30303";
status.mailservers.useMailserver(enode, (err, res) => {
  if (err) {
    console.err("Error: " + err);
    return;
  }

  // Do something
});
```

Arguments
* _enode_ - Mailserver enode address.
* _cb_ - a callback that will be called, possibly with an error, when the mailserver is selected successfully. If there is no error, the first argument will be null. Optional.



### mailservers.requestUserMessages
Once a mailserver is selected, request old private messages. Messages will be received in the `onMessage` or `onUserMessage` handler.

```javascript
* mailservers.requestUserMessages(options, [cb])
```

```javascript
const enode = "enode://0011...aabb@111.222.33.44:30303";
status.mailservers.useMailserver(enode, (err, res) => {
  if (err) {
    console.err("Error: " + err);
    return;
  }
  
  const from = parseInt((new Date()).getTime() / 1000 - 86400, 10);
  const to = parseInt((new Date()).getTime() / 1000, 10);
  
  // User messages
  status.mailservers.requestUserMessages({from, to}, (err, res) => { 
    if(err) 
      console.log(err); 

    // Do something
  });
});
```

Arguments
* _options_ - an object containing parameters .
* _cb_ - a callback that will be called, possibly with an error, when the old private messages are requested successfully. If there is no error, the first argument will be null. Optional.

Options
* _from_ - lower bound of time range as unix timestamp, default is 24 hours back from now.
* _to_ - upper bound of time range as unix timestamp, default is now
* _timeout_ - TODO: research this in `status-go`, default is 30
* _limit_ - TODO: research this in `status-go`, default is 0



### mailservers.requestChannelMessages
Once a mailserver is selected, request old public messages for a channel. Messages will be received in the `onMessage` or `onChannelMessage` handler.

```javascript
* mailservers.requestChannelMessages(channel, [cb])
```

```javascript
const enode = "enode://0011...aabb@111.222.33.44:30303";
status.mailservers.useMailserver(enode, (err, res) => {
  if (err) {
    console.err("Error: " + err);
    return;
  }

  const from = parseInt((new Date()).getTime() / 1000 - 86400, 10);
  const to = parseInt((new Date()).getTime() / 1000, 10);

  // Channel messages
  status.mailservers.requestChannelMessages("mytest", {from, to}, (err, res) => { 
    if(err) 
      console.log(err); 

    // Do something
  });
});
```

Arguments
* _channel_ - channel name to obtain messages from. A 4 bytes hex topic can be used too.
* _options_ - an object containing parameters .
* _cb_ - a callback that will be called, possibly with an error, when the old private messages are requested successfully. If there is no error, the first argument will be null. Optional.

Options
* _from_ - lower bound of time range as unix timestamp, default is 24 hours back from now.
* _to_ - upper bound of time range as unix timestamp, default is now
* _timeout_ - TODO: research this in `status-go`, default is 30
* _limit_ - TODO: research this in `status-go`, default is 0



## Development
Clone the repo via git:
```
$ git clone https://github.com/status-im/status-js.git
```
And then install the dependencies with `yarn`.
```
$ cd status-js
$ yarn
```

To develop:
```
$ yarn run start
$ yarn run lint
````

## Contribution

Thank you for considering to help out with the source code! We welcome contributions from anyone on the internet, and are grateful for even the smallest of fixes!

If you'd like to contribute to `status-js`, please fork, fix, commit and send a pull request for the maintainers to review and merge into the main code base. If you wish to submit more complex changes though, please check up with the core devs first on [#status-js channel](https://get.status.im/chat/public/status-js) to ensure those changes are in line with the general philosophy of the project and/or get some early feedback which can make both your efforts much lighter as well as our review and merge procedures quick and simple.
