import { Observable } from '../observable'
import { Stream } from '../stream'
import { StreamTupleValues } from '../types'

/**
 * race takes multiple streams or Observable, and returns a stream that emits the first value of all the input streams.
 * The output stream will finish when first input stream finish.
 * when first input stream unsubscribe, the output stream will also unsubscribe
 * @param {...Stream|Observable} args$
 * @returns {Stream}
 */
export const promiseRace = <T extends (Stream | Observable)[]>(...args$: T) => {
  const stream$ = new Stream<StreamTupleValues<T>[number]>()
  let finishFlag = false
  let firstIndex: number | null = null

  args$.forEach((arg$, index) => {
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
  return stream$
}
