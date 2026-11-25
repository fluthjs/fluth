import type { Stream } from './stream'
import { Observable } from './observable'

const OBJECT_LIKE_TAGS = new Set(['[object Object]', '[object Map]', '[object Set]'])

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
  if (value === null || typeof value !== 'object') return false
  if (Array.isArray(value)) return true
  return OBJECT_LIKE_TAGS.has(Object.prototype.toString.call(value))
}

export const isPromiseLike = <T = any>(payload: unknown): payload is PromiseLike<T> => {
  return (
    payload !== null &&
    (typeof payload === 'object' || typeof payload === 'function') &&
    typeof (payload as PromiseLike<T>).then === 'function'
  )
}

export const checkStreamOrObservableInput = (arg$: any, isArray = false) => {
  if (isArray) {
    return Array.isArray(arg$) && arg$.every((arg) => arg instanceof Observable)
  } else {
    return arg$ instanceof Observable
  }
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

export const getGlobalFluthFactory = () => {
  if (typeof globalThis !== 'undefined') {
    // @ts-expect-error globalThis is not defined in browser
    return globalThis.__fluth_global_factory__
  } else if (typeof window !== 'undefined') {
    // @ts-expect-error window is not defined in node
    return window.__fluth_global_factory__
  }
  // @ts-expect-error global is not defined in browser
  else if (typeof global !== 'undefined') {
    // @ts-expect-error global is not defined in browser
    return global.__fluth_global_factory__
  } else if (typeof self !== 'undefined') {
    // @ts-expect-error self is not defined in browser
    return self.__fluth_global_factory__
  } else {
    return undefined
  }
}
