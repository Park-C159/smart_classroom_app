<template>
  <div class="knowledge-tree-edit">
    <div class="page-header">
      <h2><el-icon><Share /></el-icon> 知识树编辑</h2>
      <div class="header-actions">
        <span class="badge">管理员</span>
        <el-button type="primary" size="small" @click="openAdd(null)">
          <el-icon><Plus /></el-icon> 添加知识点
        </el-button>
      </div>
    </div>

    <!-- Stats -->
    <div class="card" v-if="stats">
      <div class="stats-row">
        <span><strong>{{ stats.knowledge_points }}</strong> 知识点</span>
        <span><strong>{{ stats.content_chunks }}</strong> 内容块</span>
        <span><strong>{{ stats.exercises }}</strong> 习题</span>
        <span><strong>{{ stats.chapters }}</strong> 章节</span>
      </div>
    </div>

    <!-- Tree view: 3 levels — Chapter → Section → KP -->
    <div class="card">
      <div class="card-title"><i class="fas fa-sitemap"></i> 知识树结构 ({{ flatList.length }} 项)</div>
      <div v-if="tree.length === 0" class="empty-state">
        <el-icon :size="40" color="#cbd5e1"><Grid /></el-icon>
        <p>解析教材后知识树将在这里展示</p>
        <p class="hint">前往「教材管理」分配学科自动构建</p>
      </div>
      <div v-else class="tree-view">
        <div v-for="ch in tree" :key="ch.id" class="tree-branch">
          <!-- Level 0: Chapter -->
          <div class="tree-chapter" @click="toggleExpand(ch.id)">
            <i :class="expanded.has(ch.id) ? 'fas fa-caret-down' : 'fas fa-caret-right'"></i>
            <span class="node-kp-id">{{ ch.id }}</span>
            <span class="node-title" v-html="'📘 ' + renderMath(ch.title)"></span>
            <span class="ch-count" v-if="ch.children?.length">({{ ch.children.length }} 节)</span>
            <div class="node-actions">
              <el-button size="small" @click.stop="openEdit(ch)">编辑</el-button>
              <el-button size="small" @click.stop="openAdd(ch)">+子</el-button>
              <el-button size="small" type="danger" @click.stop="confirmDelete(ch)">删</el-button>
            </div>
          </div>
          <!-- Level 1: Sections -->
          <template v-if="expanded.has(ch.id) && ch.children">
            <div v-for="sec in ch.children" :key="sec.id" class="tree-section-wrap">
              <div class="tree-section" @click="toggleExpand(sec.id)">
                <i :class="expanded.has(sec.id) ? 'fas fa-caret-down' : 'fas fa-caret-right'"></i>
                <span class="node-kp-id">{{ sec.id }}</span>
                <span class="node-title" v-html="'📄 ' + renderMath(sec.title)"></span>
                <span class="ch-count" v-if="sec.children?.length">({{ sec.children.length }} 知识点)</span>
                <div class="node-actions">
                  <el-button size="small" @click.stop="viewChunks(sec.id)">内容块</el-button>
                  <el-button size="small" type="primary" @click.stop="openEdit(sec)">编辑</el-button>
                  <el-button size="small" @click.stop="openAdd(sec)">+子</el-button>
                  <el-button size="small" type="danger" @click.stop="confirmDelete(sec)">删</el-button>
                </div>
              </div>
              <!-- Level 2: Knowledge Points -->
              <div v-if="expanded.has(sec.id) && sec.children" class="tree-kps">
                <div v-for="kp in sec.children" :key="kp.id" class="tree-kp">
                  <span class="node-kp-id kp-id-small">{{ kp.id }}</span>
                  <span class="node-title" v-html="renderMath(kp.summary || kp.title)"></span>
                  <span class="kp-level-tag">知识</span>
                  <div class="node-actions">
                    <el-button size="small" @click="viewChunks(kp.id)">块</el-button>
                    <el-button size="small" type="primary" @click="openEdit(kp)">编辑</el-button>
                    <el-button size="small" type="danger" @click="confirmDelete(kp)">删</el-button>
                  </div>
                </div>
                <div v-if="!sec.children || sec.children.length === 0" class="no-kps">
                  暂无子知识点
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Edit/Create dialog -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form label-width="80px">
        <el-form-item label="KP ID">
          <el-input v-model="form.id" :disabled="!!editingKp" placeholder="KP-1.1.1" />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="复合函数求导" />
        </el-form-item>
        <el-form-item label="摘要">
          <el-input v-model="form.summary" type="textarea" :rows="2" placeholder="一句话描述..." />
        </el-form-item>
        <el-form-item label="章节">
          <el-input v-model="form.chapter" placeholder="第2章" />
        </el-form-item>
        <el-form-item label="层级">
          <el-input-number v-model="form.level" :min="0" :max="3" />
        </el-form-item>
        <el-form-item label="父节点">
          <el-input v-model="form.parent_id" placeholder="留空为根节点（章）" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveKp" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- Chunks dialog -->
    <el-dialog v-model="chunksVisible" :title="'内容块 - ' + chunksKpId" width="700px" top="5vh">
      <div v-if="chunks.length === 0" class="empty-state" style="padding:24px"><p>暂无内容块</p></div>
      <div v-for="chunk in chunks" :key="chunk.id" class="chunk-item">
        <div class="chunk-header">
          <el-tag size="small">{{ chunk.chunk_type }}</el-tag>
          <span v-if="chunk.page_number" class="page-num">P{{ chunk.page_number }}</span>
          <el-button type="danger" size="small" text @click="deleteChunk(chunk.id)">删除</el-button>
        </div>
        <div class="chunk-content" v-html="renderMath(chunk.content)"></div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import knowledgeAPI from '@/api/knowledge'
import katex from 'katex'

const tree = ref([])
const expanded = ref(new Set())
function toggleExpand(id) {
  const s = new Set(expanded.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  expanded.value = s
}
const stats = ref(null)

// Flatten tree with depth
const flatList = computed(() => {
  const result = []
  function walk(nodes, depth) {
    for (const n of nodes) {
      result.push({ ...n, _depth: depth })
      if (n.children?.length) walk(n.children, depth + 1)
    }
  }
  walk(tree.value, 0)
  return result
})

// Dialog
const dialogVisible = ref(false)
const dialogTitle = ref('')
const editingKp = ref(null)
const saving = ref(false)
const form = reactive({ id: '', title: '', summary: '', chapter: '', parent_id: '', sort_order: 0, level: 2 })

// Chunks
const chunksVisible = ref(false)
const chunksKpId = ref('')
const chunks = ref([])

onMounted(() => loadTree())

async function loadTree() {
  try {
    const r = await knowledgeAPI.getTree()
    tree.value = r.data || []
    stats.value = await knowledgeAPI.getStats()
    // Auto-expand chapters on first load
    if (expanded.value.size === 0) {
      const s = new Set()
      for (const ch of tree.value) {
        s.add(ch.id)
        for (const sec of (ch.children || [])) s.add(sec.id)
      }
      expanded.value = s
    }
  } catch {}
}

function resetForm() {
  form.id = ''; form.title = ''; form.summary = ''; form.chapter = ''; form.parent_id = ''; form.sort_order = 0; form.level = 2
}

function openEdit(node) {
  editingKp.value = node
  dialogTitle.value = `编辑 ${node.id}`
  form.id = node.id; form.title = node.title || ''; form.summary = node.summary || ''
  form.chapter = node.chapter || ''; form.parent_id = node.parent_id || ''; form.sort_order = node.sort_order || 0; form.level = node.level ?? 2
  dialogVisible.value = true
}

function openAdd(parent) {
  editingKp.value = null
  dialogTitle.value = parent ? `添加子节点（父: ${parent.id}）` : '添加根节点'
  resetForm()
  if (parent) {
    form.parent_id = parent.id
    form.level = (parent.level ?? 0) + 1
  }
  dialogVisible.value = true
}

async function saveKp() {
  if (!form.id || !form.title) { ElMessage.warning('ID 和标题不能为空'); return }
  saving.value = true
  try {
    if (editingKp.value) {
      await knowledgeAPI.updateKP(form.id, {
        title: form.title, summary: form.summary, chapter: form.chapter || null,
        parent_id: form.parent_id || null, sort_order: form.sort_order,
      })
      ElMessage.success('已更新')
    } else {
      await knowledgeAPI.createKP({
        id: form.id, title: form.title, summary: form.summary, chapter: form.chapter || null,
        parent_id: form.parent_id || null, sort_order: form.sort_order, level: form.level,
      })
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    await loadTree()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '保存失败')
  } finally { saving.value = false }
}

async function confirmDelete(node) {
  try {
    await ElMessageBox.confirm(`确认删除 ${node.id}？子节点也会被删除。`, '警告', { type: 'warning' })
    await knowledgeAPI.deleteKP(node.id)
    ElMessage.success('已删除')
    await loadTree()
  } catch {}
}

async function viewChunks(kpId) {
  chunksKpId.value = kpId
  try {
    const r = await knowledgeAPI.getChunks(kpId)
    chunks.value = r.data || []
  } catch { chunks.value = [] }
  chunksVisible.value = true
}

async function deleteChunk(id) {
  try { await knowledgeAPI.deleteChunk(id); chunks.value = chunks.value.filter(c => c.id !== id); ElMessage.success('已删除') } catch { ElMessage.error('删除失败') }
}

// ── LaTeX rendering ──
function renderMath(text) {
  if (!text) return ''
  let html = text
  // Normalize \(...\) → $...$ and \[...\] → $$...$$
  html = html.replace(/\\\(([\s\S]*?)\\\)/g, (_, f) => `$${f.trim()}$`)
  html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, f) => `$$\n${f.trim()}\n$$`)
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    try { return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false }) } catch { return _ }
  })
  html = html.replace(/\$([^$]+?)\$/g, (_, formula) => {
    try { return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false }) } catch { return _ }
  })
  return html
}
</script>

<style scoped>
.knowledge-tree-edit { padding: 24px; height: 100%; overflow-y: auto; max-width: 1100px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { display: flex; align-items: center; gap: 8px; font-size: 20px; color: #0b1e33; margin: 0; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.badge { background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px; }

.card { background: #f8fafc; border-radius: 16px; padding: 20px 24px; margin-bottom: 20px; border: 1px solid #eef2f6; }
.card-title { font-weight: 600; font-size: 16px; margin-bottom: 16px; color: #0b1e33; display: flex; align-items: center; gap: 8px; }
.card-title i { color: #3b82f6; }
.stats-row { display: flex; gap: 32px; font-size: 14px; color: #475569; }
.stats-row strong { color: #3b82f6; }

.empty-state { text-align: center; padding: 40px 0; color: #94a3b8; }
.empty-state p { margin-top: 12px; font-size: 14px; }
.hint { font-size: 12px; color: #cbd5e1; margin-top: 4px; }

.tree-view { }
.tree-branch { margin-bottom: 4px; }

/* Level 0: Chapter */
.tree-chapter { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f0f9ff; border-radius: 8px; cursor: pointer; border-left: 3px solid #3b82f6; }
.tree-chapter:hover { background: #e0f2fe; }
.tree-chapter .fas { color: #3b82f6; font-size: 14px; width: 16px; }
.ch-count { font-size: 12px; color: #94a3b8; }

/* Level 1: Section */
.tree-section-wrap { margin-left: 24px; }
.tree-section { display: flex; align-items: center; gap: 8px; padding: 6px 12px; margin: 2px 0; border-radius: 6px; border-left: 2px solid #3b82f6; cursor: pointer; background: #f8fcf9; }
.tree-section:hover { background: #ecfdf5; }
.tree-section .fas { color: #10b981; font-size: 13px; width: 14px; }

/* Level 2: Knowledge Points */
.tree-kps { margin-left: 28px; padding: 2px 0; }
.tree-kp { display: flex; align-items: center; gap: 8px; padding: 5px 10px; margin: 1px 0; border-radius: 5px; border-left: 2px solid #d1d5db; background: #fafafa; }
.tree-kp:hover { background: #f5f5f5; }
.kp-level-tag { font-size: 10px; background: #dbeafe; color: #3b82f6; padding: 1px 6px; border-radius: 8px; }
.kp-id-small { font-size: 11px; min-width: 70px; }
.no-kps { font-size: 12px; color: #94a3b8; padding: 8px 16px; font-style: italic; }

.node-kp-id { font-weight: 600; color: #3b82f6; min-width: 60px; font-size: 12px; }
.node-title { color: #0b1e33; flex: 1; min-width: 120px; font-size: 13px; }
.node-actions { display: flex; gap: 4px; flex-shrink: 0; }

.chunk-item { border: 1px solid #eef2f6; border-radius: 8px; padding: 12px; margin-bottom: 8px; background: #fff; }
.chunk-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.chunk-content { font-size: 14px; color: #334155; white-space: pre-wrap; line-height: 1.6; max-height: 200px; overflow-y: auto; }
.page-num { font-size: 12px; color: #94a3b8; }

@media (max-width: 768px) { .tree-section-wrap { margin-left: 12px; } .tree-kps { margin-left: 16px; } }
</style>
