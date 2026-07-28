<template>
  <el-dialog
    v-model="dialogVisible"
    title="会议录音"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="meeting-record-dialog">
      <!-- 录音标题输入 -->
      <div class="record-header">
        <el-input
          v-model="recordTitle"
          placeholder="请输入会议标题（可选）"
          size="large"
          clearable
        />
      </div>

      <!-- 波形显示区域 -->
      <div class="waveform-container">
        <canvas ref="waveformCanvas" class="waveform-canvas"></canvas>
        <div v-if="!isRecording && !audioBlob" class="waveform-placeholder">
          <el-icon :size="48" color="#c0c4cc"><Microphone /></el-icon>
          <p>点击下方按钮开始录音</p>
        </div>
      </div>

      <!-- 录音时长 -->
      <div class="record-timer">
        <span class="timer-display">{{ formatDuration(duration) }}</span>
        <span v-if="isRecording" class="recording-indicator">
          <span class="recording-dot"></span>
          录音中
        </span>
        <span v-else-if="isPaused" class="recording-indicator paused">
          <span class="recording-dot paused-dot"></span>
          已暂停
        </span>
      </div>

      <!-- 控制按钮 -->
      <div class="record-controls">
        <el-button
          v-if="!isRecording && !audioBlob"
          type="danger"
          size="large"
          circle
          @click="startRecording"
          title="开始录音"
        >
          <el-icon :size="24"><Microphone /></el-icon>
        </el-button>

        <template v-if="isRecording || isPaused">
          <el-button
            :type="isPaused ? 'warning' : 'primary'"
            size="large"
            circle
            @click="isPaused ? resumeRecording() : pauseRecording()"
            :title="isPaused ? '继续录音' : '暂停录音'"
          >
            <el-icon :size="24">
              <VideoPlay v-if="isPaused" />
              <VideoPause v-else />
            </el-icon>
          </el-button>

          <el-button
            type="danger"
            size="large"
            circle
            @click="stopRecording"
            title="停止录音"
          >
            <el-icon :size="24"><SwitchButton /></el-icon>
          </el-button>
        </template>

        <template v-if="audioBlob">
          <el-button
            type="primary"
            size="large"
            circle
            @click="startRecording"
            title="重新录音"
          >
            <el-icon :size="24"><RefreshRight /></el-icon>
          </el-button>

          <el-button
            type="success"
            size="large"
            circle
            @click="playRecording"
            :disabled="isPlaying"
            title="播放录音"
          >
            <el-icon :size="24">
              <CaretRight v-if="!isPlaying" />
              <VideoPause v-else />
            </el-icon>
          </el-button>
        </template>
      </div>

      <!-- 处理进度 -->
      <div v-if="processing" class="processing-section">
        <el-progress
          :percentage="processProgress"
          :status="processStatus"
          :stroke-width="8"
        />
        <p class="processing-text">{{ processingText }}</p>
      </div>

      <!-- AI摘要预览 -->
      <div v-if="aiSummary" class="summary-section">
        <h4 class="summary-title">
          <el-icon><Document /></el-icon>
          AI会议摘要
        </h4>
        <div class="summary-content" v-html="formatSummary(aiSummary)"></div>
        <div class="summary-actions">
          <el-button @click="copySummary">
            <el-icon><CopyDocument /></el-icon>
            复制摘要
          </el-button>
          <el-button type="primary" @click="insertToDiary">
            <el-icon><Download /></el-icon>
            插入到日记
          </el-button>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
      <el-button
        v-if="audioBlob && !processing"
        type="primary"
        :loading="uploading"
        @click="handleUploadAndProcess"
      >
        {{ uploading ? '处理中...' : '上传并生成摘要' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Microphone,
  VideoPlay,
  VideoPause,
  SwitchButton,
  RefreshRight,
  CaretRight,
  Document,
  CopyDocument,
  Download,
} from '@element-plus/icons-vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'summary-inserted': [summary: string]
}>()

const api = useApi()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

// 录音相关状态
const recordTitle = ref('')
const isRecording = ref(false)
const isPaused = ref(false)
const duration = ref(0)
const audioBlob = ref<Blob | null>(null)

// 音频相关
let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let stream: MediaStream | null = null
let timerInterval: any = null
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let animationFrameId: number | null = null

// 波形相关
const waveformCanvas = ref<HTMLCanvasElement | null>(null)
let waveformCtx: CanvasRenderingContext2D | null = null

// 播放相关
const isPlaying = ref(false)
let audioPlayer: HTMLAudioElement | null = null

// 处理相关
const uploading = ref(false)
const processing = ref(false)
const processProgress = ref(0)
const processStatus = ref<'success' | 'exception' | ''>('')
const processingText = ref('')
const aiSummary = ref('')
const currentRecordId = ref<number | null>(null)

// 格式化时长
const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// 格式化摘要内容
const formatSummary = (summary: string): string => {
  return summary
    .split('\n')
    .map(line => {
      if (line.startsWith('###')) {
        return `<h4>${line.replace('###', '').trim()}</h4>`
      }
      if (line.startsWith('##')) {
        return `<h3>${line.replace('##', '').trim()}</h3>`
      }
      if (line.startsWith('#')) {
        return `<h2>${line.replace('#', '').trim()}</h2>`
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return `<li>${line.substring(2)}</li>`
      }
      if (line.trim() === '') {
        return '<br>'
      }
      return `<p>${line}</p>`
    })
    .join('')
}

// 初始化Canvas
const initCanvas = () => {
  if (!waveformCanvas.value) return
  const canvas = waveformCanvas.value
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * 2
  canvas.height = rect.height * 2
  waveformCtx = canvas.getContext('2d')
  if (waveformCtx) {
    waveformCtx.scale(2, 2)
  }
}

// 绘制波形
const drawWaveform = () => {
  if (!waveformCtx || !analyser || !waveformCanvas.value) return

  const canvas = waveformCanvas.value
  const width = canvas.width / 2
  const height = canvas.height / 2

  waveformCtx.clearRect(0, 0, width, height)

  // 背景
  waveformCtx.fillStyle = '#f5f7fa'
  waveformCtx.fillRect(0, 0, width, height)

  // 获取音频数据
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  analyser.getByteTimeDomainData(dataArray)

  // 绘制波形
  waveformCtx.lineWidth = 2
  waveformCtx.strokeStyle = isPaused.value ? '#e6a23c' : '#409eff'
  waveformCtx.beginPath()

  const sliceWidth = width / bufferLength
  let x = 0

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0
    const y = (v * height) / 2

    if (i === 0) {
      waveformCtx.moveTo(x, y)
    } else {
      waveformCtx.lineTo(x, y)
    }

    x += sliceWidth
  }

  waveformCtx.lineTo(width, height / 2)
  waveformCtx.stroke()

  animationFrameId = requestAnimationFrame(drawWaveform)
}

// 开始录音
const startRecording = async () => {
  try {
    // 请求麦克风权限
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
      },
    })

    // 创建音频上下文和分析器
    audioContext = new AudioContext()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048

    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)

    // 初始化Canvas并开始绘制波形
    await nextTick()
    initCanvas()
    drawWaveform()

    // 创建MediaRecorder
    audioChunks = []
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: getSupportedMimeType(),
    })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.start(100)
    isRecording.value = true
    isPaused.value = false

    // 启动计时器
    duration.value = 0
    timerInterval = setInterval(() => {
      duration.value++
    }, 1000)

    ElMessage.success('录音已开始')
  } catch (error: any) {
    console.error('录音失败:', error)
    if (error.name === 'NotAllowedError') {
      ElMessage.error('请允许麦克风权限后重试')
    } else {
      ElMessage.error('录音失败，请检查设备后重试')
    }
  }
}

// 获取支持的MIME类型
const getSupportedMimeType = (): string => {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return 'audio/webm'
}

// 暂停录音
const pauseRecording = () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.pause()
    isPaused.value = true
    clearInterval(timerInterval)
    ElMessage.info('录音已暂停')
  }
}

// 继续录音
const resumeRecording = () => {
  if (mediaRecorder && mediaRecorder.state === 'paused') {
    mediaRecorder.resume()
    isPaused.value = false
    timerInterval = setInterval(() => {
      duration.value++
    }, 1000)
    ElMessage.success('录音已继续')
  }
}

// 停止录音
const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }

  // 停止所有轨道
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }

  // 关闭音频上下文
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }

  // 取消动画帧
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  clearInterval(timerInterval)
  isRecording.value = false
  isPaused.value = false

  // 等待数据可用
  setTimeout(() => {
    if (audioChunks.length > 0) {
      const mimeType = getSupportedMimeType()
      audioBlob.value = new Blob(audioChunks, { type: mimeType })
      ElMessage.success('录音完成')
    }
  }, 100)
}

// 播放录音
const playRecording = () => {
  if (!audioBlob.value) return

  if (isPlaying.value) {
    audioPlayer?.pause()
    isPlaying.value = false
    return
  }

  const url = URL.createObjectURL(audioBlob.value)
  audioPlayer = new Audio(url)
  audioPlayer.play()
  isPlaying.value = true

  audioPlayer.onended = () => {
    isPlaying.value = false
    URL.revokeObjectURL(url)
  }

  audioPlayer.onerror = () => {
    isPlaying.value = false
    ElMessage.error('播放失败')
    URL.revokeObjectURL(url)
  }
}

// 上传录音并处理
const handleUploadAndProcess = async () => {
  if (!audioBlob.value) {
    ElMessage.warning('请先录音')
    return
  }

  uploading.value = true
  processing.value = true
  processProgress.value = 0
  processStatus.value = ''
  processingText.value = '正在创建会议记录...'
  aiSummary.value = ''

  try {
    // 1. 创建会议记录
    const record = await api.meetingRecords.create({
      title: recordTitle.value || `会议录音 ${new Date().toLocaleString()}`,
      meetingDate: new Date().toISOString(),
    })
    currentRecordId.value = record.id
    processProgress.value = 20
    processingText.value = '正在上传录音文件...'

    // 2. 上传录音文件
    const formData = new FormData()
    const mimeType = getSupportedMimeType()
    const extension = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'ogg'
    const fileName = `recording_${Date.now()}.${extension}`
    formData.append('audio', new File([audioBlob.value], fileName, { type: mimeType }))
    formData.append('duration', String(duration.value))

    await api.meetingRecords.uploadRecording(record.id, formData)
    processProgress.value = 50
    processingText.value = '正在进行AI处理（转写+摘要）...'

    // 3. 一键处理：转写 + 生成摘要
    const result = await api.meetingRecords.processRecording(record.id)
    processProgress.value = 100
    processStatus.value = 'success'
    processingText.value = '处理完成！'

    aiSummary.value = result.summary || result.transcript || '暂无摘要内容'

    ElMessage.success('录音处理完成')
  } catch (error: any) {
    console.error('处理录音失败:', error)
    processStatus.value = 'exception'
    processingText.value = '处理失败，请重试'
    ElMessage.error(error.message || '处理录音失败')
  } finally {
    uploading.value = false
  }
}

// 复制摘要
const copySummary = async () => {
  if (!aiSummary.value) return

  try {
    await navigator.clipboard.writeText(aiSummary.value)
    ElMessage.success('摘要已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动选择复制')
  }
}

// 插入到日记
const insertToDiary = () => {
  if (!aiSummary.value) return

  emit('summary-inserted', aiSummary.value)
  ElMessage.success('摘要已插入到日记编辑器')
  dialogVisible.value = false
}

// 关闭弹窗时清理资源
const handleClose = () => {
  stopRecording()
  if (audioPlayer) {
    audioPlayer.pause()
    audioPlayer = null
  }
  isPlaying.value = false
}

// 监听弹窗显示状态
watch(dialogVisible, (val) => {
  if (val) {
    // 弹窗打开时初始化
    recordTitle.value = ''
    duration.value = 0
    audioBlob.value = null
    aiSummary.value = ''
    processing.value = false
    processProgress.value = 0
    processStatus.value = ''
    processingText.value = ''
  }
})

// 组件销毁时清理资源
onBeforeUnmount(() => {
  handleClose()
})
</script>

<style scoped>
.meeting-record-dialog {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.record-header {
  margin-bottom: 4px;
}

/* 波形容器 */
.waveform-container {
  position: relative;
  width: 100%;
  height: 150px;
  background: #f5f7fa;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
}

.waveform-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.waveform-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #909399;
}

.waveform-placeholder p {
  margin: 0;
  font-size: 14px;
}

/* 计时器 */
.record-timer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.timer-display {
  font-size: 32px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: #303133;
  letter-spacing: 2px;
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #409eff;
  font-weight: 500;
}

.recording-indicator.paused {
  color: #e6a23c;
}

.recording-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #409eff;
  animation: pulse 1.5s infinite;
}

.recording-dot.paused-dot {
  background: #e6a23c;
  animation: none;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
}

/* 控制按钮 */
.record-controls {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 8px 0;
}

.record-controls .el-button {
  transition: all 0.3s;
}

.record-controls .el-button:hover {
  transform: scale(1.1);
}

/* 处理进度 */
.processing-section {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.processing-text {
  margin: 8px 0 0 0;
  font-size: 14px;
  color: #606266;
  text-align: center;
}

/* 摘要区域 */
.summary-section {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
}

.summary-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.summary-content {
  max-height: 300px;
  overflow-y: auto;
  padding: 12px;
  background: white;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
}

.summary-content h2 {
  font-size: 18px;
  margin: 16px 0 8px 0;
  color: #303133;
}

.summary-content h3 {
  font-size: 16px;
  margin: 12px 0 6px 0;
  color: #303133;
}

.summary-content h4 {
  font-size: 14px;
  margin: 8px 0 4px 0;
  color: #303133;
}

.summary-content p {
  margin: 4px 0;
}

.summary-content li {
  margin-left: 20px;
}

.summary-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
