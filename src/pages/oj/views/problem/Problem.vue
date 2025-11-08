<template>
  <div class="problem-page">
    <div class="problem-layout">
      <!-- 🟩 왼쪽: 문제 정보 영역 -->
      <section class="problem-info">
        <h2>#{{ problem._id }}. {{ problem.title }}</h2>

        <div class="problem-card">
          <h4>Description</h4>
          <p v-html="problem.description"></p>
        </div>

        <div class="problem-card">
          <h4>Input</h4>
          <p v-html="problem.input_description"></p>
        </div>

        <div class="problem-card">
          <h4>Output</h4>
          <p v-html="problem.output_description"></p>
        </div>

        <div
          v-for="(sample, index) in problem.samples"
          :key="index"
          class="problem-card sample"
        >
          <h4>Sample {{ index + 1 }}</h4>
          <pre>{{ sample.input }}</pre>
          <pre>{{ sample.output }}</pre>
        </div>

        <feedback-panel />
      </section>

      <!-- 🟦 오른쪽: 코드 작성 및 실행 영역 -->
      <section class="problem-editor">
        <div class="editor-header">
          <Button type="default" icon="refresh" @click="onResetToTemplate">초기화</Button>
          <Button type="success" icon="play" @click="runCode">실행</Button>
          <Button type="primary" icon="send" @click="submitCode">제출</Button>
        </div>

        <CodeMirror
          :value.sync="code"
          :languages="problem.languages"
          :language="language"
          :theme="theme"
          @changeLang="onChangeLang"
          @changeTheme="onChangeTheme"
        />
      </section>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { types } from '../../../../store'
import CodeMirror from '@oj/components/CodeMirror.vue'
import storage from '@/utils/storage'
import { FormMixin } from '@oj/components/mixins'
import { JUDGE_STATUS, CONTEST_STATUS, buildProblemCodeKey } from '@/utils/constants'
import api from '@oj/api'
import FeedbackPanel from '@/components/FeedbackPanel.vue'

export default {
  name: 'Problem',
  components: {
    CodeMirror,
    FeedbackPanel
  },
  mixins: [FormMixin],

  data () {
    return {
      statusVisible: false,
      captchaRequired: false,
      captchaCode: '',
      captchaSrc: '',
      contestID: '',
      problemID: '',
      submitting: false,
      code: '',
      language: 'C++',
      theme: 'solarized',
      submissionId: '',
      submitted: false,
      result: { result: 9 },
      problem: {
        title: '',
        description: '',
        input_description: '',
        output_description: '',
        hint: '',
        my_status: '',
        template: {},
        languages: [],
        created_by: { username: '' },
        tags: [],
        io_mode: { io_mode: 'Standard IO' },
        samples: []
      }
    }
  },

  // ✅ 페이지 진입 시 로컬 저장 코드 불러오기
  beforeRouteEnter (to, from, next) {
    const saved = storage.get(buildProblemCodeKey(to.params.problemID, to.params.contestID))
    if (saved) {
      next(vm => {
        vm.language = saved.language
        vm.code = saved.code
        vm.theme = saved.theme
      })
    } else {
      next()
    }
  },

  mounted () {
    this.$store.commit(types.CHANGE_CONTEST_ITEM_VISIBLE, { menu: false })
    this.init()
  },

  methods: {
    ...mapActions(['changeDomTitle']),

    // ✅ 문제 정보 초기화 및 불러오기
    init () {
      this.$Loading.start()
      this.contestID = this.$route.params.contestID
      this.problemID = this.$route.params.problemID
      const func = this.$route.name === 'problem-details' ? 'getProblem' : 'getContestProblem'

      api[func](this.problemID, this.contestID).then(res => {
        this.$Loading.finish()
        const problem = res.data.data
        this.changeDomTitle({ title: problem.title })

        api.submissionExists(problem.id).then(r => {
          this.submissionExists = r.data.data
        })

        problem.languages = problem.languages.sort()
        this.problem = problem

        // 코드 템플릿 로드
        if (this.code === '' && problem.template) {
          this.language = problem.languages[0]
          const template = problem.template[this.language]
          if (template) this.code = template
        }
      }, () => {
        this.$Loading.error()
      })
    },

    // ✅ 코드 제출 기능 (백엔드 로직 그대로)
    submitCode () {
      if (this.code.trim() === '') {
        this.$error(this.$i18n.t('m.Code_can_not_be_empty'))
        return
      }

      this.submitting = true
      this.submissionId = ''
      this.result = { result: 9 }

      const data = {
        problem_id: this.problem.id,
        language: this.language,
        code: this.code,
        contest_id: this.contestID
      }
      if (this.captchaRequired) data.captcha = this.captchaCode

      api.submitCode(data).then(res => {
        this.submitting = false
        this.submissionId =
          res.data && res.data.data
            ? res.data.data.submission_id
            : null

        this.$Modal.success({
          title: this.$i18n.t('m.Success'),
          content: this.$i18n.t('m.Submit_code_successfully')
        })
      }).catch(err => {
        this.submitting = false
        if (err.data && err.data.data && err.data.data.startsWith('Captcha is required')) {
          this.captchaRequired = true
          this.getCaptchaSrc()
        }
      })
    },

    // ✅ “실행” 버튼 이벤트 (UI 전용, 백엔드 영향 없음)
    runCode () {
      if (this.code.trim() === '') {
        this.$error(this.$i18n.t('m.Code_can_not_be_empty'))
        return
      }

      this.$Loading.start()
      this.$info(this.$i18n.t('m.Running_your_code'))

      setTimeout(() => {
        this.$Loading.finish()
        this.$Modal.info({
          title: this.$i18n.t('m.Execution_Result'),
          content: `
            <p>코드 실행이 완료되었습니다.</p>
            <p>결과는 채점 서버와 무관하게 시각적 테스트용입니다.</p>
          `
        })
      }, 1500)
    },

    // ✅ 코드 초기화 버튼
    onResetToTemplate () {
      this.$Modal.confirm({
        content: this.$i18n.t('m.Are_you_sure_you_want_to_reset_your_code'),
        onOk: () => {
          const template = this.problem.template
          if (template && template[this.language]) {
            this.code = template[this.language]
          } else {
            this.code = ''
          }
        }
      })
    },

    // ✅ 언어 / 테마 변경
    onChangeLang (newLang) {
      const template = this.problem.template
      if (template && template[newLang] && this.code.trim() === '') {
        this.code = template[newLang]
      }
      this.language = newLang
    },
    onChangeTheme (newTheme) {
      this.theme = newTheme
    },

    getCaptchaSrc () {
      this.captchaSrc = `/api/captcha?time=${new Date().getTime()}`
    }
  },

  computed: {
    ...mapGetters(['problemSubmitDisabled'])
  },

  // ✅ 페이지 이동 시 로컬 저장
  beforeRouteLeave (to, from, next) {
    clearInterval(this.refreshStatus)
    this.$store.commit(types.CHANGE_CONTEST_ITEM_VISIBLE, { menu: true })
    storage.set(buildProblemCodeKey(this.problem._id, from.params.contestID), {
      code: this.code,
      language: this.language,
      theme: this.theme
    })
    next()
  },

  watch: {
    '$route' () {
      this.init()
    }
  }
}
</script>


<style lang="less" scoped>
.problem-page {
  background-color: #f9fafb;
  min-height: 100vh;
  padding: 24px;
}

/* 전체 레이아웃: 좌측 문제 / 우측 코드 */
.problem-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

/* 🟩 좌측 문제 영역 */
.problem-info {
  flex: 1;
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  h2 {
    font-weight: 600;
    font-size: 22px;
    margin-bottom: 16px;
    color: #111827;
  }

  .problem-card {
    background: #f3f4f6;
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 16px;
    box-shadow: inset 0 0 0 1px #e5e7eb;

    h4 {
      font-size: 16px;
      font-weight: 600;
      color: #2563eb;
      margin-bottom: 8px;
    }

    p, pre {
      font-size: 15px;
      line-height: 1.6;
      color: #374151;
      background: #ffffff;
      border-radius: 8px;
      padding: 8px 10px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    pre {
      border: 1px solid #d1d5db;
      background: #f9fafb;
      margin-top: 6px;
    }
  }
}

/* 🟦 우측 코드 에디터 영역 */
.problem-editor {
  flex: 1.2;
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  .editor-header {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-bottom: 12px;

    button {
      border-radius: 8px;
      font-weight: 500;
    }

    .ivu-btn-default {
      background: #e5e7eb;
      color: #111827;
    }

    .ivu-btn-success {
      background: #10b981;
      color: white;
    }

    .ivu-btn-primary {
      background: #3b82f6;
      color: white;
    }
  }
}

/* 🟨 AI 피드백 영역 */
.feedback-panel {
  margin-top: 20px;

  h4 {
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 8px;
  }

  .feedback-card {
    background: #eef2ff;
    border-radius: 8px;
    padding: 10px 15px;
    margin-bottom: 10px;
    color: #1e3a8a;
  }

  .feedback-hint {
    background: #fef9c3;
    border-radius: 8px;
    padding: 10px 15px;
    color: #78350f;
  }
}

/* 반응형 (선택적) */
@media (max-width: 1100px) {
  .problem-layout {
    flex-direction: column;
  }
}
</style>
