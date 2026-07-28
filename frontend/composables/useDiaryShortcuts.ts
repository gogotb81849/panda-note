/**
 * 日记编辑器快捷键
 */
import { useGlobalShortcuts, type ShortcutHandler } from './useGlobalShortcuts'

interface DiaryShortcutCallbacks {
  save?: () => void
  prevDay?: () => void
  nextDay?: () => void
  goToToday?: () => void
  toggleBold?: () => void
  insertImage?: () => void
  generateAISummary?: () => void
}

export function useDiaryShortcuts(callbacks: DiaryShortcutCallbacks) {
  const shortcuts: ShortcutHandler[] = [
    {
      key: 's',
      ctrlKey: true,
      description: '保存日记',
      handler: (e) => {
        e.preventDefault()
        callbacks.save?.()
      },
    },
    {
      key: 'ArrowLeft',
      ctrlKey: true,
      description: '上一天',
      handler: (e) => {
        e.preventDefault()
        callbacks.prevDay?.()
      },
    },
    {
      key: 'ArrowRight',
      ctrlKey: true,
      description: '下一天',
      handler: (e) => {
        e.preventDefault()
        callbacks.nextDay?.()
      },
    },
    {
      key: 't',
      ctrlKey: true,
      shiftKey: true,
      description: '回到今天',
      handler: (e) => {
        e.preventDefault()
        callbacks.goToToday?.()
      },
    },
    {
      key: 'b',
      ctrlKey: true,
      description: '加粗',
      handler: (e) => {
        e.preventDefault()
        callbacks.toggleBold?.()
      },
    },
    {
      key: 'i',
      ctrlKey: true,
      shiftKey: true,
      description: '插入图片',
      handler: (e) => {
        e.preventDefault()
        callbacks.insertImage?.()
      },
    },
    {
      key: 'a',
      ctrlKey: true,
      shiftKey: true,
      description: 'AI生成摘要',
      handler: (e) => {
        e.preventDefault()
        callbacks.generateAISummary?.()
      },
    },
  ]

  return useGlobalShortcuts(shortcuts, 'diary')
}
