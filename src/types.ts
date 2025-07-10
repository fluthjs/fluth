import { Observable } from './observable'
import { Stream } from './stream'

export type OnFulfilled<T = any, V = any> = (data: T) => V | Promise<V>
export type OnRejected<V = any> = (reason: any) => V | Promise<V>
export type OnFinally = Parameters<Promise<any>['finally']>[0]
export type thenPluginFn<T> = (unsubscribe: () => void, observable: Observable<T>) => void
/**
 * @param params
 * @returns return promise will reset observer value
 */
export type executePlugin<T> = (params: {
  result: Promise<T> | T
  set: (setter: (state: T) => Promise<void> | void) => Promise<T> | T
  root: boolean
  status: PromiseStatus | null
  onfulfilled?: OnFulfilled
  onrejected?: OnRejected
  unsubscribe: () => void
}) => Promise<any> | any

/**
 * @description use or remove plugins params
 */
export interface PluginParams<T> {
  then?: thenPluginFn<T> | thenPluginFn<T>[]
  execute?: executePlugin<T> | executePlugin<T>[]
  thenAll?: thenPluginFn<T> | thenPluginFn<T>[]
  executeAll?: executePlugin<T> | executePlugin<T>[]
}

/**
 * @description plugin of observable
 */
export interface Plugin<T> {
  then: thenPluginFn<T>[]
  execute: executePlugin<T>[]
  thenAll: thenPluginFn<T>[]
  executeAll: executePlugin<T>[]
}

export type Operator<T = any> = (observable: Observable<T>) => Observable<T>

export enum PromiseStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

export type StreamTupleValues<T extends (Stream | Observable)[]> = {
  [K in keyof T]: T[K] extends Stream<infer U> | Observable<infer U> ? U : never
}

export type OperatorFunction<T = any, R = any> = (observable: Observable<T>) => Observable<R>

// recursive type of pipe result
export type PipeResult<T, Ops extends any[]> = Ops extends []
  ? T
  : Ops extends [infer FirstOp, ...infer RestOps]
    ? FirstOp extends OperatorFunction<T, infer R>
      ? PipeResult<R, RestOps>
      : never
    : never
