<template>
  <div class="template-selector">
    <div class="template-grid">
      <div 
        v-for="template in templates" 
        :key="template.id"
        class="template-card"
        :class="{ active: selectedId === template.id }"
        @click="selectTemplate(template)"
      >
        <div class="template-preview">
          <div 
            class="preview-header" 
            :style="{ 
              backgroundColor: template.headerConfig?.backgroundColor || '#333',
              color: template.headerConfig?.titleColor || '#fff',
              fontSize: `${Math.min(template.headerConfig?.fontSize || 12, 16)}px`
            }"
          >
            {{ template.name }}
          </div>
          <div class="preview-content">
            <div class="preview-line title" :style="{ fontSize: `${Math.min(template.styles?.titleFontSize || 14, 12)}px` }"></div>
            <div class="preview-line"></div>
            <div class="preview-line"></div>
            <div class="preview-line short"></div>
            <div class="preview-columns" v-if="template.sectionStyles?.[0]?.layout === 'two-column'">
              <div class="preview-col"></div>
              <div class="preview-col"></div>
            </div>
          </div>
        </div>
        <div class="template-name">{{ template.name }}</div>
        <div class="template-desc">{{ template.description }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '~/stores/auth';

interface MagazineTemplate {
  id: string;
  name: string;
  description: string;
  headerConfig?: {
    backgroundColor?: string;
    titleColor?: string;
    fontSize?: number;
    height?: number;
  };
  styles?: {
    titleFontSize?: number;
    contentFontSize?: number;
  };
  sectionStyles?: Array<{
    name: string;
    layout: string;
  }>;
}

const emit = defineEmits<{
  (e: 'select', template: MagazineTemplate): void;
}>();

const templates = ref<MagazineTemplate[]>([]);
const selectedId = ref<string>('');
const loading = ref(false);

const fetchTemplates = async () => {
  loading.value = true;
  try {
    const response = await fetch('/api/magazine/templates', {
      headers: {
        Authorization: `Bearer ${useAuthStore().token}`,
      },
    });
    const data = await response.json();
    templates.value = data;
    if (data.length > 0 && !selectedId.value) {
      selectedId.value = data[0].id;
      emit('select', data[0]);
    }
  } catch (error) {
    console.error('获取模板列表失败:', error);
  } finally {
    loading.value = false;
  }
};

const selectTemplate = (template: MagazineTemplate) => {
  selectedId.value = template.id;
  emit('select', template);
};

onMounted(() => {
  fetchTemplates();
});
</script>

<style scoped>
.template-selector {
  padding: 16px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.template-card {
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.template-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.template-card.active {
  border-color: #409eff;
  background-color: #f0f7ff;
}

.template-preview {
  background-color: #fff;
  aspect-ratio: 210 / 297;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  padding: 8px 12px;
  font-weight: bold;
  text-align: center;
}

.preview-content {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-line {
  height: 6px;
  background-color: #e8e8e8;
  border-radius: 2px;
}

.preview-line.title {
  height: 8px;
  background-color: #333;
  width: 80%;
}

.preview-line.short {
  width: 60%;
}

.preview-columns {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.preview-col {
  flex: 1;
  height: 40px;
  background-color: #f0f0f0;
  border-radius: 2px;
}

.template-name {
  padding: 12px 12px 4px;
  font-weight: bold;
  font-size: 14px;
  color: #333;
}

.template-desc {
  padding: 0 12px 12px;
  font-size: 12px;
  color: #999;
}
</style>
