<template>
  <div class="chat-box">
    <div class="messages" ref="messagesRef">
      <slot />
    </div>
  </div>
</template>

<script setup>
// ChatBox — will be implemented in Stage 3 with SSE streaming, citations, etc.
</script>

<style scoped>
.chat-box { height: 100%; overflow: hidden; }
.messages { overflow-y: auto; height: 100%; }
</style>
