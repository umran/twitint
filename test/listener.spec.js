const expect = require('chai').expect
const Listener = require('../src/listener')
const Twitter = require('./mockClient')

const endpoint = 'statuses/filter'

const follow = [
  "3027662932",
  "23719043",
]

const updated_follow = [
  "3027662932",
  "23719043",
  "486288760",
  "121190725",
]

const client_primary = new Twitter({
  consumer_key: 'consumer_key',
  consumer_secret: 'consumer_secret',
  access_token_key: 'access_token_key',
  access_token_secret: 'access_token_secret'
})

const client_secondary = new Twitter({
  consumer_key: 'consumer_key',
  consumer_secret: 'consumer_secret',
  access_token_key: 'access_token_key',
  access_token_secret: 'access_token_secret'
})

const client_faulty = new Twitter({
  isFaulty: true,
  consumer_key: 'consumer_key',
  consumer_secret: 'consumer_secret',
  access_token_key: 'access_token_key',
  access_token_secret: 'access_token_secret'
})

const client_immediately_faulty_primary = new Twitter({
  isFaulty: true,
  isImmediatelyFaulty: true,
  consumer_key: 'consumer_key',
  consumer_secret: 'consumer_secret',
  access_token_key: 'access_token_key',
  access_token_secret: 'access_token_secret'
})

const client_immediately_faulty_secondary = new Twitter({
  isFaulty: true,
  isImmediatelyFaulty: true,
  consumer_key: 'consumer_key',
  consumer_secret: 'consumer_secret',
  access_token_key: 'access_token_key',
  access_token_secret: 'access_token_secret'
})

describe('new Listener()', function() {

  it('should construct a new listener', () => {
    expect(new Listener([client_primary, client_secondary])).to.be.instanceOf(Listener)
  })

})

describe('.stream()', function() {

  it('should emit a listening event when connected to and streaming from twitter', function(done) {
    let listener = new Listener([client_primary, client_secondary])
    listener.stream(endpoint, { follow }, tweet => {
      return
    })

    listener.on('listening', message => {
      listener.terminate()
      done()
    })
  })

  it('should emit a consuming event when tweet data is received', function(done) {
    let listener = new Listener([client_primary, client_secondary])
    listener.stream(endpoint, { follow }, tweet => {
      expect(typeof tweet).to.equal('object')
    })

    listener.on('consuming', message => {
      listener.terminate()
      done()
    })
  })

  it('should consume tweets from the stream when tweet data is received', function(done) {
    let listener = new Listener([client_primary, client_secondary])
    listener.stream(endpoint, { follow }, tweet => {
      expect(typeof tweet).to.equal('object')

      listener.terminate()
      done()
    })
  })

  it('should emit a warning event when the lambda function fails to process a tweet', function(done) {
    let listener = new Listener([client_primary, client_secondary])
    listener.stream(endpoint, { follow }, tweet => {
      throw new Error('lambda function error!!')
    })

    listener.on('warning', message => {
      listener.terminate()
      done()
    })
  })

})

describe('.update()', function() {
  this.timeout(10000)
  it('should emit an updating event and reestablish a connection', function(done) {
    let listener = new Listener([client_primary, client_secondary])
    listener.stream(endpoint, { follow }, tweet => {
      return
    })

    setTimeout(() => {
      listener.update(endpoint, { updated_follow }, tweet => {
        return
      })
    }, 5000)

    let update_count = 0
    let connection_count = 0

    listener.on('updating', message => {
      update_count += 1
    })

    listener.on('listening', message => {
      connection_count += 1
      if (update_count === 1 && connection_count === 2) {
        listener.terminate()
        done()
      }
    })
  })
})

describe('.retry()', function() {
  it('should emit a warning event and reestablish a conneciton using the redundant client when the current stream emits an error', function(done) {
    this.timeout(10000)

    let listener = new Listener([client_faulty, client_secondary])
    listener.stream(endpoint, { follow }, tweet => {
      return
    })

    let warning_count = 0
    let connection_count = 0

    listener.on('warning', message => {
      warning_count += 1
    })

    listener.on('listening', message => {
      connection_count += 1
      if (warning_count === 1 && connection_count === 2) {
        listener.terminate()
        done()
      }
    })
  })

  it('should emit a warning event and reestablish a conneciton using the redundant client when the current stream is ended by the server', function(done) {
    this.timeout(10000)

    let listener = new Listener([client_primary, client_secondary])
    listener.stream(endpoint, { follow }, tweet => {
      return
    })

    setTimeout(() => {
      listener._listeners[listener._instance].end()
    }, 2000)

    let warning_count = 0
    let connection_count = 0

    listener.on('warning', message => {
      warning_count += 1
    })

    listener.on('listening', message => {
      connection_count += 1
      if (warning_count === 1 && connection_count === 2) {
        listener.terminate()
        done()
      }
    })
  })

  it('should emit an error event and quit retrying once the maximum allowed retry attempts without a successful connection is reached', function(done) {
    this.timeout(10000)

    let listener = new Listener([client_immediately_faulty_primary, client_immediately_faulty_secondary])
    listener.stream(endpoint, { follow }, tweet => {
      return
    })

    let retry_count = 0

    listener.on('retrying', message => {
      retry_count += 1
    })

    listener.on('error', message => {
      if (retry_count === 10) {
        listener.terminate()
        done()
      }
    })
  })
})
