/**
 * 日程模块快捷键
 */
import { useGlobalShortcuts, type ShortcutHandler } from './useGlobalShortcuts'

interface ScheduleShortcutCallbacks {
  createSchedule?: () => void
  prevPeriod?: () => void
  nextPeriod?: () => void
  goToToday?: () => void
}

export function useScheduleShortcuts(callbacks: ScheduleShortcutCallbacks) {
  const shortcuts: ShortcutHandler[] = [
    {
      key: 'n',
      ctrlKey: true,
      description: '新建日程',
      handler: (e) => {
        e.preventDefault()
        callbacks.createSchedule?.()
      },
    },
    {
      key: 'ArrowLeft',
      ctrlKey: true,
      description: '上一周期',
      handler: (e) => {
        e.preventDefault()
        callbacks.prevPeriod?.()
      },
    },
    {
      key: 'ArrowRight',
      ctrlKey: true,
      description: '下一周期',
      handler: (e) => {
        e.preventDefault()
        callbacks.nextPeriod?.()
      },
    },
    {
      key: 't',
      description: '回到今天',
      handler: (e) => {
        e.preventDefault()
        callbacks.goToToday?.()
      },
    },
  ]

  return useGlobalShortcuts(shortcuts, 'schedule')
}
