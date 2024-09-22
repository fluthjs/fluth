# Introduction

## Basic Concepts

`fluth` is a stream programming library based on `promise`.

If we consider `promise` as a publisher and the `then` method as a subscriber,

The publishing behavior of `promise` occurs only once. `fluth` enhances `promise`, allowing `promise` to publish continuously!


```javascript
import { Stream } from 'fluth'

const promise$ = new Stream()

promise$.then(
  (r) => console.log('resolve', r),
  (e) => console.log('reject', e),
)

promise$.next(1)
promise$.next(Promise.reject(2))
promise$.next(3)

// Logs:
// resolve 1
// reject 2
// resolve 3
```

Compared to other stream programming libraries, fluth focuses more on process handling in asynchronous scenarios. With `fluth`, you can easily organize asynchronous logic in a stream-like manner, making the code's semantics and timing clearer.

## Applicable Scenarios

The original intention of `fluth` is to solve reactive asynchronous programming problems.

In reactive programming, asynchronous operations often modify reactive data, and business code typically handles asynchronous logic by listening to data changes. However, organizing code by listening to data changes brings two problems: 1. Difficulty in reading, 2. Chaotic timing.

Listening to data lacks semantics and loses context, making code difficult to read. Even simple business code becomes increasingly costly to maintain. The asynchronous process timing in complex businesses is also very complicated, and the method of listening to data changes makes controlling timing difficult.

`promise` can actually solve these two problems well. Handling each step in `then` means there's a line connecting all the logic, and any node can be semantically named, making it very easy to read the code and organize the logic. Since each piece of logic is processed from top to bottom, another benefit of serial processing is simple timing management.

However, `promise` can only execute once and cannot be stopped midway. `fluth` solves these problems of `promise`. You can think of `fluth` as a `promise` stream that can continuously publish data, and any `then` node in the middle can subscribe to upstream data and also unsubscribe.

After adopting `fluth`, the original web-like reactive logic becomes traceable stream logic:

![image](/structure.drawio.png)

## Comparison with rxjs

[rxjs](https://rxjs.dev/) is the current mainstream stream programming library. Compared to `fluth`, there are two obvious differences:

1. `fluth` is very easy to get started with; if you know how to use `promise`, you can use it
2. `rxjs` has more powerful capabilities in data processing, while `fluth` focuses more on observer orchestration:
   - `rxjs` has rich `operators` to implement powerful data processing capabilities, but `observers` are concurrent
   - `fluth` is based on `promise` and is better at orchestrating `observers`


```javascript
// rxjs:
stream$.pipe(operator1).pipe(operator2).pipe(operator3)
stream$.subscribe(observer1)
stream$.subscribe(observer2)
stream$.subscribe(observer3)
```

```javascript
//fluth:
stream$.then(observer1).then(observer2).then(observer3)
stream$.next(1)
```
