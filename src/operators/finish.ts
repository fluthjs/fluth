import { Observable } from '../observable'
import { Stream } from '../stream'
import { useUnsubscribeCallback } from '../utils'
import { StreamTupleValues, PromiseStatus } from '../types'

/**
 * @description
 * last takes multiple streams or Observable, and returns a stream that emits the finish values of all the input streams.
 * The output stream will finish when all the input streams finish.
 * when all input streams unsubscribe, the output stream will also unsubscribe
 * @param {...Stream|Observable} args$
 * @returns {Stream}
 */
export const finish = <T extends (Stream | Observable)[]>(...args$: T) => {
  const stream$ = new Stream<StreamTupleValues<T>>()
  const payload: StreamTupleValues<T> = [] as any
  let finishCount = 0
  let rejectFlag = false
  const { unsubscribeCallback } = useUnsubscribeCallback(stream$, args$.length)
  const completeCallback = (_v: any, status: PromiseStatus) => {
    finishCount += 1
    if (status === 'rejected') rejectFlag = true
  }
  const next = () => {
    if (finishCount === args$.length) {
      stream$.next(rejectFlag ? Promise.reject([...payload]) : [...payload], true)
    }
  }

  args$.forEach((arg$, index) => {
    arg$.afterUnsubscribe(unsubscribeCallback)
    arg$.afterComplete(completeCallback)
    const observable = arg$.then(
      (value) => {
        payload[index] = value
        next()
      },
      (value) => {
        payload[index] = value
        next()
      },
    )

    stream$.afterUnsubscribe(() => {
      arg$.offUnsubscribe(unsubscribeCallback)
      arg$.offComplete(completeCallback)
      observable.unsubscribe()
    })
  })

  stream$.afterComplete(() => (payload.length = 0))

  return stream$
}
