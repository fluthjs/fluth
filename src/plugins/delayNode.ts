import { isPromiseLike } from '../utils'
/**
 * @description delay execute plugin
 * @param delayTime
 * @returns executePlugin
 */
export const delayNode = (delayTime: number) => ({
  execute: ({ result }: { result: PromiseLike<any> | any }) => {
    return new Promise((resolve, reject) => {
      if (result instanceof Promise || isPromiseLike(result)) {
        result.then(
          (value) => {
            setTimeout(() => {
              resolve(value)
            }, delayTime)
          },
          (error) => {
            reject(error)
          },
        )
      } else {
        setTimeout(() => {
          resolve(result)
        }, delayTime)
      }
    })
  },
})
