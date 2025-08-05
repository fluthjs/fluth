import { Observable } from '../observable'
import { Stream } from '../stream'
import { getGlobalFluthFactory } from '../utils'

/**
 * fork takes a stream or Observable, and returns a stream that emits the same value as the input stream.
 * @param {Stream|Observable} arg$ - The input stream or Observable to fork from
 * @param {boolean} autoUnsubscribe - Whether the output stream should automatically unsubscribe
 *                                   when the input stream unsubscribes. Defaults to true.
 *                                   - When true: input stream unsubscribe will cause output stream to unsubscribe
 *                                   - When false: input stream unsubscribe will NOT affect output stream
 * @returns {Stream} A stream that emits the same values as the input stream
 **/

export const fork = <T>(arg$: Stream<T> | Observable<T>, autoUnsubscribe = true): Stream<T> => {
  const stream$ = (getGlobalFluthFactory()?.() || new Stream<T>()) as Stream<T>
  let finishFlag = false

  // check input type
  if (!(arg$ instanceof Stream) && !(arg$ instanceof Observable)) {
    throw new Error('fork operator only accepts Stream or Observable as input')
  }

  // if arg$ is finished, should not fork
  if (arg$._getProtectedProperty('_finishFlag')) {
    return stream$
  }

  // fork the arg$ stream
  const observable$ = arg$.thenImmediate(
    (value) => stream$.next(value, finishFlag),
    (value) => stream$.next(Promise.reject(value), finishFlag),
  )

  const argAfterUnsubscribe = () =>
    setTimeout(() => {
      stream$.unsubscribe()
    })
  const argAfterComplete = () => (finishFlag = true)

  if (autoUnsubscribe) {
    arg$.afterUnsubscribe(argAfterUnsubscribe)
    arg$.afterComplete(argAfterComplete)
  }

  stream$.afterUnsubscribe(() => {
    observable$.unsubscribe()
    if (autoUnsubscribe) {
      arg$.offUnsubscribe(argAfterUnsubscribe)
      arg$.offComplete(argAfterComplete)
    }
  })
  return stream$
}
