<template>
  <div class="style-panel">
    <div class="panel-tabs">
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'paragraph' }"
        @click="activeTab = 'paragraph'"
      >
        <el-icon><Document /></el-icon>
        <span>段落样式</span>
      </div>
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'character' }"
        @click="activeTab = 'character'"
      >
        <span class="icon-text">A</span>
        <span>字符样式</span>
      </div>
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'custom' }"
        @click="activeTab = 'custom'"
      >
        <el-icon><Setting /></el-icon>
        <span>自定义</span>
      </div>
    </div>

    <div class="panel-content">
      <div v-if="activeTab === 'paragraph'" class="style-list">
        <div class="style-group-title">段落样式</div>
        <div 
          v-for="style in paragraphStyles" 
          :key="style.id"
          class="style-item"
          :class="{ active: selectedStyleId === style.id }"
          @click="applyStyle(style)"
        >
          <div class="style-preview" :style="getParagraphPreviewStyle(style)">
            {{ style.name }}
          </div>
          <div class="style-info">
            <div class="style-name">{{ style.name }}</div>
            <div class="style-desc">{{ style.description }}</div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'character'" class="style-list">
        <div class="style-group-title">字符样式</div>
        <div 
          v-for="style in characterStyles" 
          :key="style.id"
          class="style-item"
          :class="{ active: selectedStyleId === style.id }"
          @click="applyStyle(style)"
        >
          <div class="style-preview character-preview" :style="getCharacterPreviewStyle(style)">
            Aa
          </div>
          <div class="style-info">
            <div class="style-name">{{ style.name }}</div>
            <div class="style-desc">{{ style.description }}</div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'custom'" class="custom-styles">
        <div class="custom-header">
          <span class="style-group-title">自定义样式</span>
          <el-button size="small" type="primary" @click="showAddDialog = true">
            <el-icon><Plus /></el-icon>
            新建
          </el-button>
        </div>
        
        <div v-if="customStyles.length === 0" class="empty-styles">
          <el-empty description="暂无自定义样式" :image-size="60" />
        </div>
        
        <div v-else class="style-list">
          <div 
            v-for="style in customStyles" 
            :key="style.id"
            class="style-item"
            :class="{ active: selectedStyleId === style.id }"
            @click="selectCustomStyle(style)"
          >
            <div class="style-preview" :style="getCustomPreviewStyle(style)">
              {{ style.name }}
            </div>
            <div class="style-info">
              <div class="style-name">{{ style.name }}</div>
              <div class="style-desc">{{ style.type === 'paragraph' ? '段落样式' : '字符样式' }}</div>
            </div>
            <div class="style-actions">
              <el-button size="small" text @click.stop="editCustomStyle(style)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button size="small" text style="color: var(--color-danger)" @click.stop="deleteCustomStyle(style.id)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="showAddDialog" :title="editingCustomStyle ? '编辑样式' : '新建样式'" width="480px">
      <el-form :model="styleForm" label-width="100px">
        <el-form-item label="样式名称">
          <el-input v-model="styleForm.name" placeholder="请输入样式名称" />
        </el-form-item>
        <el-form-item label="样式类型">
          <el-radio-group v-model="styleForm.type">
            <el-radio value="paragraph">段落样式</el-radio>
            <el-radio value="character">字符样式</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="字体">
          <el-select v-model="styleForm.fontFamily">
            <el-option label="微软雅黑" value="Microsoft YaHei" />
            <el-option label="宋体" value="SimSun" />
            <el-option label="黑体" value="SimHei" />
            <el-option label="楷体" value="KaiTi" />
            <el-option label="Arial" value="Arial" />
          </el-select>
        </el-form-item>
        <el-form-item label="字号">
          <el-input-number v-model="styleForm.fontSize" :min="8" :max="72" />
          <span style="margin-left: 8px; color: #999;">pt</span>
        </el-form-item>
        <el-form-item label="字重">
          <el-select v-model="styleForm.fontWeight">
            <el-option label="正常" value="normal" />
            <el-option label="加粗" value="bold" />
            <el-option label="更粗" value="bolder" />
          </el-select>
        </el-form-item>
        <el-form-item label="字体样式">
          <el-select v-model="styleForm.fontStyle">
            <el-option label="正常" value="normal" />
            <el-option label="斜体" value="italic" />
          </el-select>
        </el-form-item>
        <el-form-item label="文字颜色">
          <el-color-picker v-model="styleForm.color" />
        </el-form-item>
        <el-form-item v-if="styleForm.type === 'paragraph'" label="行高">
          <el-input-number v-model="styleForm.lineHeight" :min="1" :max="3" :step="0.1" />
        </el-form-item>
        <el-form-item v-if="styleForm.type === 'paragraph'" label="段间距">
          <el-input-number v-model="styleForm.paragraphSpacing" :min="0" :max="50" />
          <span style="margin-left: 8px; color: #999;">pt</span>
        </el-form-item>
        <el-form-item label="背景色">
          <el-color-picker v-model="styleForm.backgroundColor" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveCustomStyle">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Document, Setting, Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const emit = defineEmits<{
  (e: 'apply-style', style: any): void
}>()

const activeTab = ref<'paragraph' | 'character' | 'custom'>('paragraph')
const selectedStyleId = ref<string>('')
const showAddDialog = ref(false)
const editingCustomStyle = ref<any>(null)

const paragraphStyles = ref([
  {
    id: 'heading-1',
    name: '标题 1',
    description: '大标题，24pt 加粗',
    type: 'paragraph',
    fontFamily: 'Microsoft YaHei',
    fontSize: 24,
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#1a1a1a',
    lineHeight: 1.4,
    paragraphSpacing: 16,
    backgroundColor: 'transparent',
  },
  {
    id: 'heading-2',
    name: '标题 2',
    description: '二级标题，18pt 加粗',
    type: 'paragraph',
    fontFamily: 'Microsoft YaHei',
    fontSize: 18,
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#2d2d2d',
    lineHeight: 1.4,
    paragraphSpacing: 12,
    backgroundColor: 'transparent',
  },
  {
    id: 'heading-3',
    name: '标题 3',
    description: '三级标题，14pt 加粗',
    type: 'paragraph',
    fontFamily: 'Microsoft YaHei',
    fontSize: 14,
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#333333',
    lineHeight: 1.5,
    paragraphSpacing: 8,
    backgroundColor: 'transparent',
  },
  {
    id: 'body-text',
    name: '正文',
    description: '正文内容，10pt 正常',
    type: 'paragraph',
    fontFamily: 'SimSun',
    fontSize: 10,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#333333',
    lineHeight: 1.6,
    paragraphSpacing: 6,
    backgroundColor: 'transparent',
  },
  {
    id: 'quote',
    name: '引用',
    description: '引用文字，10pt 斜体',
    type: 'paragraph',
    fontFamily: 'KaiTi',
    fontSize: 10,
    fontWeight: 'normal',
    fontStyle: 'italic',
    color: '#666666',
    lineHeight: 1.6,
    paragraphSpacing: 8,
    backgroundColor: '#f8f8f8',
  },
])

const characterStyles = ref([
  {
    id: 'bold',
    name: '加粗',
    description: '文字加粗',
    type: 'character',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: 'inherit',
    backgroundColor: 'transparent',
  },
  {
    id: 'italic',
    name: '斜体',
    description: '文字斜体',
    type: 'character',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    fontStyle: 'italic',
    color: 'inherit',
    backgroundColor: 'transparent',
  },
  {
    id: 'highlight',
    name: '高亮',
    description: '黄色背景高亮',
    type: 'character',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: 'inherit',
    backgroundColor: '#fff59d',
  },
  {
    id: 'red-text',
    name: '红色字',
    description: '红色文字',
    type: 'character',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#e53935',
    backgroundColor: 'transparent',
  },
  {
    id: 'underline',
    name: '下划线',
    description: '文字下划线',
    type: 'character',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: 'inherit',
    backgroundColor: 'transparent',
    textDecoration: 'underline',
  },
  {
    id: 'code',
    name: '代码',
    description: '代码样式',
    type: 'character',
    fontFamily: 'Consolas',
    fontSize: 'inherit',
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#d63384',
    backgroundColor: '#f8f9fa',
  },
])

const customStyles = ref<any[]>([])

const styleForm = reactive({
  name: '',
  type: 'paragraph',
  fontFamily: 'Microsoft YaHei',
  fontSize: 12,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#333333',
  lineHeight: 1.5,
  paragraphSpacing: 6,
  backgroundColor: 'transparent',
})

const getParagraphPreviewStyle = (style: any) => {
  return {
    fontFamily: style.fontFamily,
    fontSize: `${style.fontSize * 0.6}px`,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    color: style.color,
    lineHeight: style.lineHeight,
    backgroundColor: style.backgroundColor !== 'transparent' ? style.backgroundColor : 'transparent',
  }
}

const getCharacterPreviewStyle = (style: any) => {
  return {
    fontFamily: style.fontFamily !== 'inherit' ? style.fontFamily : 'Microsoft YaHei',
    fontSize: '16px',
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    color: style.color !== 'inherit' ? style.color : '#333',
    backgroundColor: style.backgroundColor !== 'transparent' ? style.backgroundColor : 'transparent',
  }
}

const getCustomPreviewStyle = (style: any) => {
  if (style.type === 'paragraph') {
    return getParagraphPreviewStyle(style)
  }
  return getCharacterPreviewStyle(style)
}

const applyStyle = (style: any) => {
  selectedStyleId.value = style.id
  emit('apply-style', style)
}

const selectCustomStyle = (style: any) => {
  selectedStyleId.value = style.id
  emit('apply-style', style)
}

const editCustomStyle = (style: any) => {
  editingCustomStyle.value = style
  Object.assign(styleForm, style)
  showAddDialog.value = true
}

const saveCustomStyle = () => {
  if (!styleForm.name.trim()) {
    ElMessage.warning('请输入样式名称')
    return
  }

  if (editingCustomStyle.value) {
    const index = customStyles.value.findIndex(s => s.id === editingCustomStyle.value.id)
    if (index !== -1) {
      customStyles.value[index] = { ...styleForm, id: editingCustomStyle.value.id }
    }
    ElMessage.success('样式更新成功')
  } else {
    const newStyle = {
      ...styleForm,
      id: `custom-${Date.now()}`,
    }
    customStyles.value.push(newStyle)
    ElMessage.success('样式创建成功')
  }

  showAddDialog.value = false
  resetStyleForm()
}

const deleteCustomStyle = (id: string) => {
  ElMessageBox.confirm('确定要删除这个样式吗？', '删除确认', {
    type: 'warning',
  }).then(() => {
    const index = customStyles.value.findIndex(s => s.id === id)
    if (index !== -1) {
      customStyles.value.splice(index, 1)
    }
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const resetStyleForm = () => {
  editingCustomStyle.value = null
  styleForm.name = ''
  styleForm.type = 'paragraph'
  styleForm.fontFamily = 'Microsoft YaHei'
  styleForm.fontSize = 12
  styleForm.fontWeight = 'normal'
  styleForm.fontStyle = 'normal'
  styleForm.color = '#333333'
  styleForm.lineHeight = 1.5
  styleForm.paragraphSpacing = 6
  styleForm.backgroundColor = 'transparent'
}
</script>

<style scoped>
.style-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.tab-item:hover {
  color: #409eff;
  background: #f0f7ff;
}

.tab-item.active {
  color: #409eff;
  background: #fff;
  border-bottom-color: #409eff;
}

.tab-item .el-icon {
  font-size: 18px;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.style-group-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.style-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.style-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.style-item:hover {
  border-color: #409eff;
  background: #f0f7ff;
}

.style-item.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.style-preview {
  width: 80px;
  padding: 8px;
  background: #fff;
  border-radius: 4px;
  text-align: center;
  border: 1px solid #eee;
  flex-shrink: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.character-preview {
  width: 60px;
  font-size: 18px;
  font-weight: bold;
}

.style-info {
  flex: 1;
  min-width: 0;
}

.style-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.style-desc {
  font-size: 11px;
  color: #999;
}

.style-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.custom-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.empty-styles {
  padding: 30px 0;
}
</style>
