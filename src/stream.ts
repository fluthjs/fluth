import { produce, createDraft, finishDraft } from 'limu'
import { Observable } from './observable'
import { isObjectLike, isPromiseLike, isAsyncFunction } from './utils'
import { PromiseStatus } from './types'

export class Stream<T = any, E = object> extends Observable<T, E> {
  declare value: T
  constructor(data?: T) {
    super()
    if (data instanceof Promise) {
      throw new Error('Stream data cannot be a Promise')
    }
    this._root = this as Stream
    this.value = data as T
    this._rootPromise = Promise.resolve(data as T)
    // new stream should be resolved
    this.status = PromiseStatus.RESOLVED
    // set cacheRootPromise for execute fn
    this._cacheRootPromise = this._rootPromise
  }

  set(setter: (state: T) => void, finishFlag = this._finishFlag) {
    if (isObjectLike(this.value)) {
      if (isAsyncFunction(setter)) {
        const draft = createDraft(this.value)
        setter(draft).then(() => {
          this.value = finishDraft(draft)
          this.next(this.value as T, finishFlag)
        })
      } else {
        this.value = produce(this.value, setter)
        this.next(this.value as T, finishFlag)
      }
    }
  }

  complete() {
    this.unsubscribe()
  }

  pause() {
    this._pauseFlag = true
  }

  restart() {
    this._pauseFlag = false
  }

  next(payload: T | PromiseLike<T>, finishFlag = this._finishFlag) {
    const isPromiseLikePayload = isPromiseLike(payload)
    const promise = isPromiseLikePayload ? payload : Promise.resolve(payload)
    if (this._rootPromise === promise || this._finishFlag) return
    this._rootPromise = promise
    this._finishFlag = finishFlag
    this._executeObserver(promise, payload)
  }
}

export function $<T = any, E = object>(): Stream<T | undefined, E>
export function $<T = any, E = object>(data: T): Stream<T, E>
export function $<T = any, E = object>(data?: T) {
  return new Stream<T, E>(data)
}
