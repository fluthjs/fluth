import { Observable } from '../observable'
import { Stream } from '../stream'
import { useUnsubscribeCallback } from '../utils'
import { StreamTupleValues } from '../types'

/**
 * combine takes multiple streams or Observable, and return a stream that emits values from all the input streams.
 * The output stream will finish when all the input streams finish.
 * when all input streams unsubscribe, the output stream will also unsubscribe
 * @param {...Stream|Observable} args$
 * @returns {Stream}
 */
export const combine = <T extends (Stream | Observable)[]>(...args$: T) => {
  const stream$ = new Stream<StreamTupleValues<T>>()
  const payload: StreamTupleValues<T> = [] as any
  const promiseStatus = [...Array(args$.length)].map(() => 'pending')
  let finishCount = 0
  const { unsubscribeCallback } = useUnsubscribeCallback(stream$, args$.length)
  const completeCallback = () => (finishCount += 1)

  const next = () => {
    if (promiseStatus.every((status) => status !== 'pending'))
      stream$.next(
        promiseStatus.some((status) => status === 'rejected')
          ? Promise.reject([...payload])
          : [...payload],
        finishCount === args$.length,
      )
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
