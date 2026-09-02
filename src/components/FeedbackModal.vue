<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="feedback-modal">
      <div class="fm-header">
        <h3><i class="fas fa-comment-dots"></i> 反馈建议</h3>
        <button class="fm-close" @click="$emit('close')"><i class="fas fa-times"></i></button>
      </div>

      <div class="fm-body">
        <div class="fm-categories">
          <span
            v-for="cat in categories"
            :key="cat.value"
            :class="['fm-cat', { active: form.category === cat.value }]"
            @click="form.category = cat.value"
          >
            {{ cat.emoji }} {{ cat.label }}
          </span>
        </div>

        <textarea
          v-model="form.content"
          class="fm-textarea"
          placeholder="请描述你的建议或遇到的问题..."
          maxlength="2000"
          rows="6"
        ></textarea>
        <div class="fm-count">{{ form.content.length }}/2000</div>

        <div v-if="submitted" class="fm-success">
          <i class="fas fa-check-circle"></i> 感谢你的反馈！我们会认真考虑。
        </div>
      </div>

      <div class="fm-footer">
        <button class="btn-cancel" @click="$emit('close')">取消</button>
        <button class="btn-submit" @click="submit" :disabled="!form.content.trim() || submitting">
          <i v-if="submitting" class="fas fa-spinner fa-spin"></i>
          {{ submitting ? '提交中...' : '提交反馈' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import request from '@/api/request'
import { ElMessage } from 'element-plus'

defineEmits(['close'])

const categories = [
  { value: 'feature', label: '功能建议', emoji: '💡' },
  { value: 'bug', label: 'Bug 反馈', emoji: '🐛' },
  { value: 'experience', label: '使用体验', emoji: '💬' },
]

const form = ref({ category: 'feature', content: '' })
const submitting = ref(false)
const submitted = ref(false)

async function submit() {
  if (!form.value.content.trim()) return
  submitting.value = true
  try {
    await request.post('/feedbacks', {
      category: form.value.category,
      content: form.value.content,
    })
    submitted.value = true
    setTimeout(() => { $emit?.('close') || window.history.back() }, 2000)
  } catch (e) {
    ElMessage.error('提交失败: ' + (e.response?.data?.detail || e.message))
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.feedback-modal {
  background: #fff;
  border-radius: 16px;
  width: 480px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  overflow: hidden;
}
.fm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 0;
}
.fm-header h3 {
  font-size: 18px;
  color: #0b1e33;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.fm-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
}
.fm-close:hover { color: #0f172a; }
.fm-body { padding: 16px 24px; }
.fm-categories {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.fm-cat {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.fm-cat:hover { background: #e2e8f0; }
.fm-cat.active {
  background: #eef2ff;
  border-color: #3b82f6;
  color: #1e40af;
}
.fm-textarea {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  resize: vertical;
  min-height: 120px;
  outline: none;
  color: #1e293b;
}
.fm-textarea:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.fm-count { text-align: right; font-size: 12px; color: #94a3b8; margin-top: 4px; }
.fm-success {
  margin-top: 12px;
  padding: 12px;
  background: #f0fdf4;
  border-radius: 10px;
  color: #16a34a;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.fm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid #eef2f6;
}
.btn-cancel {
  padding: 8px 20px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  cursor: pointer;
  font-size: 14px;
  font-family: 'Inter', sans-serif;
}
.btn-cancel:hover { background: #f1f5f9; }
.btn-submit {
  padding: 8px 20px;
  border-radius: 10px;
  border: none;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-family: 'Inter', sans-serif;
}
.btn-submit:hover { background: #2563eb; }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
