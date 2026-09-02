<template>
  <div class="tq-page">
    <div class="page-header">
      <h2><i class="fas fa-clipboard-list"></i> 试题库管理</h2>
      <div class="header-actions">
        <input type="file" ref="excelInput" accept=".xlsx,.xls" style="font-size:12px;width:150px;" />
        <el-button @click="uploadExcel" :loading="importing"><el-icon><Upload /></el-icon> 导入 Excel</el-button>
        <el-button type="primary" @click="openCreate"><el-icon><Plus /></el-icon> 新增题目</el-button>
      </div>
    </div>

    <div class="filters">
      <el-select v-model="filterChapter" placeholder="按章节" clearable filterable style="width:200px" @change="load">
        <el-option v-for="ch in chapters" :key="ch" :label="ch" :value="ch" />
      </el-select>
      <el-select v-model="filterType" placeholder="按题型" clearable style="width:140px" @change="load">
        <el-option label="选择题" value="choice" />
        <el-option label="填空题" value="fill" />
        <el-option label="简答题" value="short_answer" />
      </el-select>
      <el-input v-model="search" placeholder="搜索题目..." clearable style="width:200px" @keydown.enter="load" />
      <el-button @click="load" :loading="loading"><el-icon><Refresh /></el-icon> 查询</el-button>
    </div>

    <div class="card">
      <div class="card-title">
        <i class="fas fa-database"></i> 题目列表 ({{ total }})
      </div>
      <div v-if="!list.length && !loading" class="empty-state">
        <el-icon :size="40" color="#cbd5e1"><Collection /></el-icon>
        <p>暂无题目，点击「新增题目」或「导入 Excel」开始</p>
      </div>
      <div v-else>
        <div v-for="q in list" :key="q.id" class="q-item">
          <div class="q-head">
            <el-tag size="small" :type="typeTag(q.question_type)">{{ typeLabel(q.question_type) }}</el-tag>
            <span class="q-chapter">{{ q.chapter || '未分章' }}</span>
            <span class="q-diff">{{ '⭐'.repeat(q.difficulty) }}</span>
            <span class="q-answer" v-if="q.question_type === 'choice'">答案: {{ q.answer_text }}</span>
            <div class="q-actions">
              <el-button size="small" text type="primary" @click="openEdit(q)">编辑</el-button>
              <el-button size="small" text type="danger" @click="remove(q)">删除</el-button>
            </div>
          </div>
          <div class="q-text" v-html="renderMath(q.question_text)"></div>
          <div v-if="q.question_type === 'choice' && q.options?.length" class="q-options">
            <span v-for="o in q.options" :key="o.key" class="opt">{{ o.key }}. {{ o.text }}</span>
          </div>
          <div v-if="q.question_type !== 'choice'" class="q-answer-text">参考答案：{{ q.answer_text }}</div>
        </div>
      </div>
      <el-pagination v-if="total > pageSize" style="margin-top:16px;justify-content:center" layout="prev,next" :total="total" :page-size="pageSize" v-model:current-page="page" @current-change="load" />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑题目' : '新增题目'" width="720px" top="5vh">
      <el-form label-width="80px">
        <el-form-item label="题型">
          <el-radio-group v-model="form.question_type">
            <el-radio-button value="choice">选择题</el-radio-button>
            <el-radio-button value="fill">填空题</el-radio-button>
            <el-radio-button value="short_answer">简答题</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="章节">
          <el-select v-model="form.chapter" placeholder="选择章节" filterable clearable style="width:100%">
            <el-option v-for="ch in chapters" :key="ch" :label="ch" :value="ch" />
          </el-select>
        </el-form-item>
        <el-form-item label="难度">
          <el-rate v-model="form.difficulty" :max="5" />
        </el-form-item>
        <el-form-item label="题目">
          <el-input v-model="form.question_text" type="textarea" :rows="4" placeholder="支持 $LaTeX$" />
          <div class="preview" v-html="renderMath(form.question_text)"></div>
        </el-form-item>
        <template v-if="form.question_type === 'choice'">
          <el-form-item v-for="key in ['A','B','C','D']" :key="key" :label="'选项 ' + key">
            <el-input v-model="form['opt' + key]" placeholder="选项内容，支持 LaTeX" />
          </el-form-item>
          <el-form-item label="正确选项">
            <el-select v-model="form.answer_text" placeholder="选择正确选项" style="width:200px">
              <el-option v-for="key in ['A','B','C','D']" :key="key" :label="key" :value="key" />
            </el-select>
          </el-form-item>
        </template>
        <el-form-item v-else :label="form.question_type === 'fill' ? '填空答案' : '参考答案'">
          <el-input v-model="form.answer_text" type="textarea" :rows="3" placeholder="答案，支持 LaTeX" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Upload, Collection } from '@element-plus/icons-vue'
import testBankAPI from '@/api/testBank'
import request from '@/api/request'
import { renderMath } from '@/utils/math'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const chapters = ref([])
const filterChapter = ref('')
const filterType = ref('')
const search = ref('')

const dialogVisible = ref(false)
const saving = ref(false)
const form = reactive({ id: null, question_type: 'choice', chapter: '', difficulty: 3, question_text: '', answer_text: '', optA: '', optB: '', optC: '', optD: '' })

const excelInput = ref(null)
const importing = ref(false)

function typeLabel(t) { return { choice: '选择题', fill: '填空题', short_answer: '简答题' }[t] || t }
function typeTag(t) { return { choice: 'primary', fill: 'warning', short_answer: 'success' }[t] || 'info' }

async function loadChapters() {
  try {
    const r = await request.get('/knowledge/tree')
    const tree = r.data?.data || r.data || []
    chapters.value = [...new Set(tree.map(n => n.chapter).filter(Boolean))]
  } catch {}
}

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, page_size: pageSize.value }
    if (filterChapter.value) params.chapter = filterChapter.value
    if (filterType.value) params.question_type = filterType.value
    if (search.value) params.search = search.value
    const r = await testBankAPI.list(params)
    list.value = r.data || []
    total.value = r.total || 0
  } catch (e) {
    ElMessage.error('加载失败')
  } finally { loading.value = false }
}

function openCreate() {
  Object.assign(form, { id: null, question_type: 'choice', chapter: '', difficulty: 3, question_text: '', answer_text: '', optA: '', optB: '', optC: '', optD: '' })
  dialogVisible.value = true
}

function openEdit(q) {
  Object.assign(form, {
    id: q.id, question_type: q.question_type, chapter: q.chapter || '', difficulty: q.difficulty || 3,
    question_text: q.question_text, answer_text: q.answer_text || '',
    optA: '', optB: '', optC: '', optD: '',
  })
  if (q.question_type === 'choice' && q.options?.length) {
    for (const o of q.options) form['opt' + o.key] = o.text
  }
  dialogVisible.value = true
}

async function save() {
  if (!form.question_text.trim() || !form.answer_text.trim()) {
    ElMessage.warning('题目和答案不能为空')
    return
  }
  if (form.question_type === 'choice') {
    const opts = ['A', 'B', 'C', 'D'].filter(k => (form['opt' + k] || '').trim())
    if (!opts.length) { ElMessage.warning('选择题请填写至少一个选项'); return }
    if (!['A', 'B', 'C', 'D'].includes(form.answer_text)) { ElMessage.warning('请选择正确选项'); return }
  }
  saving.value = true
  try {
    const payload = {
      question_type: form.question_type,
      chapter: form.chapter || null,
      difficulty: form.difficulty,
      question_text: form.question_text,
      answer_text: form.answer_text,
    }
    if (form.question_type === 'choice') {
      payload.options = ['A', 'B', 'C', 'D']
        .filter(k => (form['opt' + k] || '').trim())
        .map(k => ({ key: k, text: form['opt' + k].trim() }))
    } else {
      payload.options = null
    }
    if (form.id) {
      await testBankAPI.update(form.id, payload)
    } else {
      await testBankAPI.create(payload)
    }
    ElMessage.success('已保存')
    dialogVisible.value = false
    await load()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '保存失败')
  } finally { saving.value = false }
}

async function remove(q) {
  try {
    await ElMessageBox.confirm('确认删除该题目？', '提示', { type: 'warning' })
    await testBankAPI.remove(q.id)
    ElMessage.success('已删除')
    await load()
  } catch {}
}

async function uploadExcel() {
  const f = excelInput.value?.files?.[0]
  if (!f) { ElMessage.warning('请选择 Excel 文件'); return }
  importing.value = true
  try {
    const r = await testBankAPI.importExcel(f)
    ElMessage.success(`导入完成：成功 ${r.created} 条${r.errors?.length ? '，失败 ' + r.errors.length + ' 条' : ''}`)
    if (r.errors?.length) console.warn('导入错误', r.errors)
    excelInput.value.value = ''
    await load()
  } catch (e) {
    ElMessage.error('导入失败: ' + (e.response?.data?.detail || e.message))
  } finally { importing.value = false }
}

onMounted(() => { loadChapters(); load() })
</script>

<style scoped>
.tq-page { padding: 24px; height: 100%; overflow-y: auto; max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.page-header h2 { display: flex; align-items: center; gap: 8px; font-size: 20px; color: #0b1e33; margin: 0; }
.page-header h2 i { color: #3b82f6; }
.header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.card { background: #f8fafc; border-radius: 16px; padding: 20px 24px; border: 1px solid #eef2f6; }
.card-title { font-weight: 600; font-size: 16px; margin-bottom: 16px; color: #0b1e33; display: flex; align-items: center; gap: 8px; }
.card-title i { color: #3b82f6; }
.empty-state { text-align: center; padding: 40px 0; color: #94a3b8; }
.empty-state p { margin-top: 12px; font-size: 14px; }
.q-item { background: #fff; border: 1px solid #eef2f6; border-radius: 10px; padding: 14px; margin-bottom: 10px; }
.q-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
.q-chapter { font-size: 12px; color: #64748b; }
.q-diff { font-size: 12px; color: #f59e0b; }
.q-answer { font-size: 12px; color: #16a34a; }
.q-actions { margin-left: auto; display: flex; gap: 4px; }
.q-text { font-size: 14px; color: #0b1e33; line-height: 1.7; white-space: pre-wrap; }
.q-options { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 8px; }
.opt { background: #f1f5f9; border-radius: 6px; padding: 2px 10px; font-size: 13px; color: #334155; }
.q-answer-text { margin-top: 6px; font-size: 13px; color: #16a34a; }
.preview { margin-top: 8px; padding: 10px; background: #f8fafc; border-radius: 6px; font-size: 14px; line-height: 1.7; max-height: 220px; overflow-y: auto; }
@media (max-width: 768px) {
  .tq-page { padding: 16px 12px; }
}
</style>
