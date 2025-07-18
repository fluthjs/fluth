import { Observable } from '../observable'
import { Stream } from '../stream'
import { useUnsubscribeCallback } from '../utils'
import { StreamTupleValues } from '../types'

/**
 * merge takes multiple streams or Observable, and return a stream that emits values from all the input streams.
 * The output stream will finish when all the input streams finish.
 * when all input streams unsubscribe, the output stream will also unsubscribe
 * @param {...Stream|Observable} args$
 * @returns {Stream}
 */
export const merge = <T extends (Stream | Observable)[]>(...args$: T) => {
  const stream$ = new Stream<StreamTupleValues<T>[number]>()
  let finishCount = 0

  // check input type
  if (args$.some((arg$) => !(arg$ instanceof Stream) && !(arg$ instanceof Observable))) {
    throw new Error('merge operator only accepts Stream or Observable as input')
  }

  // check input empty
  if (args$.length === 0) {
    return stream$
  }

  const { unsubscribeCallback } = useUnsubscribeCallback(stream$, args$.length)
  const completeCallback = () => (finishCount += 1)
  const next = (data: any, promiseStatus: 'resolved' | 'rejected') => {
    stream$.next(
      promiseStatus === 'resolved' ? data : Promise.reject(data),
      finishCount === args$.length,
    )
  }

  args$.forEach((arg$) => {
    if (arg$._getFlag('_finishFlag')) {
      finishCount += 1
    }

    arg$.afterUnsubscribe(unsubscribeCallback)
    arg$.afterComplete(completeCallback)
    const observable = arg$.then(
      (value) => next(value, 'resolved'),
      (value) => next(value, 'rejected'),
    )

    stream$.afterUnsubscribe(() => {
      arg$.offUnsubscribe(unsubscribeCallback)
      arg$.offComplete(completeCallback)
      observable.unsubscribe()
    })
  })

  // if all input is finished, the output stream should be finished
  Promise.resolve().then(() => {
    if (finishCount === args$.length) stream$.complete()
  })
  return stream$
}
