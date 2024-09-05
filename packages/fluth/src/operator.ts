import { Subjection } from '.'
import { Stream } from './stream'

const useUnsubscribeCallback = (stream$: Stream, length: number) => {
  let unsubscribeCount = 0
  const unsubscribeCallback = () => {
    unsubscribeCount += 1
    if (unsubscribeCount === length) {
      stream$.unsubscribe()
    }
  }
  return { unsubscribeCallback }
}

/**
 * @description
 * last takes multiple streams or subjections, and returns a stream that emits the last values of all the input streams.
 * The output stream will finish when all the input streams finish.
 * when all input streams unsubscribe, the output stream will also unsubscribe
 * @param {...Stream|Subjection} args
 * @returns {Stream}
 */
export const last = (...args: (Stream | Subjection)[]) => {
  const stream$ = new Stream()
  const payload: any[] = []
  let finishCount = 0
  let rejectFlag = false
  const { unsubscribeCallback } = useUnsubscribeCallback(stream$, args.length)
  const next = () => {
    if (finishCount === args.length) {
      stream$.next(
        rejectFlag ? Promise.reject(payload) : Promise.resolve(payload),
        true,
      )
    }
  }

  args.forEach((arg$, index) => {
    arg$.setUnsubscribeCallback(unsubscribeCallback)
    arg$.finish
      .finally(() => (finishCount += 1))
      .then(
        (data) => {
          payload[index] = data
          next()
        },
        (data) => {
          rejectFlag = true
          payload[index] = data
          next()
        },
      )
  })

  return stream$
}

/**
 * combine takes multiple streams or subjections, and return a stream that emits values from all the input streams.
 * The output stream will finish when all the input streams finish.
 * when all input streams unsubscribe, the output stream will also unsubscribe
 * @param {...Stream|Subjection} args
 * @returns {Stream}
 */
export const combine = (...args: (Stream | Subjection)[]) => {
  const stream$ = new Stream()
  const payload: any[] = []
  const promiseStatus = [...Array(args.length)].map(() => 'pending')
  let finishCount = 0
  const { unsubscribeCallback } = useUnsubscribeCallback(stream$, args.length)

  const next = () => {
    if (promiseStatus.every((status) => status !== 'pending'))
      stream$.next(
        promiseStatus.some((status) => status === 'reject')
          ? Promise.reject(payload)
          : Promise.resolve(payload),
        finishCount === args.length,
      )
  }

  args.forEach((arg$, index) => {
    arg$.setUnsubscribeCallback(unsubscribeCallback)
    arg$.then(
      (data) => {
        promiseStatus[index] = 'resolve'
        payload[index] = data
        next()
      },
      (data) => {
        promiseStatus[index] = 'reject'
        payload[index] = data
        next()
      },
    )
    arg$.finish.finally(() => (finishCount += 1))
  })

  return stream$
}

/**
 * concat takes multiple streams or subjections, and return a stream that emits values in the order of the input streams.
 * only previous input stream finish, the next input stream values will be emitted
 * The output stream will finish when all the input streams finish.
 * when all input streams unsubscribe, the output stream will also unsubscribe
 * @param {...Stream|Subjection} args
 * @returns {Stream}
 */
export const concat = (...args: (Stream | Subjection)[]) => {
  const stream$ = new Stream()
  const finishFlag = [...Array(args.length)].map(() => false)
  const unsubscribeFlag = [...Array(args.length)].map(() => false)
  const next = (
    data: any,
    promiseStatus: 'resolve' | 'reject',
    index: number,
  ) => {
    if (index === 0 || finishFlag[index - 1]) {
      stream$.next(
        Promise[promiseStatus](data),
        finishFlag.every((flag) => flag),
      )
      if (finishFlag[index] && unsubscribeFlag[index + 1]) {
        stream$.unsubscribe()
      }
    }
  }
  args.forEach((arg$, index) => {
    arg$.setUnsubscribeCallback(() => {
      unsubscribeFlag[index] = true
      if ((index === 0 || finishFlag[index - 1]) && !finishFlag[index]) {
        stream$.unsubscribe()
      }
    })
    arg$.then(
      (data) => next(data, 'resolve', index),
      (data) => next(data, 'reject', index),
    )
    arg$.finish.finally(() => (finishFlag[index] = true))
  })
  return stream$
}

/**
 * merge takes multiple streams or subjections, and return a stream that emits values from all the input streams.
 * The output stream will finish when all the input streams finish.
 * when all input streams unsubscribe, the output stream will also unsubscribe
 * @param {...Stream|Subjection} args
 * @returns {Stream}
 */
export const merge = (...args: (Stream | Subjection)[]) => {
  const stream$ = new Stream()
  let finishCount = 0
  const { unsubscribeCallback } = useUnsubscribeCallback(stream$, args.length)
  const next = (data: any, promiseStatus: 'resolve' | 'reject') => {
    stream$.next(Promise[promiseStatus](data), finishCount === args.length)
  }

  args.forEach((arg$) => {
    arg$.setUnsubscribeCallback(unsubscribeCallback)
    arg$.then(
      (data) => next(data, 'resolve'),
      (data) => next(data, 'reject'),
    )
    arg$.finish.finally(() => (finishCount += 1))
  })
  return stream$
}

export const partition = (
  stream$: Stream | Subjection,
  predicate: (this: any, value: any, index: number) => boolean,
  thisArg?: any,
) => {
  const selectedStream$ = new Stream()
  const unselectedStream$ = new Stream()
  let finishFlag = false
  let index = 1

  const next = (
    data: any,
    promiseStatus: 'resolve' | 'reject',
    flag: boolean,
  ) => {
    if (flag) {
      selectedStream$.next(Promise[promiseStatus](data), finishFlag)
    } else {
      unselectedStream$.next(Promise[promiseStatus](data), finishFlag)
    }
  }

  stream$
    .then(
      (data: any) => {
        try {
          next(data, 'resolve', predicate.call(thisArg, data, index))
        } catch (error) {
          next(data, 'resolve', false)
          console.log(error)
        }
      },
      (data) => {
        try {
          next(data, 'reject', predicate.call(thisArg, data, index))
        } catch (error) {
          next(data, 'reject', false)
          console.log(error)
        }
      },
    )
    .finally(() => (index += 1))

  stream$.setUnsubscribeCallback(() => {
    selectedStream$.unsubscribe()
    unselectedStream$.unsubscribe()
  })

  stream$.finish.finally(() => {
    finishFlag = true
  })

  return [selectedStream$, unselectedStream$]
}

export const race = (...args: (Stream | Subjection)[]) => {
  const stream$ = new Stream()
  let finishFlag = false
  let firstIndex: number | null = null

  args.forEach((arg$, index) => {
    arg$.then(
      (data) => {
        if (firstIndex === null) firstIndex = index
        if (firstIndex === index) {
          stream$.next(Promise.resolve(data), finishFlag)
        }
      },
      (error) => {
        if (firstIndex === null) firstIndex = index
        if (firstIndex === index) {
          stream$.next(Promise.reject(error), finishFlag)
        }
      },
    )

    arg$.setUnsubscribeCallback(() => {
      if (firstIndex === index) {
        stream$.unsubscribe()
      }
    })

    arg$.finish.finally(() => {
      if (firstIndex === index) {
        finishFlag = true
      }
    })
  })
  return stream$
}
