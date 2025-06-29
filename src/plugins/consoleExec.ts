/**
 * @description console execute plugin
 * @param result
 * @returns executePlugin
 */
export const consoleExec = {
  execute: ({ result }: { result: Promise<any> | any }) => {
    // empty node skip console log
    if (result instanceof Promise) {
      result.then(
        (value) => {
          console.log('value', value)
        },
        (error) => {
          console.log('error', error)
        },
      )
    } else {
      console.log('value', result)
    }
    return result
  },
}
