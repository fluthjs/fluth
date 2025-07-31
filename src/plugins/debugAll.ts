import { OnFulfilled, OnRejected, PromiseStatus } from '../types'
import { isPromiseLike } from '../utils'
/**
 * @param condition condition function, if return true will debug resolve
 * @param conditionError condition function, if return true will debug error
 * @description debug node executeAll plugin
 * @returns executeAll Plugin
 */
export const debugAll = (
  condition?: (value: any) => boolean,
  conditionError?: (value: any) => boolean,
) => ({
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
    // should debug: root node, has resolve callback, or rejected with error handler
    const shouldDebug = root || onfulfilled || (onrejected && status === PromiseStatus.REJECTED)

    if (!shouldDebug) {
      return result
    }
    // empty node skip console log
    if (result instanceof Promise || isPromiseLike(result)) {
      result.then(
        (data) => {
          // eslint-disable-next-line
          if (!condition || condition(data)) debugger
        },
        (error) => {
          // eslint-disable-next-line
          if (!conditionError || conditionError(error)) debugger
        },
      )
    } else {
      // eslint-disable-next-line
      if (!condition || condition(result)) debugger
    }
    return result
  },
})
