<template>
  <div class="feedback-panel">
    <h4>AI 튜터 피드백</h4>
    <div class="feedback-card">
      오류가 감지되지 않았습니다.
    </div>
    <div class="feedback-hint">
      💡 단계별 힌트가 여기에 표시됩니다.
    </div>
  </div>
</template>

<script>
export default {
  name: 'FeedbackPanel'
}
</script>

<style scoped>
.feedback-panel {
  margin-top: 20px;
}
.feedback-card {
  background: #eef2ff;
  border-radius: 8px;
  padding: 10px 15px;
  margin-bottom: 8px;
  color: #1e3a8a;
}
.feedback-hint {
  background: #fef9c3;
  border-radius: 8px;
  padding: 10px 15px;
  color: #78350f;
}
</style>
