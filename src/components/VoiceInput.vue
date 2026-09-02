<template>
  <el-button circle :icon="Microphone" @pointerdown="start" @pointerup="stop">
  </el-button>
</template>

<script setup>
// VoiceInput — will be implemented in Stage 3 with MediaRecorder + Whisper
import { Microphone } from '@element-plus/icons-vue'

function start() { console.log('Recording started') }
function stop() { console.log('Recording stopped') }
</script>
