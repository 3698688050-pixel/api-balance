# API 余额

一个悬浮球，点开看 DeepSeek 账户余额。

在线使用：<https://3698688050-pixel.github.io/api-balance/>

## 用法

1. 打开页面，点右下角圆形按钮
2. 填入 DeepSeek API Key，点「保存并查询」
3. 球可以拖到任意位置，位置和 Key 都只存在这台设备的浏览器里

零依赖、零后端：DeepSeek 的 `/user/balance` 放行 CORS，浏览器直接调。

> Key 存在 localStorage，明文保存。公用设备上别存，用完点「清除」。

## 放到 iOS 桌面（Scriptable 小组件）

iOS 不允许第三方 App 在别的 App 上画悬浮球，桌面能做到的是**小组件**：

1. App Store 装 [Scriptable](https://apps.apple.com/app/scriptable/id1405459188)（免费）
2. 打开这个文件全选复制：<https://3698688050-pixel.github.io/api-balance/widget.js>
3. Scriptable → 右上「+」→ 粘贴 → 命名「DeepSeek 余额」
4. **先在 Scriptable 里手动运行一次**，填 API Key（存钥匙串）
5. 长按桌面 → 添加小组件 → Scriptable → 选尺寸 → 长按组件「编辑小组件」→ 选这个脚本

大小两种：小尺寸只显示总额度，中尺寸加一行赠送 / 充值。点组件会打开网页版。

> 刷新由 iOS 调度，通常 15–30 分钟一次，不是实时。等不及就点一下组件跑一次。
