import { Observable } from '../observable'
import { Stream } from '../stream'

/**
 * Skip values from source until the trigger resolves once, then pass through subsequent values.
 * Only resolution of `trigger$` enables the pass-through; rejections are ignored.
 * @param trigger$ stream or observable to enable pass-through when it resolves
 * @returns operator function
 */
export const skipUntil =
  <T>(trigger$: Stream | Observable) =>
  (observable$: Observable<T>): Observable<T> => {
    let enabled = false

    // downstream observable passes when enabled
    const newObservable$ = observable$.then(undefined, undefined, () => enabled) as Observable<T>

    // enable once, and then unsubscribe the trigger listener
    let enableListener$: Observable | undefined
    enableListener$ = trigger$.then(() => {
      enabled = true
      enableListener$?.unsubscribe()
    })

    // cleanup when downstream unsubscribes or when trigger completes
    newObservable$.afterUnsubscribe(() => {
      enableListener$?.unsubscribe()
    })

    return newObservable$
  }
