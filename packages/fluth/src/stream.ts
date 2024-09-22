import { RootObserver } from './rootObserver'
/**
 * package Stream
 */
export class Stream {
  #stream = new RootObserver()
  get plugin() {
    return this.#stream.plugin
  }

  /**
   * push observer
   * @param onFulfilled resolve function
   * @param onRejected reject function
   * @returns subjection instance
   */
  get then() {
    return this.#stream.then.bind(this.#stream)
  }

  /**
   * push one time observer, will unsubscribe cur observer after execute
   * @param onFulfilled resolve function
   * @param onRejected reject function
   * @returns subjection instance
   */
  get thenOnce() {
    return this.#stream.thenOnce.bind(this.#stream)
  }

  /**
   * execute all observer with then timing sequence
   */
  get execute() {
    return this.#stream.execute.bind(this.#stream)
  }

  /**
   * catch promise
   */
  get catch() {
    return this.#stream.catch.bind(this.#stream)
  }

  /**
   * finally promise
   */
  get finally() {
    return this.#stream.finally.bind(this.#stream)
  }

  /**
   * clear all observer
   */
  get unsubscribe() {
    return this.#stream.unsubscribe.bind(this.#stream)
  }

  /**
   * set unsubscribe callback
   */
  get setUnsubscribeCallback() {
    return this.#stream.setUnsubscribeCallback.bind(this.#stream)
  }

  /**
   * pause promise stream execute
   */
  get pause() {
    return this.#stream.pause.bind(this.#stream)
  }

  /**
   * restart promise stream execute, promise stream will execute again when next method called
   */
  get restart() {
    return this.#stream.restart.bind(this.#stream)
  }

  /**
   * finish promise
   */
  get finish() {
    return this.#stream.finish
  }

  /**
   * set next promise
   * @param payload
   * @param finishFlag finish promise stream, promise stream will clear all observer and cannot then new observer or execute next
   */
  next(payload: any, finishFlag?: boolean) {
    this.#stream.next(payload, finishFlag)
  }
}
