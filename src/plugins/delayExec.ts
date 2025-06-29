/**
 * @description delay execute plugin
 * @param delayTime
 * @returns executePlugin
 */
export const delayExec = (delayTime: number) => ({
  execute: ({ result }: { result: Promise<any> | any }) => {
    return new Promise((resolve) => {
      if (result instanceof Promise) {
        result.then((value) => {
          setTimeout(() => {
            resolve(value)
          }, delayTime)
        })
      } else {
        setTimeout(() => {
          resolve(result)
        }, delayTime)
      }
    })
  },
})