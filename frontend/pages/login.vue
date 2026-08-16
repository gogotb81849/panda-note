<template>
  <div class="login-page">
    <!-- 左侧品牌区域 -->
    <div class="brand-side">
      <div class="brand-content">
        <div class="brand-logo">
          <PandaLogo white large />
        </div>
        <p class="brand-slogan">船舶政工智慧台账管理系统</p>
        <p class="brand-version">{{ serverVersion || fallbackVersion }}</p>
        <div class="brand-features">
          <div class="feature-item">
            <svg class="feature-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
            </svg>
            <span>多团队数据隔离 · 智能台账管理</span>
          </div>
          <div class="feature-item">
            <svg class="feature-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
            </svg>
            <span>AI 智能简报 · 一键生成报告</span>
          </div>
          <div class="feature-item">
            <svg class="feature-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.657.359-3.224 1-4.636"/>
            </svg>
            <span>离线同步 · 船上实时记录</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧登录区域 -->
    <div class="form-side">
      <div class="form-container">
        <div class="form-header">
          <h2 class="form-title">欢迎登录</h2>
          <p class="form-subtitle">请输入您的账号信息</p>
        </div>

        <el-form :model="form" :rules="rules" ref="formRef" label-width="0" class="login-form">
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="用户名"
              size="large"
              class="input-field"
              @focus="showSavedAccounts = true"
              @blur="() => setTimeout(() => showSavedAccounts = false, 200)"
            >
              <template #prefix>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </template>
            </el-input>
            <!-- 记住账号下拉 -->
            <div v-if="showSavedAccounts && savedAccounts.length > 0" class="saved-accounts-dropdown">
              <div
                v-for="name in savedAccounts"
                :key="name"
                class="saved-account-item"
                @mousedown.prevent="selectSavedAccount(name)"
              >
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                <span>{{ name }}</span>
                <svg
                  class="w-3 h-3 text-gray-300 ml-auto remove-account"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  @mousedown.prevent.stop="removeSavedAccount(name)"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </div>
            </div>
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码"
              size="large"
              show-password
              class="input-field"
              @keyup.enter="handleLogin"
            >
              <template #prefix>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="mb-0 mt-2">
            <el-button
              type="primary"
              class="w-full btn-login !h-12 !text-base"
              :loading="loading"
              @click="handleLogin"
            >
              登录
            </el-button>
          </el-form-item>
        </el-form>

        <!-- 修改密码链接 -->
        <div class="change-password-link">
          <a @click="showChangePassword = true">修改密码</a>
        </div>

        <!-- 离线登录入口 -->
        <div v-if="hasLocalData" class="offline-login-section">
          <el-divider>
            <span class="divider-text">或</span>
          </el-divider>
          <el-button
            class="w-full btn-offline-login !h-12 !text-base"
            @click="handleOfflineLogin"
          >
            <el-icon><Download /></el-icon>
            <span>使用本地数据登录（离线模式）</span>
          </el-button>
          <p class="offline-hint">
            {{ isOffline ? '当前处于离线状态，可使用本地数据' : '已下载本地数据，断网时可直接使用' }}
          </p>
        </div>

        <div v-if="isDev" class="dev-hint">
          <p class="dev-title">开发环境测试账号：</p>
          <p>岸基主管：<code>shore_crew</code> / <code>admin123</code></p>
          <p>船舶政委：<code>ship_political</code> / <code>admin123</code></p>
          <p>测试用户：<code>gogotb</code> / <code>123456</code></p>
        </div>
      </div>
    </div>

    <!-- 修改密码对话框 -->
    <el-dialog v-model="showChangePassword" title="修改密码" width="400px" :close-on-click-modal="false">
      <el-form :model="changePasswordForm" :rules="changePasswordRules" ref="changePwdFormRef" label-width="0">
        <el-form-item prop="username">
          <el-input v-model="changePasswordForm.username" placeholder="用户名" size="large">
            <template #prefix>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="currentPassword">
          <el-input v-model="changePasswordForm.currentPassword" type="password" placeholder="当前密码" size="large" show-password>
            <template #prefix>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="newPassword">
          <el-input v-model="changePasswordForm.newPassword" type="password" placeholder="新密码（至少6位）" size="large" show-password>
            <template #prefix>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input v-model="changePasswordForm.confirmPassword" type="password" placeholder="确认新密码" size="large" show-password>
            <template #prefix>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showChangePassword = false">取消</el-button>
        <el-button type="primary" :loading="changingPassword" @click="handleChangePassword">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useOfflineData } from '~/composables/useOfflineData';
import { ElMessage } from 'element-plus';
import { Download } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';

const authStore = useAuthStore();
const offlineData = useOfflineData();
const formRef = ref<FormInstance>();
const loading = ref(false);
const isDev = process.env.NODE_ENV === 'development';
const config = useRuntimeConfig();
const hasLocalData = ref(false);
const isOffline = ref(false);
const fallbackVersion = computed(() => {
  const version = config.public.appVersion;
  return version && version !== 'undefined' ? `v${version}` : 'v1.1.0.0026';
});

const serverVersion = ref('');
const fetchServerVersion = async () => {
  try {
    const apiBase = config.public.apiBase;
    const url = `${apiBase}/version/info?t=${Date.now()}`;
    const data = await $fetch<any>(url);
    if (data && data.version && data.version !== 'undefined') {
      serverVersion.value = `v${data.version}`;
    }
  } catch {
    // 忽略版本获取失败
  }
};

onMounted(() => {
  fetchServerVersion();
  checkLocalData();
  loadSavedAccounts();
  
  // 监听网络状态
  isOffline.value = !navigator.onLine;
  window.addEventListener('online', () => { isOffline.value = false; });
  window.addEventListener('offline', () => { isOffline.value = true; });
});

const checkLocalData = async () => {
  try {
    const stats = await offlineData.getStats();
    hasLocalData.value = stats.totalRecords > 0;
  } catch {
    hasLocalData.value = false;
  }
};

const handleOfflineLogin = async () => {
  try {
    // 从本地存储获取用户信息（auth store 使用的键名）
    const localUser = localStorage.getItem('auth_user');
    const localToken = localStorage.getItem('auth_token');
    
    if (!localUser || !localToken) {
      ElMessage.warning('未找到本地登录信息，请先在线登录一次');
      return;
    }
    
    // 恢复登录状态
    const user = JSON.parse(localUser);
    authStore.user = user;
    authStore.token = localToken;
    
    ElMessage.success('已使用本地数据登录（离线模式）');
    window.location.href = '/';
  } catch (error) {
    ElMessage.error('离线登录失败，请重新在线登录');
  }
};

const form = reactive({
  username: '',
  password: '',
});

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

// ===== 记住账号功能 =====
const savedAccounts = ref<string[]>([]);
const showSavedAccounts = ref(false);

const loadSavedAccounts = () => {
  try {
    const saved = localStorage.getItem('saved_usernames');
    if (saved) savedAccounts.value = JSON.parse(saved);
  } catch {
    savedAccounts.value = [];
  }
};

const saveAccount = (username: string) => {
  if (!username) return;
  const list = savedAccounts.value.filter(n => n !== username);
  list.unshift(username);
  savedAccounts.value = list.slice(0, 15);
  localStorage.setItem('saved_usernames', JSON.stringify(savedAccounts.value));
};

const removeSavedAccount = (name: string) => {
  savedAccounts.value = savedAccounts.value.filter(n => n !== name);
  localStorage.setItem('saved_usernames', JSON.stringify(savedAccounts.value));
};

const selectSavedAccount = (name: string) => {
  form.username = name;
  showSavedAccounts.value = false;
};

// ===== 修改密码功能 =====
const showChangePassword = ref(false);
const changingPassword = ref(false);
const changePwdFormRef = ref<FormInstance>();

const changePasswordForm = reactive({
  username: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const changePasswordRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (value !== changePasswordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
};

const handleChangePassword = async () => {
  if (!changePwdFormRef.value) return;
  try {
    await changePwdFormRef.value.validate();
  } catch {
    return;
  }

  changingPassword.value = true;
  try {
    const apiBase = config.public.apiBase;
    await $fetch(`${apiBase}/auth/change-password`, {
      method: 'POST',
      body: {
        username: changePasswordForm.username,
        currentPassword: changePasswordForm.currentPassword,
        newPassword: changePasswordForm.newPassword,
      },
    });
    ElMessage.success('密码修改成功，请使用新密码登录');
    showChangePassword.value = false;
    form.username = changePasswordForm.username;
    form.password = '';
    changePasswordForm.currentPassword = '';
    changePasswordForm.newPassword = '';
    changePasswordForm.confirmPassword = '';
  } catch (error: any) {
    const message = error?.data?.message || error?.message || '密码修改失败';
    ElMessage.error(message);
  } finally {
    changingPassword.value = false;
  }
};

const handleLogin = async () => {
  console.log('[登录调试] ① handleLogin 被触发', { username: form.username, hasPwd: !!form.password });

  if (!formRef.value) {
    console.error('[登录调试] ② formRef 为 null，表单未初始化');
    ElMessage.error('表单未初始化，请刷新页面重试');
    return;
  }

  try {
    await formRef.value.validate();
    console.log('[登录调试] ③ 表单验证通过');
  } catch {
    console.warn('[登录调试] ③ 表单验证失败');
    ElMessage.warning('请填写用户名和密码');
    return;
  }

  loading.value = true;
  console.log('[登录调试] ④ loading=true，开始调用 authStore.login()，时间：', new Date().toISOString());

  try {
    const result = await authStore.login(form);
    console.log('[登录调试] ⑤ authStore.login() 返回：', result);

    if (result && result.success) {
      console.log('[登录调试] ⑥ 登录成功，跳转 /');
      saveAccount(form.username);
      window.location.href = '/';
    } else {
      const status = result?.status;
      const message = result?.message || '登录失败';
      console.error('[登录调试] ⑥ 登录失败：', { status, message });

      if (status === 401 || message.includes('用户名或密码错误')) {
        ElMessage.error('用户名或密码错误');
      } else if (status === 429) {
        ElMessage.error('登录尝试次数过多，请稍后再试');
      } else if (status === 500) {
        ElMessage.error('服务器内部错误，请稍后重试');
      } else if (!status || status === 0) {
        ElMessage.error('无法连接到服务器，请检查网络后重试');
      } else {
        ElMessage.error(message);
      }
    }
  } catch (error: any) {
    console.error('[登录调试] ⑤ authStore.login() 抛出异常：', error);
    const message = error?.data?.message || error?.response?._data?.message || error?.message || '登录失败，请检查网络后重试';
    ElMessage.error(message);
  } finally {
    loading.value = false;
    console.log('[登录调试] ⑦ loading=false，handleLogin 结束');
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  background: #f5f7fa;
}

/* 左侧品牌区域 */
.brand-side {
  flex: 1;
  display: none;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(135deg, #2C3E50 0%, #34495E 50%, #5B7FA6 100%);
}

@media (min-width: 768px) {
  .brand-side {
    display: flex;
  }
}

.brand-side::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E");
  opacity: 0.6;
}

.brand-content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 40px;
  max-width: 420px;
}

.brand-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  width: 240px;
  height: 240px;
}

.brand-title {
  font-size: 40px;
  font-weight: 800;
  color: white;
  letter-spacing: 4px;
  margin: 0 0 12px 0;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.brand-slogan {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.75);
  margin: 0 0 8px 0;
  letter-spacing: 1px;
}

.brand-version {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
  margin: 0 0 40px 0;
  font-family: 'Courier New', monospace;
  letter-spacing: 2px;
}

.brand-features {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
}

.feature-icon {
  flex-shrink: 0;
  width: 20px !important;
  height: 20px !important;
  opacity: 0.9;
}

/* 右侧登录区域 */
.form-side {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  max-width: 500px;
  min-width: 0;
}

@media (min-width: 768px) {
  .form-side {
    flex: 0 0 480px;
    max-width: 480px;
  }
}

.form-container {
  width: 100%;
  max-width: 380px;
}

.form-header {
  margin-bottom: 36px;
}

.form-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.form-subtitle {
  font-size: 15px;
  color: #808080;
  margin: 0;
}

.login-form {
  margin-bottom: 16px;
}

/* 修改密码链接 */
.change-password-link {
  text-align: right;
  margin-bottom: 16px;
}

.change-password-link a {
  font-size: 13px;
  color: #5B7FA6;
  cursor: pointer;
  text-decoration: none;
}

.change-password-link a:hover {
  color: #4A6B8A;
  text-decoration: underline;
}

/* 记住账号下拉 */
.saved-accounts-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-height: 240px;
  overflow-y: auto;
}

.saved-account-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.saved-account-item:hover {
  background: #f3f4f6;
}

.saved-account-item span {
  font-size: 14px;
  color: #374151;
  flex: 1;
}

.saved-account-item .remove-account:hover {
  color: #ef4444;
}

.dev-hint {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  font-size: 12px;
  color: #808080;
  line-height: 1.8;
}

.dev-hint .dev-title {
  font-weight: 600;
  color: #6b7280;
  margin: 0 0 4px 0;
}

.dev-hint code {
  background: #f3f4f6;
  padding: 1px 6px;
  border-radius: 4px;
  font-family: monospace;
  color: #374151;
  font-size: 12px;
}

/* 登录按钮样式 - 匹配品牌色 */
:deep(.btn-login.el-button--primary) {
  background: linear-gradient(135deg, #5B7FA6 0%, #4A6B8A 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(91, 127, 166, 0.3);
  transition: all 0.3s ease;
}

:deep(.btn-login.el-button--primary:hover) {
  background: linear-gradient(135deg, #6A8FB5 0%, #5B7FA6 100%);
  box-shadow: 0 6px 16px rgba(91, 127, 166, 0.4);
  transform: translateY(-1px);
}

:deep(.btn-login.el-button--primary:active) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(91, 127, 166, 0.3);
}

/* 离线登录区域 */
.offline-login-section {
  margin-top: 16px;
}

.offline-login-section .divider-text {
  font-size: 12px;
  color: #9ca3af;
}

:deep(.btn-offline-login) {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  color: #4b5563;
  transition: all 0.3s ease;
}

:deep(.btn-offline-login:hover) {
  background: #e5e7eb;
  border-color: #d1d5db;
  color: #1f2937;
}

.offline-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
}
</style>
