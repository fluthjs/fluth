import { Observable } from './observable'
import { Stream } from './stream'

export type OnFulfilled<T = any, V = any> = (data: T) => V | PromiseLike<V>
export type OnRejected<V = any> = (reason: any) => V | PromiseLike<V>
export type OnFinally = Parameters<Promise<any>['finally']>[0]
export type thenPluginFn<T, E = object> = (
  unsubscribe: () => void,
  observable: Observable<T, E>,
) => void
/**
 * @param params
 * @returns return promise will reset observer value
 */
export type executePlugin<T> = (params: {
  result: PromiseLike<T> | T
  set: (setter: (state: T) => PromiseLike<void> | void) => PromiseLike<T> | T
  root: boolean
  status: PromiseStatus | null
  onfulfilled?: OnFulfilled
  onrejected?: OnRejected
  unsubscribe: () => void
}) => Promise<any> | any

/**
 * @description use or remove plugins params
 */
export interface PluginParams<T, E = object> {
  then?: thenPluginFn<T, E> | thenPluginFn<T, E>[]
  execute?: executePlugin<T> | executePlugin<T>[]
  thenAll?: thenPluginFn<T, E> | thenPluginFn<T, E>[]
  executeAll?: executePlugin<T> | executePlugin<T>[]
}

/**
 * @description plugin of observable
 */
export interface Plugin<T, E = object> {
  then: thenPluginFn<T, E>[]
  execute: executePlugin<T>[]
  thenAll: thenPluginFn<T, E>[]
  executeAll: executePlugin<T>[]
}

export type Operator<T = any, E = object> = (observable: Observable<T, E>) => Observable<T, E>

export enum PromiseStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

export type StreamTupleValues<T extends (Stream | Observable)[]> = {
  [K in keyof T]: T[K] extends Stream<infer U> | Observable<infer U> ? U : never
}

export type OperatorFunction<T = any, R = any, E = any> = (
  observable: Observable<T, E>,
) => Observable<R, E>

// recursive type of pipe result
export type PipeResult<T, Ops extends any[]> = Ops extends []
  ? T
  : Ops extends [infer FirstOp, ...infer RestOps]
    ? FirstOp extends OperatorFunction<T, infer R>
      ? PipeResult<R, RestOps>
      : never
    : never
