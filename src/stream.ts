import { produce, createDraft, finishDraft } from 'limu'
import { Observable } from './observable'
import { isObjectLike, isPromiseLike, isAsyncFunction } from './utils'
import { PromiseStatus } from './types'

export class Stream<T = any> extends Observable<T> {
  declare _v: T
  constructor(data?: T | PromiseLike<T>) {
    super()
    this._root = this as Stream
    if (isPromiseLike(data)) {
      this._cacheRootPromise = data
      this.next(data)
    } else {
      this._root = this as Stream
      this._v = data as T
      this._rootPromise = Promise.resolve(data as T)
      // new stream should be resolved
      this.status = PromiseStatus.RESOLVED
      // set cacheRootPromise for execute fn
      this._cacheRootPromise = this._rootPromise
    }
  }

  // value of stream node
  get value() {
    return this._v
  }

  set(setter: (state: T) => void, finishFlag = this._finishFlag) {
    if (isObjectLike(this._v)) {
      if (isAsyncFunction(setter)) {
        const draft = createDraft(this._v)
        setter(draft).then(() => {
          this._v = finishDraft(draft)
          this.next(this._v as T, finishFlag)
        })
      } else {
        this._v = produce(this._v, setter)
        this.next(this._v as T, finishFlag)
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

export function $<T = any>(): Stream<T | undefined>
export function $<T = any>(data: T | PromiseLike<T>): Stream<T>
export function $<T = any>(data?: T | PromiseLike<T>) {
  return new Stream<T>(data)
}
