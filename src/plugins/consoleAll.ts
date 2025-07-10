import { OnFulfilled, OnRejected, PromiseStatus } from '../types'
/**
 * @description console node executeAll plugin
 * @param resolvePrefix prefix for resolve console prefix
 * @param rejectPrefix prefix for reject console prefix
 * @returns executeAll Plugin
 */
export const consoleAll = (resolvePrefix = 'resolve', rejectPrefix = 'reject') => ({
  executeAll: ({
    result,
    status,
    onfulfilled,
    onrejected,
    root,
  }: {
    result: Promise<any> | any
    status: PromiseStatus | null
    onfulfilled?: OnFulfilled
    onrejected?: OnRejected
    root: boolean
  }) => {
    // should log: root node, has resolve callback, or rejected with error handler
    const shouldLog = root || onfulfilled || (onrejected && status === PromiseStatus.REJECTED)

    if (!shouldLog) {
      return result
    }

    // log the result
    if (result instanceof Promise) {
      result.then(
        (value) => {
          console.log(resolvePrefix, value)
        },
        (error) => {
          console.log(rejectPrefix, error)
        },
      )
    } else {
      console.log(resolvePrefix, result)
    }
    return result
  },
})
