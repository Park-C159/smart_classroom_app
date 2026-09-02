<template>
  <div class="class-analytics">
    <div class="page-header">
      <h2><el-icon><TrendCharts /></el-icon> 班级学情总览</h2>
      <div class="header-right">
        <el-input v-model="className" placeholder="输入班级名称" style="width:200px" @keyup.enter="loadData" />
        <el-button type="primary" @click="loadData" :loading="loading">查询</el-button>
      </div>
    </div>

    <div v-if="!data" class="card">
      <div class="empty-state">
        <el-icon :size="40" color="#cbd5e1"><Search /></el-icon>
        <p>请输入班级名称查询学情数据</p>
        <p class="hint">例：2024级数学1班</p>
      </div>
    </div>

    <template v-else>
      <div class="cards-row">
        <div class="stat-card"><div class="stat-value">{{ data.student_count }}</div><div class="stat-label">班级人数</div></div>
        <div class="stat-card"><div class="stat-value">{{ avgMastery }}%</div><div class="stat-label">平均掌握度</div></div>
        <div class="stat-card"><div class="stat-value">{{ totalQuestions }}</div><div class="stat-label">提问总数</div></div>
        <div class="stat-card"><div class="stat-value">{{ activeStudents }}</div><div class="stat-label">活跃学生</div></div>
      </div>

      <div class="card">
        <div class="card-title"><i class="fas fa-chart-bar"></i> 知识点掌握度分布</div>
        <div v-if="!data.kp_mastery_avg || data.kp_mastery_avg.length === 0" class="empty-state">
          <p>暂无知识点数据</p>
        </div>
        <div v-else class="kp-list">
          <div v-for="kp in data.kp_mastery_avg" :key="kp.kp_id" class="kp-row">
            <span class="kp-title">{{ kp.kp_title || kp.kp_id }}</span>
            <div class="kp-bar-wrap">
              <div class="kp-bar" :style="{ width: (kp.avg_mastery * 100).toFixed(1) + '%' }"
                   :class="kp.avg_mastery >= 0.8 ? 'high' : kp.avg_mastery >= 0.5 ? 'mid' : 'low'"></div>
            </div>
            <span class="kp-val">{{ (kp.avg_mastery * 100).toFixed(0) }}%</span>
            <span class="kp-count">{{ kp.student_count }}人</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><i class="fas fa-user-graduate"></i> 学生排名</div>
        <div v-if="!data.students || data.students.length === 0" class="empty-state"><p>暂无学生数据</p></div>
        <el-table v-else :data="sortedStudents" style="width:100%" size="small">
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="real_name" label="姓名" />
          <el-table-column prop="username" label="用户名" />
          <el-table-column prop="total_questions" label="提问数" width="100" />
          <el-table-column label="掌握度" width="120">
            <template #default="{ row }">
              <el-progress :percentage="(row.avg_mastery * 100).toFixed(1)" :color="row.avg_mastery >= 0.7 ? '#22c55e' : row.avg_mastery >= 0.4 ? '#3b82f6' : '#f59e0b'" />
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import analyticsAPI from '@/api/analytics'

const className = ref('')
const data = ref(null)
const loading = ref(false)

const avgMastery = computed(() => {
  if (!data.value?.kp_mastery_avg?.length) return '--'
  const avg = data.value.kp_mastery_avg.reduce((s, k) => s + k.avg_mastery, 0) / data.value.kp_mastery_avg.length
  return (avg * 100).toFixed(0)
})
const totalQuestions = computed(() =>
  data.value?.students?.reduce((s, st) => s + st.total_questions, 0) || 0
)
const activeStudents = computed(() =>
  data.value?.students?.filter(s => s.total_questions > 0).length || 0
)
const sortedStudents = computed(() =>
  [...(data.value?.students || [])].sort((a, b) => b.avg_mastery - a.avg_mastery)
)

async function loadData() {
  if (!className.value.trim()) { ElMessage.warning('请输入班级名称'); return }
  loading.value = true
  try {
    data.value = await analyticsAPI.getClassAnalytics(className.value.trim())
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '查询失败')
    data.value = null
  } finally { loading.value = false }
}
</script>

<style scoped>
.class-analytics { padding: 24px; height: 100%; overflow-y: auto; max-width: 1100px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { display: flex; align-items: center; gap: 8px; font-size: 20px; color: #0b1e33; margin: 0; }
.header-right { display: flex; gap: 8px; }

.cards-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; border-radius: 12px; padding: 20px; border: 1px solid #eef2f6; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.stat-value { font-size: 28px; font-weight: 700; color: #3b82f6; }
.stat-label { font-size: 13px; color: #94a3b8; margin-top: 4px; }

.card { background: #f8fafc; border-radius: 16px; padding: 20px 24px; margin-bottom: 20px; border: 1px solid #eef2f6; }
.card-title { font-weight: 600; font-size: 16px; margin-bottom: 16px; color: #0b1e33; display: flex; align-items: center; gap: 8px; }
.card-title i { color: #3b82f6; }
.empty-state { text-align: center; padding: 40px 0; color: #94a3b8; }
.empty-state p { margin-top: 12px; font-size: 14px; }
.hint { font-size: 12px; color: #cbd5e1; margin-top: 4px; }

.kp-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
.kp-row:last-child { border-bottom: none; }
.kp-title { width: 160px; font-size: 13px; color: #0b1e33; flex-shrink: 0; }
.kp-bar-wrap { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
.kp-bar { height: 100%; border-radius: 4px; transition: width 0.5s; }
.kp-bar.high { background: #22c55e; }
.kp-bar.mid { background: #3b82f6; }
.kp-bar.low { background: #f59e0b; }
.kp-val { width: 40px; font-size: 13px; font-weight: 600; color: #0b1e33; text-align: right; }
.kp-count { width: 40px; font-size: 11px; color: #94a3b8; text-align: right; }

@media (max-width: 768px) { .cards-row { grid-template-columns: repeat(2, 1fr); } .header-right { flex-direction: column; } }
</style>
