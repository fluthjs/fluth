import { Observable } from './observable'
import { Plugin } from './stream'
export type CombineChainResult<T extends any[]> = T extends [infer First, ...infer Rest]
  ? First extends { chain: (o: Observable) => infer R }
    ? R & CombineChainResult<Rest>
    : CombineChainResult<Rest>
  : object

export const combinePlugin = <T extends Plugin[]>(...args: T) => {
  type ChainResult<T extends any[]> = T extends [infer First, ...infer Rest]
    ? First extends { chain: (o: any) => infer R }
      ? R & ChainResult<Rest>
      : ChainResult<Rest>
    : object

  return {
    execute: args.flatMap((p) => p.execute || []),
    then: args.flatMap((p) => p.then || []),
    chain: <O extends Observable>(observable: O) => {
      let result = {} as ChainResult<T>
      for (const plugin of args) {
        if (plugin.chain) {
          const chained = plugin.chain(observable)
          result = Object.assign(result, chained) as ChainResult<T>
        }
      }
      return result
    },
  }
}

/**
 * @description delay chain plugin
 * @param observable
 * @param delayTime
 * @returns Observable
 */
export const delay = {
  chain: <T extends Observable>(observable: T) => {
    return {
      delay: (delayTime: number) =>
        observable.then((value) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(value)
            }, delayTime)
          })
        }) as T,
    }
  },
}

/**
 * @description delay execute plugin
 * @param delayTime
 * @returns executePlugin
 */
export const delayExec = (delayTime: number) => ({
  execute: ({ result }: { result: Promise<any> | any }) => {
    return new Promise((resolve) => {
      if (result instanceof Promise) {
        result.then((value) => {
          setTimeout(() => {
            resolve(value)
          }, delayTime)
        })
      } else {
        setTimeout(() => {
          resolve(result)
        }, delayTime)
      }
    })
  },
})

/**
 * @description throttle chain plugin, last time will emit
 * @param observable
 * @param throttleTime
 * @returns Observable
 */
export const throttle = {
  chain: <T extends Observable>(observable: T) => {
    return {
      throttle: (throttleTime: number) => {
        let lastTime = 0
        let timeout: ReturnType<typeof setTimeout> | null = null
        const newObservable = observable.then(undefined, undefined, () => {
          const now = Date.now()
          if (timeout) {
            clearTimeout(timeout)
            timeout = null
          }
          if (!lastTime || now - lastTime >= throttleTime) {
            lastTime = Date.now()
            return true
          } else {
            const remaining = throttleTime - (now - lastTime)
            timeout = setTimeout(() => {
              newObservable.execute()
              lastTime = Date.now()
            }, remaining)
            return false
          }
        })
        return newObservable as T
      },
    }
  },
}

/**
 * @description debounce chain plugin, first time will not emit immediately
 * @param observable
 * @param debounceTime
 * @returns Observable
 */
export const debounce = {
  chain: <T extends Observable>(observable: T) => {
    return {
      debounce: (debounceTime: number) => {
        let timer: number | null = null
        let init = true
        const newObservable = observable.then(undefined, undefined, () => {
          if (init || timer) {
            init = false
            if (timer) {
              clearTimeout(timer)
            }
            timer = setTimeout(() => {
              timer = null
              newObservable.execute()
            }, debounceTime)
            return false
          } else return true
        })
        return newObservable
      },
    }
  },
}

/**
 * @description console execute plugin
 * @param result
 * @returns executePlugin
 */
export const consoleExec = {
  execute: ({ result }: { result: Promise<any> | any }) => {
    if (result instanceof Promise) {
      result.then((value) => {
        console.log('value', value)
      })
    } else {
      console.log('value', result)
    }
    return result
  },
}
