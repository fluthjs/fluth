import {
  thenPlugin,
  executePlugin,
  OnFulfilled,
  OnRejected,
  OnFinally,
} from '.'
import { Observer } from './observer'

export class PromiseStream {
  /**
   * plugin for then and execute
   */
  plugin: {
    then: thenPlugin[]
    execute: executePlugin[]
  } = { then: [], execute: [] }
  /**
   * observer
   */
  #rootObserver = new Observer(this)
  /**
   * promise stream source
   */
  promise: Promise<any> = Promise.resolve()
  /**
   * execute pauseFlag
   */
  pauseFlag = false
  /**
   * finishFlag
   */
  finishFlag = false

  then<T>(onFulfilled: OnFulfilled<T>, onRejected?: OnRejected<unknown>) {
    return this.#rootObserver.then(onFulfilled, onRejected)
  }

  thenOnce<T>(onFulfilled: OnFulfilled<T>, onRejected?: OnRejected<unknown>) {
    return this.#rootObserver.thenOnce<T>(onFulfilled, onRejected)
  }

  catch(onRejected: OnRejected<unknown>) {
    this.#rootObserver.catch(onRejected)
  }

  finally(onFinally: OnFinally<unknown>) {
    return this.#rootObserver.finally(onFinally)
  }

  execute() {
    this.#rootObserver.execute(this.promise)
  }

  unsubscribe() {
    this.#rootObserver.unsubscribe()
  }

  setUnsubscribeCallback(callback: () => void) {
    this.#rootObserver.setUnsubscribeCallback(callback)
  }

  pause() {
    this.pauseFlag = true
  }

  restart() {
    this.pauseFlag = false
  }

  get finish() {
    return this.#rootObserver.finish.promise
  }

  next(payload: any, finishFlag = this.finishFlag) {
    const promise =
      payload instanceof Promise || typeof payload?.then === 'function'
        ? payload
        : Promise.resolve(payload)
    if (this.promise === promise || this.finishFlag) return
    this.promise = promise
    this.finishFlag = finishFlag
    this.execute()
  }
}
