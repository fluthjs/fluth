import { Observable } from '../observable'
import { Stream } from '../stream'
import { StreamTupleValues } from '../types'

/**
 * concat takes multiple streams or Observable, and return a stream that emits values in the order of the input streams.
 * only previous input stream finish, the next input stream values will be emitted
 * The output stream will finish when all the input streams finish.
 * when all input streams unsubscribe, the output stream will also unsubscribe
 * @param {...Stream|Subscription} args$
 * @returns {Stream}
 */
export const concat = <T extends (Stream | Observable)[]>(...args$: T) => {
  const stream$ = new Stream<StreamTupleValues<T>[number]>()
  const finishFlag = [...Array(args$.length)].map(() => false)
  const unsubscribeFlag = [...Array(args$.length)].map(() => false)
  const next = (data: any, promiseStatus: 'resolved' | 'rejected', index: number) => {
    if (index === 0 || finishFlag[index - 1]) {
      stream$.next(
        promiseStatus === 'resolved' ? data : Promise.reject(data),
        finishFlag.every((flag) => flag),
      )
      if (finishFlag[index] && unsubscribeFlag[index + 1]) {
        setTimeout(() => stream$.unsubscribe())
      }
    }
  }
  args$.forEach((arg$, index) => {
    const unsubscribeCallback = () => {
      unsubscribeFlag[index] = true
      if ((index === 0 || finishFlag[index - 1]) && !finishFlag[index]) {
        setTimeout(() => stream$.unsubscribe())
      }
    }
    const completeCallback = () => (finishFlag[index] = true)
    arg$.afterUnsubscribe(unsubscribeCallback)
    arg$.afterComplete(completeCallback)
    const observable = arg$.then(
      (value) => next(value, 'resolved', index),
      (value) => next(value, 'rejected', index),
    )

    stream$.afterUnsubscribe(() => {
      arg$.offUnsubscribe(unsubscribeCallback)
      arg$.offComplete(completeCallback)
      observable.unsubscribe()
    })
  })
  return stream$
}
