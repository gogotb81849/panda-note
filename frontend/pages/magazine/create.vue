<template>
  <div class="create-magazine-page">
    <div class="page-header">
      <el-button text @click="$router.back()">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h2>创建杂志</h2>
    </div>

    <div class="create-form">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="杂志名称" prop="title">
          <el-input v-model="form.title" placeholder="请输入杂志名称" maxlength="100" show-word-limit />
        </el-form-item>

        <el-form-item label="选择模板" prop="templateId">
          <div class="template-grid">
            <div
              v-for="template in templates"
              :key="template.id"
              class="template-card"
              :class="{ selected: form.templateId === template.id }"
              @click="form.templateId = template.id"
            >
              <div class="template-preview">
                <div class="preview-a4">
                  <div class="preview-header"></div>
                  <div class="preview-content">
                    <div class="preview-line"></div>
                    <div class="preview-line short"></div>
                    <div class="preview-line"></div>
                  </div>
                </div>
              </div>
              <div class="template-info">
                <h4>{{ template.name }}</h4>
                <p>{{ template.description }}</p>
              </div>
              <div v-if="form.templateId === template.id" class="selected-badge">
                <el-icon><Check /></el-icon>
              </div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="总页数" prop="totalPages">
          <el-input-number v-model="form.totalPages" :min="4" :max="64" />
        </el-form-item>

        <el-form-item label="团队" prop="teamCode">
          <el-select v-model="form.teamCode" placeholder="选择团队">
            <el-option label="Team 1" value="team1" />
            <el-option label="Team 2" value="team2" />
            <el-option label="Team 3" value="team3" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleCreate" :loading="creating">创建杂志</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '~/composables/useApi'
import { useAuthStore } from '~/stores/auth'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Check } from '@element-plus/icons-vue'

const router = useRouter()
const api = useApi()
const authStore = useAuthStore()
const formRef = ref()
const creating = ref(false)
const templates = ref<any[]>([])

const form = reactive({
  title: '',
  templateId: 'business-classic',
  totalPages: 8,
  teamCode: authStore.user?.teamCode || 'team1',
})

const rules = {
  title: [{ required: true, message: '请输入杂志名称', trigger: 'blur' }],
  templateId: [{ required: true, message: '请选择模板', trigger: 'change' }],
}

const loadTemplates = async () => {
  try {
    templates.value = await api.magazine.getTemplates()
  } catch (error) {
    ElMessage.error('加载模板失败')
  }
}

const handleCreate = async () => {
  try {
    await formRef.value.validate()
    creating.value = true
    const magazine = await api.magazine.create(form)
    ElMessage.success('杂志创建成功')
    router.push(`/magazine/${magazine.id}`)
  } catch (error: any) {
    if (error !== false) {
      ElMessage.error('创建失败')
    }
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.create-magazine-page {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.create-form {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 32px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.template-card {
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.template-card:hover {
  border-color: var(--color-primary);
}

.template-card.selected {
  border-color: var(--color-accent);
  background: var(--color-primary-light);
}

.template-preview {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.preview-a4 {
  width: 80px;
  height: 100px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-header {
  height: 8px;
  background: #f0f0f0;
  border-radius: 2px;
  margin-bottom: 4px;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.preview-line {
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
}

.preview-line.short {
  width: 60%;
}

.template-info h4 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.template-info p {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.selected-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: var(--color-accent);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .template-grid {
    grid-template-columns: 1fr;
  }
}
</style>
