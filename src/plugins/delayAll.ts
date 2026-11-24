import { OnFulfilled, OnRejected, PromiseStatus } from '../types'
import { debugLog, isPromiseLike } from '../utils'
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

    return new Promise((resolve, reject) => {
      if (result instanceof Promise || isPromiseLike(result)) {
        result.then(
          (value) => {
            setTimeout(() => {
              resolve(value)
            }, delayTime)
          },
          (error) => {
            debugLog('delayAll: upstream promise rejected, pass through reject')
            reject(error)
          },
        )
      } else {
        setTimeout(() => {
          resolve(result)
        }, delayTime)
      }
    })
  },
})
