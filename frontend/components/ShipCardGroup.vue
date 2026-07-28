<template>
  <div class="ship-card-group">
    <div class="filter-bar">
      <div class="filter-section">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索船名/位置/航次..."
          size="small"
          clearable
          class="filter-search"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select
          v-model="filters.company"
          placeholder="全部派员公司"
          size="small"
          clearable
          class="filter-select"
        >
          <el-option
            v-for="company in companies"
            :key="company"
            :label="company"
            :value="company"
          />
        </el-select>
        <el-select
          v-model="filters.series"
          placeholder="全部系列"
          size="small"
          clearable
          class="filter-select"
        >
          <el-option
            v-for="series in seriesList"
            :key="series"
            :label="series"
            :value="series"
          />
        </el-select>
        <el-select
          v-model="filters.marineSupervisor"
          placeholder="全部海务主管"
          size="small"
          clearable
          class="filter-select"
        >
          <el-option
            v-for="supervisor in marineSupervisors"
            :key="supervisor"
            :label="supervisor"
            :value="supervisor"
          />
        </el-select>
        <el-select
          v-model="filters.engineerSupervisor"
          placeholder="全部机务主管"
          size="small"
          clearable
          class="filter-select"
        >
          <el-option
            v-for="supervisor in engineerSupervisors"
            :key="supervisor"
            :label="supervisor"
            :value="supervisor"
          />
        </el-select>
        <el-select
          v-model="filters.ageRange"
          placeholder="全部船龄"
          size="small"
          clearable
          class="filter-select"
        >
          <el-option label="≤10年（新船）" value="new" />
          <el-option label="10-15年（中年船）" value="mid" />
          <el-option label="≥15年（老旧船）" value="old" />
        </el-select>
      </div>
      <div class="filter-actions">
        <el-button size="small" @click="resetFilters">
          <el-icon><Refresh /></el-icon>
          重置筛选
        </el-button>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat-card">
        <span class="stat-icon">🚢</span>
        <span class="stat-value">{{ totalShips }}</span>
        <span class="stat-label">总船舶</span>
      </div>
      <div class="stat-card stat-new">
        <span class="stat-icon">🟢</span>
        <span class="stat-value">{{ newShips }}</span>
        <span class="stat-label">新船(≤10年)</span>
      </div>
      <div class="stat-card stat-mid">
        <span class="stat-icon">🟡</span>
        <span class="stat-value">{{ midShips }}</span>
        <span class="stat-label">中年船</span>
      </div>
      <div class="stat-card stat-old">
        <span class="stat-icon">🔴</span>
        <span class="stat-value">{{ oldShips }}</span>
        <span class="stat-label">老旧船(≥15年)</span>
      </div>
    </div>

    <div class="groups-container">
      <div v-for="(companyGroup, companyName) in groupedShips" :key="companyName" class="company-group">
        <div class="company-header">
          🏢
          <span class="company-name">{{ companyName }}</span>
          <span class="company-count">({{ companyGroup.total }})</span>
        </div>

        <div class="series-list">
          <div
            v-for="(seriesGroup, seriesName) in companyGroup.series"
            :key="seriesName"
            class="series-group"
          >
            <div class="series-header">
              🚢
              <span class="series-name">{{ seriesName }}</span>
              <span class="series-count">({{ seriesGroup.length }})</span>
              <span v-if="seriesGroup.oldCount > 0" class="old-warning">
                ⚠️ {{ seriesGroup.oldCount }}艘老旧船
              </span>
            </div>

            <div class="cards-grid">
              <ShipCard
                v-for="ship in seriesGroup.ships"
                :key="ship.id"
                :ship="ship"
              />
            </div>
          </div>

          <div v-if="companyGroup.uncategorized.length > 0" class="series-group">
            <div class="series-header">
              📁
              <span class="series-name">未分类</span>
              <span class="series-count">({{ companyGroup.uncategorized.length }})</span>
            </div>
            <div class="cards-grid">
              <ShipCard
                v-for="ship in companyGroup.uncategorized"
                :key="ship.id"
                :ship="ship"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredShips.length === 0" class="empty-state">
        <el-icon class="empty-icon"><Search /></el-icon>
        <p class="empty-text">没有找到符合条件的船舶</p>
        <el-button size="small" type="primary" @click="resetFilters">清除筛选条件</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { Refresh, Search } from '@element-plus/icons-vue';
import type { Ship as ShipType } from '~/types';
import ShipCard from './ShipCard.vue';

const props = defineProps<{
  ships: ShipType[];
}>();

const filters = reactive({
  company: '',
  series: '',
  marineSupervisor: '',
  engineerSupervisor: '',
  ageRange: '',
});

const searchKeyword = ref('');

const companies = computed(() => {
  const set = new Set(props.ships.map((s) => s.sendCompany).filter(Boolean));
  return Array.from(set).sort();
});

const seriesList = computed(() => {
  const set = new Set(props.ships.map((s) => s.teamDisplayName).filter(Boolean));
  return Array.from(set).sort();
});

const marineSupervisors = computed(() => {
  const set = new Set(props.ships.map((s) => s.marineSupervisor).filter(Boolean));
  return Array.from(set).sort();
});

const engineerSupervisors = computed(() => {
  const set = new Set(props.ships.map((s) => s.engineerSupervisor).filter(Boolean));
  return Array.from(set).sort();
});

const getShipAge = (ship: ShipType) => {
  try {
    const year = parseInt(ship.factoryDate?.substring(0, 4) || '');
    if (!isNaN(year)) {
      return new Date().getFullYear() - year;
    }
  } catch {}
  return 0;
};

const filteredShips = computed(() => {
  return props.ships.filter((ship) => {
    // 关键词搜索（船名/位置/航次/派员公司/主管）
    if (searchKeyword.value) {
      const kw = searchKeyword.value.toLowerCase();
      const haystack = [
        ship.cnShipName,
        ship.enShipName,
        ship.currentLocation,
        ship.currentVoyage,
        ship.sendCompany,
        ship.marineSupervisor,
        ship.engineerSupervisor,
        ship.etaPort,
        ship.politicalInstructor,
        ship.politicalOfficerName,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(kw)) return false;
    }

    if (filters.company && ship.sendCompany !== filters.company) return false;
    if (filters.series && ship.teamDisplayName !== filters.series) return false;
    if (filters.marineSupervisor && ship.marineSupervisor !== filters.marineSupervisor) return false;
    if (filters.engineerSupervisor && ship.engineerSupervisor !== filters.engineerSupervisor) return false;

    if (filters.ageRange) {
      const age = getShipAge(ship);
      if (filters.ageRange === 'new' && age > 10) return false;
      if (filters.ageRange === 'mid' && (age < 10 || age >= 15)) return false;
      if (filters.ageRange === 'old' && age < 15) return false;
    }

    return true;
  });
});

const totalShips = computed(() => filteredShips.value.length);

const newShips = computed(() => filteredShips.value.filter((s) => getShipAge(s) <= 10).length);
const midShips = computed(() => filteredShips.value.filter((s) => getShipAge(s) > 10 && getShipAge(s) < 15).length);
const oldShips = computed(() => filteredShips.value.filter((s) => getShipAge(s) >= 15).length);

const groupedShips = computed(() => {
  const result: Record<string, { total: number; series: Record<string, { length: number; oldCount: number; ships: ShipType[] }>; uncategorized: ShipType[] }> = {};

  filteredShips.value.forEach((ship) => {
    const company = ship.sendCompany || '未分配公司';
    const series = ship.teamDisplayName || '';

    if (!result[company]) {
      result[company] = { total: 0, series: {}, uncategorized: [] };
    }

    result[company].total++;

    if (!series) {
      result[company].uncategorized.push(ship);
      return;
    }

    if (!result[company].series[series]) {
      result[company].series[series] = { length: 0, oldCount: 0, ships: [] };
    }

    result[company].series[series].length++;
    result[company].series[series].ships.push(ship);
    if (getShipAge(ship) >= 15) {
      result[company].series[series].oldCount++;
    }
  });

  Object.keys(result).forEach((company) => {
    result[company].uncategorized.sort((a, b) => (a.cnShipName || '').localeCompare(b.cnShipName || '', 'zh-CN'));
    Object.keys(result[company].series).forEach((series) => {
      result[company].series[series].ships.sort((a, b) => (a.cnShipName || '').localeCompare(b.cnShipName || '', 'zh-CN'));
    });
  });

  return result;
});

const resetFilters = () => {
  filters.company = '';
  filters.series = '';
  filters.marineSupervisor = '';
  filters.engineerSupervisor = '';
  filters.ageRange = '';
  searchKeyword.value = '';
};
</script>

<style scoped>
.ship-card-group {
  padding: 16px;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  gap: 12px;
  flex-wrap: wrap;
}

.filter-section {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  flex: 1;
}

.filter-search {
  width: 200px;
}

.filter-select {
  width: 150px;
}

.filter-search :deep(.el-input__wrapper),
.filter-select :deep(.el-select__wrapper) {
  height: 32px;
}

.filter-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.stats-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.stat-icon {
  font-size: 18px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2329;
}

.stat-label {
  font-size: 12px;
  color: #8f959e;
}

.stat-new .stat-value {
  color: #52c41a;
}

.stat-mid .stat-value {
  color: #faad14;
}

.stat-old .stat-value {
  color: #f5222d;
}

.groups-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.company-group {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.company-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e5e6eb;
  margin-bottom: 16px;
}

.company-header .el-icon {
  font-size: 18px;
  color: #1890ff;
}

.company-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
}

.company-count {
  font-size: 13px;
  color: #8f959e;
}

.series-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.series-group {
  background: #fafafa;
  border-radius: 8px;
  padding: 12px;
}

.series-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e5e6eb;
  margin-bottom: 12px;
}

.series-header .el-icon {
  font-size: 14px;
  color: #fa8c16;
}

.series-name {
  font-size: 14px;
  font-weight: 500;
  color: #4e5969;
}

.series-count {
  font-size: 12px;
  color: #8f959e;
}

.old-warning {
  font-size: 12px;
  color: #f5222d;
  margin-left: auto;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
}

.empty-icon {
  font-size: 48px;
  color: #d9d9d9;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
  color: #8f959e;
  margin: 0 0 16px;
}

@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .filter-section {
    justify-content: center;
  }

  .filter-select {
    width: 120px;
  }

  .stats-bar {
    justify-content: center;
  }

  .stat-card {
    padding: 8px 12px;
  }

  .stat-value {
    font-size: 16px;
  }

  .cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>