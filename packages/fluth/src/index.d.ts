import { Observer } from './observer'
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
  | 'execute'
> & { finish: PromiseWithResolvers<any>['promise'] }

/**
 * then plugin, this plugin can be used to unsubscribe cur observer
 * @param unsubscribe
 */

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
