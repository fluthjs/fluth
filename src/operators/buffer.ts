import { Observable } from '../observable'
import { Stream } from '../stream'

/**
 * This function creates a buffer that collects values from the observable based on the trigger observable.
 * only emit resolved value, if the value is rejected, it will not be emitted
 * @param {Stream | Observable} arg$ - The trigger observable to collect values.
 * @param {Observable<T>} observable$ - The observable to collect values from.
 * @return {Observable<T[]>} A new observable containing arrays of collected values.
 */
export const buffer =
  <T>(arg$: Stream | Observable) =>
  (observable$: Observable<T>): Observable<T[]> => {
    const tempValue: T[] = []
    let finished = false
    const newObservable = new Stream<T[]>()
    const triggerNext = () => {
      newObservable.next([...tempValue], finished)
      tempValue.length = 0
    }

    const dataObservable$ = observable$.then((value) => tempValue.push(value))
    arg$.then(triggerNext)

    arg$.afterComplete(() => {
      finished = true
      dataObservable$.unsubscribe()
    })

    return newObservable.then()
  }
