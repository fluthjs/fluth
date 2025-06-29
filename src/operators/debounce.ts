import { Observable } from '../observable'

/**
 * @description debounce operator, first time will not emit immediately
 * @param observable
 * @param debounceTime
 * @returns Observable
 */
export const debounce = (debounceTime: number) => (observable$: Observable) => {
  let timer: number | null = null
  let init = true
  const newObservable$ = observable$.then(undefined, undefined, () => {
    if (init || timer) {
      init = false
      if (timer) {
        clearTimeout(timer)
      }
      timer = setTimeout(() => {
        timer = null
        newObservable$.execute()
      }, debounceTime)
      return false
    } else return true
  })
  newObservable$.afterUnsubscribe(() => (timer = null))
  return newObservable$
}
