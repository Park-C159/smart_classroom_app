<template>
  <div class="question-bank">
    <div class="page-header">
      <h2><el-icon><Collection /></el-icon> 题库管理</h2>
      <el-button type="primary" @click="$router.push('/teacher/exercises/upload')">
        <el-icon><Upload /></el-icon> 上传习题
      </el-button>
    </div>

    <div class="cards-row">
      <div class="stat-card"><div class="stat-value">{{ stats.total || '--' }}</div><div class="stat-label">全部习题</div></div>
      <div class="stat-card"><div class="stat-value">{{ stats.textbook || '--' }}</div><div class="stat-label">教材习题</div></div>
      <div class="stat-card"><div class="stat-value">{{ stats.teacher || '--' }}</div><div class="stat-label">教师上传</div></div>
      <div class="stat-card"><div class="stat-value">{{ stats.calculation_proof || '--' }}</div><div class="stat-label">计算/证明题</div></div>
    </div>

    <div class="card">
      <div class="card-title">
        <i class="fas fa-list"></i> 习题列表
        <span style="font-weight:400;font-size:13px;color:#94a3b8;margin-left:8px">({{ total }} 题)</span>
      </div>

      <!-- Filters -->
      <div class="filters">
        <el-select v-model="filterType" placeholder="题型" clearable size="small" style="width:120px">
          <el-option label="选择题" value="choice" />
          <el-option label="填空题" value="fill" />
          <el-option label="计算题" value="calculation" />
          <el-option label="证明题" value="proof" />
        </el-select>
        <el-select v-model="filterSource" placeholder="来源" clearable size="small" style="width:120px">
          <el-option label="教材" value="textbook" />
          <el-option label="教师" value="teacher" />
        </el-select>
        <el-select v-model="filterDiff" placeholder="难度" clearable size="small" style="width:100px">
          <el-option v-for="n in 5" :key="n" :label="'⭐'.repeat(n)" :value="n" />
        </el-select>
        <el-button size="small" @click="loadExercises">筛选</el-button>
      </div>

      <div v-if="exercises.length === 0" class="empty-state">
        <el-icon :size="40" color="#cbd5e1"><Folder /></el-icon>
        <p>教材解析和教师上传的习题将在这里统一管理</p>
        <p class="hint">每道题关联知识点 · 按难度分类 · 组卷自动调用</p>
      </div>

      <div v-else>
        <div v-for="ex in exercises" :key="ex.id" class="ex-item">
          <div class="ex-header">
            <el-tag size="small" :type="ex.source === 'textbook' ? '' : 'success'">{{ ex.source === 'textbook' ? '教材' : '教师' }}</el-tag>
            <el-tag size="small" type="info">{{ ex.question_type }}</el-tag>
            <span class="ex-diff">{{ '⭐'.repeat(ex.difficulty) }}</span>
            <span class="ex-kp">{{ ex.kp_id }}</span>
          </div>
          <div class="ex-question">{{ ex.question_text }}</div>
          <div v-if="ex.answer_text" class="ex-answer">
            <strong>答案：</strong>{{ ex.answer_text }}
          </div>
        </div>
      </div>

      <el-pagination v-if="total > pageSize" style="margin-top:16px;justify-content:center"
        layout="prev,next" :total="total" :page-size="pageSize"
        v-model:current-page="page" @current-change="loadExercises" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { documentsAPI } from '@/api/documents'

const stats = ref({})
const exercises = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const filterType = ref('')
const filterSource = ref('')
const filterDiff = ref('')

onMounted(async () => {
  try { stats.value = await documentsAPI.getExerciseStats() } catch {}
  loadExercises()
})

async function loadExercises() {
  try {
    const r = await documentsAPI.getExercises({
      page: page.value,
      page_size: pageSize.value,
      question_type: filterType.value || undefined,
      source: filterSource.value || undefined,
      difficulty: filterDiff.value || undefined,
    })
    exercises.value = r.data || []
    total.value = r.total || 0
  } catch {}
}

watch([filterType, filterSource, filterDiff], () => { page.value = 1; loadExercises() })
</script>

<style scoped>
.question-bank { padding: 24px; height: 100%; overflow-y: auto; max-width: 1100px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { display: flex; align-items: center; gap: 8px; font-size: 20px; color: #0b1e33; margin: 0; }

.cards-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; border-radius: 12px; padding: 20px; border: 1px solid #eef2f6; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.stat-value { font-size: 28px; font-weight: 700; color: #3b82f6; }
.stat-label { font-size: 13px; color: #94a3b8; margin-top: 4px; }

.card { background: #f8fafc; border-radius: 16px; padding: 20px 24px; border: 1px solid #eef2f6; }
.card-title { font-weight: 600; font-size: 16px; margin-bottom: 16px; color: #0b1e33; display: flex; align-items: center; gap: 8px; }
.card-title i { color: #3b82f6; }

.filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }

.empty-state { text-align: center; padding: 40px 0; color: #94a3b8; }
.empty-state p { margin-top: 12px; font-size: 14px; }
.hint { font-size: 12px; color: #cbd5e1; margin-top: 4px; }

.ex-item { background: #fff; border: 1px solid #eef2f6; border-radius: 10px; padding: 14px; margin-bottom: 8px; }
.ex-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.ex-diff { font-size: 12px; }
.ex-kp { font-size: 12px; color: #3b82f6; margin-left: auto; }
.ex-question { font-size: 14px; color: #0b1e33; line-height: 1.6; }
.ex-answer { font-size: 13px; color: #64748b; margin-top: 6px; padding-top: 6px; border-top: 1px solid #f1f5f9; }

@media (max-width: 768px) { .cards-row { grid-template-columns: repeat(2, 1fr); } }
</style>
