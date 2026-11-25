import type { Observable } from '../observable'
import { OnFulfilled, OnRejected, PromiseStatus } from '../types'
import { isPromiseLike } from '../utils'
/**
 * @description delay all nodes executeAll plugin
 * @param delayTime delay time in milliseconds
 * @returns executeAll Plugin
 */
export const delayAll = (delayTime: number) => {
  const nodeStates = new WeakMap<
    Observable,
    { timers: Set<ReturnType<typeof setTimeout>>; unsubscribed: boolean }
  >()

  return {
    executeAll: ({
      result,
      status,
      onfulfilled,
      onrejected,
      root,
      observable,
    }: {
      result: PromiseLike<any> | any
      status: PromiseStatus | null
      onfulfilled?: OnFulfilled
      onrejected?: OnRejected
      root: boolean
      observable?: Observable
    }) => {
      // should delay: root node, has resolve callback, or rejected with error handler
      const shouldDelay = root || onfulfilled || (onrejected && status === PromiseStatus.REJECTED)

      if (!shouldDelay) {
        return result
      }

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
