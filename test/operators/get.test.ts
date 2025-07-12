import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy } from '../utils'
import { $, get } from '../../index'

describe('get operator test', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('should extract values using getter function', async () => {
    const promise$ = $({ a: 1, b: { c: 2 } })
    const observable$ = promise$.pipe(get((value) => value?.b))

    observable$.then((value) => {
      console.log(value?.c)
    })

    expect(observable$.value?.c).toBe(2)

    promise$.set((value) => {
      value.a = 2
    })
    expect(consoleSpy).toHaveBeenCalledTimes(0)

    promise$.set((value) => {
      value.b.c = 3
    })
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 3)
  })

  test('should handle nested property extraction', async () => {
    const source$ = $({ user: { profile: { name: 'Alice', age: 25 } } })
    const name$ = source$.pipe(get((value) => value?.user?.profile?.name))

    name$.then((name) => {
      console.log('name:', name)
    })

    expect(name$.value).toBe('Alice')

    source$.set((value) => {
      value.user.profile.name = 'Bob'
    })

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'name:', 'Bob')
  })

  test('should handle array property extraction', async () => {
    const source$ = $({ items: [1, 2, 3] })
    const length$ = source$.pipe(get((value) => value?.items?.length))

    length$.then((length) => {
      console.log('length:', length)
    })

    expect(length$.value).toBe(3)

    source$.set((value) => {
      value.items.push(4)
    })

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'length:', 4)
  })

  test('should handle undefined values gracefully', async () => {
    const source$ = $<{ data?: { value: number } }>()
    const value$ = source$.pipe(get((value) => value?.data?.value))

    value$.then((val) => {
      console.log('value:', val)
    })

    expect(value$.value).toBeUndefined()

    source$.next({ data: { value: 42 } })

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'value:', 42)
  })

  test('should handle primitive value extraction', async () => {
    const source$ = $('hello world')
    const length$ = source$.pipe(get((value) => value?.length))

    length$.then((length) => {
      console.log('string length:', length)
    })

    expect(length$.value).toBe(11)

    source$.next('hi')

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'string length:', 2)
  })

  test('should handle complex transformations', async () => {
    const source$ = $({ x: 3, y: 4 })
    const distance$ = source$.pipe(
      get((value) => (value ? Math.sqrt(value.x * value.x + value.y * value.y) : 0)),
    )

    distance$.then((distance) => {
      console.log('distance:', distance)
    })

    expect(distance$.value).toBe(5)

    source$.set((value) => {
      value.x = 6
      value.y = 8
    })

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'distance:', 10)
  })

  test('should work with chained get operations', async () => {
    const source$ = $({
      data: {
        users: [
          { name: 'Alice', settings: { theme: 'dark' } },
          { name: 'Bob', settings: { theme: 'light' } },
        ],
      },
    })

    const firstUserTheme$ = source$
      .pipe(get((value) => value?.data?.users))
      .pipe(get((users) => users?.[0]))
      .pipe(get((user) => user?.settings?.theme))

    firstUserTheme$.then((theme) => {
      console.log('theme:', theme)
    })

    expect(firstUserTheme$.value).toBe('dark')

    source$.set((value) => {
      value.data.users[0].settings.theme = 'light'
    })

    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'theme:', 'light')
  })

  test('should handle initial value as undefined', async () => {
    const source$ = $<string | undefined>(undefined)
    const length$ = source$.pipe(get((value) => value?.length))

    length$.then((length) => {
      console.log('undefined length:', length)
    })

    expect(length$.value).toBeUndefined()

    source$.next('hello')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'undefined length:', 5)
  })

  test('should handle initial value as null', async () => {
    const source$ = $<{ data?: string } | null>(null)
    const data$ = source$.pipe(get((value) => value?.data))

    data$.then((data) => {
      console.log('null data:', data)
    })

    expect(data$.value).toBeUndefined()

    source$.next({ data: 'hello' })
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'null data:', 'hello')
  })

  test('should handle empty string', async () => {
    const source$ = $('')
    const length$ = source$.pipe(get((value) => value?.length))

    length$.then((length) => {
      console.log('empty string length:', length)
    })

    expect(length$.value).toBe(0)

    source$.next('test')
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'empty string length:', 4)
  })

  test('should handle empty array', async () => {
    const source$ = $<number[]>([])
    const length$ = source$.pipe(get((value) => value?.length))

    length$.then((length) => {
      console.log('empty array length:', length)
    })

    expect(length$.value).toBe(0)

    source$.next([1, 2, 3])
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'empty array length:', 3)
  })

  test('should handle empty object', async () => {
    const source$ = $({})
    const keys$ = source$.pipe(get((value) => Object.keys(value || {}).length))

    keys$.then((count) => {
      console.log('empty object keys:', count)
    })

    expect(keys$.value).toBe(0)

    source$.next({ a: 1, b: 2 })
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'empty object keys:', 2)
  })

  test('should handle zero value', async () => {
    const source$ = $(0)
    const doubled$ = source$.pipe(get((value) => (value ?? 0) * 2))

    doubled$.then((doubled) => {
      console.log('zero doubled:', doubled)
    })

    expect(doubled$.value).toBe(0)

    source$.next(5)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'zero doubled:', 10)
  })

  test('should handle false value', async () => {
    const source$ = $(false)
    const negated$ = source$.pipe(get((value) => !value))

    negated$.then((negated) => {
      console.log('false negated:', negated)
    })

    expect(negated$.value).toBe(true)

    source$.next(true)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'false negated:', false)
  })

  test('should handle getter returning undefined', async () => {
    const source$ = $<{ a: number; nonExistent?: any }>({ a: 1 })
    const undefined$ = source$.pipe(get((value) => value?.nonExistent))

    undefined$.then((result) => {
      console.log('getter undefined:', result)
    })

    expect(undefined$.value).toBeUndefined()

    // Setting a property that doesn't affect the getter result, should not trigger
    source$.set((value) => {
      value.a = 2
    })
    expect(consoleSpy).toHaveBeenCalledTimes(0)

    // Adding the property that getter depends on, should trigger
    source$.set((value) => {
      value.nonExistent = 'now exists'
    })
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'getter undefined:', 'now exists')
  })

  test('should handle getter returning null', async () => {
    const source$ = $({ data: 'test' })
    const null$ = source$.pipe(get((value) => (value?.data ? null : 'default')))

    null$.then((result) => {
      console.log('getter null:', result)
    })

    expect(null$.value).toBeNull()

    source$.set((value) => {
      value.data = ''
    })
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'getter null:', 'default')
  })

  test('should handle transition from value to undefined', async () => {
    const source$ = $<{ value?: string }>({ value: 'hello' })
    const value$ = source$.pipe(get((value) => value?.value))

    value$.then((val) => {
      console.log('transition value:', val)
    })

    expect(value$.value).toBe('hello')

    source$.set((value) => {
      delete value.value
    })
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'transition value:', undefined)
  })

  test('should handle transition from undefined to value', async () => {
    const source$ = $<{ value?: string }>({})
    const value$ = source$.pipe(get((value) => value?.value))

    value$.then((val) => {
      console.log('transition undefined to value:', val)
    })

    expect(value$.value).toBeUndefined()

    source$.set((value) => {
      value.value = 'world'
    })
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'transition undefined to value:', 'world')
  })

  test('should handle deep nested undefined access', async () => {
    const source$ = $<{ a?: { b?: { c?: string } } }>({ a: {} })
    const deep$ = source$.pipe(get((value) => value?.a?.b?.c?.toUpperCase()))

    deep$.then((result) => {
      console.log('deep nested:', result)
    })

    expect(deep$.value).toBeUndefined()

    source$.set((value) => {
      if (value.a) {
        value.a.b = { c: 'test' }
      }
    })
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'deep nested:', 'TEST')
  })

  test('should handle array with undefined elements', async () => {
    const source$ = $<(string | undefined)[]>(['a', undefined, 'c'])
    const filtered$ = source$.pipe(get((value) => value?.filter(Boolean)))

    filtered$.then((filtered) => {
      console.log('filtered array:', filtered)
    })

    expect(filtered$.value).toEqual(['a', 'c'])

    source$.next([undefined, 'b', undefined])
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'filtered array:', ['b'])
  })

  test('should handle numeric edge cases', async () => {
    const source$ = $<number>(NaN)
    const isValid$ = source$.pipe(get((value) => !isNaN(value ?? NaN)))

    isValid$.then((valid) => {
      console.log('is valid number:', valid)
    })

    expect(isValid$.value).toBe(false)

    // Change from false to true, should trigger
    source$.next(42)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'is valid number:', true)

    // Still valid (true), should not trigger
    source$.next(Infinity)
    expect(consoleSpy).toHaveBeenCalledTimes(1)

    // Still valid (true), should not trigger
    source$.next(-Infinity)
    expect(consoleSpy).toHaveBeenCalledTimes(1)

    // Change from true to false, should trigger
    source$.next(NaN)
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'is valid number:', false)
  })

  test('should handle object with null properties', async () => {
    const source$ = $<{ name: string | null; age: number | null }>({ name: null, age: null })
    const hasName$ = source$.pipe(get((value) => value?.name !== null))

    hasName$.then((hasName) => {
      console.log('has name:', hasName)
    })

    expect(hasName$.value).toBe(false)

    source$.set((value) => {
      value.name = 'Alice'
    })
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'has name:', true)
  })
})
