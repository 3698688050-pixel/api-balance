# API 余额

一个悬浮球，点开看 DeepSeek 账户余额。

在线使用：<https://3698688050-pixel.github.io/api-balance/>

## 用法

1. 打开页面，点右下角圆形按钮
2. 填入 DeepSeek API Key，点「保存并查询」
3. 球可以拖到任意位置，位置和 Key 都只存在这台设备的浏览器里

零依赖、零后端：DeepSeek 的 `/user/balance` 放行 CORS，浏览器直接调。

> Key 存在 localStorage，明文保存。公用设备上别存，用完点「清除」。
