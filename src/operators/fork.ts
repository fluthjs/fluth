import { Observable } from '../observable'
import { Stream } from '../stream'

/**
 * fork takes a stream or Observable, and returns a stream that emits the same value as the input stream.
 * The output stream will finish when the input stream finish.
 * when the input stream unsubscribe, the output stream will also unsubscribe
 * @param {Stream|Observable} arg$ the input stream or Observable
 * @returns {Stream} a stream that emits the same value as the input stream
 */
export const fork = <T>(arg$: Stream<T> | Observable<T>): Stream<T> => {
  const stream$ = new Stream<T>()
  let finishFlag = false
  const observable$ = arg$.thenImmediate(
    (value) => stream$.next(value, finishFlag),
    (value) => stream$.next(Promise.reject(value), finishFlag),
  )
  arg$.afterUnsubscribe(() =>
    setTimeout(() => {
      stream$.unsubscribe()
    }),
  )
  arg$.afterComplete(() => (finishFlag = true))

  stream$.afterUnsubscribe(() => {
    observable$.unsubscribe()
  })
  return stream$
}
