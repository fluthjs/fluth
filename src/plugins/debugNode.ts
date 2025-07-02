/**
 * @description debug node execute plugin
 * @returns executePlugin
 */
export const debugNode = () => ({
  execute: ({ result }: { result: Promise<any> | any }) => {
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
    return result
  },
})
