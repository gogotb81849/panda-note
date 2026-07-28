# 前端样式布局说明文档

## 一、政委视图表头布局问题（2026-07-12 解决）

### 1. 问题描述

政委视图的表头区域（天气、海况、出发港、目的港、航次等）存在以下问题：
- 下拉框、日期选择器、文本框的**宽度和高度不一致**
- 文字大小不统一
- 三行内容上下没有对齐

### 2. 根本原因

#### 原因一：Element Plus 3.x 组件内部结构差异

**最关键的问题**：Element Plus 3.x 中，`el-select` 和 `el-input`/`el-date-picker` 使用了**不同的内部 wrapper 类名**：

| 组件 | 内部 wrapper 类名 | 说明 |
|------|-------------------|------|
| `el-select` | `.el-select__wrapper` | 3.x 新版结构 |
| `el-input` | `.el-input__wrapper` | 旧版结构 |
| `el-date-picker` | `.el-input__wrapper` | 内部使用 el-input |

之前的 CSS 只覆盖了 `.el-input__wrapper`，没有覆盖 `.el-select__wrapper`，导致 el-select 的宽度、高度和字体大小与其他组件不一致。

**教训**：在覆盖 Element Plus 组件样式时，必须检查每个组件的实际 DOM 结构和 CSS 类名，不能假设所有组件使用相同的内部结构。

#### 原因二：scoped 样式与全局样式的优先级冲突

`schedule.vue` 的 scoped 样式中，`.header-extra-fields` 使用了 `display: flex`，与 `default.vue` 全局样式中设置的 `display: grid` 冲突。

- scoped 样式编译后为 `.header-extra-fields[data-v-xxxx]`，特异性 (0, 2, 0)
- 全局样式为 `.device-tablet.orientation-portrait .schedule-page .header-extra-fields`，特异性 (0, 4, 0)

虽然全局样式特异性更高，但如果 `.device-tablet.orientation-portrait` class 未正确添加到 `<html>`，全局规则将完全不匹配。

**教训**：在 schedule.vue 的 scoped 样式中不要重复添加媒体查询样式，避免与 default.vue 全局样式冲突。统一在 default.vue 全局样式中管理平板布局。

#### 原因三：平板模拟模式下设备 class 未同步

桌面浏览器使用"平板模拟模式"时，`useDeviceDetection` 检测到的是桌面浏览器，`<html>` 上的 class 是 `device-desktop`，导致 `.device-tablet.orientation-portrait` 选择器不生效。

**修复**：在 `default.vue` 中添加 watch，平板模拟模式开启时同步添加设备 class：
```javascript
watch([isTabletMode, tabletOrientation], ([tabletMode, orient]) => {
  if (!process.client) return
  const root = document.documentElement
  if (tabletMode) {
    root.classList.remove('device-desktop', 'device-phone')
    root.classList.add('device-tablet')
    root.classList.remove('orientation-landscape', 'orientation-portrait')
    root.classList.add(`orientation-${orient}`)
  }
}, { immediate: true })
```

### 3. 最终布局规范

#### 表头区域结构（header-extra-fields）

- **布局**：4列 CSS Grid（`grid-template-columns: repeat(4, 1fr)`）
- **行顺序**：
  - 第一行：出发港、出发时间、目的港、抵达时间
  - 第二行：天气、海况、动态、时区
  - 第三行：航次、防海盗区、战区、铅封作业
  - 最后一行：航行时间进度条（跨整行 `grid-column: 1 / -1`）

#### 统一样式规范

| 属性 | 值 | 适用元素 |
|------|-----|---------|
| 标签宽度 | `56px`（`flex: 0 0 56px`） | `.field-label` |
| 标签对齐 | `text-align: right` | `.field-label` |
| 标签字体 | `11px` | `.field-label` |
| 输入框高度 | `32px` | 所有 `.el-input__wrapper` 和 `.el-select__wrapper` |
| 输入框字体 | `12px` | 所有 `.el-input__inner` 和 `.el-select` 内部文字 |
| 输入框宽度 | `100%`（`flex: 1`） | 所有 el-select/el-input/el-date-picker/el-switch |
| field-item 高度 | `40px` | `.field-item` |

#### 关键 CSS 选择器

```css
/* el-select 使用 el-select__wrapper */
.device-tablet.orientation-portrait .schedule-page .field-item .el-select .el-select__wrapper {
  height: 32px !important;
  min-height: 32px !important;
  padding: 0 8px !important;
  width: 100% !important;
  box-sizing: border-box !important;
  font-size: 12px !important;
}

/* el-input 和 el-date-picker 使用 el-input__wrapper */
.device-tablet.orientation-portrait .schedule-page .field-item .el-input .el-input__wrapper,
.device-tablet.orientation-portrait .schedule-page .field-item .el-date-editor .el-input__wrapper {
  height: 32px !important;
  padding: 0 8px !important;
  width: 100% !important;
  box-sizing: border-box !important;
}
```

### 4. 相关文件

- `layouts/default.vue` — 全局平板竖屏样式（`<style>` 非 scoped 区域，约第 2188 行起）
- `pages/schedule.vue` — 日程页面 HTML 模板和 scoped 样式
- `composables/useDeviceDetection.ts` — 设备类型和方向检测

### 5. 注意事项

1. **不要在 schedule.vue 的 scoped 样式中重复添加平板竖屏媒体查询**，统一在 default.vue 全局样式管理
2. **覆盖 Element Plus 组件样式时**，必须检查实际的 DOM 结构，el-select 用 `.el-select__wrapper`，el-input 用 `.el-input__wrapper`
3. **平板模拟模式**下需要手动同步设备 class 到 `<html>` 元素
4. **用户测试环境是真实平板**（华为 MatePad Mini），不是桌面浏览器模拟

---

## 二、时区选项说明（2026-07-12 更新）

### 问题描述

之前的时区选项只列出了整点时区（UTC+8, UTC+7...UTC-8），缺少真实的半时区。

### 修复内容

时区选项改为完整的国际时区列表，包含所有半时区：

- UTC+14 到 UTC-12
- 包含半时区：UTC+10:30, UTC+9:30, UTC+8:45, UTC+6:30, UTC+5:45, UTC+5:30, UTC+4:30, UTC+3:30, UTC-3:30, UTC-9:30
- 添加了 `filterable` 属性，方便搜索

### 真实时区对照

| 时区 | 地区 |
|------|------|
| UTC+5:30 | 印度、斯里兰卡 |
| UTC+5:45 | 尼泊尔 |
| UTC+6:30 | 缅甸 |
| UTC+9:30 | 澳大利亚中部 |
| UTC+10:30 | 澳大利亚豪勋爵岛 |
| UTC+3:30 | 伊朗 |
| UTC+4:30 | 阿富汗 |
| UTC-3:30 | 纽芬兰（加拿大） |
| UTC-9:30 | 马克萨斯群岛 |
| UTC+8:45 | 尤克拉（澳大利亚） |
