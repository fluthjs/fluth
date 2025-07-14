import { Observable } from '../observable'
import { Stream } from '../stream'
import { finish } from './finish'

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
export const partition = <T>(
  stream$: Stream<T> | Observable<T>,
  predicate: (this: any, value: any, status: 'resolved' | 'rejected', index: number) => boolean,
  thisArg?: any,
) => {
  const selectedStream$ = new Stream<T>()
  const unselectedStream$ = new Stream<T>()
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

  const next = (data: any, promiseStatus: 'resolved' | 'rejected', flag: boolean) => {
    if (flag) {
      selectedStream$.next(promiseStatus === 'resolved' ? data : Promise.reject(data), finishFlag)
    } else {
      unselectedStream$.next(promiseStatus === 'resolved' ? data : Promise.reject(data), finishFlag)
    }
  }

  const observable$ = stream$
    .then(
      (value: any) => {
        try {
          next(value, 'resolved', predicate.call(thisArg, value, 'resolved', index))
        } catch (error) {
          next(value, 'resolved', false)
          console.log(error)
        }
      },
      (value) => {
        try {
          next(value, 'rejected', predicate.call(thisArg, value, 'rejected', index))
        } catch (error) {
          next(value, 'rejected', false)
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

  finish(selectedStream$, unselectedStream$).afterComplete(() => {
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
