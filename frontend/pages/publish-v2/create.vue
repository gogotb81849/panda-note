<template>
  <div class="create-task-page">
    <!-- 顶部导航栏 -->
    <div class="top-nav-bar">
      <div class="nav-back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
      </div>
      <div class="nav-title">新建任务</div>
      <div class="nav-right-actions">
        <el-select v-model="selectedTemplateId" placeholder="选择模板" size="small" class="template-select" @change="loadSelectedTemplate" clearable>
          <el-option v-for="t in allTemplates" :key="t.id" :label="t.templateName" :value="t.id" />
        </el-select>
        <el-button type="primary" size="small" @click="handlePublish" :loading="saving" :disabled="!formData.templateName || formData.fields.length === 0">
          发布
        </el-button>
      </div>
    </div>

    <!-- 顶部标签导航 -->
    <div class="top-tabs">
      <div class="tab-item" :class="{ active: currentTab === 'edit' }" @click="currentTab = 'edit'">
        编辑
      </div>
      <div class="tab-item" :class="{ active: currentTab === 'preview' }" @click="currentTab = 'preview'">
        预览
      </div>
      <div class="tab-item" :class="{ active: currentTab === 'stats' }" @click="currentTab = 'stats'">
        统计
      </div>
      <div class="tab-item" :class="{ active: currentTab === 'settings' }" @click="currentTab = 'settings'">
        设置
      </div>
    </div>

    <!-- 编辑标签页 -->
    <div v-show="currentTab === 'edit'" class="edit-tab">
      <!-- 左侧题型快捷面板（可折叠） -->
      <aside class="field-type-panel">
        <details open>
          <summary class="panel-summary">
            <span class="panel-title">题型</span>
            <el-icon class="panel-toggle-icon"><CaretBottom /></el-icon>
          </summary>
          <div class="panel-content">
            <div
              v-for="qt in basicQuestionTypes"
              :key="qt.type + qt.name"
              class="quick-type-item"
              @click="addFieldByType(qt.type)"
            >
              <div class="quick-type-icon" :style="{ background: qt.color + '20', color: qt.color }">
                <el-icon><component :is="qt.icon" /></el-icon>
              </div>
              <span class="quick-type-name">{{ qt.name }}</span>
            </div>
          </div>
        </details>
      </aside>

      <!-- 右侧编辑主区域 -->
      <main class="edit-main">
        <!-- 封面区域 -->
        <div class="cover-section">
          <el-upload
            class="cover-upload"
            :show-file-list="false"
            :auto-upload="true"
            :http-request="handleCoverUpload"
            accept="image/*"
          >
            <div v-if="formData.coverImage" class="cover-image-wrap">
              <img :src="formData.coverImage" class="cover-image" />
              <div class="cover-image-mask">
                <el-icon><EditPen /></el-icon>
                <span>更换封面</span>
              </div>
            </div>
            <div v-else class="cover-placeholder">
              <el-icon><Picture /></el-icon>
              <span>轻触设置收集表封面</span>
            </div>
          </el-upload>
        </div>

        <!-- 标题区域 -->
        <div class="card">
          <el-input
            v-model="formData.templateName"
            placeholder="请添加标题"
            class="title-input"
          />
          <el-input
            v-model="taskDescription"
            placeholder="添加描述：文字、图片或链接"
            class="desc-input"
          />
          <div class="feature-buttons">
            <el-button link class="feature-btn">
              <el-icon><Clock /></el-icon>
              <span>+ 定时和重复</span>
            </el-button>
            <el-button link class="feature-btn">
              <el-icon><UserFilled /></el-icon>
              <span>+ 填写名单</span>
            </el-button>
            <el-button link class="feature-btn">
              <el-icon><Document /></el-icon>
              <span>+ 结束页</span>
            </el-button>
          </div>
        </div>

        <!-- AI助手入口 -->
        <div class="card ai-card">
          <el-icon class="ai-icon"><Lightning /></el-icon>
          <span>让AI文档助手帮你做问卷</span>
        </div>

        <!-- 问题列表 -->
        <div class="questions-list">
          <div
            v-for="(field, index) in formData.fields"
            :key="field._key"
            class="card question-card"
            :class="{ active: activeFieldKey === field._key, 'is-section': field.fieldType === 'section' }"
            @click="activeFieldKey = field._key"
          >
            <!-- 分区标题：简化为一行 -->
            <div v-if="field.fieldType === 'section'" class="section-row">
              <el-icon class="section-icon"><Memo /></el-icon>
              <el-input
                v-model="field.fieldLabel"
                placeholder="分区标题"
                class="section-title-input"
              />
              <div class="question-ops">
                <el-button link size="small" @click.stop="moveFieldUp(index)">
                  <el-icon><ArrowUp /></el-icon>
                </el-button>
                <el-button link size="small" @click.stop="moveFieldDown(index)">
                  <el-icon><ArrowDown /></el-icon>
                </el-button>
                <el-button link size="small" type="danger" @click.stop="removeField(index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>

            <!-- 普通问题：紧凑布局 -->
            <template v-else>
              <!-- 第一行：序号 + 标题 + 题型下拉 + 必填开关 + 操作按钮 -->
              <div class="question-header">
                <div class="question-index">
                  <span class="required-marker" v-if="field.isRequired">*</span>
                  {{ String(index + 1).padStart(2, '0') }}
                </div>
                <el-input
                  v-model="field.fieldLabel"
                  placeholder="问题标题"
                  class="question-title-input"
                />
                <el-select
                  v-model="field.fieldType"
                  class="question-type-select"
                  size="small"
                  :placeholder="getFieldTypeName(field.fieldType)"
                  @click.stop
                  @change="handleFieldTypeChange(field)"
                >
                  <el-option label="单行文本" value="text" />
                  <el-option label="多行文本" value="textarea" />
                  <el-option label="数字" value="number" />
                  <el-option label="日期" value="date" />
                  <el-option label="评分" value="rating" />
                  <el-option label="单选" value="select" />
                  <el-option label="多选" value="multi_select" />
                  <el-option label="勾选框" value="checkbox" />
                  <el-option label="文件上传" value="attachment" />
                  <el-option label="明细题" value="group" />
                </el-select>
                <span class="required-switch">
                  <span class="switch-label">必填</span>
                  <el-switch v-model="field.isRequired" />
                </span>
                <div class="question-ops">
                  <el-button link size="small" @click.stop="moveFieldUp(index)">
                    <el-icon><ArrowUp /></el-icon>
                  </el-button>
                  <el-button link size="small" @click.stop="moveFieldDown(index)">
                    <el-icon><ArrowDown /></el-icon>
                  </el-button>
                  <el-button link size="small" type="danger" @click.stop="removeField(index)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>

              <!-- 选项编辑区（仅单选/多选） -->
              <div v-if="field.fieldType === 'select' || field.fieldType === 'multi_select'" class="options-edit">
                <div v-for="(opt, idx) in getOptions(field)" :key="idx" class="option-edit-item">
                  <el-icon class="option-radio-icon">
                    <component :is="field.fieldType === 'select' ? CircleCheck : Check" />
                  </el-icon>
                  <el-input
                    v-model="getOptions(field)[idx]"
                    placeholder="选项"
                    class="option-input"
                    @blur="syncOptionsToField(field)"
                  />
                  <el-button link size="small" @click.stop="removeOption(field, idx)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <el-button link class="add-option-btn" @click.stop="addOption(field)">
                  <el-icon><Plus /></el-icon>
                  <span>添加选项</span>
                </el-button>
              </div>

              <!-- 明细题子字段编辑区（仅group显示） -->
              <div v-if="field.fieldType === 'group'" class="sub-fields-edit">
                <div class="sub-fields-title">
                  <span>子字段配置</span>
                  <el-button link size="small" class="add-sub-field-btn" @click.stop="addSubField(field)">
                    <el-icon><Plus /></el-icon>
                    <span>添加字段</span>
                  </el-button>
                </div>
                <div
                  v-for="(sub, sIdx) in (field.subFields || [])"
                  :key="sub._key"
                  class="sub-field-edit-item"
                >
                  <div class="sub-field-row1">
                    <el-input
                      v-model="sub.label"
                      placeholder="字段名称（如：姓名）"
                      class="sub-field-label-input"
                    />
                    <el-select
                      v-model="sub.type"
                      placeholder="字段类型"
                      class="sub-field-type-select"
                    >
                      <el-option
                        v-for="opt in subFieldTypeOptions"
                        :key="opt.value"
                        :label="opt.label"
                        :value="opt.value"
                      />
                    </el-select>
                    <div class="sub-field-required">
                      <span class="switch-label">必填</span>
                      <el-switch v-model="sub.required" />
                    </div>
                    <el-button link size="small" type="danger" @click.stop="removeSubField(field, sIdx)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                  <!-- select类型的选项编辑 -->
                  <div v-if="sub.type === 'select'" class="sub-field-options">
                    <div
                      v-for="(opt, oIdx) in getSubFieldOptions(sub)"
                      :key="oIdx"
                      class="sub-field-option-item"
                    >
                      <el-input
                        v-model="sub.options![oIdx]"
                        placeholder="选项"
                        class="sub-field-option-input"
                      />
                      <el-button link size="small" @click.stop="removeSubFieldOption(sub, oIdx)">
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                    <el-button link size="small" class="add-sub-option-btn" @click.stop="addSubFieldOption(sub)">
                      <el-icon><Plus /></el-icon>
                      <span>添加选项</span>
                    </el-button>
                  </div>
                  <!-- attachment类型的数量限制 -->
                  <div v-if="sub.type === 'attachment'" class="sub-field-max">
                    <span class="max-label">最多上传：</span>
                    <el-input-number
                      v-model="sub.maxCount"
                      :min="1"
                      :max="20"
                      :controls="false"
                      class="sub-field-max-input"
                    />
                    <span class="max-label">个文件</span>
                  </div>
                </div>
              </div>

              <!-- 折叠区域：显示条件 + 验证规则 -->
              <details class="advanced-config">
                <summary class="advanced-summary">
                  <span>高级设置</span>
                  <el-icon class="advanced-toggle-icon"><ArrowRight /></el-icon>
                </summary>
                <div class="advanced-body">
                  <!-- 显示条件配置 -->
                  <div class="condition-config">
                    <div class="condition-header">
                      <span class="condition-title">显示条件</span>
                      <el-button link size="small" @click.stop="addCondition(field)">
                        <el-icon><Plus /></el-icon> 添加条件
                      </el-button>
                    </div>
                    <div v-for="(cond, ci) in (field.showWhen || [])" :key="ci" class="condition-item">
                      <el-select v-model="cond.field" placeholder="选择字段" size="small">
                        <el-option v-for="f in getAvailableConditionFields(field)" :key="f.fieldName" :label="f.fieldLabel" :value="f.fieldName" />
                      </el-select>
                      <el-select v-model="cond.type" size="small" style="width: 100px">
                        <el-option label="等于" value="eq" />
                        <el-option label="不等于" value="neq" />
                      </el-select>
                      <el-input v-model="cond.value" placeholder="条件值" size="small" />
                      <el-button link size="small" type="danger" @click.stop="removeCondition(field, ci)"><el-icon><Delete /></el-icon></el-button>
                    </div>
                  </div>

                  <!-- 验证规则 -->
                  <div class="validation-config">
                    <div class="validation-header" @click.stop="toggleValidation(field._key)">
                      <span class="validation-title">验证规则</span>
                      <el-icon class="validation-toggle-icon" :class="{ expanded: isValidationExpanded(field._key) }"><ArrowRight /></el-icon>
                    </div>
                    <div v-if="isValidationExpanded(field._key)" class="validation-body">
                      <!-- 文本类型：最小/最大长度 -->
                      <template v-if="field.fieldType === 'text' || field.fieldType === 'textarea'">
                        <div class="validation-row">
                          <span class="validation-label">最小长度</span>
                          <el-input-number v-model="field.validation!.minLength" :min="0" :controls="false" size="small" placeholder="不限" @focus="initValidation(field)" />
                        </div>
                        <div class="validation-row">
                          <span class="validation-label">最大长度</span>
                          <el-input-number v-model="field.validation!.maxLength" :min="0" :controls="false" size="small" placeholder="不限" @focus="initValidation(field)" />
                        </div>
                      </template>
                      <!-- 数字类型：最小/最大值 -->
                      <template v-if="field.fieldType === 'number'">
                        <div class="validation-row">
                          <span class="validation-label">最小值</span>
                          <el-input-number v-model="field.validation!.min" :controls="false" size="small" placeholder="不限" @focus="initValidation(field)" />
                        </div>
                        <div class="validation-row">
                          <span class="validation-label">最大值</span>
                          <el-input-number v-model="field.validation!.max" :controls="false" size="small" placeholder="不限" @focus="initValidation(field)" />
                        </div>
                      </template>
                      <!-- 通用：正则验证 -->
                      <div class="validation-row">
                        <span class="validation-label">正则验证</span>
                        <el-input v-model="field.validation!.pattern" size="small" placeholder="如：^[A-Za-z]+$" @focus="initValidation(field)" />
                      </div>
                      <div class="validation-row">
                        <span class="validation-label">正则提示</span>
                        <el-input v-model="field.validation!.patternMsg" size="small" placeholder="验证不通过时的提示语" @focus="initValidation(field)" />
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </template>
          </div>
        </div>

        <!-- 添加问题按钮 -->
        <div class="add-question-btn" @click="showAddQuestionModal = true">
          <el-icon><Plus /></el-icon>
          <span>添加问题</span>
        </div>
      </main>
    </div>

    <!-- 预览标签页 -->
    <div v-show="currentTab === 'preview'" class="preview-tab">
      <div class="preview-phone-frame">
        <div class="phone-status-bar">
          <span class="status-time">9:41</span>
          <div class="status-icons">
            <el-icon><Connection /></el-icon>
            <el-icon><Promotion /></el-icon>
          </div>
        </div>
        <div class="phone-content">
          <!-- 封面图片 -->
          <div v-if="formData.coverImage" class="preview-cover-wrap">
            <img :src="formData.coverImage" class="preview-cover-img" />
          </div>
          <!-- 表单标题 -->
          <div class="preview-form-header">
            <h2 class="preview-form-title">{{ formData.templateName || '未命名表单' }}</h2>
            <p v-if="taskDescription" class="preview-form-desc">{{ taskDescription }}</p>
          </div>
          <!-- 字段列表 -->
          <div class="preview-fields-list">
            <template v-for="(field, index) in formData.fields" :key="field._key">
              <div v-if="isFieldVisible(field)" class="preview-field-item">
                <!-- 分区标题 -->
                <template v-if="field.fieldType === 'section'">
                  <div class="preview-section-title">
                    <span>{{ field.fieldLabel || '分区标题' }}</span>
                  </div>
                </template>
                <!-- 单行文本 -->
                <template v-else-if="field.fieldType === 'text'">
                  <div class="preview-field-label">
                    <span v-if="field.isRequired" class="preview-required">*</span>
                    {{ field.fieldLabel }}
                  </div>
                  <el-input v-model="previewData[field.fieldName]" placeholder="请输入" disabled size="small" />
                </template>
                <!-- 多行文本 -->
                <template v-else-if="field.fieldType === 'textarea'">
                  <div class="preview-field-label">
                    <span v-if="field.isRequired" class="preview-required">*</span>
                    {{ field.fieldLabel }}
                  </div>
                  <el-input v-model="previewData[field.fieldName]" type="textarea" placeholder="请输入" disabled :rows="3" size="small" />
                </template>
                <!-- 数字 -->
                <template v-else-if="field.fieldType === 'number'">
                  <div class="preview-field-label">
                    <span v-if="field.isRequired" class="preview-required">*</span>
                    {{ field.fieldLabel }}
                  </div>
                  <el-input-number v-model="previewData[field.fieldName]" placeholder="请输入数字" :controls="false" disabled size="small" />
                </template>
                <!-- 日期 -->
                <template v-else-if="field.fieldType === 'date'">
                  <div class="preview-field-label">
                    <span v-if="field.isRequired" class="preview-required">*</span>
                    {{ field.fieldLabel }}
                  </div>
                  <el-date-picker v-model="previewData[field.fieldName]" placeholder="请选择日期" type="date" disabled size="small" style="width: 100%" />
                </template>
                <!-- 单选 -->
                <template v-else-if="field.fieldType === 'select'">
                  <div class="preview-field-label">
                    <span v-if="field.isRequired" class="preview-required">*</span>
                    {{ field.fieldLabel }}
                  </div>
                  <el-radio-group v-model="previewData[field.fieldName]" size="small">
                    <el-radio v-for="opt in getPreviewFieldOptions(field)" :key="opt" :value="opt">{{ opt }}</el-radio>
                  </el-radio-group>
                </template>
                <!-- 多选 -->
                <template v-else-if="field.fieldType === 'multi_select'">
                  <div class="preview-field-label">
                    <span v-if="field.isRequired" class="preview-required">*</span>
                    {{ field.fieldLabel }}
                  </div>
                  <el-checkbox-group v-model="previewData[field.fieldName]" size="small">
                    <el-checkbox v-for="opt in getPreviewFieldOptions(field)" :key="opt" :label="opt" :value="opt">{{ opt }}</el-checkbox>
                  </el-checkbox-group>
                </template>
                <!-- 评分 -->
                <template v-else-if="field.fieldType === 'rating'">
                  <div class="preview-field-label">
                    <span v-if="field.isRequired" class="preview-required">*</span>
                    {{ field.fieldLabel }}
                  </div>
                  <div class="preview-rating">
                    <div v-for="i in 5" :key="i" class="star-icon" :class="{ active: i <= (previewData[field.fieldName] || 0) }" @click="previewData[field.fieldName] = i">
                      <el-icon><Star /></el-icon>
                    </div>
                  </div>
                </template>
                <!-- 勾选框 -->
                <template v-else-if="field.fieldType === 'checkbox'">
                  <div class="preview-field-label">
                    <span v-if="field.isRequired" class="preview-required">*</span>
                    {{ field.fieldLabel }}
                  </div>
                  <el-checkbox v-model="previewData[field.fieldName]" disabled size="small">确认</el-checkbox>
                </template>
                <!-- 文件上传 -->
                <template v-else-if="field.fieldType === 'attachment'">
                  <div class="preview-field-label">
                    <span v-if="field.isRequired" class="preview-required">*</span>
                    {{ field.fieldLabel }}
                  </div>
                  <div class="preview-attachment">
                    <el-icon><Plus /></el-icon>
                    <span>点击上传</span>
                  </div>
                </template>
                <!-- 明细题 -->
                <template v-else-if="field.fieldType === 'group'">
                  <div class="preview-field-label">
                    <span v-if="field.isRequired" class="preview-required">*</span>
                    {{ field.fieldLabel }}
                  </div>
                  <div class="preview-group">
                    <div class="preview-group-hint">
                      <el-icon><Files /></el-icon>
                      <span>可添加多条记录</span>
                    </div>
                  </div>
                </template>
              </div>
            </template>
          </div>
          <!-- 提交按钮 -->
          <div class="preview-submit-area">
            <el-button type="primary" disabled class="preview-submit-btn">提交</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计标签页 -->
    <div v-show="currentTab === 'stats'" class="stats-tab">
      <div class="card">
        <div class="stats-header">
          <span class="stats-title">填写情况</span>
          <el-tag size="small" type="info">暂未发布</el-tag>
        </div>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">0</span>
            <span class="stat-label">填写人数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">0</span>
            <span class="stat-label">填写结果</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">0</span>
            <span class="stat-label">未填写人数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">0MB</span>
            <span class="stat-label">收集附件容量</span>
          </div>
        </div>
        <el-button class="stats-action-btn">
          <el-icon><Grid /></el-icon>
          <span>关联结果到表格</span>
        </el-button>
      </div>
      <div class="card">
        <div class="stats-tabs">
          <span class="stats-tab-item active">未填写</span>
          <span class="stats-tab-item">已填写</span>
        </div>
        <div class="empty-state">
          <div class="empty-icon">
            <el-icon><EditPen /></el-icon>
          </div>
          <span>暂无未填写人</span>
        </div>
      </div>
    </div>

    <!-- 设置标签页 -->
    <div v-show="currentTab === 'settings'" class="settings-tab">
      <div class="card">
        <div class="settings-section">
          <span class="section-title">基本设置</span>
          <div class="settings-item">
            <span class="item-label">任务名称</span>
            <el-input v-model="formData.templateName" />
          </div>
          <div class="settings-item">
            <span class="item-label">任务类型</span>
            <el-select v-model="formData.taskType" placeholder="请选择">
              <el-option label="表单收集" value="form_collect" />
              <el-option label="清单勾选" value="checklist" />
              <el-option label="文件收集" value="file_collect" />
              <el-option label="拍照打卡" value="photo_checkin" />
              <el-option label="AI分析收集" value="ai_survey" />
            </el-select>
          </div>
        </div>
        <div class="settings-section">
          <span class="section-title">发布设置</span>
          <div class="settings-item">
            <span class="item-label">目标船舶</span>
            <el-select v-model="publishConfig.targetShips">
              <el-option label="全部船舶" value="all" />
              <el-option label="自定义选择" value="custom" />
              <el-option label="预计到港前" value="eta_before" />
            </el-select>
          </div>
          <div class="settings-item">
            <span class="item-label">截止日期</span>
            <el-date-picker v-model="publishConfig.deadline" type="date" />
          </div>
        </div>
      </div>
    </div>

    <!-- 底部固定发布按钮 -->
    <div class="bottom-bar">
      <el-button class="save-btn" @click="handleSaveDraft" :loading="saving">
        <el-icon><Document /></el-icon>
        保存草稿
      </el-button>
      <el-button class="publish-btn" type="primary" @click="handlePublish" :loading="saving" :disabled="!formData.templateName || formData.fields.length === 0">
        发布
      </el-button>
    </div>

    <!-- 添加问题弹窗 -->
    <el-dialog
      v-model="showAddQuestionModal"
      title="添加问题"
      width="90%"
      :close-on-click-modal="true"
      :show-header="true"
      :show-close="true"
    >
      <div class="add-question-modal">
        <!-- 搜索框 -->
        <div class="search-box">
          <el-icon class="search-icon"><Search /></el-icon>
          <el-input placeholder="输入问题，自动匹配题型" />
        </div>

        <!-- 基础题型 -->
        <div class="question-category">
          <div class="category-header">
            <el-icon class="caret-icon"><CaretBottom /></el-icon>
            <span class="category-title">基础题型</span>
          </div>
          <div class="type-grid">
            <div
              v-for="qt in basicQuestionTypes"
              :key="qt.type"
              class="type-grid-item"
              @click="addFieldByType(qt.type); showAddQuestionModal = false"
            >
              <div class="type-grid-icon" :style="{ background: qt.color + '20', color: qt.color }">
                <el-icon><component :is="qt.icon" /></el-icon>
              </div>
              <span class="type-grid-name">{{ qt.name }}</span>
            </div>
          </div>
        </div>

        <!-- 问卷调研 -->
        <div class="question-category">
          <div class="category-header">
            <el-icon class="caret-icon"><CaretBottom /></el-icon>
            <span class="category-title">问卷调研</span>
          </div>
          <div class="type-row">
            <div
              v-for="qt in surveyQuestionTypes"
              :key="qt.type"
              class="type-row-item"
              @click="addFieldByType(qt.type); showAddQuestionModal = false"
            >
              {{ qt.name }}
            </div>
          </div>
        </div>

        <!-- 个人信息 -->
        <div class="question-category">
          <div class="category-header">
            <el-icon class="caret-icon"><CaretBottom /></el-icon>
            <span class="category-title">个人信息</span>
          </div>
          <div class="type-row">
            <div
              v-for="qt in personalQuestionTypes"
              :key="qt.type"
              class="type-row-item"
              @click="addFieldByType(qt.type); showAddQuestionModal = false"
            >
              {{ qt.name }}
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import {
  Plus, ArrowLeft, ArrowRight, ArrowUp, ArrowDown,
  Delete, Check, List, UserFilled, Document, Promotion,
  EditPen, Camera, FolderOpened, MagicStick, Star,
  Memo, Calendar, Files, Picture, Clock, Lightning, Search,
  CaretBottom, CircleCheck, Grid, Connection,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useApi } from '~/composables/useApi'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const router = useRouter()
const route = useRoute()

// 返回上一页
function goBack() {
  // 如果有历史记录则返回，否则跳转到模板列表
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/publish-v2')
  }
}

const currentStep = ref(0)
const saving = ref(false)
const templateLoading = ref(false)
const selectedTemplateId = ref<number | null>(null)
const createMode = ref('')
const activeFieldKey = ref('')
const dummyRating = ref(0)
const currentTab = ref('edit')
const showAddQuestionModal = ref(false)
const taskDescription = ref('')

let fieldKeyCounter = 0
function nextFieldKey() {
  return `field_${Date.now()}_${++fieldKeyCounter}`
}

interface FieldItem {
  _key: string
  fieldName: string
  fieldLabel: string
  fieldType: 'text' | 'textarea' | 'select' | 'multi_select' | 'number' | 'date' | 'attachment' | 'checkbox' | 'rating' | 'group' | 'section'
  fieldOptions: string
  isRequired: boolean
  sortOrder: number
  maxCount?: number
  helpText?: string
  // 明细题（group）专用：子字段定义
  subFields?: SubFieldItem[]
  // 显示条件
  showWhen?: { field: string; type?: string; value?: string }[]
  // 验证规则
  validation?: {
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    pattern?: string
    patternMsg?: string
  }
}

// 明细题的子字段
interface SubFieldItem {
  _key: string
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'attachment'
  required: boolean
  options?: string[]  // select 类型的选项
  maxCount?: number   // attachment 类型的最大数量
}

let subFieldKeyCounter = 0
function nextSubFieldKey() {
  return `sub_${Date.now()}_${++subFieldKeyCounter}`
}

// 基础题型（用于弹窗）
const basicQuestionTypes = [
  { type: 'text', name: '问答题', icon: EditPen, color: '#ff6b35' },
  { type: 'select', name: '单选题', icon: CircleCheck, color: '#40a9ff' },
  { type: 'multi_select', name: '多选题', icon: Check, color: '#52c41a' },
  { type: 'date', name: '时间题', icon: Clock, color: '#722ed1' },
  { type: 'attachment', name: '图片题', icon: Picture, color: '#13c2c2' },
  { type: 'attachment', name: '文件题', icon: FolderOpened, color: '#eb2f96' },
  { type: 'group', name: '明细题', icon: Files, color: '#fa8c16' },
  { type: 'section', name: '分区标题', icon: Memo, color: '#8c8c8c' },
]

// 问卷调研题型
const surveyQuestionTypes = [
  { type: 'rating', name: '评分' },
  { type: 'select', name: 'NPS' },
  { type: 'select', name: '满意度' },
]

// 个人信息题型
const personalQuestionTypes = [
  { type: 'text', name: '姓名' },
  { type: 'text', name: '身份证' },
  { type: 'date', name: '出生日期' },
  { type: 'select', name: '血型' },
  { type: 'select', name: '性别' },
  { type: 'select', name: '民族' },
]

function getFieldTypeName(type: string): string {
  const map: Record<string, string> = {
    text: '单行文本',
    textarea: '多行文本',
    number: '数字',
    date: '日期',
    rating: '评分',
    select: '单选',
    multi_select: '多选',
    checkbox: '勾选框',
    attachment: '文件上传',
    group: '明细题',
    section: '分区标题',
  }
  return map[type] || type
}

// 子字段类型名称
function getSubFieldTypeName(type: string): string {
  const map: Record<string, string> = {
    text: '单行文本',
    textarea: '多行文本',
    number: '数字',
    date: '日期',
    select: '下拉选择',
    attachment: '文件/图片',
  }
  return map[type] || type
}

// 子字段可选类型列表
const subFieldTypeOptions = [
  { value: 'text', label: '单行文本' },
  { value: 'textarea', label: '多行文本' },
  { value: 'number', label: '数字' },
  { value: 'date', label: '日期' },
  { value: 'select', label: '下拉选择' },
  { value: 'attachment', label: '文件/图片' },
]

// 添加子字段到明细题
function addSubField(field: FieldItem) {
  if (!field.subFields) field.subFields = []
  field.subFields.push({
    _key: nextSubFieldKey(),
    name: '',
    label: `字段${field.subFields.length + 1}`,
    type: 'text',
    required: false,
  })
}

// 删除明细题的子字段
function removeSubField(field: FieldItem, index: number) {
  if (!field.subFields) return
  field.subFields.splice(index, 1)
}

// 获取明细题的子字段选项（select类型）
function getSubFieldOptions(sub: SubFieldItem): string[] {
  if (!sub.options) {
    sub.options = ['选项1', '选项2']
  }
  return sub.options
}

// 添加子字段选项
function addSubFieldOption(sub: SubFieldItem) {
  if (!sub.options) sub.options = ['选项1', '选项2']
  sub.options.push(`选项${sub.options.length + 1}`)
}

// 删除子字段选项
function removeSubFieldOption(sub: SubFieldItem, index: number) {
  if (!sub.options) return
  sub.options.splice(index, 1)
}

// 中文数字转换（一、二、三...）
const CHINESE_NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十']
function chineseNumber(n: number): string {
  return CHINESE_NUMS[n - 1] || String(n)
}

const PINYIN_MAP: Record<string, string> = {
  '安': 'an', '全': 'quan', '报': 'bao', '告': 'gao',
  '事': 'shi', '故': 'gu', '如': 'ru', '有': 'you',
  '运': 'yun', '营': 'ying', '数': 'shu', '据': 'ju',
  '财': 'cai', '务': 'wu', '采': 'cai', '购': 'gou',
  '周': 'zhou', '期': 'qi', '食': 'shi', '品': 'pin',
  '清': 'qing', '单': 'dan', '特': 'te', '殊': 'shu',
  '需': 'xu', '求': 'qiu', '预': 'yu', '计': 'ji',
  '费': 'fei', '用': 'yong', '到': 'dao', '岗': 'gang',
  '照': 'zhao', '片': 'pian', '打': 'da', '卡': 'ka',
  '地': 'di', '点': 'dian', '主': 'zhu', '机': 'ji',
  '检': 'jian', '查': 'cha', '发': 'fa', '电': 'dian',
  '泵': 'beng', '组': 'zu', '气': 'qi', '系': 'xi',
  '统': 'tong', '消': 'xiao', '防': 'fang', '设': 'she',
  '备': 'bei', '救': 'jiu', '生': 'sheng', '导': 'dao',
  '航': 'hang', '通': 'tong', '信': 'xin', '货': 'huo',
  '物': 'wu', '准': 'zhun', '文': 'wen', '件': 'jian',
  '手': 'shou', '续': 'xu', '船': 'chuan', '员': 'yuan',
  '会': 'hui', '议': 'yi', '召': 'zhao', '开': 'kai',
  '象': 'xiang', '接': 'jie', '收': 'shou',
  '港': 'gang', '口': 'kou', '息': 'xi',
  '确': 'que', '认': 'ren', '今': 'jin', '日': 'ri',
  '温': 'wen', '度': 'du', '动': 'dong', '态': 'tai',
  '中': 'zhong', '英': 'ying', '天': 'tian',
  '海': 'hai', '况': 'kuang', '行': 'xing', '在': 'zai',
  '位': 'wei', '置': 'zhi', '注': 'zhu',
  '名': 'ming', '称': 'cheng', '类': 'lei', '型': 'xing',
  '编': 'bian', '号': 'hao', '规': 'gui', '格': 'ge',
  '量': 'liang', '说': 'shuo', '明': 'ming',
  '附': 'fu', '档': 'dang', '图': 'tu', '相': 'xiang',
}

function generateFieldName(label: string, index: number): string {
  let result = ''
  for (const char of label) {
    if (PINYIN_MAP[char]) {
      result += PINYIN_MAP[char]
    }
  }
  if (result) {
    return result
  }
  return `field_${index + 1}`
}

const formData = reactive({
  templateName: '',
  taskType: '',
  coverImage: '',
  fields: [] as FieldItem[],
})

const publishConfig = reactive({
  targetShips: 'all' as string,
  targetValue: '',
  etaDays: 3,
  selectedShips: [] as number[],
  frequency: 'once',
  deadline: '',
  reminderEnabled: false,
  reminderBefore: '1d',
  reminderMethods: ['app'] as string[],
  aiAssistEnabled: false,
  aiAnalysisEnabled: false,
  aiAnalysisPrompt: '',
  fileNamingEnabled: true,
  fileNamingFormat: 'ship_date_type_seq',
  allowedFileTypes: ['doc', 'pdf', 'xlsx'] as string[],
})

const shipList = ref<{ id: number; cnShipName: string }[]>([])

const templateCategories = ref([
  { name: '船员管理', key: 'crew_management' },
  { name: '航行安全', key: 'navigation_safety' },
  { name: '设备维护', key: 'equipment_maintenance' },
  { name: '港口业务', key: 'port_operations' },
  { name: '质量管理', key: 'quality_management' },
])

const createTypes = [
  { type: 'checklist', name: '勾选清单', desc: '多个项目逐项勾选确认', color: '#52c41a', icon: EditPen, defaultFields: 3 },
  { type: 'form_collect', name: '信息收集表', desc: '多种字段类型的表单', color: '#1677ff', icon: EditPen, defaultFields: 2 },
  { type: 'photo_checkin', name: '拍照打卡', desc: '地理位置拍照打卡', color: '#fa8c16', icon: Camera, defaultFields: 1 },
  { type: 'file_collect', name: '文件收集', desc: '统一收集船舶文件', color: '#722ed1', icon: FolderOpened, defaultFields: 1 },
  { type: 'ai_survey', name: 'AI问卷', desc: 'AI智能生成问卷', color: '#eb2f96', icon: MagicStick, defaultFields: 2 },
]

const templateFilter = reactive({
  category: '',
  keyword: '',
})

interface TemplateOption {
  id: number
  templateName: string
  templateType: string
  description?: string
  usageCount?: number
  category?: string
  items?: any[]
  isSystem?: boolean
}

const allTemplates = ref<TemplateOption[]>([])

const systemTemplates = computed(() => allTemplates.value.filter(t => t.isSystem))
const userTemplates = computed(() => allTemplates.value.filter(t => !t.isSystem))

function getTypeLabel(type: string) {
  const map: Record<string, string> = {
    checklist: '勾选清单',
    form_collect: '收集表',
    photo_checkin: '拍照打卡',
    file_collect: '文件收集',
    ai_survey: 'AI分析收集',
    ship_dynamic: '船舶动态',
    port_call_check: '靠港检查',
  }
  return map[type] || type
}

function getTypeTagType(type: string) {
  const map: Record<string, string> = {
    checklist: 'success',
    form_collect: 'primary',
    photo_checkin: 'info',
    file_collect: 'warning',
    ai_survey: '',
    ship_dynamic: 'primary',
    port_call_check: 'success',
  }
  return map[type] || 'info'
}

function selectBlankTemplate() {
  selectedTemplateId.value = null
  formData.templateName = ''
  formData.taskType = ''
  formData.fields = []
}

function selectCreateType(type: string) {
  const typeInfo = createTypes.find(t => t.type === type)
  selectedTemplateId.value = null
  createMode.value = type
  formData.templateName = ''
  formData.taskType = type
  formData.fields = []
  if (type === 'checklist') {
    for (let i = 0; i < (typeInfo?.defaultFields || 3); i++) {
      formData.fields.push({
        _key: nextFieldKey(),
        fieldName: `item_${i + 1}`,
        fieldLabel: `问题${['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][i] || (i + 1)}`,
        fieldType: 'checkbox',
        fieldOptions: '[]',
        isRequired: false,
        sortOrder: i,
      })
    }
  } else if (type === 'form_collect') {
    formData.fields.push({
      _key: nextFieldKey(),
      fieldName: 'field_1',
      fieldLabel: '问题一',
      fieldType: 'text',
      fieldOptions: '',
      isRequired: false,
      sortOrder: 0,
    })
  } else if (type === 'file_collect') {
    formData.fields.push({
      _key: nextFieldKey(),
      fieldName: 'file_1',
      fieldLabel: '请上传文件',
      fieldType: 'attachment',
      fieldOptions: '',
      isRequired: true,
      sortOrder: 0,
      maxCount: 5,
    })
  } else if (type === 'photo_checkin') {
    formData.fields.push({
      _key: nextFieldKey(),
      fieldName: 'photo_1',
      fieldLabel: '现场照片',
      fieldType: 'attachment',
      fieldOptions: '',
      isRequired: true,
      sortOrder: 0,
      maxCount: 3,
    })
  } else if (type === 'ai_survey') {
    formData.fields.push({
      _key: nextFieldKey(),
      fieldName: 'question_1',
      fieldLabel: '问题一',
      fieldType: 'textarea',
      fieldOptions: '',
      isRequired: true,
      sortOrder: 0,
    })
  }
}

function selectTemplate(template: TemplateOption) {
  selectedTemplateId.value = template.id
  formData.templateName = template.templateName
  formData.taskType = template.templateType
  formData.coverImage = (template as any).coverImage || ''
  if (template.items && template.items.length > 0) {
    formData.fields = template.items.map((item: any) => {
      let fieldOptionsStr = ''
      if (typeof item.fieldOptions === 'string') {
        fieldOptionsStr = item.fieldOptions
      } else if (Array.isArray(item.fieldOptions)) {
        fieldOptionsStr = JSON.stringify(item.fieldOptions)
      } else if (typeof item.options === 'string') {
        fieldOptionsStr = item.options
      } else if (Array.isArray(item.options)) {
        fieldOptionsStr = JSON.stringify(item.options)
      }
      return {
        _key: nextFieldKey(),
        fieldName: item.fieldName || item.name || '',
        fieldLabel: item.fieldLabel || item.label || '',
        fieldType: item.fieldType || item.type || 'text',
        fieldOptions: fieldOptionsStr,
        isRequired: item.isRequired || item.required || false,
        sortOrder: item.sortOrder || 0,
        maxCount: item.maxCount,
        helpText: item.helpText,
        subFields: (item.fieldType === 'group' || item.type === 'group') && item.subFields
          ? item.subFields.map((s: any) => ({
              _key: nextSubFieldKey(),
              name: s.name || '',
              label: s.label || '',
              type: s.type || 'text',
              required: s.required || false,
              options: s.options,
              maxCount: s.maxCount,
            }))
          : undefined,
        showWhen: item.showWhen && item.showWhen.length > 0 ? item.showWhen : undefined,
        validation: item.validation || undefined,
      }
    })
    if (formData.fields.length > 0) {
      activeFieldKey.value = formData.fields[0]._key
    }
  } else {
    formData.fields = []
  }
}

function loadSelectedTemplate(templateId: number | null) {
  if (!templateId) {
    selectedTemplateId.value = null
    return
  }
  const tpl = allTemplates.value.find((t) => t.id === templateId)
  if (tpl) {
    selectTemplate(tpl)
  }
}

// 快捷模板（显示在左侧面板）
const quickTemplates = computed(() => {
  return allTemplates.value.slice(0, 6)
})

// 按题型添加问题（左侧题型面板点击）
function addFieldByType(type: string) {
  const nextIdx = formData.fields.length + 1
  const chineseNum = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
  const newField: FieldItem = {
    _key: nextFieldKey(),
    fieldName: '',
    fieldLabel: type === 'section' ? '分区标题' : `问题${chineseNum[nextIdx - 1] || nextIdx}`,
    fieldType: type as FieldItem['fieldType'],
    fieldOptions: (type === 'select' || type === 'multi_select') ? JSON.stringify(['选项1', '选项2', '选项3']) : '',
    isRequired: false,
    sortOrder: formData.fields.length,
    maxCount: type === 'attachment' ? 5 : undefined,
  }
  // 明细题：初始化默认子字段
  if (type === 'group') {
    newField.subFields = [
      { _key: nextSubFieldKey(), name: '', label: '姓名', type: 'text', required: true },
      { _key: nextSubFieldKey(), name: '', label: '工号', type: 'text', required: true },
      { _key: nextSubFieldKey(), name: '', label: '证明文件', type: 'attachment', required: false, maxCount: 3 },
    ]
  }
  formData.fields.push(newField)
  activeFieldKey.value = newField._key

  // 如果还没有设置任务类型，根据第一个添加的题型推断
  if (!formData.taskType) {
    if (type === 'checkbox') {
      formData.taskType = 'checklist'
    } else if (type === 'attachment') {
      formData.taskType = 'file_collect'
    } else {
      formData.taskType = 'form_collect'
    }
  }
}

function addField() {
  const defaultType = formData.taskType === 'checklist' ? 'checkbox' : 'text'
  addFieldByType(defaultType)
}

// 条件逻辑辅助函数
function addCondition(field: FieldItem) {
  if (!field.showWhen) field.showWhen = []
  field.showWhen.push({ field: '', type: 'eq', value: '' })
}

function removeCondition(field: FieldItem, index: number) {
  if (!field.showWhen) return
  field.showWhen.splice(index, 1)
  if (field.showWhen.length === 0) field.showWhen = undefined
}

function getAvailableConditionFields(currentField: FieldItem): FieldItem[] {
  const currentIdx = formData.fields.findIndex(f => f._key === currentField._key)
  return formData.fields.filter((f, i) => i < currentIdx && f.fieldType !== 'section')
}

// 验证规则辅助函数
const validationExpandedKeys = ref<Set<string>>(new Set())

function toggleValidation(key: string) {
  if (validationExpandedKeys.value.has(key)) {
    validationExpandedKeys.value.delete(key)
  } else {
    validationExpandedKeys.value.add(key)
  }
}

function isValidationExpanded(key: string): boolean {
  return validationExpandedKeys.value.has(key)
}

function initValidation(field: FieldItem) {
  if (!field.validation) {
    field.validation = {}
  }
}

// 预览模式：模拟数据
const previewData = reactive<Record<string, any>>({})

function isFieldVisible(field: FieldItem): boolean {
  if (!field.showWhen || field.showWhen.length === 0) return true
  return field.showWhen.every(cond => {
    if (!cond.field) return true
    const depField = formData.fields.find(f => f.fieldName === cond.field)
    if (!depField) return true
    const actualValue = previewData[cond.field]
    if (actualValue === undefined || actualValue === '') return false
    if (cond.type === 'neq') {
      return actualValue !== cond.value
    }
    return actualValue === cond.value
  })
}

function getPreviewFieldOptions(field: FieldItem): string[] {
  try {
    const arr = field.fieldOptions ? JSON.parse(field.fieldOptions) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function getPreviewValue(fieldName: string, fieldType: string): any {
  if (previewData[fieldName] === undefined) {
    if (fieldType === 'multi_select') {
      previewData[fieldName] = []
    } else if (fieldType === 'checkbox') {
      previewData[fieldName] = false
    } else if (fieldType === 'number') {
      previewData[fieldName] = undefined
    } else {
      previewData[fieldName] = ''
    }
  }
  return previewData[fieldName]
}

function autoGenerateFieldName(field: FieldItem, index: number) {
  if (!field.fieldName && field.fieldLabel) {
    field.fieldName = generateFieldName(field.fieldLabel, index)
  }
}

function removeField(index: number) {
  formData.fields.splice(index, 1)
  formData.fields.forEach((f, i) => {
    f.sortOrder = i
  })
}

function moveField(index: number, direction: number) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= formData.fields.length) return
  const temp = formData.fields[index]
  formData.fields[index] = formData.fields[newIndex]
  formData.fields[newIndex] = temp
  formData.fields.forEach((f, i) => {
    f.sortOrder = i
  })
}

const OPTION_TYPES = ['select', 'multi_select', 'checkbox']

function ensureOptionsList(field: FieldItem): string[] {
  if (!field._optionsList) {
    let result: string[] = []
    try {
      if (Array.isArray(field.fieldOptions)) {
        result = field.fieldOptions
      } else if (typeof field.fieldOptions === 'string' && field.fieldOptions) {
        const parsed = JSON.parse(field.fieldOptions)
        result = Array.isArray(parsed) ? parsed : []
      }
    } catch {
      result = []
    }
    ;(field as any)._optionsList = reactive([...result])
  }
  return (field as any)._optionsList
}

function getOptions(field: FieldItem): string[] {
  return ensureOptionsList(field)
}

function syncOptionsToField(field: FieldItem) {
  const list = ensureOptionsList(field)
  field.fieldOptions = JSON.stringify(list.filter(s => s && s.trim()))
}

function handleFieldTypeChange(field: FieldItem) {
  ;(field as any)._optionsList = undefined
  
  if (OPTION_TYPES.includes(field.fieldType)) {
    let currentOptions: string[] = []
    try {
      if (Array.isArray(field.fieldOptions)) {
        currentOptions = field.fieldOptions
      } else if (typeof field.fieldOptions === 'string' && field.fieldOptions) {
        const parsed = JSON.parse(field.fieldOptions)
        currentOptions = Array.isArray(parsed) ? parsed : []
      }
    } catch {
      currentOptions = []
    }
    
    const validOptions = currentOptions.filter(s => s && s.trim())
    if (validOptions.length === 0) {
      field.fieldOptions = JSON.stringify(['选项1'])
    } else {
      field.fieldOptions = JSON.stringify(validOptions)
    }
    ;(field as any)._optionsList = reactive([
      ...(validOptions.length > 0 ? validOptions : ['选项1'])
    ])
  } else {
    field.fieldOptions = ''
  }
}

function addOption(field: FieldItem) {
  const list = ensureOptionsList(field)
  list.push('')
  syncOptionsToField(field)
}

function removeOption(field: FieldItem, index: number) {
  const list = ensureOptionsList(field)
  list.splice(index, 1)
  syncOptionsToField(field)
}

function moveOption(field: FieldItem, index: number, direction: number) {
  const list = ensureOptionsList(field)
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= list.length) return
  const temp = list[index]
  list[index] = list[newIndex]
  list[newIndex] = temp
  syncOptionsToField(field)
}

function nextStep() {
  currentStep.value++
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const coverUploading = ref(false)

async function handleCoverUpload(options: any) {
  const file = options.file as File
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }
  coverUploading.value = true
  try {
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)
    uploadFormData.append('category', 'publish-cover')
    uploadFormData.append('isPublic', 'true')
    const result: any = await $fetch('/api/files/upload', {
      method: 'POST',
      body: uploadFormData,
      headers: {
        Authorization: useAuthStore().token ? `Bearer ${useAuthStore().token}` : undefined,
      },
    })
    if (result && result.filePath) {
      formData.coverImage = '/' + result.filePath
    }
    ElMessage.success('封面上传成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '封面上传失败')
  } finally {
    coverUploading.value = false
  }
}

async function handleSaveDraft() {
  if (!formData.templateName) {
    ElMessage.warning('请输入任务名称')
    return
  }
  saving.value = true
  try {
    let targetShipsData = null
    if (publishConfig.targetShips === 'custom') {
      targetShipsData = publishConfig.selectedShips
    } else if (publishConfig.targetShips === 'eta_before') {
      targetShipsData = { etaDays: publishConfig.etaDays }
    }
    
    const payload = {
      title: formData.templateName,
      templateType: formData.taskType || 'form_collect',
      coverImage: formData.coverImage || null,
      status: 'draft' as const,
      targetShips: targetShipsData,
      triggerDays: publishConfig.targetShips === 'eta_before' ? publishConfig.etaDays : null,
      deadline: publishConfig.deadline || null,
      isDraft: true,
      isPublished: false,
      isSystem: false,
      fileNamingRule: publishConfig.fileNamingEnabled ? publishConfig.fileNamingFormat : null,
      allowedTypes: publishConfig.allowedFileTypes.length > 0 ? publishConfig.allowedFileTypes : null,
      aiEnabled: publishConfig.aiAnalysisEnabled,
      aiPromptTemplate: publishConfig.aiAnalysisPrompt || null,
      items: formData.fields.map((f, i) => ({
        name: f.fieldName,
        label: f.fieldLabel,
        type: f.fieldType,
        options: f.fieldOptions,
        required: f.isRequired,
        sortOrder: i,
        maxCount: f.maxCount,
        helpText: f.helpText,
        // 明细题子字段定义
        subFields: f.fieldType === 'group' && f.subFields
          ? f.subFields.map(s => ({
              name: s.name,
              label: s.label,
              type: s.type,
              required: s.required,
              options: s.options,
              maxCount: s.maxCount,
            }))
          : undefined,
        // 显示条件
        showWhen: f.showWhen && f.showWhen.length > 0 ? f.showWhen : undefined,
        // 验证规则
        validation: f.validation && Object.values(f.validation).some(v => v !== undefined && v !== '' && v !== 0) ? f.validation : undefined,
      })),
    }
    await api.publishTemplates.create(payload)
    ElMessage.success('草稿已保存')
    router.push('/publish-v2')
  } catch {
    // Error handled by apiFetch
  } finally {
    saving.value = false
  }
}

async function handlePublish() {
  if (!formData.templateName) {
    ElMessage.warning('请输入任务名称')
    return
  }
  if (formData.fields.length === 0) {
    ElMessage.warning('请至少添加一个问题')
    return
  }
  saving.value = true
  try {
    let targetShipsData = null
    if (publishConfig.targetShips === 'custom') {
      targetShipsData = publishConfig.selectedShips
    } else if (publishConfig.targetShips === 'eta_before') {
      targetShipsData = { etaDays: publishConfig.etaDays }
    }
    
    const payload = {
      title: formData.templateName,
      templateType: formData.taskType || 'form_collect',
      coverImage: formData.coverImage || null,
      status: 'published' as const,
      targetShips: targetShipsData,
      triggerDays: publishConfig.targetShips === 'eta_before' ? publishConfig.etaDays : null,
      deadline: publishConfig.deadline || null,
      isDraft: false,
      isPublished: true,
      isSystem: false,
      fileNamingRule: publishConfig.fileNamingEnabled ? publishConfig.fileNamingFormat : null,
      allowedTypes: publishConfig.allowedFileTypes.length > 0 ? publishConfig.allowedFileTypes : null,
      aiEnabled: publishConfig.aiAnalysisEnabled,
      aiPromptTemplate: publishConfig.aiAnalysisPrompt || null,
      items: formData.fields.map((f, i) => ({
        name: f.fieldName,
        label: f.fieldLabel,
        type: f.fieldType,
        options: f.fieldOptions,
        required: f.isRequired,
        sortOrder: i,
        maxCount: f.maxCount,
        helpText: f.helpText,
        // 明细题子字段定义
        subFields: f.fieldType === 'group' && f.subFields
          ? f.subFields.map(s => ({
              name: s.name,
              label: s.label,
              type: s.type,
              required: s.required,
              options: s.options,
              maxCount: s.maxCount,
            }))
          : undefined,
        // 显示条件
        showWhen: f.showWhen && f.showWhen.length > 0 ? f.showWhen : undefined,
        // 验证规则
        validation: f.validation && Object.values(f.validation).some(v => v !== undefined && v !== '' && v !== 0) ? f.validation : undefined,
      })),
    }
    await api.publishTemplates.create(payload)
    ElMessage.success('任务已发布')
    router.push('/publish-v2')
  } catch {
    // Error handled by apiFetch
  } finally {
    saving.value = false
  }
}

async function loadTemplates() {
  templateLoading.value = true
  try {
    const [result, shipsResult] = await Promise.all([
      api.apiFetch('/publish-templates'),
      api.apiFetch('/ships').catch(() => []),
    ])
    if (Array.isArray(result)) {
      allTemplates.value = result.map((t: any) => ({
        id: t.id,
        templateName: t.templateName || t.title,
        templateType: t.templateType,
        description: t.description,
        usageCount: t.usageCount || 0,
        category: t.category,
        items: t.items || [],
        isSystem: t.isSystem || false,
      }))
    }
    if (Array.isArray(shipsResult)) {
      shipList.value = shipsResult.map((s: any) => ({
        id: s.id,
        cnShipName: s.cnShipName,
      }))
    }
  } catch {
    // Error handled by apiFetch
  } finally {
    templateLoading.value = false
  }
}

onMounted(() => {
  loadTemplates().then(() => {
    // 处理路由参数
    const queryType = route.query.type as string
    const queryTemplateId = route.query.templateId as string

    if (queryTemplateId) {
      const tpl = allTemplates.value.find((t) => t.id === Number(queryTemplateId))
      if (tpl) {
        selectTemplate(tpl)
      }
    } else if (queryType) {
      selectCreateType(queryType)
    }
  })
})
</script>

<style scoped>
.create-task-page {
  min-height: 100vh;
  background: #f7f8fa;
  display: flex;
  flex-direction: column;
}

/* ===== 顶部导航栏 ===== */
.top-nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.nav-back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  color: #333;
  font-size: 18px;
  transition: background 0.2s;
}

.nav-back-btn:hover,
.nav-back-btn:active {
  background: #f2f3f5;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #1d2129;
  flex: 1;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 8px;
}

.nav-right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 200px;
  justify-content: flex-end;
  flex-shrink: 0;
}

.template-select {
  width: 140px;
}

.nav-right-actions .el-button {
  height: 32px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 14px;
  flex-shrink: 0;
}

/* ===== 顶部标签导航 ===== */
.top-tabs {
  display: flex;
  justify-content: space-around;
  background: #fff;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.tab-item {
  font-size: 16px;
  font-weight: 500;
  color: #86909c;
  padding: 8px 20px;
  position: relative;
}

.tab-item.active {
  color: #1677ff;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: -16px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: #1677ff;
  border-radius: 2px;
}

/* ===== 编辑标签页 ===== */
.edit-tab {
  flex: 1;
  display: flex;
  gap: 12px;
  padding: 12px;
  padding-bottom: 100px;
  overflow-y: auto;
  align-items: flex-start;
}

/* ===== 左侧题型快捷面板 ===== */
.field-type-panel {
  width: 200px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 8px;
  padding: 8px;
  position: sticky;
  top: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.field-type-panel details {
  outline: none;
}

.field-type-panel details summary {
  list-style: none;
  outline: none;
  cursor: pointer;
}

.field-type-panel details summary::-webkit-details-marker {
  display: none;
}

.panel-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px 8px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
}

.panel-toggle-icon {
  font-size: 12px;
  color: #86909c;
  transition: transform 0.2s;
}

.field-type-panel details[open] .panel-toggle-icon {
  transform: rotate(0deg);
}

.field-type-panel details:not([open]) .panel-toggle-icon {
  transform: rotate(-90deg);
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.quick-type-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.quick-type-item:hover {
  background: #f2f3f5;
}

.quick-type-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.quick-type-name {
  font-size: 13px;
  color: #4e5969;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== 右侧编辑主区域 ===== */
.edit-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* ===== 卡片样式 ===== */
.card {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}

/* ===== 封面区域 ===== */
.cover-section {
  margin-bottom: 8px;
}

.cover-upload {
  width: 100%;
  display: block;
}

.cover-upload :deep(.el-upload) {
  width: 100%;
  display: block;
}

.cover-placeholder {
  height: 100px;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #86909c;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.cover-placeholder:hover {
  border-color: #1677ff;
  color: #1677ff;
}

.cover-placeholder :deep(.el-icon) {
  font-size: 24px;
}

.cover-image-wrap {
  position: relative;
  width: 100%;
  height: 140px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-image-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #fff;
  font-size: 13px;
  opacity: 0;
  transition: opacity 0.2s;
}

.cover-image-wrap:hover .cover-image-mask {
  opacity: 1;
}

.cover-image-mask :deep(.el-icon) {
  font-size: 20px;
}

.preview-cover-wrap {
  width: 100%;
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
}

.preview-cover-img {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  display: block;
}

/* ===== 标题区域 ===== */
.title-input :deep(.el-input__wrapper) {
  box-shadow: none !important;
  border: none !important;
  padding: 0 !important;
  background: transparent !important;
}

.title-input :deep(.el-input__inner) {
  font-size: 20px !important;
  font-weight: 600 !important;
  color: #1d2129 !important;
  height: 32px !important;
  line-height: 32px !important;
}

.desc-input :deep(.el-input__wrapper) {
  box-shadow: none !important;
  border: none !important;
  padding: 0 !important;
  background: transparent !important;
}

.desc-input :deep(.el-input__inner) {
  font-size: 14px !important;
  color: #86909c !important;
  height: 24px !important;
  line-height: 24px !important;
}

.feature-buttons {
  display: flex;
  gap: 12px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.feature-btn {
  font-size: 13px !important;
  color: #4e5969 !important;
  padding: 0 !important;
}

.feature-btn :deep(.el-icon) {
  font-size: 14px !important;
  margin-right: 4px !important;
}

/* ===== AI助手入口 ===== */
.ai-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #e8f3ff 0%, #f0f9ff 100%);
}

.ai-icon {
  font-size: 20px;
  color: #1677ff;
}

.ai-card span {
  font-size: 14px;
  color: #4e5969;
}

/* ===== 问题列表 ===== */
.questions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.question-card {
  position: relative;
  border: 1px solid #f0f0f0;
  padding: 12px;
  transition: all 0.15s;
}

.question-card.active {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}

.question-card.is-section {
  background: #fafbfc;
  border-style: dashed;
}

/* ===== 分区行样式 ===== */
.section-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 16px;
  color: #86909c;
  flex-shrink: 0;
}

.section-title-input {
  flex: 1;
}

.section-title-input :deep(.el-input__wrapper) {
  box-shadow: none !important;
  border: none !important;
  padding: 0 !important;
  background: transparent !important;
}

.section-title-input :deep(.el-input__inner) {
  font-size: 15px !important;
  font-weight: 600 !important;
  color: #1d2129 !important;
  height: 28px !important;
  line-height: 28px !important;
}

/* ===== 问题头部紧凑布局 ===== */
.question-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}

.question-index {
  font-size: 13px;
  font-weight: 600;
  color: #86909c;
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  min-width: 28px;
}

.required-marker {
  color: #ff4d4f;
  font-size: 14px;
}

.question-title-input {
  flex: 1;
  min-width: 120px;
}

.question-title-input :deep(.el-input__wrapper) {
  box-shadow: none !important;
  border: none !important;
  padding: 0 !important;
  background: transparent !important;
}

.question-title-input :deep(.el-input__inner) {
  font-size: 14px !important;
  font-weight: 500 !important;
  color: #1d2129 !important;
  height: 28px !important;
  line-height: 28px !important;
}

/* ===== 题型下拉选择 ===== */
.question-type-select {
  width: 110px;
  flex-shrink: 0;
}

.question-type-select :deep(.el-select__wrapper) {
  min-height: 28px !important;
  height: 28px !important;
  font-size: 12px !important;
  border-radius: 4px !important;
}

.question-ops {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.question-ops :deep(.el-button) {
  padding: 4px !important;
  margin-left: 0 !important;
}

.required-switch {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.required-switch :deep(.el-switch) {
  height: 18px;
}

.switch-label {
  font-size: 12px;
  color: #86909c;
}

/* ===== 选项编辑区 ===== */
.options-edit {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.option-edit-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.option-radio-icon {
  font-size: 14px;
  color: #86909c;
  flex-shrink: 0;
}

.option-input {
  flex: 1;
}

.option-input :deep(.el-input__wrapper) {
  box-shadow: none !important;
  border-color: #f0f0f0 !important;
}

.add-option-btn {
  font-size: 12px !important;
  color: #1677ff !important;
  margin-top: 4px;
}

/* ===== 明细题子字段编辑区 ===== */
.sub-fields-edit {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.sub-fields-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #1d2129;
}

.add-sub-field-btn {
  font-size: 12px !important;
  color: #1677ff !important;
}

.sub-field-edit-item {
  background: #f7f8fa;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 8px;
}

.sub-field-row1 {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sub-field-label-input {
  flex: 1;
  min-width: 120px;
}

.sub-field-label-input :deep(.el-input__wrapper) {
  height: 36px !important;
}

.sub-field-type-select {
  width: 120px;
}

.sub-field-type-select :deep(.el-select__wrapper) {
  min-height: 36px !important;
  height: 36px !important;
}

.sub-field-required {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.sub-field-required .switch-label {
  font-size: 13px;
  color: #4e5969;
}

.sub-field-options {
  margin-top: 8px;
  padding-left: 10px;
  border-left: 2px solid #e5e6eb;
}

.sub-field-option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.sub-field-option-input :deep(.el-input__wrapper) {
  height: 28px !important;
}

.add-sub-option-btn {
  font-size: 12px !important;
  color: #1677ff !important;
}

.sub-field-max {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding-left: 10px;
  border-left: 2px solid #e5e6eb;
}

.sub-field-max .max-label {
  font-size: 12px;
  color: #4e5969;
}

.sub-field-max-input {
  width: 70px;
}

.sub-field-max-input :deep(.el-input__wrapper) {
  height: 28px !important;
}

/* ===== 高级设置折叠面板 ===== */
.advanced-config {
  margin-top: 8px;
  border-top: 1px solid #f0f0f0;
  padding-top: 4px;
}

.advanced-config > summary {
  list-style: none;
  outline: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 12px;
  color: #86909c;
  user-select: none;
}

.advanced-config > summary::-webkit-details-marker {
  display: none;
}

.advanced-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.advanced-toggle-icon {
  font-size: 12px;
  color: #86909c;
  transition: transform 0.2s;
}

.advanced-config[open] .advanced-toggle-icon {
  transform: rotate(90deg);
}

.advanced-body {
  padding-top: 8px;
}

/* ===== 添加问题按钮 ===== */
.add-question-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  background: #fff;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #4e5969;
  cursor: pointer;
  transition: all 0.15s;
}

.add-question-btn:hover {
  border-color: #1677ff;
  color: #1677ff;
}

.add-question-btn :deep(.el-icon) {
  font-size: 16px;
}

/* ===== 统计标签页 ===== */
.stats-tab {
  flex: 1;
  padding: 16px;
  padding-bottom: 100px;
  overflow-y: auto;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.stats-title {
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #1d2129;
}

.stat-label {
  font-size: 12px;
  color: #86909c;
}

.stats-action-btn {
  width: 100%;
  background: #e8f3ff !important;
  color: #1677ff !important;
  border: none !important;
}

.stats-tabs {
  display: flex;
  gap: 32px;
  margin-bottom: 20px;
}

.stats-tab-item {
  font-size: 14px;
  color: #86909c;
  padding-bottom: 8px;
  border-bottom: 2px solid transparent;
}

.stats-tab-item.active {
  color: #1677ff;
  border-bottom-color: #1677ff;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  gap: 16px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #e8f3ff 0%, #f0f9ff 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon :deep(.el-icon) {
  font-size: 32px;
  color: #1677ff;
}

.empty-state span {
  font-size: 14px;
  color: #86909c;
}

/* ===== 设置标签页 ===== */
.settings-tab {
  flex: 1;
  padding: 16px;
  padding-bottom: 100px;
  overflow-y: auto;
}

.settings-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 16px;
}

.settings-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.settings-item:last-child {
  border-bottom: none;
}

.item-label {
  font-size: 15px;
  color: #1d2129;
}

.settings-item :deep(.el-input),
.settings-item :deep(.el-select) {
  width: 200px;
}

/* ===== 底部固定栏 ===== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #f0f0f0;
  z-index: 100;
}

.save-btn {
  flex: 1;
  background: #f2f3f5 !important;
  color: #4e5969 !important;
  border: none !important;
  border-radius: 8px !important;
  height: 44px !important;
  font-size: 15px !important;
}

.publish-btn {
  flex: 2;
  background: #1677ff !important;
  border: none !important;
  border-radius: 8px !important;
  height: 44px !important;
  font-size: 15px !important;
}

.publish-btn:disabled {
  background: #d9d9d9 !important;
  color: #fff !important;
}

/* ===== 添加问题弹窗 ===== */
.add-question-modal {
  padding: 0;
  max-height: 60vh;
  overflow-y: auto;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f7f8fa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.search-icon {
  font-size: 16px;
  color: #86909c;
}

.search-box :deep(.el-input__wrapper) {
  box-shadow: none !important;
  border: none !important;
  padding: 0 !important;
  background: transparent !important;
}

.search-box :deep(.el-input__inner) {
  font-size: 14px !important;
}

.question-category {
  margin-bottom: 20px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 0 8px;
}

.caret-icon {
  font-size: 12px;
  color: #4e5969;
}

.category-title {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 0 8px;
}

.type-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: #f7f8fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.type-grid-item:hover {
  background: #e8f3ff;
}

.type-grid-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.type-grid-name {
  font-size: 12px;
  color: #4e5969;
}

.type-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 0 8px;
}

.type-row-item {
  padding: 12px;
  background: #f7f8fa;
  border-radius: 8px;
  text-align: center;
  font-size: 13px;
  color: #4e5969;
  cursor: pointer;
  transition: all 0.15s;
}

.type-row-item:hover {
  background: #e8f3ff;
  color: #1677ff;
}

/* ===== 显示条件配置 ===== */
.condition-config {
  margin-top: 8px;
  background: #f0f7ff;
  border-radius: 6px;
  padding: 8px;
}

.condition-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.condition-title {
  font-size: 12px;
  font-weight: 500;
  color: #4e5969;
}

.condition-item {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.condition-item .el-select,
.condition-item .el-input {
  height: 32px;
}

.condition-item .el-select :deep(.el-input__wrapper),
.condition-item .el-input :deep(.el-input__wrapper) {
  height: 32px;
  padding: 0 11px;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
}

.condition-item .el-select {
  flex: 2;
  min-width: 100px;
}

.condition-item .el-input {
  flex: 2;
  min-width: 100px;
}

/* ===== 验证规则 ===== */
.validation-config {
  margin-top: 8px;
  border-top: 1px solid #f0f0f0;
  padding-top: 8px;
}

.validation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 4px 0;
}

.validation-title {
  font-size: 12px;
  font-weight: 500;
  color: #4e5969;
}

.validation-toggle-icon {
  font-size: 12px;
  color: #86909c;
  transition: transform 0.2s;
}

.validation-toggle-icon.expanded {
  transform: rotate(90deg);
}

.validation-body {
  background: #f7f8fa;
  border-radius: 6px;
  padding: 8px;
  margin-top: 6px;
}

.validation-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.validation-row:last-child {
  margin-bottom: 0;
}

.validation-label {
  font-size: 12px;
  color: #4e5969;
  white-space: nowrap;
  min-width: 60px;
}

.validation-row .el-input,
.validation-row .el-input-number {
  flex: 1;
}

/* ===== 预览标签页 ===== */
.preview-tab {
  flex: 1;
  padding: 24px 16px;
  padding-bottom: 100px;
  overflow-y: auto;
  display: flex;
  justify-content: center;
}

.preview-phone-frame {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  min-height: 600px;
  display: flex;
  flex-direction: column;
}

.phone-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 20px;
  background: #f7f8fa;
  border-bottom: 1px solid #f0f0f0;
}

.status-time {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
}

.status-icons {
  display: flex;
  gap: 6px;
  font-size: 14px;
  color: #1d2129;
}

.phone-content {
  flex: 1;
  padding: 20px 16px;
  overflow-y: auto;
}

.preview-form-header {
  margin-bottom: 24px;
}

.preview-form-title {
  font-size: 20px;
  font-weight: 600;
  color: #1d2129;
  margin: 0 0 8px 0;
}

.preview-form-desc {
  font-size: 14px;
  color: #86909c;
  margin: 0;
}

.preview-fields-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-field-item {
  padding: 0;
}

.preview-section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
  padding-bottom: 8px;
  border-bottom: 2px solid #1677ff;
  margin: 4px 0;
}

.preview-field-label {
  font-size: 14px;
  font-weight: 500;
  color: #1d2129;
  margin-bottom: 8px;
}

.preview-required {
  color: #ff4d4f;
  margin-right: 2px;
}

.preview-attachment {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: #86909c;
  font-size: 13px;
}

.preview-attachment :deep(.el-icon) {
  font-size: 20px;
  color: #1677ff;
}

.preview-rating {
  display: flex;
  gap: 8px;
}

.preview-group {
  background: #fffbe6;
  border: 1px dashed #ffd666;
  border-radius: 8px;
  padding: 12px;
}

.preview-group-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #8c6817;
}

.preview-submit-area {
  margin-top: 32px;
  padding: 0 16px;
}

.preview-submit-btn {
  width: 100%;
  height: 44px !important;
  font-size: 16px !important;
  border-radius: 8px !important;
}
</style>