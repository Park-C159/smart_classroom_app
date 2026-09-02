<template>
  <div class="math-renderer" v-html="rendered" />
</template>

<script setup>
import { computed } from 'vue'
import katex from 'katex'

const props = defineProps({ content: { type: String, default: '' } })

const rendered = computed(() => {
  if (!props.content) return ''
  let html = props.content
  // Normalize legacy delimiters
  html = html.replace(/\\\(([\s\S]*?)\\\)/g, (_, f) => `$${f.trim()}$`)
  html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, f) => `$$\n${f.trim()}\n$$`)
  // Render display math: $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    try { return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false }) }
    catch { return `<span class="katex-error">${formula}</span>` }
  })
  // Render inline math: $...$
  html = html.replace(/\$([^\$]+?)\$/g, (_, formula) => {
    try { return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false }) }
    catch { return `<span class="katex-error">${formula}</span>` }
  })
  return html
})
</script>

<style>
.math-renderer .katex { font-size: 1.1em; }
.math-renderer .katex-display { margin: 0.6em 0; overflow-x: auto; }
.katex-error { color: #dc2626; background: #fef2f2; padding: 2px 4px; border-radius: 3px; font-size: 12px; }
</style>
