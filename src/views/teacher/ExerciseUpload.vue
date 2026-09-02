<template>
  <div class="exercise-upload">
    <div class="page-header">
      <h2><el-icon><Upload /></el-icon> 习题上传</h2>
    </div>

    <!-- Excel批量导入 -->
    <div class="card">
      <div class="card-title"><i class="fas fa-file-excel"></i> Excel 批量导入</div>
      <p style="color:#94a3b8;font-size:13px;margin-bottom:12px;">
        模板格式：题型 | 题目 | 选项 | 答案 | 知识点 | 难度(1-5)<br/>
        题型：choice / fill / calculation / proof
      </p>
      <div style="display:flex;gap:12px;align-items:center;">
        <input type="file" ref="excelInput" accept=".xlsx,.xls" style="font-size:13px;" />
        <el-button type="primary" @click="uploadExcel" :loading="uploadingExcel">上传导入</el-button>
      </div>
      <div v-if="importResult" :class="['msg', importResult.type]" style="margin-top:12px;">{{ importResult.msg }}</div>
    </div>

    <!-- 手动添加 -->
    <div class="card">
      <div class="card-title"><i class="fas fa-pen"></i> 手动添加习题</div>
      <div class="form-row">
        <div class="field">
          <label>章节</label>
          <el-select v-model="form.chapter" placeholder="选择章节" filterable style="width:100%">
            <el-option v-for="ch in chapters" :key="ch" :label="ch" :value="ch" />
          </el-select>
        </div>
        <div class="field">
          <label>题型</label>
          <el-select v-model="form.question_type" style="width:100%">
            <el-option value="calculation" label="计算题" />
            <el-option value="choice" label="选择题" />
            <el-option value="fill" label="填空题" />
            <el-option value="proof" label="证明题" />
          </el-select>
        </div>
        <div class="field">
          <label>难度 {{ '⭐'.repeat(form.difficulty) }}</label>
          <el-slider v-model="form.difficulty" :min="1" :max="5" show-stops />
        </div>
      </div>
      <div class="field">
        <label>题目（支持 Markdown + LaTeX）</label>
        <el-input v-model="form.question_text" type="textarea" :rows="5" placeholder="$x^2 + y^2 = 1$" />
      </div>
      <div class="field">
        <label>答案（可选）</label>
        <el-input v-model="form.answer_text" type="textarea" :rows="3" placeholder="答案..." />
      </div>
      <div class="field">
        <label>图片（可选，自动VLM识别）</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="file" ref="imgInput" accept="image/*" @change="handleImage" style="font-size:13px;" />
          <span v-if="uploadingImg" style="color:#3b82f6;font-size:13px;"><i class="fas fa-spinner fa-spin"></i> VLM处理中</span>
        </div>
        <div v-if="form.images.length" style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
          <div v-for="(img,i) in form.images" :key="i" class="img-thumb">
            <span style="font-size:11px;color:#64748b;">{{ img.vlm_desc ? '✅已识别' : '图片' }}</span>
            <el-button size="small" type="danger" @click="form.images.splice(i,1)">移除</el-button>
          </div>
        </div>
      </div>
      <el-button type="primary" @click="createExercise" :loading="creating" :disabled="!form.chapter || !form.question_text">
        保存习题
      </el-button>
      <div v-if="createResult" :class="['msg', createResult.type]" style="margin-top:12px;">{{ createResult.msg }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/api/request'
import { ElMessage } from 'element-plus'

const excelInput = ref(null)
const imgInput = ref(null)
const uploadingExcel = ref(false)
const uploadingImg = ref(false)
const creating = ref(false)
const importResult = ref(null)
const createResult = ref(null)

const chapters = ref([])

const form = ref({
  chapter: '', question_text: '', answer_text: '',
  question_type: 'calculation', difficulty: 3, images: [],
})

async function loadChapters() {
  try {
    const r = await request.get('/knowledge/tree')
    const tree = r.data?.data || r.data || []
    chapters.value = tree.map(n => n.chapter || n.title).filter(Boolean)
  } catch {}
}

onMounted(loadChapters)

async function uploadExcel() {
  const f = excelInput.value?.files?.[0]
  if (!f) { ElMessage.warning('请选择文件'); return }
  uploadingExcel.value = true
  importResult.value = null
  try {
    const fd = new FormData(); fd.append('file', f)
    const r = await request.post('/upload/import-exercises', fd)
    importResult.value = { type: 'success', msg: `成功 ${r.data.success || 0}，失败 ${r.data.failed || 0}` }
    excelInput.value.value = ''
  } catch (e) {
    importResult.value = { type: 'error', msg: '失败: ' + (e.response?.data?.detail || e.message) }
  } finally { uploadingExcel.value = false }
}

async function handleImage(e) {
  const f = e.target.files?.[0]
  if (!f) return
  uploadingImg.value = true
  try {
    const fd = new FormData(); fd.append('file', f)
    const r = await request.post('/documents/exercises/upload-image', fd)
    form.value.images.push({ path: r.data.path, vlm_desc: r.data.vlm_desc, type: r.data.type })
  } catch (e) {
    ElMessage.error('上传失败')
  } finally { uploadingImg.value = false; imgInput.value.value = '' }
}

async function createExercise() {
  creating.value = true; createResult.value = null
  try {
    await request.post('/documents/exercises', { ...form.value, images: form.value.images.length ? form.value.images : null })
    createResult.value = { type: 'success', msg: '习题已创建！' }
    form.value = { chapter: '', question_text: '', answer_text: '', question_type: 'calculation', difficulty: 3, images: [] }
  } catch (e) {
    createResult.value = { type: 'error', msg: '失败: ' + (e.response?.data?.detail || e.message) }
  } finally { creating.value = false }
}
</script>

<style scoped>
.exercise-upload { padding: 24px; height: 100%; overflow-y: auto; max-width: 900px; margin: 0 auto; }
.page-header { margin-bottom: 24px; }
.page-header h2 { display: flex; align-items: center; gap: 8px; font-size: 20px; color: #0b1e33; margin: 0; }
.card { background: #f8fafc; border-radius: 16px; padding: 20px 24px; margin-bottom: 20px; border: 1px solid #eef2f6; }
.card-title { font-weight: 600; font-size: 16px; margin-bottom: 12px; color: #0b1e33; display: flex; align-items: center; gap: 8px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 8px; }
.field { margin-bottom: 12px; }
.field label { display: block; font-size: 13px; color: #475569; margin-bottom: 4px; font-weight: 500; }
.msg { padding: 8px 12px; border-radius: 8px; font-size: 13px; }
.msg.success { background: #f0fdf4; color: #16a34a; }
.msg.error { background: #fef2f2; color: #dc2626; }
.img-thumb { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; display: flex; align-items: center; gap: 8px; }
</style>
