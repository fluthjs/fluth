import { isObject, isMap, isSet } from 'limu/lib/support/util'
import { Stream } from './stream'

export const safeCallback = (callback: any, errorHandler?: (error: any) => void) => {
  return (...args: any[]) => {
    try {
      return callback?.(...args)
    } catch (error) {
      if (errorHandler) {
        errorHandler(error)
      } else {
        console.error(error)
      }
    }
  }
}

export const safeConcat = <T>(...args: (T[] | undefined)[]) => {
  return args.map((arg) => arg || []).flat()
}

export const isObjectLike = (value: any): value is object => {
  return Array.isArray(value) || isObject(value) || isMap(value) || isSet(value)
}

export const isPromiseLike = <T>(payload: T | PromiseLike<T>): payload is PromiseLike<T> => {
  return (
    payload &&
    typeof payload === 'object' &&
    'then' in payload &&
    typeof payload.then === 'function'
  )
}

export const isAsyncFunction = (fn: any): fn is (...args: any[]) => PromiseLike<any> => {
  return (
    typeof fn === 'function' &&
    (Object.prototype.toString.call(fn) === '[object AsyncFunction]' || isPromiseLike(fn))
  )
}

export const useUnsubscribeCallback = (stream$: Stream, length: number) => {
  let unsubscribeCount = 0
  const unsubscribeCallback = () => {
    unsubscribeCount += 1
    if (unsubscribeCount === length) {
      setTimeout(() => {
        stream$.unsubscribe()
      })
    }
  }
  return { unsubscribeCallback }
}
