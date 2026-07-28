<template>
  <div class="schedule-page">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">日历日程</h2>
        <p class="page-subtitle">按日期查看和管理日程安排</p>
      </div>
      <div class="header-right">
        <div class="header-extra-fields" v-if="showWeatherFields">
          <div class="field-item" v-if="isPoliticalInstructor">
            <label class="field-label">出发港</label>
            <el-select
              v-model="diaryForm.departurePort"
              placeholder="选择"
              size="small"
              filterable
              :filter-method="filterDeparturePorts"
              @focus="resetDeparturePorts"
              @clear="resetDeparturePorts"
            >
              <el-option 
                v-for="port in filteredDeparturePorts" 
                :key="'dep-' + port.id" 
                :label="`${port.name}/${port.country}${port.pinyin ? ` [${port.pinyin}]` : ''}${port.english ? ` (${port.english})` : ''}`" 
                :value="port.name" 
              />
            </el-select>
          </div>
          <div class="field-item" v-if="isPoliticalInstructor">
            <label class="field-label">出发时间</label>
            <el-date-picker
              v-model="diaryForm.departureTime"
              type="datetime"
              placeholder="选择时间"
              size="small"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm:ss"
            />
          </div>
          <div class="field-item" v-if="isPoliticalInstructor">
            <label class="field-label">目的港</label>
            <el-select
              v-model="diaryForm.arrivalPort"
              placeholder="选择"
              size="small"
              filterable
              :filter-method="filterArrivalPorts"
              @focus="resetArrivalPorts"
              @clear="resetArrivalPorts"
            >
              <el-option 
                v-for="port in filteredArrivalPorts" 
                :key="'arr-' + port.id" 
                :label="`${port.name}/${port.country}${port.pinyin ? ` [${port.pinyin}]` : ''}${port.english ? ` (${port.english})` : ''}`" 
                :value="port.name" 
              />
            </el-select>
          </div>
          <div class="field-item" v-if="isPoliticalInstructor">
            <label class="field-label">抵达时间</label>
            <el-date-picker
              v-model="diaryForm.arrivalTime"
              type="datetime"
              placeholder="选择时间"
              size="small"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm:ss"
            />
          </div>

          <div class="field-item">
            <label class="field-label">天气</label>
            <el-select v-model="diaryForm.weather" placeholder="选择" size="small">
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
            </el-select>
          </div>
          <div class="field-item" v-if="isPoliticalInstructor">
            <label class="field-label">海况</label>
            <el-select v-model="diaryForm.seaCondition" placeholder="选择" size="small">
              <el-option label="平静" value="平静" />
              <el-option label="轻浪" value="轻浪" />
              <el-option label="中浪" value="中浪" />
              <el-option label="大浪" value="大浪" />
              <el-option label="巨浪" value="巨浪" />
              <el-option label="狂浪" value="狂浪" />
            </el-select>
          </div>
          <div class="field-item" v-if="isPoliticalInstructor">
            <label class="field-label">动态</label>
            <el-select v-model="diaryForm.dynamicStatus" placeholder="选择" size="small">
              <el-option label="航行中" value="航行中" />
              <el-option label="靠泊中" value="靠泊中" />
              <el-option label="锚泊中" value="锚泊中" />
              <el-option label="在港" value="在港" />
              <el-option label="修船" value="修船" />
            </el-select>
          </div>
          <div class="field-item" v-else>
            <label class="field-label">动态</label>
            <el-select v-model="diaryForm.dynamicStatus" placeholder="选择" size="small">
              <el-option label="在公司" value="在公司" />
              <el-option label="出差访船" value="出差访船" />
              <el-option label="出差路上" value="出差路上" />
              <el-option label="培训" value="培训" />
              <el-option label="开会" value="开会" />
              <el-option label="休假" value="休假" />
              <el-option label="其他" value="其他" />
            </el-select>
          </div>
          <div class="field-item" v-if="isPoliticalInstructor">
            <label class="field-label">时区</label>
            <el-select v-model="diaryForm.timezone" placeholder="选择" size="small" filterable>
              <el-option label="UTC+14" value="UTC+14" />
              <el-option label="UTC+13" value="UTC+13" />
              <el-option label="UTC+12" value="UTC+12" />
              <el-option label="UTC+11" value="UTC+11" />
              <el-option label="UTC+10:30" value="UTC+10:30" />
              <el-option label="UTC+10" value="UTC+10" />
              <el-option label="UTC+9:30" value="UTC+9:30" />
              <el-option label="UTC+9" value="UTC+9" />
              <el-option label="UTC+8:45" value="UTC+8:45" />
              <el-option label="UTC+8" value="UTC+8" />
              <el-option label="UTC+7" value="UTC+7" />
              <el-option label="UTC+6:30" value="UTC+6:30" />
              <el-option label="UTC+6" value="UTC+6" />
              <el-option label="UTC+5:45" value="UTC+5:45" />
              <el-option label="UTC+5:30" value="UTC+5:30" />
              <el-option label="UTC+5" value="UTC+5" />
              <el-option label="UTC+4:30" value="UTC+4:30" />
              <el-option label="UTC+4" value="UTC+4" />
              <el-option label="UTC+3:30" value="UTC+3:30" />
              <el-option label="UTC+3" value="UTC+3" />
              <el-option label="UTC+2" value="UTC+2" />
              <el-option label="UTC+1" value="UTC+1" />
              <el-option label="UTC" value="UTC" />
              <el-option label="UTC-1" value="UTC-1" />
              <el-option label="UTC-2" value="UTC-2" />
              <el-option label="UTC-3" value="UTC-3" />
              <el-option label="UTC-3:30" value="UTC-3:30" />
              <el-option label="UTC-4" value="UTC-4" />
              <el-option label="UTC-5" value="UTC-5" />
              <el-option label="UTC-6" value="UTC-6" />
              <el-option label="UTC-7" value="UTC-7" />
              <el-option label="UTC-8" value="UTC-8" />
              <el-option label="UTC-9" value="UTC-9" />
              <el-option label="UTC-9:30" value="UTC-9:30" />
              <el-option label="UTC-10" value="UTC-10" />
              <el-option label="UTC-11" value="UTC-11" />
              <el-option label="UTC-12" value="UTC-12" />
            </el-select>
          </div>

          <div class="field-item" v-if="isPoliticalInstructor">
            <label class="field-label">航次</label>
            <el-input
              v-model="diaryForm.voyageNumber"
              placeholder="如 V1, V10"
              size="small"
              @blur="formatVoyageNumber"
            />
          </div>
          <div class="field-item" v-if="isPoliticalInstructor">
            <label class="field-label">防海盗区</label>
            <el-switch v-model="diaryForm.isFreePortZone" :active-value="true" :inactive-value="false" size="small" />
          </div>
          <div class="field-item" v-if="isPoliticalInstructor">
            <label class="field-label">战区</label>
            <el-switch v-model="diaryForm.isWarZone" :active-value="true" :inactive-value="false" size="small" />
          </div>
          <div class="field-item" v-if="isPoliticalInstructor">
            <label class="field-label">铅封作业</label>
            <el-switch v-model="diaryForm.leadSealOperation" :active-value="true" :inactive-value="false" size="small" />
          </div>
          <div class="field-item" v-if="isShoreCrewSupervisor">
            <label class="field-label">船舶</label>
            <el-select v-model="diaryForm.shipName" placeholder="选择" size="small" filterable>
              <el-option v-for="ship in ships" :key="ship.id" :label="ship.cnShipName" :value="ship.cnShipName" />
            </el-select>
          </div>

          <div class="voyage-progress-bar" :class="progressBarClass" v-if="isPoliticalInstructor">
            <div class="progress-info">
              <span class="progress-title">⏱️ 航行时间</span>
              <span class="progress-duration">{{ calculateDuration(diaryForm.departureTime, diaryForm.arrivalTime) }}</span>
              <span class="progress-warning" v-if="isLastThreeDays">⚠️ 最后3天</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: '100%' }"></div>
              <div class="progress-last-three" :style="lastThreeDaysStyle"></div>
              <div class="progress-current-ship" :style="currentShipPositionStyle">
                <span class="ship-icon">🚢</span>
              </div>
              <div class="progress-label departure">
                <span>{{ diaryForm.departureTime || '出发' }}</span>
              </div>
              <div class="progress-label arrival">
                <span>{{ diaryForm.arrivalTime || '抵达' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 日历和筛选区 -->
    <div class="content-area" ref="contentAreaRef">
      <div class="calendar-section" :style="{ flex: calendarFlex }">
        <!-- 月视图 -->
        <el-calendar v-if="viewMode === 'month'" v-model="selectedDate">
          <template #header="{ date }">
            <span class="calendar-header-title">{{ date }}</span>
            <div class="calendar-nav-btns">
              <el-button-group class="view-switcher-inline">
                <el-button :type="viewMode === 'month' ? 'primary' : 'default'" size="small" @click.stop="viewMode = 'month'">月</el-button>
                <el-button :type="viewMode === 'week' ? 'primary' : 'default'" size="small" @click.stop="viewMode = 'week'">周</el-button>
                <el-button :type="viewMode === 'day' ? 'primary' : 'default'" size="small" @click.stop="viewMode = 'day'">日</el-button>
              </el-button-group>
              <el-button type="primary" size="small" @click.stop="openCreateDialog">
                <el-icon><Plus /></el-icon>
                添加日程
              </el-button>
              <el-button-group>
                <el-button size="small" @click="selectDate('prev-month')">上一月</el-button>
                <el-button size="small" @click="selectDate('today')">今天</el-button>
                <el-button size="small" @click="selectDate('next-month')">下一月</el-button>
              </el-button-group>
            </div>
          </template>
          <template #date-cell="{ data }">
            <div
              class="calendar-day"
              :class="{
                'is-today': isToday(data.day),
                'is-selected': isSelectedDate(data.day),
                'has-schedules': getDaySchedules(data.day).length > 0,
                'has-birthdays': getDayBirthdays(data.day).length > 0
              }"
              @click="handleDayClick(data.day)"
            >
              <div class="day-number">
                {{ parseInt(data.day.split('-').slice(2).join('-')) }}
                <span v-if="getLunarHoliday(data.day)" class="lunar-holiday">{{ getLunarHoliday(data.day) }}</span>
              </div>
              <div class="day-schedules">
                <!-- 生日提醒 -->
                <div
                  v-for="bday in getDayBirthdays(data.day).slice(0, 2)"
                  :key="'bday-' + bday.crewMemberId + '-' + bday.birthdayType"
                  class="birthday-dot"
                  :class="bday.birthdayType === 'solar' ? 'birthday-solar' : 'birthday-lunar'"
                  @click.stop="showBirthdayDetail(bday)"
                  :title="`${bday.crewName} - ${bday.birthdayLabel} - ${bday.actionLabel}`"
                >
                  <span class="birthday-icon">{{ bday.birthdayType === 'solar' ? '🎂' : '🍜' }}</span>
                  <span class="birthday-text truncate">{{ bday.crewName }}</span>
                </div>
                <!-- 日程 -->
                <div
                  v-for="schedule in getDaySchedules(data.day).slice(0, 3)"
                  :key="schedule.id"
                  class="schedule-dot"
                  :class="getPriorityClass(schedule.priority)"
                  @click.stop="handleScheduleClick(schedule)"
                  :title="schedule.secondType"
                >
                  <span class="schedule-text truncate">{{ schedule.secondType }}</span>
                </div>
                <div v-if="getDaySchedules(data.day).length + getDayBirthdays(data.day).length > 3" class="more-indicator">
                  +{{ getDaySchedules(data.day).length + getDayBirthdays(data.day).length - 3 }}
                </div>
              </div>
            </div>
          </template>
        </el-calendar>

        <!-- 周视图 -->
        <div v-else-if="viewMode === 'week'" class="week-view">
          <div class="week-header">
            <el-button size="small" @click="selectDate('prev-week')">&lt;</el-button>
            <span class="week-title">{{ weekRangeText }}</span>
            <el-button size="small" @click="selectDate('next-week')">&gt;</el-button>
          </div>
          <div class="week-grid">
            <div v-for="day in weekDays" :key="day.date" class="week-day-column" :class="{ 'is-today': isToday(day.date), 'is-selected': isSelectedDate(day.date) }" @click="handleDayClick(day.date)">
              <div class="week-day-header">
                <span class="week-day-name">{{ day.name }}</span>
                <span class="week-day-num">{{ day.num }}</span>
              </div>
              <div class="week-day-events">
                <div v-for="bday in getDayBirthdays(day.date)" :key="'bday-' + bday.crewMemberId + '-' + bday.birthdayType" class="week-event birthday-event" :class="bday.birthdayType === 'solar' ? 'birthday-solar-event' : 'birthday-lunar-event'" @click.stop="showBirthdayDetail(bday)">
                  {{ bday.birthdayType === 'solar' ? '🎂' : '🍜' }} {{ bday.crewName }} {{ bday.birthdayLabel }}
                </div>
                <div v-for="schedule in getDaySchedules(day.date)" :key="schedule.id" class="week-event" :class="getPriorityClass(schedule.priority)" @click.stop="handleScheduleClick(schedule)">
                  {{ schedule.secondType }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 日视图 -->
        <div v-else-if="viewMode === 'day'" class="day-view">
          <div class="day-header">
            <el-button size="small" @click="selectDate('prev-day')">&lt;</el-button>
            <span class="day-title">{{ selectedDateLabel }}</span>
            <el-button size="small" @click="selectDate('next-day')">&gt;</el-button>
          </div>
          <div class="day-timeline">
            <div v-for="hour in 24" :key="hour - 1" class="timeline-hour">
              <div class="hour-label">{{ String(hour - 1).padStart(2, '0') }}:00</div>
              <div class="hour-content">
                <div v-for="bday in getHourBirthdays(hour - 1)" :key="'bday-' + bday.crewMemberId + '-' + bday.birthdayType" class="timeline-event birthday-event" :class="bday.birthdayType === 'solar' ? 'birthday-solar-event' : 'birthday-lunar-event'" @click="showBirthdayDetail(bday)">
                  {{ bday.birthdayType === 'solar' ? '🎂' : '🍜' }} {{ bday.crewName }} {{ bday.birthdayLabel }} - {{ bday.actionLabel }}
                </div>
                <div v-for="schedule in getHourSchedules(hour - 1)" :key="schedule.id" class="timeline-event" :class="getPriorityClass(schedule.priority)" @click="handleScheduleClick(schedule)">
                  {{ schedule.secondType }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 拖动分隔条 -->
      <div class="resize-handle" ref="resizeHandleRef" @mousedown="startResize">
        <span class="resize-icon">⋮⋮</span>
      </div>

      <div class="schedule-list-section" :style="{ flex: scheduleFlex }">
        <!-- 折叠式面板 - 日程列表 -->
        <div class="collapse-panel">
          <div class="collapse-header" @click="scheduleExpanded = !scheduleExpanded">
            <div class="collapse-title">
              <span class="collapse-icon">📅</span>
              <span>{{ selectedDateLabel }}</span>
              <span class="collapse-count">共 {{ daySchedules.length }} 条日程，{{ dayBirthdays.length }} 个生日</span>
            </div>
            <el-icon class="collapse-arrow" :class="{ expanded: scheduleExpanded }"><ArrowDown /></el-icon>
          </div>
          <div v-show="scheduleExpanded" class="collapse-content">
            <div class="schedule-list" v-loading="loading">
              <!-- 生日提醒区 -->
              <div v-if="dayBirthdays.length > 0" class="birthday-section">
                <div class="birthday-section-header">
                  <span class="birthday-section-title">🎉 今日生日提醒</span>
                </div>
                <div
                  v-for="bday in dayBirthdays"
                  :key="'list-bday-' + bday.crewMemberId + '-' + bday.birthdayType"
                  class="schedule-item birthday-item"
                  :class="bday.birthdayType === 'solar' ? 'birthday-solar-item' : 'birthday-lunar-item'"
                  @click="showBirthdayDetail(bday)"
                >
                  <div class="schedule-item-header">
                    <div class="schedule-title birthday-title">
                      <span class="birthday-type-badge" :class="bday.birthdayType === 'solar' ? 'badge-solar' : 'badge-lunar'">
                        {{ bday.birthdayType === 'solar' ? '公历' : '农历' }}
                      </span>
                      {{ bday.crewName }} 生日
                    </div>
                  </div>
                  <div class="schedule-item-body">
                    <div class="schedule-tags">
                      <el-tag :type="bday.birthdayType === 'solar' ? 'warning' : 'danger'" size="small" effect="plain">
                        {{ bday.birthdayLabel }}
                      </el-tag>
                      <el-tag :type="bday.birthdayType === 'solar' ? 'warning' : 'danger'" size="small">
                        {{ bday.actionLabel }}
                      </el-tag>
                    </div>
                    <div class="schedule-meta">
                      <span v-if="bday.shipName" class="meta-item">
                        <el-icon><ShipIcon /></el-icon>
                        {{ bday.shipName }}
                      </span>
                      <span v-if="bday.position" class="meta-item">
                        {{ bday.position }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="daySchedules.length === 0 && dayBirthdays.length === 0" class="empty-state">
                <el-empty description="当天没有日程安排" :image-size="80">
                  <el-button type="primary" size="small" @click="openCreateDialog">
                    创建日程
                  </el-button>
                </el-empty>
              </div>

              <div
                v-for="schedule in daySchedules"
                :key="schedule.id"
                class="schedule-item glass-card"
                :class="getPriorityClass(schedule.priority)"
                @click="openEditDialog(schedule)"
              >
                <div class="schedule-item-header">
                  <div class="schedule-title">{{ schedule.secondType }}</div>
                  <div class="schedule-actions">
                    <el-button size="small" text @click.stop="openEditDialog(schedule)">
                      <el-icon><Edit /></el-icon>
                    </el-button>
                    <el-button size="small" text type="danger" @click.stop="deleteSchedule(schedule)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>

                <div class="schedule-item-body">
                  <div class="schedule-tags">
                    <el-tag :type="getStatusType(schedule.finishStatus)" size="small">
                      {{ getStatusText(schedule.finishStatus) }}
                    </el-tag>
                    <el-tag :type="getPriorityType(schedule.priority)" size="small" effect="plain">
                      {{ getPriorityText(schedule.priority) }}
                    </el-tag>
                    <el-tag v-if="schedule.firstType" size="small" type="info">
                      {{ schedule.firstType }}
                    </el-tag>
                  </div>

                  <div v-if="schedule.eventDetail" class="schedule-detail">
                    {{ schedule.eventDetail }}
                  </div>

                  <div class="schedule-meta">
                    <span v-if="schedule.ship?.cnShipName" class="meta-item">
                      <el-icon><ShipIcon /></el-icon>
                      {{ schedule.ship.cnShipName }}
                    </span>
                    <span v-if="schedule.startTime" class="meta-item">
                      <el-icon><Clock /></el-icon>
                      {{ formatTime(schedule.startTime) }}
                    </span>
                    <span v-if="schedule.endTime" class="meta-item">
                      <el-icon><Clock /></el-icon>
                      {{ formatTime(schedule.endTime) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 折叠式面板 - 重点任务 -->
        <div class="collapse-panel">
          <div class="collapse-header" @click="tasksExpanded = !tasksExpanded">
            <div class="collapse-title">
              <span class="collapse-icon">⭐</span>
              <span>重点任务</span>
            </div>
            <el-icon class="collapse-arrow" :class="{ expanded: tasksExpanded }"><ArrowDown /></el-icon>
          </div>
          <div v-show="tasksExpanded" class="collapse-content">
            <div class="card-header-with-action">
              <div style="display: flex; gap: 8px;">
                <el-button type="info" size="small" @click="goToDashboard">
                  <el-icon><PieChart /></el-icon>
                  看板
                </el-button>
                <el-button type="primary" size="small" circle @click="openAddTaskDialog" class="add-task-btn" title="添加任务">
                  <el-icon><Plus /></el-icon>
                </el-button>
              </div>
            </div>
            <div v-if="filteredTasks.length > 0" class="diary-list">
              <div
                v-for="task in filteredTasks"
                :key="task.id"
                class="diary-item task-item"
                :class="{ 'is-completed': task.isCompleted, 'is-pinned': task.isPinned }"
                @click="openTaskDialog(task)"
                @contextmenu.prevent="onTaskContextMenu($event, task)"
              >
                <span v-if="task.isPinned" class="pin-icon">⭐</span>
                <div class="task-content">
                  <div class="diary-date">{{ task.title }}</div>
                  <div class="diary-preview">{{ task.itemCount }}项检查 · {{ formatDateShort(task.publishedAt || task.createdAt) }}</div>
                </div>
              </div>
            </div>
            <div v-else class="empty-text">暂无任务</div>
          </div>
        </div>

        <!-- 折叠式面板 - 航海日记 -->
        <div class="collapse-panel">
          <div class="collapse-header" @click="diaryExpanded = !diaryExpanded">
            <div class="collapse-title">
              <span class="collapse-icon">📝</span>
              <span>{{ isPoliticalInstructor ? '航海日志' : '工作日记' }}</span>
            </div>
            <el-icon class="collapse-arrow" :class="{ expanded: diaryExpanded }"><ArrowDown /></el-icon>
          </div>
          <div v-show="diaryExpanded" class="collapse-content">
            <!-- 关联日程 -->
            <div class="relation-section">
              <div class="relation-header">
                <span>关联日程（自动继承分类）</span>
                <el-button v-if="availableSchedules.length > 0" size="small" text type="primary" @click="selectAllSchedules">全选</el-button>
              </div>
              <div v-if="availableSchedules.length === 0" class="empty-text-small">
                今日暂无已完成日程可关联
              </div>
              <div v-else class="relation-list">
                <div v-for="s in availableSchedules" :key="s.id" class="relation-item" :class="{ 'is-selected': isScheduleSelected(s) }" @click="toggleScheduleRelation(s)">
                  <span class="check-icon">{{ isScheduleSelected(s) ? '✓' : '○' }}</span>
                  <span class="relation-text">{{ s.firstType }} / {{ s.secondType }}</span>
                </div>
              </div>
              <div v-if="diaryForm.relatedScheduleIds.length > 0" class="relation-summary">
                已关联 {{ diaryForm.relatedScheduleIds.length }} 项日程
              </div>
            </div>

            <!-- 日记编辑器 -->
            <div class="diary-editor">
              <div class="editor-container" :class="{ 'show-lines': showLines }" :style="{ '--line-height': computedLineHeight, '--bg-position': backgroundPosition, '--paper-bg': currentPaper.bg, '--line-color': currentPaper.line } as any">
                <div
                  ref="editorRef"
                  class="editor-content"
                  contenteditable="true"
                  @input="onContentInput"
                  @paste="onPaste"
                  :style="{ fontSize: fontSize, lineHeight: computedLineHeight }"
                ></div>
              </div>
            </div>

            <div class="diary-actions">
              <el-button type="primary" @click="saveDiary" :loading="diarySaving">保存日记</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务右键菜单 -->
    <div v-if="contextMenu.visible" class="task-context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
      <div class="menu-item" @click="togglePin(contextMenu.task)">
        <span class="menu-icon">{{ contextMenu.task.isPinned ? '⭐' : '☆' }}</span>
        {{ contextMenu.task.isPinned ? '取消置顶' : '置顶' }}
      </div>
      <div class="menu-item" @click="toggleComplete(contextMenu.task)">
        <span class="menu-icon">{{ contextMenu.task.isCompleted ? '' : '✓' }}</span>
        {{ contextMenu.task.isCompleted ? '标记未完成' : '标记已完成' }}
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item danger" @click="dismissTask(contextMenu.task)">
        <span class="menu-icon">✕</span>
        移除显示
      </div>
    </div>

    <!-- 任务详情弹窗 -->
    <el-dialog v-model="taskDialogVisible" :title="currentTask?.title || '任务详情'" width="500px">
      <div v-if="currentTask" class="task-detail">
        <div class="task-detail-header">
          <span class="task-detail-date">{{ formatDateShort(currentTask.publishedAt || currentTask.createdAt) }}</span>
          <el-tag :type="currentTask.isPublished ? 'success' : 'info'" size="small">{{ currentTask.isPublished ? '已发布' : '草稿' }}</el-tag>
        </div>
        <el-divider style="margin: 12px 0" />
        <div class="task-items">
          <div v-for="(item, idx) in currentTask.items" :key="idx" class="task-item-row">
            <span class="task-item-index">{{ idx + 1 }}.</span>
            <span class="task-item-text">{{ item }}</span>
          </div>
        </div>
        <el-divider style="margin: 16px 0 8px" />
        <div class="task-detail-footer">共 {{ currentTask.items?.length || 0 }} 项检查内容</div>
      </div>
      <template #footer>
        <el-button @click="taskDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 添加任务弹窗 -->
    <el-dialog v-model="addTaskDialogVisible" title="添加任务" width="500px" :close-on-click-modal="false">
      <el-form label-position="top" class="add-task-form">
        <el-form-item label="任务类型">
          <el-radio-group v-model="newTask.type">
            <el-radio value="personal">个人任务</el-radio>
            <el-radio value="ship">发布给船舶</el-radio>
          </el-radio-group>
        </el-form-item>
        <template v-if="newTask.type === 'personal'">
          <el-form-item label="任务标题" required>
            <el-input v-model="newTask.title" placeholder="请输入任务标题，如：明日抵港检查准备" />
          </el-form-item>
          <el-form-item label="任务描述">
            <el-input v-model="newTask.description" type="textarea" :rows="3" placeholder="请输入任务描述（选填）" />
          </el-form-item>
          <el-form-item label="截止日期">
            <el-date-picker v-model="newTask.dueDate" type="date" placeholder="选择截止日期" style="width: 100%" value-format="YYYY-MM-DD" />
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="选择船舶" required>
            <el-select v-model="newTask.shipId" placeholder="请选择船舶" filterable style="width: 100%">
              <el-option v-for="ship in ships" :key="ship.id" :label="ship.cnShipName" :value="ship.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="任务内容" required>
            <el-input v-model="newTask.content" type="textarea" :rows="4" placeholder="请直接描述任务内容" />
          </el-form-item>
          <el-form-item label="截止日期">
            <el-date-picker v-model="newTask.dueDate" type="date" placeholder="选择截止日期" style="width: 100%" value-format="YYYY-MM-DD" />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="addTaskDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddTask">确定添加</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑日程' : '新建日程'"
      width="700px"
      @close="resetForm"
    >
      <el-form :model="form" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="登记日期" required>
              <el-date-picker
                v-model="form.recordDate"
                type="date"
                placeholder="选择日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属船舶">
              <el-select v-model="form.shipId" placeholder="选择船舶" clearable style="width: 100%">
                <el-option
                  v-for="ship in ships"
                  :key="ship.id"
                  :label="ship.cnShipName"
                  :value="ship.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="一级分类" required>
              <el-select v-model="form.firstType" placeholder="选择分类" style="width: 100%" @change="onFormFirstTypeChange">
                <el-option
                  v-for="type in firstTypes"
                  :key="type.id"
                  :label="type.categoryName"
                  :value="type.categoryName"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="二级分类" required>
              <el-select v-model="form.secondType" placeholder="选择分类" style="width: 100%" :disabled="!form.firstType">
                <el-option
                  v-for="type in filteredFormSecondTypes"
                  :key="type.id"
                  :label="type.categoryName"
                  :value="type.categoryName"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="优先级">
              <el-select v-model="form.priority" placeholder="选择优先级" style="width: 100%">
                <el-option label="🔴 重要紧急" value="urgent_important" />
                <el-option label="🟡 重要不紧急" value="important" />
                <el-option label="🔵 紧急不重要" value="urgent" />
                <el-option label="🟢 不紧急不重要" value="normal" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="form.finishStatus" placeholder="选择状态" style="width: 100%">
                <el-option label="待处理" value="pending" />
                <el-option label="进行中" value="in_progress" />
                <el-option label="已完成" value="completed" />
                <el-option label="已取消" value="cancelled" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始时间">
              <el-date-picker
                v-model="form.startTime"
                type="datetime"
                placeholder="选择时间"
                style="width: 100%"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间">
              <el-date-picker
                v-model="form.endTime"
                type="datetime"
                placeholder="选择时间"
                style="width: 100%"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="事件详情">
          <el-input
            v-model="form.eventDetail"
            type="textarea"
            :rows="5"
            placeholder="请输入事件详情..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, Edit, Delete, Ship as ShipIcon, Clock, ArrowDown, PieChart } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Schedule, Ship, DictCategory, Priority, BirthdayReminderItem } from '~/types'
import { useLunar } from '~/composables/useLunar'

definePageMeta({
  middleware: ['auth'],
})

useHead({
  title: '日历日程 - 熊猫笔记',
})

const api = useApi()
const authStore = useAuthStore()
const { getLunarDate } = useLunar()

const selectedDate = ref(new Date())
const dialogVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const loading = ref(false)
const viewMode = ref<'month' | 'week' | 'day'>('month')
const weekStartDay = ref(0)
const currentStep = ref(1)

// 布局相关
const contentAreaRef = ref<HTMLElement | null>(null)
const resizeHandleRef = ref<HTMLElement | null>(null)
const calendarFlex = ref(1)
const scheduleFlex = ref(1)

// 折叠状态
const scheduleExpanded = ref(false)
const tasksExpanded = ref(false)
const diaryExpanded = ref(false)

// 日记相关
const diarySaving = ref(false)
const diaryForm = ref({
  weather: '',
  seaCondition: '',
  dynamicStatus: '',
  departurePort: '',
  arrivalPort: '',
  voyageNumber: '',
  shipName: '',
  departureDate: '',
  arrivalDate: '',
  departureTime: '',
  arrivalTime: '',
  pirateStatus: '',
  pirateTime: '',
  timezone: 'UTC+8',
  shipPosition: '',
  isFreePortZone: false,
  isWarZone: false,
  leadSealOperation: false,
  content: '',
  relatedScheduleIds: [] as number[],
})
const ports = ref<{ id: number; name: string; english: string; country: string; pinyin: string }[]>([])
const ships = ref<any[]>([])

const sortedPorts = computed(() => {
  return [...ports.value].sort((a, b) => {
    const pinyinA = a.pinyin || a.name
    const pinyinB = b.pinyin || b.name
    return pinyinA.localeCompare(pinyinB)
  })
})

const filteredDeparturePorts = ref<any[]>([])
const filteredArrivalPorts = ref<any[]>([])

const initPortFilters = () => {
  filteredDeparturePorts.value = [...sortedPorts.value]
  filteredArrivalPorts.value = [...sortedPorts.value]
}

const filterDeparturePorts = (query: string) => {
  if (!query) {
    filteredDeparturePorts.value = [...sortedPorts.value]
    return
  }
  
  const q = query.toLowerCase().trim()
  
  const isLetterOnly = /^[a-z]+$/.test(q)
  
  const pinyinInitialMatches = sortedPorts.value.filter(port => {
    const pinyinInitials = getPortInitials(port.pinyin || '')
    return pinyinInitials.startsWith(q)
  })
  
  if (isLetterOnly && pinyinInitialMatches.length > 0) {
    filteredDeparturePorts.value = pinyinInitialMatches
    return
  }
  
  filteredDeparturePorts.value = sortedPorts.value.filter(port => {
    const nameMatch = port.name.includes(q)
    const englishMatch = port.english ? port.english.toLowerCase().includes(q) : false
    const pinyinMatch = port.pinyin ? port.pinyin.toLowerCase().includes(q) : false
    const pinyinInitials = getPortInitials(port.pinyin || '')
    const initialMatch = pinyinInitials.startsWith(q)
    
    return nameMatch || englishMatch || pinyinMatch || initialMatch
  })
}

const filterArrivalPorts = (query: string) => {
  if (!query) {
    filteredArrivalPorts.value = [...sortedPorts.value]
    return
  }
  
  const q = query.toLowerCase().trim()
  
  const isLetterOnly = /^[a-z]+$/.test(q)
  
  const pinyinInitialMatches = sortedPorts.value.filter(port => {
    const pinyinInitials = getPortInitials(port.pinyin || '')
    return pinyinInitials.startsWith(q)
  })
  
  if (isLetterOnly && pinyinInitialMatches.length > 0) {
    filteredArrivalPorts.value = pinyinInitialMatches
    return
  }
  
  filteredArrivalPorts.value = sortedPorts.value.filter(port => {
    const nameMatch = port.name.includes(q)
    const englishMatch = port.english ? port.english.toLowerCase().includes(q) : false
    const pinyinMatch = port.pinyin ? port.pinyin.toLowerCase().includes(q) : false
    const pinyinInitials = getPortInitials(port.pinyin || '')
    const initialMatch = pinyinInitials.startsWith(q)
    
    return nameMatch || englishMatch || pinyinMatch || initialMatch
  })
}

const resetDeparturePorts = () => {
  filteredDeparturePorts.value = [...sortedPorts.value]
}

const resetArrivalPorts = () => {
  filteredArrivalPorts.value = [...sortedPorts.value]
}

const getPortInitials = (pinyin: string): string => {
  if (!pinyin) return ''
  const pinyinMap: Record<string, string> = {
    'sh': 'sh', 'ch': 'ch', 'zh': 'zh',
    'a': 'a', 'ai': 'a', 'an': 'a', 'ang': 'a', 'ao': 'a',
    'b': 'b', 'bai': 'b', 'ban': 'b', 'bang': 'b', 'bao': 'b', 'bei': 'b', 'ben': 'b', 'beng': 'b', 'bi': 'b', 'bian': 'b', 'biao': 'b', 'bie': 'b', 'bin': 'b', 'bing': 'b', 'bo': 'b', 'bu': 'b',
    'c': 'c', 'cai': 'c', 'can': 'c', 'cang': 'c', 'cao': 'c', 'ce': 'c', 'ceng': 'c', 'cha': 'ch', 'chai': 'ch', 'chan': 'ch', 'chang': 'ch', 'chao': 'ch', 'che': 'ch', 'chen': 'ch', 'cheng': 'ch', 'chi': 'ch', 'chong': 'ch', 'chou': 'ch', 'chu': 'ch', 'chuan': 'ch', 'chuang': 'ch', 'chui': 'ch', 'chun': 'ch', 'chuo': 'ch', 'ci': 'c', 'cong': 'c', 'cou': 'c', 'cu': 'c', 'cuan': 'c', 'cui': 'c', 'cun': 'c', 'cuo': 'c',
    'd': 'd', 'dai': 'd', 'dan': 'd', 'dang': 'd', 'dao': 'd', 'de': 'd', 'deng': 'd', 'di': 'd', 'dian': 'd', 'diao': 'd', 'die': 'd', 'ding': 'd', 'diu': 'd', 'dong': 'd', 'dou': 'd', 'du': 'd', 'duan': 'd', 'dui': 'd', 'dun': 'd', 'duo': 'd',
    'e': 'e', 'ei': 'e', 'en': 'e', 'eng': 'e', 'er': 'e',
    'f': 'f', 'fa': 'f', 'fan': 'f', 'fang': 'f', 'fei': 'f', 'fen': 'f', 'feng': 'f', 'fo': 'f', 'fou': 'f', 'fu': 'f',
    'g': 'g', 'ga': 'g', 'gai': 'g', 'gan': 'g', 'gang': 'g', 'gao': 'g', 'ge': 'g', 'gei': 'g', 'gen': 'g', 'geng': 'g', 'gong': 'g', 'gou': 'g', 'gu': 'g', 'gua': 'g', 'guai': 'g', 'guan': 'g', 'guang': 'g', 'gui': 'g', 'gun': 'g', 'guo': 'g',
    'h': 'h', 'ha': 'h', 'hai': 'h', 'han': 'h', 'hang': 'h', 'hao': 'h', 'he': 'h', 'hei': 'h', 'hen': 'h', 'heng': 'h', 'hong': 'h', 'hou': 'h', 'hu': 'h', 'hua': 'h', 'huai': 'h', 'huan': 'h', 'huang': 'h', 'hui': 'h', 'hun': 'h', 'huo': 'h',
    'j': 'j', 'ji': 'j', 'jia': 'j', 'jian': 'j', 'jiang': 'j', 'jiao': 'j', 'jie': 'j', 'jin': 'j', 'jing': 'j', 'jiong': 'j', 'jiu': 'j', 'ju': 'j', 'juan': 'j', 'jue': 'j', 'jun': 'j',
    'k': 'k', 'ka': 'k', 'kai': 'k', 'kan': 'k', 'kang': 'k', 'kao': 'k', 'ke': 'k', 'ken': 'k', 'keng': 'k', 'kong': 'k', 'kou': 'k', 'ku': 'k', 'kua': 'k', 'kuai': 'k', 'kuan': 'k', 'kuang': 'k', 'kui': 'k', 'kun': 'k', 'kuo': 'k',
    'l': 'l', 'la': 'l', 'lai': 'l', 'lan': 'l', 'lang': 'l', 'lao': 'l', 'le': 'l', 'lei': 'l', 'leng': 'l', 'li': 'l', 'lia': 'l', 'lian': 'l', 'liang': 'l', 'liao': 'l', 'lie': 'l', 'lin': 'l', 'ling': 'l', 'liu': 'l', 'long': 'l', 'lou': 'l', 'lu': 'l', 'lv': 'l', 'luan': 'l', 'lue': 'l', 'lun': 'l', 'luo': 'l',
    'm': 'm', 'ma': 'm', 'mai': 'm', 'man': 'm', 'mang': 'm', 'mao': 'm', 'mei': 'm', 'men': 'm', 'meng': 'm', 'mi': 'm', 'mian': 'm', 'miao': 'm', 'mie': 'm', 'min': 'm', 'ming': 'm', 'miu': 'm', 'mo': 'm', 'mou': 'm', 'mu': 'm',
    'n': 'n', 'na': 'n', 'nai': 'n', 'nan': 'n', 'nang': 'n', 'nao': 'n', 'ne': 'n', 'nei': 'n', 'nen': 'n', 'neng': 'n', 'ni': 'n', 'nian': 'n', 'niang': 'n', 'niao': 'n', 'nie': 'n', 'nin': 'n', 'ning': 'n', 'niu': 'n', 'nong': 'n', 'nu': 'n', 'nv': 'n', 'nuan': 'n', 'nue': 'n', 'nuo': 'n',
    'o': 'o', 'ou': 'o',
    'p': 'p', 'pa': 'p', 'pai': 'p', 'pan': 'p', 'pang': 'p', 'pao': 'p', 'pei': 'p', 'pen': 'p', 'peng': 'p', 'pi': 'p', 'pian': 'p', 'piao': 'p', 'pie': 'p', 'pin': 'p', 'ping': 'p', 'po': 'p', 'pou': 'p', 'pu': 'p',
    'q': 'q', 'qi': 'q', 'qia': 'q', 'qian': 'q', 'qiang': 'q', 'qiao': 'q', 'qie': 'q', 'qin': 'q', 'qing': 'q', 'qiong': 'q', 'qiu': 'q', 'qu': 'q', 'quan': 'q', 'que': 'q', 'qun': 'q',
    'r': 'r', 'ran': 'r', 'rang': 'r', 'rao': 'r', 're': 'r', 'ren': 'r', 'reng': 'r', 'ri': 'r', 'rong': 'r', 'rou': 'r', 'ru': 'r', 'ruan': 'r', 'rui': 'r', 'run': 'r', 'ruo': 'r',
    's': 's', 'sa': 's', 'sai': 's', 'san': 's', 'sang': 's', 'sao': 's', 'se': 's', 'sen': 's', 'seng': 's', 'sha': 'sh', 'shai': 'sh', 'shan': 'sh', 'shang': 'sh', 'shao': 'sh', 'she': 'sh', 'shen': 'sh', 'sheng': 'sh', 'shi': 'sh', 'shou': 'sh', 'shu': 'sh', 'shua': 'sh', 'shuai': 'sh', 'shuan': 'sh', 'shuang': 'sh', 'shui': 'sh', 'shun': 'sh', 'shuo': 'sh', 'si': 's', 'song': 's', 'sou': 's', 'su': 's', 'suan': 's', 'sui': 's', 'sun': 's', 'suo': 's',
    't': 't', 'ta': 't', 'tai': 't', 'tan': 't', 'tang': 't', 'tao': 't', 'te': 't', 'teng': 't', 'ti': 't', 'tian': 't', 'tiao': 't', 'tie': 't', 'ting': 't', 'tong': 't', 'tou': 't', 'tu': 't', 'tuan': 't', 'tui': 't', 'tun': 't', 'tuo': 't',
    'w': 'w', 'wa': 'w', 'wai': 'w', 'wan': 'w', 'wang': 'w', 'wei': 'w', 'wen': 'w', 'weng': 'w', 'wo': 'w', 'wu': 'w',
    'x': 'x', 'xi': 'x', 'xia': 'x', 'xian': 'x', 'xiang': 'x', 'xiao': 'x', 'xie': 'x', 'xin': 'x', 'xing': 'x', 'xiong': 'x', 'xiu': 'x', 'xu': 'x', 'xuan': 'x', 'xue': 'x', 'xun': 'x',
    'y': 'y', 'ya': 'y', 'yan': 'y', 'yang': 'y', 'yao': 'y', 'ye': 'y', 'yi': 'y', 'yin': 'y', 'ying': 'y', 'yong': 'y', 'you': 'y', 'yu': 'y', 'yuan': 'y', 'yue': 'y', 'yun': 'y',
    'z': 'z', 'za': 'z', 'zai': 'z', 'zan': 'z', 'zang': 'z', 'zao': 'z', 'ze': 'z', 'zei': 'z', 'zen': 'z', 'zeng': 'z', 'zha': 'zh', 'zhai': 'zh', 'zhan': 'zh', 'zhang': 'zh', 'zhao': 'zh', 'zhe': 'zh', 'zhen': 'zh', 'zheng': 'zh', 'zhi': 'zh', 'zhong': 'zh', 'zhou': 'zh', 'zhu': 'zh', 'zhua': 'zh', 'zhuai': 'zh', 'zhuan': 'zh', 'zhuang': 'zh', 'zhui': 'zh', 'zhun': 'zh', 'zhuo': 'zh', 'zi': 'z', 'zong': 'z', 'zou': 'z', 'zu': 'z', 'zuan': 'z', 'zui': 'z', 'zun': 'z', 'zuo': 'z'
  }
  
  const words = pinyin.split(' ')
  let initials = ''
  
  for (const word of words) {
    if (!word) continue
    
    let matched = false
    for (const key of Object.keys(pinyinMap).sort((a, b) => b.length - a.length)) {
      if (word.startsWith(key)) {
        initials += pinyinMap[key]
        matched = true
        break
      }
    }
    
    if (!matched && word.length > 0) {
      initials += word[0]
    }
  }
  
  return initials.toLowerCase()
}

// 任务相关
const tasks = ref<any[]>([])
const taskDialogVisible = ref(false)
const addTaskDialogVisible = ref(false)
const currentTask = ref<any>(null)

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  task: null as any,
})

const newTask = ref({
  type: 'personal',
  title: '',
  description: '',
  dueDate: '',
  shipId: undefined as number | undefined,
  content: '',
})

const filteredTasks = computed(() => {
  return tasks.value.filter(t => !t.isDismissed).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return 0
  })
})

const formatDateShort = (dateStr: string | null | undefined) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const isPoliticalInstructor = computed(() => {
  return authStore.userRole === 'ship_political_instructor'
})

const isShoreCrewSupervisor = computed(() => {
  return authStore.userRole === 'shore_crew_supervisor'
})

// 天气、动态等字段在政委和船工主管角色都显示
const showWeatherFields = computed(() => {
  return isPoliticalInstructor.value || isShoreCrewSupervisor.value
})

const hasShipInfo = computed(() => {
  return diaryForm.shipName || diaryForm.departurePort || diaryForm.arrivalPort || 
         diaryForm.weather || diaryForm.seaCondition || diaryForm.dynamicStatus
})

// 日记编辑器相关状态
const editorRef = ref<HTMLDivElement | null>(null)
const showLines = ref(true)
const fontSize = ref('16px')
const lineHeight = ref(30)
const fontColor = ref('#000000')

const paperStyles = [
  { name: '白纸', bg: '#ffffff', line: '#e8e8e8' },
  { name: '黄纸', bg: '#fffbf0', line: '#ffe58f' },
  { name: '蓝纸', bg: '#f0f5ff', line: '#b3d1ff' },
]

const selectedPaper = ref(0)
const currentPaper = computed(() => paperStyles[selectedPaper.value])

const computedLineHeight = computed(() => `${lineHeight.value}px`)
const backgroundPosition = computed(() => `0 ${lineHeight.value}px`)

const lunarInfo = computed(() => {
  try {
    return getLunarDate(selectedDate.value) || { lunar: '', holiday: '', solarTerm: '' }
  } catch {
    return { lunar: '', holiday: '', solarTerm: '' }
  }
})

const currentDiaryId = ref<number | null>(null)

// 日记编辑器方法
const onContentInput = () => {}

const onPaste = (e: ClipboardEvent) => {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/html') || e.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertHTML', false, text)
}

const loadDiary = async () => {
  try {
    const dateStr = formatDate(selectedDate.value)
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
        voyageNumber: diary.voyageNumber || '',
        content: diary.content || '',
        relatedScheduleIds: diary.relatedScheduleIds || [],
        shipName: diary.shipName || '',
        departureTime: diary.departureTime || '',
        arrivalTime: diary.arrivalTime || '',
      }
      nextTick(() => {
        if (editorRef.value) {
          editorRef.value.innerHTML = diary.content || ''
        }
      })
    } else {
      currentDiaryId.value = null
      nextTick(() => {
        if (editorRef.value) {
          editorRef.value.innerHTML = ''
        }
      })
    }
  } catch {
    currentDiaryId.value = null
  }
}

// 监听日期变化加载日记
watch(selectedDate, async () => {
  await loadDiary()
})

const availableSchedules = computed(() => {
  return daySchedules.value.filter(s => s.finishStatus === 'completed')
})

const schedules = ref<Schedule[]>([])
const firstTypes = ref<DictCategory[]>([])
const secondTypes = ref<DictCategory[]>([])

// 生日提醒数据
const birthdayCalendar = ref<Record<string, BirthdayReminderItem[]>>({})

const form = ref({
  recordDate: '',
  shipId: undefined as number | undefined,
  firstType: '',
  secondType: '',
  priority: 'normal' as Priority,
  finishStatus: 'pending',
  startTime: '',
  endTime: '',
  eventDetail: '',
})

const filteredFormSecondTypes = computed(() => {
  if (!form.value.firstType) {
    return []
  }
  const firstTypeItem = firstTypes.value.find(ft => ft.categoryName === form.value.firstType)
  if (!firstTypeItem) {
    return []
  }
  return secondTypes.value.filter(st => st.parentId === firstTypeItem.id)
})

const selectedDateLabel = computed(() => {
  const d = selectedDate.value
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

const daySchedules = computed(() => {
  const dateStr = formatDate(selectedDate.value)
  return schedules.value.filter(s => {
    const sDate = formatDate(new Date(s.recordDate))
    return sDate === dateStr
  }).sort((a, b) => {
    const priorityOrder = ['urgent_important', 'important', 'urgent', 'normal', 'low']
    return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
  })
})

// 当日的生日提醒
const dayBirthdays = computed(() => {
  const dateStr = formatDate(selectedDate.value)
  const birthdays = birthdayCalendar.value[dateStr] || []
  const today = formatDate(new Date())
  return birthdays.map(b => ({
    ...b,
    isToday: dateStr === today,
    daysUntil: dateStr === today ? 0 : Math.ceil((new Date(dateStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)),
  }))
})

// 周视图相关
const weekDays = computed(() => {
  const d = new Date(selectedDate.value)
  const dayOfWeek = d.getDay()
  const start = new Date(d)
  start.setDate(d.getDate() - ((dayOfWeek - weekStartDay.value + 7) % 7))
  
  const dayNames = ['日', '一', '二', '三', '四', '五', '六']
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    return {
      date: formatDate(date),
      name: dayNames[(weekStartDay.value + i) % 7],
      num: date.getDate(),
      full: date
    }
  })
})

const weekRangeText = computed(() => {
  if (weekDays.value.length < 2) return ''
  const first = weekDays.value[0].full
  const last = weekDays.value[6].full
  if (first.getMonth() === last.getMonth()) {
    return `${first.getFullYear()}年${first.getMonth() + 1}月${first.getDate()}日 - ${last.getDate()}日`
  }
  return `${first.getFullYear()}年${first.getMonth() + 1}月${first.getDate()}日 - ${last.getMonth() + 1}月${last.getDate()}日`
})

// 日视图按小时获取日程
const getHourSchedules = (hour: number) => {
  const dateStr = formatDate(selectedDate.value)
  return daySchedules.value.filter(s => {
    if (!s.startTime) return false
    const h = new Date(s.startTime).getHours()
    return h === hour && formatDate(new Date(s.recordDate)) === dateStr
  })
}

// 日视图按小时获取生日（生日全天事件，放在上午9点）
const getHourBirthdays = (hour: number) => {
  if (hour !== 9) return []
  return dayBirthdays.value
}

// 获取某日的生日
const getDayBirthdays = (day: string): BirthdayReminderItem[] => {
  return birthdayCalendar.value[day] || []
}

// 显示生日详情
const showBirthdayDetail = (bday: BirthdayReminderItem) => {
  const typeText = bday.birthdayType === 'solar' ? '公历生日' : '农历生日'
  const actionText = bday.birthdayType === 'solar' 
    ? `发放礼金${bday.solarGiftAmount || 300}元` 
    : '政委慰问安排一碗面'
  
  let message = `👤 姓名：${bday.crewName}\n`
  if (bday.shipName) message += `🚢 船舶：${bday.shipName}\n`
  if (bday.position) message += `👔 岗位：${bday.position}\n`
  message += `🎉 类型：${typeText}\n`
  message += `💡 安排：${actionText}`
  
  ElMessageBox.alert(message, `${bday.crewName} - ${typeText}`, {
    confirmButtonText: '知道了',
    customClass: 'birthday-detail-dialog',
  })
}

// 农历节日
const getLunarHoliday = (day: string) => {
  try {
    const date = new Date(day)
    const lunar = getLunarDate(date)
    // lunar.holiday 已经包含了农历节日和公历节日的名称
    return lunar?.holiday || ''
  } catch {
    return ''
  }
}

const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isToday = (day: string): boolean => {
  return day === formatDate(new Date())
}

const isSelectedDate = (day: string): boolean => {
  return day === formatDate(selectedDate.value)
}

const getDaySchedules = (day: string): Schedule[] => {
  return schedules.value.filter(s => {
    const sDate = formatDate(new Date(s.recordDate))
    return sDate === day
  })
}

const handleDayClick = (day: string) => {
  selectedDate.value = new Date(day)
}

const handleScheduleClick = (schedule: Schedule) => {
  openEditDialog(schedule)
}

const selectDate = (type: string) => {
  const d = new Date(selectedDate.value)
  switch (type) {
    case 'prev-month': d.setMonth(d.getMonth() - 1); break
    case 'next-month': d.setMonth(d.getMonth() + 1); break
    case 'today': selectedDate.value = new Date(); return
    case 'prev-week': d.setDate(d.getDate() - 7); break
    case 'next-week': d.setDate(d.getDate() + 7); break
    case 'prev-day': d.setDate(d.getDate() - 1); break
    case 'next-day': d.setDate(d.getDate() + 1); break
  }
  selectedDate.value = d
  // 月份变化时重新加载生日数据
  loadBirthdays()
}

const openCreateDialog = () => {
  isEdit.value = false
  editingId.value = null
  form.value = {
    recordDate: formatDate(selectedDate.value),
    shipId: undefined,
    firstType: '',
    secondType: '',
    priority: 'normal',
    finishStatus: 'pending',
    startTime: '',
    endTime: '',
    eventDetail: '',
  }
  dialogVisible.value = true
}

const openEditDialog = (schedule: Schedule) => {
  isEdit.value = true
  editingId.value = schedule.id
  form.value = {
    recordDate: schedule.recordDate.split('T')[0],
    shipId: schedule.shipId,
    firstType: schedule.firstType || '',
    secondType: schedule.secondType || '',
    priority: schedule.priority || 'normal',
    finishStatus: schedule.finishStatus || 'pending',
    startTime: formatDateTimeForDisplay(schedule.startTime),
    endTime: formatDateTimeForDisplay(schedule.endTime),
    eventDetail: schedule.eventDetail || '',
  }
  dialogVisible.value = true
}

const formatDateTimeForDisplay = (dateTimeStr: string | null | undefined): string => {
  if (!dateTimeStr) return ''
  try {
    const date = new Date(dateTimeStr)
    if (isNaN(date.getTime())) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    return ''
  }
}

const formatTime = (dateTimeStr: string): string => {
  try {
    const date = new Date(dateTimeStr)
    if (isNaN(date.getTime())) return ''
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  } catch {
    return ''
  }
}

const resetForm = () => {
  isEdit.value = false
  editingId.value = null
  form.value = {
    recordDate: '',
    shipId: undefined,
    firstType: '',
    secondType: '',
    priority: 'normal',
    finishStatus: 'pending',
    startTime: '',
    endTime: '',
    eventDetail: '',
  }
}

const onFormFirstTypeChange = () => {
  form.value.secondType = ''
}

const deleteSchedule = async (schedule: Schedule) => {
  try {
    await ElMessageBox.confirm('确定要删除这条日程吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await api.schedules.delete(schedule.id)
    ElMessage.success('删除成功')
    loadSchedules()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleSave = async () => {
  if (!form.value.firstType || !form.value.secondType) {
    ElMessage.warning('请填写必填项')
    return
  }

  const dataToSave = {
    ...form.value,
    startTime: form.value.startTime ? form.value.startTime.replace(' ', 'T') : null,
    endTime: form.value.endTime ? form.value.endTime.replace(' ', 'T') : null,
  }

  saving.value = true
  try {
    if (isEdit.value && editingId.value) {
      await api.schedules.update(editingId.value, dataToSave as any)
      ElMessage.success('更新成功')
    } else {
      await api.schedules.create(dataToSave as any)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadSchedules()
  } catch (error) {
    ElMessage.error('保存失败: ' + (error as any).message || '未知错误')
  } finally {
    saving.value = false
  }
}

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    pending: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'danger',
  }
  return map[status] || ''
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

const getPriorityType = (priority: string) => {
  const map: Record<string, any> = {
    urgent_important: 'danger',
    important: 'warning',
    urgent: 'primary',
    normal: 'success',
    low: 'info',
  }
  return map[priority] || ''
}

const getPriorityText = (priority: string) => {
  const map: Record<string, string> = {
    urgent_important: '重要紧急',
    important: '重要不紧急',
    urgent: '紧急不重要',
    normal: '不紧急不重要',
    low: '低',
  }
  return map[priority] || priority
}

const getPriorityClass = (priority: string) => {
  const map: Record<string, string> = {
    urgent_important: 'priority-urgent-important',
    important: 'priority-important',
    urgent: 'priority-urgent',
    normal: 'priority-normal',
    low: 'priority-low',
  }
  return map[priority] || ''
}

const loadSchedules = async () => {
  loading.value = true
  try {
    const data = await api.schedules.getAll()
    schedules.value = data
  } catch (error) {
    ElMessage.error('加载日程失败')
  } finally {
    loading.value = false
  }
}

const loadData = async () => {
  try {
    const [shipsData, firstTypesData, secondTypesData] = await Promise.all([
      api.ships.getAll(),
      api.dict.getFirstTypes(),
      api.dict.getSecondTypes(),
    ])
    ships.value = shipsData
    firstTypes.value = firstTypesData
    secondTypes.value = secondTypesData
  } catch (error) {
    ElMessage.error('加载数据失败')
  }
}

// 加载生日数据
const loadBirthdays = async () => {
  try {
    const year = selectedDate.value.getFullYear()
    const month = selectedDate.value.getMonth() + 1
    const data = await api.crew.getBirthdaysByMonth(year, month)
    birthdayCalendar.value = data
  } catch (error) {
    // 静默失败，不影响日程加载
    console.error('加载生日数据失败:', error)
  }
}

// 监听月份变化
watch(
  () => selectedDate.value.getMonth(),
  () => {
    loadBirthdays()
  }
)

// 保存和加载周起始日设置
const saveWeekStartDay = () => {
  localStorage.setItem('scheduleWeekStartDay', String(weekStartDay.value))
}

const loadWeekStartDay = () => {
  const saved = localStorage.getItem('scheduleWeekStartDay')
  if (saved !== null) {
    weekStartDay.value = parseInt(saved)
  }
}

// 日记相关方法
const isScheduleSelected = (schedule: Schedule) => {
  return diaryForm.value.relatedScheduleIds.includes(schedule.id!)
}

const toggleScheduleRelation = (schedule: Schedule) => {
  const idx = diaryForm.value.relatedScheduleIds.indexOf(schedule.id!)
  if (idx > -1) {
    diaryForm.value.relatedScheduleIds.splice(idx, 1)
  } else {
    diaryForm.value.relatedScheduleIds.push(schedule.id!)
    if (!diaryForm.value.weather && schedule.firstType) {
    }
  }
}

const selectAllSchedules = () => {
  diaryForm.value.relatedScheduleIds = availableSchedules.value.map(s => s.id!).filter(Boolean) as number[]
}

const saveDiary = async () => {
  const content = editorRef.value?.innerHTML || ''
  if (!content && diaryForm.value.relatedScheduleIds.length === 0) {
    ElMessage.warning('请填写日记内容或关联日程')
    return
  }

  diarySaving.value = true
  try {
    const data = {
      date: formatDate(selectedDate.value),
      weather: diaryForm.value.weather,
      seaCondition: diaryForm.value.seaCondition,
      dynamicStatus: diaryForm.value.dynamicStatus,
      departurePort: diaryForm.value.departurePort,
      arrivalPort: diaryForm.value.arrivalPort,
      voyageNumber: diaryForm.value.voyageNumber,
      content,
      relatedScheduleIds: diaryForm.value.relatedScheduleIds,
      shipName: diaryForm.value.shipName,
      departureDate: diaryForm.value.departureDate,
      arrivalDate: diaryForm.value.arrivalDate,
      departureTime: diaryForm.value.departureTime,
      arrivalTime: diaryForm.value.arrivalTime,
      pirateStatus: diaryForm.value.pirateStatus,
      pirateTime: diaryForm.value.pirateTime,
      timezone: diaryForm.value.timezone,
      shipPosition: diaryForm.value.shipPosition,
      isFreePortZone: diaryForm.value.isFreePortZone,
      isWarZone: diaryForm.value.isWarZone,
      leadSealOperation: diaryForm.value.leadSealOperation,
    }
    if (currentDiaryId.value) {
      await api.diary.update(currentDiaryId.value, data as any)
    } else {
      const result = await api.diary.create(data as any)
      currentDiaryId.value = result.id
    }
    ElMessage.success('日记保存成功')
  } catch (error) {
    ElMessage.error('保存失败: ' + (error as any).message || '未知错误')
  } finally {
    diarySaving.value = false
  }
}

const loadPorts = async () => {
  try {
    const response = await api.port.getAll()
    ports.value = response?.data || response || []
    initPortFilters()
  } catch {
    ports.value = []
  }
}

const loadShips = async () => {
  try {
    ships.value = await api.ships.getAll()
  } catch {
    ships.value = []
  }
}

// 任务相关方法
const loadTasks = async () => {
  try {
    tasks.value = await api.tasks.getTree()
  } catch {
    tasks.value = []
  }
}

const goToDashboard = () => {
  window.location.href = '/dashboard'
}

const calculateDuration = (startTime: string, endTime: string): string => {
  if (!startTime || !endTime) return ''
  const start = new Date(startTime)
  const end = new Date(endTime)
  
  const diff = end.getTime() - start.getTime()
  if (diff <= 0) return ''
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0 && hours > 0 && minutes > 0) {
    return `${days}天${hours}小时${minutes}分钟`
  } else if (days > 0 && hours > 0) {
    return `${days}天${hours}小时`
  } else if (days > 0) {
    return `${days}天`
  } else if (hours > 0 && minutes > 0) {
    return `${hours}小时${minutes}分钟`
  } else if (hours > 0) {
    return `${hours}小时`
  } else {
    return `${minutes}分钟`
  }
}

const formatVoyageNumber = () => {
  let value = diaryForm.value.voyageNumber
  if (!value) return
  
  value = value.toUpperCase().replace(/[^V0-9]/g, '')
  
  if (!value.startsWith('V')) {
    value = 'V' + value.replace(/[^0-9]/g, '')
  }
  
  const numberPart = value.replace('V', '')
  const cleanNumber = parseInt(numberPart, 10) || 0
  
  if (cleanNumber > 999) {
    diaryForm.value.voyageNumber = 'V999'
  } else {
    diaryForm.value.voyageNumber = 'V' + cleanNumber.toString()
  }
}

const calculateProgress = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 0
  
  const now = new Date()
  const start = new Date(startTime)
  const end = new Date(endTime)
  
  const totalDuration = end.getTime() - start.getTime()
  if (totalDuration <= 0) return 0
  
  const elapsed = now.getTime() - start.getTime()
  if (elapsed <= 0) return 0
  if (elapsed >= totalDuration) return 100
  
  return (elapsed / totalDuration) * 100
}

const isLastThreeDays = computed(() => {
  if (!diaryForm.value.arrivalTime || !diaryForm.value.departureTime) return false
  
  const start = new Date(diaryForm.value.departureTime)
  const arrival = new Date(diaryForm.value.arrivalTime)
  
  const totalDuration = arrival.getTime() - start.getTime()
  if (totalDuration <= 0) return false
  
  const lastThreeDaysDuration = 72 * 60 * 60 * 1000
  return lastThreeDaysDuration / totalDuration >= 0.01
})

const lastThreeDaysStyle = computed(() => {
  if (!diaryForm.value.arrivalTime || !diaryForm.value.departureTime) return { display: 'none' }
  
  const start = new Date(diaryForm.value.departureTime)
  const arrival = new Date(diaryForm.value.arrivalTime)
  
  const totalDuration = arrival.getTime() - start.getTime()
  if (totalDuration <= 0) return { display: 'none' }
  
  const lastThreeDaysDuration = 72 * 60 * 60 * 1000
  const percentage = (lastThreeDaysDuration / totalDuration) * 100
  
  return {
    right: '0%',
    width: percentage + '%',
    display: percentage >= 1 ? 'block' : 'none'
  }
})

const currentShipPositionStyle = computed(() => {
  if (!diaryForm.value.arrivalTime || !diaryForm.value.departureTime) return { left: '0%' }
  
  const now = new Date()
  const start = new Date(diaryForm.value.departureTime)
  const arrival = new Date(diaryForm.value.arrivalTime)
  
  const totalDuration = arrival.getTime() - start.getTime()
  if (totalDuration <= 0) return { left: '0%' }
  
  const elapsed = now.getTime() - start.getTime()
  let percentage = (elapsed / totalDuration) * 100
  
  if (percentage < 0) percentage = 0
  if (percentage > 100) percentage = 100
  
  return { left: percentage + '%' }
})

const progressBarClass = computed(() => {
  const progress = calculateProgress(diaryForm.value.departureTime, diaryForm.value.arrivalTime)
  const dynamicStatus = diaryForm.value.dynamicStatus
  
  if (dynamicStatus === '靠泊中' || dynamicStatus === '锚泊中' || dynamicStatus === '在港' || dynamicStatus === '修船') {
    return 'at-port'
  }
  
  if (diaryForm.value.isWarZone || diaryForm.value.isFreePortZone) {
    return 'danger-zone'
  }
  
  if (progress === 0) return 'pending'
  if (progress >= 100) return 'completed'
  return 'sailing'
})

// 拖动调整宽度
const startResize = (e: MouseEvent) => {
  e.preventDefault()
  if (!contentAreaRef.value) return
  
  const startX = e.clientX
  const containerWidth = contentAreaRef.value.offsetWidth
  const startCalendarFlex = calendarFlex.value
  const startScheduleFlex = scheduleFlex.value
  const totalFlex = startCalendarFlex + startScheduleFlex
  
  const handleMouseMove = (e: MouseEvent) => {
    const diff = e.clientX - startX
    const percentage = diff / containerWidth
    
    const flexChange = percentage * totalFlex * 2
    
    let newCalendarFlex = startCalendarFlex + flexChange
    let newScheduleFlex = startScheduleFlex - flexChange
    
    const minFlex = 0.3
    const maxFlex = totalFlex - minFlex
    
    newCalendarFlex = Math.max(minFlex, Math.min(maxFlex, newCalendarFlex))
    newScheduleFlex = totalFlex - newCalendarFlex
    
    calendarFlex.value = newCalendarFlex
    scheduleFlex.value = newScheduleFlex
  }
  
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    localStorage.setItem('scheduleLayoutRatio', JSON.stringify({
      calendar: calendarFlex.value,
      schedule: scheduleFlex.value
    }))
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const openTaskDialog = (task: any) => {
  currentTask.value = task
  taskDialogVisible.value = true
}

const openAddTaskDialog = () => {
  newTask.value = {
    type: 'personal',
    title: '',
    description: '',
    dueDate: '',
    shipId: undefined,
    content: '',
  }
  addTaskDialogVisible.value = true
}

const onTaskContextMenu = (e: MouseEvent, task: any) => {
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    task,
  }
  document.addEventListener('click', closeContextMenu)
}

const closeContextMenu = () => {
  contextMenu.value.visible = false
  document.removeEventListener('click', closeContextMenu)
}

const togglePin = async (task: any) => {
  closeContextMenu()
  try {
    await api.tasks.update(task.id, { isPinned: !task.isPinned })
    task.isPinned = !task.isPinned
    ElMessage.success(task.isPinned ? '已置顶' : '已取消置顶')
  } catch {
    ElMessage.error('操作失败')
  }
}

const toggleComplete = async (task: any) => {
  closeContextMenu()
  try {
    await api.tasks.update(task.id, { isCompleted: !task.isCompleted })
    task.isCompleted = !task.isCompleted
    ElMessage.success(task.isCompleted ? '已标记完成' : '已标记未完成')
  } catch {
    ElMessage.error('操作失败')
  }
}

const dismissTask = async (task: any) => {
  closeContextMenu()
  try {
    await api.tasks.update(task.id, { isDismissed: true })
    task.isDismissed = true
    ElMessage.success('已移除显示')
  } catch {
    ElMessage.error('操作失败')
  }
}

const confirmAddTask = async () => {
  try {
    if (newTask.value.type === 'personal') {
      await api.tasks.create({
        title: newTask.value.title,
        description: newTask.value.description,
        dueDate: newTask.value.dueDate,
        type: 'personal',
      })
    } else {
      await api.tasks.create({
        title: newTask.value.content.substring(0, 50),
        content: newTask.value.content,
        shipId: newTask.value.shipId,
        dueDate: newTask.value.dueDate,
        type: 'ship',
      })
    }
    ElMessage.success('任务添加成功')
    addTaskDialogVisible.value = false
    loadTasks()
  } catch (error: any) {
    ElMessage.error('添加失败: ' + (error.message || '未知错误'))
  }
}

onMounted(() => {
  loadData()
  loadSchedules()
  loadWeekStartDay()
  loadBirthdays()
  loadPorts()
  loadShips()
  loadTasks()
  
  const savedLayout = localStorage.getItem('scheduleLayoutRatio')
  if (savedLayout) {
    try {
      const { calendar, schedule } = JSON.parse(savedLayout)
      calendarFlex.value = calendar
      scheduleFlex.value = schedule
    } catch {
      // 解析失败，使用默认值
    }
  }
})
</script>

<style scoped>
.schedule-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 56px);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 56px);
  overflow: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  color: #1a1a1a;
  font-weight: 600;
}

.page-subtitle {
  margin: 0;
  color: #8c8c8c;
  font-size: 13px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.header-extra-fields {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 12px;
  border-right: 1px solid #e0e0e0;
}

.header-switch-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-switch-group label {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
}

.view-switcher {
  flex-shrink: 0;
}

.week-start-select {
  width: 100px;
}

.content-area {
  display: flex;
  gap: 0;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 1024px) {
  .content-area {
    flex-direction: column;
  }
}

.calendar-section {
  background: white;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  padding: 16px;
  overflow: hidden;
}

.calendar-section :deep(.el-calendar) {
  height: 100%;
}

.calendar-section :deep(.el-calendar__body) {
  padding: 0;
}

.calendar-section :deep(.el-calendar-table) {
  height: 100%;
}

.calendar-section :deep(.el-calendar-table__row) {
  height: calc((100vh - 320px) / 6);
  min-height: 80px;
}

.calendar-section :deep(.el-calendar-table td) {
  border: none;
  border-bottom: 1px solid #f0f0f0;
  border-right: 1px solid #f0f0f0;
  padding: 6px;
  vertical-align: top;
}

.calendar-section :deep(.el-calendar-table td.is-today) {
  background-color: transparent;
}

.calendar-section :deep(.el-calendar-table td.is-selected) {
  background-color: #e8f4ff;
}

/* 日历头部底色 */
.calendar-section :deep(.el-calendar-table thead th) {
  background-color: #f0f5ff;
  color: #409eff;
  font-weight: 600;
  padding: 8px 0;
  border-bottom: 2px solid #409eff;
}

.calendar-header-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.calendar-nav-btns {
  margin-left: auto;
}

.calendar-day {
  height: 100%;
  min-height: 80px;
  padding: 4px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.calendar-day:hover {
  background-color: #f5f7fa;
}

.calendar-day.is-today {
  background-color: #e8f4ff;
}

.calendar-day.is-today .day-number {
  color: #409eff;
  font-weight: 700;
}

.calendar-day.is-selected {
  background-color: #d9ecff;
}

.calendar-day.has-schedules {
  background-color: #fafafa;
}

.day-number {
  font-size: 18px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.lunar-holiday {
  font-size: 11px;
  color: #f56c6c;
  font-weight: 500;
  padding: 1px 4px;
  background: #fef0f0;
  border-radius: 4px;
}

.day-schedules {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

/* 生日提醒样式 */
.birthday-dot {
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
  cursor: pointer;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 2px;
}

.birthday-dot:hover {
  opacity: 0.8;
}

.birthday-icon {
  font-size: 10px;
  flex-shrink: 0;
}

.birthday-text {
  display: block;
  font-size: 11px;
}

/* 公历生日 - 金色主题（发钱） */
.birthday-solar {
  background-color: #fff7e6;
  border-left: 2px solid #faad14;
  color: #d46b08;
}

/* 农历生日 - 粉色主题（慰问一碗面） */
.birthday-lunar {
  background-color: #fff0f6;
  border-left: 2px solid #eb2f96;
  color: #c41d7f;
}

.calendar-day.has-birthdays {
  background-color: #fffbf0;
}

.schedule-dot {
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
  cursor: pointer;
  line-height: 1.4;
}

.schedule-dot:hover {
  opacity: 0.8;
}

.schedule-text {
  display: block;
  font-size: 11px;
  color: #606266;
}

.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.more-indicator {
  font-size: 10px;
  color: #909399;
  text-align: center;
}

.priority-urgent-important {
  background-color: #fef0f0;
  border-left: 2px solid #f56c6c;
}

.priority-important {
  background-color: #fdf6ec;
  border-left: 2px solid #e6a23c;
}

.priority-urgent {
  background-color: #ecf5ff;
  border-left: 2px solid #409eff;
}

.priority-normal {
  background-color: #f0f9eb;
  border-left: 2px solid #67c23a;
}

.priority-low {
  background-color: #f4f4f5;
  border-left: 2px solid #909399;
}

/* 周视图 */
.week-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.week-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.week-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  flex: 1;
  min-height: calc(100vh - 340px);
}

.week-day-column {
  padding: 8px;
  background: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.week-day-column:hover {
  background: #f0f5ff;
}

.week-day-column.is-today {
  background: #e8f4ff;
}

.week-day-column.is-today:hover {
  background: #d6ecff;
}

.week-day-column.is-selected {
  background: #d9ecff;
}

.week-day-column.is-selected:hover {
  background: #c8e0ff;
}

.week-day-header {
  text-align: center;
  margin-bottom: 8px;
}

.week-day-name {
  font-size: 12px;
  color: #909399;
}

.week-day-num {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-left: 4px;
}

.week-day-events {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.week-event {
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.week-event:hover {
  opacity: 0.8;
}

/* 周视图生日事件 */
.birthday-event {
  font-weight: 500;
}

.birthday-solar-event {
  background-color: #fff7e6;
  border-left: 3px solid #faad14;
  color: #d46b08;
}

.birthday-lunar-event {
  background-color: #fff0f6;
  border-left: 3px solid #eb2f96;
  color: #c41d7f;
}

/* 日视图 */
.day-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.day-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.day-timeline {
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 340px);
}

.timeline-hour {
  display: flex;
  border-bottom: 1px solid #f5f5f5;
  min-height: 50px;
  transition: background 0.15s;
  cursor: pointer;
}

.timeline-hour:hover {
  background: #f8faff;
}

.timeline-hour:active {
  background: #e8f4ff;
}

.hour-label {
  width: 60px;
  padding: 8px;
  font-size: 12px;
  color: #909399;
  text-align: right;
  flex-shrink: 0;
}

.hour-content {
  flex: 1;
  padding: 4px 8px;
  border-left: 1px solid #f0f0f0;
}

.timeline-event {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 2px;
  cursor: pointer;
}

.timeline-event:hover {
  opacity: 0.8;
}

.schedule-list-section {
  background: white;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.list-title {
  margin: 0;
  font-size: 16px;
  color: #1a1a1a;
  font-weight: 600;
}

.schedule-count {
  font-size: 13px;
  color: #909399;
}

.schedule-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

/* 生日提醒区 */
.birthday-section {
  margin-bottom: 12px;
}

.birthday-section-header {
  padding: 8px 12px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #fff7e6, #fff0f6);
  border-radius: 8px;
  border: 1px dashed #faad14;
}

.birthday-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #d46b08;
}

/* 生日列表项 */
.birthday-item {
  cursor: pointer;
  border-radius: 8px;
}

.birthday-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.birthday-type-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.badge-solar {
  background: #faad14;
  color: #fff;
}

.badge-lunar {
  background: #eb2f96;
  color: #fff;
}

.birthday-solar-item {
  background: #fff7e6;
  border: 1px solid #ffd666;
}

.birthday-lunar-item {
  background: #fff0f6;
  border: 1px solid #ff85c0;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.schedule-item {
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fafafa;
}

.schedule-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.schedule-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.schedule-title {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.schedule-item:hover .schedule-actions {
  opacity: 1;
}

.schedule-item-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.schedule-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.schedule-detail {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.schedule-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.glass-card {
  backdrop-filter: blur(10px);
}

@media (max-width: 768px) {
  .schedule-page {
    padding: 12px;
  }

  .content-area {
    gap: 12px;
  }

  .page-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .header-right {
    width: 100%;
    flex-wrap: wrap;
  }

  .schedule-list-section {
    max-height: 50vh;
  }

  /* 移动端日历格子优化 */
  .calendar-section :deep(.el-calendar-table__row) {
    height: auto !important;
    min-height: 60px !important;
  }

  .calendar-section :deep(.el-calendar-table td) {
    padding: 4px !important;
  }

  .calendar-day {
    min-height: 60px !important;
  }

  .day-number {
    font-size: 14px !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    align-items: center !important;
    gap: 2px !important;
  }

  .lunar-holiday {
    font-size: 9px !important;
    padding: 1px 3px !important;
    white-space: nowrap !important;
    max-width: 50px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .day-schedules {
    gap: 1px !important;
  }

  .birthday-dot,
  .schedule-dot {
    font-size: 10px !important;
    padding: 1px 2px !important;
  }

  .birthday-text,
  .schedule-text {
    font-size: 10px !important;
  }
}

/* 日记面板样式 */
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

.relation-section {
  margin-bottom: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.relation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.empty-text-small {
  font-size: 13px;
  color: #909399;
  text-align: center;
  padding: 8px;
}

.relation-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.relation-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.relation-item:hover {
  border-color: #409eff;
}

.relation-item.is-selected {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.check-icon {
  font-size: 12px;
  font-weight: bold;
}

.relation-text {
  color: #606266;
}

.relation-summary {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.env-info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}

.env-info-item {
  flex: 1;
  min-width: 150px;
}

.env-info-item label {
  display: block;
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
}

.diary-editor {
  margin-bottom: 16px;
}

.diary-editor .el-textarea__inner {
  border-radius: 8px;
}

.diary-actions {
  display: flex;
  justify-content: flex-end;
}

/* 重点任务样式 */
.focus-tasks-section {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.card-header-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.diary-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.diary-item {
  padding: 10px;
  background: #fafafa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.diary-item:hover {
  background: #f0f5ff;
}

.diary-item.is-completed {
  opacity: 0.6;
  text-decoration: line-through;
}

.diary-item.is-pinned {
  background: #fffbe6;
  border-left: 3px solid #faad14;
}

.pin-icon {
  font-size: 14px;
  margin-right: 8px;
}

.task-content {
  display: flex;
  flex-direction: column;
}

.diary-date {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.diary-preview {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.empty-text {
  text-align: center;
  color: #909399;
  font-size: 13px;
  padding: 20px;
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

.ship-select {
  width: 140px;
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
  display: block;
  font-size: 12px;
  color: #606266;
  margin-bottom: 4px;
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

/* 任务右键菜单 */
.task-context-menu {
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

.menu-item.danger {
  color: #f56c6c;
}

.menu-icon {
  font-size: 12px;
}

.menu-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0;
}

/* 任务详情 */
.task-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-detail-date {
  font-size: 13px;
  color: #909399;
}

.task-items {
  max-height: 300px;
  overflow-y: auto;
}

.task-item-row {
  display: flex;
  gap: 8px;
  padding: 6px 0;
}

.task-item-index {
  font-weight: 600;
  color: #409eff;
}

.task-item-text {
  color: #303133;
}

.task-detail-footer {
  font-size: 12px;
  color: #909399;
}

.add-task-form {
  padding: 8px;
}



/* 船舶信息栏 */
.ship-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  margin-bottom: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  flex-wrap: wrap;
}

.info-left, .info-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.ship-info-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ship-info-icon {
  font-size: 16px;
}

.ship-info-label {
  font-size: 12px;
  color: #909399;
}

.ship-info-value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.ship-info-divider {
  width: 1px;
  height: 16px;
  background: #e0e0e0;
}

.ship-info-arrow {
  font-size: 16px;
  color: #409eff;
  font-weight: bold;
}

/* 拖动分隔条 */
.resize-handle {
  width: 6px;
  cursor: col-resize;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.resize-handle:hover {
  background: #409eff;
}

.resize-handle:active {
  background: #409eff;
}

.resize-icon {
  font-size: 12px;
  color: #909399;
  letter-spacing: -1px;
  user-select: none;
}

.resize-handle:hover .resize-icon,
.resize-handle:active .resize-icon {
  color: white;
}

/* 折叠面板 */
.collapse-panel {
  margin-top: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
}

.collapse-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.collapse-header:hover {
  background-color: #f0f0f0;
}

.collapse-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.collapse-icon {
  font-size: 16px;
}

.collapse-arrow {
  font-size: 14px;
  color: #909399;
  transition: transform 0.3s ease;
}

.collapse-arrow.expanded {
  transform: rotate(180deg);
}

.collapse-count {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
  font-weight: normal;
}

/* 航海日记表单栏 */
.diary-form-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.form-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-label {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
}

.form-group .el-select,
.form-group .el-time-select {
  width: 100%;
}

/* 航程时间进度条 */
.voyage-progress-bar {
  margin-bottom: 16px;
  padding: 16px 20px 32px;
  border-radius: 8px;
  border: 1px solid;
  background: #ecf5ff;
  border-color: #b3d8ff;
  width: 100%;
  box-sizing: border-box;
}

.voyage-progress-bar.pending {
  background: #f5f5f5;
  border-color: #d9d9d9;
}

.voyage-progress-bar.sailing {
  background: #ecf5ff;
  border-color: #b3d8ff;
}

.voyage-progress-bar.danger-zone {
  background: #fff7e6;
  border-color: #ffd591;
}

.voyage-progress-bar.at-port {
  background: #f0f9eb;
  border-color: #b7eb8f;
}

.voyage-progress-bar.completed {
  background: #f0f9eb;
  border-color: #b7eb8f;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.progress-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.progress-duration {
  font-size: 13px;
  color: #409eff;
  font-weight: 500;
}

.progress-warning {
  font-size: 12px;
  color: #f56c6c;
  font-weight: 500;
}

.progress-track {
  position: relative;
  height: 10px;
  background: #d9ecff;
  border-radius: 5px;
  overflow: visible;
}

.voyage-progress-bar.pending .progress-track {
  background: #d9d9d9;
}

.voyage-progress-bar.sailing .progress-track {
  background: #d9ecff;
}

.voyage-progress-bar.danger-zone .progress-track {
  background: #ffe58f;
}

.voyage-progress-bar.at-port .progress-track {
  background: #d9f7be;
}

.voyage-progress-bar.completed .progress-track {
  background: #d9f7be;
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: #409eff;
  border-radius: 5px;
  z-index: 1;
}

.voyage-progress-bar.pending .progress-fill {
  background: #909399;
}

.voyage-progress-bar.sailing .progress-fill {
  background: #409eff;
}

.voyage-progress-bar.danger-zone .progress-fill {
  background: #e6a23c;
}

.voyage-progress-bar.at-port .progress-fill {
  background: #67c23a;
}

.voyage-progress-bar.completed .progress-fill {
  background: #67c23a;
}

.progress-last-three {
  position: absolute;
  top: 0;
  height: 100%;
  background: #f56c6c;
  border-radius: 0 5px 5px 0;
  z-index: 2;
  opacity: 0.8;
}

.progress-current-ship {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
}

.ship-icon {
  font-size: 20px;
  position: relative;
  top: -2px;
}

.progress-label {
  position: absolute;
  top: 14px;
  font-size: 11px;
  color: #606266;
  white-space: nowrap;
}

.progress-label.departure {
  left: 0;
  transform: translateX(-50%);
}

.progress-label.arrival {
  right: 0;
  transform: translateX(50%);
}

.collapse-content {
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 步骤式面板 */
.steps-panel {
  margin-top: 16px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.steps-header {
  display: flex;
  align-items: center;
  padding: 0;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.step-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.step-item:hover {
  background: #f0f0f0;
}

.step-item.active {
  background: white;
  border-bottom-color: #409eff;
}

.step-item.active .step-number {
  background: #409eff;
  color: white;
}

.step-item.completed .step-number {
  background: #67c23a;
  color: white;
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #dcdfe6;
  color: #606266;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
}

.step-label {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.step-item.active .step-label {
  color: #409eff;
}

.step-divider {
  width: 1px;
  height: 24px;
  background: #dcdfe6;
}

.step-content {
  padding: 16px;
}

.step-content.diary-step {
  padding-top: 12px;
}

/* 步骤内容区域 */
.step-content .info-bar {
  margin-bottom: 12px;
}

.step-content .relation-section {
  margin-bottom: 12px;
}

.step-content .diary-editor {
  margin-bottom: 12px;
}

.step-content .diary-actions {
  display: flex;
  justify-content: flex-end;
}

</style>
