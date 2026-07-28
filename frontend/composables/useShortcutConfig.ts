export interface ShortcutItem {
  id: string
  name: string
  description: string
  category: string
  scope: string
  defaultKeys: string
  currentKeys: string
  enabled: boolean
}

export interface ShortcutCategory {
  id: string
  name: string
  icon: string
}

const STORAGE_KEY = 'shortcut_config'

const defaultCategories: ShortcutCategory[] = [
  { id: 'file', name: '文件操作', icon: '📄' },
  { id: 'edit', name: '编辑操作', icon: '✏️' },
  { id: 'format', name: '格式操作', icon: '🎨' },
  { id: 'navigation', name: '导航操作', icon: '🧭' },
  { id: 'ai', name: 'AI 操作', icon: '🤖' },
  { id: 'help', name: '帮助与设置', icon: '❓' },
]

const defaultShortcuts: ShortcutItem[] = [
  {
    id: 'file.new',
    name: '新建文件',
    description: '创建一个新的文件或文档',
    category: 'file',
    scope: '全局',
    defaultKeys: 'Ctrl + N',
    currentKeys: 'Ctrl + N',
    enabled: true,
  },
  {
    id: 'file.save',
    name: '保存',
    description: '保存当前文件或内容',
    category: 'file',
    scope: '全局',
    defaultKeys: 'Ctrl + S',
    currentKeys: 'Ctrl + S',
    enabled: true,
  },
  {
    id: 'file.saveAs',
    name: '另存为',
    description: '将当前内容另存为新文件',
    category: 'file',
    scope: '全局',
    defaultKeys: 'Ctrl + Shift + S',
    currentKeys: 'Ctrl + Shift + S',
    enabled: true,
  },
  {
    id: 'file.open',
    name: '打开文件',
    description: '打开已有文件',
    category: 'file',
    scope: '全局',
    defaultKeys: 'Ctrl + O',
    currentKeys: 'Ctrl + O',
    enabled: true,
  },
  {
    id: 'file.print',
    name: '打印',
    description: '打印当前页面或内容',
    category: 'file',
    scope: '全局',
    defaultKeys: 'Ctrl + P',
    currentKeys: 'Ctrl + P',
    enabled: true,
  },
  {
    id: 'edit.undo',
    name: '撤销',
    description: '撤销上一步操作',
    category: 'edit',
    scope: '全局',
    defaultKeys: 'Ctrl + Z',
    currentKeys: 'Ctrl + Z',
    enabled: true,
  },
  {
    id: 'edit.redo',
    name: '重做',
    description: '重做上一步撤销的操作',
    category: 'edit',
    scope: '全局',
    defaultKeys: 'Ctrl + Shift + Z',
    currentKeys: 'Ctrl + Shift + Z',
    enabled: true,
  },
  {
    id: 'edit.cut',
    name: '剪切',
    description: '剪切选中内容',
    category: 'edit',
    scope: '全局',
    defaultKeys: 'Ctrl + X',
    currentKeys: 'Ctrl + X',
    enabled: true,
  },
  {
    id: 'edit.copy',
    name: '复制',
    description: '复制选中内容',
    category: 'edit',
    scope: '全局',
    defaultKeys: 'Ctrl + C',
    currentKeys: 'Ctrl + C',
    enabled: true,
  },
  {
    id: 'edit.paste',
    name: '粘贴',
    description: '粘贴剪贴板内容',
    category: 'edit',
    scope: '全局',
    defaultKeys: 'Ctrl + V',
    currentKeys: 'Ctrl + V',
    enabled: true,
  },
  {
    id: 'edit.selectAll',
    name: '全选',
    description: '选中所有内容',
    category: 'edit',
    scope: '全局',
    defaultKeys: 'Ctrl + A',
    currentKeys: 'Ctrl + A',
    enabled: true,
  },
  {
    id: 'edit.find',
    name: '查找',
    description: '在当前页面查找内容',
    category: 'edit',
    scope: '全局',
    defaultKeys: 'Ctrl + F',
    currentKeys: 'Ctrl + F',
    enabled: true,
  },
  {
    id: 'edit.replace',
    name: '替换',
    description: '查找并替换内容',
    category: 'edit',
    scope: '编辑器',
    defaultKeys: 'Ctrl + H',
    currentKeys: 'Ctrl + H',
    enabled: true,
  },
  {
    id: 'format.bold',
    name: '加粗',
    description: '将选中文字设置为粗体',
    category: 'format',
    scope: '编辑器',
    defaultKeys: 'Ctrl + B',
    currentKeys: 'Ctrl + B',
    enabled: true,
  },
  {
    id: 'format.italic',
    name: '斜体',
    description: '将选中文字设置为斜体',
    category: 'format',
    scope: '编辑器',
    defaultKeys: 'Ctrl + I',
    currentKeys: 'Ctrl + I',
    enabled: true,
  },
  {
    id: 'format.underline',
    name: '下划线',
    description: '为选中文字添加下划线',
    category: 'format',
    scope: '编辑器',
    defaultKeys: 'Ctrl + U',
    currentKeys: 'Ctrl + U',
    enabled: true,
  },
  {
    id: 'format.strikethrough',
    name: '删除线',
    description: '为选中文字添加删除线',
    category: 'format',
    scope: '编辑器',
    defaultKeys: 'Ctrl + Shift + S',
    currentKeys: 'Ctrl + Shift + S',
    enabled: false,
  },
  {
    id: 'format.heading1',
    name: '一级标题',
    description: '将当前行设置为一级标题',
    category: 'format',
    scope: '编辑器',
    defaultKeys: 'Ctrl + 1',
    currentKeys: 'Ctrl + 1',
    enabled: true,
  },
  {
    id: 'format.heading2',
    name: '二级标题',
    description: '将当前行设置为二级标题',
    category: 'format',
    scope: '编辑器',
    defaultKeys: 'Ctrl + 2',
    currentKeys: 'Ctrl + 2',
    enabled: true,
  },
  {
    id: 'format.heading3',
    name: '三级标题',
    description: '将当前行设置为三级标题',
    category: 'format',
    scope: '编辑器',
    defaultKeys: 'Ctrl + 3',
    currentKeys: 'Ctrl + 3',
    enabled: true,
  },
  {
    id: 'format.bulletList',
    name: '无序列表',
    description: '插入无序列表',
    category: 'format',
    scope: '编辑器',
    defaultKeys: 'Ctrl + Shift + 8',
    currentKeys: 'Ctrl + Shift + 8',
    enabled: true,
  },
  {
    id: 'format.numberedList',
    name: '有序列表',
    description: '插入有序列表',
    category: 'format',
    scope: '编辑器',
    defaultKeys: 'Ctrl + Shift + 7',
    currentKeys: 'Ctrl + Shift + 7',
    enabled: true,
  },
  {
    id: 'format.quote',
    name: '引用',
    description: '插入引用块',
    category: 'format',
    scope: '编辑器',
    defaultKeys: 'Ctrl + Shift + .',
    currentKeys: 'Ctrl + Shift + .',
    enabled: true,
  },
  {
    id: 'format.code',
    name: '代码',
    description: '插入代码块或行内代码',
    category: 'format',
    scope: '编辑器',
    defaultKeys: 'Ctrl + Shift + C',
    currentKeys: 'Ctrl + Shift + C',
    enabled: true,
  },
  {
    id: 'nav.search',
    name: '全局搜索',
    description: '打开全局搜索面板',
    category: 'navigation',
    scope: '全局',
    defaultKeys: 'Ctrl + K',
    currentKeys: 'Ctrl + K',
    enabled: true,
  },
  {
    id: 'nav.commandPalette',
    name: '命令面板',
    description: '打开命令面板',
    category: 'navigation',
    scope: '全局',
    defaultKeys: 'Ctrl + Shift + P',
    currentKeys: 'Ctrl + Shift + P',
    enabled: true,
  },
  {
    id: 'nav.gotoDashboard',
    name: '前往工作台',
    description: '跳转到工作台页面',
    category: 'navigation',
    scope: '全局',
    defaultKeys: 'Alt + 1',
    currentKeys: 'Alt + 1',
    enabled: true,
  },
  {
    id: 'nav.gotoTasks',
    name: '前往任务',
    description: '跳转到工作任务页面',
    category: 'navigation',
    scope: '全局',
    defaultKeys: 'Alt + 2',
    currentKeys: 'Alt + 2',
    enabled: true,
  },
  {
    id: 'nav.gotoFiles',
    name: '前往文件',
    description: '跳转到共享文件页面',
    category: 'navigation',
    scope: '全局',
    defaultKeys: 'Alt + 3',
    currentKeys: 'Alt + 3',
    enabled: true,
  },
  {
    id: 'nav.back',
    name: '后退',
    description: '返回上一页',
    category: 'navigation',
    scope: '全局',
    defaultKeys: 'Alt + ArrowLeft',
    currentKeys: 'Alt + ArrowLeft',
    enabled: true,
  },
  {
    id: 'nav.forward',
    name: '前进',
    description: '前进到下一页',
    category: 'navigation',
    scope: '全局',
    defaultKeys: 'Alt + ArrowRight',
    currentKeys: 'Alt + ArrowRight',
    enabled: true,
  },
  {
    id: 'nav.toggleSidebar',
    name: '切换侧边栏',
    description: '显示或隐藏侧边栏',
    category: 'navigation',
    scope: '全局',
    defaultKeys: 'Ctrl + \\',
    currentKeys: 'Ctrl + \\',
    enabled: true,
  },
  {
    id: 'ai.polish',
    name: 'AI 润色',
    description: '使用 AI 润色选中的文字',
    category: 'ai',
    scope: '编辑器',
    defaultKeys: 'Ctrl + Shift + P',
    currentKeys: 'Ctrl + Shift + P',
    enabled: true,
  },
  {
    id: 'ai.expand',
    name: 'AI 扩写',
    description: '使用 AI 扩展内容',
    category: 'ai',
    scope: '编辑器',
    defaultKeys: 'Ctrl + Shift + E',
    currentKeys: 'Ctrl + Shift + E',
    enabled: true,
  },
  {
    id: 'ai.condense',
    name: 'AI 缩写',
    description: '使用 AI 精简内容',
    category: 'ai',
    scope: '编辑器',
    defaultKeys: 'Ctrl + Shift + C',
    currentKeys: 'Ctrl + Shift + C',
    enabled: true,
  },
  {
    id: 'ai.translate',
    name: 'AI 翻译',
    description: '使用 AI 翻译选中内容',
    category: 'ai',
    scope: '编辑器',
    defaultKeys: 'Ctrl + Shift + T',
    currentKeys: 'Ctrl + Shift + T',
    enabled: true,
  },
  {
    id: 'ai.summary',
    name: 'AI 总结',
    description: '使用 AI 总结内容',
    category: 'ai',
    scope: '编辑器',
    defaultKeys: 'Ctrl + Shift + M',
    currentKeys: 'Ctrl + Shift + M',
    enabled: true,
  },
  {
    id: 'help.shortcuts',
    name: '快捷键帮助',
    description: '显示快捷键帮助面板',
    category: 'help',
    scope: '全局',
    defaultKeys: 'Ctrl + Shift + /',
    currentKeys: 'Ctrl + Shift + /',
    enabled: true,
  },
  {
    id: 'help.settings',
    name: '打开设置',
    description: '打开系统设置页面',
    category: 'help',
    scope: '全局',
    defaultKeys: 'Ctrl + ,',
    currentKeys: 'Ctrl + ,',
    enabled: true,
  },
  {
    id: 'help.feedback',
    name: '意见反馈',
    description: '提交意见反馈',
    category: 'help',
    scope: '全局',
    defaultKeys: 'Alt + Shift + F',
    currentKeys: 'Alt + Shift + F',
    enabled: true,
  },
  {
    id: 'help.about',
    name: '关于',
    description: '查看关于信息',
    category: 'help',
    scope: '全局',
    defaultKeys: 'F1',
    currentKeys: 'F1',
    enabled: true,
  },
  {
    id: 'help.esc',
    name: '关闭弹窗',
    description: '关闭当前打开的弹窗或面板',
    category: 'help',
    scope: '全局',
    defaultKeys: 'Escape',
    currentKeys: 'Escape',
    enabled: true,
  },
]

export function useShortcutConfig() {
  const shortcuts = ref<ShortcutItem[]>([])
  const categories = ref<ShortcutCategory[]>(defaultCategories)

  const loadShortcuts = () => {
    if (process.server) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const storedData = JSON.parse(stored)
        shortcuts.value = storedData.map((s: ShortcutItem) => {
          const defaultShortcut = defaultShortcuts.find(d => d.id === s.id)
          return {
            ...defaultShortcut,
            ...s,
            defaultKeys: defaultShortcut?.defaultKeys || s.defaultKeys,
          }
        })
      } else {
        shortcuts.value = JSON.parse(JSON.stringify(defaultShortcuts))
      }
    } catch {
      shortcuts.value = JSON.parse(JSON.stringify(defaultShortcuts))
    }
  }

  const saveShortcuts = () => {
    if (process.server) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts.value))
    } catch (e) {
      console.error('保存快捷键配置失败:', e)
    }
  }

  const getShortcutById = (id: string): ShortcutItem | undefined => {
    return shortcuts.value.find(s => s.id === id)
  }

  const getShortcutsByCategory = (categoryId: string): ShortcutItem[] => {
    return shortcuts.value.filter(s => s.category === categoryId)
  }

  const updateShortcut = (id: string, keys: string): { success: boolean; conflict?: ShortcutItem } => {
    const shortcut = shortcuts.value.find(s => s.id === id)
    if (!shortcut) return { success: false }

    const normalizedKeys = normalizeKeys(keys)

    const conflict = shortcuts.value.find(
      s => s.id !== id &&
           s.enabled &&
           s.scope === shortcut.scope &&
           normalizeKeys(s.currentKeys) === normalizedKeys
    )

    if (conflict) {
      return { success: false, conflict }
    }

    shortcut.currentKeys = keys
    saveShortcuts()
    return { success: true }
  }

  const forceUpdateShortcut = (id: string, keys: string) => {
    const shortcut = shortcuts.value.find(s => s.id === id)
    if (!shortcut) return

    const normalizedKeys = normalizeKeys(keys)
    const conflictingShortcut = shortcuts.value.find(
      s => s.id !== id &&
           s.enabled &&
           s.scope === shortcut.scope &&
           normalizeKeys(s.currentKeys) === normalizedKeys
    )

    if (conflictingShortcut) {
      conflictingShortcut.currentKeys = ''
      conflictingShortcut.enabled = false
    }

    shortcut.currentKeys = keys
    shortcut.enabled = true
    saveShortcuts()
  }

  const clearShortcut = (id: string) => {
    const shortcut = shortcuts.value.find(s => s.id === id)
    if (shortcut) {
      shortcut.currentKeys = ''
      shortcut.enabled = false
      saveShortcuts()
    }
  }

  const toggleShortcut = (id: string, enabled: boolean) => {
    const shortcut = shortcuts.value.find(s => s.id === id)
    if (shortcut) {
      shortcut.enabled = enabled
      if (enabled && !shortcut.currentKeys) {
        shortcut.currentKeys = shortcut.defaultKeys
      }
      saveShortcuts()
    }
  }

  const resetToDefault = (id?: string) => {
    if (id) {
      const shortcut = shortcuts.value.find(s => s.id === id)
      const defaultShortcut = defaultShortcuts.find(d => d.id === id)
      if (shortcut && defaultShortcut) {
        shortcut.currentKeys = defaultShortcut.defaultKeys
        shortcut.enabled = defaultShortcut.enabled
      }
    } else {
      shortcuts.value = JSON.parse(JSON.stringify(defaultShortcuts))
    }
    saveShortcuts()
  }

  const resetAllToDefault = () => {
    shortcuts.value = JSON.parse(JSON.stringify(defaultShortcuts))
    saveShortcuts()
  }

  const exportShortcuts = (): string => {
    return JSON.stringify(shortcuts.value, null, 2)
  }

  const importShortcuts = (data: string): boolean => {
    try {
      const imported = JSON.parse(data)
      if (!Array.isArray(imported)) return false

      imported.forEach(item => {
        const existing = shortcuts.value.find(s => s.id === item.id)
        if (existing) {
          existing.currentKeys = item.currentKeys
          existing.enabled = item.enabled
        }
      })

      saveShortcuts()
      return true
    } catch {
      return false
    }
  }

  const checkConflict = (id: string, keys: string, scope: string): ShortcutItem | undefined => {
    const normalizedKeys = normalizeKeys(keys)
    return shortcuts.value.find(
      s => s.id !== id &&
           s.enabled &&
           s.scope === scope &&
           normalizeKeys(s.currentKeys) === normalizedKeys
    )
  }

  const normalizeKeys = (keys: string): string => {
    if (!keys) return ''
    const parts = keys.split('+').map(k => k.trim().toLowerCase())
    const modifiers: string[] = []
    let mainKey = ''

    parts.forEach(part => {
      if (['ctrl', 'control', 'meta', 'command', 'cmd', 'windows', 'win'].includes(part)) {
        if (!modifiers.includes('ctrl')) modifiers.push('ctrl')
      } else if (['shift'].includes(part)) {
        if (!modifiers.includes('shift')) modifiers.push('shift')
      } else if (['alt', 'option', 'opt'].includes(part)) {
        if (!modifiers.includes('alt')) modifiers.push('alt')
      } else {
        mainKey = part
      }
    })

    modifiers.sort()
    return [...modifiers, mainKey].join('+')
  }

  const keysMatch = (e: KeyboardEvent, shortcut: ShortcutItem): boolean => {
    if (!shortcut.enabled || !shortcut.currentKeys) return false

    const normalized = normalizeKeys(shortcut.currentKeys)
    const parts = normalized.split('+')

    const hasCtrl = parts.includes('ctrl')
    const hasShift = parts.includes('shift')
    const hasAlt = parts.includes('alt')
    const mainKey = parts.filter(p => !['ctrl', 'shift', 'alt'].includes(p)).join('+')

    const ctrlMatch = hasCtrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey)
    const shiftMatch = hasShift ? e.shiftKey : !e.shiftKey
    const altMatch = hasAlt ? e.altKey : !e.altKey
    const keyMatch = e.key.toLowerCase() === mainKey.toLowerCase()

    return ctrlMatch && shiftMatch && altMatch && keyMatch
  }

  const findShortcutByEvent = (e: KeyboardEvent, scope?: string): ShortcutItem | undefined => {
    return shortcuts.value.find(s => {
      if (!s.enabled || !s.currentKeys) return false
      if (scope && s.scope !== scope && s.scope !== '全局') return false
      return keysMatch(e, s)
    })
  }

  const formatKeyDisplay = (keys: string): string => {
    if (!keys) return '未设置'
    return keys
      .split('+')
      .map(k => {
        const key = k.trim()
        const keyMap: Record<string, string> = {
          'ctrl': 'Ctrl',
          'control': 'Ctrl',
          'meta': 'Cmd',
          'command': 'Cmd',
          'cmd': 'Cmd',
          'shift': 'Shift',
          'alt': 'Alt',
          'option': 'Alt',
          'escape': 'Esc',
          'arrowup': '↑',
          'arrowdown': '↓',
          'arrowleft': '←',
          'arrowright': '→',
          'enter': 'Enter',
          'backspace': '⌫',
          'delete': 'Del',
          'tab': 'Tab',
          ' ': 'Space',
        }
        return keyMap[key.toLowerCase()] || key.toUpperCase()
      })
      .join(' + ')
  }

  const eventToKeys = (e: KeyboardEvent): string => {
    const parts: string[] = []
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
    if (e.shiftKey) parts.push('Shift')
    if (e.altKey) parts.push('Alt')

    const keyMap: Record<string, string> = {
      ' ': 'Space',
      'ArrowUp': 'ArrowUp',
      'ArrowDown': 'ArrowDown',
      'ArrowLeft': 'ArrowLeft',
      'ArrowRight': 'ArrowRight',
      'Escape': 'Escape',
      'Enter': 'Enter',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
      'Tab': 'Tab',
    }

    const key = keyMap[e.key] || e.key
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
      parts.push(key)
    }

    return parts.join(' + ')
  }

  loadShortcuts()

  return {
    shortcuts,
    categories,
    loadShortcuts,
    getShortcutById,
    getShortcutsByCategory,
    updateShortcut,
    forceUpdateShortcut,
    clearShortcut,
    toggleShortcut,
    resetToDefault,
    resetAllToDefault,
    exportShortcuts,
    importShortcuts,
    checkConflict,
    keysMatch,
    findShortcutByEvent,
    formatKeyDisplay,
    eventToKeys,
  }
}
