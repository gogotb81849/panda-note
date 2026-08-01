<template>
  <div class="diary-block-editor" @contextmenu.prevent>
    <!-- 块列表 -->
    <div
      v-if="blocks.length"
      ref="blockListRef"
      class="block-list"
    >
      <div
        v-for="(block, idx) in blocks"
        :key="block.id"
        class="block-item"
        :class="{
          'is-dragging': dragIdx === idx,
          'is-dragover': dropIdx === idx,
        }"
        :draggable="true"
        @dragstart="onDragStart(idx, $event)"
        @dragend="onDragEnd"
        @dragover.prevent="dropIdx = idx"
        @dragleave="dropIdx = dropIdx === idx ? null : dropIdx"
        @drop.prevent="onDrop(idx)"
      >
        <!-- 拖拽手柄 + 块类型标签 -->
        <div class="block-left-bar" @mousedown.stop>
          <div class="drag-handle" title="拖拽调整顺序">⋮⋮</div>
          <el-tooltip
            v-if="block.aiSuggested && block.aiSuggested !== block.blockType"
            content="AI 已根据内容建议其它类型，您可右键修改"
            placement="left"
          >
            <el-tag
              :type="blockTagType(block.blockType)"
              size="small"
              effect="light"
              round
              class="block-type-tag"
            >
              {{ blockTypeLabel(block.blockType) }}
            </el-tag>
          </el-tooltip>
          <el-tag
            v-else
            :type="blockTagType(block.blockType)"
            size="small"
            effect="light"
            round
            class="block-type-tag"
          >
            {{ blockTypeLabel(block.blockType) }}
          </el-tag>
        </div>

        <!-- 待办：前置复选框 -->
        <div v-if="block.blockType === 'todo'" class="todo-checkbox">
          <el-checkbox
            :model-value="block.todoStatus === 'completed'"
            @change="toggleTodoStatus(block, $event)"
          />
        </div>

        <!-- 图片块 -->
        <div v-if="block.blockType === 'image'" class="block-content block-image">
          <img
            v-if="imageUrl(block)"
            :src="imageUrl(block)"
            class="inline-image"
            @click="previewImage(imageUrl(block))"
          />
          <textarea
            v-if="false"
          /><!-- 占位以保留 structure 一致性 -->
          <input
            v-else-if="!imageUrl(block)"
            type="text"
            placeholder="请输入图片 URL，或粘贴图片链接"
            :value="block.content"
            @input="onContentInput(block, ($event.target as HTMLInputElement).value)"
            @blur="commitBlock(block)"
            @keydown.enter.prevent="insertAfter(idx)"
          />
        </div>

        <!-- 文件块 -->
        <div v-else-if="block.blockType === 'file'" class="block-content block-file">
          <el-link
            v-if="fileMeta(block) && fileMeta(block).url"
            :href="fileMeta(block).url"
            target="_blank"
            type="primary"
          >
            <el-icon><Paperclip /></el-icon>
            {{ fileMeta(block).name || '文件附件' }}
          </el-link>
          <input
            v-else
            type="text"
            placeholder="粘贴文件链接（PDF、Word 等）"
            :value="block.content"
            @input="onContentInput(block, ($event.target as HTMLInputElement).value)"
            @blur="commitBlock(block)"
            @keydown.enter.prevent="insertAfter(idx)"
          />
        </div>

        <!-- 链接块 -->
        <div v-else-if="block.blockType === 'link'" class="block-content block-link">
          <el-link
            v-if="linkMeta(block) && linkMeta(block).url"
            :href="linkMeta(block).url"
            target="_blank"
            type="primary"
            :underline="true"
          >
            <el-icon><Link /></el-icon>
            {{ linkMeta(block).title || linkMeta(block).url }}
          </el-link>
          <input
            v-else
            type="text"
            placeholder="粘贴链接（如 https://...）"
            :value="block.content"
            @input="onContentInput(block, ($event.target as HTMLInputElement).value)"
            @blur="commitBlock(block)"
            @keydown.enter.prevent="insertAfter(idx)"
          />
        </div>

        <!-- 文本 / 待办 / 备忘 / 日记：textarea 行级编辑 -->
        <div v-else class="block-content block-text">
          <textarea
            :ref="(el) => setTextareaRef(block.id, el as any)"
            class="block-textarea"
            :placeholder="placeholderFor(block)"
            :class="{ 'is-completed': block.blockType === 'todo' && block.todoStatus === 'completed' }"
            :value="block.content"
            rows="1"
            @input="onTextareaInput(block, $event)"
            @blur="commitBlock(block)"
            @keydown="onKeydown(block, idx, $event)"
            @contextmenu.prevent.stop="openContextMenu(block, idx, $event)"
          />
        </div>

        <!-- 右侧快捷按钮：删除 -->
        <div class="block-actions">
          <el-button
            link
            size="small"
            type="danger"
            class="btn-del"
            @click="removeBlock(block)"
            title="删除"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <!-- 空态 -->
    <div v-else class="empty-tip">
      <!-- 旧内容保底显示 -->
      <div v-if="legacyContent && legacyContent.trim()" class="legacy-content">
        <div class="legacy-header">
          <span>📜 历史记录（来自旧版日记）</span>
          <el-button size="small" type="primary" text @click="doMigrateLegacy">迁移为条目</el-button>
        </div>
        <pre class="legacy-text">{{ legacyContent }}</pre>
      </div>
      <div v-else class="empty-actions">
        <p>暂无内容，按下下方按钮开始记录</p>
        <el-button v-if="diaryId" size="small" type="info" text @click="reloadBlocks" :loading="reloading">
          <el-icon><Refresh /></el-icon>
          重新加载条目
        </el-button>
      </div>
    </div>

    <!-- 底部添加栏 -->
    <div class="add-bar">
      <el-tooltip content="日记：记录今天发生的事情、会议、工作内容等客观事实" placement="top" :show-after="300">
        <el-button size="small" @click="insertBlock('diary')">+ 日记</el-button>
      </el-tooltip>
      <el-tooltip content="备忘：提醒自己不要忘记的事情，如「别忘了下午开会」" placement="top" :show-after="300">
        <el-button size="small" type="warning" @click="insertBlock('memo')">+ 备忘</el-button>
      </el-tooltip>
      <el-tooltip content="待办：需要完成的任务，如「给某轮送备件」。未完成的待办会自动显示在船舶卡片中" placement="top" :show-after="300">
        <el-button size="small" type="primary" @click="insertBlock('todo')">+ 待办</el-button>
      </el-tooltip>
      <el-tooltip content="图片：粘贴图片 URL，支持点击大图查看" placement="top" :show-after="300">
        <el-button size="small" type="success" @click="insertBlock('image')">+ 图片</el-button>
      </el-tooltip>
      <el-tooltip content="文件：粘贴文件链接（PDF、Word 等），可点击下载" placement="top" :show-after="300">
        <el-button size="small" type="info" @click="insertBlock('file')">+ 文件</el-button>
      </el-tooltip>
      <el-tooltip content="链接：粘贴网页链接，可点击跳转" placement="top" :show-after="300">
        <el-button size="small" @click="insertBlock('link')">+ 链接</el-button>
      </el-tooltip>
    </div>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div
        v-if="ctxMenu.visible"
        class="block-ctx-menu"
        :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
        @click.stop
      >
        <div class="ctx-title">切换类型为</div>
        <div
          v-for="t in allTypes"
          :key="t.value"
          class="ctx-item"
          :class="{ 'is-active': ctxMenu.block && ctxMenu.block.blockType === t.value }"
          @click="changeBlockType(t.value)"
        >
          <span class="ctx-item-label">{{ t.label }}</span>
        </div>
        <div class="ctx-divider"></div>
        <div class="ctx-item danger" @click="removeBlock(ctxMenu.block!)">删除此项</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Paperclip, Link, Refresh } from '@element-plus/icons-vue';

type BlockType = 'diary' | 'todo' | 'memo' | 'image' | 'file' | 'link';

interface DiaryBlock {
  id: number;
  diaryId: number;
  userId: number;
  sortOrder: number;
  blockType: BlockType;
  content: string;
  todoStatus?: string | null;
  todoDueDate?: string | null;
  metaJson?: string | null;
  aiSuggested?: BlockType | null;
  userChanged?: boolean;
  detectedShipId?: number | null;
  detectedShipName?: string | null;
  scheduleId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  // 本地新增（未保存到后端）
  $isNew?: boolean;
  $dirty?: boolean;
}

const props = defineProps<{
  diaryId: number | null;
  api: any;
  legacyContent?: string;
}>();

const emit = defineEmits<{
  (e: 'blocks-changed', blocks: DiaryBlock[]): void;
  (e: 'need-create-diary', payload: { type: BlockType; afterIdx?: number; initialContent?: string }): void;
}>();

const blocks = ref<DiaryBlock[]>([]);
const textareaRefs = reactive<Record<number, HTMLTextAreaElement | null>>({});
const blockListRef = ref<HTMLDivElement | null>(null);
const dragIdx = ref<number | null>(null);
const dropIdx = ref<number | null>(null);
const reloading = ref(false);

const ctxMenu = reactive<{
  visible: boolean;
  x: number;
  y: number;
  block: DiaryBlock | null;
  idx: number;
}>({ visible: false, x: 0, y: 0, block: null, idx: -1 });

const allTypes: { label: string; value: BlockType }[] = [
  { label: '📝 日记', value: 'diary' },
  { label: '✅ 待办', value: 'todo' },
  { label: '🔔 备忘', value: 'memo' },
  { label: '🖼️ 图片', value: 'image' },
  { label: '📎 文件', value: 'file' },
  { label: '🔗 链接', value: 'link' },
];

// ============== 外部 API：加载块 ==============
async function loadBlocks() {
  if (!props.diaryId) {
    console.log('[loadBlocks] 无 diaryId，跳过加载');
    blocks.value = [];
    return;
  }
  try {
    const list = await props.api.diaryBlocks.getByDiaryId(props.diaryId);
    blocks.value = (list || []).map((b: any) => normalizeBlock(b));
    console.log('[loadBlocks] 加载完成', {
      diaryId: props.diaryId,
      blocksCount: blocks.value.length,
      blockTypes: blocks.value.map(b => b.blockType),
    });
  } catch (e: any) {
    console.error('[loadBlocks] 加载失败', { diaryId: props.diaryId, error: e?.message || e });
    blocks.value = [];
  }
  emit('blocks-changed', blocks.value);
}

// 手动重新加载（用户点击"重新加载条目"按钮）
async function reloadBlocks() {
  if (!props.diaryId) return;
  reloading.value = true;
  try {
    await loadBlocks();
    // 如果还是空，且有 legacyContent，提示用户迁移
    if (blocks.value.length === 0 && props.legacyContent && props.legacyContent.trim()) {
      ElMessage.info('检测到历史内容，可点击"迁移为条目"按钮导入');
    } else if (blocks.value.length > 0) {
      ElMessage.success(`已加载 ${blocks.value.length} 条记录`);
    } else {
      ElMessage.info('暂无条目记录');
    }
  } finally {
    reloading.value = false;
  }
}

function normalizeBlock(b: any): DiaryBlock {
  return {
    id: b.id,
    diaryId: b.diaryId,
    userId: b.userId,
    sortOrder: b.sortOrder ?? 0,
    blockType: b.blockType as BlockType,
    content: b.content ?? '',
    todoStatus: b.todoStatus,
    todoDueDate: b.todoDueDate,
    metaJson: b.metaJson,
    aiSuggested: b.aiSuggested as BlockType,
    userChanged: !!b.userChanged,
    detectedShipId: b.detectedShipId,
    detectedShipName: b.detectedShipName,
    scheduleId: b.scheduleId,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

// ============== 文本框辅助 ==============
function setTextareaRef(id: number, el: HTMLTextAreaElement | null) {
  textareaRefs[id] = el;
}

function autosize(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  el.style.height = Math.min(300, el.scrollHeight) + 'px';
}

// ============== 元信息解析（图片/文件/链接） ==============
function parseMeta(block: DiaryBlock): any {
  try {
    return block.metaJson ? JSON.parse(block.metaJson) : {};
  } catch {
    return {};
  }
}

function imageUrl(block: DiaryBlock): string {
  const m = parseMeta(block);
  return m.url || /^https?:\/\//.test(block.content) ? block.content : '';
}

function fileMeta(block: DiaryBlock): { url?: string; name?: string; size?: number } | null {
  const m = parseMeta(block);
  if (m.url) return m;
  if (/^https?:\/\//.test(block.content)) return { url: block.content, name: '附件' };
  return null;
}

function linkMeta(block: DiaryBlock): { url?: string; title?: string } | null {
  const m = parseMeta(block);
  if (m.url) return m;
  if (/^https?:\/\//.test(block.content)) return { url: block.content, title: block.content };
  return null;
}

// ============== UI 辅助 ==============
function blockTypeLabel(t: BlockType): string {
  const found = allTypes.find(x => x.value === t)
  return (found && found.label) || t;
}

function blockTagType(t: BlockType): '' | 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  switch (t) {
    case 'todo': return 'primary';
    case 'memo': return 'warning';
    case 'diary': return 'success';
    case 'image': return '';
    case 'file': return 'info';
    case 'link': return '';
    default: return '';
  }
}

function placeholderFor(block: DiaryBlock): string {
  switch (block.blockType) {
    case 'todo': return '□ 输入待办事项，例如：需要给中远海龙轮送备件（系统会自动识别船名并在船舶卡片展示）';
    case 'memo': return '🔔 输入备忘提醒，例如：别忘了今天下午开会';
    case 'diary': return '📝 记录今天发生的事情……（按回车换行新增条目）';
    default: return '输入内容...';
  }
}

function previewImage(url: string) {
  window.open(url, '_blank');
}

// ============== 新增块 ==============
async function insertBlock(type: BlockType, afterIdx?: number, initialContent = '') {
  if (!props.diaryId) {
    // 没有今日日记：通知父组件先创建日记，再插入对应块
    emit('need-create-diary', { type, afterIdx, initialContent });
    return;
  }
  const sortOrder = afterIdx !== undefined
    ? ((blocks.value[afterIdx] && blocks.value[afterIdx].sortOrder) ?? blocks.value.length) + 1
    : blocks.value.length;

  const block: DiaryBlock = {
    id: -(Date.now() + Math.random()), // 临时负 ID
    diaryId: props.diaryId,
    userId: 0,
    sortOrder,
    blockType: type,
    content: initialContent,
    todoStatus: type === 'todo' ? 'pending' : undefined,
    $isNew: true,
    $dirty: true,
  };

  const insertAt = afterIdx !== undefined ? afterIdx + 1 : blocks.value.length;
  blocks.value.splice(insertAt, 0, block);

  // 立即保存到后端
  try {
    const saved = await props.api.diaryBlocks.create({
      diaryId: props.diaryId,
      sortOrder: block.sortOrder,
      blockType: block.blockType,
      content: block.content,
      todoStatus: block.todoStatus ?? undefined,
    });
    const idx = blocks.value.findIndex(b => b.id === block.id);
    if (idx >= 0) {
      blocks.value[idx] = normalizeBlock(saved);
    }
  } catch (e: any) {
    ElMessage.error('保存失败：' + (e.message || e));
  }

  emit('blocks-changed', blocks.value);

  // 自动聚焦文本块
  await nextTick();
  if (type === 'diary' || type === 'todo' || type === 'memo') {
    const target = blocks.value[insertAt];
    const ta = target ? textareaRefs[target.id] : null;
    if (ta) {
      ta.focus();
      autosize(ta);
    }
  }
}

function insertAfter(idx: number) {
  // 回车：如果当前是文本/待办/备忘，在下方插入新的日记块（空行）
  const cur = blocks.value[idx];
  if (!cur) return insertBlock('diary');
  if (['diary', 'todo', 'memo'].includes(cur.blockType)) {
    return insertBlock(cur.blockType, idx);
  }
  return insertBlock('diary', idx);
}

// ============== 删除块 ==============
async function removeBlock(block: DiaryBlock) {
  try {
    await ElMessageBox.confirm('确认删除此条？', '提示', { type: 'warning' });
  } catch { return; }
  const idx = blocks.value.findIndex(b => b.id === block.id);
  if (idx >= 0) blocks.value.splice(idx, 1);
  if (!block.$isNew && block.id > 0) {
    try { await props.api.diaryBlocks.remove(block.id); }
    catch (e: any) { ElMessage.error('删除失败：' + (e.message || e)); }
  }
  closeCtxMenu();
  emit('blocks-changed', blocks.value);
}

// ============== 内容编辑 ==============
function onTextareaInput(block: DiaryBlock, evt: Event) {
  const el = evt.target as HTMLTextAreaElement;
  onContentInput(block, el.value);
  autosize(el);
}

function onContentInput(block: DiaryBlock, val: string) {
  block.content = val;
  block.$dirty = true;
  debounceCommit(block);
}

// 防抖保存（500ms）
const commitTimers = new Map<number, number>();
function debounceCommit(block: DiaryBlock) {
  if (commitTimers.has(block.id)) {
    clearTimeout(commitTimers.get(block.id)!);
  }
  commitTimers.set(block.id, window.setTimeout(() => {
    commitBlock(block);
    commitTimers.delete(block.id);
  }, 500));
}

async function commitBlock(block: DiaryBlock) {
  if (!block.$dirty) return;
  // 新增块：insertBlock 时已经保存，update 走 update
  try {
    if (block.$isNew) {
      // 应当在 insertBlock 时已经有 ID，这里做兜底
      block.$isNew = false;
    }
    const saved = await props.api.diaryBlocks.update(block.id, {
      content: block.content,
      blockType: block.blockType,
      todoStatus: block.blockType === 'todo' ? (block.todoStatus ?? undefined) : undefined,
    });
    Object.assign(block, normalizeBlock(saved));
    block.$dirty = false;
  } catch (e: any) {
    // 静默：可能是网络问题，下一次 blur 再重试
  }
  emit('blocks-changed', blocks.value);
}

// ============== 键盘快捷键 ==============
function onKeydown(block: DiaryBlock, idx: number, evt: KeyboardEvent) {
  const el = evt.target as HTMLTextAreaElement;
  // Enter = 下一行（不换行，用 Shift+Enter 换行）
  if (evt.key === 'Enter' && !evt.shiftKey) {
    evt.preventDefault();
    // 提交当前行然后插入新行
    commitBlock(block);
    insertAfter(idx);
    return;
  }
  // Backspace 空行 → 删除当前行并聚焦上一行
  if (evt.key === 'Backspace' && !block.content) {
    if (blocks.value.length > 1) {
      evt.preventDefault();
      removeBlockSilent(block).then(() => {
        const prev = blocks.value[idx - 1] || blocks.value[idx];
        if (prev) {
          nextTick(() => {
            const ta = textareaRefs[prev.id];
            if (ta) { ta.focus(); autosize(ta); }
          });
        }
      });
    }
    return;
  }
  // Ctrl+Enter = 立刻提交
  if ((evt.ctrlKey || evt.metaKey) && evt.key === 'Enter') {
    evt.preventDefault();
    commitBlock(block);
    ElMessage.success('已保存');
    return;
  }
  // Esc = 失焦
  if (evt.key === 'Escape') {
    el.blur();
  }
}

async function removeBlockSilent(block: DiaryBlock) {
  const idx = blocks.value.findIndex(b => b.id === block.id);
  if (idx >= 0) blocks.value.splice(idx, 1);
  if (!block.$isNew && block.id > 0) {
    try { await props.api.diaryBlocks.remove(block.id); }
    catch { /* ignore */ }
  }
  emit('blocks-changed', blocks.value);
}

// ============== 待办完成切换 ==============
async function toggleTodoStatus(block: DiaryBlock, checked: boolean) {
  if (block.blockType !== 'todo') return;
  block.todoStatus = checked ? 'completed' : 'pending';
  block.$dirty = true;
  try {
    const saved = await props.api.diaryBlocks.update(block.id, { todoStatus: block.todoStatus });
    Object.assign(block, normalizeBlock(saved));
    block.$dirty = false;
  } catch (e: any) {
    ElMessage.error('切换待办状态失败：' + (e.message || e));
  }
  emit('blocks-changed', blocks.value);
}

// ============== 右键菜单 ==============
function openContextMenu(block: DiaryBlock, idx: number, evt: MouseEvent) {
  ctxMenu.visible = true;
  ctxMenu.x = evt.clientX;
  ctxMenu.y = evt.clientY;
  ctxMenu.block = block;
  ctxMenu.idx = idx;
}

function closeCtxMenu() {
  ctxMenu.visible = false;
  ctxMenu.block = null;
  ctxMenu.idx = -1;
}

async function changeBlockType(newType: BlockType) {
  const block = ctxMenu.block;
  if (!block) return closeCtxMenu();
  const userManuallyChanged = block.blockType !== newType;
  block.blockType = newType;
  if (newType === 'todo' && !block.todoStatus) block.todoStatus = 'pending';
  block.$dirty = true;
  try {
    const saved = await props.api.diaryBlocks.update(block.id, {
      blockType: newType,
      todoStatus: newType === 'todo' ? (block.todoStatus ?? undefined) : undefined,
      userManuallyChangedType: userManuallyChanged,
    });
    Object.assign(block, normalizeBlock(saved));
    block.$dirty = false;
    if (userManuallyChanged) ElMessage.info('已记录您的手动修正，系统会自动优化分类');
  } catch (e: any) {
    ElMessage.error('修改类型失败：' + (e.message || e));
  }
  closeCtxMenu();
  emit('blocks-changed', blocks.value);
}

// 点击外部关闭右键菜单
function onDocClick() {
  if (ctxMenu.visible) closeCtxMenu();
}

// ============== 拖拽排序 ==============
function onDragStart(idx: number, evt: DragEvent) {
  dragIdx.value = idx;
  if (evt.dataTransfer) {
    evt.dataTransfer.effectAllowed = 'move';
    evt.dataTransfer.setData('text/plain', String(idx));
  }
}
function onDragEnd() {
  dragIdx.value = null;
  dropIdx.value = null;
}
async function onDrop(targetIdx: number) {
  if (dragIdx.value === null || dragIdx.value === targetIdx) return;
  const src = dragIdx.value;
  const item = blocks.value.splice(src, 1)[0];
  blocks.value.splice(targetIdx, 0, item);
  // 重新设置 sortOrder 并持久化
  blocks.value.forEach((b, i) => { b.sortOrder = i; });
  onDragEnd();
  emit('blocks-changed', blocks.value);
  try {
    await props.api.diaryBlocks.reorder(props.diaryId, blocks.value.map(b => b.id));
  } catch (e: any) {
    ElMessage.error('排序保存失败：' + (e.message || e));
  }
}

// ============== 旧内容迁移：将 diary.content 按行拆分为块 ==============
async function migrateLegacyContent(content: string) {
  if (!props.diaryId || !content || !content.trim()) {
    console.log('[migrateLegacyContent] 跳过：无 diaryId 或内容为空', {
      diaryId: props.diaryId,
      contentLength: (content || '').length,
    });
    return;
  }
  const lines = content.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    console.log('[migrateLegacyContent] 跳过：拆分后无有效行');
    return;
  }
  console.log('[migrateLegacyContent] 开始迁移', {
    diaryId: props.diaryId,
    totalLines: lines.length,
    preview: lines.slice(0, 3),
  });
  let successCount = 0;
  let failCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    try {
      const saved = await props.api.diaryBlocks.create({
        diaryId: props.diaryId,
        content: line,
        sortOrder: i,
      });
      blocks.value.push(normalizeBlock(saved));
      successCount++;
    } catch (e: any) {
      console.error('[migrateLegacyContent] 第' + (i + 1) + '行创建失败:', e?.message || e, { line });
      failCount++;
    }
  }
  emit('blocks-changed', blocks.value);
  console.log('[migrateLegacyContent] 迁移完成', { successCount, failCount, totalBlocks: blocks.value.length });
  if (successCount > 0) {
    ElMessage.success(`已迁移 ${successCount} 条历史记录${failCount > 0 ? `（${failCount} 条失败）` : ''}`);
  } else if (failCount > 0) {
    ElMessage.error('迁移失败，旧内容仍保留显示');
  }
}

// 用户点击"迁移为条目"按钮
async function doMigrateLegacy() {
  if (props.legacyContent && props.legacyContent.trim()) {
    await migrateLegacyContent(props.legacyContent);
  }
}

// ============== 生命周期 ==============
onMounted(() => {
  document.addEventListener('click', onDocClick);
  loadBlocks();
});

// diaryId 变化时自动重新加载块（父组件切换日期后 diaryId 会更新）
watch(() => props.diaryId, (newId, oldId) => {
  if (newId !== oldId) {
    console.log('[DiaryBlockEditor] diaryId 变化', { old: oldId, new: newId });
    loadBlocks();
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
  commitTimers.forEach(t => clearTimeout(t));
  commitTimers.clear();
});

defineExpose({
  loadBlocks,
  reloadBlocks,
  insertBlock,
  migrateLegacyContent,
  getBlocks: () => blocks.value,
});
</script>

<style scoped>
.diary-block-editor {
  background: #fffdf8;
  border: 1px solid #f0eadd;
  border-radius: 10px;
  padding: 12px;
  margin-top: 8px;
  /* 填满父容器，块列表可滚动 */
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.block-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  /* 块过多时滚动 */
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.block-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 4px;
  border-radius: 6px;
  transition: background 0.15s, transform 0.1s;
}
.block-item:hover {
  background: rgba(120, 170, 255, 0.06);
}
.block-item.is-dragging {
  opacity: 0.4;
}
.block-item.is-dragover {
  outline: 2px dashed #409eff;
  outline-offset: 2px;
  background: rgba(64, 158, 255, 0.08);
}

.block-left-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-top: 4px;
  flex-shrink: 0;
}
.drag-handle {
  width: 18px;
  text-align: center;
  cursor: grab;
  color: #c0c4cc;
  user-select: none;
  font-size: 10px;
  letter-spacing: -1px;
  padding: 0 2px;
  border-radius: 3px;
}
.drag-handle:hover {
  color: #909399;
  background: #ebeef5;
}
.block-type-tag {
  font-size: 10px;
  line-height: 1.4;
  padding: 0 5px;
}

.todo-checkbox {
  padding-top: 4px;
  flex-shrink: 0;
}

.block-content {
  flex: 1;
  min-width: 0;
  padding-top: 2px;
}
.block-textarea {
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  resize: none;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  padding: 2px 0;
  color: #303133;
  overflow: hidden;
}
.block-textarea.is-completed {
  color: #909399;
  text-decoration: line-through;
}
.block-textarea::placeholder {
  color: #c0c4cc;
}

.block-image, .block-file, .block-link {
  padding: 4px 0;
}
.block-image input, .block-file input, .block-link input {
  width: 100%;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 13px;
  outline: none;
}
.block-image input:focus, .block-file input:focus, .block-link input:focus {
  border-color: #409eff;
}
.inline-image {
  max-width: 100%;
  max-height: 260px;
  border-radius: 6px;
  cursor: zoom-in;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

.block-actions {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
  padding-top: 2px;
}
.block-item:hover .block-actions { opacity: 1; }
.btn-del {
  color: #f56c6c;
  font-size: 12px;
}

.empty-tip {
  text-align: center;
  color: #909399;
  font-size: 13px;
  padding: 20px 0;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-tip p { margin: 0; }
.empty-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

/* 旧内容保底显示 */
.legacy-content {
  width: 100%;
  text-align: left;
  background: #fffbe6;
  border: 1px dashed #e6d56b;
  border-radius: 8px;
  padding: 12px 16px;
  max-height: 100%;
  overflow-y: auto;
}
.legacy-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #b8860b;
}
.legacy-text {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
  font-family: inherit;
}

.add-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #e6e1d3;
  flex-shrink: 0;
}

/* 右键菜单 */
.block-ctx-menu {
  position: fixed;
  z-index: 99999;
  background: white;
  min-width: 180px;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.14);
  padding: 6px 0;
  font-size: 13px;
}
.ctx-title {
  padding: 4px 14px 6px;
  color: #909399;
  font-size: 12px;
  border-bottom: 1px solid #f2f6fc;
  margin-bottom: 4px;
}
.ctx-item {
  padding: 8px 14px;
  cursor: pointer;
  color: #303133;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ctx-item:hover { background: #ecf5ff; color: #409eff; }
.ctx-item.is-active { background: #409eff; color: white; }
.ctx-item.is-active:hover { background: #337ecc; }
.ctx-item.danger { color: #f56c6c; }
.ctx-item.danger:hover { background: #fef0f0; color: #f56c6c; }
.ctx-divider { height: 1px; background: #f2f6fc; margin: 4px 0; }
</style>
