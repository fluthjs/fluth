/**
 * @description console node execute plugin
 * @param resolvePrefix prefix for resolve console prefix
 * @param rejectPrefix prefix for reject console prefix
 * @returns executePlugin
 */
export const consoleNode = (resolvePrefix = 'resolve', rejectPrefix = 'reject') => ({
  execute: ({ result }: { result: Promise<any> | any }) => {
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
