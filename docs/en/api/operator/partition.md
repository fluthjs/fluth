# partition

Partitions the input [stream](/en/api/index#stream) or [subjection](/en/api/index#subjection) based on a predicate function, returning two streams: the first stream contains values that satisfy the condition, and the second stream contains values that do not satisfy the condition.

![image](/partition.drawio.svg)

- Type

  ```typescript
  type partition: (
    stream$: Stream | Subjection,
    predicate: (this: any, value: any, index: number) => boolean,
    thisArg?: any,
  ) => Stream[];
  ```

- Details

  - Divides the input stream based on the predicate function, returning two streams: the first stream contains values that satisfy the condition, and the second stream contains values that do not satisfy the condition.
  - When the input stream unsubscribes, both returned streams will also unsubscribe.
  - When the input stream [finishes](/en/guide/base#completion), the corresponding returned streams will also finish.
