const EventEmitter = require('events')

class MockStream extends EventEmitter {
  constructor(endpoint, filter, faulty, failImmediately) {
    super()
    this._endpoint = endpoint
    this._filter = filter

    if (failImmediately) {
      setTimeout(() => {
        this.emit('error', new Error('mock twitter error!!'))
      }, 100)

      return
    }

    setTimeout(() => {
      this.emit('start', 'started!!')
    }, 1000)

    this._data = setInterval(() => {
      this.emit('data', {
        id: 12398342,
        user: {
          id: 12312312
        }
      })
    }, 100)

    if (faulty) {
      setTimeout(() => {
        this.emit('error', new Error('mock twitter error!!'))
      }, 5000)
    }
  }

  destroy() {
    clearInterval(this._data)
  }

  end() {
    this.emit('end', 'ending')
  }
}

class MockClient {
  constructor(config) {
    this._config = config
  }

  stream(endpoint, filter) {
    let faulty = this._config.isFaulty ? true : false
    let immediatelyFaulty = this._config.isImmediatelyFaulty ? true : false

    return new MockStream(endpoint, filter, faulty, immediatelyFaulty)
  }
}

module.exports = MockClient
