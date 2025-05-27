import { isObject, isMap, isSet } from 'limu/lib/support/util'

export const safeCallback = (callback: any) => {
  return (...args: any[]) => {
    try {
      return callback?.(...args)
    } catch (error) {
      console.log(error)
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

export const isAsyncFunction = (fn: any): fn is (...args: any[]) => Promise<any> => {
  return typeof fn === 'function' && Object.prototype.toString.call(fn) === '[object AsyncFunction]'
}
