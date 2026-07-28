/**
 * 全局快捷键管理（支持作用域）
 * 对标飞书/Notion的快捷键体验
 */
import { onMounted, onUnmounted, ref, type Ref } from 'vue'

export interface ShortcutHandler {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  handler: (e: KeyboardEvent) => void
  description?: string
  scope?: string
}

type ShortcutScope = 'global' | 'magazine' | 'diary' | 'tasks' | 'schedule'

const currentScope = ref<ShortcutScope>('global')
const scopeShortcuts = new Map<ShortcutScope, ShortcutHandler[]>()
const registeredShortcuts = new Map<string, ShortcutHandler>()

function ensureScope(scope: ShortcutScope): ShortcutHandler[] {
  if (!scopeShortcuts.has(scope)) {
    scopeShortcuts.set(scope, [])
  }
  return scopeShortcuts.get(scope)!
}

function isInputElement(target: HTMLElement): boolean {
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.contentEditable === 'true' ||
    !!target.closest('.el-input__inner') ||
    !!target.closest('.el-textarea__inner') ||
    !!target.closest('[contenteditable="true"]')
  )
}

function matchShortcut(e: KeyboardEvent, shortcut: ShortcutHandler): boolean {
  const ctrlMatch = shortcut.ctrlKey
    ? e.ctrlKey || e.metaKey
    : !(e.ctrlKey || e.metaKey)
  const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey
  const altMatch = shortcut.altKey ? e.altKey : !e.altKey
  const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
  return ctrlMatch && shiftMatch && altMatch && keyMatch
}

function getShortcutCombo(shortcut: ShortcutHandler): string {
  const parts: string[] = []
  if (shortcut.ctrlKey || shortcut.metaKey) parts.push('Ctrl')
  if (shortcut.shiftKey) parts.push('Shift')
  if (shortcut.altKey) parts.push('Alt')
  parts.push(shortcut.key.toUpperCase())
  return parts.join(' + ')
}

let globalListenerAttached = false

function handleGlobalKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  const isInput = isInputElement(target)

  const scopesToCheck: ShortcutScope[] = ['global']
  if (currentScope.value !== 'global') {
    scopesToCheck.unshift(currentScope.value)
  }

  for (const scope of scopesToCheck) {
    const shortcuts = scopeShortcuts.get(scope) || []
    for (const shortcut of shortcuts) {
      if (matchShortcut(e, shortcut)) {
        if (isInput && !shortcut.ctrlKey && !shortcut.metaKey && shortcut.key !== 'Escape') {
          continue
        }
        e.preventDefault()
        shortcut.handler(e)
        return
      }
    }
  }
}

function ensureGlobalListener() {
  if (!globalListenerAttached) {
    document.addEventListener('keydown', handleGlobalKeyDown)
    globalListenerAttached = true
  }
}

export function setShortcutScope(scope: ShortcutScope) {
  currentScope.value = scope
}

export function getShortcutScope(): ShortcutScope {
  return currentScope.value
}

export function useGlobalShortcuts(
  shortcuts: ShortcutHandler[],
  scope: ShortcutScope = 'global'
) {
  const scopedShortcuts = shortcuts.map(s => ({ ...s, scope }))

  onMounted(() => {
    const list = ensureScope(scope)
    list.push(...scopedShortcuts)
    scopedShortcuts.forEach(s => {
      const combo = getShortcutCombo(s) + '@' + scope
      registeredShortcuts.set(combo, s)
    })
    ensureGlobalListener()
  })

  onUnmounted(() => {
    const list = scopeShortcuts.get(scope)
    if (list) {
      for (const s of scopedShortcuts) {
        const idx = list.indexOf(s)
        if (idx >= 0) list.splice(idx, 1)
      }
    }
    scopedShortcuts.forEach(s => {
      const combo = getShortcutCombo(s) + '@' + scope
      registeredShortcuts.delete(combo)
    })
  })

  return {
    currentScope,
  }
}

export function getRegisteredShortcuts() {
  return Array.from(registeredShortcuts.values())
}

export function getShortcutsByScope(scope: ShortcutScope): ShortcutHandler[] {
  return scopeShortcuts.get(scope) || []
}

export interface ShortcutConfig {
  id: string
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  description: string
  category: string
  scope: ShortcutScope
  enabledInInput?: boolean
  handler: (e: KeyboardEvent) => void
}

let defaultShortcutsList: ShortcutConfig[] = []

export function setDefaultShortcuts(shortcuts: ShortcutConfig[]) {
  defaultShortcutsList = shortcuts
}

export function getDefaultShortcuts(): ShortcutConfig[] {
  return defaultShortcutsList
}

export function openShortcutHelp() {
  const event = new CustomEvent('open-shortcut-help', { bubbles: true, composed: true })
  document.dispatchEvent(event)
}

export function openCommandPalette() {
  const event = new CustomEvent('open-command-palette', { bubbles: true, composed: true })
  document.dispatchEvent(event)
}

export const commandPaletteVisible = ref(false)

export function closeCommandPalette() {
  commandPaletteVisible.value = false
}

export function getAllShortcuts() {
  return defaultShortcutsList
}

export const categoryNames: Record<string, string> = {
  file: '文件',
  edit: '编辑',
  view: '视图',
  navigation: '导航',
  help: '帮助',
}

export const categoryIcons: Record<string, string> = {
  file: '📄',
  edit: '✏️',
  view: '👁️',
  navigation: '📍',
  help: '❓',
}

export function formatShortcutDisplay(shortcut: ShortcutConfig): string {
  const parts: string[] = []
  if (shortcut.ctrlKey || shortcut.metaKey) parts.push('Ctrl')
  if (shortcut.shiftKey) parts.push('Shift')
  if (shortcut.altKey) parts.push('Alt')
  parts.push(shortcut.key.toUpperCase())
  return parts.join(' + ')
}

export interface ShortcutCategory {
  id: string
  name: string
  icon: string
  shortcuts: ShortcutConfig[]
}

export const shortcutHelpVisible = ref(false)

export function closeShortcutHelp() {
  shortcutHelpVisible.value = false
}

export const scopeNames: Record<string, string> = {
  global: '全局',
  magazine: '杂志编辑',
  diary: '日记',
  tasks: '任务',
  schedule: '日程',
}

export function resetAllShortcuts() {
  // 重置逻辑
}
