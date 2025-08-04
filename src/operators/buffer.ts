import { Observable } from '../observable'
import { Stream } from '../stream'
import { PromiseStatus } from '../types'
import { getGlobalFluthFactory } from '../utils'

/**
 * This function creates a buffer that collects values from the observable based on the trigger observable.
 * only emit resolved value, if the value is rejected, it will not be emitted
 * @param {Stream | Observable} trigger$ - The trigger observable to collect values.
 * @param {boolean} shouldAwait - Whether to await when observable status is pending.
 * @param {Observable<T>} observable$ - The observable to collect values from.
 * @return {Observable<T[]>} A new observable containing arrays of collected values.
 */
export const buffer =
  <T, E = object>(trigger$: Stream | Observable, shouldAwait = true) =>
  (observable$: Observable<T, E>): Observable<T[], E> => {
    const tempValue: T[] = []
    let finished = false
    const newObservable = (getGlobalFluthFactory()?.() || new Stream<T[]>()) as Stream<T[], E>
    let pendingObservable$: Observable<any, E> | undefined

    const dataObservable$ = observable$.then((value) => tempValue.push(value))

    const triggerNext = () => {
      if (shouldAwait && observable$.status === PromiseStatus.PENDING) {
        if (!pendingObservable$) {
          pendingObservable$ = observable$.thenOnce(triggerNext)
        }
        return
      }
      newObservable.next([...tempValue], finished)
      pendingObservable$ = undefined // Clear after resolution
      tempValue.length = 0
    }

    trigger$.then(triggerNext)

    trigger$.afterComplete(() => {
      finished = true
      dataObservable$.unsubscribe()
    })

    return newObservable.then()
  }
