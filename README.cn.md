# Fluth

<div align="center">
  <img src="https://fluthjs.github.io/fluth-doc/logo.svg" alt="fluth-vue logo" width="120" height="120">

  <p style="margin-top: 20px;">类 Promise 的响应式流</p>
</div>

<div align="center">

[![codecov](https://img.shields.io/codecov/c/github/fluthjs/fluth?style=flat)](https://codecov.io/gh/fluthjs/fluth)
[![MIT License](https://img.shields.io/badge/license-MIT-green.svg?style=flat)](https://github.com/fluthjs/fluth/blob/master/LICENSE)
[![npm version](https://img.shields.io/npm/v/fluth.svg?style=flat)](https://www.npmjs.com/package/fluth)
[![npm downloads](https://img.shields.io/npm/dm/fluth.svg?style=flat)](https://www.npmjs.com/package/fluth)
[![GitHub stars](https://img.shields.io/github/stars/fluthjs/fluth?style=flat)](https://github.com/fluthjs/fluth/stargazers)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/fluthjs/fluth)

<div align="center">

[官方文档](https://fluthjs.github.io/fluth-doc/index.html)

</div>

<div align="center">

[English](./README.md) | [中文](./README.cn.md)

</div>

</div>

## 🚀 特性

- **🤞 简单易用** 类 promise 的流式数据处理，支持链式调用
- **🔄 响应式编程**：基于 Observable 模式的流式数据处理
- **⚡ 异步控制**：强大的 Promise-like 异步流控制能力
- **🛠️ 丰富操作符**：提供丰富数据变换和组合操作符
- **🔌 插件系统**：可扩展的插件机制，支持调试和打印
- **💾 不可变操作**：基于 limu 的不可变数据修改
- **🎯 TypeScript**：完全类型安全，提供流畅的开发体验

## 📦 安装

```bash
# npm
npm install fluth

# yarn
yarn add fluth

# pnpm
pnpm add fluth
```

## 快速开始

```typescript
import { $ } from 'fluth'

// 创建一个流
const stream$ = $()

// 监听数据变化
stream$.then((value) => {
  console.log('接收到数据:', value)
})

// 发送数据
stream$.next('Hello Fluth!')
```
