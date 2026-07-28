<template>
  <div class="effect-settings">
    <el-collapse v-model="activeEffects">
      <!-- 首字下沉 -->
      <el-collapse-item title="首字下沉" name="dropCap">
        <el-form label-width="100px">
          <el-form-item>
            <el-switch v-model="style.dropCap.enabled" />
          </el-form-item>
          <el-form-item v-if="style.dropCap.enabled" label="下沉行数">
            <el-slider v-model="style.dropCap.lines" :min="2" :max="5" show-input />
          </el-form-item>
          <el-form-item v-if="style.dropCap.enabled" label="首字颜色">
            <el-color-picker v-model="style.dropCap.color" />
          </el-form-item>
        </el-form>
      </el-collapse-item>

      <!-- 图文绕排 -->
      <el-collapse-item title="图文绕排" name="imageWrap">
        <el-form label-width="100px">
          <el-form-item label="默认绕排方式">
            <el-radio-group v-model="style.imageWrap.defaultStyle">
              <el-radio label="left">文字在右</el-radio>
              <el-radio label="right">文字在左</el-radio>
              <el-radio label="full">全宽</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="图片与文字间距">
            <el-input-number v-model="style.imageWrap.margin" :min="5" :max="30" />
          </el-form-item>
          <el-form-item label="图片最大宽度">
            <el-slider v-model="style.imageWrap.maxWidth" :min="30" :max="100" :step="5" show-input />
          </el-form-item>
          <el-form-item label="显示图片说明">
            <el-switch v-model="style.imageWrap.captionEnabled" />
          </el-form-item>
        </el-form>
      </el-collapse-item>

      <!-- 引用区块 -->
      <el-collapse-item title="引用区块" name="quote">
        <el-form label-width="100px">
          <el-form-item>
            <el-switch v-model="style.quoteBlock.enabled" />
          </el-form-item>
          <el-form-item v-if="style.quoteBlock.enabled" label="边框颜色">
            <el-color-picker v-model="style.quoteBlock.borderColor" />
          </el-form-item>
          <el-form-item v-if="style.quoteBlock.enabled" label="边框宽度">
            <el-input-number v-model="style.quoteBlock.borderWidth" :min="1" :max="5" />
          </el-form-item>
          <el-form-item v-if="style.quoteBlock.enabled" label="背景颜色">
            <el-color-picker v-model="style.quoteBlock.backgroundColor" />
          </el-form-item>
          <el-form-item v-if="style.quoteBlock.enabled" label="内边距">
            <el-input-number v-model="style.quoteBlock.padding" :min="5" :max="20" />
          </el-form-item>
          <el-form-item v-if="style.quoteBlock.enabled" label="显示引号装饰">
            <el-switch v-model="style.quoteBlock.showMark" />
          </el-form-item>
        </el-form>
      </el-collapse-item>

      <!-- 页眉页脚 -->
      <el-collapse-item title="页眉页脚" name="headerFooter">
        <el-form label-width="100px">
          <el-form-item label="显示页眉">
            <el-switch v-model="style.headerFooter.showHeader" />
          </el-form-item>
          <el-form-item v-if="style.headerFooter.showHeader" label="页眉内容">
            <el-input v-model="style.headerFooter.headerText" placeholder="如：船舶政工" />
          </el-form-item>
          <el-form-item v-if="style.headerFooter.showHeader" label="页眉样式">
            <el-radio-group v-model="style.headerFooter.headerStyle">
              <el-radio label="plain">简洁</el-radio>
              <el-radio label="line">线条</el-radio>
              <el-radio label="shadow">阴影</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-divider />

          <el-form-item label="显示页脚">
            <el-switch v-model="style.headerFooter.showFooter" />
          </el-form-item>
          <el-form-item v-if="style.headerFooter.showFooter" label="显示页码">
            <el-switch v-model="style.headerFooter.showPageNumber" />
          </el-form-item>
          <el-form-item v-if="style.headerFooter.showFooter && style.headerFooter.showPageNumber" label="页码格式">
            <el-radio-group v-model="style.headerFooter.pageNumberFormat">
              <el-radio label="current">第 1 页</el-radio>
              <el-radio label="currentOfTotal">第 1 页 / 共 10 页</el-radio>
              <el-radio label="simple">1 / 10</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="style.headerFooter.showFooter" label="页脚内容">
            <el-input v-model="style.headerFooter.footerText" placeholder="自定义页脚文字" />
          </el-form-item>
        </el-form>
      </el-collapse-item>

      <!-- 分割线 -->
      <el-collapse-item title="分割线" name="dividers">
        <el-form label-width="100px">
          <el-form-item>
            <el-switch v-model="style.dividers.enabled" />
          </el-form-item>
          <el-form-item v-if="style.dividers.enabled" label="线条样式">
            <el-radio-group v-model="style.dividers.style">
              <el-radio label="solid">实线</el-radio>
              <el-radio label="dashed">虚线</el-radio>
              <el-radio label="dotted">点线</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="style.dividers.enabled" label="线条颜色">
            <el-color-picker v-model="style.dividers.color" />
          </el-form-item>
          <el-form-item v-if="style.dividers.enabled" label="线条粗细">
            <el-input-number v-model="style.dividers.thickness" :min="0.5" :max="3" :step="0.5" />
          </el-form-item>
          <el-form-item v-if="style.dividers.enabled" label="上下间距">
            <el-input-number v-model="style.dividers.spacing" :min="5" :max="20" />
          </el-form-item>
        </el-form>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface EffectStyle {
  dropCap: {
    enabled: boolean;
    lines: number;
    color: string;
  };
  imageWrap: {
    defaultStyle: 'left' | 'right' | 'center' | 'full';
    margin: number;
    maxWidth: number;
    captionEnabled: boolean;
    captionFontSize: number;
  };
  quoteBlock: {
    enabled: boolean;
    borderColor: string;
    borderWidth: number;
    backgroundColor: string;
    padding: number;
    showMark: boolean;
  };
  headerFooter: {
    showHeader: boolean;
    headerText: string;
    headerStyle: 'plain' | 'line' | 'shadow';
    showFooter: boolean;
    footerText: string;
    showPageNumber: boolean;
    pageNumberFormat: 'current' | 'currentOfTotal' | 'simple';
  };
  dividers: {
    enabled: boolean;
    style: 'solid' | 'dashed' | 'dotted';
    color: string;
    thickness: number;
    spacing: number;
  };
}

const props = defineProps<{
  modelValue: EffectStyle;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: EffectStyle): void;
}>();

const activeEffects = ref(['dropCap', 'imageWrap', 'quote', 'headerFooter', 'dividers']);

const style = ref<EffectStyle>({
  dropCap: {
    enabled: false,
    lines: 3,
    color: '#333333',
  },
  imageWrap: {
    defaultStyle: 'left',
    margin: 10,
    maxWidth: 60,
    captionEnabled: true,
    captionFontSize: 9,
  },
  quoteBlock: {
    enabled: false,
    borderColor: '#409EFF',
    borderWidth: 3,
    backgroundColor: '#f5f7fa',
    padding: 12,
    showMark: true,
  },
  headerFooter: {
    showHeader: true,
    headerText: '',
    headerStyle: 'plain',
    showFooter: true,
    footerText: '',
    showPageNumber: true,
    pageNumberFormat: 'currentOfTotal',
  },
  dividers: {
    enabled: true,
    style: 'solid',
    color: '#dcdfe6',
    thickness: 1,
    spacing: 10,
  },
});

// 初始化
if (props.modelValue) {
  style.value = { ...style.value, ...props.modelValue };
}

watch(
  style,
  (newVal) => {
    emit('update:modelValue', newVal);
  },
  { deep: true }
);
</script>

<style scoped>
.effect-settings {
  padding: 16px;
}

.effect-settings :deep(.el-collapse-item__header) {
  font-weight: 500;
  color: #303133;
}

.effect-settings :deep(.el-collapse-item__content) {
  padding-top: 16px;
}

.effect-settings :deep(.el-divider) {
  margin: 16px 0;
}
</style>
