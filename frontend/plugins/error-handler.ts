import type { ErrorHandler } from 'vue';
import { ElMessage } from 'element-plus';

export default defineNuxtPlugin((nuxtApp) => {
  const errorHandler: ErrorHandler = (error, instance) => {
    console.error('Vue 全局错误:', error);
    
    if (process.client) {
      const message = error.message || '发生未知错误';
      
      try {
        ElMessage.error(`系统错误: ${message}`);
      } catch {
        console.error('无法显示错误提示');
      }
    }
  };

  nuxtApp.vueApp.config.errorHandler = errorHandler;
});