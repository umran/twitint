# twitint

A fault tolerant app that listens to filtered tweets via the twitter streaming api and processes them according to a custom lambda function. The lambda function may be synchronous or asynchronous.

[![Build Status](https://travis-ci.org/umran/twitint.svg?branch=master)](https://travis-ci.org/umran/twitint)
[![Coverage Status](https://img.shields.io/coveralls/github/umran/twitint/master.svg)](https://coveralls.io/github/umran/twitint?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/umran/twitint/badge.svg)](https://snyk.io/test/github/umran/twitint)

## Installation

```
npm install twitter-lite
npm install twitint
```
## Usage

### Starting A New Listener

```javascript
const Client = require('twitter-lite')
const Listener = require('twitint')


const client_primary = new Client({
  consumer_key: 'consumer_key',
  consumer_secret: 'consumer_secret',
  access_token_key: 'access_token_key',
  access_token_secret: 'access_token_secret'
})

const client_secondary = new Client({
  consumer_key: 'consumer_key',
  consumer_secret: 'consumer_secret',
  access_token_key: 'access_token_key',
  access_token_secret: 'access_token_secret'
})

// instantiate a new Listener using 2 clients with the secondary client acting as a fallback
const listener = new Listener([client_primary, client_secondary])

// sarting a stream of tweets filtered by tracking terms
listener.stream('statuses/filter', { track: 'javascript, nodejs, maldives, twitter, and, so, on' }, tweet => {
  // do stuff with tweets as they come
  console.log(tweet.id)
})

// the app emits an error only when all reconnect attempts have failed, thereby suspending all listeners
listener.on('error', err => {
  console.log(err)
})

// the app warns of errors in processing individual tweets and emits a warning whenever the active client connection is interrupted
listener.on('warning', message => {
  console.log(message)
})
```

### Updating an Existing Listener
This library allows you to apply updates to the initial listener without severing the connection between your app and twitter. It does this by starting a connection with the updated parameters using the fallback client and only then terminating the primary client. The application shouldn't theoretically lose any data between the switchover since one client remains open while the other is connecting.

```javascript
// update an existing listener
listener.update('statuses/filter', { track: 'new terms, like, bubble gum, facebook, instagram, #10YearChallenge' }, tweet => {
  // do new stuff with tweets
  console.log(tweet.user)
})
```

### Additional Events

```javascript
// the retrying event is emitted when attempting to reconnect
listener.on('retrying', message => {
  console.log(message)
})

// the updating event is emitted when attempting to update an existing listener
listener.on('updating', message => {
  console.log(message)
})
```
