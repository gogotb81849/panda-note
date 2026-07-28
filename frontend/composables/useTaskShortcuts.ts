/**
 * 任务模块快捷键
 */
import { useGlobalShortcuts, type ShortcutHandler } from './useGlobalShortcuts'

interface TaskShortcutCallbacks {
  createTask?: () => void
  searchTask?: () => void
  completeTask?: () => void
  deleteTask?: () => void
}

export function useTaskShortcuts(callbacks: TaskShortcutCallbacks) {
  const shortcuts: ShortcutHandler[] = [
    {
      key: 'n',
      ctrlKey: true,
      description: '新建任务',
      handler: (e) => {
        e.preventDefault()
        callbacks.createTask?.()
      },
    },
    {
      key: 'f',
      ctrlKey: true,
      description: '搜索任务',
      handler: (e) => {
        e.preventDefault()
        callbacks.searchTask?.()
      },
    },
    {
      key: 'Enter',
      ctrlKey: true,
      description: '完成任务',
      handler: (e) => {
        e.preventDefault()
        callbacks.completeTask?.()
      },
    },
    {
      key: 'Delete',
      description: '删除任务',
      handler: (e) => {
        e.preventDefault()
        callbacks.deleteTask?.()
      },
    },
  ]

  return useGlobalShortcuts(shortcuts, 'tasks')
}
