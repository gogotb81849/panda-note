<template>
  <div class="master-page-editor">
    <div class="preview-section">
      <div class="preview-label">主版页预览</div>
      <div class="page-preview" :style="pagePreviewStyle">
        <div 
          v-if="masterConfig.header.enabled"
          class="preview-header"
          :style="headerStyle"
        >
          <div class="header-content">{{ masterConfig.header.text || '页眉文字' }}</div>
          <div v-if="masterConfig.header.divider" class="header-divider"></div>
        </div>
        
        <div class="preview-body">
          <div class="body-margin-indicator top" :style="{ top: `${masterConfig.margin.top}px` }"></div>
          <div class="body-margin-indicator bottom" :style="{ bottom: `${masterConfig.margin.bottom}px` }"></div>
          <div class="body-margin-indicator left" :style="{ left: `${masterConfig.margin.left}px` }"></div>
          <div class="body-margin-indicator right" :style="{ right: `${masterConfig.margin.right}px` }"></div>
          <div 
            class="body-content"
            :style="bodyContentStyle"
          >
            <div class="content-title">文章标题示例</div>
            <div class="content-text">这是正文内容区域，文章将在此区域内排版显示。</div>
            <div class="content-text">页边距决定了内容与页面边缘的距离。</div>
          </div>
        </div>
        
        <div 
          v-if="masterConfig.footer.enabled"
          class="preview-footer"
          :style="footerStyle"
        >
          <div v-if="masterConfig.footer.divider" class="footer-divider"></div>
          <div class="footer-content">
            <span v-if="masterConfig.footer.text">{{ masterConfig.footer.text }}</span>
            <span v-if="masterConfig.footer.pageNumber"> - {{ pageNumberFormat }} - </span>
          </div>
        </div>
      </div>
    </div>

    <el-divider />

    <div class="settings-section">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="页眉设置" name="header">
          <el-form label-width="100px" size="small">
            <el-form-item label="启用页眉">
              <el-switch v-model="masterConfig.header.enabled" />
            </el-form-item>
            <el-form-item label="页眉内容">
              <el-input 
                v-model="masterConfig.header.text" 
                placeholder="请输入页眉文字"
                :disabled="!masterConfig.header.enabled"
              />
            </el-form-item>
            <el-form-item label="位置">
              <el-radio-group 
                v-model="masterConfig.header.position"
                :disabled="!masterConfig.header.enabled"
              >
                <el-radio value="left">左对齐</el-radio>
                <el-radio value="center">居中</el-radio>
                <el-radio value="right">右对齐</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="分割线">
              <el-switch v-model="masterConfig.header.divider" :disabled="!masterConfig.header.enabled" />
            </el-form-item>
            <el-form-item label="高度">
              <el-input-number 
                v-model="masterConfig.header.height" 
                :min="10" 
                :max="50" 
                :disabled="!masterConfig.header.enabled"
              />
              <span style="margin-left: 8px; color: #999;">mm</span>
            </el-form-item>
            <el-form-item label="字号">
              <el-input-number 
                v-model="masterConfig.header.fontSize" 
                :min="8" 
                :max="20" 
                :disabled="!masterConfig.header.enabled"
              />
              <span style="margin-left: 8px; color: #999;">pt</span>
            </el-form-item>
            <el-form-item label="文字颜色">
              <el-color-picker 
                v-model="masterConfig.header.color" 
                :disabled="!masterConfig.header.enabled"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="页脚设置" name="footer">
          <el-form label-width="100px" size="small">
            <el-form-item label="启用页脚">
              <el-switch v-model="masterConfig.footer.enabled" />
            </el-form-item>
            <el-form-item label="页脚文字">
              <el-input 
                v-model="masterConfig.footer.text" 
                placeholder="请输入页脚文字"
                :disabled="!masterConfig.footer.enabled"
              />
            </el-form-item>
            <el-form-item label="页码">
              <el-switch v-model="masterConfig.footer.pageNumber" :disabled="!masterConfig.footer.enabled" />
            </el-form-item>
            <el-form-item v-if="masterConfig.footer.pageNumber" label="页码格式">
              <el-select 
                v-model="masterConfig.footer.pageNumberFormat"
                :disabled="!masterConfig.footer.enabled"
              >
                <el-option label="第 X 页" value="第 {page} 页" />
                <el-option label="X / N" value="{page} / {total}" />
                <el-option label="- X -" value="- {page} -" />
                <el-option label="X" value="{page}" />
              </el-select>
            </el-form-item>
            <el-form-item label="位置">
              <el-radio-group 
                v-model="masterConfig.footer.position"
                :disabled="!masterConfig.footer.enabled"
              >
                <el-radio value="left">左对齐</el-radio>
                <el-radio value="center">居中</el-radio>
                <el-radio value="right">右对齐</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="分割线">
              <el-switch v-model="masterConfig.footer.divider" :disabled="!masterConfig.footer.enabled" />
            </el-form-item>
            <el-form-item label="高度">
              <el-input-number 
                v-model="masterConfig.footer.height" 
                :min="10" 
                :max="50" 
                :disabled="!masterConfig.footer.enabled"
              />
              <span style="margin-left: 8px; color: #999;">mm</span>
            </el-form-item>
            <el-form-item label="字号">
              <el-input-number 
                v-model="masterConfig.footer.fontSize" 
                :min="8" 
                :max="20" 
                :disabled="!masterConfig.footer.enabled"
              />
              <span style="margin-left: 8px; color: #999;">pt</span>
            </el-form-item>
            <el-form-item label="文字颜色">
              <el-color-picker 
                v-model="masterConfig.footer.color" 
                :disabled="!masterConfig.footer.enabled"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="页边距" name="margin">
          <el-form label-width="100px" size="small">
            <el-form-item label="上边距">
              <el-input-number v-model="masterConfig.margin.top" :min="5" :max="80" />
              <span style="margin-left: 8px; color: #999;">mm</span>
            </el-form-item>
            <el-form-item label="下边距">
              <el-input-number v-model="masterConfig.margin.bottom" :min="5" :max="80" />
              <span style="margin-left: 8px; color: #999;">mm</span>
            </el-form-item>
            <el-form-item label="左边距">
              <el-input-number v-model="masterConfig.margin.left" :min="5" :max="80" />
              <span style="margin-left: 8px; color: #999;">mm</span>
            </el-form-item>
            <el-form-item label="右边距">
              <el-input-number v-model="masterConfig.margin.right" :min="5" :max="80" />
              <span style="margin-left: 8px; color: #999;">mm</span>
            </el-form-item>
            <el-form-item label="预设">
              <div class="margin-presets">
                <el-button 
                  size="small" 
                  v-for="preset in marginPresets" 
                  :key="preset.name"
                  @click="applyMarginPreset(preset)"
                >
                  {{ preset.name }}
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'

const props = defineProps<{
  modelValue?: {
    header: {
      enabled: boolean
      text: string
      position: 'left' | 'center' | 'right'
      divider: boolean
      height: number
      fontSize: number
      color: string
    }
    footer: {
      enabled: boolean
      text: string
      pageNumber: boolean
      pageNumberFormat: string
      position: 'left' | 'center' | 'right'
      divider: boolean
      height: number
      fontSize: number
      color: string
    }
    margin: {
      top: number
      bottom: number
      left: number
      right: number
    }
  }
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const activeTab = ref('header')

const defaultConfig = {
  header: {
    enabled: true,
    text: '',
    position: 'center' as const,
    divider: true,
    height: 20,
    fontSize: 9,
    color: '#666666',
  },
  footer: {
    enabled: true,
    text: '',
    pageNumber: true,
    pageNumberFormat: '- {page} -',
    position: 'center' as const,
    divider: false,
    height: 20,
    fontSize: 9,
    color: '#666666',
  },
  margin: {
    top: 25,
    bottom: 25,
    left: 25,
    right: 25,
  },
}

const masterConfig = reactive(props.modelValue ? { ...props.modelValue } : { ...defaultConfig })

const marginPresets = [
  { name: '标准', top: 25, bottom: 25, left: 25, right: 25 },
  { name: '窄边距', top: 15, bottom: 15, left: 15, right: 15 },
  { name: '宽边距', top: 35, bottom: 35, left: 35, right: 35 },
  { name: '书籍式', top: 25, bottom: 25, left: 30, right: 20 },
]

const pagePreviewStyle = computed(() => ({
  width: '140px',
  height: '200px',
}))

const headerStyle = computed(() => ({
  height: `${masterConfig.header.height * 0.5}px`,
  fontSize: `${masterConfig.header.fontSize * 0.5}px`,
  color: masterConfig.header.color,
  textAlign: masterConfig.header.position,
  padding: '0 8px',
}))

const footerStyle = computed(() => ({
  height: `${masterConfig.footer.height * 0.5}px`,
  fontSize: `${masterConfig.footer.fontSize * 0.5}px`,
  color: masterConfig.footer.color,
  textAlign: masterConfig.footer.position,
  padding: '0 8px',
}))

const bodyContentStyle = computed(() => ({
  top: `${masterConfig.margin.top * 0.5}px`,
  bottom: `${masterConfig.margin.bottom * 0.5}px`,
  left: `${masterConfig.margin.left * 0.5}px`,
  right: `${masterConfig.margin.right * 0.5}px`,
}))

const pageNumberFormat = computed(() => {
  return masterConfig.footer.pageNumberFormat
    .replace('{page}', '1')
    .replace('{total}', 'N')
})

const applyMarginPreset = (preset: any) => {
  masterConfig.margin.top = preset.top
  masterConfig.margin.bottom = preset.bottom
  masterConfig.margin.left = preset.left
  masterConfig.margin.right = preset.right
}

watch(masterConfig, (newVal) => {
  emit('update:modelValue', { ...newVal })
}, { deep: true })

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    Object.assign(masterConfig, newVal)
  }
}, { deep: true })
</script>

<style scoped>
.master-page-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.preview-section {
  padding: 16px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
}

.preview-label {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.page-preview {
  margin: 0 auto;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-bottom: none;
  flex-shrink: 0;
}

.header-content {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.header-divider {
  height: 1px;
  background: #ccc;
  margin-top: 4px;
}

.preview-body {
  flex: 1;
  position: relative;
  background: #fff;
}

.body-margin-indicator {
  position: absolute;
  background: #e3f2fd;
  opacity: 0.5;
}

.body-margin-indicator.top,
.body-margin-indicator.bottom {
  left: 0;
  right: 0;
  height: 1px;
}

.body-margin-indicator.left,
.body-margin-indicator.right {
  top: 0;
  bottom: 0;
  width: 1px;
}

.body-content {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px;
  font-size: 6px;
  color: #999;
  overflow: hidden;
  border: 1px dashed #e0e0e0;
}

.content-title {
  font-weight: bold;
  font-size: 8px;
  margin-bottom: 4px;
  color: #666;
}

.content-text {
  margin-bottom: 2px;
  line-height: 1.4;
}

.preview-footer {
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-top: none;
  flex-shrink: 0;
}

.footer-divider {
  height: 1px;
  background: #ccc;
  margin-bottom: 4px;
}

.footer-content {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.settings-section {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.margin-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.el-tabs__header) {
  margin-bottom: 16px;
}

:deep(.el-form-item) {
  margin-bottom: 14px;
}
</style>
