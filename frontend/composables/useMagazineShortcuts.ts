/**
 * 杂志编辑器快捷键管理
 * 对标 Notion/飞书的快捷键体验
 */
import { ref, type Ref } from 'vue'
import { useGlobalShortcuts, type ShortcutHandler } from './useGlobalShortcuts'
import type { ShortcutItem } from '~/components/magazine/types'

interface MagazineShortcutCallbacks {
  saveArticle?: () => void
  createArticle?: () => void
  formatText?: (type: string) => void
  addBlock?: (type: string) => void
  convertBlock?: (type: string) => void
  deleteBlock?: () => void
  moveBlockUp?: () => void
  moveBlockDown?: () => void
  showAIPanel?: (type: string) => void
  generateTitle?: () => void
  togglePreview?: () => void
  toggleFullscreen?: () => void
}

const registeredShortcuts = ref<ShortcutItem[]>([])

export function useMagazineShortcuts(
  editor: Ref<HTMLElement | null>,
  callbacks: MagazineShortcutCallbacks
) {
  const shortcuts: ShortcutHandler[] = [
    {
      key: 's',
      ctrlKey: true,
      description: '保存',
      handler: (e) => {
        e.preventDefault()
        callbacks.saveArticle?.()
      },
    },
    {
      key: 'n',
      ctrlKey: true,
      description: '新建文章',
      handler: (e) => {
        e.preventDefault()
        callbacks.createArticle?.()
      },
    },
    {
      key: 'b',
      ctrlKey: true,
      description: '加粗',
      handler: (e) => {
        e.preventDefault()
        callbacks.formatText?.('bold')
      },
    },
    {
      key: 'i',
      ctrlKey: true,
      description: '斜体',
      handler: (e) => {
        e.preventDefault()
        callbacks.formatText?.('italic')
      },
    },
    {
      key: 'u',
      ctrlKey: true,
      description: '下划线',
      handler: (e) => {
        e.preventDefault()
        callbacks.formatText?.('underline')
      },
    },
    {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
      description: '删除线',
      handler: (e) => {
        e.preventDefault()
        callbacks.formatText?.('strikeThrough')
      },
    },
    {
      key: 'Enter',
      ctrlKey: true,
      description: '新建块',
      handler: (e) => {
        e.preventDefault()
        callbacks.addBlock?.('paragraph')
      },
    },
    {
      key: 'h',
      ctrlKey: true,
      shiftKey: true,
      description: '转标题',
      handler: (e) => {
        e.preventDefault()
        callbacks.convertBlock?.('heading')
      },
    },
    {
      key: 'q',
      ctrlKey: true,
      shiftKey: true,
      description: '转引用',
      handler: (e) => {
        e.preventDefault()
        callbacks.convertBlock?.('quote')
      },
    },
    {
      key: 'ArrowUp',
      ctrlKey: true,
      description: '上移块',
      handler: (e) => {
        e.preventDefault()
        callbacks.moveBlockUp?.()
      },
    },
    {
      key: 'ArrowDown',
      ctrlKey: true,
      description: '下移块',
      handler: (e) => {
        e.preventDefault()
        callbacks.moveBlockDown?.()
      },
    },
    {
      key: 'Delete',
      ctrlKey: true,
      shiftKey: true,
      description: '删除块',
      handler: (e) => {
        e.preventDefault()
        callbacks.deleteBlock?.()
      },
    },
    {
      key: 'p',
      ctrlKey: true,
      shiftKey: true,
      description: 'AI润色',
      handler: (e) => {
        e.preventDefault()
        callbacks.showAIPanel?.('polish')
      },
    },
    {
      key: 'e',
      ctrlKey: true,
      shiftKey: true,
      description: 'AI扩写',
      handler: (e) => {
        e.preventDefault()
        callbacks.showAIPanel?.('expand')
      },
    },
    {
      key: 'c',
      ctrlKey: true,
      shiftKey: true,
      description: 'AI缩写',
      handler: (e) => {
        e.preventDefault()
        callbacks.showAIPanel?.('condense')
      },
    },
    {
      key: 't',
      ctrlKey: true,
      shiftKey: true,
      description: '生成标题',
      handler: (e) => {
        e.preventDefault()
        callbacks.generateTitle?.()
      },
    },
    {
      key: 'v',
      ctrlKey: true,
      shiftKey: true,
      description: '预览',
      handler: (e) => {
        e.preventDefault()
        callbacks.togglePreview?.()
      },
    },
    {
      key: 'F11',
      description: '全屏',
      handler: (e) => {
        e.preventDefault()
        callbacks.toggleFullscreen?.()
      },
    },
  ]

  const registerShortcuts = () => {
    const categoryMap: Record<string, string> = {
      '保存': 'file',
      '新建文章': 'file',
      '加粗': 'format',
      '斜体': 'format',
      '下划线': 'format',
      '删除线': 'format',
      '新建块': 'block',
      '转标题': 'block',
      '转引用': 'block',
      '上移块': 'block',
      '下移块': 'block',
      '删除块': 'block',
      'AI润色': 'ai',
      'AI扩写': 'ai',
      'AI缩写': 'ai',
      '生成标题': 'ai',
      '预览': 'view',
      '全屏': 'view',
    }

    const items: ShortcutItem[] = shortcuts.map(s => {
      const keys: string[] = []
      if (s.ctrlKey) keys.push('Ctrl')
      if (s.shiftKey) keys.push('Shift')
      if (s.altKey) keys.push('Alt')
      keys.push(s.key.toUpperCase())

      return {
        keys,
        description: s.description || '',
        category: (categoryMap[s.description || ''] || 'navigation') as any,
      }
    })

    registeredShortcuts.value = items
  }

  registerShortcuts()

  return {
    ...useGlobalShortcuts(shortcuts, 'magazine'),
    shortcuts: registeredShortcuts,
  }
}

export function getMagazineShortcuts(): ShortcutItem[] {
  return registeredShortcuts.value
}

export function formatShortcut(keys: string[]): string {
  return keys.join(' + ')
}

export const categoryNames: Record<string, string> = {
  file: '文件操作',
  format: '格式操作',
  block: '块操作',
  ai: 'AI操作',
  view: '视图操作',
  navigation: '导航操作',
}
