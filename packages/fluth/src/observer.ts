import { RootObserver, executePlugin } from './rootObserver'

export type OnFulfilled<T> = Parameters<Promise<T>['then']>[0]
export type OnRejected<T> = Parameters<Promise<T>['catch']>[0]
export type OnFinally<T> = Parameters<Promise<T>['finally']>[0]

export type Subjection = Pick<
  Observer,
  | 'then'
  | 'thenOnce'
  | 'catch'
  | 'finally'
  | 'unsubscribe'
  | 'setUnsubscribeCallback'
> & { finish: Promise<any>; execute: () => void }

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

  parent: Observer | null = null
  root: RootObserver | null = null

  promise: Promise<any> | null = null
  cacheRootPromise: Promise<any> | null = null
  finishResolver: ReturnType<typeof promiseWithResolvers> =
    promiseWithResolvers()

  executePlugins: executePlugin[] = []
  executeStatus: 'pending' | 'resolved' | 'rejected' | null = null

  once = false

  constructor(streamOrParent?: RootObserver | Observer) {
    if (!streamOrParent) return
    if (streamOrParent instanceof Observer) {
      this.parent = streamOrParent
      this.root = this.parent.root
    } else {
      this.parent = null
      this.root = streamOrParent
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
      execute: () => observer.executeObserver.call(observer),
      finish: observer.finishResolver.promise,
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
    this.root?.plugin.then.forEach((fn) => {
      try {
        fn(() => observer.unsubscribe())
      } catch (e) {
        console.error(e)
      }
    })
  }

  thenObserver<T>(
    once: boolean,
    onFulfilled: OnFulfilled<T>,
    onRejected?: OnRejected<T>,
  ): Subjection {
    const observer = new Observer(this)
    observer.resolve = onFulfilled
    observer.reject = onRejected
    if (!this.root?.finishFlag) {
      this.children.push(observer)
    }
    this.runThenPlugin(observer)
    if (once) observer.once = true
    if (
      this.executeStatus === 'resolved' ||
      this.executeStatus === 'rejected'
    ) {
      observer.executeObserver.call(observer, this.cacheRootPromise)
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

    this.root?.plugin.execute.forEach((fn) => {
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
      if (!this.root?.plugin.execute.includes(fn)) {
        this.executePlugins.splice(this.executePlugins.indexOf(fn), 1)
      }
    })
  }

  executeAfter(
    data: any,
    promiseStatus: 'resolve' | 'reject',
    rootPromise: Promise<any>,
  ) {
    this.executeStatus = promiseStatus === 'resolve' ? 'resolved' : 'rejected'
    this.cacheRootPromise = rootPromise
    this.promise = Promise[promiseStatus](data)
    this.runExecutePlugin()

    if (this.catchHandler) this.promise = this.promise.catch(this.catchHandler)

    if (this.finallyHandler)
      this.promise = this.promise.finally(this.finallyHandler)

    if (this.root?.finishFlag) {
      this.finishResolver[promiseStatus]?.(data)
      this.finishResolver.promise.finally(() => {
        // after all finish promise execute
        setTimeout(() => this.unsubscribe())
      })
    }

    this.promise.finally(() => {
      if (this.children?.length) {
        this.children.forEach((child) => child.executeObserver(rootPromise))
      }
    })
  }

  /**
   *  execute all observer with then timing sequence
   */
  executeObserver(rootPromise: Promise<any> | null = this.cacheRootPromise) {
    if (
      !rootPromise ||
      this.root?.pauseFlag ||
      rootPromise !== this.root?.rootPromise
    )
      return
    this.executeStatus = 'pending'
    const parentPromise = this.parent ? this.parent.promise : rootPromise
    parentPromise?.then(this.resolve, this.reject).then(
      (data) => this.executeAfter(data, 'resolve', rootPromise),
      (data) => this.executeAfter(data, 'reject', rootPromise),
    )
  }
}
