import { produce, createDraft, finishDraft } from 'limu'
import { Observable } from './observable'
import { isObjectLike, isPromiseLike, isAsyncFunction } from './utils'
import { PromiseStatus } from './types'

export class Stream<T = any, I extends boolean = false> extends Observable<T> {
  declare value: I extends true ? T : T | undefined
  constructor(data?: T) {
    super()
    if (data instanceof Promise) {
      throw new Error('Stream data cannot be a Promise')
    }
    this._root = this as Stream
    this.value = data as T
    this._rootPromise = Promise.resolve(data as T)
    this._status = PromiseStatus.RESOLVED
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
    if (!isPromiseLikePayload) this.value = payload
    this._rootPromise = promise
    this._finishFlag = finishFlag
    this._executeObserver(promise, payload)
  }
}

export function $<T = any>(): Stream<T, false>
export function $<T = any>(data: T): Stream<T, true>
export function $<T = any>(data?: T) {
  return new Stream<T, boolean>(data)
}
