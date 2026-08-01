<template>
  <div class="quiz-root">
    <!-- 未开始：首页 -->
    <div v-if="!sessionActive && !showSummary" class="quiz-home">
      <div class="home-card">
        <div class="home-logo">🚢</div>
        <h1 class="home-title">船名达人</h1>
        <p class="home-subtitle">船舶知识记忆训练 · 间隔重复学习</p>

        <!-- 统计面板 -->
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ stats.totalPoints }}</div>
            <div class="stat-label">累计积分</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ stats.currentStreak }}</div>
            <div class="stat-label">连续打卡</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ dueCount }}</div>
            <div class="stat-label">待复习</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" :class="{ 'weak-num': weakCount > 0 }">{{ weakCount }}</div>
            <div class="stat-label">薄弱卡</div>
          </div>
        </div>

        <!-- 题型说明 -->
        <div class="topic-list">
          <div class="topic-item">海务主管</div>
          <div class="topic-item">机务主管</div>
          <div class="topic-item">派员公司</div>
          <div class="topic-item">船旗国</div>
          <div class="topic-item">现任政委</div>
        </div>

        <button class="start-btn" @click="onStart">
          {{ dueCount > 0 ? `开始复习（${dueCount}张到期）` : '开始训练' }}
        </button>

        <div class="exit-link">
          <NuxtLink to="/">← 返回主页</NuxtLink>
        </div>
      </div>
    </div>

    <!-- 训练中 -->
    <div v-else-if="sessionActive && currentQuestion && !showSummary" class="quiz-training">
      <!-- 顶部栏 -->
      <div class="quiz-topbar">
        <div class="topbar-left">
          <span class="topbar-stat">积分 {{ sessionPoints }}</span>
          <span class="topbar-stat" v-if="sessionCombo >= 3">连击 x{{ sessionCombo }}</span>
        </div>
        <div class="topbar-center">
          {{ sessionCorrect + sessionWrong + 1 }} / {{ sessionQuestions.length + requeueBuffer.length }}
        </div>
        <div class="topbar-right">
          <button class="exit-btn" @click="onExit">退出</button>
        </div>
      </div>

      <!-- 进度条 -->
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${((sessionCorrect + sessionWrong) / Math.max(sessionQuestions.length, 1)) * 100}%` }"
        ></div>
      </div>

      <!-- 题目卡片 -->
      <div class="question-card" :class="{
        'q-correct': lastResult === 'correct',
        'q-wrong': lastResult === 'wrong',
      }">
        <div class="question-text">{{ currentQuestion.questionText }}</div>
        <div class="ship-name">🚢 {{ currentQuestion.shipName }}</div>

        <!-- 四选一 -->
        <div class="options-grid">
          <button
            v-for="(opt, i) in currentQuestion.options"
            :key="i"
            class="option-btn"
            :class="getOptionClass(opt)"
            :disabled="answered"
            @click="answer(opt)"
          >
            <span class="option-label">{{ ['A', 'B', 'C', 'D'][i] }}</span>
            <span class="option-text">{{ opt }}</span>
          </button>
        </div>

        <!-- 答错时显示正确答案 -->
        <transition name="fade">
          <div v-if="answered && lastResult === 'wrong'" class="correct-answer-hint">
            正确答案：<b>{{ currentQuestion.correctAnswer }}</b>
          </div>
        </transition>

        <!-- 答对/答错图标 -->
        <transition name="pop">
          <div v-if="answered" class="result-icon">
            {{ lastResult === 'correct' ? '✅' : '❌' }}
          </div>
        </transition>
      </div>

      <!-- 积分浮动 -->
      <transition name="float-up">
        <div v-if="answered && lastResult === 'correct'" class="points-float">
          +{{ lastPointsEarned }}
        </div>
      </transition>

      <!-- 下一题按钮 -->
      <div class="next-area">
        <button v-if="answered" class="next-btn" @click="next">
          {{ sessionIndex + 1 >= sessionQuestions.length && requeueBuffer.length === 0 ? '查看结果' : '下一题 →' }}
        </button>
      </div>
    </div>

    <!-- 训练结果 -->
    <div v-else-if="showSummary" class="quiz-summary">
      <div class="summary-card">
        <div class="summary-icon">🎉</div>
        <h2>训练完成</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-value">{{ sessionCorrect }}</div>
            <div class="summary-label">答对</div>
          </div>
          <div class="summary-item">
            <div class="summary-value wrong">{{ sessionWrong }}</div>
            <div class="summary-label">答错</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">{{ sessionMaxCombo }}</div>
            <div class="summary-label">最高连击</div>
          </div>
          <div class="summary-item">
            <div class="summary-value points">+{{ sessionPoints }}</div>
            <div class="summary-label">获得积分</div>
          </div>
        </div>
        <div class="summary-total">累计总积分：{{ stats.totalPoints }}</div>
        <div class="summary-actions">
          <button class="again-btn" @click="onRestart">再来一轮</button>
          <button class="home-btn" @click="onHome">返回首页</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useShipQuiz } from '~/composables/useShipQuiz'

definePageMeta({
  layout: false,
  middleware: ['auth'],
})

const {
  stats,
  dueCount,
  weakCount,
  sessionActive,
  sessionQuestions,
  sessionIndex,
  sessionCorrect,
  sessionWrong,
  sessionPoints,
  sessionCombo,
  sessionMaxCombo,
  currentQuestion,
  currentAnswer,
  answered,
  lastResult,
  isFinished,
  requeueBuffer,
  init,
  startSession,
  answer,
  next,
  endSession,
} = useShipQuiz()

const showSummary = ref(false)
const lastPointsEarned = ref(0)

// 监听积分变化
watch(sessionPoints, (newVal, oldVal) => {
  if (newVal > oldVal) {
    lastPointsEarned.value = newVal - oldVal
  }
})

onMounted(async () => {
  await init()
})

function onStart() {
  showSummary.value = false
  startSession(20)
}

function onExit() {
  endSession().then(() => {
    showSummary.value = true
    sessionActive.value = false
  })
}

function onRestart() {
  showSummary.value = false
  startSession(20)
}

function onHome() {
  showSummary.value = false
  navigateTo('/')
}

// 自动进入结果页
watch(isFinished, (v) => {
  if (v && sessionActive.value) {
    endSession().then(() => {
      showSummary.value = true
      sessionActive.value = false
    })
  }
})

function getOptionClass(opt: string): string {
  if (!answered.value || !currentQuestion.value) return ''
  if (opt === currentQuestion.value.correctAnswer) return 'opt-correct'
  if (opt === currentAnswer.value && opt !== currentQuestion.value.correctAnswer) return 'opt-wrong'
  return 'opt-dim'
}
</script>

<style scoped>
.quiz-root {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ===== 首页 ===== */
.quiz-home {
  width: 100%;
  max-width: 480px;
  padding: 24px;
}

.home-card {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 20px;
  padding: 40px 28px;
  text-align: center;
  backdrop-filter: blur(10px);
}

.home-logo {
  font-size: 56px;
  margin-bottom: 12px;
}

.home-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 4px 0;
  background: linear-gradient(135deg, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.home-subtitle {
  color: #94a3b8;
  font-size: 13px;
  margin: 0 0 28px 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 24px;
}

.stat-item {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 10px;
  padding: 12px 4px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #38bdf8;
}

.stat-value.weak-num {
  color: #f87171;
}

.stat-label {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.topic-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  margin-bottom: 28px;
}

.topic-item {
  font-size: 12px;
  padding: 4px 12px;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 20px;
  color: #7dd3fc;
}

.start-btn {
  width: 100%;
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  background: linear-gradient(135deg, #38bdf8, #818cf8);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(56, 189, 248, 0.3);
}

.exit-link {
  margin-top: 16px;
}

.exit-link a {
  color: #64748b;
  font-size: 13px;
  text-decoration: none;
}

.exit-link a:hover {
  color: #94a3b8;
}

/* ===== 训练中 ===== */
.quiz-training {
  width: 100%;
  max-width: 600px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.quiz-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  margin-bottom: 4px;
}

.topbar-left {
  display: flex;
  gap: 8px;
}

.topbar-stat {
  font-size: 13px;
  color: #94a3b8;
  background: rgba(30, 41, 59, 0.6);
  padding: 4px 10px;
  border-radius: 8px;
}

.topbar-center {
  font-size: 14px;
  color: #cbd5e1;
  font-weight: 600;
}

.exit-btn {
  padding: 6px 16px;
  font-size: 13px;
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.exit-btn:hover {
  background: rgba(248, 113, 113, 0.2);
}

.progress-bar {
  height: 4px;
  background: rgba(30, 41, 59, 0.6);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 32px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  transition: width 0.3s ease;
  border-radius: 2px;
}

.question-card {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 16px;
  padding: 32px 24px;
  position: relative;
  transition: border-color 0.3s;
}

.question-card.q-correct {
  border-color: rgba(34, 197, 94, 0.5);
}

.question-card.q-wrong {
  border-color: rgba(248, 113, 113, 0.5);
}

.question-text {
  font-size: 15px;
  color: #94a3b8;
  text-align: center;
  margin-bottom: 8px;
}

.ship-name {
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 28px;
  color: #f1f5f9;
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
  color: #e2e8f0;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.option-btn:not(:disabled):hover {
  background: rgba(56, 189, 248, 0.1);
  border-color: rgba(56, 189, 248, 0.4);
  transform: translateY(-1px);
}

.option-btn:disabled {
  cursor: default;
}

.option-label {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.15);
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  color: #94a3b8;
}

.option-btn.opt-correct {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.5);
}

.option-btn.opt-correct .option-label {
  background: #22c55e;
  color: #fff;
}

.option-btn.opt-wrong {
  background: rgba(248, 113, 113, 0.15);
  border-color: rgba(248, 113, 113, 0.5);
}

.option-btn.opt-wrong .option-label {
  background: #f87171;
  color: #fff;
}

.option-btn.opt-dim {
  opacity: 0.4;
}

.correct-answer-hint {
  margin-top: 16px;
  padding: 10px 14px;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 8px;
  font-size: 14px;
  color: #86efac;
  text-align: center;
}

.correct-answer-hint b {
  color: #4ade80;
}

.result-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 64px;
  pointer-events: none;
  z-index: 10;
}

.points-float {
  position: fixed;
  top: 40%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 24px;
  font-weight: 700;
  color: #fbbf24;
  pointer-events: none;
  z-index: 20;
}

.next-area {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.next-btn {
  padding: 12px 36px;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  background: #38bdf8;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.next-btn:hover {
  background: #7dd3fc;
  transform: translateY(-1px);
}

/* ===== 结果页 ===== */
.quiz-summary {
  width: 100%;
  max-width: 420px;
  padding: 24px;
}

.summary-card {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 20px;
  padding: 36px 28px;
  text-align: center;
  backdrop-filter: blur(10px);
}

.summary-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.summary-card h2 {
  font-size: 24px;
  margin: 0 0 24px 0;
  color: #f1f5f9;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.summary-item {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 10px;
  padding: 16px;
}

.summary-value {
  font-size: 28px;
  font-weight: 700;
  color: #4ade80;
}

.summary-value.wrong {
  color: #f87171;
}

.summary-value.points {
  color: #fbbf24;
}

.summary-label {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.summary-total {
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 24px;
}

.summary-actions {
  display: flex;
  gap: 10px;
}

.again-btn {
  flex: 1;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  background: #38bdf8;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.again-btn:hover {
  background: #7dd3fc;
}

.home-btn {
  flex: 1;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #cbd5e1;
  background: rgba(148, 163, 184, 0.1);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.home-btn:hover {
  background: rgba(148, 163, 184, 0.2);
}

/* ===== 动画 ===== */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.pop-enter-active {
  animation: pop 0.3s ease;
}
@keyframes pop {
  0% { transform: translate(-50%, -50%) scale(0); }
  50% { transform: translate(-50%, -50%) scale(1.2); }
  100% { transform: translate(-50%, -50%) scale(1); }
}

.float-up-enter-active {
  animation: floatUp 1.2s ease forwards;
}
@keyframes floatUp {
  0% { opacity: 0; transform: translate(-50%, 0); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -60px); }
}

/* 移动端适配 */
@media (max-width: 480px) {
  .options-grid {
    grid-template-columns: 1fr;
  }
  .ship-name {
    font-size: 26px;
  }
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
