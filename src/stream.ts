import { produce, createDraft, finishDraft } from 'limu'
import { Observable, PromiseStatus } from './observable'
import { combinePlugin, CombineChainResult } from './plugins'
import { isObjectLike, isPromiseLike, isAsyncFunction } from './utils'

export type thenPluginFn = (unsubscribe: () => void) => void
/** execute plugin, this plugin can be used to reset cur observer promise or unsubscribe cur observer
 * @param promise observer promise
 * @param unsubscribe unsubscribe observer
 * @returns return promise will reset observer promise
 */
export type executePlugin = <T>(params: {
  result: Promise<T> | T
  set: (setter: (state: T) => Promise<void> | void) => Promise<T> | T
  unsubscribe: () => void
}) => Promise<any> | any

export type ChainPluginFn<T extends Observable = Observable> = (observer: T) => Record<string, any>

export type ChainReturn<P extends Plugin[], T, E> =
  CombineChainResult<P> extends infer C
    ? {
        [K in keyof C]: C[K] extends (...args: infer Args) => any
          ? ReturnType<C[K]> extends Observable
            ? (...args: Args) => Observable<T, E & ChainReturn<P, T, E>> & E & ChainReturn<P, T, E>
            : C[K]
          : C[K]
      }
    : object

export interface ThenOrExecutePlugin {
  then?: thenPluginFn | thenPluginFn[]
  execute?: executePlugin | executePlugin[]
}

export interface Plugin extends ThenOrExecutePlugin {
  chain?: ChainPluginFn
}

export interface RootPlugin {
  then: thenPluginFn[]
  execute: executePlugin[]
  chain: ChainPluginFn[]
}

export class Stream<
  T = any,
  I extends boolean = false,
  E extends Record<string, any> = object,
> extends Observable<T, E> {
  declare value: I extends true ? T : T | undefined
  constructor(data?: T) {
    super()
    if (data instanceof Promise) {
      throw new Error('Stream data cannot be a Promise')
    }
    this._root = this as Stream
    if (data) {
      this.value = data
      this._rootPromise = Promise.resolve(data)
      this._status = PromiseStatus.RESOLVED
      // set cacheRootPromise for execute fn
      this._cacheRootPromise = this._rootPromise
    }
  }

  /**
   * use plugin
   * @param plugin plugin
   * @returns root node with plugin
   */
  use<P extends Plugin[]>(
    ...plugins: P
  ): Stream<T, I, E & ChainReturn<P, T, E>> & E & ChainReturn<P, T, E> {
    if (plugins.length === 0)
      return this as unknown as Stream<T, I, E & ChainReturn<P, T, E>> & E & ChainReturn<P, T, E>

    if (!this._plugin) this._plugin = { then: [], execute: [], chain: [] }
    const curPlugin: RootPlugin = { then: [], execute: [], chain: [] }
    const mergePlugin = plugins.length > 1 ? combinePlugin(...plugins) : (plugins[0] as Plugin)
    const pluginKeys = Object.keys(mergePlugin) as (keyof Plugin)[]

    pluginKeys.forEach((key) => {
      const item = mergePlugin[key]
      if (this._plugin && item)
        this._plugin[key] = [
          ...new Set([...(this._plugin[key] as any[]), ...(Array.isArray(item) ? item : [item])]),
        ]
      curPlugin[key] = [item as any]
    })
    this._runChainPlugin(this, curPlugin)

    return this as unknown as Stream<T, I, E & ChainReturn<P, T, E>> & E & ChainReturn<P, T, E>
  }

  /**
   * remove  ThenOrExecutePlugin
   * @param plugin ThenOrExecutePlugin
   */
  remove(plugin: ThenOrExecutePlugin | ThenOrExecutePlugin[]) {
    if (!this._plugin) return
    const plugins = Array.isArray(plugin) ? plugin : [plugin]
    const pluginKeys = Object.keys(this._plugin) as (keyof ThenOrExecutePlugin)[]

    pluginKeys.forEach((key) => {
      const itemsToRemove =
        plugins
          .filter((p) => !!p[key])
          .map((p) => (Array.isArray(p[key]) ? p[key] : [p[key]]))
          .flat() || []

      const pluginArray = this._plugin?.[key]
      if (pluginArray) {
        pluginArray.slice().forEach((item: any) => {
          if (itemsToRemove.includes(item)) {
            const index = pluginArray.indexOf(item)
            if (index !== -1) {
              pluginArray.splice(index, 1)
            }
          }
        })
      }
    })
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
    this._executeObserver(promise, isPromiseLikePayload ? undefined : payload)
  }
}
