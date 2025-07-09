import { Observable } from '../observable'
import { Stream } from '../stream'

/**
 * A function that audits the data stream and triggers certain actions based on completion.
 * only emit recently resolved value, if the value is rejected, it will not be emitted
 * @param {Stream | Observable} arg$ - The trigger observable to collect values.
 * @param {Observable<T>} observable$ - The observable to collect values from.
 * @return {Observable<T[]>} A new observable containing arrays of collected values.
 */
export const audit =
  <T>(arg$: Stream | Observable) =>
  (observable$: Observable<T>): Observable<T> => {
    let finished = false
    let currentValue: T | undefined
    const newObservable = new Stream<T>()
    const triggerNext = () => {
      newObservable.next(currentValue as T, finished)
    }

    const dataObservable$ = observable$.then((value) => (currentValue = value))
    arg$.then(triggerNext)

    arg$.afterComplete(() => {
      finished = true
      dataObservable$.unsubscribe()
    })

    return newObservable.then() as Observable<T>
  }
