import { isPromiseLike } from '../utils'
/**
 * @description delay execute plugin
 * @param delayTime
 * @returns executePlugin
 */
export const delayExec = (delayTime: number) => ({
  execute: ({ result }: { result: PromiseLike<any> | any }) => {
    return new Promise((resolve) => {
      if (result instanceof Promise || isPromiseLike(result)) {
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
