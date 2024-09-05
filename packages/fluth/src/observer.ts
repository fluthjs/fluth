import {
  OnFinally,
  OnFulfilled,
  OnRejected,
  executePlugin,
  Subjection,
} from '.'
import { PromiseStream } from './promiseStream'

const promiseWithResolvers = () => {
  let resolve: OnFulfilled<any>
  let reject: OnRejected<any>
  const promise = new Promise<any>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export class Observer {
  resolve: OnFulfilled<any>
  reject?: OnRejected<any>
  catchHandler?: OnRejected<any>
  finallyHandler?: OnFinally<any>
  unsubscribeCallback?: () => void
  children: Observer[] = []

  parent: Observer | null
  stream: PromiseStream

  promise: Promise<any> | null = null
  rootPromise: Promise<any> | null = null
  finish: ReturnType<typeof promiseWithResolvers> = promiseWithResolvers()

  executePlugins: executePlugin[] = []
  executeStatus: 'pending' | 'resolved' | 'rejected' | null = null

  once = false

  constructor(streamOrParent: PromiseStream | Observer) {
    if (streamOrParent instanceof Observer) {
      this.parent = streamOrParent
      this.stream = this.parent.stream
    } else {
      this.parent = null
      this.stream = streamOrParent
    }
  }

  chain(observer: Observer): Subjection {
    return {
      then: observer.then.bind(observer),
      thenOnce: observer.thenOnce.bind(observer),
      catch: observer.catch.bind(observer),
      finally: observer.finally.bind(observer),
      unsubscribe: observer.unsubscribe.bind(observer),
      setUnsubscribeCallback: observer.setUnsubscribeCallback.bind(observer),
      execute: observer.execute.bind(observer),
      finish: observer.finish.promise,
    }
  }

  /**
   * clean all observer
   */
  unsubscribe() {
    if (!this.parent) {
      this.children = []
    } else {
      const idx = this.parent.children.indexOf(this)
      if (idx !== -1) this.parent.children.splice(idx, 1)
    }
    if (this.unsubscribeCallback)
      try {
        this.unsubscribeCallback()
      } catch (e) {
        console.error(e)
      }
  }

  /**
   * set unsubscribe callback
   * @param callback callback function
   */
  setUnsubscribeCallback(callback: () => void) {
    this.unsubscribeCallback = callback
  }

  runThenPlugin(observer: Observer) {
    if (this.stream.plugin.then.length) {
      this.stream.plugin.then.forEach((fn) => {
        try {
          fn(() => observer.unsubscribe())
        } catch (e) {
          console.error(e)
        }
      })
    }
  }

  thenObserver<T>(
    once: boolean,
    onFulfilled: OnFulfilled<T>,
    onRejected?: OnRejected<T>,
  ): Subjection {
    const observer = new Observer(this)
    observer.resolve = onFulfilled
    observer.reject = onRejected
    if (!this.stream.finishFlag) {
      this.children.push(observer)
    }
    this.runThenPlugin(observer)
    if (once) observer.once = true
    if (
      this.executeStatus === 'resolved' ||
      this.executeStatus === 'rejected'
    ) {
      observer.execute.call(observer, this.rootPromise)
    }

    return this.chain(observer)
  }

  /**
   * push observer
   * @param onFulfilled resolve function
   * @param onRejected reject function
   * @returns Subjection
   */
  then<T>(
    onFulfilled: OnFulfilled<T>,
    onRejected?: OnRejected<unknown>,
  ): Subjection {
    return this.thenObserver<T>(false, onFulfilled, onRejected)
  }

  /**
   * catch observer promise
   * @param onRejected reject function
   * @returns Subjection
   */
  catch(onRejected: OnRejected<unknown>) {
    this.catchHandler = onRejected
    return this.chain(this)
  }

  /**
   *  finally observer promise
   * @param onFinally finally function
   * @returns Subjection
   */

  finally(onFinally: OnFinally<unknown>) {
    this.finallyHandler = onFinally
    return this.chain(this)
  }

  /**
   * push one time observer, will unsubscribe cur observer when execute
   * @param onFulfilled resolve function
   * @param onRejected reject function
   * @returns
   */
  thenOnce<T>(
    onFulfilled: OnFulfilled<T>,
    onRejected?: OnFulfilled<T>,
  ): Subjection {
    return this.thenObserver(true, onFulfilled, onRejected)
  }

  runExecutePlugin() {
    if (this.once) this.unsubscribe()

    this.stream.plugin.execute.forEach((fn) => {
      if (this.executePlugins.includes(fn)) return
      this.executePlugins.push(fn)
      try {
        if (this.promise)
          this.promise = fn(this.promise, this.unsubscribe.bind(this))
      } catch (e) {
        console.error(e)
      }
    })
    // clean unused plugin
    this.executePlugins.forEach((fn) => {
      if (!this.stream.plugin.execute.includes(fn)) {
        this.executePlugins.splice(this.executePlugins.indexOf(fn), 1)
      }
    })
  }

  executeObserver(data: any, promiseStatus: 'resolve' | 'reject') {
    this.executeStatus = promiseStatus === 'resolve' ? 'resolved' : 'rejected'
    this.promise = Promise[promiseStatus](data)
    this.runExecutePlugin()

    if (this.catchHandler) this.promise = this.promise.catch(this.catchHandler)

    if (this.finallyHandler)
      this.promise = this.promise.finally(this.finallyHandler)

    if (this.stream.finishFlag) {
      this.finish[promiseStatus]?.(data)
      this.finish.promise.finally(() => {
        // after all finish promise execute
        setTimeout(() => this.unsubscribe())
      })
    }

    this.promise.finally(() => {
      if (this.children?.length) {
        this.children.forEach((child) => child.execute(this.rootPromise))
      }
    })
  }

  /**
   *  execute all observer with then timing sequence
   */
  execute(rootPromise = this.rootPromise) {
    this.rootPromise = rootPromise
    if (
      !this.rootPromise ||
      this.stream.pauseFlag ||
      rootPromise !== this.stream.promise
    )
      return
    this.executeStatus = 'pending'
    const parentPromise = this.parent ? this.parent.promise : rootPromise
    parentPromise?.then(this.resolve, this.reject).then(
      (data) => this.executeObserver(data, 'resolve'),
      (data) => this.executeObserver(data, 'reject'),
    )
  }
}
