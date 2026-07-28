<template>
  <el-dialog
    v-model="dialogVisible"
    title="新增船舶"
    width="600px"
    @close="handleClose"
  >
    <el-form :model="form" label-width="100px">
      <el-form-item label="中文船名">
        <el-input v-model="form.cnShipName" />
      </el-form-item>
      <el-form-item label="英文船名">
        <el-input v-model="form.enShipName" />
      </el-form-item>
      <el-form-item label="船旗国">
        <el-input v-model="form.flagCountry" />
      </el-form-item>
      <el-form-item label="船籍港">
        <el-input v-model="form.portRegistry" />
      </el-form-item>
      <el-form-item label="船型">
        <el-input v-model="form.shipType" />
      </el-form-item>
      <el-form-item label="载重吨">
        <el-input v-model="form.deadweightTonnage" />
      </el-form-item>
      <el-form-item label="出厂时间">
        <el-input v-model="form.factoryDate" placeholder="如：2020" />
      </el-form-item>
      <el-form-item label="所属团队">
        <el-input v-model="form.teamDisplayName" />
      </el-form-item>
      <el-form-item label="海务主管">
        <el-input v-model="form.marineSupervisor" />
      </el-form-item>
      <el-form-item label="机务主管">
        <el-input v-model="form.engineerSupervisor" />
      </el-form-item>
      <el-form-item label="电气主管">
        <el-input v-model="form.electricSupervisor" />
      </el-form-item>
      <el-form-item label="船工主管">
        <el-input v-model="form.crewSupervisor" />
      </el-form-item>
      <el-form-item label="船舶政委">
        <el-input v-model="form.politicalInstructor" />
      </el-form-item>
      <el-form-item label="政委身份证号">
        <el-input v-model="form.instructorIdNumber" placeholder="18位身份证号" maxlength="18" />
      </el-form-item>
      <el-form-item label="上船时间">
        <el-input v-model="form.onBoardDate" />
      </el-form-item>
      <el-form-item label="在船天数">
        <el-input v-model="form.daysOnBoard" />
      </el-form-item>
      <el-form-item label="派员公司">
        <el-input v-model="form.sendCompany" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Ship } from '~/types'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': [ship: Partial<Ship>]
}>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const form = ref<Partial<Ship>>({})

const handleClose = () => {
  form.value = {}
}

const handleSave = () => {
  emit('save', { ...form.value })
}
</script>
