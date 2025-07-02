import { produce, createDraft, finishDraft } from 'limu'
import { Stream } from './stream'
import { safeCallback, isObjectLike, isAsyncFunction } from './utils'
import {
  OnFulfilled,
  OnRejected,
  OnFinally,
  Plugin,
  PluginParams,
  PromiseStatus,
  OperatorFunction,
  PipeResult,
} from './types'

/**
 *  Observable node, the basic unit of promise-like stream programming,
 * An Observable instance is a dual-role entity in stream programming:
 * 1. It acts as an observable that can be subscribed to by observer
 * 2. It also acts as an observer that can receive and process data
 * @class Observable
 * @template T the type of the value
 * @template E the type of the chain plugin
 */
export class Observable<T = any> {
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
  // plugin of current observable
  #plugin: Plugin = { then: [], execute: [], thenAll: [], executeAll: [] }

  // status of observable
  protected _status: PromiseStatus | null = null
  // root observable node
  protected _root: Stream | null = null
  // cache root promise, for execute fn
  protected _cacheRootPromise: PromiseLike<any> | null = null
  // pause flag of root observable, no use for child observable
  protected _pauseFlag = false
  // finish flag
  protected _finishFlag = false
  // unsubscribe flag
  protected _unsubscribeFlag = false
  // once flag
  protected _onceFlag = false
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

  /**
   * use plugin
   * @param plugin plugin
   * @returns current observable
   */
  use<P extends PluginParams[]>(...plugins: P) {
    if (plugins.length === 0) return this

    const curPlugin: Plugin = {
      then: plugins.flatMap((p) => p.then || []).filter(Boolean),
      execute: plugins.flatMap((p) => p.execute || []).filter(Boolean),
      thenAll: plugins.flatMap((p) => p.thenAll || []).filter(Boolean),
      executeAll: plugins.flatMap((p) => p.executeAll || []).filter(Boolean),
    }

    if (this.#parent && (curPlugin.thenAll.length || curPlugin.executeAll.length)) {
      throw new Error('observable node can not use thenAll or executeAll plugin')
    }

    const pluginKeys = Object.keys(curPlugin) as (keyof Plugin)[]

    pluginKeys.forEach((key) => {
      const item = curPlugin[key]
      if (this.#plugin && item)
        this.#plugin[key] = [
          ...new Set([...(this.#plugin[key] as any[]), ...(Array.isArray(item) ? item : [item])]),
        ]
      curPlugin[key] = [item as any]
    })

    return this
  }

  /**
   * remove  ThenOrExecutePlugin
   * @param plugins ThenOrExecutePlugin
   * @returns current observable
   */
  remove<P extends PluginParams[]>(...plugins: P) {
    if (plugins.length === 0) return this
    const curPlugin: Plugin = {
      then: plugins.flatMap((p) => p.then || []).filter(Boolean),
      execute: plugins.flatMap((p) => p.execute || []).filter(Boolean),
      thenAll: plugins.flatMap((p) => p.thenAll || []).filter(Boolean),
      executeAll: plugins.flatMap((p) => p.executeAll || []).filter(Boolean),
    }

    const pluginKeys = Object.keys(curPlugin) as (keyof Plugin)[]

    pluginKeys.forEach((key) => {
      this.#plugin[key] = this.#plugin[key].filter(
        (item) => !curPlugin[key].includes(item as any),
      ) as any
    })

    return this
  }

  /**
   * pipe operator
   */
  pipe(): Observable<T>
  pipe<A>(op1: OperatorFunction<T, A>): Observable<A>
  pipe<A, B>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>): Observable<B>
  pipe<A, B, C>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
  ): Observable<C>
  pipe<A, B, C, D>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
  ): Observable<D>
  pipe<A, B, C, D, E>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
  ): Observable<E>
  pipe<A, B, C, D, E, F>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
  ): Observable<F>
  pipe<A, B, C, D, E, F, G>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
  ): Observable<G>
  pipe<A, B, C, D, E, F, G, H>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>,
  ): Observable<H>
  pipe<A, B, C, D, E, F, G, H, I>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>,
    op9: OperatorFunction<H, I>,
  ): Observable<I>
  pipe<A, B, C, D, E, F, G, H, I>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>,
    op9: OperatorFunction<H, I>,
    ...ops: OperatorFunction<any, any>[]
  ): Observable
  pipe<Ops extends OperatorFunction<any, any>[]>(
    ...operators: Ops
  ): Observable<PipeResult<T, Ops>> {
    return operators.reduce(
      (observable, operator) => operator(observable),
      this as Observable<T>,
    ) as Observable<PipeResult<T, Ops>>
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
      this.#plugin.then = []
      this.#plugin.execute = []
      this._cacheRootPromise = null
    }
  }

  /**
   * unsubscribe observable node
   */
  unsubscribe() {
    if (this._finishFlag) return
    this._finishFlag = true
    this._unsubscribeFlag = true
    this.#unsubscribeObservable(true, false)
  }

  /**
   * There are two scenarios when #unsubscribeObservable will be called:
   * 1. executeFinish trigger unsubscribe(once or finish), active is false
   * 2. actively calling observable's unsubscribe method, active is true
   * current observer is not root observer, should also have different behavior
   * @param active active flag, indicate #unsubscribeObservable is called by active or not
   * @param immediate immediate flag, indicate children should be clear immediately or later
   */
  #unsubscribeObservable(active = false, immediate = false) {
    if (this._status === PromiseStatus.PENDING) return

    if (this.#parent) {
      const idx = this.#parent.#children.indexOf(this)
      if (idx !== -1) {
        this.#parent.#children.splice(idx, 1)[0]
      }
    }
    if (active) this.#finishCallbackList.forEach((fn) => safeCallback(fn)(this.value, this._status))

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
    } else {
      if (immediate)
        // clear all children
        this.#children = []
      this.#clean()
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
    const thenPlugins = this._root
      ? this._root.#plugin.thenAll.concat(this.#plugin.then)
      : this.#plugin.then
    thenPlugins.forEach((fn) => {
      safeCallback(fn)(() => observer.#unsubscribeObservable(), observer)
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
    const observer = new Observable<F extends PromiseLike<infer V> ? V : F>(this)
    observer.#resolve = onfulfilled
    observer.#reject = onrejected
    observer.#condition = condition
    observer.#differ = differ

    if (!this._root?._finishFlag) {
      this.#children.push(observer)
    }
    this.#runThenPlugin(observer)
    if (once) observer._onceFlag = true
    if (
      immediate &&
      (this._status === PromiseStatus.RESOLVED || this._status === PromiseStatus.REJECTED)
    ) {
      observer._executeObserver.call(observer, this._cacheRootPromise)
    }

    return observer
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
    return this
  }

  /**
   *  finally observer promise
   * @param onFinally finally function
   * @returns Observable
   */

  finally(onFinally: OnFinally) {
    this.#finallyHandler = safeCallback(onFinally)
    return this
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
   * Given a differ, the observer will be executed only when differ result is not equal to previousvalue
   * @param getter getter function, given cur observer value
   * @returns Observable
   */
  change(getter: (value: T | undefined) => any) {
    return this.then<T>(undefined, undefined, undefined, getter)
  }

  #runExecutePlugin(result: any) {
    const executeAll = this._root
      ? this._root.#plugin.executeAll.concat(this.#plugin.execute)
      : this.#plugin.execute
    if (!executeAll.length) return result

    const context = {
      result,
      set: (setter: (value: T) => void | Promise<void>) => this.#set(result, setter),
      root: !this.#parent,
      onfulfilled: this.#resolve,
      onrejected: this.#reject,
      unsubscribe: () => this.#unsubscribeObservable(),
    }

    // use reduce from left to right to compose plugins
    return executeAll.reduce((prevResult, plugin) => {
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
    if (
      this._unsubscribeFlag ||
      this._onceFlag ||
      this._root?._finishFlag ||
      (this.#parent && !this.#parent?._root)
    ) {
      const parent = this.#parent
      this.#unsubscribeObservable(false, this._unsubscribeFlag)
      if (!this._onceFlag && !this._unsubscribeFlag) this.#cleanParent(parent)
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
      if (this.#differ && status !== null)
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
   * @param active - Whether called by execute function
   * @remarks
   * - If rootValue provided, will use it immediately
   * - Only executes if not paused and promise matches root promise
   */
  protected _executeObserver(
    rootPromise: PromiseLike<any> | null = this._cacheRootPromise,
    rootValue?: any,
    active = false,
  ) {
    if (!rootPromise || this._root?._pauseFlag || rootPromise !== this._root?._rootPromise) return

    const status = this._status
    this._status = PromiseStatus.PENDING

    // root node
    if (!this.#parent) {
      // if rootValue is provided, execute rootValue immediately instead of waiting for the rootPromise to resolve
      this.#executeNode(() => (active ? rootPromise : rootValue), rootPromise, status)
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
    return this._executeObserver(undefined, undefined, true)
  }
}
