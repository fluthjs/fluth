import { Observable } from '../observable'
import { Stream } from '../stream'
import { StreamTupleValues, PromiseStatus } from '../types'
import { getGlobalFluthFactory } from '../utils'

/**
 * concat takes multiple streams or Observable, and return a stream that emits values in the order of the input streams.
 * only previous input stream finish, the next input stream values will be emitted
 * The output stream will finish when all the input streams finish.
 * when all input streams unsubscribe, the output stream will also unsubscribe
 * @param {...Stream|Subscription} args$
 * @returns {Stream}
 */
export const concat = <T extends (Stream | Observable)[]>(...args$: T) => {
  const stream$ = (getGlobalFluthFactory()?.() ||
    new Stream<StreamTupleValues<T>[number]>()) as Stream<StreamTupleValues<T>[number]>
  const finishFlag = [...Array(args$.length)].map(() => false)
  const unsubscribeFlag = [...Array(args$.length)].map(() => false)

  // check input type
  if (args$.some((arg$) => !(arg$ instanceof Stream) && !(arg$ instanceof Observable))) {
    throw new Error('concat operator only accepts Stream or Observable as input')
  }

  // check input empty
  if (args$.length === 0) {
    return stream$
  }

  const next = (data: any, promiseStatus: PromiseStatus, index: number) => {
    if (index === 0 || finishFlag[index - 1]) {
      stream$.next(
        promiseStatus === PromiseStatus.RESOLVED ? data : Promise.reject(data),
        finishFlag.every((flag) => flag),
      )
      if (finishFlag[index] && unsubscribeFlag[index + 1]) {
        setTimeout(() => stream$.unsubscribe())
      }
    }
  }
  args$.forEach((arg$, index) => {
    if (arg$._getFlag('_finishFlag')) {
      finishFlag[index] = true
    }

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
      (value) => next(value, PromiseStatus.RESOLVED, index),
      (value) => next(value, PromiseStatus.REJECTED, index),
    )

    stream$.afterUnsubscribe(() => {
      arg$.offUnsubscribe(unsubscribeCallback)
      arg$.offComplete(completeCallback)
      observable.unsubscribe()
    })
  })

  // if all input is finished, the output stream should be finished
  Promise.resolve().then(() => {
    if (finishFlag.every((flag) => flag)) stream$.complete()
  })
  return stream$
}
