import { Observable } from '../observable'
import { Stream } from '../stream'
import { finish } from './finish'
import { PromiseStatus } from '../types'
import { getGlobalFluthFactory } from '../utils'

/**
 * partition takes a stream or Observable, and a predicate function that takes value and index as arguments.
 * It returns two streams, the first stream emits values when the predicate return true,
 * and the second stream emits values when the predicate return false.
 * The output streams will finish when the input stream finish.
 * when the input stream unsubscribe, the output streams will also unsubscribe.
 * @param {Stream|Observable} stream$ the input stream or Observable
 * @param {(this: any, value: any, index: number) => boolean} predicate the predicate function
 * @param {any} [thisArg] the this of the predicate function
 * @returns {[Stream, Stream]} an array of two streams
 */
export const partition = <T, E = object>(
  stream$: Stream<T, E> | Observable<T, E>,
  predicate: (this: any, value: any, status: PromiseStatus, index: number) => boolean,
  thisArg?: any,
) => {
  const selectedStream$ = (getGlobalFluthFactory()?.() || new Stream<T>()) as Stream<T, E>
  const unselectedStream$ = (getGlobalFluthFactory()?.() || new Stream<T>()) as Stream<T, E>
  let finishFlag = false
  let index = 1

  // check input type
  if (!(stream$ instanceof Stream) && !(stream$ instanceof Observable)) {
    throw new Error('partition operator only accepts Stream or Observable as input')
  }

  // check input finished
  if (stream$._getFlag('_finishFlag')) {
    finishFlag = true
  }

  const next = (data: any, promiseStatus: PromiseStatus, flag: boolean) => {
    if (flag) {
      selectedStream$.next(
        promiseStatus === PromiseStatus.RESOLVED ? data : Promise.reject(data),
        finishFlag,
      )
    } else {
      unselectedStream$.next(
        promiseStatus === PromiseStatus.RESOLVED ? data : Promise.reject(data),
        finishFlag,
      )
    }
  }

  const observable$ = stream$
    .then(
      (value: any) => {
        try {
          next(
            value,
            PromiseStatus.RESOLVED,
            predicate.call(thisArg, value, PromiseStatus.RESOLVED, index),
          )
        } catch (error) {
          next(value, PromiseStatus.RESOLVED, false)
          console.log(error)
        }
      },
      (value) => {
        try {
          next(
            value,
            PromiseStatus.REJECTED,
            predicate.call(thisArg, value, PromiseStatus.REJECTED, index),
          )
        } catch (error) {
          next(value, PromiseStatus.REJECTED, false)
          console.log(error)
        }
      },
    )
    .finally(() => (index += 1))

  const unsubscribeCallback = () => {
    setTimeout(() => {
      selectedStream$.unsubscribe()
      unselectedStream$.unsubscribe()
    })
  }
  const completeCallback = () => (finishFlag = true)

  stream$.afterUnsubscribe(unsubscribeCallback)
  stream$.afterComplete(completeCallback)

  finish(selectedStream$ as any, unselectedStream$ as any).afterComplete(() => {
    stream$.offUnsubscribe(unsubscribeCallback)
    stream$.offComplete(completeCallback)
    observable$.unsubscribe()
  })

  // if input is finished, the output streams should be finished
  Promise.resolve().then(() => {
    if (finishFlag) {
      selectedStream$.complete()
      unselectedStream$.complete()
    }
  })

  return [selectedStream$, unselectedStream$]
}
