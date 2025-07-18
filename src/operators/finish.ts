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

  // check input type
  if (args$.some((arg$) => !(arg$ instanceof Stream) && !(arg$ instanceof Observable))) {
    throw new Error('finish operator only accepts Stream or Observable as input')
  }

  // if no input, return an empty stream
  if (args$.length === 0) {
    return stream$
  }

  const { unsubscribeCallback } = useUnsubscribeCallback(stream$, args$.length)
  const completeCallback = (_v: any, status: PromiseStatus) => {
    finishCount += 1
    if (status === PromiseStatus.REJECTED) rejectFlag = true
  }
  const next = () => {
    if (finishCount === args$.length) {
      stream$.next(rejectFlag ? Promise.reject([...payload]) : [...payload], true)
    }
  }

  args$.forEach((arg$, index) => {
    // if input is finished,
    if (arg$._getFlag('_finishFlag')) {
      payload[index] = arg$.value
      finishCount += 1
      if (arg$.status === PromiseStatus.REJECTED) rejectFlag = true
    }

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

  // if all input is finished, emit the result in next tick
  Promise.resolve().then(() => {
    if (finishCount === args$.length) next()
  })

  return stream$
}
