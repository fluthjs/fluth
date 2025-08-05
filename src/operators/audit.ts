import { Observable } from '../observable'
import { Stream } from '../stream'
import { PromiseStatus } from '../types'
import { getGlobalFluthFactory } from '../utils'

/**
 * A function that audits the data stream and triggers certain actions based on completion.
 * only emit recently resolved value, if the value is rejected, it will not be emitted
 * @param {Stream | Observable} trigger$ - The trigger observable to collect values.
 * @param {boolean} shouldAwait - Whether to await when then observable status is pending.
 * @param {Observable<T>} observable$ - The observable to collect values from.
 * @return {Observable<T[]>} A new observable containing arrays of collected values.
 */
export const audit =
  <T>(trigger$: Stream | Observable, shouldAwait = true) =>
  (observable$: Observable<T>): Observable<T> => {
    let finished = false
    let currentValue: T | undefined = observable$._getProtectedProperty('_v') as T | undefined
    let pendingObservable$: Observable | undefined
    const newObservable = (getGlobalFluthFactory()?.() || new Stream<T>()) as Stream<T>

    // Only track resolved values, ignore rejected ones
    const dataObservable$ = observable$.then((value) => (currentValue = value))

    const triggerNext = () => {
      if (shouldAwait && observable$.status === PromiseStatus.PENDING) {
        if (!pendingObservable$) {
          pendingObservable$ = observable$.thenOnce(triggerNext)
        }
        return
      } else {
        newObservable.next(currentValue as T, finished)
        pendingObservable$ = undefined // Clear after resolution
      }
    }

    trigger$.then(triggerNext)

    trigger$.afterComplete(() => {
      finished = true
      dataObservable$.unsubscribe()
    })

    return newObservable.then() as Observable<T>
  }
