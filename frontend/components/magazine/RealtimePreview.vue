<template>
  <div class="realtime-preview">
    <div class="preview-toolbar">
      <el-radio-group v-model="previewMode" size="small">
        <el-radio-button label="page">分页预览</el-radio-button>
        <el-radio-button label="scroll">连续滚动</el-radio-button>
        <el-radio-button label="actual">实际大小</el-radio-button>
      </el-radio-group>
      
      <div class="preview-zoom" v-if="previewMode === 'actual' || previewMode === 'scroll'">
        <el-button size="small" icon="ZoomOut" @click="zoomOut" :disabled="zoom <= 0.5" />
        <span class="zoom-value">{{ Math.round(zoom * 100) }}%</span>
        <el-button size="small" icon="ZoomIn" @click="zoomIn" :disabled="zoom >= 2" />
      </div>
    </div>
    
    <div class="preview-container" ref="previewContainer">
      <!-- 分页预览模式 -->
      <div v-if="previewMode === 'page'" class="page-preview-list">
        <div 
          v-for="(page, index) in pages" 
          :key="index"
          class="page-preview"
          :class="{ active: currentPage === index }"
          @click="currentPage = index"
        >
          <div class="page-thumbnail">
            <div class="page-content-preview" v-html="page.html"></div>
          </div>
          <div class="page-label">第 {{ index + 1 }} 页</div>
        </div>
      </div>
      
      <!-- 连续滚动模式 -->
      <div v-else-if="previewMode === 'scroll'" class="scroll-preview">
        <div 
          class="preview-page"
          v-for="(page, index) in pages"
          :key="index"
        >
          <div class="page-content-html" v-html="page.html"></div>
          <div class="page-number">{{ index + 1 }}</div>
        </div>
      </div>
      
      <!-- 实际大小模式 -->
      <div v-else class="actual-preview">
        <div 
          class="actual-page"
          :style="{ transform: `scale(${zoom})` }"
        >
          <div class="page-content-html" v-html="currentPageHtml"></div>
        </div>
      </div>
    </div>
    
    <!-- 分页导航 -->
    <div class="preview-navigation">
      <el-button size="small" :disabled="currentPage <= 0" @click="prevPage">
        上一页
      </el-button>
      <span class="page-info">{{ currentPage + 1 }} / {{ pages.length || 1 }}</span>
      <el-button size="small" :disabled="currentPage >= pages.length - 1" @click="nextPage">
        下一页
      </el-button>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="preview-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>正在生成预览...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { useApi } from '~/composables/useApi'

const props = defineProps<{
  magazine: {
    id: string
    name: string
    templateId: string
    sections: Array<{
      id: string
      name: string
      layout: string
      articles: Array<{
        id: string
        title: string
        content: string
        author?: string
      }>
    }>
  }
  currentArticle?: {
    id: string
    title: string
    content: string
  }
}>()

const emit = defineEmits<{
  (e: 'page-change', page: number): void
}>()

const api = useApi()
const previewMode = ref<'page' | 'scroll' | 'actual'>('page')
const zoom = ref(1)
const currentPage = ref(0)
const loading = ref(false)
const pages = ref<Array<{ html: string }>>([])
const previewUrl = ref<string>('')

// 计算当前页HTML
const currentPageHtml = computed(() => {
  if (pages.value.length === 0) return ''
  return pages.value[currentPage.value]?.html || ''
})

// 防抖函数
const debounce = (fn: Function, delay: number) => {
  let timer: NodeJS.Timeout | null = null
  return (...args: any[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// 更新预览
const updatePreview = debounce(async () => {
  if (!props.magazine?.id) return
  
  loading.value = true
  try {
    // 调用后端API生成预览
    const result = await api.magazine.generatePreview(props.magazine.id, {
      scale: 0.3,
    })
    
    // 将base64转换为blob URL
    const binary = atob(result)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'application/pdf' })
    previewUrl.value = URL.createObjectURL(blob)
    
    // 生成HTML预览页面
    generateHtmlPreview()
  } catch (error) {
    console.error('预览生成失败', error)
  } finally {
    loading.value = false
  }
}, 1000)

// 生成HTML预览（用于快速显示）
const generateHtmlPreview = () => {
  if (!props.magazine?.sections) {
    pages.value = []
    return
  }

  const template = getTemplate(props.magazine.templateId)
  const newPages: Array<{ html: string }> = []
  
  // A4比例
  const pageWidth = 210
  const pageHeight = 297
  const marginTop = template.pageConfig.margin.top
  const marginLeft = template.pageConfig.margin.left
  const marginRight = template.pageConfig.margin.right

  for (const section of props.magazine.sections) {
    for (const article of section.articles) {
      const articlePages = paginateArticle(article, template)
      for (const pageContent of articlePages) {
        newPages.push({ html: pageContent })
      }
    }
  }

  // 确保至少有一页
  if (newPages.length === 0) {
    newPages.push({ html: generateEmptyPage(template) })
  }

  pages.value = newPages
}

// 文章分页
const paginateArticle = (article: { title: string; content: string }, template: any): string[] => {
  const pages: string[] = []
  const contentWidth = 210 - template.pageConfig.margin.left - template.pageConfig.margin.right - 10
  const contentHeight = 297 - template.pageConfig.margin.top - template.pageConfig.margin.bottom - 20
  
  // 标题占用高度
  const titleLines = Math.ceil(article.title.length / (contentWidth / (template.styles.titleFontSize * 0.5)))
  let currentHeight = titleLines * template.styles.titleFontSize * template.styles.lineHeight
  
  // 估算每行字数和每页行数
  const charsPerLine = Math.floor(contentWidth / (template.styles.contentFontSize * 0.5))
  const linesPerPage = Math.floor(contentHeight / (template.styles.contentFontSize * template.styles.lineHeight))
  
  // 估算文章需要的总行数
  const plainContent = stripHtml(article.content)
  const totalLines = Math.ceil(plainContent.length / charsPerLine)
  const pageCount = Math.ceil((currentHeight + totalLines * template.styles.contentFontSize * template.styles.lineHeight) / contentHeight) || 1
  
  // 生成每页内容
  let charIndex = 0
  for (let i = 0; i < pageCount; i++) {
    let pageHtml = ''
    
    // 标题（只在第一页显示）
    if (i === 0) {
      pageHtml += `<div class="preview-title" style="font-size: ${template.styles.titleFontSize}pt; font-weight: bold; margin-bottom: 8px;">${article.title}</div>`
      currentHeight = titleLines * template.styles.titleFontSize * template.styles.lineHeight + 15
    } else {
      currentHeight = 0
    }
    
    // 计算每页能容纳的内容
    const availableLines = Math.floor((contentHeight - currentHeight) / (template.styles.contentFontSize * template.styles.lineHeight))
    const endIndex = Math.min(charIndex + availableLines * charsPerLine, plainContent.length)
    const pageContent = plainContent.substring(charIndex, endIndex)
    charIndex = endIndex
    
    // 生成文本行
    const lines: string[] = []
    let currentLine = ''
    for (const char of pageContent) {
      currentLine += char
      if (currentLine.length >= charsPerLine) {
        lines.push(currentLine)
        currentLine = ''
      }
    }
    if (currentLine) lines.push(currentLine)
    
    // 绘制段落
    let paraHtml = ''
    for (const line of lines) {
      paraHtml += `<div style="line-height: ${template.styles.lineHeight}; font-size: ${template.styles.contentFontSize}pt; color: #333;">${line}</div>`
    }
    
    // 页面头部（第一页）
    if (i === 0) {
      pageHtml = `<div style="padding: ${template.pageConfig.margin.top}px ${template.pageConfig.margin.right}px ${template.pageConfig.margin.bottom}px ${template.pageConfig.margin.left}px; height: ${pageHeight}px; box-sizing: border-box; background: white;">` + pageHtml
    } else {
      pageHtml = `<div style="padding: ${template.pageConfig.margin.top}px ${template.pageConfig.margin.right}px ${template.pageConfig.margin.bottom}px ${template.pageConfig.margin.left}px; height: ${pageHeight}px; box-sizing: border-box; background: white;">`
    }
    
    // 页脚
    pageHtml += paraHtml
    pageHtml += `<div style="position: absolute; bottom: ${template.pageConfig.margin.bottom / 2}px; left: 0; right: 0; text-align: center; font-size: 8pt; color: #999;">${i + 1}</div>`
    pageHtml += '</div>'
    
    pages.push(pageHtml)
  }
  
  return pages.length > 0 ? pages : [generateEmptyPage(template)]
}

// 生成空页面
const generateEmptyPage = (template: any): string => {
  return `<div style="padding: ${template.pageConfig.margin.top}px ${template.pageConfig.margin.right}px ${template.pageConfig.margin.bottom}px ${template.pageConfig.margin.left}px; height: 297px; box-sizing: border-box; background: white;">
    <div style="text-align: center; color: #999; margin-top: 100px;">
      <p>暂无内容</p>
      <p style="font-size: 10pt;">请添加文章内容</p>
    </div>
  </div>`
}

// 去除HTML标签
const stripHtml = (html: string): string => {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

// 获取模板配置
const getTemplate = (templateId: string) => {
  const templates: Record<string, any> = {
    'business-classic': {
      id: 'business-classic',
      name: '简洁商务风',
      pageConfig: {
        width: 210,
        height: 297,
        margin: { top: 20, bottom: 20, left: 25, right: 25 },
      },
      headerConfig: {
        hasPageNumber: true,
        pageNumberPosition: 'bottom-center',
      },
      styles: {
        titleFontSize: 16,
        contentFontSize: 10,
        lineHeight: 1.5,
        paragraphSpacing: 6,
      },
    },
    'fresh-magazine': {
      id: 'fresh-magazine',
      name: '清新杂志风',
      pageConfig: {
        width: 210,
        height: 297,
        margin: { top: 15, bottom: 15, left: 20, right: 20 },
      },
      headerConfig: {
        hasPageNumber: true,
        pageNumberPosition: 'bottom-right',
      },
      styles: {
        titleFontSize: 14,
        contentFontSize: 9,
        lineHeight: 1.8,
        paragraphSpacing: 8,
      },
    },
    'newspaper': {
      id: 'newspaper',
      name: '传统报纸风',
      pageConfig: {
        width: 210,
        height: 297,
        margin: { top: 12, bottom: 12, left: 10, right: 10 },
      },
      headerConfig: {
        hasPageNumber: true,
        pageNumberPosition: 'bottom-center',
      },
      styles: {
        titleFontSize: 12,
        contentFontSize: 8,
        lineHeight: 1.4,
        paragraphSpacing: 4,
      },
    },
  }
  return templates[templateId] || templates['business-classic']
}

// 分页导航
const prevPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--
    emit('page-change', currentPage.value)
  }
}

const nextPage = () => {
  if (currentPage.value < pages.value.length - 1) {
    currentPage.value++
    emit('page-change', currentPage.value)
  }
}

// 缩放控制
const zoomIn = () => {
  zoom.value = Math.min(2, zoom.value + 0.1)
}

const zoomOut = () => {
  zoom.value = Math.max(0.5, zoom.value - 0.1)
}

// 监听数据变化自动更新预览
watch(
  () => props.magazine,
  () => {
    updatePreview()
  },
  { deep: true }
)

// 监听当前文章变化
watch(
  () => props.currentArticle,
  () => {
    updatePreview()
  }
)

onMounted(() => {
  updatePreview()
})
</script>

<style scoped>
.realtime-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f5f5f5;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: #fff;
  border-bottom: 1px solid #eee;
  gap: 16px;
}

.preview-zoom {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.zoom-value {
  min-width: 50px;
  text-align: center;
  font-size: 13px;
  color: #666;
}

.preview-container {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

/* 分页预览模式 */
.page-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
}

.page-preview {
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.page-preview:hover {
  border-color: #409eff;
  transform: translateY(-2px);
}

.page-preview.active {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.page-thumbnail {
  width: 120px;
  height: 169px;
  overflow: hidden;
  position: relative;
  background: white;
}

.page-content-preview {
  transform-origin: top left;
  transform: scale(0.3);
  width: 400%;
  pointer-events: none;
}

.page-label {
  text-align: center;
  padding: 8px;
  font-size: 12px;
  color: #666;
  background: #fafafa;
}

/* 连续滚动模式 */
.scroll-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.scroll-preview .preview-page {
  width: 210mm;
  min-height: 297mm;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  position: relative;
  transform-origin: top center;
}

.scroll-preview .page-content-html {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.scroll-preview .page-number {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: #999;
}

/* 实际大小模式 */
.actual-preview {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100%;
}

.actual-page {
  transform-origin: top center;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.page-content-html {
  width: 210mm;
  min-height: 297mm;
  background: white;
  position: relative;
}

/* 分页导航 */
.preview-navigation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px;
  background: #fff;
  border-top: 1px solid #eee;
}

.page-info {
  font-size: 14px;
  color: #666;
  min-width: 80px;
  text-align: center;
}

/* 加载状态 */
.preview-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.preview-loading span {
  font-size: 14px;
  color: #666;
}
</style>
