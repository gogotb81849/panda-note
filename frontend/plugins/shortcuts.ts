import { ElMessage } from 'element-plus'
import {
  useGlobalShortcuts,
  setDefaultShortcuts,
  openShortcutHelp,
  openCommandPalette,
  type ShortcutConfig,
} from '~/composables/useGlobalShortcuts'

export default defineNuxtPlugin(() => {
  if (process.client) {
    const router = useRouter()

    const defaultShortcuts: ShortcutConfig[] = [
      {
        id: 'file.save',
        key: 's',
        ctrlKey: true,
        description: '保存',
        category: 'file',
        scope: 'global',
        enabledInInput: true,
        handler: (e) => {
          e.preventDefault()
          ElMessage.info('保存功能已触发')
        },
      },
      {
        id: 'file.print',
        key: 'p',
        ctrlKey: true,
        description: '打印',
        category: 'file',
        scope: 'global',
        enabledInInput: true,
        handler: (e) => {
          e.preventDefault()
          window.print()
        },
      },
      {
        id: 'edit.undo',
        key: 'z',
        ctrlKey: true,
        description: '撤销',
        category: 'edit',
        scope: 'global',
        enabledInInput: true,
        handler: () => {
        },
      },
      {
        id: 'edit.redo',
        key: 'y',
        ctrlKey: true,
        description: '重做',
        category: 'edit',
        scope: 'global',
        enabledInInput: true,
        handler: () => {
        },
      },
      {
        id: 'edit.find',
        key: 'f',
        ctrlKey: true,
        description: '查找',
        category: 'edit',
        scope: 'global',
        enabledInInput: false,
        handler: (e) => {
          e.preventDefault()
          ElMessage.info('查找功能已触发')
        },
      },
      {
        id: 'edit.selectAll',
        key: 'a',
        ctrlKey: true,
        description: '全选',
        category: 'edit',
        scope: 'global',
        enabledInInput: true,
        handler: () => {
        },
      },
      {
        id: 'view.zoomIn',
        key: '=',
        ctrlKey: true,
        description: '放大视图',
        category: 'view',
        scope: 'global',
        enabledInInput: false,
        handler: (e) => {
          e.preventDefault()
          ElMessage.info('放大视图')
        },
      },
      {
        id: 'view.zoomOut',
        key: '-',
        ctrlKey: true,
        description: '缩小视图',
        category: 'view',
        scope: 'global',
        enabledInInput: false,
        handler: (e) => {
          e.preventDefault()
          ElMessage.info('缩小视图')
        },
      },
      {
        id: 'navigation.home',
        key: 'h',
        altKey: true,
        description: '返回首页',
        category: 'navigation',
        scope: 'global',
        enabledInInput: false,
        handler: (e) => {
          e.preventDefault()
          router.push('/')
        },
      },
      {
        id: 'navigation.globalSearch',
        key: 'k',
        ctrlKey: true,
        description: '全局搜索',
        category: 'navigation',
        scope: 'global',
        enabledInInput: false,
        handler: (e) => {
          e.preventDefault()
          const searchInput = document.querySelector('.header-search .el-input__inner') as HTMLInputElement
          if (searchInput) {
            searchInput.focus()
          }
        },
      },
      {
        id: 'help.shortcutHelp',
        key: '?',
        ctrlKey: true,
        shiftKey: true,
        description: '快捷键帮助',
        category: 'help',
        scope: 'global',
        enabledInInput: false,
        handler: (e) => {
          e.preventDefault()
          openShortcutHelp()
        },
      },
      {
        id: 'help.commandPalette',
        key: 'p',
        ctrlKey: true,
        shiftKey: true,
        description: '命令面板',
        category: 'help',
        scope: 'global',
        enabledInInput: false,
        handler: (e) => {
          e.preventDefault()
          openCommandPalette()
        },
      },
    ]

    setDefaultShortcuts(defaultShortcuts)

    useGlobalShortcuts(defaultShortcuts)
  }
})
