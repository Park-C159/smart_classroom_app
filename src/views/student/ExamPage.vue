<template>
  <div class="standalone-page">
    <StandaloneHeader title="组卷与测验" icon="fas fa-pen-fancy" />
    <main class="sa-body">
      <!-- 教师：Tab -->
      <div v-if="isTeacherOrAdmin" class="tab-bar">
        <button :class="['tab-btn', { active: teacherTab === 'gen' }]" @click="teacherTab = 'gen'">
          <i class="fas fa-plus-circle"></i> 组卷
        </button>
        <button :class="['tab-btn', { active: teacherTab === 'mine' }]" @click="teacherTab = 'mine'; loadTeacherPapers()">
          <i class="fas fa-list-check"></i> 我的试卷与批改
        </button>
        <div class="tab-actions">
          <el-button size="small" @click="$router.push('/teacher/test-bank')">
            <i class="fas fa-database"></i> 管理试题库
          </el-button>
        </div>
      </div>

      <!-- ============ 教师：组卷 ============ -->
      <template v-if="isTeacherOrAdmin && teacherTab === 'gen'">
        <div class="card">
          <div class="card-title"><i class="fas fa-plus-circle"></i> 生成试卷</div>
          <el-form label-width="90px">
            <el-form-item label="类型">
              <el-radio-group v-model="genForm.mode">
                <el-radio-button value="homework">作业</el-radio-button>
                <el-radio-button value="test">测试</el-radio-button>
                <el-radio-button value="exam">考试</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="试卷标题">
              <el-input v-model="genForm.title" placeholder="例：第五章 二次型 作业" />
            </el-form-item>
            <el-form-item label="指定班级">
              <el-select v-model="genForm.target_class" placeholder="选择班级" filterable style="width:220px">
                <el-option v-for="c in classes" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
            <el-form-item label="章节范围">
              <el-select v-model="genForm.chapter" placeholder="留空则全部章节" clearable filterable style="width:260px">
                <el-option v-for="ch in chapters" :key="ch" :label="ch" :value="ch" />
              </el-select>
            </el-form-item>
            <el-form-item label="难度范围">
              <el-slider v-model="genForm.diffRange" range :min="1" :max="5" style="max-width:320px" />
            </el-form-item>
            <el-form-item label="题目数量">
              <div class="count-row">
                <span class="count-item">选择 <el-input-number v-model="genForm.counts.choice" :min="0" :max="50" size="small" /></span>
                <span class="count-item">填空 <el-input-number v-model="genForm.counts.fill" :min="0" :max="50" size="small" /></span>
                <span class="count-item">简答 <el-input-number v-model="genForm.counts.short_answer" :min="0" :max="50" size="small" /></span>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="doGenerate" :loading="generating">生成并预览</el-button>
            </el-form-item>
          </el-form>
        </div>
      </template>

      <!-- ============ 教师：我的试卷与批改 ============ -->
      <template v-if="isTeacherOrAdmin && teacherTab === 'mine'">
        <div class="card">
          <div class="card-title"><i class="fas fa-list-check"></i> 我创建的试卷 ({{ tPapers.length }})</div>
          <div v-if="tPapers.length === 0" class="empty-state">
            <el-icon :size="40" color="#cbd5e1"><Document /></el-icon>
            <p>还没有创建试卷，去「组卷」Tab 生成一张吧</p>
          </div>
          <div v-else class="paper-list">
            <div v-for="p in tPapers" :key="p.id" class="paper-item">
              <div class="paper-main">
                <span class="paper-title">{{ p.title }}</span>
                <div class="paper-meta">
                  <el-tag size="small" :type="modeTag(p.mode)">{{ modeLabel(p.mode) }}</el-tag>
                  <el-tag size="small" :type="p.published ? 'success' : 'info'">{{ p.published ? '已发布' : '未发布' }}</el-tag>
                  <span>{{ p.question_count }} 题</span>
                  <span v-if="p.target_class">班级：{{ p.target_class }}</span>
                  <span>{{ p.submission_count }} 人提交</span>
                </div>
              </div>
              <div class="paper-actions">
                <el-button size="small" @click="previewPaper(p)">预览</el-button>
                <el-button v-if="!p.published" size="small" type="primary" @click="publishPaper(p)">发布</el-button>
                <el-button size="small" @click="openSubmissions(p)">查看答卷</el-button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ============ 学生：我的任务 ============ -->
      <template v-if="!isTeacherOrAdmin">
        <div class="card">
          <div class="card-title"><i class="fas fa-tasks"></i> 我的任务 ({{ myPapers.length }})</div>
          <div v-if="myPapers.length === 0" class="empty-state">
            <el-icon :size="40" color="#cbd5e1"><Document /></el-icon>
            <p>暂无任务，老师布置的作业/测试/考试会显示在这里</p>
          </div>
          <div v-else class="paper-list">
            <div v-for="p in myPapers" :key="p.id" class="paper-item" @click="openPaper(p)">
              <div class="paper-main">
                <span class="paper-title">{{ p.title }}</span>
                <div class="paper-meta">
                  <el-tag size="small" :type="modeTag(p.mode)">{{ modeLabel(p.mode) }}</el-tag>
                  <el-tag size="small" :type="studentStatusTag(p)">{{ studentStatusLabel(p) }}</el-tag>
                  <span>{{ p.question_count }} 题</span>
                  <span v-if="p.score !== null && p.score !== undefined">得分 {{ p.score }}</span>
                </div>
              </div>
              <div class="paper-actions">
                <el-button size="small" type="primary" @click.stop="openPaper(p)">{{ p.submission_id ? '继续/查看' : '开始作答' }}</el-button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ============ 作答/结果 弹窗 ============ -->
      <el-dialog v-model="showAnswer" :title="answerPaper?.title || '答题'" width="760px" top="5vh">
        <div v-if="answerPaper">
          <div v-if="resultMode" class="result-banner">
            <span class="score">得分：{{ answerSubmission?.score ?? '-' }} 分</span>
            <span class="correct">答对 {{ answerSubmission?.correct_count ?? 0 }} / {{ answerQuestions.length }} 题</span>
          </div>
          <div v-for="(q, i) in answerQuestions" :key="q.id" class="question-block">
            <div class="q-header">
              <span class="q-num">第 {{ i + 1 }} 题</span>
              <el-tag size="small" :type="typeTag(q.question_type)">{{ typeLabel(q.question_type) }}</el-tag>
              <span class="q-diff">{{ '⭐'.repeat(q.difficulty) }}</span>
            </div>
            <div class="q-text" v-html="renderMath(q.question_text)"></div>

            <!-- 作答态 -->
            <template v-if="!resultMode">
              <el-radio-group v-if="q.question_type === 'choice'" v-model="q._answer" style="display:flex;flex-direction:column;gap:6px;">
                <el-radio v-for="o in (q.options || [])" :key="o.key" :value="o.key">
                  <span v-html="renderMath(`${o.key}. ${o.text}`)"></span>
                </el-radio>
              </el-radio-group>
              <el-input v-else-if="q.question_type === 'fill'" v-model="q._answer" placeholder="填写答案" />
              <el-input v-else v-model="q._answer" type="textarea" :rows="3" placeholder="写下解答..." />
            </template>

            <!-- 结果态 -->
            <template v-else>
              <div class="answer-row">
                <span><strong>你的答案：</strong>{{ q.user_answer || '未作答' }}</span>
                <el-tag v-if="q.question_type !== 'short_answer'" :type="q.is_correct ? 'success' : 'danger'" size="small">{{ q.is_correct ? '正确' : '错误' }}</el-tag>
                <el-tag v-else size="small" :type="(q.score >= 0.5) ? 'success' : 'danger'">得分 {{ (q.score ?? 0).toFixed(2) }}</el-tag>
              </div>
              <div v-if="q.feedback" class="feedback"><strong>评语：</strong>{{ q.feedback }}</div>
              <div v-if="q.answer_text" class="answer-row"><strong>参考答案：</strong>{{ q.answer_text }}</div>
            </template>
          </div>
        </div>
        <template #footer>
          <el-button @click="showAnswer = false">关闭</el-button>
          <template v-if="!resultMode">
            <el-button @click="saveDraft" :loading="saving">保存草稿</el-button>
            <el-button type="primary" @click="submitAnswers" :loading="submitting">提交答卷</el-button>
          </template>
        </template>
      </el-dialog>

      <!-- ============ 教师：预览弹窗 ============ -->
      <el-dialog v-model="previewVisible" :title="`预览 · ${previewPaperTitle}`" width="760px" top="5vh">
        <div v-for="(q, i) in previewQuestions" :key="q.id" class="question-block">
          <div class="q-header">
            <span class="q-num">第 {{ i + 1 }} 题</span>
            <el-tag size="small" :type="typeTag(q.question_type)">{{ typeLabel(q.question_type) }}</el-tag>
            <span class="q-diff">{{ '⭐'.repeat(q.difficulty) }}</span>
          </div>
          <div class="q-text" v-html="renderMath(q.question_text)"></div>
          <div v-if="q.question_type === 'choice' && q.options?.length" class="q-options">
            <span v-for="o in q.options" :key="o.key" class="opt">{{ o.key }}. {{ o.text }}</span>
          </div>
          <div v-if="q.answer_text" class="answer-row"><strong>参考答案：</strong>{{ q.answer_text }}</div>
        </div>
        <template #footer>
          <el-button @click="previewVisible = false">关闭</el-button>
        </template>
      </el-dialog>

      <!-- ============ 教师：答卷列表 ============ -->
      <el-dialog v-model="subsVisible" :title="`答卷 · ${subsPaper?.title || ''}`" width="720px" top="5vh">
        <div v-if="subsList.length === 0" class="empty-state">暂无学生提交</div>
        <div v-else class="paper-list">
          <div v-for="s in subsList" :key="s.id" class="paper-item">
            <div class="paper-main">
              <span class="paper-title">{{ s.real_name || s.username }}</span>
              <div class="paper-meta">
                <el-tag size="small" :type="s.status === 'submitted' ? 'success' : 'info'">{{ s.status === 'submitted' ? '已提交' : '进行中' }}</el-tag>
                <span v-if="s.score !== null">得分 {{ s.score }}</span>
              </div>
            </div>
            <div class="paper-actions">
              <el-button size="small" type="primary" @click="openRegrade(s)">查看/批改</el-button>
            </div>
          </div>
        </div>
      </el-dialog>

      <!-- ============ 教师：批改弹窗 ============ -->
      <el-dialog v-model="regradeVisible" :title="`批改 · ${regradeStudent}`" width="760px" top="5vh">
        <div v-if="regradeSubmission">
          <div class="result-banner">
            <span class="score">得分：{{ regradeSubmission.score ?? '-' }} 分</span>
          </div>
          <div v-for="(a, i) in regradeAnswers" :key="a.answer_id" class="question-block">
            <div class="q-header">
              <span class="q-num">第 {{ i + 1 }} 题</span>
              <el-tag size="small" :type="typeTag(a.question_type)">{{ typeLabel(a.question_type) }}</el-tag>
            </div>
            <div class="q-text" v-html="renderMath(a.question_text)"></div>
            <div class="answer-row"><strong>学生作答：</strong>{{ a.user_answer || '未作答' }}</div>
            <div v-if="a.answer_text" class="answer-row"><strong>参考答案：</strong>{{ a.answer_text }}</div>
            <div v-if="a.feedback" class="feedback"><strong>AI 评语：</strong>{{ a.feedback }}</div>
            <div class="regrade-row">
              <span>得分</span>
              <el-input-number v-model="a._score" :min="0" :max="1" :step="0.1" size="small" />
              <el-input v-model="a._feedback" placeholder="评语（可选）" size="small" style="flex:1" />
            </div>
          </div>
        </div>
        <template #footer>
          <el-button @click="regradeVisible = false">取消</el-button>
          <el-button type="primary" @click="saveRegrade" :loading="regradeSaving">保存批改</el-button>
        </template>
      </el-dialog>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Document } from '@element-plus/icons-vue'
import papersAPI from '@/api/papers'
import request from '@/api/request'
import { useAuthStore } from '@/stores/auth'
import StandaloneHeader from '@/components/StandaloneHeader.vue'
import { renderMath } from '@/utils/math'

const router = useRouter()
const authStore = useAuthStore()
const isTeacherOrAdmin = computed(() => ['teacher', 'admin'].includes(authStore.user?.role))

function modeLabel(m) { return { practice: '练习', homework: '作业', test: '测试', exam: '考试' }[m] || m }
function modeTag(m) { return { practice: 'info', homework: 'primary', test: 'warning', exam: 'danger' }[m] || 'info' }
function typeLabel(t) { return { choice: '选择题', fill: '填空题', short_answer: '简答题' }[t] || t }
function typeTag(t) { return { choice: 'primary', fill: 'warning', short_answer: 'success' }[t] || 'info' }

// ── 教师：组卷 ──
const teacherTab = ref('gen')
const classes = ref([])
const chapters = ref([])
const genForm = reactive({
  mode: 'homework', title: '', target_class: '', chapter: '',
  diffRange: [1, 5], counts: { choice: 5, fill: 3, short_answer: 2 },
})
const generating = ref(false)

// ── 教师：我的试卷 ──
const tPapers = ref([])
const previewVisible = ref(false)
const previewPaperTitle = ref('')
const previewQuestions = ref([])
const subsVisible = ref(false)
const subsPaper = ref(null)
const subsList = ref([])
const regradeVisible = ref(false)
const regradeSubmission = ref(null)
const regradeAnswers = ref([])
const regradeSaving = ref(false)
const regradeStudent = ref('')

// ── 学生：我的任务 ──
const myPapers = ref([])

// ── 作答/结果 ──
const showAnswer = ref(false)
const answerPaper = ref(null)
const answerSubmission = ref(null)
const answerQuestions = ref([])
const resultMode = ref(false)
const saving = ref(false)
const submitting = ref(false)

onMounted(async () => {
  if (isTeacherOrAdmin.value) {
    loadClasses()
    loadChapters()
  } else {
    loadMyPapers()
  }
})

async function loadClasses() {
  try { classes.value = await request.get('/users/classes').then(r => r.data) } catch {}
}

async function loadChapters() {
  try {
    const r = await request.get('/knowledge/tree')
    const tree = r.data?.data || r.data || []
    chapters.value = [...new Set(tree.map(n => n.chapter).filter(Boolean))]
  } catch {}
}

async function loadMyPapers() {
  try {
    const r = await papersAPI.list()
    myPapers.value = r.data || []
  } catch (e) {
    ElMessage.error('加载任务失败')
  }
}

async function loadTeacherPapers() {
  try {
    const r = await papersAPI.list()
    tPapers.value = r.data || []
  } catch { ElMessage.error('加载失败') }
}

async function doGenerate() {
  if (!genForm.title.trim()) { ElMessage.warning('请输入试卷标题'); return }
  if (genForm.mode !== 'practice' && !genForm.target_class) { ElMessage.warning('请选择指定班级'); return }
  const totalN = genForm.counts.choice + genForm.counts.fill + genForm.counts.short_answer
  if (totalN === 0) { ElMessage.warning('题目数量不能全为 0'); return }
  generating.value = true
  try {
    await papersAPI.generate({
      title: genForm.title,
      mode: genForm.mode,
      target_class: genForm.target_class || null,
      chapter: genForm.chapter || null,
      difficulty_min: genForm.diffRange[0],
      difficulty_max: genForm.diffRange[1],
      counts: { ...genForm.counts },
    })
    ElMessage.success('生成成功，请到「我的试卷与批改」中发布')
    teacherTab.value = 'mine'
    await loadTeacherPapers()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '生成失败')
  } finally { generating.value = false }
}

async function publishPaper(p) {
  try {
    await papersAPI.publish(p.id)
    ElMessage.success('已发布')
    await loadTeacherPapers()
  } catch (e) { ElMessage.error(e.response?.data?.detail || '发布失败') }
}

async function previewPaper(p) {
  try {
    const r = await papersAPI.get(p.id)
    previewPaperTitle.value = p.title
    previewQuestions.value = r.questions || []
    previewVisible.value = true
  } catch (e) { ElMessage.error('加载预览失败') }
}

async function openSubmissions(p) {
  subsPaper.value = p
  try {
    const r = await papersAPI.listSubmissions(p.id)
    subsList.value = r.submissions || []
    subsVisible.value = true
  } catch (e) { ElMessage.error('加载答卷失败') }
}

async function openRegrade(s) {
  try {
    const r = await papersAPI.getSubmission(s.id)
    regradeSubmission.value = r.submission
    regradeAnswers.value = (r.answers || []).map(a => ({ ...a, _score: a.score ?? 0, _feedback: a.feedback || '' }))
    regradeStudent.value = s.real_name || s.username || ''
    regradeVisible.value = true
  } catch (e) { ElMessage.error('加载答卷失败') }
}

async function saveRegrade() {
  regradeSaving.value = true
  try {
    const answers = regradeAnswers.value.map(a => ({ answer_id: a.answer_id, score: a._score, feedback: a._feedback || '' }))
    await papersAPI.regrade(regradeSubmission.value.id, answers)
    ElMessage.success('批改已保存')
    regradeVisible.value = false
    await openSubmissions(subsPaper.value)
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '保存失败')
  } finally { regradeSaving.value = false }
}

// ── 学生：作答 ──
function studentStatusLabel(p) {
  if (!p.submission_id) return '未开始'
  if (p.submission_status === 'submitted') return (p.mode === 'test' || p.mode === 'exam') ? '已提交' : '已提交'
  return '进行中'
}
function studentStatusTag(p) {
  if (!p.submission_id) return 'info'
  if (p.submission_status === 'submitted') return 'success'
  return 'warning'
}

async function openPaper(p) {
  // 测试/考试已提交 → 只读结果
  if ((p.mode === 'test' || p.mode === 'exam') && p.submission_status === 'submitted') {
    return loadResult(p.submission_id)
  }
  try {
    const r = await papersAPI.start(p.id)
    answerPaper.value = r.paper
    answerSubmission.value = r.submission
    answerQuestions.value = (r.questions || []).map(q => ({ ...q, _answer: q.user_answer || '' }))
    resultMode.value = false
    showAnswer.value = true
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '加载失败')
  }
}

async function loadResult(sid) {
  try {
    const r = await papersAPI.getSubmission(sid)
    answerPaper.value = r.paper
    answerSubmission.value = r.submission
    answerQuestions.value = r.answers || []
    resultMode.value = true
    showAnswer.value = true
  } catch (e) { ElMessage.error('加载结果失败') }
}

async function saveDraft() {
  saving.value = true
  try {
    const answers = answerQuestions.value.map(q => ({ question_id: q.id, user_answer: q._answer || '' }))
    await papersAPI.save(answerSubmission.value.id, answers)
    ElMessage.success('草稿已保存')
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '保存失败')
  } finally { saving.value = false }
}

async function submitAnswers() {
  submitting.value = true
  try {
    const answers = answerQuestions.value.map(q => ({ question_id: q.id, user_answer: q._answer || '' }))
    const r = await papersAPI.submit(answerSubmission.value.id, answers)
    answerPaper.value = r.paper
    answerSubmission.value = r.submission
    answerQuestions.value = r.answers || []
    resultMode.value = true
    ElMessage.success(`提交成功！得分：${r.submission.score} 分`)
    await loadMyPapers()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '提交失败')
  } finally { submitting.value = false }
}
</script>

<style scoped>
.standalone-page { height: 100vh; display: flex; flex-direction: column; background: #f8fafc; overflow-y: auto; }
.sa-body { flex: 1; padding: 24px 32px; max-width: 1000px; margin: 0 auto; width: 100%; }

.tab-bar { display: flex; align-items: center; gap: 4px; margin-bottom: 20px; background: #fff; border-radius: 12px; padding: 4px; border: 1px solid #eef2f6; }
.tab-btn { padding: 8px 20px; border: none; background: transparent; border-radius: 8px; cursor: pointer; font-size: 14px; color: #64748b; display: flex; align-items: center; gap: 6px; transition: all 0.15s; }
.tab-btn:hover { color: #0b1e33; background: #f1f5f9; }
.tab-btn.active { background: #3b82f6; color: #fff; }
.tab-actions { margin-left: auto; padding-right: 8px; }

.card { background: #f8fafc; border-radius: 16px; padding: 20px 24px; margin-bottom: 20px; border: 1px solid #eef2f6; }
.card-title { font-weight: 600; font-size: 16px; margin-bottom: 16px; color: #0b1e33; display: flex; align-items: center; gap: 8px; }
.card-title i { color: #3b82f6; }
.empty-state { text-align: center; padding: 40px 0; color: #94a3b8; }
.empty-state p { margin-top: 12px; font-size: 14px; }

.count-row { display: flex; gap: 20px; flex-wrap: wrap; }
.count-item { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #475569; }

.paper-list { display: flex; flex-direction: column; gap: 8px; }
.paper-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-radius: 10px; border: 1px solid #eef2f6; background: #fff; cursor: pointer; transition: all 0.15s; }
.paper-item:hover { border-color: #cbd5e1; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
.paper-main { flex: 1; min-width: 0; }
.paper-title { font-size: 15px; font-weight: 500; color: #0b1e33; }
.paper-meta { display: flex; align-items: center; gap: 10px; margin-top: 4px; font-size: 13px; color: #94a3b8; flex-wrap: wrap; }
.paper-actions { display: flex; gap: 8px; margin-left: 16px; flex-shrink: 0; }

.question-block { border: 1px solid #eef2f6; border-radius: 10px; padding: 16px; margin-bottom: 16px; background: #fff; }
.q-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.q-num { font-weight: 600; color: #3b82f6; }
.q-diff { font-size: 12px; color: #f59e0b; }
.q-text { font-size: 15px; color: #0b1e33; margin-bottom: 12px; line-height: 1.7; white-space: pre-wrap; }
.q-options { margin: -6px 0 10px; display: flex; flex-wrap: wrap; gap: 8px; }
.opt { background: #f1f5f9; border-radius: 6px; padding: 2px 10px; font-size: 13px; color: #334155; }
.answer-row { margin-top: 8px; font-size: 14px; color: #475569; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.feedback { margin-top: 8px; font-size: 13px; color: #92400e; background: #fffbeb; border-radius: 6px; padding: 6px 10px; }
.result-banner { background: #eef2ff; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; display: flex; gap: 20px; }
.result-banner .score { font-size: 18px; font-weight: 700; color: #3b82f6; }
.result-banner .correct { font-size: 14px; color: #475569; }
.regrade-row { margin-top: 10px; display: flex; align-items: center; gap: 10px; }
.regrade-row span { font-size: 13px; color: #475569; }

@media (max-width: 768px) {
  .sa-body { padding: 16px 12px; }
  .tab-btn { padding: 8px 12px; font-size: 13px; }
  .paper-item { flex-direction: column; align-items: flex-start; gap: 8px; }
  .paper-actions { margin-left: 0; }
}
</style>
