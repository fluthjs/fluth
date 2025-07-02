import { Observable } from '../observable'
import { Stream } from '../stream'
import { StreamTupleValues, PromiseStatus } from '../types'
import { useUnsubscribeCallback } from '../utils'

/**
 * promiseAll takes multiple streams or Observables and returns a stream that emits an array of resolved values
 * from all input streams. If any input stream is rejected, the output stream will emit a rejected promise with
 * the respective values. The output stream will finish when all input streams finish. When all input streams
 * unsubscribe, the output stream will also unsubscribe.
 * @param {...Stream|Observable} args$ - The input streams or Observables to be combined.
 * @returns {Stream} - A stream that emits an array of values or a rejected promise.
 */

export const promiseAll = <T extends (Stream | Observable)[]>(...args$: T) => {
  const stream$ = new Stream<StreamTupleValues<T>>()
  const payload: StreamTupleValues<T> = [] as any
  const promiseStatus: PromiseStatus[] = [...Array(args$.length)].map(() => PromiseStatus.PENDING)
  let finishCount = 0
  const { unsubscribeCallback } = useUnsubscribeCallback(stream$, args$.length)
  const completeCallback = () => (finishCount += 1)

  const next = () => {
    if (promiseStatus.every((status) => status !== PromiseStatus.PENDING)) {
      stream$.next(
        promiseStatus.some((status) => status === PromiseStatus.REJECTED)
          ? Promise.reject([...payload])
          : [...payload],
        finishCount === args$.length,
      )
      promiseStatus.forEach((_, index) => {
        ;(promiseStatus as PromiseStatus[])[index] = PromiseStatus.PENDING
      })
    }
  }

  const resetPromiseStatus = () => {
    args$.forEach((arg$, index) => {
      if (arg$.status === PromiseStatus.PENDING) {
        promiseStatus[index] = PromiseStatus.PENDING
      }
    })
  }

  args$.forEach((arg$, index) => {
    arg$.afterUnsubscribe(unsubscribeCallback)
    arg$.afterComplete(completeCallback)
    arg$.then(
      (value) => {
        promiseStatus[index] = PromiseStatus.RESOLVED
        payload[index] = value
        resetPromiseStatus()
        next()
      },
      (value) => {
        promiseStatus[index] = PromiseStatus.REJECTED
        payload[index] = value
        resetPromiseStatus()
        next()
      },
    )
    stream$.afterUnsubscribe(() => {
      arg$.offUnsubscribe(unsubscribeCallback)
      arg$.offComplete(completeCallback)
    })
  })

  stream$.afterComplete(() => {
    payload.length = 0
    promiseStatus.length = 0
  })

  return stream$
}
