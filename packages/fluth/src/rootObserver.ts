import { Observer } from './observer'

export type thenPlugin = (unsubscribe: () => void) => void
/** execute plugin, this plugin can be used to reset cur observer promise or unsubscribe cur observer
 * @param promise observer promise
 * @param unsubscribe unsubscribe observer
 * @returns return promise will reset observer promise
 */
export type executePlugin = (
  promise: Promise<any>,
  unsubscribe: () => void,
) => Promise<any>

export class RootObserver extends Observer {
  /**
   * plugin for then and execute
   */
  plugin: {
    then: thenPlugin[]
    execute: executePlugin[]
  } = { then: [], execute: [] }
  /**
   * execute pauseFlag
   */
  pauseFlag = false
  /**
   * finishFlag
   */
  finishFlag = false

  root: RootObserver = this

  rootPromise: Promise<any> | null = null

  pause() {
    this.pauseFlag = true
  }

  restart() {
    this.pauseFlag = false
  }

  get finish() {
    return this.finishResolver.promise
  }

  execute() {
    return this.executeObserver()
  }

  next(payload: any, finishFlag = this.finishFlag) {
    const promise =
      payload instanceof Promise || typeof payload?.then === 'function'
        ? payload
        : Promise.resolve(payload)
    if (this.rootPromise === promise || this.finishFlag) return
    this.rootPromise = promise
    this.finishFlag = finishFlag
    this.executeObserver(promise)
  }
}
