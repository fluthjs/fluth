# Observable 测试文件拆分说明

本目录包含了 Observable 类的所有测试用例，按照方法功能进行了拆分。

## 文件结构

### 基础观察者方法

- `then.test.ts` - 基础 `then` 方法测试
  - 测试观察者拒绝处理
  - 测试链式 then 拒绝处理
  - 测试无参数的 then 方法

- `thenImmediate.test.ts` - `thenImmediate` 方法测试
  - 测试已解析观察者的立即执行

- `thenOnce.test.ts` - `thenOnce` 方法测试
  - 测试一次性观察者功能

### 错误处理和生命周期

- `catch.test.ts` - `catch` 方法测试
  - 测试错误捕获功能

- `finally.test.ts` - `finally` 方法测试
  - 测试最终处理功能

- `unsubscribe.test.ts` - `unsubscribe` 方法测试
  - 测试观察者取消订阅
  - 测试同步子观察者取消订阅
  - 测试异步子观察者取消订阅
  - 测试待处理观察者取消订阅
  - 测试待处理子观察者取消订阅

### 回调管理

- `afterUnsubscribe.test.ts` - 取消订阅回调管理
  - 测试 `afterUnsubscribe` 方法
  - 测试 `offUnsubscribe` 方法
  - 测试移除不存在的回调

- `afterComplete.test.ts` - 完成回调管理
  - 测试 `afterComplete` 方法
  - 测试 `offComplete` 方法
  - 测试移除不存在的回调
  - 测试拒绝状态的完成回调
  - 测试完成和 then 的执行顺序

### 不可变观察者

- `immutable.test.ts` - 不可变观察者方法测试
  - 测试 `$then` 不可变功能
  - 测试异步 `$then` 功能
  - 测试 `$thenOnce` 功能
  - 测试 `$thenImmediate` 功能

### 工具方法

- `change.test.ts` - `change` 方法测试
  - 测试变化检测功能

- `get.test.ts` - `get` 方法测试
  - 测试获取器功能

- `execute.test.ts` - `execute` 方法测试
  - 测试手动执行功能

### 插件系统

- `plugins.test.ts` - 插件相关方法测试
  - 测试 `use` 方法添加执行插件
  - 测试 `then` 插件功能

## 测试覆盖

所有原始 `observer.test.ts` 文件中的测试用例都已保留并按照功能进行了合理分组。每个测试文件都专注于特定的方法或功能组，使得测试更加模块化和易于维护。

## 运行测试

```bash
# 运行所有 Observable 相关测试
npm test

# 运行特定方法的测试
npm test -- test/observable/then.test.ts
npm test -- test/observable/unsubscribe.test.ts
```

## 注意事项

- 每个测试文件都包含必要的导入和设置
- 所有测试都使用相同的工具函数和模拟设置
- 测试用例的命名和描述保持清晰和一致
