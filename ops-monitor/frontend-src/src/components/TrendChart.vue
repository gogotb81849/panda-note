<template>
  <div class="trend-chart">
    <!-- 图表头部 -->
    <div class="chart-header" v-if="title || showLabels">
      <span class="chart-title" v-if="title">{{ title }}</span>
      <div class="chart-labels" v-if="showLabels">
        <span class="label-high">高: {{ maxVal }}</span>
        <span class="label-low">低: {{ minVal }}</span>
      </div>
    </div>
    
    <!-- SVG 图表 -->
    <svg :viewBox="`0 0 ${width} ${height}`" class="chart-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" :stop-color="lineColor" stop-opacity="0.2" />
          <stop offset="100%" :stop-color="lineColor" stop-opacity="0" />
        </linearGradient>
      </defs>
      
      <!-- 网格线 -->
      <g class="grid-lines">
        <line
          v-for="i in 4"
          :key="i"
          :x1="0"
          :y1="(height / 4) * i"
          :x2="width"
          :y2="(height / 4) * i"
          stroke="#f0f0f0"
          stroke-width="0.5"
          stroke-dasharray="2,2"
        />
      </g>
      
      <!-- 面积填充 -->
      <path
        v-if="data.length > 1"
        :d="areaPath"
        fill="url(#chartGradient)"
        class="chart-area"
      />
      
      <!-- 主折线 -->
      <path
        v-if="data.length > 1"
        :d="linePath"
        fill="none"
        :stroke="lineColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="chart-line"
      />
      
      <!-- 数据点 -->
      <g class="data-points">
        <circle
          v-for="(point, idx) in normalizedPoints"
          :key="idx"
          :cx="point.x"
          :cy="point.y"
          r="2"
          :fill="point.isExtreme ? lineColor : '#fff'"
          :stroke="lineColor"
          stroke-width="1"
          class="data-point"
          :class="{ 'is-extreme': point.isExtreme }"
        />
      </g>
    </svg>
    
    <!-- 底部标签 -->
    <div class="chart-footer" v-if="showTimeLabels">
      <span>{{ timeStart }}</span>
      <span>{{ timeEnd }}</span>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'TrendChart',
  props: {
    data: { type: Array, default: () => [] },
    title: { type: String, default: '' },
    width: { type: Number, default: 200 },
    height: { type: Number, default: 60 },
    lineColor: { type: String, default: '#3B82F6' },
    showLabels: { type: Boolean, default: true },
    showTimeLabels: { type: Boolean, default: false },
    timeStart: { type: String, default: '' },
    timeEnd: { type: String, default: '' }
  },
  setup(props) {
    const normalizedPoints = computed(() => {
      if (!props.data || props.data.length === 0) return []
      
      const values = props.data.map(Number).filter(v => !isNaN(v))
      if (values.length === 0) return []
      
      const min = Math.min(...values)
      const max = Math.max(...values)
      const range = max - min || 1
      
      const padding = 8
      const chartHeight = props.height - padding * 2
      const chartWidth = props.width - padding * 2
      
      return values.map((val, idx) => {
        const x = padding + (idx / (values.length - 1 || 1)) * chartWidth
        const y = padding + chartHeight - ((val - min) / range) * chartHeight
        const isExtreme = val === min || val === max
        return { x, y, value: val, isExtreme }
      })
    })
    
    const latestPoint = computed(() => {
      const points = normalizedPoints.value
      return points.length > 0 ? points[points.length - 1] : null
    })
    
    const maxVal = computed(() => {
      if (!props.data || props.data.length === 0) return 0
      const values = props.data.map(Number).filter(v => !isNaN(v))
      return values.length > 0 ? Math.max(...values).toFixed(1) : '0'
    })
    
    const minVal = computed(() => {
      if (!props.data || props.data.length === 0) return 0
      const values = props.data.map(Number).filter(v => !isNaN(v))
      return values.length > 0 ? Math.min(...values).toFixed(1) : '0'
    })
    
    const linePath = computed(() => {
      const points = normalizedPoints.value
      if (points.length < 2) return ''
      return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    })
    
    const areaPath = computed(() => {
      const points = normalizedPoints.value
      if (points.length < 2) return ''
      
      const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      const lastX = points[points.length - 1].x
      const firstX = points[0].x
      
      return `${line} L ${lastX} ${props.height} L ${firstX} ${props.height} Z`
    })
    
    return {
      normalizedPoints,
      latestPoint,
      maxVal,
      minVal,
      linePath,
      areaPath
    }
  }
}
</script>

<style scoped>
.trend-chart {
  background: #fff;
  border-radius: 4px;
  padding: 8px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.chart-title {
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
}

.chart-labels {
  display: flex;
  gap: 8px;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.label-high {
  color: #ff4d4f;
}

.label-low {
  color: #52c41a;
}

.chart-svg {
  width: 100%;
  height: 50px;
  display: block;
}

.data-point.is-extreme {
  r: 3;
}

.chart-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 10px;
  color: #9ca3af;
  font-variant-numeric: tabular-nums;
}
</style>
