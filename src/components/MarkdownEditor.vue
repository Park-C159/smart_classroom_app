<template>
  <div class="markdown-editor">
    <el-input
      type="textarea"
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      :rows="8"
      placeholder="支持 Markdown 语法和 LaTeX 公式..."
    />
    <div class="editor-toolbar">
      <el-button-group>
        <el-button size="small" @click="insertTemplate('**粗体**')"><strong>B</strong></el-button>
        <el-button size="small" @click="insertTemplate('*斜体*')"><em>I</em></el-button>
        <el-button size="small" @click="insertTemplate('$公式$')">LaTeX</el-button>
        <el-button size="small" @click="insertTemplate('```\n代码\n```')">代码</el-button>
      </el-button-group>
    </div>
  </div>
</template>

<script setup>
// MarkdownEditor — simple MD editor with LaTeX helpers
// Will be enhanced in Stage 2-3
defineProps({ modelValue: { type: String, default: '' } })
defineEmits(['update:modelValue'])

function insertTemplate(_template) {
  // Will be implemented with proper cursor-aware insertion
  console.log('Insert:', _template)
}
</script>

<style scoped>
.markdown-editor {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.editor-toolbar {
  padding: 6px 8px;
  background: var(--bg);
  border-top: 1px solid var(--border);
}
</style>
