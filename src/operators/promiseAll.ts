import { Observable } from '../observable'
import { Stream } from '../stream'
import { StreamTupleValues } from '../types'
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
  const promiseStatus = [...Array(args$.length)].map(() => 'pending')
  let finishCount = 0
  const { unsubscribeCallback } = useUnsubscribeCallback(stream$, args$.length)
  const completeCallback = () => (finishCount += 1)

  const next = () => {
    if (promiseStatus.every((status) => status !== 'pending')) {
      stream$.next(
        promiseStatus.some((status) => status === 'rejected')
          ? Promise.reject([...payload])
          : [...payload],
        finishCount === args$.length,
      )
      promiseStatus.forEach((_, index) => (promiseStatus[index] = 'pending'))
    }
  }

  args$.forEach((arg$, index) => {
    arg$.afterUnsubscribe(unsubscribeCallback)
    arg$.afterComplete(completeCallback)
    arg$.then(
      (value) => {
        promiseStatus[index] = 'resolved'
        payload[index] = value
        next()
      },
      (value) => {
        promiseStatus[index] = 'rejected'
        payload[index] = value
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
