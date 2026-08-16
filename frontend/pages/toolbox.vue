<template>
  <div class="toolbox-container">
    <div class="toolbox-header">
      <h2>🧰 工具箱</h2>
      <p>常用小工具，提高工作效率</p>
    </div>
    
    <div class="tools-grid">
      <!-- PDF压缩工具 -->
      <el-card class="tool-card cursor-pointer hover:shadow-lg transition-shadow" @click="showPdfCompressor = true">
        <div class="tool-content">
          <div class="tool-icon">📄</div>
          <h3>PDF压缩</h3>
          <p>智能双轨压缩，自动选择最优方案</p>
          <el-button type="primary" class="tool-btn">立即使用</el-button>
        </div>
      </el-card>
      
      <!-- 图片压缩工具 -->
      <el-card class="tool-card cursor-pointer hover:shadow-lg transition-shadow" @click="showImageCompressor = true">
        <div class="tool-content">
          <div class="tool-icon">🖼️</div>
          <h3>图片压缩</h3>
          <p>快速压缩图片，节省存储空间</p>
          <el-button type="primary" class="tool-btn">立即使用</el-button>
        </div>
      </el-card>
      
      <!-- 杂志编排 -->
      <el-card class="tool-card cursor-pointer hover:shadow-lg transition-shadow" @click="openMagazine">
        <div class="tool-content">
          <div class="tool-icon">📖</div>
          <h3>杂志编排</h3>
          <p>创建杂志、编排文章、生成PDF</p>
          <el-button type="primary" class="tool-btn">打开杂志编排</el-button>
        </div>
      </el-card>
      
      <!-- 便利贴 -->
      <el-card class="tool-card cursor-pointer hover:shadow-lg transition-shadow" @click="openStickyNote">
        <div class="tool-content">
          <div class="tool-icon">📝</div>
          <h3>便利贴</h3>
          <p>快速记录灵感，不丢想法</p>
          <el-button type="primary" class="tool-btn">打开便利贴</el-button>
        </div>
      </el-card>
      
      <!-- 屏保时钟 -->
      <el-card class="tool-card cursor-pointer hover:shadow-lg transition-shadow" @click="openScreensaver">
        <div class="tool-content">
          <div class="tool-icon">🕐</div>
          <h3>屏保时钟</h3>
          <p>船舶休息时显示时钟和日程</p>
          <el-button type="primary" class="tool-btn">打开时钟</el-button>
        </div>
      </el-card>
      
      <!-- 船名达人 -->
      <el-card class="tool-card cursor-pointer hover:shadow-lg transition-shadow" @click="openShipQuiz">
        <div class="tool-content">
          <div class="tool-icon">🚢</div>
          <h3>船名达人</h3>
          <p>船舶知识记忆训练，间隔重复学习</p>
          <el-button type="primary" class="tool-btn">开始训练</el-button>
        </div>
      </el-card>

      <!-- 政工笔 · AI 智能写作（船舶政工写作专家系统） -->
      <el-card class="tool-card tool-card-highlight cursor-pointer hover:shadow-lg transition-shadow" @click="openAiManuscript">
        <div class="tool-content">
          <div class="tool-icon">✍️</div>
          <h3>政工笔 · AI 智能写作</h3>
          <p>通讯/简报/人物稿/散文/总结：10 步结构化填表 → 出一篇集团录用规范、去 AI 化 ≤15% 的成品稿</p>
          <el-button type="warning" class="tool-btn">进入政工笔</el-button>
        </div>
      </el-card>
    </div>
    
    <!-- PDF压缩对话框 -->
    <PdfCompressorDialog v-model="showPdfCompressor" />
    
    <!-- 图片压缩对话框 -->
    <ImageCompressorDialog v-model="showImageCompressor" />
    
    <!-- 便利贴 (可打开多个) -->
    <StickyNote 
      v-for="note in stickyNotes" 
      :key="note.id" 
      :id="note.id"
      @close="closeStickyNote(note.id)"
    />
    
    <!-- 屏保时钟 -->
    <ScreenSaver v-if="showScreenSaver" @close="showScreenSaver = false" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const showPdfCompressor = ref(false)
const showImageCompressor = ref(false)
const showScreenSaver = ref(false)

interface StickyNoteData {
  id: string
}

const stickyNotes = ref<StickyNoteData[]>([])
let noteCounter = 0

const openStickyNote = () => {
  const id = `sticky-${++noteCounter}-${Date.now()}`
  stickyNotes.value.push({ id })
}

const closeStickyNote = (id: string) => {
  const idx = stickyNotes.value.findIndex(n => n.id === id)
  if (idx >= 0) {
    stickyNotes.value.splice(idx, 1)
  }
}

const openScreensaver = () => {
  showScreenSaver.value = true
}

const openMagazine = () => {
  router.push('/magazine')
}

const openShipQuiz = () => {
  router.push('/training/ship-quiz')
}

const openAiManuscript = () => {
  // 政工笔：船舶政工 AI 写作专家系统（10 步结构化填表 + 去 AI 化 + 100 分评分）
  router.push('/toolbox/ai-manuscript')
}
</script>

<style scoped>
.toolbox-container {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
}

.toolbox-header {
  margin-bottom: 32px;
}

.toolbox-header h2 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 600;
  color: var(--color-text);
}

.toolbox-header p {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.tool-card {
  border-radius: 12px;
}

.tool-content {
  text-align: center;
  padding: 16px;
}

.tool-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.tool-card h3 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.tool-card p {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.tool-btn {
  width: 100%;
}

.tool-card-highlight {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 55%, #bbf7d0 100%);
  border: 1px solid #86efac;
  box-shadow: 0 8px 24px -12px rgba(34, 197, 94, 0.35);
  transition: transform .2s ease, box-shadow .2s ease;
}
.tool-card-highlight:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 40px -16px rgba(22, 163, 74, 0.45) !important;
}

@media (max-width: 768px) {
  .toolbox-container {
    padding: 16px;
  }
  
  .tools-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }

  .tool-icon {
    font-size: 32px;
    margin-bottom: 8px;
  }

  .tool-card h3 {
    font-size: 14px;
  }

  .tool-card p {
    font-size: 12px;
    margin-bottom: 8px;
  }
}
</style>
