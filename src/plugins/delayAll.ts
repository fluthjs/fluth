import { OnFulfilled, OnRejected, PromiseStatus } from '../types'
import { isPromiseLike } from '../utils'
/**
 * @description delay all nodes executeAll plugin
 * @param delayTime delay time in milliseconds
 * @returns executeAll Plugin
 */
export const delayAll = (delayTime: number) => ({
  executeAll: ({
    result,
    status,
    onfulfilled,
    onrejected,
    root,
  }: {
    result: PromiseLike<any> | any
    status: PromiseStatus | null
    onfulfilled?: OnFulfilled
    onrejected?: OnRejected
    root: boolean
  }) => {
    // should delay: root node, has resolve callback, or rejected with error handler
    const shouldDelay = root || onfulfilled || (onrejected && status === PromiseStatus.REJECTED)

    if (!shouldDelay) {
      return result
    }

    return new Promise((resolve) => {
      if (result instanceof Promise || isPromiseLike(result)) {
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
