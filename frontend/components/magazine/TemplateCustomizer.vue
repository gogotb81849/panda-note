<template>
  <div class="template-customizer">
    <el-tabs v-model="activeTab">
      <!-- 基础设置 -->
      <el-tab-pane label="基础设置" name="basic">
        <el-form label-width="100px">
          <el-form-item label="模板名称">
            <el-input v-model="template.name" placeholder="请输入模板名称" />
          </el-form-item>
          
          <el-form-item label="模板描述">
            <el-input v-model="template.description" type="textarea" :rows="3" placeholder="请输入模板描述" />
          </el-form-item>
          
          <el-form-item label="页面尺寸">
            <el-select v-model="pageSize" placeholder="请选择页面尺寸">
              <el-option label="A4 (210×297mm)" value="A4" />
              <el-option label="A5 (148×210mm)" value="A5" />
              <el-option label="16开 (185×260mm)" value="16k" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="页码位置">
            <el-select v-model="template.headerConfig.pageNumberPosition">
              <el-option label="页脚居中" value="bottom-center" />
              <el-option label="页脚右对齐" value="bottom-right" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-tab-pane>
      
      <!-- 颜色方案 -->
      <el-tab-pane label="颜色" name="color">
        <div class="color-schemes">
          <div 
            v-for="scheme in colorSchemes" 
            :key="scheme.id"
            class="scheme-card"
            :class="{ active: selectedSchemeId === scheme.id }"
            @click="applyColorScheme(scheme)"
          >
            <div class="scheme-preview">
              <div class="color-bar" :style="{ backgroundColor: scheme.primary }"></div>
              <div class="color-bar" :style="{ backgroundColor: scheme.secondary }"></div>
              <div class="color-bar" :style="{ backgroundColor: scheme.accent }"></div>
            </div>
            <div class="scheme-name">{{ scheme.name }}</div>
          </div>
        </div>
        
        <el-divider>自定义颜色</el-divider>
        
        <div class="custom-colors">
          <div class="color-item">
            <span class="color-label">主色调</span>
            <ColorPicker v-model="customColors.primary" />
          </div>
          <div class="color-item">
            <span class="color-label">次要色</span>
            <ColorPicker v-model="customColors.secondary" />
          </div>
          <div class="color-item">
            <span class="color-label">强调色</span>
            <ColorPicker v-model="customColors.accent" />
          </div>
        </div>
      </el-tab-pane>
      
      <!-- 字体设置 -->
      <el-tab-pane label="字体" name="font">
        <el-form label-width="100px">
          <el-form-item label="字体组合">
            <el-select v-model="selectedFontCombo" @change="applyFontCombo" placeholder="请选择字体组合">
              <el-option 
                v-for="combo in fontCombinations" 
                :key="combo.id"
                :label="combo.title"
                :value="combo.id"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="标题字号">
            <el-slider v-model="template.styles.titleFontSize" :min="12" :max="24" show-input />
          </el-form-item>
          
          <el-form-item label="正文字号">
            <el-slider v-model="template.styles.contentFontSize" :min="8" :max="14" show-input />
          </el-form-item>
          
          <el-form-item label="行高">
            <el-slider v-model="template.styles.lineHeight" :min="1.2" :max="2.0" :step="0.1" show-input />
          </el-form-item>
        </el-form>
      </el-tab-pane>
      
      <!-- 布局设置 -->
      <el-tab-pane label="布局" name="layout">
        <el-form label-width="100px">
          <el-form-item label="默认布局">
            <el-radio-group v-model="defaultLayout">
              <el-radio label="single-column">单栏</el-radio>
              <el-radio label="two-column">双栏</el-radio>
              <el-radio label="three-column">三栏</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="首字下沉">
            <el-switch v-model="dropCap" />
          </el-form-item>
          
          <el-form-item label="页边距">
            <el-input-number v-model="marginValue" :min="10" :max="50" label="页边距" />
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>
    
    <!-- 预览区域 -->
    <div class="preview-area">
      <div class="preview-label">模板预览</div>
      <div class="template-preview" :style="previewStyle">
        <div class="preview-page">
          <div class="preview-header" :style="headerStyle">
            {{ template.name || '示例标题' }}
          </div>
          <div class="preview-content" :style="contentStyle">
            <div class="preview-title" :style="titleStyle">{{ template.name || '示例标题' }}</div>
            <p v-for="i in 3" :key="i" class="preview-paragraph">这是示例正文内容，用于预览模板效果。</p>
          </div>
          <div class="preview-footer" v-if="template.headerConfig?.hasPageNumber">
            <span :style="{ color: customColors.secondary }">- 1 -</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useAuthStore } from '~/stores/auth';

// 颜色方案
const colorSchemes = [
  { id: 'classic-blue', name: '经典蓝', primary: '#1a365d', secondary: '#2c5282', accent: '#4299e1' },
  { id: 'elegant-green', name: '雅致绿', primary: '#234e52', secondary: '#285e61', accent: '#38b2ac' },
  { id: 'warm-orange', name: '暖心橙', primary: '#c05621', secondary: '#dd6b20', accent: '#ed8936' },
  { id: 'simple-gray', name: '简约灰', primary: '#2d3748', secondary: '#4a5568', accent: '#718096' },
  { id: 'fresh-pink', name: '清新粉', primary: '#702459', secondary: '#97266d', accent: '#d53f8c' },
];

// 字体组合
const fontCombinations = [
  { id: 'serif-classic', title: '思源宋体', titleFont: 'SimSun', contentFont: 'SimSun' },
  { id: 'sans-modern', title: '思源黑体', titleFont: 'Microsoft YaHei', contentFont: 'Microsoft YaHei' },
  { id: 'hei-title', title: '黑体+宋体', titleFont: 'SimHei', contentFont: 'SimSun' },
  { id: 'kai-regular', title: '楷体+宋体', titleFont: 'KaiTi', contentFont: 'SimSun' },
];

// 颜色选择器组件
const ColorPicker = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props: any, { emit }: any) {
    return () => (
      h('div', { class: 'color-picker-group' }, [
        h('input', {
          type: 'color',
          value: props.modelValue,
          onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
          class: 'color-input'
        }),
        h('span', { class: 'color-value' }, props.modelValue),
        h('div', { class: 'preset-colors' }, [
          h('div', { 
            class: 'preset-color',
            style: { backgroundColor: '#333' },
            onClick: () => emit('update:modelValue', '#333')
          }),
          h('div', { 
            class: 'preset-color',
            style: { backgroundColor: '#666' },
            onClick: () => emit('update:modelValue', '#666')
          }),
          h('div', { 
            class: 'preset-color',
            style: { backgroundColor: '#999' },
            onClick: () => emit('update:modelValue', '#999')
          }),
        ])
      ])
    );
  }
};

// 导入 h 函数用于渲染
import { h } from 'vue';

const emit = defineEmits<{
  (e: 'update', template: any): void;
  (e: 'save', template: any): void;
}>();

const activeTab = ref('basic');
const selectedSchemeId = ref('');
const selectedFontCombo = ref('');
const pageSize = ref('A4');
const defaultLayout = ref('single-column');
const dropCap = ref(false);
const marginValue = ref(20);

const customColors = reactive({
  primary: '#1a365d',
  secondary: '#2c5282',
  accent: '#4299e1',
});

const template = reactive({
  id: '',
  name: '自定义模板',
  description: '个性化杂志模板',
  pageConfig: {
    width: 210,
    height: 297,
    margin: { top: 20, bottom: 20, left: 25, right: 25 },
  },
  headerConfig: {
    height: 15,
    hasPageNumber: true,
    pageNumberPosition: 'bottom-center' as const,
  },
  styles: {
    titleFont: 'Microsoft YaHei',
    titleFontSize: 16,
    contentFont: 'Microsoft YaHei',
    contentFontSize: 10,
    lineHeight: 1.5,
    paragraphSpacing: 6,
  },
  sectionStyles: [{ name: '默认', layout: 'single-column' as const }],
});

// 页面尺寸映射
const pageSizeMap: Record<string, { width: number; height: number }> = {
  'A4': { width: 210, height: 297 },
  'A5': { width: 148, height: 210 },
  '16k': { width: 185, height: 260 },
};

// 监听页面尺寸变化
watch(pageSize, (val) => {
  const size = pageSizeMap[val];
  if (size) {
    template.pageConfig.width = size.width;
    template.pageConfig.height = size.height;
  }
});

// 监听布局变化
watch(defaultLayout, (val) => {
  if (template.sectionStyles.length > 0) {
    template.sectionStyles[0].layout = val as 'single-column' | 'two-column' | 'three-column';
  }
});

// 应用颜色方案
const applyColorScheme = (scheme: any) => {
  selectedSchemeId.value = scheme.id;
  customColors.primary = scheme.primary;
  customColors.secondary = scheme.secondary;
  customColors.accent = scheme.accent;
};

// 应用字体组合
const applyFontCombo = (comboId: string) => {
  const combo = fontCombinations.find(c => c.id === comboId);
  if (combo) {
    template.styles.titleFont = combo.titleFont;
    template.styles.contentFont = combo.contentFont;
  }
};

// 预览样式
const previewStyle = computed(() => ({
  width: `${template.pageConfig.width * 0.5}px`,
  height: `${template.pageConfig.height * 0.5}px`,
  backgroundColor: '#ffffff',
  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
}));

const headerStyle = computed(() => ({
  backgroundColor: customColors.primary,
  color: '#ffffff',
  height: `${template.headerConfig.height}px`,
  lineHeight: `${template.headerConfig.height}px`,
}));

const contentStyle = computed(() => ({
  padding: `${template.pageConfig.margin.top * 0.5}px ${template.pageConfig.margin.left * 0.5}px`,
  color: customColors.secondary,
}));

const titleStyle = computed(() => ({
  fontFamily: template.styles.titleFont,
  fontSize: `${template.styles.titleFontSize * 0.5}px`,
  color: customColors.primary,
  marginBottom: '8px',
}));

// 监听模板变化，通知父组件
watch(template, () => {
  emit('update', { ...template });
}, { deep: true });

// 获取样式选项
const fetchStyleOptions = async () => {
  try {
    const response = await fetch('/api/magazine/style-options', {
      headers: {
        Authorization: `Bearer ${useAuthStore().token}`,
      },
    });
    const data = await response.json();
    // 使用服务端返回的选项（如果有）
  } catch (error) {
    console.error('获取样式选项失败:', error);
  }
};

// 生成预览
const generatePreview = async () => {
  try {
    const response = await fetch('/api/magazine/template/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${useAuthStore().token}`,
      },
      body: JSON.stringify(template),
    });
    const data = await response.json();
    return data.preview;
  } catch (error) {
    console.error('生成预览失败:', error);
    return null;
  }
};

// 保存模板
const saveTemplate = async () => {
  try {
    const response = await fetch('/api/magazine/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${useAuthStore().token}`,
      },
      body: JSON.stringify(template),
    });
    const data = await response.json();
    emit('save', data);
    return data;
  } catch (error) {
    console.error('保存模板失败:', error);
    return null;
  }
};

// 暴露方法给父组件
defineExpose({
  generatePreview,
  saveTemplate,
});
</script>

<style scoped>
.template-customizer {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
}

.color-schemes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.scheme-card {
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.scheme-card:hover {
  border-color: #409eff;
}

.scheme-card.active {
  border-color: #409eff;
  background-color: #f0f7ff;
}

.scheme-preview {
  display: flex;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.color-bar {
  flex: 1;
}

.scheme-name {
  font-size: 12px;
  text-align: center;
  color: #333;
}

.custom-colors {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.color-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-label {
  width: 80px;
  font-size: 14px;
  color: #666;
}

.color-picker-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-input {
  width: 40px;
  height: 32px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
}

.color-value {
  font-size: 12px;
  color: #666;
  font-family: monospace;
}

.preset-colors {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.preset-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #dcdfe6;
}

.preset-color:hover {
  transform: scale(1.1);
}

.preview-area {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e8e8e8;
}

.preview-label {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 16px;
}

.template-preview {
  margin: 0 auto;
  border-radius: 4px;
  overflow: hidden;
}

.preview-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
}

.preview-header {
  padding: 0 12px;
  text-align: center;
  font-weight: bold;
  font-size: 12px;
}

.preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.preview-title {
  font-weight: bold;
  margin-bottom: 4px;
}

.preview-paragraph {
  margin: 0;
  font-size: 8px;
  line-height: 1.4;
  color: #666;
}

.preview-footer {
  text-align: center;
  padding: 4px;
  font-size: 10px;
}
</style>
