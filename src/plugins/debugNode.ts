import { isPromiseLike } from '../utils'

/**
 * @param condition condition function, if return true will debug resolve
 * @param conditionError condition function, if return true will debug error
 * @description debug node execute plugin
 * @returns executePlugin
 */
export const debugNode = (
  condition?: (value: any) => boolean,
  conditionError?: (value: any) => boolean,
) => ({
  execute: ({ result }: { result: PromiseLike<any> | any }) => {
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
