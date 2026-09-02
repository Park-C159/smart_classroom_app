<template>
  <div class="cropper-overlay" @click.self="$emit('close')">
    <div class="cropper-dialog">
      <div class="cropper-header">
        <span><i class="fas fa-crop-alt"></i> 裁剪题目（拖拽选区，右下角缩放）</span>
        <button class="cropper-close" @click="$emit('close')"><i class="fas fa-times"></i></button>
      </div>

      <div class="cropper-stage" ref="stageRef">
        <img ref="imgRef" :src="src" draggable="false" @load="onImgLoad" @error="loadError = true" />
        <div
          v-if="ready"
          class="crop-box"
          :style="boxStyle"
          @pointerdown="startDrag"
        >
          <span class="crop-handle" @pointerdown.stop="startResize"></span>
        </div>
        <div v-if="loadError" class="cropper-loading">无法加载此图片（可能是 HEIC 格式，请在手机里选「兼容性最好/JPG」后重试）</div>
        <div v-else-if="!ready" class="cropper-loading">加载中…</div>
      </div>

      <div class="cropper-footer">
        <button class="btn btn-outline" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="confirm">确定并识别</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const props = defineProps({ src: { type: String, required: true } })
const emit = defineEmits(['close', 'cropped'])

const stageRef = ref(null)
const imgRef = ref(null)
const ready = ref(false)
const loadError = ref(false)

// 显示尺寸
let dispW = 0, dispH = 0
let naturalW = 0, naturalH = 0

const box = reactive({ x: 0, y: 0, w: 0, h: 0 })
const boxStyle = computed(() => ({
  left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px',
}))

function onImgLoad() {
  const img = imgRef.value
  const stage = stageRef.value
  if (!img || !stage) return
  naturalW = img.naturalWidth
  naturalH = img.naturalHeight
  // 适配舞台宽度（max 420px），等比缩放
  const maxW = Math.min(stage.clientWidth - 24, 420)
  const scale = Math.min(1, maxW / naturalW)
  dispW = Math.round(naturalW * scale)
  dispH = Math.round(naturalH * scale)
  img.style.width = dispW + 'px'
  img.style.height = dispH + 'px'
  // 初始选区：80% 居中
  const w = Math.round(dispW * 0.8)
  const h = Math.round(dispH * 0.8)
  box.x = Math.round((dispW - w) / 2)
  box.y = Math.round((dispH - h) / 2)
  box.w = w
  box.h = h
  ready.value = true
}

// ── 拖拽移动选区 ──
function startDrag(e) {
  e.preventDefault()
  const startX = e.clientX, startY = e.clientY
  const origX = box.x, origY = box.y
  const move = (ev) => {
    box.x = clamp(origX + (ev.clientX - startX), 0, dispW - box.w)
    box.y = clamp(origY + (ev.clientY - startY), 0, dispH - box.h)
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

// ── 右下角缩放选区 ──
function startResize(e) {
  e.preventDefault()
  const startX = e.clientX, startY = e.clientY
  const origW = box.w, origH = box.h
  const move = (ev) => {
    box.w = clamp(origW + (ev.clientX - startX), 30, dispW - box.x)
    box.h = clamp(origH + (ev.clientY - startY), 30, dispH - box.y)
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

// ── 确定：裁剪并输出 JPEG ──
function confirm() {
  const img = imgRef.value
  if (!img || !ready.value) return
  const sx = naturalW / dispW
  const sy = naturalH / dispH
  // 原始坐标的裁剪区域，并限制最大 1600px（手机照片过大，VLM 处理慢/易失败）
  let outW = Math.round(box.w * sx)
  let outH = Math.round(box.h * sy)
  const MAX = 1600
  const down = Math.min(1, MAX / Math.max(outW, outH))
  outW = Math.max(1, Math.round(outW * down))
  outH = Math.max(1, Math.round(outH * down))
  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  ctx.drawImage(
    img,
    box.x * sx, box.y * sy, box.w * sx, box.h * sy,  // 源区域（原始坐标）
    0, 0, outW, outH,
  )
  canvas.toBlob((blob) => {
    if (blob) emit('cropped', blob)
    else emit('close')
  }, 'image/jpeg', 0.9)
}
</script>

<style scoped>
.cropper-overlay {
  position: fixed; inset: 0; z-index: 1200;
  background: rgba(15, 23, 42, 0.6);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.cropper-dialog {
  background: #fff; border-radius: 16px; width: 100%; max-width: 480px;
  display: flex; flex-direction: column; overflow: hidden;
}
.cropper-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #0f172a;
}
.cropper-close { background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 4px 8px; }
.cropper-close:hover { color: #ef4444; }
.cropper-stage {
  position: relative; min-height: 160px; max-height: 56vh; overflow: auto;
  background: #0f172a; display: flex; align-items: center; justify-content: center; padding: 12px;
}
.cropper-stage img { display: block; user-select: none; -webkit-user-drag: none; }
.cropper-loading { color: #94a3b8; font-size: 13px; }
.crop-box {
  position: absolute; border: 2px solid #3b82f6; cursor: move; touch-action: none;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.4);
}
.crop-handle {
  position: absolute; right: -8px; bottom: -8px; width: 18px; height: 18px;
  background: #3b82f6; border: 2px solid #fff; border-radius: 50%; cursor: nwse-resize;
}
.cropper-footer {
  display: flex; justify-content: flex-end; gap: 10px; padding: 12px 16px; border-top: 1px solid #e2e8f0;
}
</style>
