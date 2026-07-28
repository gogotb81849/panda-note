/**
 * 杂志编辑器相关类型定义
 */

export interface Block {
  id: string
  type: 'heading' | 'paragraph' | 'image' | 'quote' | 'divider' | 'code'
  content: string
  level?: number // 标题级别 1-3
  url?: string // 图片URL
  caption?: string // 图片说明
}

export interface SlashCommand {
  id: string
  name: string
  icon: string
  description: string
  category: 'block' | 'format' | 'ai' | 'insert'
  action: () => void
}

export interface GuideStep {
  target: string // CSS选择器
  title: string
  content: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

export interface ShortcutItem {
  keys: string[]
  description: string
  category: 'format' | 'block' | 'ai' | 'navigation'
}

export interface EditorState {
  blocks: Block[]
  activeBlockId: string | null
  isDragging: boolean
  slashCommandVisible: boolean
}