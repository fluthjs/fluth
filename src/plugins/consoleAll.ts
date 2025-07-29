import { OnFulfilled, OnRejected, PromiseStatus } from '../types'
import { isPromiseLike } from '../utils'
/**
 * @description console node executeAll plugin
 * @param resolvePrefix prefix for resolve console prefix
 * @param rejectPrefix prefix for reject console prefix
 * @param ignoreUndefined ignore undefined value
 * @returns executeAll Plugin
 */
export const consoleAll = (
  resolvePrefix = 'resolve',
  rejectPrefix = 'reject',
  ignoreUndefined = true,
) => ({
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
    // should log: root node, has resolve callback, or rejected with error handler
    const shouldLog = root || onfulfilled || (onrejected && status === PromiseStatus.REJECTED)

    if (!shouldLog) {
      return result
    }

    // log the result
    if (result instanceof Promise || isPromiseLike(result)) {
      result.then(
        (value) => {
          if (ignoreUndefined && value === undefined) {
            return
          }
          console.log(resolvePrefix, value)
        },
        (error) => {
          if (ignoreUndefined && error === undefined) {
            return
          }
          console.log(rejectPrefix, error)
        },
      )
    } else {
      if (ignoreUndefined && result === undefined) {
        return
      }
      console.log(resolvePrefix, result)
    }
    return result
  },
})
