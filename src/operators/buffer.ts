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
  <T>(trigger$: Stream | Observable, shouldAwait = true) =>
  (observable$: Observable<T>): Observable<T[]> => {
    const tempValue: T[] = []
    let finished = false
    const newObservable = (getGlobalFluthFactory()?.() || new Stream<T[]>()) as Stream<T[]>
    let pendingObservable$: Observable | undefined

    const dataObservable$ = observable$.then((value) => tempValue.push(value))

    const onPendingRejected = () => {
      pendingObservable$ = undefined
      if (finished) {
        newObservable.complete()
      }
    }

    const triggerNext = () => {
      if (shouldAwait && observable$.status === PromiseStatus.PENDING) {
        if (!pendingObservable$) {
          pendingObservable$ = observable$.thenOnce(triggerNext, onPendingRejected)
        }
        return
      }
      const values = [...tempValue]
      tempValue.length = 0
      pendingObservable$ = undefined // Clear after resolution
      newObservable.next(values, finished)
    }

    const triggerSub$ = trigger$.then(triggerNext)

    const onTriggerComplete = (_value: unknown, status: PromiseStatus) => {
      finished = true
      if (
        (trigger$._getProtectedProperty('_unsubscribeFlag') || status !== PromiseStatus.RESOLVED) &&
        !pendingObservable$
      ) {
        newObservable.complete()
      }
    }

    trigger$.afterComplete(onTriggerComplete)

    const output$ = newObservable.then()

    output$.afterUnsubscribe(() => {
      dataObservable$.unsubscribe()
      triggerSub$.unsubscribe()
      pendingObservable$?.unsubscribe()
      pendingObservable$ = undefined
      trigger$.offComplete(onTriggerComplete)
      tempValue.length = 0
      newObservable.complete()
    })

    return output$
  }
