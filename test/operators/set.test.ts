import { expect, describe, test, vi, beforeEach } from 'vitest'
import { consoleSpy, sleep } from '../utils'
import { $, set } from '../../index'

describe('set operator test', () => {
  beforeEach(() => {
    consoleSpy.mockClear()
    vi.useFakeTimers()
    process.setMaxListeners(100)
  })

  test('should set property in object immutably', () => {
    const stream$ = $()
    const modifiedStream$ = stream$.pipe(
      set((draft) => {
        draft.age = 26
      }),
    )

    const initialData = { name: 'Alice', age: 25 }
    stream$.next(initialData)

    // Check that modification was applied immutably
    expect(modifiedStream$.value).toEqual({ name: 'Alice', age: 26 })
    // Original data should remain unchanged
    expect(initialData.age).toBe(25)
    // Objects should be different references
    expect(stream$.value === modifiedStream$.value).toBeFalsy()
  })

  test('should add new properties to object', () => {
    const stream$ = $()
    const modifiedStream$ = stream$.pipe(
      set((draft: any) => {
        draft.age = 30
        draft.city = 'Shanghai'
      }),
    )

    const initialData = { name: 'Bob' }
    stream$.next(initialData)

    expect(modifiedStream$.value).toEqual({ name: 'Bob', age: 30, city: 'Shanghai' })
    expect(initialData).toEqual({ name: 'Bob' })
    expect(stream$.value === modifiedStream$.value).toBeFalsy()
  })

  test('should modify nested objects immutably', () => {
    const stream$ = $()
    const modifiedStream$ = stream$.pipe(
      set((draft) => {
        draft.user.profile.age = 29
        draft.settings.theme = 'light'
      }),
    )

    const initialData = {
      user: { name: 'Carol', profile: { age: 28 } },
      settings: { theme: 'dark' },
    }
    stream$.next(initialData)

    const expectedValue = {
      user: { name: 'Carol', profile: { age: 29 } },
      settings: { theme: 'light' },
    }
    expect(modifiedStream$.value).toEqual(expectedValue)

    // Original nested data should remain unchanged
    expect(initialData.user.profile.age).toBe(28)
    expect(initialData.settings.theme).toBe('dark')

    // Check structural sharing - unchanged parts should share references
    expect(stream$.value === modifiedStream$.value).toBeFalsy()
    expect(stream$.value?.user === modifiedStream$.value?.user).toBeFalsy()
    expect(stream$.value?.user?.name === modifiedStream$.value?.user?.name).toBeTruthy()
    expect(stream$.value?.user?.profile === modifiedStream$.value?.user?.profile).toBeFalsy()
    expect(stream$.value?.settings === modifiedStream$.value?.settings).toBeFalsy()
  })

  test('should modify arrays immutably', () => {
    const stream$ = $()
    const modifiedStream$ = stream$.pipe(
      set((draft) => {
        draft.items.push(4)
        draft.metadata.count = draft.items.length
      }),
    )

    const initialData = { items: [1, 2, 3], metadata: { count: 3 } }
    stream$.next(initialData)

    expect(modifiedStream$.value).toEqual({ items: [1, 2, 3, 4], metadata: { count: 4 } })
    // Original array should remain unchanged
    expect(initialData.items).toEqual([1, 2, 3])
    expect(initialData.metadata.count).toBe(3)
    expect(stream$.value === modifiedStream$.value).toBeFalsy()
  })

  test('should handle primitive values by returning them unchanged', () => {
    const stream$ = $()
    const modifiedStream$ = stream$.pipe(
      set((draft: any) => {
        // This setter will be called but won't affect the primitive value
        draft.newProp = 'test'
      }),
    )

    stream$.next('primitive')
    expect(modifiedStream$.value).toBe('primitive')
    expect(stream$.value === modifiedStream$.value).toBeTruthy()
  })

  test('should handle null and undefined values', () => {
    const stream$ = $()
    const modifiedStream$ = stream$.pipe(
      set((draft: any) => {
        draft.test = 'value'
      }),
    )

    stream$.next(null)
    expect(modifiedStream$.value).toBe(null)

    stream$.next(undefined)
    expect(modifiedStream$.value).toBe(undefined)
  })

  test('should chain multiple set operations', () => {
    const stream$ = $()
    const chainedStream$ = stream$.pipe(
      set((draft) => {
        draft.counter = 1
      }),
      set((draft) => {
        draft.counter += 5
        draft.name = 'Updated'
      }),
    )

    const initialData = { counter: 0, name: 'Test' }
    stream$.next(initialData)

    expect(chainedStream$.value).toEqual({ counter: 6, name: 'Updated' })
    expect(initialData).toEqual({ counter: 0, name: 'Test' })
  })

  test('should work with complex data structures', () => {
    const stream$ = $()
    const modifiedStream$ = stream$.pipe(
      set((draft) => {
        // Add a new user
        draft.users.push({ id: 3, name: 'Charlie', roles: ['user'] })
        // Modify existing user
        draft.users[0].roles.push('moderator')
        // Update config
        draft.config.features.darkMode = true
      }),
    )

    const initialData = {
      users: [
        { id: 1, name: 'Alice', roles: ['user'] },
        { id: 2, name: 'Bob', roles: ['admin'] },
      ],
      config: {
        features: { darkMode: false, notifications: true },
      },
    }
    stream$.next(initialData)

    const expected = {
      users: [
        { id: 1, name: 'Alice', roles: ['user', 'moderator'] },
        { id: 2, name: 'Bob', roles: ['admin'] },
        { id: 3, name: 'Charlie', roles: ['user'] },
      ],
      config: {
        features: { darkMode: true, notifications: true },
      },
    }
    expect(modifiedStream$.value).toEqual(expected)

    // Original should be unchanged
    expect(initialData.users).toHaveLength(2)
    expect(initialData.users[0].roles).toEqual(['user'])
    expect(initialData.config.features.darkMode).toBe(false)
  })

  test('should handle empty objects and arrays', () => {
    const stream$ = $()
    const modifiedStream$ = stream$.pipe(
      set((draft) => {
        draft.empty.newProp = 'added'
        draft.list.push('item')
      }),
    )

    const initialData = { empty: {}, list: [] }
    stream$.next(initialData)

    expect(modifiedStream$.value).toEqual({ empty: { newProp: 'added' }, list: ['item'] })
    expect(initialData).toEqual({ empty: {}, list: [] })
  })

  test('should work with Maps and Sets', () => {
    const stream$ = $()
    const modifiedStream$ = stream$.pipe(
      set((draft) => {
        draft.map.set('key2', 'value2')
        draft.set.add(4)
      }),
    )

    const initialMap = new Map([['key1', 'value1']])
    const initialSet = new Set([1, 2, 3])
    const data = { map: initialMap, set: initialSet }
    stream$.next(data)

    expect(modifiedStream$.value?.map.size).toBe(2)
    expect(modifiedStream$.value?.set.size).toBe(4)
    expect(modifiedStream$.value?.map.get('key2')).toBe('value2')
    expect(modifiedStream$.value?.set.has(4)).toBe(true)

    // Original should be unchanged
    expect(initialMap.size).toBe(1)
    expect(initialSet.size).toBe(3)
  })

  test('should work with initialized stream by triggering with next', () => {
    const stream$ = $()
    const modifiedStream$ = stream$.pipe(
      set((draft) => {
        draft.count = 10
        draft.items.push('c')
      }),
    )

    const initialData = { count: 5, items: ['a', 'b'] }
    // For already initialized streams, we need to trigger with next
    stream$.next(initialData)

    expect(modifiedStream$.value).toEqual({ count: 10, items: ['a', 'b', 'c'] })
    expect(initialData).toEqual({ count: 5, items: ['a', 'b'] })
    expect(stream$.value === modifiedStream$.value).toBeFalsy()
  })
})
