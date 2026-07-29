<template>
  <div class="experiences-page">
    <!-- 左侧分类目录（可折叠） -->
    <div class="category-sidebar" :class="{ collapsed: categoryCollapsed }">
      <div class="sidebar-header">
        <h3 v-if="!categoryCollapsed">分类目录</h3>
        <el-button text @click="categoryCollapsed = !categoryCollapsed">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="categoryCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'" />
          </svg>
        </el-button>
      </div>
      
      <div v-if="!categoryCollapsed" class="category-tree">
        <div
          v-for="cat in categoryTree"
          :key="cat.id"
          class="category-item"
        >
          <div class="category-node" @click="toggleCategory(cat)">
            <span class="expand-icon" :class="{ expanded: cat.isExpanded }">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </span>
            <span class="category-icon">{{ cat.icon || '📁' }}</span>
            <span class="category-name" :style="{ color: cat.color }">{{ cat.name }}</span>
          </div>
          
          <!-- 子分类 -->
          <div v-if="cat.children && cat.children.length > 0 && cat.isExpanded" class="category-children">
            <div
              v-for="child in cat.children"
              :key="child.id"
              class="category-node child"
              :class="{ active: selectedCategory === child.name }"
              @click="selectCategory(child.name)"
            >
              <span class="category-icon">{{ child.icon || '📄' }}</span>
              <span class="category-name">{{ child.name }}</span>
            </div>
          </div>
        </div>
        
        <!-- 管理员分类管理按钮 -->
        <div v-if="isAdmin" class="category-admin">
          <el-button size="small" type="primary" plain @click="showCategoryDialog = true">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            管理分类
          </el-button>
        </div>
      </div>
    </div>

    <!-- 右侧主内容区 -->
    <div class="main-content">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-4 flex-wrap">
            <!-- 排序选择 -->
            <el-select v-model="sortField" class="w-36" @change="loadExperiences">
              <el-option label="最新发布" value="createdAt" />
              <el-option label="最高评分" value="rating" />
              <el-option label="最多评论" value="commentCount" />
              <el-option label="最多阅读" value="viewCount" />
              <el-option label="最多点赞" value="likeCount" />
            </el-select>
            
            <!-- 搜索框 -->
            <el-input
              v-model="keyword"
              placeholder="搜索经验..."
              clearable
              class="w-64"
              @keyup.enter="loadExperiences"
              @clear="loadExperiences"
            >
              <template #prefix>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </template>
            </el-input>
            
            <!-- 分类标签（移动端） -->
            <el-tag v-if="selectedCategory" closable @close="selectCategory('')">
              {{ selectedCategory }}
            </el-tag>
          </div>
          
          <div class="flex items-center gap-2">
            <!-- 权限管理入口（管理员） -->
            <el-button v-if="isAdmin" @click="showPermissionDialog = true">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              权限管理
            </el-button>
            
            <el-button type="primary" @click="showCreateDialog = true">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              新建经验
            </el-button>
          </div>
        </div>
      </div>

      <!-- 经验卡片列表 -->
      <div class="content-container">
        <div v-if="experiences.length === 0 && !loading" class="empty-state">
          <el-empty description="暂无经验文章" />
        </div>
        <div v-else class="card-grid">
          <el-card
            v-for="item in experiences"
            :key="item.id"
            class="experience-card cursor-pointer hover:shadow-lg transition-shadow"
            @click="openDetail(item)"
          >
            <div class="card-header">
              <el-tag type="primary" size="small" class="mb-2">{{ item.category }}</el-tag>
              <h3 class="card-title">{{ item.title }}</h3>
            </div>
            <div class="card-body">
              <p class="card-content">{{ truncateContent(item.content, 120) }}</p>
            </div>
            <div class="card-footer">
              <div class="flex items-center gap-2">
                <div class="author-info">
                  <svg class="w-4 h-4 text-[#808080]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span class="text-xs text-[#808080]">{{ getAuthorName(item) }}</span>
                </div>
                <span class="text-xs text-[#c0c0c0]">•</span>
                <span class="text-xs text-[#808080]">{{ formatDate(item.createdAt) }}</span>
              </div>
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-1">
                  <el-rate v-model="item.rating" disabled :max="5" size="small" />
                  <span class="text-xs text-[#808080]">({{ item.ratingCount ?? 0 }})</span>
                </div>
                <div class="flex items-center gap-1 text-[#808080]">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span class="text-xs">{{ item.commentCount ?? 0 }}</span>
                </div>
                <div class="flex items-center gap-1 text-[#808080]">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span class="text-xs">{{ item.likeCount ?? 0 }}</span>
                </div>
                <div class="flex items-center gap-1 text-[#808080]">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span class="text-xs">{{ item.viewCount ?? 0 }}</span>
                </div>
              </div>
            </div>
          </el-card>
        </div>
        
        <!-- 分页 -->
        <div v-if="totalPages > 1" class="pagination">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next"
            @current-change="loadExperiences"
          />
        </div>
      </div>
    </div>

    <!-- 创建经验对话框 -->
    <el-dialog v-model="showCreateDialog" title="新建经验" width="800px" :close-on-click-modal="false">
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="标题">
          <el-input v-model="createForm.title" placeholder="请输入经验标题" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="分类">
          <div class="flex items-center gap-2">
            <el-select v-model="createForm.category" placeholder="选择分类" class="flex-1">
              <el-option
                v-for="cat in allCategories"
                :key="cat.name"
                :label="cat.name"
                :value="cat.name"
              />
            </el-select>
            <el-button 
              type="primary" 
              plain 
              :loading="aiLoading"
              @click="getAISuggestion"
              :disabled="!createForm.title || !createForm.content"
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI推荐
            </el-button>
          </div>
        </el-form-item>
        
        <!-- AI推荐结果 -->
        <el-form-item v-if="aiSuggestion" label="AI推荐">
          <div class="ai-suggestion-box">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-[#409eff]">AI分类建议</span>
              <el-button type="primary" link size="small" @click="applyAISuggestion">采纳</el-button>
            </div>
            <el-tag type="primary" size="small" class="mr-2">{{ aiSuggestion.category }}</el-tag>
            <p class="text-xs text-[#808080] mt-2">{{ aiSuggestion.reason }}</p>
          </div>
        </el-form-item>
        
        <el-form-item label="内容">
          <div class="rich-editor-container">
            <el-input
              v-model="createForm.content"
              type="textarea"
              :rows="12"
              placeholder="请输入经验内容，支持富文本格式..."
              v-if="!showRichEditor"
            />
            <!-- 富文本编辑器占位（使用textarea模拟） -->
            <div v-else class="rich-editor-mock">
              <div class="editor-toolbar">
                <el-button size="small" @click="insertText('**', '**')"><b>B</b></el-button>
                <el-button size="small" @click="insertText('*', '*')"><i>I</i></el-button>
                <el-button size="small" @click="insertText('# ', '')">H</el-button>
                <el-button size="small" @click="insertText('- ', '')">•</el-button>
                <el-button size="small" @click="insertText('`', '`')">&lt;/&gt;</el-button>
                <el-button size="small" @click="showImageUpload = true">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </el-button>
              </div>
              <textarea
                v-model="createForm.content"
                class="editor-textarea"
                rows="12"
                placeholder="请输入经验内容..."
              />
            </div>
            <div class="flex items-center gap-2 mt-2">
              <el-switch v-model="showRichEditor" active-text="富文本模式" />
              <el-button size="small" type="primary" plain @click="showImageUpload = true">上传图片</el-button>
            </div>
          </div>
        </el-form-item>
        
        <el-form-item label="船舶">
          <el-input v-model="createForm.shipName" placeholder="可选，填写船舶名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleCloseCreateDialog">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="submitting">发布</el-button>
      </template>
    </el-dialog>

    <!-- 图片上传对话框 -->
    <el-dialog v-model="showImageUpload" title="上传图片" width="500px">
      <el-upload
        ref="uploadRef"
        class="image-uploader"
        :auto-upload="false"
        :limit="5"
        accept="image/*"
        list-type="picture"
      >
        <template #trigger>
          <el-button type="primary">选择图片</el-button>
        </template>
        <template #tip>
          <div class="text-xs text-[#808080] mt-2">支持 JPG、PNG、GIF 格式，最多5张</div>
        </template>
      </el-upload>
      <template #footer>
        <el-button @click="showImageUpload = false">关闭</el-button>
        <el-button type="primary" @click="handleImageUpload">上传</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="经验详情" width="800px" class="detail-dialog">
      <div v-if="currentExperience" class="detail-container">
        <div class="detail-header mb-4">
          <el-tag type="primary">{{ currentExperience.category }}</el-tag>
          <h2 class="text-xl font-semibold mt-2">{{ currentExperience.title }}</h2>
          <div class="flex items-center gap-4 mt-2 text-sm text-[#808080]">
            <span>{{ getAuthorName(currentExperience) }}</span>
            <span v-if="currentExperience.shipName">船舶: {{ currentExperience.shipName }}</span>
            <span>{{ formatDate(currentExperience.createdAt) }}</span>
          </div>
        </div>
        
        <div class="detail-actions flex items-center gap-6 mb-4">
          <div class="flex items-center gap-2">
            <span class="text-sm">评分:</span>
            <el-rate v-model="userRating" :max="5" @change="handleRate" />
            <span class="text-xs text-[#808080]">({{ currentExperience.ratingCount ?? 0 }} 人评分)</span>
          </div>
          <el-button :type="isLiked ? 'primary' : 'default'" @click="handleLike">
            <svg class="w-4 h-4 mr-1" :fill="isLiked ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {{ currentExperience.likeCount ?? 0 }}
          </el-button>
        </div>

        <div class="detail-content" v-html="formatContent(currentExperience.content)"></div>

        <el-divider />

        <!-- 评论区 - 二级嵌套 -->
        <div class="comment-section">
          <h3 class="text-base font-semibold mb-3">评论 ({{ currentExperience.commentCount ?? 0 }})</h3>
          
          <!-- 评论输入框 -->
          <div class="comment-input flex gap-2 mb-4">
            <el-input
              v-model="commentInput"
              type="textarea"
              :rows="2"
              :placeholder="replyToUser ? `回复 ${replyToUser}...` : '写下你的评论...'"
              class="flex-1"
            />
            <div class="flex flex-col gap-1">
              <el-button type="primary" @click="handleComment">发送</el-button>
              <el-button v-if="replyToUser" @click="cancelReply">取消回复</el-button>
            </div>
          </div>
          
          <!-- 评论列表 -->
          <div v-if="nestedComments.length > 0" class="comment-list">
            <div v-for="comment in nestedComments" :key="comment.id" class="comment-item">
              <div class="comment-main p-3 bg-gray-50 rounded">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium">{{ comment.user?.realName || '匿名用户' }}</span>
                    <span class="text-xs text-[#c0c0c0]">{{ formatDate(comment.createdAt) }}</span>
                  </div>
                  <el-button v-if="canDeleteComment(comment)" type="danger" size="small" text @click="handleDeleteComment(comment.id)">
                    删除
                  </el-button>
                </div>
                <p class="text-sm text-[#4A4A4A] mt-1 whitespace-pre-wrap">{{ comment.content }}</p>
                <div class="mt-2">
                  <el-button type="primary" size="small" text @click="startReply(comment)">回复</el-button>
                </div>
              </div>
              
              <!-- 二级回复 -->
              <div v-if="comment.replies && comment.replies.length > 0" class="reply-list ml-8 mt-2">
                <div
                  v-for="reply in comment.replies"
                  :key="reply.id"
                  class="reply-item p-2 bg-white rounded border"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium">{{ reply.user?.realName || '匿名' }}</span>
                      <span v-if="reply.replyToUserId" class="text-xs text-[#409eff]">回复 {{ reply.replyToUserId }}</span>
                      <span class="text-xs text-[#c0c0c0]">{{ formatDate(reply.createdAt) }}</span>
                    </div>
                    <el-button v-if="canDeleteComment(reply)" type="danger" size="small" text @click="handleDeleteComment(reply.id)">
                      删除
                    </el-button>
                  </div>
                  <p class="text-sm text-[#4A4A4A] mt-1 whitespace-pre-wrap">{{ reply.content }}</p>
                  <div class="mt-2">
                    <el-button type="primary" size="small" text @click="startReply(comment, reply)">回复</el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无评论" :image-size="60" />
        </div>
      </div>
    </el-dialog>

    <!-- 分类管理对话框 -->
    <el-dialog v-model="showCategoryDialog" title="分类管理" width="600px">
      <div class="category-management">
        <div class="flex items-center gap-2 mb-4">
          <el-input v-model="newCategoryName" placeholder="新分类名称" class="flex-1" />
          <el-color-picker v-model="newCategoryColor" />
          <el-button type="primary" @click="handleCreateCategory">添加</el-button>
        </div>
        
        <el-tree :data="categoryTree" :props="{ label: 'name', children: 'children' }" default-expand-all>
          <template #default="{ node, data }">
            <div class="flex items-center justify-between w-full pr-2">
              <div class="flex items-center gap-2">
                <span>{{ data.icon || '📁' }}</span>
                <span>{{ node.label }}</span>
              </div>
              <div class="flex items-center gap-1">
                <el-button type="primary" size="small" text @click="startEditCategory(data)">编辑</el-button>
                <el-button type="danger" size="small" text @click="handleDeleteCategory(data.id)">删除</el-button>
              </div>
            </div>
          </template>
        </el-tree>
      </div>
    </el-dialog>

    <!-- 权限管理对话框 -->
    <el-dialog v-model="showPermissionDialog" title="经验分享权限管理" width="700px">
      <div class="permission-management">
        <div class="mb-4">
          <h4 class="text-sm font-medium mb-2">授予临时权限</h4>
          <div class="flex items-center gap-2 flex-wrap">
            <el-select v-model="grantForm.userId" placeholder="选择用户" class="w-40">
              <el-option v-for="user in availableUsers" :key="user.id" :label="user.realName" :value="user.id" />
            </el-select>
            <el-select v-model="grantForm.permissionType" placeholder="权限类型" class="w-36">
              <el-option label="创建经验" value="create" />
              <el-option label="编辑经验" value="edit" />
              <el-option label="删除经验" value="delete" />
              <el-option label="评论权限" value="comment" />
              <el-option label="评分权限" value="rate" />
            </el-select>
            <el-date-picker
              v-model="grantForm.expiresAt"
              type="datetime"
              placeholder="过期时间（可选）"
              class="w-48"
            />
            <el-input v-model="grantForm.reason" placeholder="授权原因" class="flex-1" />
            <el-button type="primary" @click="handleGrantPermission">授予</el-button>
          </div>
        </div>
        
        <el-divider />
        
        <div>
          <h4 class="text-sm font-medium mb-2">当前有效权限</h4>
          <el-table :data="permissions" size="small" max-height="300">
            <el-table-column prop="user.realName" label="用户" />
            <el-table-column prop="permissionType" label="权限" />
            <el-table-column prop="reason" label="原因" />
            <el-table-column prop="expiresAt" label="过期时间">
              <template #default="{ row }">
                {{ row.expiresAt ? formatDate(row.expiresAt) : '永久' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button type="danger" size="small" text @click="handleRevokePermission(row)">撤销</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useApi } from '~/composables/useApi';
import { useAuthStore } from '~/stores/auth';
import { ElMessage, ElMessageBox } from 'element-plus';

definePageMeta({
  middleware: ['auth'],
})

const api = useApi();
const authStore = useAuthStore();

const isAdmin = computed(() => {
  const role = authStore.user?.role;
  return role && !['ship_political_instructor'].includes(role);
});

// 数据
const experiences = ref<any[]>([]);
const categoryTree = ref<any[]>([]);
const allCategories = ref<any[]>([]);
const selectedCategory = ref<string>('');
const keyword = ref<string>('');
const loading = ref(false);

// 排序
const sortField = ref<string>('createdAt');
const currentPage = ref<number>(1);
const pageSize = ref<number>(20);
const total = ref<number>(0);
const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

// 分类侧边栏
const categoryCollapsed = ref<boolean>(false);

// 创建经验
const showCreateDialog = ref<boolean>(false);
const showRichEditor = ref<boolean>(false);
const showImageUpload = ref<boolean>(false);
const submitting = ref<boolean>(false);

const createForm = ref({
  title: '',
  content: '',
  category: '',
  shipName: '',
});

// AI建议
const aiLoading = ref<boolean>(false);
const aiSuggestion = ref<any>(null);

// 详情
const showDetailDialog = ref<boolean>(false);
const currentExperience = ref<any>(null);
const isLiked = ref<boolean>(false);
const userRating = ref<number>(0);

// 评论
const commentInput = ref<string>('');
const replyToUser = ref<string>('');
const replyToUserId = ref<number | null>(null);
const replyToParentId = ref<number | null>(null);

// 分类管理
const showCategoryDialog = ref<boolean>(false);
const newCategoryName = ref<string>('');
const newCategoryColor = ref<string>('#409eff');

// 权限管理
const showPermissionDialog = ref<boolean>(false);
const permissions = ref<any[]>([]);
const availableUsers = ref<any[]>([]);
const grantForm = ref({
  userId: null as number | null,
  permissionType: 'create',
  reason: '',
  expiresAt: null as Date | null,
});

const toggleCategory = (cat: any) => {
  cat.isExpanded = !cat.isExpanded;
};

const selectCategory = (name: string) => {
  selectedCategory.value = name;
  currentPage.value = 1;
  loadExperiences();
};

const loadExperiences = async () => {
  loading.value = true;
  try {
    const result = await api.experiences.getAll({
      category: selectedCategory.value || undefined,
      keyword: keyword.value || undefined,
      sortField: sortField.value,
      sortOrder: 'desc',
      page: currentPage.value,
      pageSize: pageSize.value,
    }) as any;
    
    if (result.data) {
      experiences.value = result.data;
      total.value = result.total;
    } else if (Array.isArray(result)) {
      experiences.value = result;
      total.value = result.length;
    }
  } catch (e) {
    console.error('加载经验列表失败', e);
  } finally {
    loading.value = false;
  }
};

const loadCategories = async () => {
  try {
    categoryTree.value = await api.experiences.getCategories() as any[];
    // 初始化展开状态
    categoryTree.value.forEach((cat: any) => {
      if (cat.isExpanded === undefined) cat.isExpanded = true;
    });
    
    // 扁平化所有分类
    const flatten = (cats: any[]): any[] => {
      const result: any[] = [];
      cats.forEach(cat => {
        result.push(cat);
        if (cat.children) result.push(...flatten(cat.children));
      });
      return result;
    };
    allCategories.value = flatten(categoryTree.value);
  } catch (e) {
    console.error('加载分类失败', e);
  }
};

const openDetail = async (item: any) => {
  try {
    const detail = await api.experiences.getOne(item.id) as any;
    currentExperience.value = detail;
    isLiked.value = false;
    userRating.value = 0;
    showDetailDialog.value = true;
  } catch (e) {
    currentExperience.value = item;
    isLiked.value = false;
    userRating.value = 0;
    showDetailDialog.value = true;
  }
};

const handleCloseCreateDialog = () => {
  showCreateDialog.value = false;
  createForm.value = { title: '', content: '', category: '', shipName: '' };
  aiSuggestion.value = null;
  showRichEditor.value = false;
};

// AI推荐
const getAISuggestion = async () => {
  if (!createForm.value.title || !createForm.value.content) {
    ElMessage.warning('请先填写标题和内容');
    return;
  }
  
  aiLoading.value = true;
  aiSuggestion.value = null;
  
  try {
    const result = await api.aiCategorization.suggestExperience(
      createForm.value.title,
      createForm.value.content
    ) as any;
    
    if (result.success && result.suggestions && result.suggestions.length > 0) {
      aiSuggestion.value = result.suggestions[0];
      ElMessage.success('AI分类建议已生成');
    } else {
      ElMessage.warning(result.message || 'AI暂时无法提供建议');
    }
  } catch (e) {
    console.error('获取AI建议失败', e);
    ElMessage.error('获取AI建议失败');
  } finally {
    aiLoading.value = false;
  }
};

const applyAISuggestion = () => {
  if (aiSuggestion.value) {
    createForm.value.category = aiSuggestion.value.category;
    ElMessage.success('已采纳AI推荐分类');
  }
};

// 富文本辅助
const insertText = (before: string, after: string) => {
  createForm.value.content += before + after;
};

const handleImageUpload = () => {
  ElMessage.info('图片上传功能开发中');
  showImageUpload.value = false;
};

const handleCreate = async () => {
  if (!createForm.value.title || !createForm.value.content) {
    ElMessage.warning('请填写标题和内容');
    return;
  }
  
  submitting.value = true;
  try {
    await api.experiences.create(createForm.value as any);
    showCreateDialog.value = false;
    handleCloseCreateDialog();
    ElMessage.success('经验发布成功');
    await loadExperiences();
  } catch (e) {
    console.error('创建经验失败', e);
    ElMessage.error('创建经验失败');
  } finally {
    submitting.value = false;
  }
};

const handleRate = async () => {
  if (!currentExperience.value) return;
  try {
    await api.experiences.rate(currentExperience.value.id, { rating: userRating.value } as any);
    ElMessage.success('评分成功');
    const detail = await api.experiences.getOne(currentExperience.value.id) as any;
    currentExperience.value = detail;
  } catch (e) {
    console.error('评分失败', e);
    ElMessage.error('评分失败');
  }
};

const handleLike = async () => {
  if (!currentExperience.value) return;
  try {
    await api.experiences.like(currentExperience.value.id);
    isLiked.value = !isLiked.value;
    const detail = await api.experiences.getOne(currentExperience.value.id) as any;
    currentExperience.value = detail;
  } catch (e) {
    console.error('点赞失败', e);
  }
};

// 评论
const nestedComments = computed(() => {
  if (!currentExperience.value?.comments) return [];
  return currentExperience.value.comments;
});

const startReply = (comment: any, reply?: any) => {
  replyToUser.value = reply ? reply.user?.realName : comment.user?.realName;
  replyToUserId.value = reply ? reply.userId : comment.userId;
  replyToParentId.value = reply ? comment.id : null; // 回复评论的回复，parentId为评论ID
};

const cancelReply = () => {
  replyToUser.value = '';
  replyToUserId.value = null;
  replyToParentId.value = null;
};

const handleComment = async () => {
  if (!currentExperience.value || !commentInput.value.trim()) {
    ElMessage.warning('请输入评论内容');
    return;
  }
  
  try {
    await api.experiences.comment(currentExperience.value.id, {
      content: commentInput.value.trim(),
      parentId: replyToParentId.value || undefined,
      replyToUserId: replyToUserId.value || undefined,
    });
    commentInput.value = '';
    cancelReply();
    ElMessage.success('评论成功');
    const detail = await api.experiences.getOne(currentExperience.value.id) as any;
    currentExperience.value = detail;
  } catch (e) {
    console.error('评论失败', e);
    ElMessage.error('评论失败');
  }
};

const canDeleteComment = (comment: any) => {
  return comment.userId === authStore.user?.id || isAdmin.value;
};

const handleDeleteComment = async (commentId: number) => {
  try {
    await ElMessageBox.confirm('确定删除这条评论吗?', '提示', { type: 'warning' });
    await api.experiences.deleteComment(currentExperience.value.id, commentId);
    ElMessage.success('删除成功');
    const detail = await api.experiences.getOne(currentExperience.value.id) as any;
    currentExperience.value = detail;
  } catch (e: any) {
    if (e !== 'cancel') {
      console.error('删除评论失败', e);
    }
  }
};

// 分类管理
const handleCreateCategory = async () => {
  if (!newCategoryName.value) {
    ElMessage.warning('请输入分类名称');
    return;
  }
  
  try {
    await api.experiences.createCategory({
      name: newCategoryName.value,
      color: newCategoryColor.value,
    });
    ElMessage.success('分类创建成功');
    newCategoryName.value = '';
    await loadCategories();
  } catch (e) {
    console.error('创建分类失败', e);
    ElMessage.error('创建分类失败');
  }
};

const startEditCategory = (cat: any) => {
  ElMessage.info('编辑分类功能开发中');
};

const handleDeleteCategory = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除该分类吗?', '提示', { type: 'warning' });
    await api.experiences.deleteCategory(id);
    ElMessage.success('删除成功');
    await loadCategories();
  } catch (e: any) {
    if (e !== 'cancel') {
      console.error('删除分类失败', e);
    }
  }
};

// 权限管理
const loadPermissions = async () => {
  try {
    permissions.value = await api.experiences.getAllPermissions() as any[];
  } catch (e) {
    console.error('加载权限列表失败', e);
  }
};

const loadAvailableUsers = async () => {
  // 简化实现，实际应调用用户列表API
  availableUsers.value = [];
};

const handleGrantPermission = async () => {
  if (!grantForm.value.userId || !grantForm.value.permissionType) {
    ElMessage.warning('请选择用户和权限类型');
    return;
  }
  
  try {
    await api.experiences.grantPermission({
      userId: grantForm.value.userId,
      permissionType: grantForm.value.permissionType,
      reason: grantForm.value.reason,
      expiresAt: grantForm.value.expiresAt?.toISOString(),
    });
    ElMessage.success('权限授予成功');
    grantForm.value = { userId: null, permissionType: 'create', reason: '', expiresAt: null };
    await loadPermissions();
  } catch (e) {
    console.error('授予权限失败', e);
    ElMessage.error('授予权限失败');
  }
};

const handleRevokePermission = async (permission: any) => {
  try {
    await api.experiences.revokePermission({
      userId: permission.userId,
      permissionType: permission.permissionType,
    });
    ElMessage.success('权限已撤销');
    await loadPermissions();
  } catch (e) {
    console.error('撤销权限失败', e);
  }
};

// 工具函数
const formatDate = (date: string) => {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
};

const getAuthorName = (item: any) => {
  return item.author?.realName || item.authorName || '匿名';
};

const truncateContent = (content: string | undefined, maxLength: number) => {
  if (!content) return '';
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '...';
};

const formatContent = (content: string) => {
  if (!content) return '';
  // 简单的Markdown渲染
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/# (.*)/g, '<h3>$1</h3>')
    .replace(/- (.*)/g, '<li>$1</li>')
    .replace(/\n/g, '<br/>');
};

onMounted(() => {
  loadExperiences();
  loadCategories();
});
</script>

<style scoped>
.experiences-page {
  height: 100%;
  display: flex;
  padding: 20px;
  gap: 20px;
  background-color: #f5f7fa;
}

/* 分类侧边栏 */
.category-sidebar {
  width: 240px;
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: width 0.3s;
  overflow: hidden;
}

.category-sidebar.collapsed {
  width: 48px;
  padding: 8px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.sidebar-header h3 {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}

.category-tree {
  overflow-y: auto;
  max-height: calc(100vh - 200px);
}

.category-item {
  margin-bottom: 4px;
}

.category-node {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.category-node:hover {
  background: #f5f7fa;
}

.category-node.active {
  background: #ecf5ff;
  color: #409eff;
}

.category-node.child {
  padding-left: 28px;
}

.expand-icon {
  transition: transform 0.2s;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.category-icon {
  font-size: 14px;
}

.category-name {
  font-size: 14px;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-admin {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.toolbar {
  margin-bottom: 16px;
  background-color: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.content-container {
  flex: 1;
  overflow: auto;
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.experience-card {
  display: flex;
  flex-direction: column;
}

.card-header {
  margin-bottom: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-body {
  flex: 1;
  margin-bottom: 12px;
}

.card-content {
  font-size: 14px;
  color: #4A4A4A;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

/* 富文本编辑器 */
.rich-editor-container {
  width: 100%;
}

.rich-editor-mock {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.editor-toolbar {
  display: flex;
  gap: 4px;
  padding: 8px;
  background: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
}

.editor-textarea {
  width: 100%;
  padding: 12px;
  border: none;
  resize: vertical;
  font-family: inherit;
  line-height: 1.6;
}

.editor-textarea:focus {
  outline: none;
}

/* 详情对话框 */
.detail-container {
  max-height: 70vh;
  overflow-y: auto;
}

.detail-header {
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-actions {
  padding: 12px 0;
}

.detail-content {
  padding: 16px 0;
  line-height: 1.8;
  white-space: pre-wrap;
}

/* 评论 */
.comment-section {
  padding-top: 8px;
}

.comment-input {
  display: flex;
  gap: 8px;
}

.comment-list {
  max-height: 400px;
  overflow-y: auto;
}

.comment-item {
  margin-bottom: 12px;
}

.reply-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reply-item {
  margin-top: 8px;
}

/* AI建议框 */
.ai-suggestion-box {
  background-color: #f0f7ff;
  border: 1px solid #409eff;
  border-radius: 6px;
  padding: 12px;
}

/* 权限管理 */
.permission-management {
  padding: 8px 0;
}

/* 响应式 */
@media (max-width: 1024px) {
  .category-sidebar {
    width: 48px;
    padding: 8px;
  }
  
  .category-sidebar .category-tree,
  .category-sidebar .category-admin,
  .category-sidebar .sidebar-header h3 {
    display: none;
  }
}

/* 草稿恢复对话框样式 */
.draft-recovery-content {
  padding: 8px 0;
}

.draft-info-box {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.draft-info-box p {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #4A4A4A;
}

.draft-info-box p:last-child {
  margin-bottom: 0;
}

.draft-time {
  color: #808080;
  font-size: 13px;
}

.draft-preview {
  color: #606060;
  font-size: 13px;
  line-height: 1.5;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.draft-tip {
  font-size: 14px;
  color: #333;
  text-align: center;
}

@media (max-width: 768px) {
  .experiences-page {
    flex-direction: column;
    padding: 10px;
  }
  
  .category-sidebar {
    width: 100%;
    height: auto;
  }
  
  .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
