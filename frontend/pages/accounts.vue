<template>
  <div class="accounts-page">
    <div class="page-header">
      <div class="flex items-center gap-3">
        <el-button text @click="navigateTo('/')">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <h2 class="page-title">账号管理</h2>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          新增账号
        </el-button>
        <el-button @click="showImportDialog = true">
          <el-icon><Upload /></el-icon>
          批量导入
        </el-button>
        <el-button @click="loadAccounts">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 搜索筛选栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索用户名或姓名"
        clearable
        style="width: 260px"
        @clear="loadAccounts"
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select v-model="roleFilter" placeholder="按角色筛选" clearable style="width: 180px" @change="handleSearch">
        <el-option
          v-for="(label, key) in roleLabels"
          :key="key"
          :label="label"
          :value="key"
        />
      </el-select>
      <el-select v-if="isGlobalAdmin" v-model="teamFilter" placeholder="按团队筛选" clearable style="width: 140px" @change="handleSearch">
        <el-option label="Team 1" value="team1" />
        <el-option label="Team 2" value="team2" />
        <el-option label="Team 3" value="team3" />
      </el-select>
      <el-button type="primary" @click="handleSearch">搜索</el-button>
    </div>

    <!-- 账号列表 -->
    <el-table :data="accounts" v-loading="loading" stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户名/工号" width="120" />
      <el-table-column prop="realName" label="姓名" width="100" />
      <el-table-column label="团队" width="80">
        <template #default="{ row }">
          {{ teamCodeMap[row.teamCode] || row.teamCode }}
        </template>
      </el-table-column>
      <el-table-column label="当前角色" width="140">
        <template #default="{ row }">
          <el-tag size="small" type="primary">{{ roleLabels[row.role] || row.role }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="可访问角色" min-width="200">
        <template #default="{ row }">
          <el-tag
            v-for="role in (row.roles || [row.role])"
            :key="role"
            size="small"
            class="mr-1"
            style="margin-right: 4px"
          >
            {{ roleLabels[role] || role }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最后登录" width="160">
        <template #default="{ row }">
          {{ row.lastLoginAt ? formatDate(row.lastLoginAt) : '未登录' }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag v-if="row.lockedUntil && new Date(row.lockedUntil) > new Date()" type="danger" size="small">已锁定</el-tag>
          <el-tag v-else type="success" size="small">正常</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="showEditDialog(row)">编辑</el-button>
          <el-button size="small" type="warning" @click="showRolesDialog(row)">角色</el-button>
          <el-dropdown trigger="click" @command="(cmd) => handleAction(cmd, row)">
            <el-button size="small">
              更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="reset">重置密码</el-dropdown-item>
                <el-dropdown-item v-if="!row.lockedUntil || new Date(row.lockedUntil) <= new Date()" command="lock">锁定账号</el-dropdown-item>
                <el-dropdown-item v-else command="unlock">解锁账号</el-dropdown-item>
                <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadAccounts"
        @current-change="loadAccounts"
      />
    </div>

    <!-- 新增/编辑账号对话框 -->
    <el-dialog
      v-model="accountDialogVisible"
      :title="editingAccount ? '编辑账号' : '新增账号'"
      width="500px"
    >
      <el-form :model="accountForm" :rules="accountRules" ref="accountFormRef" label-width="100px">
        <el-form-item label="用户名/工号" prop="username">
          <el-input v-model="accountForm.username" placeholder="请输入用户名或工号" :disabled="!!editingAccount" />
          <p v-if="editingAccount" class="text-xs text-gray-400 mt-1">用户名/工号不可修改</p>
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!editingAccount">
          <el-input v-model="accountForm.password" type="password" placeholder="留空则使用默认密码（123456）" show-password />
        </el-form-item>
        <el-form-item label="身份证后6位" v-if="!editingAccount">
          <el-input v-model="accountForm.idCardLast6" placeholder="用于生成默认密码，可选" />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="accountForm.realName" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item label="团队" prop="teamCode">
          <el-select v-model="accountForm.teamCode" placeholder="请选择团队" style="width: 100%" :disabled="isCrewSupervisor">
            <el-option label="Team 1" value="team1" />
            <el-option label="Team 2" value="team2" />
            <el-option label="Team 3" value="team3" />
          </el-select>
        </el-form-item>
        <el-form-item label="当前角色" prop="role">
          <el-select v-model="accountForm.role" placeholder="请选择当前角色" style="width: 100%">
            <el-option
              v-for="(label, key) in roleLabels"
              :key="key"
              :label="label"
              :value="key"
              :disabled="isRoleDisabled(key)"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="accountDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAccount" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 角色分配对话框 -->
    <el-dialog v-model="rolesDialogVisible" title="分配角色" width="500px">
      <p class="dialog-desc">为用户 "{{ selectedAccount?.realName }}" 分配可访问的角色</p>
      <el-checkbox-group v-model="selectedRoles">
        <el-checkbox
          v-for="(label, key) in roleLabels"
          :key="key"
          :label="key"
          :disabled="isRoleDisabled(key)"
          style="display: block; margin-bottom: 8px"
        >
          {{ label }}
        </el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="rolesDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRoles" :loading="submitting">保存</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog v-model="resetPasswordVisible" title="重置密码" width="400px">
      <p class="dialog-desc">为用户 "{{ selectedAccount?.realName }}" 设置新密码</p>
      <el-form :model="resetPasswordForm" ref="resetFormRef">
        <el-form-item>
          <el-input
            v-model="resetPasswordForm.newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPasswordVisible = false">取消</el-button>
        <el-button type="primary" @click="submitResetPassword" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="showImportDialog" title="批量导入账号" width="560px">
      <div class="import-section">
        <p class="import-desc">请上传 Excel 文件（.xlsx），文件格式如下：</p>
        <el-table :data="importTemplate" border size="small" style="width: 100%; margin-bottom: 16px">
          <el-table-column prop="col" label="列" width="80" />
          <el-table-column prop="name" label="字段名" />
          <el-table-column prop="required" label="必填" width="60">
            <template #default="{ row }">
              <el-tag :type="row.required ? 'danger' : 'info'" size="small">{{ row.required ? '是' : '否' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <el-alert title="提示：密码留空时默认为 123456" type="info" :closable="false" style="margin-bottom: 16px" />

        <el-upload
          ref="uploadRef"
          drag
          :auto-upload="false"
          :on-change="handleFileChange"
          :limit="1"
          accept=".xlsx,.xls"
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">将 Excel 文件拖到此处，或 <em>点击上传</em></div>
          <template #tip>
            <div class="el-upload__tip">仅支持 .xlsx / .xls 格式</div>
          </template>
        </el-upload>

        <div v-if="importFile" style="margin-top: 12px">
          <el-tag type="success">{{ importFile.name }}</el-tag>
          <el-button type="primary" @click="submitImport" :loading="submitting" style="margin-left: 12px">
            开始导入
          </el-button>
        </div>

        <!-- 导入结果 -->
        <div v-if="importResult" style="margin-top: 16px">
          <el-alert :title="`导入完成：成功 ${importResult.success} 条，失败 ${importResult.failed} 条`" :type="importResult.failed > 0 ? 'warning' : 'success'" :closable="false" />
          <div v-if="importResult.errors && importResult.errors.length > 0" style="margin-top: 8px">
            <p style="font-size: 13px; color: #f56c6c; margin-bottom: 4px">错误详情：</p>
            <ul style="font-size: 12px; color: #666; max-height: 200px; overflow-y: auto; margin: 0">
              <li v-for="(err, idx) in importResult.errors" :key="idx">{{ err }}</li>
            </ul>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { Plus, Refresh, Search, ArrowDown, Upload, UploadFilled } from '@element-plus/icons-vue'

definePageMeta({
  middleware: ['auth'],
})

const {
  isGlobalAdmin,
  isCrewSupervisor,
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  resetPassword,
  batchImport,
  lockAccount,
  unlockAccount,
} = useAccount()

const authStore = useAuthStore()

// 角色显示名称映射
const roleLabels: Record<string, string> = {
  admin: '系统管理员',
  company_admin: '油轮船管部',
  general_manager: '总管团队',
  shore_crew_supervisor: '岸基船工主管',
  shore_marine_supervisor: '岸基海务主管',
  shore_engineer_supervisor: '岸基机务主管',
  shore_electric_supervisor: '岸基电气主管',
  ship_political_instructor: '船舶政委',
}

const teamCodeMap: Record<string, string> = {
  team1: 'Team 1',
  team2: 'Team 2',
  team3: 'Team 3',
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// 数据状态
const accounts = ref([])
const loading = ref(false)
const submitting = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const searchQuery = ref('')
const roleFilter = ref('')
const teamFilter = ref('')

// 账号对话框
const accountDialogVisible = ref(false)
const editingAccount = ref(null)
const accountFormRef = ref()
const accountForm = reactive({
  username: '',
  password: '',
  realName: '',
  teamCode: 'team2',
  role: 'ship_political_instructor',
  idCardLast6: '',
})

const accountRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  teamCode: [{ required: true, message: '请选择团队', trigger: 'change' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

// 角色对话框
const rolesDialogVisible = ref(false)
const selectedAccount = ref(null)
const selectedRoles = ref([])

// 重置密码对话框
const resetPasswordVisible = ref(false)
const resetPasswordForm = reactive({
  newPassword: '',
})

// 批量导入
const showImportDialog = ref(false)
const importFile = ref(null)
const importResult = ref(null)
const importTemplate = [
  { col: 'A', name: '用户名/工号', required: true },
  { col: 'B', name: '姓名', required: true },
  { col: 'C', name: '团队（team1/team2/team3）', required: false },
  { col: 'D', name: '角色', required: false },
  { col: 'E', name: '密码（留空默认123456）', required: false },
  { col: 'F', name: '工号', required: false },
  { col: 'G', name: '身份证后6位', required: false },
]

// 船工主管不能分配的角色
const isRoleDisabled = (role: string) => {
  if (!isCrewSupervisor.value) return false
  return role === 'admin' || role === 'shore_crew_supervisor'
}

const loadAccounts = async () => {
  loading.value = true
  try {
    const res = await getAccounts({
      page: currentPage.value,
      limit: pageSize.value,
      search: searchQuery.value || undefined,
      role: roleFilter.value || undefined,
      teamCode: teamFilter.value || undefined,
    })
    accounts.value = res.users
    total.value = res.total
  } catch (error) {
    console.error('加载账号列表失败:', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  loadAccounts()
}

const showCreateDialog = () => {
  editingAccount.value = null
  accountForm.username = ''
  accountForm.password = ''
  accountForm.realName = ''
  accountForm.teamCode = authStore.user?.teamCode || 'team2'
  accountForm.role = 'ship_political_instructor'
  accountForm.idCardLast6 = ''
  accountDialogVisible.value = true
}

const showEditDialog = (account) => {
  editingAccount.value = account
  accountForm.username = account.username
  accountForm.realName = account.realName
  accountForm.teamCode = account.teamCode
  accountForm.role = account.role
  accountForm.idCardLast6 = ''
  accountDialogVisible.value = true
}

const submitAccount = async () => {
  if (!accountFormRef.value) return
  await accountFormRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      if (editingAccount.value) {
        await updateAccount(editingAccount.value.id, {
          realName: accountForm.realName,
          teamCode: accountForm.teamCode,
          role: accountForm.role,
        })
        ElMessage.success('账号信息已更新')
      } else {
        const data: any = {
          username: accountForm.username,
          realName: accountForm.realName,
          teamCode: accountForm.teamCode,
          role: accountForm.role,
          roles: [accountForm.role],
        }
        if (accountForm.password) {
          data.password = accountForm.password
        }
        if (accountForm.idCardLast6) {
          data.idCardLast6 = accountForm.idCardLast6
        }
        await createAccount(data)
        ElMessage.success('账号已创建')
      }
      accountDialogVisible.value = false
      loadAccounts()
    } catch (error: any) {
      ElMessage.error(error.data?.message || error.message || '操作失败')
    } finally {
      submitting.value = false
    }
  })
}

const showRolesDialog = (account) => {
  selectedAccount.value = account
  selectedRoles.value = [...(account.roles || [account.role])]
  rolesDialogVisible.value = true
}

const submitRoles = async () => {
  if (selectedRoles.value.length === 0) {
    ElMessage.warning('至少需要选择一个角色')
    return
  }

  submitting.value = true
  try {
    await updateAccount(selectedAccount.value.id, {
      roles: selectedRoles.value,
    })
    ElMessage.success('角色已更新')
    rolesDialogVisible.value = false
    loadAccounts()
  } catch (error: any) {
    ElMessage.error(error.data?.message || error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const handleAction = async (action, account) => {
  selectedAccount.value = account

  if (action === 'reset') {
    resetPasswordForm.newPassword = ''
    resetPasswordVisible.value = true
  } else if (action === 'lock') {
    try {
      await lockAccount(account.id, 24)
      ElMessage.success('账号已锁定24小时')
      loadAccounts()
    } catch (error: any) {
      ElMessage.error(error.data?.message || error.message || '操作失败')
    }
  } else if (action === 'unlock') {
    try {
      await unlockAccount(account.id)
      ElMessage.success('账号已解锁')
      loadAccounts()
    } catch (error: any) {
      ElMessage.error(error.data?.message || error.message || '操作失败')
    }
  } else if (action === 'delete') {
    try {
      await ElMessageBox.confirm('确定要删除该账号吗？此操作不可恢复。', '确认删除', {
        type: 'warning',
      })
      await deleteAccount(account.id)
      ElMessage.success('账号已删除')
      loadAccounts()
    } catch (error: any) {
      if (error !== 'cancel') {
        ElMessage.error(error.data?.message || error.message || '删除失败')
      }
    }
  }
}

const submitResetPassword = async () => {
  if (resetPasswordForm.newPassword.length < 6) {
    ElMessage.warning('密码至少6位')
    return
  }

  submitting.value = true
  try {
    await resetPassword(selectedAccount.value.id, resetPasswordForm.newPassword)
    ElMessage.success('密码已重置')
    resetPasswordVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.data?.message || error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 批量导入相关
const handleFileChange = (file: any) => {
  importFile.value = file.raw
  importResult.value = null
}

const submitImport = async () => {
  if (!importFile.value) {
    ElMessage.warning('请选择文件')
    return
  }

  submitting.value = true
  try {
    const result = await batchImport(importFile.value)
    importResult.value = result
    if (result.success > 0) {
      loadAccounts()
    }
  } catch (error: any) {
    ElMessage.error(error.data?.message || error.message || '导入失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadAccounts()
})
</script>

<style scoped>
.accounts-page {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  background-color: #f5f7fa;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1A1A1A;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.dialog-desc {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #666;
}

.mr-1 {
  margin-right: 4px;
}

.import-section {
  padding: 8px 0;
}

.import-desc {
  margin: 0 0 12px;
  font-size: 14px;
  color: #666;
}
</style>
