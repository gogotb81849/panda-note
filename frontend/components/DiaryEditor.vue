<template>
  <div class="diary-panel">
    <div class="diary-panel-header" @click="diaryExpanded = !diaryExpanded">
      <span class="diary-panel-title">📝 {{ isPoliticalInstructor ? '航海日志' : '工作日记' }}</span>
      <el-icon class="expand-icon" :class="{ expanded: diaryExpanded }"><ArrowDown /></el-icon>
    </div>
    <div v-show="diaryExpanded" class="diary-panel-content">
      <!-- 日期头部 -->
      <div class="date-header-huawei" :style="{ background: `linear-gradient(135deg, ${currentPaper.bg} 0%, ${currentPaper.bg}cc 100%)` }">
        <div class="date-huawei-left">
          <div class="date-huawei-number">{{ selectedDate.getDate() }}</div>
        </div>
        <div class="date-huawei-middle">
          <div class="date-huawei-year">{{ selectedDate.getFullYear() }}年{{ selectedDate.getMonth() + 1 }}月</div>
          <div class="date-huawei-lunar-row">
            <span class="lunar-text">{{ lunarInfo.lunar }}</span>
            <span v-if="lunarInfo.holiday" class="holiday-text">{{ lunarInfo.holiday }}</span>
            <span v-if="lunarInfo.solarTerm" class="solar-text">{{ lunarInfo.solarTerm }}</span>
          </div>
        </div>
        <div class="date-huawei-right" v-if="!isPoliticalInstructor">
          <el-select v-model="weatherValue" placeholder="天气" size="small" class="huawei-select" @visible-change="onWeatherVisibleChange">
            <el-option label="☀ 晴" value="晴" />
            <el-option label="☁ 多云" value="多云" />
            <el-option label="☂ 阴" value="阴" />
            <el-option label="🌦 小雨" value="小雨" />
            <el-option label="🌧 中雨" value="中雨" />
            <el-option label="🌧 大雨" value="大雨" />
            <el-option label="🌧 暴雨" value="暴雨" />
            <el-option label="🌫 雾" value="雾" />
            <el-option label="❄ 雪" value="雪" />
            <el-option label="⛈ 雷阵雨" value="雷阵雨" />
            <el-option label="---" value="" disabled />
            <el-option label="+ 自定义天气..." value="__custom__" @click.stop="showCustomWeatherInput" />
          </el-select>
          <el-select v-model="dynamicValue" placeholder="今日动态" size="small" class="huawei-select" @visible-change="onDynamicVisibleChange">
            <el-option label="在公司" value="在公司" />
            <el-option label="出差访船" value="出差访船" />
            <el-option label="出差路上" value="出差路上" />
            <el-option label="培训" value="培训" />
            <el-option label="开会" value="开会" />
            <el-option label="休假" value="休假" />
            <el-option label="其他" value="其他" />
            <el-option label="---" value="" disabled />
            <el-option label="+ 自定义动态..." value="__custom__" @click.stop="showCustomDynamicInput" />
          </el-select>
        </div>
        <div class="date-huawei-right" v-else>
          <div v-if="detectedShipName" class="ship-name-badge" title="自动识别船舶">
            <el-tag type="primary" size="small" effect="light">🚢 {{ detectedShipName }}</el-tag>
          </div>
          <div v-else class="ship-name-hint text-xs text-gray-400">
            输入船名将自动识别
          </div>
        </div>
      </div>

      <!-- 自定义天气输入弹窗 -->
      <el-dialog v-model="customWeatherVisible" title="自定义天气" width="320px" :close-on-click-modal="false">
        <el-input v-model="customWeatherText" placeholder="请输入自定义天气，如：台风" @keyup.enter="confirmCustomWeather" />
        <template #footer>
          <el-button @click="customWeatherVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmCustomWeather">确定</el-button>
        </template>
      </el-dialog>

      <!-- 自定义动态输入弹窗 -->
      <el-dialog v-model="customDynamicVisible" title="自定义动态" width="320px" :close-on-click-modal="false">
        <el-input v-model="customDynamicText" placeholder="请输入自定义动态，如：值班" @keyup.enter="confirmCustomDynamic" />
        <template #footer>
          <el-button @click="customDynamicVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmCustomDynamic">确定</el-button>
        </template>
      </el-dialog>

      <!-- 船舶政委表单 -->
      <template v-if="isPoliticalInstructor">
        <div class="info-bar">
          <div class="info-row">
            <div class="info-group">
              <label class="info-label" title="出发港">
                <span class="label-text">出发港</span>
                <svg class="label-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l4-4 4 4 4-4 4 4"/><path d="M3 10l4-4 4 4 4-4 4 4"/></svg>
              </label>
              <el-select v-model="diaryForm.departurePort" placeholder="出发港" size="small" filterable>
                <el-option v-for="port in ports" :key="'dep-' + port.id" :label="port.name" :value="port.name" />
              </el-select>
            </div>
            <div class="info-group">
              <label class="info-label" title="目的港">
                <span class="label-text">目的港</span>
                <svg class="label-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>
              </label>
              <el-select v-model="diaryForm.arrivalPort" placeholder="目的港" size="small" filterable>
                <el-option v-for="port in ports" :key="'arr-' + port.id" :label="port.name" :value="port.name" />
              </el-select>
            </div>
            <div class="info-group">
              <label class="info-label" title="天气">
                <span class="label-text">天气</span>
                <svg class="label-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
              </label>
              <el-select v-model="diaryForm.weather" placeholder="天气" size="small">
                <el-option label="晴" value="晴" />
                <el-option label="多云" value="多云" />
                <el-option label="阴" value="阴" />
                <el-option label="小雨" value="小雨" />
                <el-option label="中雨" value="中雨" />
                <el-option label="大雨" value="大雨" />
                <el-option label="暴雨" value="暴雨" />
                <el-option label="雾" value="雾" />
                <el-option label="雪" value="雪" />
                <el-option label="雷阵雨" value="雷阵雨" />
              </el-select>
            </div>
            <div class="info-group">
              <label class="info-label" title="海况">
                <span class="label-text">海况</span>
                <svg class="label-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></svg>
              </label>
              <el-select v-model="diaryForm.seaCondition" placeholder="海况" size="small">
                <el-option label="平静" value="平静" />
                <el-option label="轻浪" value="轻浪" />
                <el-option label="中浪" value="中浪" />
                <el-option label="大浪" value="大浪" />
                <el-option label="巨浪" value="巨浪" />
                <el-option label="狂浪" value="狂浪" />
              </el-select>
            </div>
            <div class="info-group">
              <label class="info-label" title="今日动态">
                <span class="label-text">今日动态</span>
                <svg class="label-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </label>
              <el-select v-model="diaryForm.dynamicStatus" placeholder="动态" size="small">
                <el-option label="航行中" value="航行中" />
                <el-option label="靠泊中" value="靠泊中" />
                <el-option label="锚泊中" value="锚泊中" />
                <el-option label="在港" value="在港" />
                <el-option label="修船" value="修船" />
              </el-select>
            </div>
          </div>
          <div class="progress-section">
            <RouteProgressBar v-if="diaryForm.departureDate && diaryForm.arrivalDate" :departure-date="diaryForm.departureDate" :arrival-date="diaryForm.arrivalDate" :current-date="selectedDateStr" />
            <div v-else class="progress-placeholder">
              <div class="progress-bar">
                <div class="progress-bg"></div>
              </div>
              <div class="progress-labels">
                <span class="label-departure">-</span>
                <span class="label-remaining">请选择出发和到达日期</span>
                <span class="label-arrival">-</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 日记工具栏 -->
      <div class="huawei-toolbar-wrapper">
        <div class="huawei-toolbar">
          <div class="huawei-toolbar-scroll" ref="toolbarScrollRef">
            <button class="hw-tool-btn" @click.stop="undoAction" title="撤销">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            </button>
            <button class="hw-tool-btn" :class="{ active: activeTool === 'text' }" @click.stop="toggleTool('text')" title="文本格式">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
            </button>
            <div class="hw-toolbar-divider"></div>
            <button class="hw-tool-btn" @click.stop="insertPhoto" title="插入图片">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </button>
            <button class="hw-tool-btn" @click.stop="insertLink" title="插入链接">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </button>
            <div class="hw-toolbar-divider"></div>
            <button class="hw-tool-btn" :class="{ active: activeTool === 'paragraph' }" @click.stop="toggleTool('paragraph')" title="段落与列表">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="13" y1="4" x2="13" y2="20"/><path d="M17 4c0 0-4 1-4 8s4 8 4 8"/><line x1="4" y1="8" x2="10" y2="8" opacity="0.6"/><line x1="4" y1="12" x2="10" y2="12" opacity="0.6"/><line x1="4" y1="16" x2="8" y2="16" opacity="0.6"/></svg>
            </button>
            <button class="hw-tool-btn" :class="{ active: activeTool === 'format' }" @click.stop="toggleTool('format')" title="字体颜色">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
            </button>
            <button class="hw-tool-btn" @click.stop="execCommand('removeFormat')" title="清除格式">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="M2 22h5"/><line x1="15" y1="15" x2="19" y2="19" stroke-width="3"/></svg>
            </button>
            <div class="hw-toolbar-divider"></div>
            <button class="hw-tool-btn" @click.stop="showVersionHistory = true" title="版本历史">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </button>
            <button class="hw-tool-btn" :class="{ active: showMoreToolbar }" @click.stop="showMoreToolbar = !showMoreToolbar" title="更多工具">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="12" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/></svg>
            </button>
          </div>
          <div class="hw-toolbar-right">
            <span class="save-status-indicator" :class="saveStatusClass">
              <svg v-if="saveStatus === 'saving'" class="animate-spin" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
              </svg>
              <svg v-else-if="saveStatus === 'saved'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.3"/>
              </svg>
              {{ saveStatusText }}
            </span>
          </div>
        </div>

        <!-- 气泡面板 -->
        <div v-if="activeTool === 'paragraph'" class="hw-bubble-panel" ref="bubblePanelRef" @click.stop @mouseleave="closeBubblePanelOnLeave($event)">
          <div class="bubble-section">
            <span class="bubble-label">列表样式</span>
            <div class="bubble-list-options">
              <button class="bubble-list-btn" :class="{ active: listStyle === 'ordered' }" @click.stop="applyListStyle('ordered')">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="20" y2="6"/><line x1="10" y1="12" x2="20" y2="12"/><line x1="10" y1="18" x2="20" y2="18"/><text x="2" y="8" font-size="7" fill="currentColor" stroke="none">1</text><text x="2" y="14" font-size="7" fill="currentColor" stroke="none">2</text><text x="2" y="20" font-size="7" fill="currentColor" stroke="none">3</text></svg>
                有序列表
              </button>
              <button class="bubble-list-btn" :class="{ active: listStyle === 'unordered' }" @click.stop="applyListStyle('unordered')">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="20" y2="6"/><line x1="10" y1="12" x2="20" y2="12"/><line x1="10" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg>
                无序列表
              </button>
              <button class="bubble-list-btn" :class="{ active: listStyle === 'none' }" @click.stop="applyListStyle('none')">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
                无列表
              </button>
            </div>
          </div>
          <div class="bubble-section">
            <span class="bubble-label">缩进</span>
            <div class="bubble-indent-buttons">
              <button class="bubble-indent-btn" @click.stop="execCommand('indent')">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/><polyline points="3 10 7 12 3 14"/></svg>
                增加缩进
              </button>
              <button class="bubble-indent-btn" @click.stop="execCommand('outdent')">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/><polyline points="7 10 3 12 7 14"/></svg>
                减少缩进
              </button>
            </div>
          </div>
        </div>

        <div v-if="activeTool === 'text'" class="hw-bubble-panel" ref="bubblePanelRef" @click.stop @mouseleave="closeBubblePanelOnLeave($event)">
          <div class="bubble-section">
            <div class="bubble-format-buttons">
              <button class="bubble-format-btn" :class="{ active: formatState.bold }" @click.stop="execCommand('bold')"><strong>B</strong></button>
              <button class="bubble-format-btn" :class="{ active: formatState.italic }" @click.stop="execCommand('italic')"><em>I</em></button>
              <button class="bubble-format-btn" :class="{ active: formatState.underline }" @click.stop="execCommand('underline')"><u>U</u></button>
              <button class="bubble-format-btn" :class="{ active: formatState.strikeThrough }" @click.stop="execCommand('strikeThrough')"><s>S</s></button>
            </div>
          </div>
          <div class="bubble-section">
            <span class="bubble-label">字号</span>
            <div class="bubble-font-size-btns">
              <button v-for="s in ['12px','14px','16px','18px','20px']" :key="s" class="bubble-size-btn" :class="{ active: fontSize === s }" @click.stop="onFontSizeChange(s)">{{ s.replace('px','') }}</button>
            </div>
          </div>
          <div class="bubble-section">
            <span class="bubble-label">对齐</span>
            <div class="bubble-align-btn">
              <button class="bubble-align-btn-item" :class="{ active: formatState.justifyLeft }" @click.stop="execCommand('justifyLeft')">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              <button class="bubble-align-btn-item" :class="{ active: formatState.justifyCenter }" @click.stop="execCommand('justifyCenter')">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              <button class="bubble-align-btn-item" :class="{ active: formatState.justifyRight }" @click.stop="execCommand('justifyRight')">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div v-if="activeTool === 'format'" class="hw-bubble-panel" ref="bubblePanelRef" @click.stop @mouseleave="closeBubblePanelOnLeave($event)">
          <div class="bubble-section">
            <span class="bubble-label">字体颜色</span>
            <div class="bubble-colors">
              <button
                v-for="c in presetColors"
                :key="'fc-' + c"
                class="bubble-color-dot"
                :class="{ active: fontColor === c }"
                :style="{ background: c }"
                @click.stop="onFontColorChange(c)"
              />
              <el-color-picker v-model="fontColor" size="small" class="bubble-color-picker" @change="onFontColorChange" />
            </div>
          </div>
          <div class="bubble-section">
            <button class="bubble-clear-btn" @click.stop="execCommand('removeFormat')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="M2 22h5"/><line x1="15" y1="15" x2="19" y2="19" stroke-width="3"/></svg>
              清除格式
            </button>
          </div>
        </div>

        <div v-if="showMoreToolbar" class="huawei-more-panel">
          <div class="more-panel-grid">
            <div class="more-panel-item" @click.stop="selectedPaper = (selectedPaper + 1) % paperStyles.length; showMoreToolbar = false">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
              <span>{{ paperStyles[selectedPaper].name }}</span>
            </div>
            <div class="more-panel-item" @click.stop="toggleLines(); showMoreToolbar = false">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              <span>{{ showLines ? '隐藏横线' : '显示横线' }}</span>
            </div>
            <div class="more-panel-item" @click.stop="insertPhoto(); showMoreToolbar = false">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>插入照片</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 编辑器主体 -->
      <div class="editor-container" :class="{ 'show-lines': showLines }" :style="{ '--line-height': computedLineHeight, '--bg-position': backgroundPosition, '--paper-bg': currentPaper.bg, '--line-color': currentPaper.line } as any" @contextmenu.prevent="onEditorContextMenu" @mouseup="updateParagraphButton" @keyup="updateParagraphButton">
        <div
          ref="editorRef"
          class="editor-content"
          contenteditable="true"
          @input="onContentInput"
          @paste="onPaste"
          :style="{ fontSize: fontSize, lineHeight: computedLineHeight }"
          @focus="updateParagraphButton"
        ></div>
      </div>

      <!-- 编辑器右键菜单 -->
      <div v-if="editorContextMenu.visible" class="editor-context-menu" :style="{ top: editorContextMenu.y + 'px', left: editorContextMenu.x + 'px' }">
        <div class="menu-item" @click="execCommand('bold'); closeEditorContextMenu()"><span class="menu-icon"><strong>B</strong></span> 加粗</div>
        <div class="menu-item" @click="execCommand('italic'); closeEditorContextMenu()"><span class="menu-icon"><em>I</em></span> 斜体</div>
        <div class="menu-item" @click="execCommand('underline'); closeEditorContextMenu()"><span class="menu-icon"><u>U</u></span> 下划线</div>
        <div class="menu-divider"></div>
        <div class="menu-item" @click="insertPhoto(); closeEditorContextMenu()"><span class="menu-icon">📷</span> 插入照片</div>
        <div class="menu-divider"></div>
        <div class="menu-item" @click="execCommand('selectAll'); closeEditorContextMenu()"><span class="menu-icon">☐</span> 全选</div>
        <div class="menu-item" @click="execCommand('removeFormat'); closeEditorContextMenu()"><span class="menu-icon">Aa</span> 清除格式</div>
      </div>

      <div class="diary-actions">
        <el-button type="primary" @click="saveDiary" :loading="diarySaving">保存日记</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { ArrowDown, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useLunar } from '~/composables/useLunar'
import { useAuthStore } from '~/stores/auth'
import RouteProgressBar from './RouteProgressBar.vue'
import type { Ship } from '~/types'

const props = defineProps<{
  selectedDate: Date
  shipList: Ship[]
  ports: { id: number; name: string }[]
}>()

const emit = defineEmits<{
  (e: 'diarySaved'): void
}>()

const api = useApi()
const authStore = useAuthStore()
const { getLunarInfo } = useLunar()

const isPoliticalInstructor = computed(() => authStore.user?.role === 'ship_political_instructor')

const diaryExpanded = ref(false)
const diarySaving = ref(false)
const showTaskPanel = ref(false)

const diaryForm = ref({
  weather: '',
  seaCondition: '',
  dynamicStatus: '',
  departurePort: '',
  arrivalPort: '',
  departureDate: '',
  arrivalDate: '',
  content: '',
  relatedScheduleIds: [] as number[],
  shipName: '',
  timezone: 'Asia/Shanghai',
  politicalInstructorName: '',
  politicalInstructorOnBoardDate: '',
})

const weatherValue = ref('')
const dynamicValue = ref('')
const customWeatherVisible = ref(false)
const customWeatherText = ref('')
const customDynamicVisible = ref(false)
const customDynamicText = ref('')

const selectedDateStr = computed(() => {
  const d = props.selectedDate
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const lunarInfo = computed(() => getLunarInfo(props.selectedDate))

const currentDiaryId = ref<number | null>(null)

const paperStyles = [
  { name: '白纸', bg: '#ffffff', line: '#e8e8e8' },
  { name: '黄纸', bg: '#fffbf0', line: '#ffe58f' },
  { name: '蓝纸', bg: '#f0f5ff', line: '#b3d1ff' },
]

const selectedPaper = ref(0)
const currentPaper = computed(() => paperStyles[selectedPaper.value])

const showLines = ref(true)
const fontSize = ref('16px')
const lineHeight = ref(30)
const fontColor = ref('#000000')
const showVersionHistory = ref(false)
const showMeetingRecord = ref(false)
const showCompressDialog = ref(false)

const activeTool = ref<string | null>(null)
const toolbarScrollRef = ref<HTMLElement | null>(null)
const bubblePanelRef = ref<HTMLElement | null>(null)

const listStyle = ref<'ordered' | 'unordered' | 'none'>('none')

const formatState = ref({
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  justifyLeft: true,
  justifyCenter: false,
  justifyRight: false,
})

const presetColors = ['#000000', '#FF0000', '#0066FF', '#009900', '#FF6600', '#9900CC', '#FF0099', '#666666', '#CCCCCC', '#FFFF00']

const saveStatus = ref<'saved' | 'saving' | 'unsaved'>('saved')
const saveStatusText = computed(() => {
  switch (saveStatus.value) {
    case 'saved': return '已保存'
    case 'saving': return '保存中...'
    case 'unsaved': return '未保存'
    default: return ''
  }
})

const saveStatusClass = computed(() => saveStatus.value)

const editorRef = ref<HTMLDivElement | null>(null)

const editorContextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
})

const paragraphActionVisible = ref(false)
const activeParagraph = ref<HTMLElement | null>(null)
const paragraphActionPos = ref({ top: 0, left: 0 })

const computedLineHeight = computed(() => `${lineHeight.value}px`)
const backgroundPosition = computed(() => `0 ${lineHeight.value}px`)

const textPositionOffset = ref(0)
const maxOffset = 10

const tasks = ref<any[]>([])

const filteredTasks = computed(() => {
  return tasks.value.filter(t => !t.isDismissed).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return 0
  })
})

const showDraftDialog = ref(false)
const draftInfo = ref<{ date: string; savedAt: string; preview: string } | null>(null)

const tasksLoading = ref(false)
const shipsLoading = ref(false)
const diaryDateSet = ref<Set<string>>(new Set())

const showInstructorInfoDialog = ref(false)
const daysOnBoardDisplay = computed(() => {
  if (!diaryForm.value.politicalInstructorOnBoardDate) return '--'
  const onBoard = new Date(diaryForm.value.politicalInstructorOnBoardDate)
  const today = props.selectedDate
  const diff = Math.floor((today.getTime() - onBoard.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
})

const schedulesLoading = ref(false)
const availableSchedules = ref<any[]>([])

const isScheduleSelected = (schedule: any) => {
  return diaryForm.value.relatedScheduleIds.includes(schedule.id || schedule.scheduleId)
}

const toggleScheduleRelation = (schedule: any) => {
  const id = schedule.id || schedule.scheduleId
  const idx = diaryForm.value.relatedScheduleIds.indexOf(id)
  if (idx > -1) {
    diaryForm.value.relatedScheduleIds.splice(idx, 1)
  } else {
    diaryForm.value.relatedScheduleIds.push(id)
  }
}

const selectAllSchedules = () => {
  diaryForm.value.relatedScheduleIds = availableSchedules.value.map(s => s.id || s.scheduleId).filter(Boolean) as number[]
}

const loadAvailableSchedules = async () => {
  schedulesLoading.value = true
  try {
    const dateStr = selectedDateStr.value
    availableSchedules.value = await api.schedules.getCompletedByDate(dateStr)
  } catch {
    availableSchedules.value = []
  } finally {
    schedulesLoading.value = false
  }
}

const loadShips = async () => {}

const loadDiaryDates = async () => {
  try {
    const dates = await api.diary.getDates()
    diaryDateSet.value = new Set(dates)
  } catch {
    diaryDateSet.value = new Set()
  }
}

const loadTasks = async () => {
  tasksLoading.value = true
  try {
    tasks.value = await api.task.getAll()
  } catch {
    tasks.value = []
  } finally {
    tasksLoading.value = false
  }
}

const loadDiary = async () => {
  try {
    const dateStr = selectedDateStr.value
    const diary = await api.diary.getByDate(dateStr)
    if (diary) {
      currentDiaryId.value = diary.id
      diaryForm.value = {
        ...diaryForm.value,
        weather: diary.weather || '',
        seaCondition: diary.seaCondition || '',
        dynamicStatus: diary.dynamicStatus || '',
        departurePort: diary.departurePort || '',
        arrivalPort: diary.arrivalPort || '',
        departureDate: diary.departureDate || '',
        arrivalDate: diary.arrivalDate || '',
        content: diary.content || '',
        relatedScheduleIds: diary.relatedScheduleIds || [],
        shipName: diary.shipName || '',
        timezone: diary.timezone || 'Asia/Shanghai',
        politicalInstructorName: diary.politicalInstructorName || '',
        politicalInstructorOnBoardDate: diary.politicalInstructorOnBoardDate || '',
      }
      weatherValue.value = diary.weather || ''
      dynamicValue.value = diary.dynamicStatus || ''
      nextTick(() => {
        if (editorRef.value) {
          editorRef.value.innerHTML = diary.content || ''
        }
      })
    } else {
      currentDiaryId.value = null
      diaryForm.value.content = ''
      nextTick(() => {
        if (editorRef.value) {
          editorRef.value.innerHTML = ''
        }
      })
      // 新建日记场景：政委角色预填船工主管粘贴的船舶动态数据
      if (isPoliticalInstructor.value) {
        await prefillDiaryFromShipDynamic()
      }
    }
  } catch {
    currentDiaryId.value = null
  }
}

// 政委日记预填：从政委关联船舶的船工主管粘贴数据预填表单
const prefillDiaryFromShipDynamic = async () => {
  try {
    const userId = authStore.user?.id
    if (!userId) return

    // 优先从 props.shipList 中按 politicalOfficerId 匹配政委关联的船
    let targetShip: Ship | null = null
    for (const s of props.shipList) {
      if (s.politicalOfficerId === userId) {
        targetShip = s
        break
      }
    }

    // shipList 未匹配到（可能 politicalOfficerId 未在列表里返回），遍历调 getOne 拿完整数据再匹配
    if (!targetShip && props.shipList.length > 0) {
      for (const s of props.shipList) {
        try {
          const full = await api.ships.getOne(s.id) as Ship
          if (full && full.politicalOfficerId === userId) {
            targetShip = full
            break
          }
        } catch {
          // 忽略单船查询失败
        }
      }
    }

    if (!targetShip) return
    // 仅当船工主管最近粘贴过报告时预填
    if (targetShip.dynamicSource !== 'supervisor') return
    if (!targetShip.dynamicUpdatedAt) return

    // 船舶 currentStatus → 政委日记 dynamicStatus 映射
    const mapShipStatusToDynamicStatus = (status?: string): string => {
      if (!status) return ''
      const s = String(status).toLowerCase()
      if (s === 'voyage' || s === 'sailing') return '航行中'
      if (s === 'anchored') return '锚泊中'
      if (s === 'berthed') return '靠泊中'
      if (s === 'repair') return '修船'
      return ''
    }

    if (targetShip.cnShipName) diaryForm.value.shipName = targetShip.cnShipName
    if (targetShip.departurePort) diaryForm.value.departurePort = targetShip.departurePort
    if (targetShip.etaPort) diaryForm.value.arrivalPort = targetShip.etaPort
    if (targetShip.timezone) diaryForm.value.timezone = targetShip.timezone
    if (targetShip.temperature) diaryForm.value.weather = targetShip.temperature
    if (targetShip.waveLevel) diaryForm.value.seaCondition = targetShip.waveLevel
    const mappedStatus = mapShipStatusToDynamicStatus(targetShip.currentStatus)
    if (mappedStatus) diaryForm.value.dynamicStatus = mappedStatus

    // 同步 weatherValue / dynamicValue（提交逻辑根据角色二选一，保持一致避免遗漏）
    weatherValue.value = diaryForm.value.weather
    dynamicValue.value = diaryForm.value.dynamicStatus

    // 当前位置拼到正文开头（diaryForm 无独立 location 字段）
    if (targetShip.currentLocation) {
      const locationPrefix = `当前位置：${targetShip.currentLocation}<br/>`
      diaryForm.value.content = locationPrefix
      nextTick(() => {
        if (editorRef.value) {
          editorRef.value.innerHTML = locationPrefix
        }
      })
    }

    ElMessage.success('已预填船工主管粘贴的船舶动态数据，可修改后保存')
  } catch {
    // 预填失败静默处理，不影响日记编辑主流程
  }
}

const saveDiary = async () => {
  const content = editorRef.value?.innerHTML || ''
  if (!content && diaryForm.value.relatedScheduleIds.length === 0) {
    ElMessage.warning('请填写日记内容或关联日程')
    return
  }

  saveStatus.value = 'saving'
  diarySaving.value = true
  try {
    const data = {
      date: selectedDateStr.value,
      weather: isPoliticalInstructor.value ? diaryForm.value.weather : weatherValue.value,
      seaCondition: diaryForm.value.seaCondition,
      dynamicStatus: isPoliticalInstructor.value ? diaryForm.value.dynamicStatus : dynamicValue.value,
      departurePort: diaryForm.value.departurePort,
      arrivalPort: diaryForm.value.arrivalPort,
      departureDate: diaryForm.value.departureDate,
      arrivalDate: diaryForm.value.arrivalDate,
      content,
      relatedScheduleIds: diaryForm.value.relatedScheduleIds,
      shipName: diaryForm.value.shipName,
      timezone: diaryForm.value.timezone,
      politicalInstructorName: diaryForm.value.politicalInstructorName,
      politicalInstructorOnBoardDate: diaryForm.value.politicalInstructorOnBoardDate,
    }
    if (currentDiaryId.value) {
      await api.diary.update(currentDiaryId.value, data as any)
    } else {
      const result = await api.diary.create(data as any)
      currentDiaryId.value = result.id
    }
    saveStatus.value = 'saved'
    ElMessage.success('日记保存成功')
    await loadDiaryDates()
    emit('diarySaved')
  } catch (error: any) {
    saveStatus.value = 'unsaved'
    ElMessage.error('保存失败: ' + (error.message || '未知错误'))
  } finally {
    diarySaving.value = false
  }
}

const saveInstructorInfo = () => {
  showInstructorInfoDialog.value = false
  ElMessage.success('信息已保存')
}

const onShipChange = () => {}

const detectedShipName = computed(() => {
  const content = diaryForm.value.content || ''
  if (!content || !props.shipList || props.shipList.length === 0) {
    return diaryForm.value.shipName || ''
  }
  for (const ship of props.shipList) {
    if (ship.cnShipName && content.includes(ship.cnShipName)) {
      return ship.cnShipName
    }
    if (ship.enShipName && content.toLowerCase().includes(ship.enShipName.toLowerCase())) {
      return ship.cnShipName
    }
  }
  return diaryForm.value.shipName || ''
})

const addFirstRowField = () => {}

const onWeatherVisibleChange = () => {}

const onDynamicVisibleChange = () => {}

const showCustomWeatherInput = () => {
  customWeatherVisible.value = true
}

const confirmCustomWeather = () => {
  if (customWeatherText.value.trim()) {
    weatherValue.value = customWeatherText.value.trim()
  }
  customWeatherVisible.value = false
  customWeatherText.value = ''
}

const showCustomDynamicInput = () => {
  customDynamicVisible.value = true
}

const confirmCustomDynamic = () => {
  if (customDynamicText.value.trim()) {
    dynamicValue.value = customDynamicText.value.trim()
  }
  customDynamicVisible.value = false
  customDynamicText.value = ''
}

const toggleTool = (tool: string) => {
  activeTool.value = activeTool.value === tool ? null : tool
}

const closeBubblePanelOnLeave = (e: MouseEvent) => {
  if (bubblePanelRef.value && !bubblePanelRef.value.contains(e.relatedTarget as Node)) {
    activeTool.value = null
  }
}

const execCommand = (cmd: string, value?: string) => {
  document.execCommand(cmd, false, value)
}

const applyListStyle = (style: 'ordered' | 'unordered' | 'none') => {
  listStyle.value = style
  if (style === 'none') {
    execCommand('insertUnorderedList')
    execCommand('insertUnorderedList')
  } else if (style === 'ordered') {
    execCommand('insertOrderedList')
  } else {
    execCommand('insertUnorderedList')
  }
  activeTool.value = null
}

const onFontSizeChange = (size: string) => {
  fontSize.value = size
  execCommand('fontSize', size.replace('px', ''))
}

const onFontColorChange = (color: string) => {
  fontColor.value = color
  execCommand('foreColor', color)
}

const toggleLines = () => {
  showLines.value = !showLines.value
}

const insertPhoto = () => {
  ElMessage.info('图片上传功能开发中')
}

const insertLink = () => {
  const url = prompt('请输入链接地址')
  if (url) {
    execCommand('createLink', url)
  }
}

const undoAction = () => {
  execCommand('undo')
}

const onContentInput = () => {
  saveStatus.value = 'unsaved'
}

const onPaste = (e: ClipboardEvent) => {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/html') || e.clipboardData?.getData('text/plain') || ''
  execCommand('insertHTML', text)
}

const onEditorContextMenu = (e: MouseEvent) => {
  editorContextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
  }
  document.addEventListener('click', closeEditorContextMenu)
}

const closeEditorContextMenu = () => {
  editorContextMenu.value.visible = false
  document.removeEventListener('click', closeEditorContextMenu)
}

const updateParagraphButton = () => {
}

const openParagraphMenu = () => {
}

const setParagraphFormat = (format: string) => {
  if (format === 'p') {
    execCommand('formatBlock', 'p')
  } else if (format === 'divider') {
    execCommand('insertHTML', '<hr style="border:none; border-top:1px dashed #ccc; margin:12px 0;" />')
  }
}

const goToSchedule = () => {
}

const goToDashboard = () => {
}

const openTaskDialog = () => {}

const onTaskContextMenu = () => {}

const togglePin = () => {}

const toggleComplete = () => {}

const dismissTask = () => {}

const openAddTaskDialog = () => {}

const confirmAddTask = () => {}

const dismissDraft = () => {}

const clearLocalDraft = () => {}

const restoreDraft = () => {}

const loadDraft = () => {}

const saveDraft = () => {}

watch(() => props.selectedDate, async () => {
  await loadDiary()
  await loadAvailableSchedules()
}, { immediate: false })

onMounted(async () => {
  await loadDiary()
  await loadDiaryDates()
  await loadAvailableSchedules()
})
</script>

<style scoped>
.diary-panel {
  background: white;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  margin-top: 20px;
  overflow: hidden;
}

.diary-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.diary-panel-header:hover {
  background-color: #fafafa;
}

.diary-panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.expand-icon {
  transition: transform 0.2s;
  color: #909399;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.diary-panel-content {
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
}

/* 华为笔记风格日期头部 */
.date-header-huawei {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 16px;
  color: white;
}

.date-huawei-left {
  flex: 1;
}

.date-huawei-number {
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
}

.date-huawei-middle {
  flex: 2;
  text-align: center;
}

.date-huawei-year {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.date-huawei-lunar-row {
  display: flex;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  opacity: 0.9;
}

.lunar-text {
  color: rgba(255, 255, 255, 0.9);
}

.holiday-text {
  color: #ffd700;
  font-weight: 600;
}

.solar-text {
  color: #ffb6c1;
}

.date-huawei-right {
  flex: 2;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.huawei-select {
  width: 100px;
}

/* 信息栏 */
.info-bar {
  margin-bottom: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.info-group {
  flex: 1;
  min-width: 120px;
}

.info-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #606266;
  margin-bottom: 4px;
}

.label-text {
  font-size: 12px;
}

/* 工具栏 */
.huawei-toolbar-wrapper {
  margin-bottom: 16px;
}

.huawei-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
}

.huawei-toolbar-scroll {
  display: flex;
  align-items: center;
  gap: 4px;
}

.hw-tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #606266;
  transition: all 0.2s;
}

.hw-tool-btn:hover {
  background: #e8e8e8;
}

.hw-tool-btn.active {
  background: #409eff;
  color: white;
}

.hw-toolbar-divider {
  width: 1px;
  height: 24px;
  background: #dcdfe6;
  margin: 0 4px;
}

.hw-toolbar-right {
  font-size: 12px;
}

.save-status-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #606266;
}

.save-status-indicator.saving {
  color: #409eff;
}

.save-status-indicator.saved {
  color: #67c23a;
}

.save-status-indicator.unsaved {
  color: #e6a23c;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 气泡面板 */
.hw-bubble-panel {
  position: absolute;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 12px;
  z-index: 100;
}

.bubble-section {
  margin-bottom: 12px;
}

.bubble-section:last-child {
  margin-bottom: 0;
}

.bubble-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
  display: block;
}

.bubble-list-options {
  display: flex;
  gap: 8px;
}

.bubble-list-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 11px;
  color: #606266;
  transition: all 0.2s;
}

.bubble-list-btn:hover {
  border-color: #409eff;
}

.bubble-list-btn.active {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.bubble-indent-buttons {
  display: flex;
  gap: 8px;
}

.bubble-indent-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  color: #606266;
  transition: all 0.2s;
}

.bubble-indent-btn:hover {
  border-color: #409eff;
}

.bubble-format-buttons {
  display: flex;
  gap: 4px;
}

.bubble-format-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
}

.bubble-format-btn:hover {
  border-color: #409eff;
}

.bubble-format-btn.active {
  background: #409eff;
  color: white;
  border-color: #409eff;
}

.bubble-font-size-btns {
  display: flex;
  gap: 4px;
}

.bubble-size-btn {
  padding: 4px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  color: #606266;
  transition: all 0.2s;
}

.bubble-size-btn:hover {
  border-color: #409eff;
}

.bubble-size-btn.active {
  background: #409eff;
  color: white;
  border-color: #409eff;
}

.bubble-align-btn {
  display: flex;
  gap: 4px;
}

.bubble-align-btn-item {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.bubble-align-btn-item:hover {
  border-color: #409eff;
}

.bubble-align-btn-item.active {
  background: #409eff;
  color: white;
  border-color: #409eff;
}

.bubble-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.bubble-color-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.bubble-color-dot:hover {
  transform: scale(1.1);
}

.bubble-color-dot.active {
  border-color: #409eff;
}

.bubble-color-picker {
  margin-left: 8px;
}

.bubble-clear-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  color: #606266;
  transition: all 0.2s;
}

.bubble-clear-btn:hover {
  border-color: #f56c6c;
  color: #f56c6c;
}

/* 更多工具面板 */
.huawei-more-panel {
  position: absolute;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 12px;
  z-index: 100;
}

.more-panel-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.more-panel-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  color: #606266;
  transition: all 0.2s;
}

.more-panel-item:hover {
  background: #f5f7fa;
}

/* 编辑器 */
.editor-container {
  min-height: 300px;
  background-color: var(--paper-bg);
  background-image: repeating-linear-gradient(var(--line-color) 0px, var(--line-color) 1px, transparent 1px, transparent var(--line-height));
  background-size: 100% var(--line-height);
  background-position: var(--bg-position);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.editor-container.show-lines {
  background-image: repeating-linear-gradient(var(--line-color) 0px, var(--line-color) 1px, transparent 1px, transparent var(--line-height));
}

.editor-content {
  min-height: 260px;
  outline: none;
  white-space: pre-wrap;
  word-break: break-word;
}

.editor-content:focus {
  outline: none;
}

/* 编辑器右键菜单 */
.editor-context-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  z-index: 9999;
  min-width: 140px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  color: #303133;
}

.menu-item:hover {
  background: #f5f7fa;
}

.menu-icon {
  font-size: 12px;
}

.menu-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0;
}

/* 进度条 */
.progress-section {
  margin-top: 16px;
}

.progress-placeholder {
  padding: 12px;
}

.progress-bar {
  height: 8px;
  background: #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bg {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #66b1ff);
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

/* 日记操作按钮 */
.diary-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
