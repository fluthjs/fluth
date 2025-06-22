import { produce, createDraft, finishDraft } from 'limu'
import { Stream, RootPlugin } from './stream'
import { safeCallback, isObjectLike, isAsyncFunction } from './utils'

export type OnFulfilled<T = any, V = any> = (data: T) => V | Promise<V>
export type OnRejected<V = any> = (reason: any) => V | Promise<V>
export type OnFinally = Parameters<Promise<any>['finally']>[0]

export enum PromiseStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

/**
 *  Observable node, the basic unit of promise-like stream programming,
 * An Observable instance is a dual-role entity in stream programming:
 * 1. It acts as an observable that can be subscribed to by observer
 * 2. It also acts as an observer that can receive and process data
 * @class Observable
 * @template T the type of the value
 * @template E the type of the chain plugin
 */
export class Observable<T = any, E extends Record<string, any> = object> {
  // resolve of observer
  #resolve?: OnFulfilled
  // reject of observer
  #reject?: OnRejected
  // condition fn
  #condition?: (value: any) => boolean
  // differ fn
  #differ?: (value: any) => any
  // catch of then handler
  #catchHandler?: OnRejected
  // finally of then handler
  #finallyHandler?: OnFinally
  // after unsubscribe callback
  #unsubscribeCallbackList: (() => void)[] = []
  // only root Observable finished will call this callback
  #finishCallbackList: ((value: T, status: PromiseStatus) => void)[] = []
  // observer children of current observable
  #children: Observable[] = []
  // parent observable node
  #parent: Observable | null = null

  // status of observable
  protected _status: PromiseStatus | null = null
  // root observable node
  protected _root: Stream | null = null
  // cache root promise, for execute fn
  protected _cacheRootPromise: PromiseLike<any> | null = null
  // plugin of observable of root observable
  protected _plugin?: RootPlugin
  // pause flag of root observable, no use for child observable
  protected _pauseFlag = false
  // finish flag
  protected _finishFlag = false
  // root promise of root observable
  protected _rootPromise: PromiseLike<T> | null = null

  // value of observable node
  value: T | undefined

  constructor(streamOrParent?: Stream | Observable) {
    if (!streamOrParent) return
    if (streamOrParent instanceof Observable) {
      this.#parent = streamOrParent
      this._root = this.#parent._root
    } else {
      this.#parent = null
      this._root = streamOrParent
    }
  }

  protected _runChainPlugin<F>(observer: Observable<F, E>, plugin?: RootPlugin) {
    return safeCallback(() =>
      (plugin || this._root?._plugin)?.chain
        .map((fn) => fn(observer))
        .forEach((obj) => {
          Object.keys(obj).forEach((prop) => {
            const descriptor = Object.getOwnPropertyDescriptor(obj, prop)
            if (descriptor) Object.defineProperty(observer, prop, descriptor)
          })
        }),
    )()
  }

  #chain<F>(observer: Observable<F, E>): Observable<F, E> & E {
    if (this !== (observer as any)) this._runChainPlugin<F>(observer)
    return observer as Observable<F, E> & E
  }

  /**
   * parent node some property will used by child observable node
   * so, this property should be clean after child observable node execute
   */
  #cleanParent(parent: Observable | null) {
    // all children observer unsubscribe
    if (parent && !parent.#children.length) {
      parent.#clean()
    }
  }

  /**
   * clean observable node, then children observers should be clean too
   * because children observers are reference of root observable node
   * _pauseFlag、_finishFlag、_rootPromise、_plugin should not be clean
   * because it will be used by deep children observers
   * value should not be clean because after unsubscribe the value may still be used
   */
  #clean() {
    // clear property immediately
    this.#resolve = undefined
    this.#reject = undefined
    this.#catchHandler = undefined
    this.#finallyHandler = undefined
    this.#unsubscribeCallbackList = []
    this.#finishCallbackList = []
    this.#parent = null
    this._root = null
    // clear property if no child observer
    if (!this.#children.length) {
      this._status = null
      this.#condition = undefined
      this.#differ = undefined
      this._cacheRootPromise = null
    }
  }

  /**
   * unsubscribe observable node
   */
  unsubscribe() {
    if (this._finishFlag) return
    this._finishFlag = true
    this.#unsubscribeObservable(true)
  }

  /**
   * There are two scenarios when #unsubscribeObservable will be called:
   * 1. executeFinish trigger unsubscribe(once or finish), active is false
   * 2. actively calling observable's unsubscribe method, active is true
   * current observer is not root observer, should also have different behavior
   * @param active active flag, indicate #unsubscribeObservable is called by active or not
   */
  #unsubscribeObservable(active = false) {
    if (this._status === PromiseStatus.PENDING) return

    if (this.#parent) {
      const idx = this.#parent.#children.indexOf(this)
      if (idx !== -1) {
        this.#parent.#children.splice(idx, 1)[0]
      }
    }

    if (this.#unsubscribeCallbackList.length)
      this.#unsubscribeCallbackList.forEach((fn) => safeCallback(fn)())

    this.#clean()

    // Recursively call the #unsubscribeObservable method of child nodes.
    if (active) {
      const childPending = this.#children.some((child) => child._status === PromiseStatus.PENDING)

      this.#children.slice().forEach((child) => {
        child.#unsubscribeObservable(active)
      })
      // after recursively unsubscribeObservable, if no childPending this.#children.length should be 0
      // so call #clean to clear left property, if has childPending, #cleanParent will be called by child observer
      if (!childPending) this.#clean()
    }
  }

  /**
   * set unsubscribe callback
   * @param callback callback function
   */
  afterUnsubscribe(callback: () => void) {
    if (!this.#unsubscribeCallbackList.includes(callback))
      this.#unsubscribeCallbackList.push(callback)
  }
  /**
   * remove unsubscribe callback
   * @param callback callback function
   */
  offUnsubscribe(callback: () => void) {
    this.#unsubscribeCallbackList = this.#unsubscribeCallbackList.filter((fn) => fn !== callback)
  }

  /**
   * set finish callback, will trigger before children observer
   * @param callback callback function
   */
  afterComplete(callback: (value: T, status: PromiseStatus) => void) {
    if (!this.#finishCallbackList.includes(callback)) this.#finishCallbackList.push(callback)
  }

  /**
   * remove finish callback
   * @param callback callback function
   */
  offComplete(callback: (value: T, status: PromiseStatus) => void) {
    this.#finishCallbackList = this.#finishCallbackList.filter((fn) => fn !== callback)
  }

  #runThenPlugin(observer: Observable) {
    this._root?._plugin?.then.forEach((fn) => {
      safeCallback(fn)(() => observer.#unsubscribeObservable())
    })
  }

  #thenObserver<F>(
    once: boolean,
    immediate: boolean,
    onfulfilled?: OnFulfilled<T, F>,
    onrejected?: OnRejected,
    condition?: (value: T) => boolean,
    differ?: (value: T) => any,
  ) {
    const observer = new Observable<F extends PromiseLike<infer V> ? V : F, E>(this)
    observer.#resolve = onfulfilled
    observer.#reject = onrejected
    observer.#condition = condition
    observer.#differ = differ

    if (!this._root?._finishFlag) {
      this.#children.push(observer)
    }
    this.#runThenPlugin(observer)
    if (once) observer._finishFlag = true
    if (
      immediate &&
      (this._status === PromiseStatus.RESOLVED || this._status === PromiseStatus.REJECTED)
    ) {
      observer._executeObserver.call(observer, this._cacheRootPromise)
    }

    return this.#chain<F extends PromiseLike<infer V> ? V : F>(observer)
  }

  /**
   * push observer
   * @param [onFulfilled] - Function to execute when the parent node is resolved (optional)
   * @param [onRejected] - Function to execute when the parent node is rejected (optional)
   * @param [condition] - Filter function to determine if observer should execute (optional)
   * @param [differ] - Comparison function to check value changes (optional)
   * @returns A new Observable for chaining
   */

  then<F = T>(
    onFulfilled?: OnFulfilled<T, F>,
    onRejected?: OnRejected,
    condition?: (value: T) => boolean,
    differ?: (value: T) => any,
  ) {
    return this.#thenObserver<F>(false, false, onFulfilled, onRejected, condition, differ)
  }

  /**
   * thenImmediate is like then, but will execute observer immediately if previous then or catch has been resolved or rejected
   * @param [onFulfilled] - Function to execute when the parent node is resolved (optional)
   * @param [onRejected] - Function to execute when the parent node is rejected (optional)
   * @returns Observable
   */
  thenImmediate<F = T>(
    onFulfilled?: OnFulfilled<T>,
    onRejected?: OnRejected,
    condition?: (value: T) => boolean,
    differ?: (value: T) => any,
  ) {
    return this.#thenObserver<F>(false, true, onFulfilled, onRejected, condition, differ)
  }

  /**
   * push one time observer, will unsubscribe cur observer when execute
   * @param [onFulfilled] - Function to execute when the parent node is resolved (optional)
   * @param [onRejected] - Function to execute when the parent node is rejected (optional)
   * @returns
   */
  thenOnce<F = T>(onFulfilled?: OnFulfilled<T>, onRejected?: OnRejected) {
    return this.#thenObserver<F>(true, false, onFulfilled, onRejected)
  }

  /**
   * catch observer promise
   * @param onRejected reject function
   * @returns Observable
   */
  catch(onRejected: OnRejected<unknown>) {
    this.#catchHandler = safeCallback(onRejected)
    return this.#chain<T>(this)
  }

  /**
   *  finally observer promise
   * @param onFinally finally function
   * @returns Observable
   */

  finally(onFinally: OnFinally) {
    this.#finallyHandler = safeCallback(onFinally)
    return this.#chain<T>(this)
  }

  #set(value: T, setter: (value: T) => void | Promise<void>): Promise<T> | T {
    if (isObjectLike(this.value)) {
      if (isAsyncFunction(setter)) {
        const draft = createDraft(value)
        return setter(draft).then(() => {
          return finishDraft(draft)
        })
      } else return produce(this.value, setter)
    } else {
      return value
    }
  }

  /**
   * push observer with getter
   * @param getter getter function
   * @returns Observable
   */
  get<F>(getter: (value: T | undefined) => F) {
    return this.thenImmediate<T>(undefined, undefined, undefined, getter).thenImmediate<F>(
      getter as any,
    )
  }

  /**
   * push immutable observer
   * @param setter setter function
   * @returns Observable
   */
  $then(setter: (value: T) => void | Promise<void>) {
    return this.#thenObserver<T>(false, false, (value) => this.#set(value, setter))
  }

  /**
   * push one time immutable observer
   * @param setter setter function
   * @returns Observable
   */
  $thenOnce(setter: (value: T) => void | Promise<void>) {
    return this.#thenObserver<T>(true, false, (value) => this.#set(value, setter))
  }

  /**
   * push immutable observer, if previous then or catch has been resolved or rejected, will execute observer immediately
   * @param setter setter function
   * @returns Observable
   */
  $thenImmediate(setter: (value: T) => void | Promise<void>) {
    if (!this.#parent) this._status = this._status === null ? PromiseStatus.RESOLVED : this._status
    return this.#thenObserver<T>(false, true, (value) => this.#set(value, setter))
  }

  /**
   * Given a condition, the observer will be executed only when condition is true
   * @param condition condition function, given cur observer value
   * @returns Observable
   */
  filter(condition: (value: T) => boolean) {
    return this.then<T>(undefined, undefined, condition)
  }

  /**
   * Given a differ, the observer will be executed only when differ result is not equal to previousvalue
   * @param getter getter function, given cur observer value
   * @returns Observable
   */
  change(getter: (value: T | undefined) => any) {
    return this.then<T>(undefined, undefined, undefined, getter)
  }

  #runExecutePlugin(result: any) {
    if (!this._root?._plugin?.execute.length) return result

    const context = {
      result,
      set: (setter: (value: T) => void | Promise<void>) => this.#set(result, setter),
      root: !this.#parent,
      onfulfilled: this.#resolve,
      onrejected: this.#reject,
      unsubscribe: () => this.#unsubscribeObservable(),
    }

    // use reduce from left to right to compose plugins
    return this._root._plugin.execute.reduce((prevResult, plugin) => {
      return safeCallback(() => plugin({ ...context, result: prevResult }))() ?? prevResult
    }, context.result)
  }

  /**
   * Execute finish callback, if once flag is true, unsubscribe cur observer,
   * if finish flag is true, execute finish callback, and unsubscribe cur observer after setTimeout
   * if condition is set, and condition check is false, return
   * and execute all children observer
   * @param differResult
   */
  #executeFinish(differResult = false) {
    this.#finallyHandler?.()
    // finish flag check
    if (this._root?._finishFlag)
      this.#finishCallbackList.forEach((fn) => safeCallback(fn)(this.value, this._status))
    // unsubscribe check
    if (this._finishFlag || this._root?._finishFlag || (this.#parent && !this.#parent?._root)) {
      const parent = this.#parent
      this.#unsubscribeObservable()
      !this._finishFlag && this.#cleanParent(parent)
    }
    // condition check
    if (this.#condition && !safeCallback(this.#condition)(this.value)) return
    // differ check
    if (this.#differ && differResult) return
    // execute children observer
    if (this.#children?.length) {
      this.#children.slice().forEach((child) => child._executeObserver(this._cacheRootPromise))
    }
  }

  /**
   * Execute node process result, if result is a promise, it will add a catch handler
   * if catchHandler is provided. If result is not a promise, it will resolve the
   * observer immediately.
   * @param result result to execute
   * @param status last promise status
   * @param catchHandler catch handler for promise
   */
  #executeResult(
    result: any | Promise<any>,
    status: PromiseStatus | null,
    catchHandler?: OnRejected,
  ) {
    let differResult = false
    if (result instanceof Promise) {
      const promise = (catchHandler ? result.catch(catchHandler) : result).then(
        (data) => {
          // first time skip differ check
          if (this.#differ && status !== null)
            differResult =
              safeCallback(this.#differ)(this.value) === safeCallback(this.#differ)(data)
          this.value = data
          this._status = PromiseStatus.RESOLVED
        },
        (error) => {
          // first time skip differ check
          if (this.#differ && status !== null)
            differResult =
              safeCallback(this.#differ)(this.value) === safeCallback(this.#differ)(error)
          this.value = error
          this._status = PromiseStatus.REJECTED
        },
      )
      promise.finally(() => this.#executeFinish(differResult))
    } else {
      this._status = PromiseStatus.RESOLVED
      if (this.#differ)
        differResult = safeCallback(this.#differ)(this.value) === safeCallback(this.#differ)(result)
      this.value = result
      this.#executeFinish(differResult)
    }
  }

  /**
   * Process node by executing plugins and handling result
   * @param nodeProcessor - Function that returns value or promise
   * @param rootPromise - Root promise reference for caching
   * @param status - last promise status
   * @remarks
   * - Catches errors and passes to catch handler
   * - Caches the root promise reference
   */
  #executeNode(
    nodeProcessor: () => any | Promise<any>,
    rootPromise: PromiseLike<any>,
    status: PromiseStatus | null,
  ) {
    this._cacheRootPromise = rootPromise
    try {
      const result = this.#runExecutePlugin(nodeProcessor())
      this.#executeResult(result, status, this.#catchHandler)
    } catch (error) {
      this._status = this.#catchHandler ? PromiseStatus.RESOLVED : PromiseStatus.REJECTED
      // ! not sure whether is the correct way to handle this error
      const result = this.#catchHandler ? safeCallback(this.#catchHandler)(error) : error
      this.#executeResult(result, status)
    }
  }

  /**
   * Execute observer with optional root promise or value
   * @param rootPromise - Root promise to observe (optional)
   * @param rootValue - Immediate value to use instead of promise (optional)
   * @remarks
   * - If rootValue provided, will use it immediately
   * - Only executes if not paused and promise matches root promise
   */
  protected _executeObserver(
    rootPromise: PromiseLike<any> | null = this._cacheRootPromise,
    rootValue?: any,
  ) {
    if (!rootPromise || this._root?._pauseFlag || rootPromise !== this._root?._rootPromise) return

    const status = this._status
    this._status = PromiseStatus.PENDING

    // root node
    if (!this.#parent) {
      // if rootValue is provided, execute rootValue immediately instead of waiting for the rootPromise to resolve
      this.#executeNode(
        () => (rootValue !== undefined ? rootValue : rootPromise),
        rootPromise,
        status,
      )
      // child node
    } else if (this.#parent._status === PromiseStatus.RESOLVED) {
      this.#executeNode(
        () => this.#resolve?.(this.#parent?.value) || this.#parent?.value,
        rootPromise,
        status,
      )
    } else if (this.#parent._status === PromiseStatus.REJECTED) {
      this.#executeNode(
        () => this.#reject?.(this.#parent?.value) || Promise.reject(this.#parent?.value),
        rootPromise,
        status,
      )
    }
  }

  /**
   * Execute observer, if rootPromise is provided, it will execute observer immediately
   */
  execute() {
    return this._executeObserver()
  }
}
