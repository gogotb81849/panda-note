<template>
  <el-dialog
    v-model="dialogVisible"
    title="编辑模板"
    width="900px"
    :close-on-click-modal="false"
  >
    <div class="template-edit-dialog">
      <div class="template-selector">
        <el-select v-model="selectedType" @change="onTypeChange" style="width: 200px;">
          <el-option value="daily" label="日报模板" />
          <el-option value="weekly" label="周报模板" />
          <el-option value="halfmonth" label="半月报模板" />
          <el-option value="monthly" label="月报模板" />
          <el-option value="quarterly" label="季报模板" />
          <el-option value="halfyear" label="半年报模板" />
          <el-option value="yearly" label="年度报告模板" />
        </el-select>
      </div>
      <div class="template-editor">
        <el-input
          v-model="editingContent"
          type="textarea"
          :rows="25"
          placeholder="在此编辑模板内容..."
        />
      </div>
      <div class="template-actions">
        <el-button @click="handleReset">重置模板</el-button>
        <el-button type="primary" @click="handleSave">保存模板</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  modelValue: boolean
  currentReportType: string
  defaultTemplates: Record<string, string>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'templateSaved': [type: string, content: string]
}>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const selectedType = ref('daily')
const editingContent = ref('')
const customTemplates = ref<Record<string, string>>({})

watch(dialogVisible, (val) => {
  if (val) {
    selectedType.value = props.currentReportType
    loadCustomTemplates()
    loadTemplateForType(selectedType.value)
  }
})

const loadCustomTemplates = () => {
  const saved = localStorage.getItem('ai-report-templates')
  if (saved) {
    try {
      customTemplates.value = JSON.parse(saved)
    } catch {
      customTemplates.value = {}
    }
  }
}

const loadTemplateForType = (type: string) => {
  if (customTemplates.value[type]) {
    editingContent.value = customTemplates.value[type]
  } else {
    editingContent.value = props.defaultTemplates[type] || ''
  }
}

const onTypeChange = () => {
  loadTemplateForType(selectedType.value)
}

const handleReset = () => {
  editingContent.value = props.defaultTemplates[selectedType.value] || ''
  ElMessage.info('已重置为默认模板')
}

const handleSave = () => {
  if (!editingContent.value.trim()) {
    ElMessage.warning('模板内容不能为空')
    return
  }
  customTemplates.value[selectedType.value] = editingContent.value
  localStorage.setItem('ai-report-templates', JSON.stringify(customTemplates.value))
  ElMessage.success('模板保存成功！')
  emit('templateSaved', selectedType.value, editingContent.value)
}
</script>

<style scoped>
.template-edit-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.template-selector {
  display: flex;
  justify-content: flex-start;
}

.template-editor {
  width: 100%;
}

.template-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
