import { Observable } from '../observable'
import { Stream } from '../stream'
import { StreamTupleValues } from '../types'
import { getGlobalFluthFactory } from '../utils'

/**
 * race takes multiple streams or Observable, and returns a stream that emits the first value of all the input streams.
 * The output stream will finish when first input stream finish.
 * when first input stream unsubscribe, the output stream will also unsubscribe
 * @param {...Stream|Observable} args$
 * @returns {Stream}
 */
export const promiseRace = <T extends (Stream | Observable)[]>(...args$: T) => {
  const stream$ = (getGlobalFluthFactory()?.() ||
    new Stream<StreamTupleValues<T>[number]>()) as Stream<StreamTupleValues<T>[number]>
  let finishFlag = false
  let finishCount = 0
  let firstIndex: number | null = null

  // check input type
  if (!args$.every((arg$) => arg$ instanceof Stream || arg$ instanceof Observable)) {
    throw new Error('promiseRace operator only accepts Stream or Observable as input')
  }

  // check input empty
  if (args$.length === 0) {
    return stream$
  }

  args$.forEach((arg$, index) => {
    if (arg$._getProtectedProperty('_finishFlag')) {
      finishCount += 1
    }
    const observable = arg$.then(
      (value) => {
        if (firstIndex === null) firstIndex = index
        if (firstIndex === index) {
          stream$.next(value, finishFlag)
        }
      },
      (error) => {
        if (firstIndex === null) firstIndex = index
        if (firstIndex === index) {
          stream$.next(Promise.reject(error), finishFlag)
        }
      },
    )

    const unsubscribeCallback = () => {
      if (firstIndex === index) {
        setTimeout(() => stream$.unsubscribe())
      }
    }
    const completeCallback = () => {
      if (firstIndex === index) {
        finishFlag = true
      }
    }

    arg$.afterUnsubscribe(unsubscribeCallback)
    arg$.afterComplete(completeCallback)

    stream$.afterUnsubscribe(() => {
      arg$.offUnsubscribe(unsubscribeCallback)
      arg$.offComplete(completeCallback)
      observable.unsubscribe()
    })
  })

  Promise.resolve().then(() => {
    if (finishCount === args$.length) {
      stream$.complete()
    }
  })
  return stream$
}
