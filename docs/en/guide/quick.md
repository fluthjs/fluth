# Quick Start

## Installation

```bash
pnpm i fluth
```

## 使用

```javascript
import {
  Stream,
  fork,
  finish,
  combine,
  concat,
  merge,
  partition,
  race,
} from 'fluth'

const promise1$ = new Stream()
const promise2$ = new Stream()

const forkPromise$ = fork(promise1$)

const finishPromise$ = finish(promise1$, promise2$)

const combinePromise$ = combine(promise1$, promise2$)

const concatPromise$ = concat(promise1$, promise2$)

const mergePromise$ = merge(promise1$, promise2$)

const [selection$, unSelection$] = partition(
  promise1$,
  (data) => data % 2 === 1,
)

const racePromise$ = race(promise1$, promise2$)
```
