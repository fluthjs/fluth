import { Observable } from '../observable'
import { Stream } from '../stream'
import { useUnsubscribeCallback } from '../utils'
import { StreamTupleValues, PromiseStatus } from '../types'
import { getGlobalFluthFactory } from '../utils'

/**
 * combine takes multiple streams or Observable, and return a stream that emits values from all the input streams.
 * The output stream will finish when all the input streams finish.
 * when all input streams unsubscribe, the output stream will also unsubscribe
 * @param {...Stream|Observable} args$
 * @returns {Stream}
 */
export const combine = <T extends (Stream | Observable)[]>(...args$: T) => {
  const stream$ = (getGlobalFluthFactory()?.(
    args$.map((arg$) => arg$._getProtectedProperty('_v')),
  ) ||
    new Stream<StreamTupleValues<T>>(
      args$.map((arg$) => arg$._getProtectedProperty('_v')) as StreamTupleValues<T>,
    )) as Stream<StreamTupleValues<T>>
  const payload: StreamTupleValues<T> = [] as any
  const promiseStatus = [...Array(args$.length)].map(() => PromiseStatus.PENDING)
  let finishCount = 0
  const { unsubscribeCallback } = useUnsubscribeCallback(stream$, args$.length)
  const completeCallback = () => (finishCount += 1)

  // check input type
  if (args$.some((arg$) => !(arg$ instanceof Stream) && !(arg$ instanceof Observable))) {
    throw new Error('combine operator only accepts Stream or Observable as input')
  }

  // if no input, return an empty stream
  if (args$.length === 0) {
    return stream$
  }

  const next = () => {
    if (promiseStatus.every((status) => status !== PromiseStatus.PENDING))
      stream$.next(
        promiseStatus.some((status) => status === PromiseStatus.REJECTED)
          ? Promise.reject([...payload])
          : [...payload],
        finishCount === args$.length,
      )
  }

  // if any input is finished, finishCount should be increased
  args$.forEach((arg$, index) => {
    if (arg$._getProtectedProperty('_finishFlag')) {
      promiseStatus[index] = arg$.status as PromiseStatus
      payload[index] = arg$._getProtectedProperty('_v') as StreamTupleValues<T>[number]
      finishCount += 1
    }
  })

  args$.forEach((arg$, index) => {
    arg$.afterUnsubscribe(unsubscribeCallback)
    arg$.afterComplete(completeCallback)
    const observable$ = arg$.then(
      (value) => {
        promiseStatus[index] = PromiseStatus.RESOLVED
        payload[index] = value
        next()
      },
      (value) => {
        promiseStatus[index] = PromiseStatus.REJECTED
        payload[index] = value
        next()
      },
    )
    stream$.afterUnsubscribe(() => {
      arg$.offUnsubscribe(unsubscribeCallback)
      arg$.offComplete(completeCallback)
      observable$.unsubscribe()
    })
  })

  stream$.afterComplete(() => {
    payload.length = 0
    promiseStatus.length = 0
  })

  // if all input is finished, the output stream should be finished
  Promise.resolve().then(() => {
    if (finishCount === args$.length) stream$.complete()
  })

  return stream$
}
