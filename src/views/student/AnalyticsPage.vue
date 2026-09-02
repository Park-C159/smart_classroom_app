<template>
  <div class="standalone-page">
    <StandaloneHeader title="学情分析" icon="fas fa-chart-line" />
    <main class="sa-body">
      <div class="cards-row">
      <div class="stat-card"><div class="stat-value">{{ stats.total_questions || 0 }}</div><div class="stat-label">提问总数</div></div>
      <div class="stat-card"><div class="stat-value">{{ stats.total_exams || 0 }}</div><div class="stat-label">完成试卷</div></div>
      <div class="stat-card"><div class="stat-value">{{ stats.avg_exam_score ?? '--' }}</div><div class="stat-label">平均得分</div></div>
      <div class="stat-card"><div class="stat-value">{{ stats.avg_kp_mastery ? (stats.avg_kp_mastery * 100).toFixed(0) + '%' : '--' }}</div><div class="stat-label">整体掌握度</div></div>
    </div>

    <div class="card">
      <div class="card-title"><i class="fas fa-chart-bar"></i> 知识点掌握度</div>
      <div v-if="treeNodes.length === 0" class="empty-state">
        <el-icon :size="40" color="#cbd5e1"><TrendCharts /></el-icon>
        <p>开始答疑后，知识点掌握度将在这里展示</p>
        <p class="hint">基于提问记录，系统使用 EWMA 算法追踪每个知识点的掌握情况</p>
      </div>
      <div v-else class="tree-mastery">
        <div v-for="ch in treeNodes" :key="ch.id" class="tree-chapter">
          <!-- Level 0: Chapter -->
          <div class="ch-header" @click="toggleNode(ch.id)">
            <i :class="expanded.has(ch.id) ? 'fas fa-caret-down' : 'fas fa-caret-right'"></i>
            <span class="ch-label" v-html="'📘 ' + renderMath(ch.title)"></span>
            <span class="ch-mastery" v-if="ch._mastery !== undefined">{{ (ch._mastery * 100).toFixed(0) }}%</span>
          </div>
          <!-- Level 1: Sections -->
          <div v-if="expanded.has(ch.id) && ch.children" class="ch-children">
            <div v-for="sec in ch.children" :key="sec.id" class="tree-section-wrap">
              <div class="sec-header" @click="toggleNode(sec.id)">
                <i :class="expanded.has(sec.id) ? 'fas fa-caret-down' : 'fas fa-caret-right'" style="font-size:11px;width:12px;color:#10b981"></i>
                <span class="sec-label" v-html="'📄 ' + renderMath(sec.title)"></span>
                <span class="sec-mastery" v-if="sec._mastery !== undefined">{{ (sec._mastery * 100).toFixed(0) }}%</span>
              </div>
              <div class="sec-bar-wrap">
                <div class="sec-bar" :style="{ width: Math.max(2, (sec._mastery || 0) * 100) + '%' }" :class="masteryClass(sec._mastery || 0)"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import analyticsAPI from '@/api/analytics'
import knowledgeAPI from '@/api/knowledge'
import StandaloneHeader from '@/components/StandaloneHeader.vue'
import katex from 'katex'

const stats = ref({})
const mastery = ref([])
const treeNodes = ref([])
const expanded = ref(new Set())

onMounted(async () => {
  try { stats.value = await analyticsAPI.getMyStats() } catch {}
  try { const r = await analyticsAPI.getMyMastery(); mastery.value = r.data || [] } catch {}
  try {
    const tree = await knowledgeAPI.getTree()
    const nodes = tree.data || tree.nodes || []
    // Merge mastery data into tree
    const mMap = {}
    for (const m of mastery.value) { mMap[m.id] = m.mastery }
    function merge(ns) {
      for (const n of ns) {
        n._mastery = mMap[n.id] !== undefined ? mMap[n.id] : undefined
        if (n.children) merge(n.children)
      }
    }
    merge(nodes)
    treeNodes.value = nodes.filter(n => n.children && n.children.length > 0)
    // Initially collapsed — user clicks to expand
  } catch {}
})

function toggleNode(id) {
  const s = new Set(expanded.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  expanded.value = s
}

function masteryClass(val) {
  if (val >= 0.8) return 'high'
  if (val >= 0.5) return 'mid'
  return 'low'
}
function formatDate(ts) { return ts ? new Date(ts).toLocaleDateString('zh-CN') : '' }

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
.standalone-page { height: 100vh; display: flex; flex-direction: column; background: #f8fafc; overflow-y: auto; }
.sa-body { flex: 1; padding: 24px 32px; max-width: 1000px; margin: 0 auto; width: 100%; }

.cards-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; border-radius: 12px; padding: 20px; border: 1px solid #eef2f6; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.stat-value { font-size: 28px; font-weight: 700; color: #3b82f6; }
.stat-label { font-size: 13px; color: #94a3b8; margin-top: 4px; }

.card { background: #f8fafc; border-radius: 16px; padding: 20px 24px; margin-bottom: 20px; border: 1px solid #eef2f6; }
.card-title { font-weight: 600; font-size: 16px; margin-bottom: 16px; color: #0b1e33; display: flex; align-items: center; gap: 8px; }
.card-title i { color: #3b82f6; }
.empty-state { text-align: center; padding: 32px 0; color: #94a3b8; }
.empty-state p { margin-top: 8px; font-size: 14px; }
.hint { font-size: 12px; color: #cbd5e1; margin-top: 4px; }

/* Tree mastery — 3 levels */
.tree-mastery { padding: 0; }
.tree-chapter { margin-bottom: 12px; }

/* Level 0: Chapter */
.ch-header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f0f9ff; border-radius: 8px; cursor: pointer; border-left: 3px solid #3b82f6; }
.ch-header:hover { background: #e0f2fe; }
.ch-header .fas { color: #3b82f6; width: 14px; font-size: 13px; }
.ch-label { font-size: 14px; font-weight: 600; color: #0b1e33; flex: 1; }
.ch-mastery { font-size: 13px; font-weight: 600; color: #3b82f6; }

.ch-children { margin-left: 20px; padding: 4px 0; }

/* Level 1: Section */
.tree-section-wrap { padding: 4px 0; }
.sec-header { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 6px; border-left: 2px solid #10b981; cursor: pointer; margin: 2px 0; }
.sec-header:hover { background: #f0fdf4; }
.sec-label { font-size: 13px; font-weight: 500; color: #334155; flex: 1; }
.sec-mastery { font-size: 12px; font-weight: 600; color: #475569; }
.sec-bar-wrap { height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; margin-left: 20px; }
.sec-bar { height: 100%; border-radius: 3px; transition: width 0.6s; }
.sec-bar.high { background: #22c55e; }
.sec-bar.mid { background: #3b82f6; }
.sec-bar.low { background: #f59e0b; }

/* Level 2: Knowledge Points */
.kp-children { margin-left: 24px; padding: 4px 0 8px; }
.kp-row { display: flex; align-items: center; gap: 6px; padding: 4px 8px; margin: 2px 0; border-radius: 4px; }
.kp-row:hover { background: #fafafa; }
.kp-dot { width: 6px; height: 6px; border-radius: 50%; background: #cbd5e1; flex-shrink: 0; }
.kp-title { font-size: 12px; color: #475569; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kp-mastery { font-size: 11px; font-weight: 600; color: #3b82f6; min-width: 36px; text-align: right; }
.kp-mastery.kp-na { color: #cbd5e1; }
.kp-bar-wrap { height: 4px; background: #f1f5f9; border-radius: 2px; overflow: hidden; width: 60px; flex-shrink: 0; }
.kp-bar { height: 100%; border-radius: 2px; transition: width 0.6s; }
.kp-bar.high { background: #22c55e; }
.kp-bar.mid { background: #3b82f6; }
.kp-bar.low { background: #f59e0b; }

/* Interactions */
.interaction-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
.interaction-item:last-child { border-bottom: none; }
.q-text { font-size: 14px; color: #0b1e33; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.q-meta { display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: 12px; }
.time { font-size: 12px; color: #94a3b8; }

@media (max-width: 768px) { .cards-row { grid-template-columns: repeat(2, 1fr); } }
</style>
