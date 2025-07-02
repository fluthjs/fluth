import { OnFulfilled, OnRejected } from '../types'
/**
 * @description console node executeAll plugin
 * @param resolvePrefix prefix for resolve console prefix
 * @param rejectPrefix prefix for reject console prefix
 * @returns executeAll Plugin
 */
export const consoleAll = (resolvePrefix = 'resolve', rejectPrefix = 'reject') => ({
  executeAll: ({
    result,
    onfulfilled,
    onrejected,
    root,
  }: {
    result: Promise<any> | any
    onfulfilled?: OnFulfilled
    onrejected?: OnRejected
    root: boolean
  }) => {
    // skip pass through node
    if (!root && !onfulfilled && !onrejected) {
      return result
    }
    // empty node skip console log
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
