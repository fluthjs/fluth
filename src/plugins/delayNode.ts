import type { Observable } from '../observable'
import { isPromiseLike } from '../utils'
/**
 * @description delay execute plugin
 * @param delayTime
 * @returns executePlugin
 */
export const delayNode = (delayTime: number) => {
  const nodeStates = new WeakMap<
    Observable,
    { timers: Set<ReturnType<typeof setTimeout>>; unsubscribed: boolean }
  >()

  return {
    execute: ({
      result,
      observable,
    }: {
      result: PromiseLike<any> | any
      observable?: Observable
    }) => {
      let state = observable ? nodeStates.get(observable) : undefined
      if (observable && !state) {
        const nodeState = { timers: new Set<ReturnType<typeof setTimeout>>(), unsubscribed: false }
        state = nodeState
        nodeStates.set(observable, nodeState)
        observable.afterUnsubscribe(() => {
          nodeState.unsubscribed = true
          nodeState.timers.forEach((timer) => clearTimeout(timer))
          nodeState.timers.clear()
        })
      }

      return new Promise((resolve, reject) => {
        const schedule = (value: any) => {
          if (state?.unsubscribed) return
          const timer = setTimeout(() => {
            state?.timers.delete(timer)
            resolve(value)
          }, delayTime)
          state?.timers.add(timer)
        }

        if (isPromiseLike(result)) {
          result.then(
            (value) => {
              schedule(value)
            },
            (error) => {
              reject(error)
            },
          )
        } else {
          schedule(result)
        }
      })
    },
  }
}
