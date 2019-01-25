const EventEmitter = require("events")

class Listener extends EventEmitter {
  constructor(clients) {
    super()

    this._clients = clients
    this._listeners = []
    this._instance = 0
    this._attempt = 0
  }

  stream(endpoint, filter, operation) {
    this._listeners[this._instance] = this._clients[this._instance].stream(endpoint, filter)

    this._listeners[this._instance].on('start', () => {
      this._attempt = 0
      this.emit('listening', `started listening on client ${this._instance}`)
    })

    this._listeners[this._instance].on('data', async tweet => {
      this.emit('consuming', `received new tweet with id: ${tweet.id ? tweet.id : 'undefined'}`)

      try {
        await operation(tweet)
      } catch (err) {
        this.emit('warning', `failed to process tweet with id: ${tweet.id ? tweet.id : 'undefined'}`)
      }
    })

    this._listeners[this._instance].on('end', () => {
      this.emit('warning', `stopped listening on client ${this._instance} as the host ended the connection`)

      this.retry(endpoint, filter, operation)
    })

    this._listeners[this._instance].on('error', err => {
      this.emit('warning', `the listener on client ${this._instance} encountered an error and is no longer listening`)

      this.retry(endpoint, filter, operation)
    })

  }

  update(endpoint, filter, operation) {
    this.emit('updating', 'applying update, hot swapping listeners')

    // destroy current listener instance
    process.nextTick(() => {
      // start a new listener instance with the redundant client
      this._instance = (this._instance +  1) % 2
      this.stream(endpoint, filter, operation)

      // destroy current listener instance
      this._listeners[(this._instance + 1) % 2].destroy()
    })
  }

  retry(endpoint, filter, operation) {
    let retry = true

    if (this._attempt === 10) {
      this.emit('error', new Error('the maximum allowed retries has been reached'))
      retry = false
    }

    // destroy current listener
    process.nextTick(() => {
      // destroy current listener instance
      this._listeners[this._instance].destroy()

      // if retry is true, start a new listener instance with the redundant client
      if (retry) {
        this.emit('retrying', `retrying the connection on client ${(this._instance +  1) % 2}`)
        this._attempt += 1
        this._instance = (this._instance +  1) % 2
        this.stream(endpoint, filter, operation)
      }
    })
  }

  terminate() {
    process.nextTick(() => {
      this._listeners[this._instance].destroy()
    })
  }
}

module.exports = Listener
