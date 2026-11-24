import { describe, test, expect, expectTypeOf, vi, beforeEach } from 'vitest'
import {
  $,
  Observable,
  Stream,
  debounce,
  throttle,
  skipFilter,
  delay,
  skip,
  skipUntil,
  audit,
  buffer,
  filter,
  map,
  change,
  get,
  set,
  partition,
} from '../../index'
import { isPromiseLike } from '../../src/utils'
import { sleep } from '../utils'

describe('TypeScript generic inference', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  test('then, thenImmediate, and thenOnce infer chained sync and async return types', async () => {
    const num$ = $(10)

    const thenChain$ = num$.then((v) => String(v)).then((s) => Promise.resolve(s.length))
    expectTypeOf(thenChain$).toEqualTypeOf<Observable<number>>()

    const immediateChain$ = num$
      .thenImmediate((v) => `v:${v}`)
      .thenImmediate((s) => Promise.resolve(s.length > 0))
    expectTypeOf(immediateChain$).toEqualTypeOf<Observable<boolean>>()

    const immediatePassthrough$ = num$.thenImmediate()
    expectTypeOf(immediatePassthrough$).toEqualTypeOf<Observable<number>>()

    const onceChain$ = num$.thenOnce((v) => [v]).thenOnce((arr) => arr.length)
    expectTypeOf(onceChain$).toEqualTypeOf<Observable<number>>()

    const oncePassthrough$ = num$.thenOnce()
    expectTypeOf(oncePassthrough$).toEqualTypeOf<Observable<number>>()

    await sleep(0)
    expect(immediateChain$.value).toBe(true)
    num$.next(42)
    await sleep(0)
    expect(thenChain$.value).toBe(2)
    expect(onceChain$.value).toBe(1)
  })

  test('pipe preserves downstream types across debounce, throttle, skipFilter, and other operators', async () => {
    const num$ = $(1)
    const trigger$ = $(true)

    const debounced$ = num$.pipe(debounce(50))
    const throttled$ = num$.pipe(throttle(50))
    const skipFiltered$ = num$.pipe(skipFilter((count) => count > 1))
    const delayed$ = num$.pipe(delay(20))
    const skipped$ = num$.pipe(skip(1))
    const skippedUntil$ = num$.pipe(skipUntil(trigger$))
    const audited$ = num$.pipe(audit(trigger$))
    const buffered$ = num$.pipe(buffer(trigger$))

    expectTypeOf(debounced$).toEqualTypeOf<Observable<number>>()
    expectTypeOf(throttled$).toEqualTypeOf<Observable<number>>()
    expectTypeOf(skipFiltered$).toEqualTypeOf<Observable<number>>()
    expectTypeOf(delayed$).toEqualTypeOf<Observable<number>>()
    expectTypeOf(skipped$).toEqualTypeOf<Observable<number>>()
    expectTypeOf(skippedUntil$).toEqualTypeOf<Observable<number>>()
    expectTypeOf(audited$).toEqualTypeOf<Observable<number>>()
    expectTypeOf(buffered$).toEqualTypeOf<Observable<number[]>>()

    const chained$ = num$.pipe(
      map((n) => `item-${n}`),
      debounce(30),
      throttle(10),
      skipFilter((t) => t >= 1),
      delay(10),
      filter((s) => s.startsWith('item-')),
      map((s) => s.length),
    )
    expectTypeOf(chained$).toEqualTypeOf<Observable<number>>()

    const results: number[] = []
    chained$.then((len) => results.push(len))
    num$.next(123)
    await sleep(60)
    expect(results).toEqual([8])
  })

  test('object operators and partition preserve types', () => {
    const obj$ = $({ count: 1, label: 'a' })
    const changed$ = obj$.pipe(change((v) => v?.count))
    const got$ = obj$.pipe(get((v) => v?.label))
    const updated$ = obj$.pipe(
      set((draft) => {
        draft.count += 1
      }),
    )

    expectTypeOf(changed$).toEqualTypeOf<Observable<{ count: number; label: string }>>()
    expectTypeOf(got$).toEqualTypeOf<Observable<string | undefined>>()
    expectTypeOf(updated$).toEqualTypeOf<Observable<{ count: number; label: string }>>()

    const [even$, odd$] = partition($(2), (v) => v % 2 === 0)
    expectTypeOf(even$).toEqualTypeOf<Stream<number>>()
    expectTypeOf(odd$).toEqualTypeOf<Stream<number>>()
  })

  test('isPromiseLike narrows union types cleanly', () => {
    const checkUnion = (unionVal: string | Promise<number>) => {
      if (isPromiseLike(unionVal)) {
        expectTypeOf(unionVal).toEqualTypeOf<Promise<number>>()
        return true
      } else {
        expectTypeOf(unionVal).toEqualTypeOf<string>()
        return false
      }
    }
    expect(checkUnion(Promise.resolve(1))).toBe(true)
    expect(checkUnion('plain')).toBe(false)

    const unknownVal: unknown = { then: () => undefined }
    if (isPromiseLike(unknownVal)) {
      expectTypeOf(unknownVal).toEqualTypeOf<PromiseLike<any>>()
    }
  })

  test('Observable.use deduplicates plugins without corrupting plugin lists', () => {
    const calls: string[] = []
    const plugin = ({ result }: { result: any }) => {
      calls.push(String(result))
      return result
    }
    const stream$ = $<string>()
    stream$.use({ execute: plugin }).use({ execute: [plugin] })
    stream$.next('ok')
    expect(calls).toEqual(['ok'])
  })
})
