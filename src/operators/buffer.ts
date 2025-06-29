import { Observable } from '../observable'
import { Stream } from '../stream'

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

    const observable1$ = observable$.then((value) => tempValue.push(value))

    arg$.then(() => triggerNext())
    arg$.afterComplete(() => {
      finished = true
      observable1$.unsubscribe()
    })

    return newObservable.then()
  }
