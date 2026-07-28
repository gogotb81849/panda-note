<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="command-palette-overlay"
        @click="handleOverlayClick"
      >
        <div
          class="command-palette-container"
          @click.stop
        >
          <div class="command-palette-header">
            <div class="search-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </div>
            <input
              ref="searchInputRef"
              v-model="query"
              type="text"
              class="command-palette-input"
              placeholder="输入命令或搜索..."
              @keydown="handleKeyDown"
              @input="onInput"
            />
            <div class="shortcut-hint">
              <kbd>ESC</kbd>
            </div>
          </div>

          <div v-if="filteredCommands.length > 0" class="command-palette-body">
            <div class="command-list">
              <div
                v-for="(cmd, index) in filteredCommands"
                :key="cmd.id"
                class="command-item"
                :class="{ active: selectedIndex === index }"
                @click="executeCommand(cmd)"
                @mouseenter="selectedIndex = index"
              >
                <div class="command-info">
                  <span class="command-icon">{{ getCategoryIcon(cmd.category) }}</span>
                  <div class="command-text">
                    <span class="command-title">{{ cmd.description }}</span>
                    <span class="command-category">{{ getCategoryName(cmd.category) }}</span>
                  </div>
                </div>
                <div v-if="cmd.hasShortcut" class="command-shortcut">
                  <kbd v-for="key in getShortcutKeys(cmd)" :key="key">{{ key }}</kbd>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="command-palette-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <p>未找到匹配的命令</p>
          </div>

          <div class="command-palette-footer">
            <div class="footer-tips">
              <span class="tip-item">
                <kbd>↑</kbd><kbd>↓</kbd> 导航
              </span>
              <span class="tip-item">
                <kbd>Enter</kbd> 执行
              </span>
              <span class="tip-item">
                <kbd>Esc</kbd> 关闭
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { commandPaletteVisible, closeCommandPalette, getAllShortcuts, categoryNames, categoryIcons, formatShortcutDisplay, type ShortcutConfig, type ShortcutCategory } from '~/composables/useGlobalShortcuts';
const searchInputRef = ref<HTMLInputElement | null>(null);
const query = ref('');
const selectedIndex = ref(0);
const visible = computed(() => commandPaletteVisible.value);
const allCommands = computed(() => {
  const shortcuts = getAllShortcuts() || []
  return shortcuts.map(s => ({
    ...s,
    hasShortcut: true,
  }))
})
const filteredCommands = computed(() => {
 if (!query.value.trim()) {
 return allCommands.value;
 }
 const keyword = query.value.toLowerCase();
 return allCommands.value.filter(cmd => cmd.description.toLowerCase().includes(keyword) ||
 cmd.id.toLowerCase().includes(keyword) ||
 categoryNames[cmd.category]?.toLowerCase().includes(keyword));
});
watch(filteredCommands, () => {
 selectedIndex.value = 0;
});
watch(visible, (val) => {
 if (val) {
 query.value = '';
 selectedIndex.value = 0;
 nextTick(() => {
 searchInputRef.value?.focus();
 });
 }
});
const getCategoryName = (category: ShortcutCategory): string => {
 return categoryNames[category] || category;
};
const getCategoryIcon = (category: ShortcutCategory): string => {
 return categoryIcons[category] || '📌';
};
const getShortcutKeys = (cmd: ShortcutConfig): string[] => {
 const keys: string[] = [];
 if (cmd.ctrlKey || cmd.metaKey)
 keys.push('Ctrl');
 if (cmd.shiftKey)
 keys.push('Shift');
 if (cmd.altKey)
 keys.push('Alt');
 keys.push(cmd.key.length === 1 ? cmd.key.toUpperCase() : cmd.key);
 return keys;
};
const handleKeyDown = (e: KeyboardEvent) => {
 switch (e.key) {
 case 'ArrowDown':
 e.preventDefault();
 if (selectedIndex.value < filteredCommands.value.length - 1) {
 selectedIndex.value++;
 }
 break;
 case 'ArrowUp':
 e.preventDefault();
 if (selectedIndex.value > 0) {
 selectedIndex.value--;
 }
 break;
 case 'Enter':
 e.preventDefault();
 if (filteredCommands.value[selectedIndex.value]) {
 executeCommand(filteredCommands.value[selectedIndex.value]);
 }
 break;
 case 'Escape':
 e.preventDefault();
 handleClose();
 break;
 }
};
const onInput = () => {
 selectedIndex.value = 0;
};
const executeCommand = (cmd: ShortcutConfig) => {
 handleClose();
 nextTick(() => {
 cmd.handler?.(new KeyboardEvent('keydown'));
 });
};
const handleOverlayClick = () => {
 handleClose();
};
const handleClose = () => {
 closeCommandPalette();
};
const handleGlobalKeydown = (e: KeyboardEvent) => {
 if (e.key === 'Escape' && visible.value) {
 handleClose();
 }
};
onMounted(() => {
 document.addEventListener('keydown', handleGlobalKeydown);
});
onUnmounted(() => {
 document.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<style scoped>
.command-palette-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.command-palette-container {
  width: 90%;
  max-width: 600px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.command-palette-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  gap: 12px;
  background: #fafafa;
}

.search-icon {
  color: #9ca3af;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.command-palette-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  background: transparent;
  color: #111827;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.command-palette-input::placeholder {
  color: #9ca3af;
}

.shortcut-hint {
  display: flex;
  align-items: center;
}

.shortcut-hint kbd {
  padding: 4px 8px;
  font-size: 11px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  color: #6b7280;
  font-family: 'SFMono-Regular', Consolas, monospace;
}

.command-palette-body {
  max-height: 400px;
  overflow-y: auto;
}

.command-list {
  padding: 8px 0;
}

.command-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.command-item:hover,
.command-item.active {
  background: #eff6ff;
}

.command-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.command-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.command-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.command-title {
  font-size: 14px;
  color: #111827;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.command-category {
  font-size: 12px;
  color: #9ca3af;
}

.command-shortcut {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 16px;
}

.command-shortcut kbd {
  padding: 3px 6px;
  font-size: 11px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  color: #6b7280;
  font-family: 'SFMono-Regular', Consolas, monospace;
}

.command-palette-empty {
  padding: 48px 24px;
  text-align: center;
  color: #9ca3af;
}

.empty-icon {
  margin-bottom: 12px;
  opacity: 0.5;
}

.command-palette-empty p {
  margin: 0;
  font-size: 14px;
}

.command-palette-footer {
  padding: 10px 16px;
  border-top: 1px solid #f3f4f6;
  background: #fafafa;
}

.footer-tips {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #9ca3af;
}

.tip-item kbd {
  padding: 2px 6px;
  font-size: 10px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 3px;
  color: #6b7280;
  font-family: 'SFMono-Regular', Consolas, monospace;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.command-palette-body::-webkit-scrollbar {
  width: 6px;
}

.command-palette-body::-webkit-scrollbar-track {
  background: transparent;
}

.command-palette-body::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.command-palette-body::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
