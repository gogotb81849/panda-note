<template>
  <!-- 悬浮帮助提示 -->
  <el-tooltip
    :content="content"
    :placement="placement"
    effect="light"
    :popper-class="popperClass"
  >
    <el-button
      circle
      size="small"
      class="help-btn"
      :class="{ 'always-show': alwaysShow }"
    >
      <el-icon><QuestionFilled /></el-icon>
    </el-button>
  </el-tooltip>
</template>

<script setup lang="ts">
import { QuestionFilled } from '@element-plus/icons-vue'

// Props
const props = withDefaults(defineProps<{
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  alwaysShow?: boolean
  popperClass?: string
}>(), {
  placement: 'top',
  alwaysShow: false,
  popperClass: 'help-tooltip-popper',
})
</script>

<style scoped>
.help-btn {
  width: 20px !important;
  height: 20px !important;
  min-height: 20px !important;
  padding: 0 !important;
  font-size: 12px !important;
  color: #909399 !important;
  background: transparent !important;
  border: 1px solid #dcdfe6 !important;
  opacity: 0;
  transition: all 0.2s ease;
}

.help-btn:hover {
  color: #409eff !important;
  border-color: #409eff !important;
  background: #ecf5ff !important;
}

.help-btn.always-show {
  opacity: 1;
}

/* 父容器hover时显示 */
.parent:hover .help-btn,
.el-form-item:hover .help-btn,
.el-input:hover .help-btn {
  opacity: 1;
}
</style>

<style>
/* 全局样式：帮助提示弹出框 */
.help-tooltip-popper {
  max-width: 300px;
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.5;
  background: #fff;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.help-tooltip-popper .el-tooltip__content {
  color: #606266;
}
</style>