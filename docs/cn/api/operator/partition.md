# partition

将输入的[ stream ](/cn/api/index#stream)或者[ subjection ](/cn/api/index#subjection)按照条件函数进行分区，返回两个流，第一个是满足条件的流，第二个是不满足条件的流

![image](/partition.drawio.svg)

- 类型

  ```typescript
  type partition: (
    stream$: Stream | Subjection,
    predicate: (this: any, value: any, index: number) => boolean,
    thisArg?: any,
  ) => Stream[];
  ```

- 详情

  - 将输入的流按照条件函数进行区分，返回两个流：第一个是满足条件的流，第二个是不满足条件的流
  - 输入的流取消订阅后，两个返回的流也会取消订阅
  - 输入的流[ 结束 ](/cn/guide/base#结束)后，对应返回的流也会结束
