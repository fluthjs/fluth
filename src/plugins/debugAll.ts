import { OnFulfilled, OnRejected } from '../types'
/**
 * @description debug node executeAll plugin
 * @returns executeAll Plugin
 */
export const debugAll = () => ({
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
        () => {
          // eslint-disable-next-line
          debugger
        },
        () => {
          // eslint-disable-next-line
          debugger
        },
      )
    } else {
      // eslint-disable-next-line
      debugger
    }
    // eslint-disable-next-line
    debugger
    return result
  },
})
