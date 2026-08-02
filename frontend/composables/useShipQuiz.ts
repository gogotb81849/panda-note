import { ref, computed } from 'vue'
import type { Ship } from '~/types'
import { useApi } from '~/composables/useApi'

// ====== 类型定义 ======
type QuestionType = 'marine' | 'engineer' | 'company' | 'flag' | 'political'

interface ShipKnowledgeCard {
  cardId: string
  shipId: number
  questionType: QuestionType
  ef: number
  interval: number
  repetition: number
  dueDate: number
  lapses: number
  lastReview: number
  createdAt: number
}

interface TrainingStats {
  totalPoints: number
  currentStreak: number
  longestStreak: number
  lastTrainDate: string
  bestSessionPoints: number
}

interface QuizQuestion {
  cardId: string
  shipId: number
  shipName: string
  questionType: QuestionType
  questionText: string
  correctAnswer: string
  options: string[]
}

// ====== 题型配置 ======
const QUESTION_CONFIG: Record<QuestionType, { text: string; field: keyof Ship }> = {
  marine: { text: '这艘船的海务主管是谁？', field: 'marineSupervisor' },
  engineer: { text: '这艘船的机务主管是谁？', field: 'engineerSupervisor' },
  company: { text: '这艘船的派员公司是哪家？', field: 'sendCompany' },
  flag: { text: '这艘船的船旗国是哪里？', field: 'flagCountry' },
  political: { text: '这艘船的政委是谁？', field: 'politicalInstructor' },
}

const QUESTION_TYPES = Object.keys(QUESTION_CONFIG) as QuestionType[]

const DAY_MS = 1000 * 60 * 60 * 24

// ====== 独立 IndexedDB（不干扰主库） ======
const QUIZ_DB_NAME = 'ShipQuizDB'
const QUIZ_DB_VERSION = 1
const STORE_CARDS = 'cards'
const STORE_STATS = 'stats'

let quizDb: IDBDatabase | null = null

async function openQuizDB(): Promise<IDBDatabase> {
  if (quizDb) return quizDb
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUIZ_DB_NAME, QUIZ_DB_VERSION)
    req.onerror = () => reject(new Error('Quiz IndexedDB 打开失败'))
    req.onsuccess = () => {
      quizDb = req.result
      resolve(quizDb)
    }
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_CARDS)) {
        const s = db.createObjectStore(STORE_CARDS, { keyPath: 'cardId' })
        s.createIndex('dueDate', 'dueDate', { unique: false })
        s.createIndex('shipId', 'shipId', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_STATS)) {
        db.createObjectStore(STORE_STATS, { keyPath: 'key' })
      }
    }
  })
}

async function dbGetAll<T>(store: string): Promise<T[]> {
  const db = await openQuizDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([store], 'readonly')
    const req = tx.objectStore(store).getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(new Error(`读取 ${store} 失败`))
  })
}

async function dbPut<T>(store: string, data: T): Promise<void> {
  const db = await openQuizDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([store], 'readwrite')
    tx.objectStore(store).put(data)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(new Error(`写入 ${store} 失败`))
  })
}

async function dbGet<T>(store: string, key: string): Promise<T | null> {
  const db = await openQuizDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([store], 'readonly')
    const req = tx.objectStore(store).get(key)
    req.onsuccess = () => resolve((req.result as T) || null)
    req.onerror = () => reject(new Error(`读取 ${store} 失败`))
  })
}

// ====== SM-2 算法 ======
function sm2Review(card: ShipKnowledgeCard, grade: 'again' | 'hard' | 'good' | 'easy'): ShipKnowledgeCard {
  const q = grade === 'again' ? 2 : grade === 'hard' ? 3 : grade === 'good' ? 4 : 5
  let { ef, interval, repetition, lapses } = card

  if (grade === 'again') {
    repetition = 0
    interval = 1
    lapses += 1
  } else {
    if (repetition === 0) interval = 1
    else if (repetition === 1) interval = 6
    else interval = Math.round(interval * ef)
    if (grade === 'easy') interval = Math.round(interval * 1.3)
    repetition += 1
  }

  // EF 更新
  ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  if (ef < 1.3) ef = 1.3

  const now = Date.now()
  return {
    ...card,
    ef: Math.round(ef * 100) / 100,
    interval,
    repetition,
    lapses,
    lastReview: now,
    dueDate: now + interval * DAY_MS,
  }
}

// ====== 干扰项生成 ======
function generateOptions(correctAnswer: string, pool: string[]): string[] {
  const distractors = pool
    .filter(v => v && v !== correctAnswer)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)

  // 如果干扰项不够 3 个，补充占位
  while (distractors.length < 3) {
    const fake = `选项${distractors.length + 1}`
    if (!distractors.includes(fake) && fake !== correctAnswer) {
      distractors.push(fake)
    } else {
      break
    }
  }

  return [...distractors, correctAnswer].sort(() => Math.random() - 0.5)
}

// ====== Composable ======
export function useShipQuiz() {
  const api = useApi()  // 在 setup 顶层调用，保持 Nuxt context 有效
  const ships = ref<Ship[]>([])
  const cards = ref<ShipKnowledgeCard[]>([])
  const stats = ref<TrainingStats>({
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastTrainDate: '',
    bestSessionPoints: 0,
  })

  // 当前训练会话状态
  const sessionActive = ref(false)
  const sessionQuestions = ref<QuizQuestion[]>([])
  const sessionIndex = ref(0)
  const sessionCorrect = ref(0)
  const sessionWrong = ref(0)
  const sessionPoints = ref(0)
  const sessionCombo = ref(0)
  const sessionMaxCombo = ref(0)
  const currentAnswer = ref<string | null>(null)
  const answered = ref(false)
  const lastResult = ref<'correct' | 'wrong' | null>(null)

  // 待重排的卡（答错后 10 分钟再出现）
  const requeueBuffer = ref<{ card: ShipKnowledgeCard; requeueAt: number }[]>([])

  // 用户选择的题型范围（默认全选）
  const selectedQuestionTypes = ref<QuestionType[]>([...QUESTION_TYPES])

  // 值池（从船舶数据提取，用于生成干扰项）
  const valuePools = computed<Record<QuestionType, string[]>>(() => {
    const pools: Record<QuestionType, string[]> = {
      marine: [],
      engineer: [],
      company: [],
      flag: [],
      political: [],
    }
    ships.value.forEach(s => {
      QUESTION_TYPES.forEach(qt => {
        const field = QUESTION_CONFIG[qt].field
        const val = s[field] as string
        if (val && !pools[qt].includes(val)) pools[qt].push(val)
      })
    })
    return pools
  })

  // 到期卡片数（仅统计当前选中题型）
  const dueCount = computed(() => {
    const now = Date.now()
    return cards.value.filter(c => c.dueDate <= now && selectedQuestionTypes.value.includes(c.questionType)).length
  })

  // 薄弱卡数（答错≥3次，仅统计当前选中题型）
  const weakCount = computed(() => cards.value.filter(c => c.lapses >= 3 && selectedQuestionTypes.value.includes(c.questionType)).length)

  // 初始化：加载船舶数据 + 卡片状态
  async function init() {
    try {
      // 加载船舶列表（useApi 已在 setup 顶层调用）
      ships.value = await api.ships.getAll() as Ship[]

      // 加载卡片状态
      await openQuizDB()
      cards.value = await dbGetAll<ShipKnowledgeCard>(STORE_CARDS)

      // 为每艘船的每种题型自动创建卡片（如果不存在）
      const existingIds = new Set(cards.value.map(c => c.cardId))
      const newCards: ShipKnowledgeCard[] = []
      const now = Date.now()
      ships.value.forEach(s => {
        QUESTION_TYPES.forEach(qt => {
          const field = QUESTION_CONFIG[qt].field
          const val = s[field] as string
          if (!val) return // 该字段为空，跳过
          const cardId = `${s.id}_${qt}`
          if (!existingIds.has(cardId)) {
            newCards.push({
              cardId,
              shipId: s.id,
              questionType: qt,
              ef: 2.5,
              interval: 0,
              repetition: 0,
              dueDate: now, // 新卡立即可学
              lapses: 0,
              lastReview: 0,
              createdAt: now,
            })
          }
        })
      })
      if (newCards.length > 0) {
        for (const c of newCards) await dbPut(STORE_CARDS, c)
        cards.value = [...cards.value, ...newCards]
      }

      // 加载统计
      const savedStats = await dbGet<TrainingStats & { key: string }>(STORE_STATS, 'stats')
      if (savedStats) {
        stats.value = {
          totalPoints: savedStats.totalPoints || 0,
          currentStreak: savedStats.currentStreak || 0,
          longestStreak: savedStats.longestStreak || 0,
          lastTrainDate: savedStats.lastTrainDate || '',
          bestSessionPoints: savedStats.bestSessionPoints || 0,
        }
      }
    } catch (e) {
      console.error('ShipQuiz 初始化失败', e)
    }
  }

  // 开始一轮训练
  function startSession(questionCount = 20) {
    const now = Date.now()
    const activeTypes = selectedQuestionTypes.value

    // 1. 优先到期卡片（仅限用户选择的题型）
    const dueCards = cards.value
      .filter(c => c.dueDate <= now && activeTypes.includes(c.questionType))
      .sort(() => Math.random() - 0.5)

    // 2. 补充新卡（从未学过的，仅限用户选择的题型）
    const newCards = cards.value
      .filter(c => c.lastReview === 0 && c.dueDate > now && activeTypes.includes(c.questionType))
      .sort(() => Math.random() - 0.5)

    // 3. 合并，取指定数量
    const selected = [...dueCards, ...newCards].slice(0, questionCount)

    if (selected.length === 0) {
      // 没有到期卡也没有新卡，随机取一些（仅限用户选择的题型）
      const all = cards.value
        .filter(c => activeTypes.includes(c.questionType))
        .sort(() => Math.random() - 0.5)
        .slice(0, questionCount)
      selected.push(...all)
    }

    // 生成题目
    sessionQuestions.value = selected.map(card => {
      const ship = ships.value.find(s => s.id === card.shipId)
      const field = QUESTION_CONFIG[card.questionType].field
      const correctAnswer = (ship?.[field] as string) || ''
      const pool = valuePools.value[card.questionType]
      return {
        cardId: card.cardId,
        shipId: card.shipId,
        shipName: ship?.cnShipName || '未知船舶',
        questionType: card.questionType,
        questionText: QUESTION_CONFIG[card.questionType].text,
        correctAnswer,
        options: generateOptions(correctAnswer, pool),
      }
    })

    sessionIndex.value = 0
    sessionCorrect.value = 0
    sessionWrong.value = 0
    sessionPoints.value = 0
    sessionCombo.value = 0
    sessionMaxCombo.value = 0
    currentAnswer.value = null
    answered.value = false
    lastResult.value = null
    requeueBuffer.value = []
    sessionActive.value = true
  }

  // 获取当前题目
  const currentQuestion = computed(() => {
    if (sessionIndex.value < sessionQuestions.value.length) {
      return sessionQuestions.value[sessionIndex.value]
    }
    // 检查重排队列
    const now = Date.now()
    const ready = requeueBuffer.value.find(r => r.requeueAt <= now)
    if (ready) {
      const ship = ships.value.find(s => s.id === ready.card.shipId)
      const field = QUESTION_CONFIG[ready.card.questionType].field
      const correctAnswer = (ship?.[field] as string) || ''
      const pool = valuePools.value[ready.card.questionType]
      return {
        cardId: ready.card.cardId,
        shipId: ready.card.shipId,
        shipName: ship?.cnShipName || '未知船舶',
        questionType: ready.card.questionType,
        questionText: QUESTION_CONFIG[ready.card.questionType].text,
        correctAnswer,
        options: generateOptions(correctAnswer, pool),
      }
    }
    return null
  })

  const isFinished = computed(() => !currentQuestion.value)

  // 回答
  async function answer(selectedOption: string) {
    if (answered.value || !currentQuestion.value) return

    currentAnswer.value = selectedOption
    answered.value = true

    const q = currentQuestion.value
    const isCorrect = selectedOption === q.correctAnswer

    if (isCorrect) {
      lastResult.value = 'correct'
      sessionCorrect.value++
      sessionCombo.value++
      sessionMaxCombo.value = Math.max(sessionMaxCombo.value, sessionCombo.value)

      // 积分
      let pts = 10
      if (sessionCombo.value > 0 && sessionCombo.value % 10 === 0) pts += 50
      else if (sessionCombo.value > 0 && sessionCombo.value % 5 === 0) pts += 20
      sessionPoints.value += pts
    } else {
      lastResult.value = 'wrong'
      sessionWrong.value++
      sessionCombo.value = 0
      sessionPoints.value = Math.max(0, sessionPoints.value - 2)
    }

    // 更新卡片状态（SM-2）
    const card = cards.value.find(c => c.cardId === q.cardId)
    if (card) {
      const grade = isCorrect ? 'good' : 'again'
      const updated = sm2Review(card, grade)
      await dbPut(STORE_CARDS, updated)
      const idx = cards.value.findIndex(c => c.cardId === card.cardId)
      if (idx >= 0) cards.value[idx] = updated

      // 答错：加入重排队列（10 分钟后再出现）
      if (!isCorrect) {
        const requeueIdx = requeueBuffer.value.findIndex(r => r.card.cardId === card.cardId)
        if (requeueIdx >= 0) {
          requeueBuffer.value[requeueIdx].card = updated
          requeueBuffer.value[requeueIdx].requeueAt = Date.now() + 10 * 1000 // 10 秒（演示用，实际可改 10 分钟）
        } else {
          requeueBuffer.value.push({
            card: updated,
            requeueAt: Date.now() + 10 * 1000,
          })
        }
      }
    }
  }

  // 下一题
  function next() {
    // 如果当前题来自重排队列，移除它
    const now = Date.now()
    const readyIdx = requeueBuffer.value.findIndex(r => r.requeueAt <= now)
    if (readyIdx >= 0 && sessionIndex.value >= sessionQuestions.value.length) {
      requeueBuffer.value.splice(readyIdx, 1)
    }

    if (sessionIndex.value < sessionQuestions.value.length) {
      sessionIndex.value++
    }

    currentAnswer.value = null
    answered.value = false
    lastResult.value = null
  }

  // 退出训练并保存统计
  async function endSession() {
    // 更新打卡连续天数
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10)

    if (stats.value.lastTrainDate === yesterday) {
      stats.value.currentStreak += 1
    } else if (stats.value.lastTrainDate !== today) {
      stats.value.currentStreak = 1
    } else if (stats.value.currentStreak === 0) {
      stats.value.currentStreak = 1
    }

    stats.value.longestStreak = Math.max(stats.value.longestStreak, stats.value.currentStreak)
    stats.value.lastTrainDate = today

    // 每日首次训练奖励
    const todayKey = new Date().toISOString().slice(0, 10)
    const lastDate = stats.value.lastTrainDate
    if (lastDate !== todayKey) {
      stats.value.totalPoints += 30
    }

    stats.value.totalPoints += sessionPoints.value
    stats.value.bestSessionPoints = Math.max(stats.value.bestSessionPoints, sessionPoints.value)

    await dbPut(STORE_STATS, { key: 'stats', ...stats.value })

    sessionActive.value = false
  }

  return {
    // 数据
    ships,
    cards,
    stats,
    dueCount,
    weakCount,
    valuePools,
    // 会话状态
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
    selectedQuestionTypes,
    // 方法
    init,
    startSession,
    answer,
    next,
    endSession,
  }
}
