# 智能学伴 · 前端（Smart Classroom App）

> 面向本科生数学教材的智能答疑系统前端，基于 Vue 3 + Element Plus 构建。

![Vue](https://img.shields.io/badge/Vue-3.4+-4FC08D?logo=vue.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Element Plus](https://img.shields.io/badge/Element_Plus-2.7+-409EFF)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

配套后端：[smart_classroom_backend](https://github.com/Park-C159/smart_classroom_backend)

## 简介

智能学伴（Smart Classroom）是一套面向高校数学课程的智能教学辅助系统。本仓库为**前端应用**，提供智能答疑、学情分析、组卷作答、讨论区与私信等交互界面，并通过 REST / SSE 接口与后端通信。

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
    ├── assets/                  # 全局样式等
    ├── components/              # Layout / ChatBox / MathRenderer / VoiceInput 等
    └── views/
        ├── Login.vue
        ├── student/             # QAPage / AnalyticsPage / ExamPage
        ├── teacher/             # ClassAnalytics / QuestionBank / TestQuestionBank / MaterialUpload / ExerciseUpload
        ├── admin/               # Management / UserManagement / KnowledgeTreeEdit / KnowledgeReview / KnowledgeChunks / QuestionBankAdmin / ParseReview
        ├── discussion/          # DiscussionList / DiscussionDetail
        └── messages/            # MessageList（微信式双栏消息）
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

## 贡献指南

欢迎提交 Issue 与 Pull Request。

1. Fork 本仓库，克隆到本地；
2. 新建分支：`git checkout -b feature/your-feature`；
3. 提交改动，遵循既有代码风格（组件按 `views` / `components` 分层，接口封装在 `api/`）；
4. 推送到你的 Fork，发起 Pull Request 到 `main` 分支。

## 开源许可

本项目采用 [MIT License](LICENSE)。

## 相关项目

- 后端：[smart_classroom_backend](https://github.com/Park-C159/smart_classroom_backend)
