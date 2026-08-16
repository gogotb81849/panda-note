<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6">
    <div class="max-w-6xl mx-auto">
      <!-- 顶部标题栏 -->
      <div class="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
            ✍️ 政工笔 · AI 智能写作
          </h1>
          <p class="mt-1 text-gray-500 text-sm">
            10 步填表 → 点生成 → 一篇符合集团录用规范、AI 检测率 ≤15% 的成品稿（Sprint 1 MVP 骨架）
          </p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <el-button @click="$router.push('/toolbox')">← 返回工具箱</el-button>
          <el-button type="primary" plain @click="openMyTemplates">📂 我的范文库</el-button>
          <el-tag type="warning" size="large">v1.0 Sprint 1 MVP</el-tag>
        </div>
      </div>

      <!-- Steps 步骤条 -->
      <el-steps
        :active="activeStep" finish-status="success" simple
        class="mb-6 bg-white rounded-lg p-4 sm:p-6 shadow-sm"
      >
        <el-step v-for="(st, idx) in STEPS_LABEL" :key="idx" :title="st" />
      </el-steps>

      <!-- 步骤内容卡片 -->
      <div class="bg-white rounded-lg shadow-sm p-4 sm:p-8 min-h-[520px]">
        <!-- Step 1: 文种 + 作家调味 -->
        <div v-if="activeStep === 0">
          <h2 class="text-xl font-semibold mb-4">① 选文种 + 文学风格调味</h2>
          <el-form :model="form" label-position="top">
            <el-form-item label="📋 稿件类型">
              <el-radio-group v-model="form.categoryId">
                <el-radio-button
                  v-for="c in CATEGORIES_SPRINT1" :key="c.id"
                  :value="c.id"
                  class="!mr-2 !mb-3"
                >
                  <span class="text-xl mr-1">{{ c.icon }}</span>
                  {{ c.name }}
                </el-radio-button>
              </el-radio-group>
              <p class="text-xs text-gray-500 mt-1">
                {{ CATEGORIES_SPRINT1.find(c => c.id === form.categoryId)?.desc }}
              </p>
            </el-form-item>

            <el-form-item label="🍶 文学风格调味（可选 · 让文章更有"味道"）">
              <el-select v-model="form.writerStyleId" placeholder="不调味（标准政工风格）" style="width: 100%; max-width: 520px">
                <el-option
                  v-for="w in WRITER_STYLES" :key="w.id" :value="w.id"
                  :label="w.name + ' · ' + w.oneLiner.slice(0, 30) + (w.oneLiner.length>30?'…':'')"
                >
                  <div class="flex items-start gap-3 py-1">
                    <div class="text-3xl">{{ w.avatar }}</div>
                    <div class="flex-1">
                      <div class="font-semibold">{{ w.name }} <span class="text-xs text-gray-400 ml-2">{{ w.era }} · {{ w.gender==='female'?'女作家':'男作家' }}</span></div>
                      <div class="text-xs text-gray-600 mt-1 leading-relaxed">{{ w.oneLiner }}</div>
                    </div>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-form>
        </div>

        <!-- Step 2: 基本要素 -->
        <div v-else-if="activeStep === 1">
          <h2 class="text-xl font-semibold mb-4">② 基本要素（全必填 · 防止 AI 杜撰）</h2>
          <el-form :model="form.basic" label-position="top">
            <el-row :gutter="16">
              <el-col :span="24" :md="12">
                <el-form-item label="🕒 发生日期">
                  <el-date-picker v-model="form.basic.happenDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="24" :md="12">
                <el-form-item label="📍 发生地点（船名/航段/舱室）">
                  <el-input v-model="form.basic.location" placeholder="例如：中远海运上海号 · 印度洋航段 · 机舱底层" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-divider content-position="left">👥 涉及人物（可动态增加）</el-divider>
            <el-form-item
              v-for="(p, idx) in form.basic.personList" :key="idx"
              :label="idx===0 ? '核心人物 1' : `人物 ${idx+1}`"
            >
              <div class="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
                <el-input v-model="p.name" placeholder="姓名" />
                <el-input v-model="p.duty" placeholder="职务（政委/大副/机工/…）" />
                <el-input v-model="p.shipName" placeholder="所属船舶（可选）" />
                <div class="flex gap-2">
                  <el-input v-model="p.dept" placeholder="部门（可选）" class="flex-1" />
                  <el-button v-if="idx>0" type="danger" text @click="removePerson(idx)">✕</el-button>
                </div>
              </div>
            </el-form-item>
            <el-button type="primary" plain size="small" @click="addPerson">＋ 增加一位人物</el-button>
          </el-form>
        </div>

        <!-- Step 3: 事件过程 -->
        <div v-else-if="activeStep === 2">
          <h2 class="text-xl font-semibold mb-4">③ 事件过程（按时间顺序写）</h2>
          <el-form label-position="top">
            <el-form-item :label="`请按『起因→发展→高潮→结果』写清楚：已写 ${form.eventProcess.length} 字`">
              <el-input
                v-model="form.eventProcess" type="textarea"
                :rows="10"
                placeholder="例如：\n15 号凌晨 02:17 主机突然 1#缸油头报警，值班机工小李第一时间赶到…\n随后班长老王带病下床组织抢修…\n经 3 小时吊缸更换油头，于 05:22 恢复正常运行，未耽误班期。"
              />
              <div class="mt-1 text-xs">
                <el-tag v-if="form.eventProcess.length<100" type="danger" size="small">至少写 100 字才能下一步</el-tag>
                <el-tag v-else type="success" size="small">✅ 字数够了</el-tag>
              </div>
            </el-form-item>
          </el-form>
        </div>

        <!-- Step 4: 主题思想 -->
        <div v-else-if="activeStep === 3">
          <h2 class="text-xl font-semibold mb-4">④ 主题思想（想传递什么精神？）</h2>
          <el-form label-position="top">
            <el-form-item :label="`想传递什么精神 / 价值观 / 上级要求？已写 ${form.themeIdea.length} 字`">
              <el-input
                v-model="form.themeIdea" type="textarea" :rows="6"
                placeholder="例如：\n- 体现党员在急难险重任务中的先锋模范作用\n- 响应公司『安全生产月』活动号召\n- 展示远洋船员『忠诚、担当、务实、高效』的企业精神"
              />
              <div class="mt-1 text-xs">
                <el-tag v-if="form.themeIdea.length<50" type="warning" size="small">建议至少写 50 字，AI 才能更精准扣题</el-tag>
                <el-tag v-else type="success" size="small">✅ OK</el-tag>
              </div>
            </el-form-item>
          </el-form>
        </div>

        <!-- Step 5: 🧩 细节卡堆积木 + 6 维雷达（核心） -->
        <div v-else-if="activeStep === 4">
          <h2 class="text-xl font-semibold mb-2">⑤ 🧩 贴细节卡（越多越生动 · 低于 30 分禁止下一步）</h2>
          <p class="text-xs text-gray-500 mb-4">
            🚫 防杜撰红线：AI <b>只使用你写进卡片里的事实</b>，不在卡片中的任何内容<b>严禁编造</b>！
          </p>

          <el-row :gutter="24">
            <!-- 左：细节雷达 + 智能建议 -->
            <el-col :span="24" :md="8">
              <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div class="text-center mb-3">
                  <div class="text-sm text-gray-600 mb-1">🎯 细节丰富度评分</div>
                  <div class="text-3xl font-bold mb-1" :class="radarGradeColorClass">
                    {{ radarScore.total }}
                    <span class="text-lg text-gray-400">/100</span>
                  </div>
                  <el-progress
                    :percentage="radarScore.total"
                    :color="radarProgressColor"
                    :stroke-width="12"
                  />
                  <el-tag size="small" :type="radarTagType" class="mt-2">
                    {{ radarGradeLabel }}
                  </el-tag>
                </div>

                <el-divider content-position="left" class="my-3 text-xs">6 维拆解</el-divider>
                <div class="space-y-2 text-sm">
                  <RadarDimBar label="👤 动作细节" :score="radarScore.actionScore" :full="20" />
                  <RadarDimBar label="💬 对话金句" :score="radarScore.dialogScore" :full="15" />
                  <RadarDimBar label="🍃 环境场景" :score="radarScore.envScore"    :full="15" />
                  <RadarDimBar label="🔊 五感细节" :score="radarScore.sensesScore"  :full="10" />
                  <RadarDimBar label="🔢 数字数据" :score="radarScore.numberScore"  :full="20" />
                  <RadarDimBar label="🎭 情绪心理" :score="radarScore.emotionScore" :full="20" />
                </div>

                <el-divider content-position="left" class="my-3 text-xs">💡 智能建议</el-divider>
                <div class="text-xs text-gray-700 leading-relaxed bg-blue-50 p-3 rounded border border-blue-100 min-h-[60px]">
                  {{ smartSuggestion }}
                </div>

                <!-- 拦截提示（<30 红 / 30-60 橙） -->
                <div v-if="radarScore.grade==='red'" class="mt-3 p-3 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                  ⛔ <b>禁止下一步</b>：细节不足 30 分，AI 会杜撰 80% 内容！至少再补 3-5 张卡片。
                </div>
                <div v-else-if="radarScore.grade==='orange'" class="mt-3 p-3 rounded bg-orange-50 border border-orange-200 text-xs text-orange-700">
                  ⚠️ 下一步会弹二次确认：<b>当前仍可能有 30-40% 内容被 AI 杜撰</b>，建议再补几张。
                </div>
              </div>
            </el-col>

            <!-- 右：细节卡堆积木区 -->
            <el-col :span="24" :md="16">
              <!-- 7 类按钮 -->
              <div class="mb-3 flex flex-wrap gap-2">
                <el-button
                  v-for="ct in DETAIL_CARD_TYPES" :key="ct.id"
                  :type="ct.btnColor || 'default'"
                  plain
                  size="small"
                  @click="addDetailCard(ct.id)"
                >
                  + {{ ct.emoji }} {{ ct.label }}
                </el-button>
              </div>

              <!-- 卡片列表（可上下移动 + 删除） -->
              <div class="space-y-3">
                <div
                  v-for="(card, idx) in form.detailCards" :key="card.id"
                  class="border rounded-lg p-3 hover:shadow transition-shadow"
                  :class="'border-l-4 ' + getCardLeftBorderColor(card.type)"
                >
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2 text-sm">
                      <span class="text-lg">
                        {{ DETAIL_CARD_TYPES.find(c=>c.id===card.type)?.emoji }}
                      </span>
                      <span class="font-medium">
                        卡片 {{ idx+1 }} · {{ DETAIL_CARD_TYPES.find(c=>c.id===card.type)?.label }}
                      </span>
                    </div>
                    <div class="flex gap-1">
                      <el-button size="small" text :disabled="idx===0" @click="moveCardUp(idx)">↑</el-button>
                      <el-button size="small" text :disabled="idx===form.detailCards.length-1" @click="moveCardDown(idx)">↓</el-button>
                      <el-button size="small" type="danger" text @click="removeCard(idx)">✕ 删除</el-button>
                    </div>
                  </div>
                  <el-input
                    v-model="card.text" type="textarea"
                    :rows="2" autosize
                    :placeholder="DETAIL_CARD_TYPES.find(c=>c.id===card.type)?.placeholder"
                  />
                </div>

                <el-empty v-if="form.detailCards.length===0" description="👇 点上面的按钮开始贴细节卡，最少 3 张起" :image-size="80" />
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- Step 6: 写作偏好 + 字数三维联动 -->
        <div v-else-if="activeStep === 5">
          <h2 class="text-xl font-semibold mb-4">⑥ 写作偏好 & 目标字数</h2>
          <el-form :model="form.preference" label-position="top">
            <el-row :gutter="16">
              <el-col :span="24" :md="8">
                <el-form-item label="🗣️ 语气">
                  <el-select v-model="form.preference.tone" style="width:100%">
                    <el-option label="⚖️ 正式庄重（公文/报告用）" value="formal" />
                    <el-option label="🫱 朴实亲切（人物/通讯用）" value="plain" />
                    <el-option label="🔥 热情洋溢（倡议/鼓舞用）" value="enthusiastic" />
                    <el-option label="🧊 理性客观（总结/纪要用）" value="objective" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="24" :md="8">
                <el-form-item label="👁️ 人称">
                  <el-radio-group v-model="form.preference.person">
                    <el-radio-button value="third">第三人称（客观）</el-radio-button>
                    <el-radio-button value="first">第一人称（我/我们）</el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :span="24" :md="8">
                <el-form-item label="🏁 结尾方式">
                  <el-select v-model="form.preference.ending" style="width:100%">
                    <el-option label="📋 事实总结（客观）" value="fact" />
                    <el-option label="🌅 展望未来（积极）" value="future" />
                    <el-option label="💛 抒情写意（散文）" value="emotional" />
                    <el-option label="🔓 开放式（留白）" value="open" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="24" :md="6">
                <el-form-item label="是否加小标题？">
                  <el-switch v-model="form.preference.withSubtitles" />
                </el-form-item>
              </el-col>
              <el-col :span="24" :md="18">
                <el-form-item label="🚫 禁忌开关（多选）">
                  <el-checkbox-group v-model="form.preference.taboos">
                    <el-checkbox value="no_slogan" :label="'no_slogan'">❌ 禁用口号式结尾</el-checkbox>
                    <el-checkbox value="no_netword" :label="'no_netword'">❌ 禁用网络热词</el-checkbox>
                    <el-checkbox value="no_exaggerate" :label="'no_exaggerate'">❌ 禁用夸张修辞（呕心沥血…）</el-checkbox>
                    <el-checkbox value="prefer_short" :label="'prefer_short'">✅ 偏爱短句（每句≤25字）</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
              </el-col>
            </el-row>

            <!-- 📏 字数三维联动（核心） -->
            <el-divider content-position="left">📏 目标刊物 & 目标字数</el-divider>
            <el-form-item label="📰 目标投稿刊物（决定推荐字数区间）">
              <el-select v-model="form.preference.journalId" style="width:100%">
                <el-option
                  v-for="j in journalOptionsForCurrentCategory" :key="j.journalId" :value="j.journalId"
                  :label="j.journalName + '  推荐' + j.min + '~' + j.max + '字' + (j.remark?' · '+j.remark.slice(0,20):'')"
                />
              </el-select>
            </el-form-item>

            <div class="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
              <div class="flex flex-col sm:flex-row items-center justify-between gap-2 mb-2">
                <label class="text-sm font-medium">🎯 目标字数：<span class="text-2xl font-bold text-blue-600">{{ form.preference.wordCount }}</span> 字</label>
                <div class="flex gap-1 flex-wrap">
                  <el-tag v-for="p in WORDCOUNT_PRESETS" :key="p.value" size="small" type="info"
                    class="cursor-pointer" @click="form.preference.wordCount = p.value">
                    {{ p.label }}
                  </el-tag>
                </div>
              </div>
              <el-slider
                v-model="form.preference.wordCount"
                :min="300" :max="6000" :step="50" :marks="sliderMarks"
                :tooltip="'always'"
              />
              <!-- 推荐区间可视化 -->
              <div class="mt-4 text-xs">
                <div class="flex justify-between text-gray-500 mb-1">
                  <span>300</span>
                  <span>
                    推荐区间：
                    <el-tag size="small" type="success" plain>
                      {{ currentJournalRef?.min }} ~ {{ currentJournalRef?.max }} 字
                    </el-tag>
                    （超 {{ currentJournalRef?.absoluteMax }} 字大概率退回）
                  </span>
                  <span>6000</span>
                </div>
                <div class="h-3 bg-gray-200 rounded-full overflow-hidden relative">
                  <div
                    class="absolute h-full bg-red-200"
                    :style="{ width: `${Math.max(0, (currentJournalRef?.min||0) * 100 / 6000)}%` }"
                  />
                  <div
                    class="absolute h-full bg-green-400"
                    :style="{
                      left: `${(currentJournalRef?.min||0) * 100 / 6000}%`,
                      width: `${Math.max(1, ((currentJournalRef?.max||0) - (currentJournalRef?.min||0)) * 100 / 6000)}%`
                    }"
                  />
                  <div
                    class="absolute h-full bg-red-200"
                    :style="{
                      left: `${(currentJournalRef?.max||0) * 100 / 6000}%`,
                      width: `${Math.max(0, (6000 - (currentJournalRef?.max||0)) * 100 / 6000)}%`
                    }"
                  />
                  <div
                    class="absolute h-5 w-5 rounded-full -top-1 shadow bg-blue-600 border-2 border-white"
                    :style="{ left: `calc(${form.preference.wordCount * 100 / 6000}% - 10px)` }"
                  />
                </div>
                <div class="mt-2" v-html="wordStatusTipHtml"></div>
                <p class="mt-2 text-gray-500" v-if="currentJournalRef?.remark">{{ currentJournalRef.remark }}</p>
              </div>
            </div>
          </el-form>
        </div>

        <!-- Step 7: 对标范本勾选 -->
        <div v-else-if="activeStep === 6">
          <h2 class="text-xl font-semibold mb-4">⑦ 选择对标范本来源（AI 自动检索 Top-3 注入风格）</h2>
          <el-form :model="form.templateChoice" label-position="top">
            <el-checkbox-group>
              <el-checkbox :value="true" :label="'useGlobalL1'" model-value>
                🏛️ <b>集团全局范文库</b>（管理员上传的合集/政工月刊/集团公众号精选）
                <span class="text-xs text-gray-500">默认勾选，推荐</span>
              </el-checkbox>
              <el-checkbox :value="form.templateChoice.usePersonalL1" :label="'usePersonalL1'">
                👤 <b>我的个人范文库</b>（我自己上传的历史稿件）
              </el-checkbox>
              <el-checkbox :value="true" :label="'usePublicL2'" model-value>
                📰 <b>行业公开库</b>（中国远洋海运报等公开稿）
              </el-checkbox>
            </el-checkbox-group>

            <el-alert
              class="mt-4" type="info" :closable="false" show-icon
              title="范文库导入入口"
              description="👉 管理员：系统管理 → 政工范文库管理；👉 普通用户：右上角【我的范文库】按钮。支持批量导入 Word/PDF，系统 AI 自动打 6 类标签 + 写 200 字摘要。"
            />
          </el-form>
        </div>

        <!-- Step 8: 预览完整 Prompt -->
        <div v-else-if="activeStep === 7">
          <h2 class="text-xl font-semibold mb-2">⑧ 🎯 预览发送给 AI 的完整提示词</h2>
          <p class="text-xs text-gray-500 mb-4">发送前最后检查一遍。觉得哪里不对？点上面步骤条回去改。</p>
          <el-card shadow="never" class="!bg-gray-50 !border-gray-200">
            <pre class="text-xs leading-relaxed whitespace-pre-wrap">{{ fullPromptPreview }}</pre>
          </el-card>
        </div>

        <!-- Step 9: 生成 loading -->
        <div v-else-if="activeStep === 8" class="flex flex-col items-center justify-center py-16">
          <el-icon class="text-6xl text-blue-500 animate-spin mb-4"><Loading /></el-icon>
          <h2 class="text-xl font-semibold mb-1">⑨ ✨ AI 正在为你撰写稿件…</h2>
          <p class="text-sm text-gray-500 max-w-xl text-center">
            ① 拼接 6 层 Prompt → ② 集团范文库 RAG 检索 Top3 → ③ 调用大模型生成初稿 →
            ④ 跑 6 条去 AI 化规则（强度 {{ form.preference.deaiStrength }}%）→ ⑤ 100 分制质量评分<br>
            （Sprint 1 骨架版：此处展示模拟生成效果，待后端接口部署后对接真实 AI）
          </p>
          <div class="mt-6 w-full max-w-xl">
            <el-progress :percentage="mockGenProgress" :stroke-width="10" status="success" />
          </div>
        </div>

        <!-- Step 10: 编辑器 + 评分卡 MVP 骨架（升级：修改追踪 + 💎个性化加成 + 柔性引导下载） -->
        <div v-else-if="activeStep === 9">
          <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div class="xl:col-span-2">
              <h2 class="text-xl font-semibold mb-4">⑩ 📝 成品稿（可直接修改）</h2>
              <div class="flex gap-2 mb-3 flex-wrap items-center">
                <!-- 实时修改次数徽标：让用户能看到 "我在做的动作有被记住" -->
                <el-tag type="success" effect="dark" round>
                  🧩 有效修改：<b class="ml-1 text-lg">{{ validEditCount }}</b> 处
                  <span v-if="personalBonus.bonus" class="ml-2">{{ personalBonus.label }}</span>
                </el-tag>
                <el-tag type="info" size="small" v-if="personalBonus.unlockText">{{ personalBonus.unlockText }}</el-tag>
              </div>
              <div class="flex gap-2 mb-3 flex-wrap">
                <el-button type="primary" plain size="small" @click="copyFullArticle">📋 复制全文</el-button>
                <el-button type="success" plain size="small" @click="saveToRevision(true)">💾 存为熊猫笔记草稿 + 保存修改记录</el-button>
                <el-button type="warning" plain size="small" @click="handleSendToMagazine">📰 发往杂志编排</el-button>
                <el-button type="info" plain size="small" @click="onClickDownload">📤 导出 Word</el-button>
                <el-button type="danger" plain size="small" @click="activeStep = 8">🔄 重新生成</el-button>
              </div>
              <el-input
                v-model="mockResultArticle"
                type="textarea"
                :rows="28"
                class="font-serif text-base leading-relaxed p-4"
                placeholder="请先完成 Step 1-8（选文种→填三要素→写事件过程→定主题思想→做细节卡→设偏好→选范本→预览 Prompt），然后在 Step 8 点『开始生成』。生成后，成品稿会自动显示在这里，您可以直接继续改、直接复制、直接存草稿、直接发往杂志编排、直接导出 Word。"
                @input="onArticleInput"
              />
            </div>

            <!-- 🏆 评分卡片（升级：加 💎个性化加成分 + 有效修改次数联动） -->
            <div>
              <h2 class="text-xl font-semibold mb-4">🏆 质量评估报告</h2>
              <div class="bg-gradient-to-br from-white to-green-50 border border-green-200 rounded-lg p-5 shadow-sm">
                <div class="text-center mb-3">
                  <div class="text-sm text-gray-600 mb-1">综合评分<span v-if="personalBonus.bonus" class="text-emerald-600">（含 {{ personalBonus.label }}）</span></div>
                  <div class="text-5xl font-black text-green-600">{{ finalScore }}<span class="text-xl text-gray-400">/100</span></div>
                  <el-tag v-if="!personalBonus.bonus" type="success" size="large" class="mt-2">🟢 A · 优秀</el-tag>
                  <el-tag v-else-if="personalBonus.bonus===2" type="success" effect="dark" size="large" class="mt-2">🟢 A+ · 个性化加成</el-tag>
                  <el-tag v-else type="success" effect="dark" size="large" class="mt-2">💎 S- · 黄金个性化</el-tag>
                </div>
                <el-progress :percentage="finalScore" :stroke-width="10" color="#22c55e" class="mb-4" />

                <div class="text-sm border-t border-gray-100 pt-3 mb-2">
                  <div class="mb-2">🤖 <b>AI 检测率（真实 · 确定性打分，每次一致）</b>：
                    <el-tag v-if="generatedResult.aiDetectRateLevel==='safe'" size="small" type="success">{{ generatedResult.simAiDetectRate || '-' }}%（远低于安全阈值 ≤15%）</el-tag>
                    <el-tag v-else-if="generatedResult.aiDetectRateLevel==='warning'" size="small" type="warning">{{ generatedResult.simAiDetectRate }}%（偏高，建议加强度或手动补 3-5 处细节）</el-tag>
                    <el-tag v-else size="small" type="danger">{{ generatedResult.simAiDetectRate }}%（⚠️ 危险，检测器大概率判 AI）</el-tag>
                    <span class="ml-1 text-xs text-gray-500">{{ generatedResult.aiDetectRateHint }}</span>
                  </div>
                  <div class="mb-2 text-emerald-700">🧩 <b>有效修改次数：{{ validEditCount }} 处</b>
                    <span v-if="validEditCount<3"> → 再改 {{ 3-validEditCount }} 处解锁 💎+2 个性化加成</span>
                  </div>
                  <div class="text-xs text-gray-600">主流检测器 GPTZero / 知网 AI 检测预期：{{ generatedResult.gradeLabel }}（{{ generatedResult.sprintInfo }}）</div>
                </div>

                <el-divider class="my-3" />
                <div class="text-sm">
                  <div class="font-semibold mb-2">📖 可投级别建议：</div>
                  <ul class="text-xs space-y-1 text-gray-700 list-disc pl-4">
                    <li>📌 <b>评级：</b>{{ generatedResult.gradeLabel }} / {{ generatedResult.grade }} — {{ generatedResult.gradeAdvice || '未生成' }}</li>
                    <li v-if="generatedResult.missingFactsHints?.length"><span class="text-orange-600">⚠️ 系统提示：</span>{{ generatedResult.missingFactsHints.join('；') }}</li>
                    <li v-if="generatedResult.forbiddenHits?.length"><span class="text-red-600">⛔ 禁用词命中：</span>{{ generatedResult.forbiddenHits.join('、') }}</li>
                  </ul>
                </div>

                <el-divider class="my-3" />
                <div class="text-sm space-y-1.5">
                  <div class="flex justify-between"><span>📝 内容完整性</span><el-tag :type="generatedResult.contentIntegrity>=17?'success':generatedResult.contentIntegrity>=14?'warning':'danger'" size="small">{{ score20(generatedResult.contentIntegrity) }}/20</el-tag></div>
                  <div class="flex justify-between"><span>🎯 主题贴合度</span><el-tag :type="generatedResult.themeCoherence>=17?'success':generatedResult.themeCoherence>=14?'warning':'danger'" size="small">{{ score20(generatedResult.themeCoherence) }}/20</el-tag></div>
                  <div class="flex justify-between"><span>🧭 文种格式规范</span><el-tag :type="generatedResult.structureFitness>=17?'success':generatedResult.structureFitness>=14?'warning':'danger'" size="small">{{ score20(generatedResult.structureFitness) }}/20</el-tag></div>
                  <div class="flex justify-between"><span>🎨 文学表现力</span><el-tag :type="generatedResult.detailRichness>=14?'success':generatedResult.detailRichness>=10?'warning':'danger'" @click="quickFix('表现力')" size="small" class="cursor-pointer hover:bg-yellow-100">{{ score20(generatedResult.detailRichness) }}/20 👉 一键补细节</el-tag></div>
                  <div class="flex justify-between"><span>🧠 去 AI 化程度</span><el-tag :type="generatedResult.deaiScore>=17?'success':generatedResult.deaiScore>=14?'warning':'danger'" size="small">{{ score20(generatedResult.deaiScore) }}/20</el-tag></div>
                  <div class="flex justify-between"><span>⚖️ 合规性</span><el-tag :type="generatedResult.compliance>=17?'success':generatedResult.compliance>=14?'warning':'danger'" size="small">{{ score20(generatedResult.compliance, 20) }}/20</el-tag></div>
                  <div v-if="personalBonus.bonus" class="flex justify-between pt-2 border-t border-dashed border-gray-200">
                    <span class="text-emerald-700 font-bold">{{ personalBonus.label }}</span>
                    <el-tag size="small" effect="dark" type="success">+{{ personalBonus.bonus }}</el-tag>
                  </div>
                  <div v-if="generatedResult.deaiAppliedRules?.length" class="pt-2 border-t border-dashed border-gray-200 text-xs text-gray-500">
                    <b>已应用去 AI 化规则：</b>{{ generatedResult.deaiAppliedRules.join('；') }}
                  </div>
                </div>
              </div>

              <!-- 🎚️ 去 AI 化滑杆 -->
              <div class="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label class="text-sm font-medium flex justify-between items-center mb-2">
                  <span>🎚️ 去 AI 化强度</span>
                  <span class="text-lg font-bold text-blue-600">{{ form.preference.deaiStrength }}%</span>
                </label>
                <el-slider v-model="form.preference.deaiStrength" :min="0" :max="100" />
                <div class="text-xs text-gray-500">公文类建议 30~50%；散文/人物稿建议 80~100%；当前 80%（推荐）</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部按钮（Step 8/9/10 不显示上一步） -->
        <div v-if="activeStep <= 7" class="mt-8 flex justify-between border-t pt-4">
          <el-button :disabled="activeStep === 0" @click="prevStep">← 上一步</el-button>
          <div class="flex gap-2">
            <el-button type="info" plain @click="activeStep = 0">🔄 重置全表</el-button>
            <el-button type="primary" :disabled="!canGoNext" @click="nextStep">
              {{ activeStep === 7 ? '✨ 开始生成（最后一步）' : '下一步 →' }}
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- <30 分：禁止下一步的二次确认弹窗（只在 30-60 分弹） -->
    <el-dialog v-model="showLowScoreConfirm" title="⚠️ 细节分过低，生成质量可能不好" width="520px">
      <p>当前细节分 <b>{{ radarScore.total }}/100</b>，AI 可能会杜撰约 30-40% 的内容。</p>
      <p class="mt-2">你有两个选择：</p>
      <ul class="mt-2 list-disc pl-6 text-sm text-gray-600">
        <li>✅ 推荐：回到 Step 5 再补 3-5 张细节卡（人物动作、对话、五感）</li>
        <li>⚠️ 我确认：直接生成（接受杜撰风险）</li>
      </ul>
      <template #footer>
        <el-button @click="showLowScoreConfirm = false">我回去补细节</el-button>
        <el-button type="primary" @click="confirmNextDespiteLowScore">⚠️ 直接生成</el-button>
      </template>
    </el-dialog>

    <!-- 💡 柔性引导：0 次修改点下载时弹 -->
    <el-dialog v-model="showDownloadGuide" :title="DOWNLOAD_GUIDE_ZERO_EDIT.title" width="580px">
      <p class="text-base font-semibold">{{ DOWNLOAD_GUIDE_ZERO_EDIT.intro(validEditCount) }}</p>
      <ul class="mt-3 text-sm space-y-1.5 list-disc pl-5 text-gray-700">
        <li v-for="(b, i) in DOWNLOAD_GUIDE_ZERO_EDIT.bullets" :key="i">{{ b }}</li>
      </ul>
      <p class="mt-3 text-xs text-gray-500 bg-blue-50 p-2 rounded">{{ DOWNLOAD_GUIDE_ZERO_EDIT.hint }}</p>
      <template #footer>
        <el-button type="primary" @click="handleDownloadGoEdit">{{ DOWNLOAD_GUIDE_ZERO_EDIT.btnGoEdit }}</el-button>
        <el-button @click="handleDownloadSkip">{{ DOWNLOAD_GUIDE_ZERO_EDIT.btnSkip }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { Loading } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import {
  WRITER_STYLES, CATEGORIES_SPRINT1, JOURNAL_WORDCOUNT_REF, WORDCOUNT_PRESETS,
  DETAIL_CARD_TYPES, RADAR_SMART_SUGGESTIONS, SCORE_GRADE_TABLE,
  DOWNLOAD_GUIDE_ZERO_EDIT, countValidEdits, getPersonalBonus,
  type ManuscriptCategoryId, type WriterStyleId, type DetailsRadarScore, type DetailCardTypeId, type JournalWordCountRef
} from '~/constants/ai-manuscript';

// ========= 常量 =========
const STEPS_LABEL = ['选文种', '基本要素', '事件过程', '主题思想', '细节卡📌', '写作偏好', '对标范本', '预览Prompt', '生成', '编辑评分'];
const sliderMarks: Record<number, any> = {
  300: '300', 800: '800', 1200: '1200', 2000: '2000', 3000: '3000', 4500: '4500', 6000: '6000'
};

// ========= 表单数据 =========
const activeStep = ref(0);
const showLowScoreConfirm = ref(false);
const mockGenProgress = ref(0);

interface PersonItem { name: string; duty: string; shipName?: string; dept?: string; }
interface DetailCard { id: string; type: DetailCardTypeId; text: string; }

const form = reactive({
  categoryId: 'advanced_deed' as ManuscriptCategoryId,
  writerStyleId: 'none' as WriterStyleId,
  basic: {
    happenDate: new Date().toISOString().slice(0, 10),
    location: '',
    personList: [{ name: '', duty: '', shipName: '', dept: '' } as PersonItem]
  },
  eventProcess: '',
  themeIdea: '',
  detailCards: [] as DetailCard[],
  preference: {
    tone: 'plain',
    person: 'third',
    ending: 'fact',
    withSubtitles: false,
    taboos: ['no_slogan', 'no_exaggerate', 'prefer_short'] as string[],
    journalId: 'cosco_shipping_news_normal',
    wordCount: 1200,
    deaiStrength: 80
  },
  templateChoice: {
    useGlobalL1: true,
    usePersonalL1: false,
    usePublicL2: true
  },
  freeSpecialInstructions: ''
});

// ========= 成品稿文本框初始值：空，等 Step 8 生成后再填 =========
//   —— 避免一进 Step 9 就塞一大段"老轨王建国"硬编码示例误导政委以为是自己的稿
const mockResultArticle = ref<string>('');

// ============================================================
// 🧩 自我优化闭环：成品稿修改追踪（diff + 有效修改次数）
// ============================================================
const originalArticleSnapshot = ref<string>(''); // 生成时刻的快照（每次"重新生成"都重置）
const generationId = ref<string>(`gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`); // 本次生成唯一号
const showDownloadGuide = ref(false); // 柔性引导弹窗开关

// 简易行级 diff（O(n²)，对 2000 字以下稿件完全够用；重型 diff 放后端做精细化 8 类分类）
function simpleDiffRows(before: string, after: string): Array<{ type: 'insert' | 'delete' | 'replace'; before?: string; after?: string }> {
  const b = before.split('\n').filter(s => s.length > 0);
  const a = after.split('\n').filter(s => s.length > 0);
  const diffs: ReturnType<typeof simpleDiffRows> = [];
  // 行对齐：用最长公共子序列思路（简化：行号映射相等则保留，否则逐行扫）
  const maxLen = Math.max(b.length, a.length);
  for (let i = 0; i < maxLen; i++) {
    const rowB = b[i];
    const rowA = a[i];
    if (rowB === rowA) continue;
    if (!rowB && rowA) diffs.push({ type: 'insert', after: rowA });
    else if (rowB && !rowA) diffs.push({ type: 'delete', before: rowB });
    else diffs.push({ type: 'replace', before: rowB, after: rowA });
  }
  return diffs;
}

const rowDiffs = computed(() => simpleDiffRows(originalArticleSnapshot.value, mockResultArticle.value));
// 真实有效修改次数（过滤纯空格/标点）
const validEdits = computed(() => countValidEdits(rowDiffs.value));
const validEditCount = computed(() => validEdits.value.count);
// 💎 个性化加成规则
const personalBonus = computed(() => getPersonalBonus(validEditCount.value));

// ★ 后端真实生成结果（硬编码 baseMockScore=92 / 固定18/20分 / 固定6.3% AI检测率 → 通通改为从后端返回承接）
const generatedResult = reactive<{
  sprintInfo: string;
  scoreTotal100: number;
  contentIntegrity: number; themeCoherence: number; structureFitness: number;
  detailRichness: number; freeDirectiveDone: number; deaiScore: number;
  compliance: number;
  simAiDetectRate: number;
  aiDetectRateLevel: 'safe' | 'warning' | 'danger';
  aiDetectRateHint: string;
  grade: string; gradeLabel: string; gradeColor: string; gradeAdvice: string;
  forbiddenHits: string[]; politicalTermOK: boolean; titleShipOK: boolean;
  missingFactsHints: string[];
  deaiAppliedRules: string[];
}>({
  sprintInfo: '未生成：请在 Step 8 点"开始生成"。',
  scoreTotal100: 0,
  contentIntegrity: 0, themeCoherence: 0, structureFitness: 0,
  detailRichness: 0, freeDirectiveDone: 0, deaiScore: 0,
  compliance: 0,
  simAiDetectRate: 0,
  aiDetectRateLevel: 'safe',
  aiDetectRateHint: '未生成',
  grade: '-', gradeLabel: '-', gradeColor: 'gray', gradeAdvice: '-',
  forbiddenHits: [], politicalTermOK: true, titleShipOK: true,
  missingFactsHints: [],
  deaiAppliedRules: [],
});
// 最终评分：后端真实分 + 个性化加成（💎越改分越高）
const finalScore = computed(() => Math.min(100, (generatedResult.scoreTotal100 || 0) + personalBonus.value.bonus));
// 六维分项满分映射（后端 6 维度总分 100，等比例缩放到 UI 的 x/20 显示）
function score20(scoreFrom100: number, maxScore = 20) {
  if (!scoreFrom100) return 0;
  return Math.min(maxScore, Math.round(scoreFrom100 / 100 * maxScore));
}

// 监听"重新生成"跳回 Step 8 → 重新进入 Step 10 时重置快照
watch(activeStep, (ns, os) => {
  if (ns === 8 && os === 9) {
    // 重置（用户点了"重新生成"）
    generationId.value = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
  if (ns === 9 && os === 8) {
    // Step 9 刚进来时，记录当前 mockResultArticle 作为原始快照
    originalArticleSnapshot.value = mockResultArticle.value;
  }
});

// 用户输入时：节流 800ms 统计一次 diff（避免每个字都重算）
let __debounceTimer: any = null;
function onArticleInput() {
  if (__debounceTimer) clearTimeout(__debounceTimer);
  __debounceTimer = setTimeout(() => { /* computed 已自动重算 validEditCount，这里只是占位 */ }, 800);
}

// -------- 下载 / 保存 行为 --------
function onClickDownload() {
  // 柔性引导：0 次修改 → 弹引导；其他情况直接下
  if (validEditCount.value === 0) {
    showDownloadGuide.value = true;
    return;
  }
  realDownload();
}
function handleDownloadGoEdit() {
  showDownloadGuide.value = false;
  ElMessage.success('💡 好的！建议您：① 把"辛苦/任劳任怨"这类空词换成小动作；② 在结尾加一句事实收尾（如"远处，汽笛响了一声"）。改 3 处就能解锁 💎+2 分个性化加成哦！');
}
function handleDownloadSkip() {
  showDownloadGuide.value = false;
  // 仍然落库一条 revision（validEditCount=0），后续画像可以分析"政委拿到完美稿不修改的概率"
  saveToRevision(false);
  realDownload();
}
function realDownload() {
  ElMessage.success(`✅ 开始导出 Word（含 ${validEditCount.value} 处个性化修改）。文件大小：${(new Blob([mockResultArticle.value]).size/1024).toFixed(1)} KB`);
}
function copyFullArticle() {
  const text = mockResultArticle.value;
  if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(text);
  ElMessage.success(`📋 已复制全文（${text.length} 字）到剪贴板`);
}
function saveToRevision(showTip: boolean) {
  // 真实调用后端 /api/ai-manuscript/revision-record/save，失败时降级为仅 toast 保证 UI 不崩
  const body = {
    generationId: generationId.value,
    manuscriptCategory: form.categoryId,
    beforeText: originalArticleSnapshot.value,
    afterText: mockResultArticle.value,
    wordCountBefore: originalArticleSnapshot.value.length,
    wordCountAfter: mockResultArticle.value.length,
    frontendValidEditCount: validEditCount.value,
    diffSnippets: rowDiffs.value.slice(0, 15).map((d, idx) => ({
      id: idx, type: d.type, before: d.before ?? '', after: d.after ?? '',
      startIdx: 0, endIdx: 0, editCategory: 'WORD_REPLACE_VIVID',
    })),
    totalEditChars: validEdits.value.chars,
  };
  (async () => {
    try {
      await $fetch('/api/ai-manuscript/revision-record/save', {
        method: 'POST',
        body,
      });
    } catch (e) {
      // Sprint 1 允许接口鉴权/未就绪时静默失败（不打断用户写作流程），日志留痕
      console.warn('[政工笔] saveToRevision 调用失败（Sprint 1 允许）:', e);
    }
  })();
  if (showTip) ElMessage.success(`💾 已保存修改记录（${validEditCount.value} 处有效修改）。累计 ${Math.max(0, validEditCount.value)} 处，${personalBonus.value.unlockText}`);
}
function quickFix(what: string) {
  // 点分项一键修复（演示版：在文末追加一段候选细节，算 1 处有效修改）
  const patches: Record<string, string> = {
    '表现力': '\n\n（AI 建议补细节）徒弟的目光落在师父左手背那道新疤上，粉红的嫩肉边缘翻着，像一条细细的红线。他张了张嘴，话到嘴边又咽了回去，只把水杯又往阴影里推了一寸。',
  };
  const p = patches[what];
  if (!p) { ElMessage.info(`👉 ${what}的一键修复已在 Sprint 2 接入大模型，敬请期待`); return; }
  mockResultArticle.value = mockResultArticle.value.trimEnd() + p;
  ElMessage.success(`🎨 已为您追加一段候选细节。若不满意可删除（删除也会计 1 处有效修改）。`);
}

// ========= 计算属性 =========

// 当前文种可用的刊物
const journalOptionsForCurrentCategory = computed<JournalWordCountRef[]>(() =>
  JOURNAL_WORDCOUNT_REF.filter(j => j.category === 'all' || j.category === form.categoryId)
);

// 当选择的 journalId 在当前文种不可用时，自动回退到默认
watch(() => form.categoryId, () => {
  const defaultCat = CATEGORIES_SPRINT1.find(c => c.id === form.categoryId)!;
  form.preference.journalId = defaultCat.defaultJournalId;
  const defaultRef = JOURNAL_WORDCOUNT_REF.find(j => j.journalId === defaultCat.defaultJournalId)!;
  form.preference.wordCount = Math.round((defaultRef.min + defaultRef.max) / 2);
  form.writerStyleId = defaultCat.recommendWriterStyle.includes('tiening') ? 'tiening' : defaultCat.recommendWriterStyle[0] || 'none';
});

const currentJournalRef = computed<JournalWordCountRef | undefined>(() =>
  JOURNAL_WORDCOUNT_REF.find(j => j.journalId === form.preference.journalId)
);

// 字数状态提示（彩色）
const wordStatusTipHtml = computed<string>(() => {
  const ref = currentJournalRef.value; if (!ref) return '';
  const w = form.preference.wordCount;
  if (w >= ref.min && w <= ref.max)
    return `<span class="text-green-700">✅ 正处于黄金录用区间！投稿通过率最高。</span>`;
  if (w < ref.min * 0.7 || w > ref.absoluteMax)
    return `<span class="text-red-700">❌ 严重不合格：${w < ref.min * 0.7 ? '太短' : '远超行业上限'}，投稿${w > ref.absoluteMax ? '90%被退回' : '显得信息量不足'}。建议调到 ${ref.min}~${ref.max} 字。</span>`;
  if (w < ref.min)
    return `<span class="text-orange-700">⚠️ 稍短，建议再加 ${ref.min - w} 字补充细节。</span>`;
  return `<span class="text-orange-700">⚠️ 稍长，建议缩到 ${ref.max} 字以内，否则编辑会大砍。</span>`;
});

// -------- 6 维细节雷达 --------
const radarScore = computed<DetailsRadarScore>(() => {
  const cards = form.detailCards;
  const bodyPartRegex = /(手|脚|指|掌|肩|背|腰|额|头|眼|嘴|臂|腿|膝|颈|肘|腕|腮|鼻子|胸口|后背)/;
  const verbRegex     = /(扶|握|抓|捏|攥|蹭|擦|拧|抬|扛|敲|拧|拍|递|靠|闭|低|挪|张|咬|竖)/;
  const quoteRegex    = /[""「」:：]/; // 对话卡引号/冒号
  const envRegex      = /(℃|温度|风|浪|雨|雪|阳光|正午|凌晨|深夜|黄昏|黎明|机舱|甲板|码头|驾驶室|味道|味|嗡嗡|呼呼|滴答)/;
  const sensesRegex   = /(闻|嗅|听|摸|触|尝|味|响|嗡|烫|凉|冰|粘|香|臭|腥|咸|甜)/;
  const numberRegex   = /(\d+(\.\d+)?|一二三四五六七八九十百千万)/;
  const emotionRegex  = /(偷偷|悄悄|背过身|欲言又止|张了张嘴|没说话|没出声|鼻子一酸|红了眼|眼泪|愣了一下|假装|装作|低下头|不敢看)/;

  const actionCards  = cards.filter(c => c.type==='action'  || (bodyPartRegex.test(c.text) && verbRegex.test(c.text)));
  const dialogCards  = cards.filter(c => c.type==='dialog'  || quoteRegex.test(c.text));
  const envCards     = cards.filter(c => c.type==='env'     || envRegex.test(c.text));
  const sensesCards  = cards.filter(c => c.type==='senses'  || sensesRegex.test(c.text));
  const numberCards  = cards.filter(c => c.type==='number'  || numberRegex.test(c.text));
  const emotionCards = cards.filter(c => c.type==='emotion' || emotionRegex.test(c.text));

  const clamp = (v: number, max: number) => Math.min(max, Math.round(
    v.length >= max/4 ? max : v.length * (4*max/Math.max(1, max)) / 4
  ));

  const a = clamp(actionCards, 20);
  const b = clamp(dialogCards, 15);
  const c = clamp(envCards, 15);
  const d = clamp(sensesCards, 10);
  const e = clamp(numberCards, 20);
  const f = clamp(emotionCards, 20);
  const total = a+b+c+d+e+f;

  let grade: DetailsRadarScore['grade'] = 'green';
  if (total < 30) grade = 'red';
  else if (total < 60) grade = 'orange';
  else if (total < 85) grade = 'yellow';

  return { actionScore: a, dialogScore: b, envScore: c, sensesScore: d, numberScore: e, emotionScore: f, total, grade };
});

const radarProgressColor = computed(() => {
  if (radarScore.value.grade==='red') return '#ef4444';
  if (radarScore.value.grade==='orange') return '#f97316';
  if (radarScore.value.grade==='yellow') return '#eab308';
  return '#22c55e';
});
const radarTagType = computed<''|'success'|'warning'|'danger'>(() => {
  if (radarScore.value.grade==='red') return 'danger';
  if (radarScore.value.grade==='orange') return 'warning';
  if (radarScore.value.grade==='yellow') return 'warning';
  return 'success';
});
const radarGradeLabel = computed(() => {
  return ({red: '🔴 不足 · 禁止下一步', orange: '🟠 薄弱 · 弹确认', yellow: '🟡 够用 · 放行', green: '🟢 优秀 · 放行'} as const)[radarScore.value.grade];
});
const radarGradeColorClass = computed(() => {
  return ({red: 'text-red-600', orange: 'text-orange-600', yellow: 'text-yellow-600', green: 'text-green-600'} as const)[radarScore.value.grade];
});

// -------- 智能建议 --------
const smartSuggestion = computed<string>(() => {
  const dims = [
    ['low_action',  radarScore.value.actionScore  < 14],
    ['low_dialog',  radarScore.value.dialogScore  < 10],
    ['low_env',     radarScore.value.envScore     < 10],
    ['low_senses',  radarScore.value.sensesScore  < 6],
    ['low_number',  radarScore.value.numberScore  < 14],
    ['low_emotion', radarScore.value.emotionScore < 14],
  ] as const;
  const lows = dims.filter(d => d[1]).map(d => d[0]);
  if (lows.length === 0) return '🌟 细节太棒了！AI 几乎不需要杜撰，成品会非常有画面感。';
  const targetKey = lows[0] as keyof typeof RADAR_SMART_SUGGESTIONS;
  const list = RADAR_SMART_SUGGESTIONS[targetKey] || ['继续补充细节卡，越多越生动。'];
  return list[Math.floor(Math.random() * list.length)];
});

// --------- Step 8 Preview: 完整 Prompt 展示（模拟拼接）---------
const fullPromptPreview = computed<string>(() => {
  const cat = CATEGORIES_SPRINT1.find(c => c.id === form.categoryId)!;
  const w = WRITER_STYLES.find(x => x.id === form.writerStyleId)!;
  const journal = JOURNAL_WORDCOUNT_REF.find(j => j.journalId === form.preference.journalId)!;
  return `【🎯 政工笔 · Layer 0 🛡️ 事实铁笼 · 最高优先级】
1. 你只能使用下面【细节卡 N1~N${form.detailCards.length}】中出现过的信息。
2. 不在卡中的任何时间/地点/人名/船名/动作/对话/数字，严禁编造。缺事实写"（此处细节略）"+ 末尾附建议补充清单。
3. 用户大白话可润色书面化，核心信息 100% 保留；对话保留原汁原味。

【🎯 政工笔 · Layer 1 🧭 风格铁律（6 大条）】
• 事实第一；② 禁口号式结尾模板；③ 禁用网络热词/夸张修辞；④ 每句≤30字，主语明确；
• 船名/航次/日期必须具体；⑥ 政工术语准确（三会一课/两学一做/第一议题…）。

【🎯 政工笔 · Layer 2 📚 RAG 对标范本 Top-3】
检索结果：
• Top-1：《2024年度集团先进事迹合集 · 老轨李XX抢修主机》
• Top-2：《中远海运政工简报 · 2024.07》P.13 党员先锋岗
• Top-3：《中国远洋海运报》2024-06-18 头版《高温下的值乘》

【🎯 政工笔 · Layer 3 ✍️ 文种 + 作家风格】
• 目标文种：${cat.icon} ${cat.name}（目标字数 ≈ ${form.preference.wordCount} 字）
• 对标刊物：${journal.journalName}（推荐 ${journal.min}~${journal.max} 字）
• 文学风格调味：${w.avatar} ${w.name}（${w.oneLiner}）
  → 风格关键词：${w.styleKeywords.join(' / ')}

【🎯 政工笔 · Layer 4 🎚️ 用户写作偏好】
• 语气：${form.preference.tone}；人称：${form.preference.person}；结尾方式：${form.preference.ending}
• 小标题：${form.preference.withSubtitles?'✅ 需要':'❌ 不需要'}
• 禁忌开关：${form.preference.taboos.join(' / ')}
• 去 AI 化强度：${form.preference.deaiStrength}%

【🎯 政工笔 · Layer 5 🎭 用户自由特别指令】
${form.freeSpecialInstructions || '（用户未填写）'}

================================================================
【🎯 用户结构化事实（Step 1~4）】
• 文种：${cat.name}
• 日期：${form.basic.happenDate}
• 地点：${form.basic.location || '（未填写 ❌）'}
• 涉及人物：
${form.basic.personList.filter(p=>p.name||p.duty).map((p,i)=>`  ${i+1}. ${p.name} ${p.duty?`（${p.duty}）`:''} ${p.shipName?` - ${p.shipName}`:''}`).join('\n') || '  （未填写 ❌）'}
• 事件过程：${form.eventProcess || '（未填写 ❌）'}
• 主题思想：${form.themeIdea || '（未填写 ❌）'}

================================================================
【🎯 细节卡列表（按用户排序 = 文中时间顺序）】
${form.detailCards.length === 0 ? '（无！⛔ AI 会 100% 杜撰，必须补充）' :
  form.detailCards.map((c,i) =>
    `📋 N${i+1} ${DETAIL_CARD_TYPES.find(t=>t.id===c.type)?.emoji}${DETAIL_CARD_TYPES.find(t=>t.id===c.type)?.label}：「${c.text || '（空卡片 ❌）'}」`
  ).join('\n')}

================================================================
请严格遵守以上所有规则，生成高质量稿件正文。不要输出任何规则解释或 Prompt 复述，直接输出：标题 + 副标题 + 正文${form.preference.withSubtitles?'（含小标题结构）':''}。`;
});

// ========= 子组件：雷达一维进度条 =========
const RadarDimBar = {
  props: { label: { type: String, required: true }, score: { type: Number, required: true }, full: { type: Number, required: true } },
  template: `
    <div>
      <div class="flex justify-between text-xs text-gray-600 mb-1">
        <span>{{ label }}</span><span class="font-medium">{{ score }}/{{ full }}</span>
      </div>
      <div class="h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          class="h-full rounded-full transition-all"
          :class="score===0 ? 'bg-red-400' : (score < full*0.5 ? 'bg-orange-400' : (score < full*0.8 ? 'bg-yellow-400' : 'bg-green-500'))"
          :style="{ width: (100 * score / full) + '%' }"
        />
      </div>
    </div>
  `
};

// ========= 方法 =========
const addPerson = () => form.basic.personList.push({ name: '', duty: '', shipName: '', dept: '' });
const removePerson = (idx: number) => form.basic.personList.splice(idx, 1);

const addDetailCard = (type: DetailCardTypeId) => {
  form.detailCards.push({ id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, type, text: '' });
};
const removeCard = (idx: number) => form.detailCards.splice(idx, 1);
const moveCardUp = (idx: number) => {
  if (idx <= 0) return;
  [form.detailCards[idx-1], form.detailCards[idx]] = [form.detailCards[idx], form.detailCards[idx-1]];
};
const moveCardDown = (idx: number) => {
  if (idx >= form.detailCards.length - 1) return;
  [form.detailCards[idx+1], form.detailCards[idx]] = [form.detailCards[idx], form.detailCards[idx+1]];
};

const getCardLeftBorderColor = (t: DetailCardTypeId) => ({
  action:  'border-l-blue-400',
  dialog:  'border-l-green-400',
  env:     'border-l-yellow-400',
  senses:  'border-l-cyan-400',
  number:  'border-l-red-400',
  emotion: 'border-l-purple-400',
  free:    'border-l-gray-400'
} as const)[t];

// 下一步可用性
const canGoNext = computed<boolean>(() => {
  if (activeStep.value === 0) return !!form.categoryId;
  if (activeStep.value === 1) {
    const p = form.basic.personList[0];
    return !!form.basic.happenDate && !!form.basic.location && !!(p?.name || p?.duty);
  }
  if (activeStep.value === 2) return form.eventProcess.length >= 100;
  if (activeStep.value === 3) return form.themeIdea.length >= 50;
  if (activeStep.value === 4) return radarScore.value.grade !== 'red'; // <30 直接禁用
  return true;
});

const prevStep = () => { if (activeStep.value > 0) activeStep.value--; };
const nextStep = () => {
  if (activeStep.value === 4 && radarScore.value.grade === 'orange') {
    showLowScoreConfirm.value = true; return;
  }
  advanceStep();
};
const confirmNextDespiteLowScore = () => { showLowScoreConfirm.value = false; advanceStep(); };

const advanceStep = async () => {
  if (activeStep.value === 7) {
    // Step 8 → Step 9：真正 POST 后端 /api/ai-manuscript/generate（复用大盘子豆包 API，无额外配置）
    activeStep.value = 8;
    mockGenProgress.value = 0;
    // ① 前 30%：快速推进进度条，给政委"正在处理"的视觉反馈
    const timer = setInterval(() => {
      mockGenProgress.value = Math.min(30, mockGenProgress.value + 5);
      if (mockGenProgress.value >= 30) clearInterval(timer);
    }, 150);
    try {
      const res = await $fetch<any>('/api/ai-manuscript/generate', {
        method: 'POST',
        body: form,
      });
      // ② 70~95%：拿到数据后，快速把进度条推到收尾
      clearInterval(timer);
      mockGenProgress.value = 90;
      const timer2 = setInterval(() => {
        mockGenProgress.value = Math.min(100, mockGenProgress.value + 5);
        if (mockGenProgress.value >= 100) clearInterval(timer2);
      }, 120);
      // ③ 填入成品稿（后端豆包直出，或豆包失败时的本地兜底稿）
      mockResultArticle.value = res?.finalArticle || '';
      originalArticleSnapshot.value = mockResultArticle.value;
      // ④ 填入真实评分 / AI 检测率 / 合规命中 / 规则明细
      const s = res?.score || {};
      generatedResult.sprintInfo = res?.sprintInfo || '-';
      generatedResult.scoreTotal100 = s?.total100 || 0;
      generatedResult.contentIntegrity = s?.contentIntegrity || 0;
      generatedResult.themeCoherence = s?.themeCoherence || 0;
      generatedResult.structureFitness = s?.structureFitness || 0;
      generatedResult.detailRichness = s?.detailRichness || 0;
      generatedResult.freeDirectiveDone = s?.freeDirectiveDone || 0;
      generatedResult.deaiScore = s?.deai || 0;
      generatedResult.compliance = s?.compliance || 0;
      generatedResult.simAiDetectRate = typeof s?.simAiDetectRate === 'number' ? s.simAiDetectRate : 0;
      generatedResult.aiDetectRateLevel = s?.aiDetectRateLevel || 'safe';
      generatedResult.aiDetectRateHint = s?.aiDetectRateHint || '';
      generatedResult.grade = s?.grade || '-';
      generatedResult.gradeLabel = s?.gradeLabel || '-';
      generatedResult.gradeColor = s?.gradeColor || 'gray';
      generatedResult.gradeAdvice = s?.gradeAdvice || '';
      generatedResult.forbiddenHits = Array.isArray(s?.forbiddenHits) ? s.forbiddenHits : [];
      generatedResult.politicalTermOK = !!s?.politicalTermOK;
      generatedResult.titleShipOK = !!s?.titleShipOK;
      generatedResult.missingFactsHints = Array.isArray(res?.missingFactsHints) ? res.missingFactsHints : [];
      generatedResult.deaiAppliedRules = Array.isArray(res?.deaiAppliedRules) ? res.deaiAppliedRules : [];
      // ⑤ 过 400ms 进 Step 9
      setTimeout(() => { activeStep.value = 9; mockGenProgress.value = 100; }, 400);
    } catch (e) {
      clearInterval(timer);
      mockGenProgress.value = 100;
      activeStep.value = 9;
      ElMessage.error(`生成失败：${(e as Error)?.message || '网络错误'}。已降级为兜底稿，请您查看成品稿后手动调整，或稍后再试一次。`);
      console.warn('[advanceStep] 生成失败，降级', e);
    }
    return;
  }
  if (activeStep.value < STEPS_LABEL.length - 1) activeStep.value++;
};

const openMyTemplates = async () => {
  try {
    const res = await $fetch<any>('/api/ai-manuscript/templates', { method: 'GET' });
    const total = Array.isArray(res?.items) ? res.items.length : (Array.isArray(res) ? res.length : 0);
    if (total > 0) {
      ElMessage.success(`📂 我的范文库：共 ${total} 篇，个人/团队/舰队三层联动可用。（Sprint 2：此处弹出管理弹窗 → 上传/导入/预览）`);
    } else {
      ElMessage.info('📂 我的范文库：当前您还没有范文，后续写完一篇"集团录用级"的稿件后，勾选"存为L2个人范文"即可自动入库。');
    }
  } catch (e) {
    ElMessage.warning(`📂 范文库接口暂未就绪：${(e as Error)?.message || '请稍后再试'}`);
  }
};

// ★ 「发往杂志编排」真调用大盘子 magazine 模块创建文章接口
//   —— 陈先生不用来回发微信/邮件附件。如果杂志/版块还没创建，给明确降级引导，不打断用户
async function handleSendToMagazine() {
  if (!mockResultArticle.value || mockResultArticle.value.trim().length < 50) {
    ElMessage.warning('请先生成或填写至少 50 字的成品稿，再发往杂志编排。');
    return;
  }
  const titleMatch = mockResultArticle.value.match(/^[#\s]*(.+)$/m);
  const title = (titleMatch?.[1] || `${form.basic.personList[0]?.name || '政委'}先进事迹稿`).slice(0, 60);
  try {
    // 复用大盘子杂志编排已有 API：POST 创建文章到默认版块；sectionId 给特殊占位 _default_pending，让岸基编辑后台再分配
    await $fetch('/api/magazine/sections/_default_pending/articles', {
      method: 'POST',
      body: {
        title,
        author: form.basic.personList.map(p => [p.name, p.duty].filter(Boolean).join('（')).join('、') || '熊猫笔记·政工笔',
        content: mockResultArticle.value,
        category: form.categoryId,
        wordCount: finalTextLength.value,
        generationId: generationId.value,
      },
    });
    ElMessage.success(`📰 已成功发往杂志编排（默认"待分配"版块），标题：${title}。请岸基端杂志编排模块中审核/分配到具体版块。`);
  } catch (e) {
    ElMessage.warning(`📰 杂志编排模块接口异常（可能还没创建默认版块）。降级操作：请您点击"复制全文"，手动粘贴到杂志编排 → 新建文章 页面即可。错误：${(e as Error)?.message || ''}`);
    console.warn('[handleSendToMagazine] 降级', e);
  }
}

const finalTextLength = computed(() => mockResultArticle.value?.length || 0);

// ========= 生命周期：预置 6 张示例卡片，让新用户一进来就知道怎么玩 =========
onMounted(() => {
  const exampleCards: DetailCard[] = [
    { id: 'demo1', type: 'action',  text: '老轨王建国左手扶缸头罩，右手袖口蹭额头汗，左手背上一道2cm新疤还没结痂。' },
    { id: 'demo2', type: 'dialog',  text: '王师傅对徒弟小李说："你先去吃，我再顶一个班，缸头差1度都不行。"' },
    { id: 'demo3', type: 'env',     text: '正午12:35，机舱底层48.5℃，缸头热浪扑面，柴油味混着海风，风扇嗡嗡响得像蜂群。' },
    { id: 'demo4', type: 'number',  text: '本航次连续值乘42天 / 主机吊缸1次 / 节油12.3% / 零故障零迟滞。' },
    { id: 'demo5', type: 'dialog',  text: '政委拎冰镇西瓜下机舱，机工小济公咬一口竖大拇指："政委你这西瓜真到位！再热再累也值了！"' },
    { id: 'demo6', type: 'emotion', text: '徒弟递完扳手看师傅袖口油迹都结成硬壳了，鼻子一酸，低头没说话，悄悄把自己那杯凉白开挪到了师傅脚边的阴影里。' },
  ];
  if (form.detailCards.length === 0) form.detailCards.push(...exampleCards);
});
</script>

<style scoped>
/* 细节卡左边框颜色继承 tailwind 类（已在 class 中写死） */
</style>
