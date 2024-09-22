# merge

Merges the input [streams](/en/api/index#stream) or [subjections](/en/api/index#subjection), returning a new stream.

![image](/merge.drawio.svg)

- Type

  ```typescript
  type merge: (...args: (Stream | Subjection)[]) => Stream;
  ```

- Details

  - Stream merging operation refers to pushing data to the new stream in time order, as long as any input stream pushes data.
  - The new stream will unsubscribe when all input streams are unsubscribed.
  - The new stream will [finish](/en/guide/base#completion) when all input streams have finished.
