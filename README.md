# 智能学伴 · 前端

基于大模型的数学教材智能答疑系统前端，使用 Vue 3 + Element Plus 构建，配套后端见 [smart_classroom_backend](https://github.com/Park-C159/smart_classroom_backend)。

## 功能页面

| 角色 | 页面 |
|------|------|
| 学生 | 智能答疑（SSE 流式 + 引用来源）、学情分析、组卷 / 作业 / 测试 / 考试、讨论区、私信 |
| 教师 | 班级学情、题库管理、试题库管理、教材 / 习题上传、组卷与批改 |
| 管理员 | 管理后台主页、用户管理、知识树编辑 / 审核 / 分块管理、题库管理、解析审核 |

## 技术栈

- Vue 3 + Vite 5
- Element Plus（按需自动导入）
- Pinia + pinia-plugin-persistedstate（状态管理 + 持久化）
- Vue Router
- Axios（API 请求封装）
- KaTeX（本地字体，`public/katex-fonts/`，数学公式渲染，不依赖 CDN）
- marked + DOMPurify（Markdown 渲染 + 防 XSS）

## 目录结构

```
frontend/
├── index.html
├── package.json
├── vite.config.js               # 端口 / 代理 / 自动导入配置
├── public/
│   ├── favicon.svg
│   └── katex-fonts/             # KaTeX 本地字体
└── src/
    ├── main.js                  # 入口
    ├── App.vue
    ├── api/                     # Axios API 封装（auth/rag/exam/papers/testBank/messages/...）
    ├── stores/                  # Pinia（auth / conversations）
    ├── router/index.js          # 路由（含权限守卫 requiresAuth）
    ├── utils/math.js            # renderMath 等公式渲染工具
    ├── components/              # Layout / ChatBox / MathRenderer / VoiceInput 等
    └── views/
        ├── Login.vue
        ├── student/             # QAPage / AnalyticsPage / ExamPage
        ├── teacher/             # ClassAnalytics / QuestionBank / TestQuestionBank / MaterialUpload / ExerciseUpload
        ├── admin/               # Management / UserManagement / KnowledgeTreeEdit / KnowledgeReview / KnowledgeChunks / QuestionBankAdmin / ParseReview
        ├── discussion/          # DiscussionList / DiscussionDetail
        └── messages/            # MessageList / MessageThread
```

## 快速开始

### 1. 环境要求

- Node.js 18+（建议 20 LTS）

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

默认端口 `5173`，通过 Vite 代理将 `/api` 转发到后端：

```js
// vite.config.js
proxy: {
  '/api': {
    target: 'http://localhost:8001',
    changeOrigin: true,
  },
}
```

> 请确保后端已启动，且端口与 `target` 一致（如需修改，同步调整 `vite.config.js`）。

### 4. 构建生产版本

```bash
npm run build   # 产物输出到 dist/
npm run preview # 本地预览构建产物
```

## 隐私与安全

1. **前端不保存密钥**：所有 API Key（DeepSeek、百度搜索等）均只在后端 `.env` 中配置，前端代码不包含任何密钥。
2. **XSS 防护**：Markdown 渲染经 DOMPurify 消毒后再注入，避免富文本注入。
3. **公式渲染离线化**：KaTeX 使用本地字体（`public/katex-fonts/`），不请求外部 CDN，避免资源被拦截或泄露访问信息。
4. **构建产物不入库**：`dist/`、`node_modules/`、`*.log` 已被 `.gitignore` 排除，请勿提交。
5. **提交前自查**：`git add` 后确认无 `node_modules/`、`dist/` 被暂存。

## 许可

本仓库为课程/毕业设计项目，未指定开源许可。引用或复用前请先联系作者。
