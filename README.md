# 民意智感中心 - 市民端前端 (Vue3)

## 项目概述

市民端前端应用，提供市民注册、登录、提交信件、AI 辅助填写等功能。

- 框架: Vue 3 + Composition API
- 构建工具: Vite 5
- HTTP: Axios（Token 认证，无 cookie）
- 后端 API: http://localhost:8081（开发代理）

---

## 目录结构

```
people_page_web/
├── src/
│   ├── utils/
│   │   └── api.js              # Axios 实例（自动添加 Bearer Token）
│   ├── views/
│   │   ├── LoginPage.vue       # 登录/注册页
│   │   ├── SubmitLetter.vue    # 提交信件页
│   │   └── ...                 # 其他页面
│   ├── router.js               # 路由配置
│   ├── store.js                # 状态管理（含 Token 持久化）
│   ├── App.vue
│   └── main.js                 # 入口（localStorage Token 恢复）
├── index.html
├── vite.config.js
└── package.json
```

---

## 快速开始

### 1. 环境要求

- Node.js 18+
- npm 9+
- 市民端后端服务已启动（http://localhost:8081）

### 2. 安装依赖

```bash
cd /Users/liheng/work/people_page_web
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

浏览器访问 http://localhost:5174

### 4. 生产构建

```bash
npm run build
# 产物在 dist/ 目录
```

---

## 认证方式

市民端使用 **Token 认证**，不依赖 cookie，因此不会与管理端（`letter-manage-web`）发生 cookie 冲突。

### 登录流程

1. 用户输入手机号，获取验证码
2. 后端发验证码（开发模式直接返回验证码）
3. 用户输入验证码完成登录
4. 后端返回 Token，前端存入 `localStorage`
5. 后续请求自动在 `Authorization: Bearer <token>` 头携带

### Token 管理

- 存储位置: `localStorage` 的 `citizen_token` 字段
- 自动注入: Axios 请求拦截器自动添加
- 过期处理: 401 响应时自动清除 Token 并跳转登录页

---

## 本地域名配置

市民端使用 Token 认证，无需 cookie 隔离，但建议为两个平台配置不同的本地域名以便区分。

### 配置 hosts

```bash
sudo tee -a /etc/hosts << EOF

# letter-manage 平台本地域名（多平台 cookie 隔离）
127.0.0.1	admin.letter.local
127.0.0.1	citizen.letter.local
EOF
```

### 访问方式

| 平台 | 前端地址 |
|------|---------|
| 管理端（admin） | http://admin.letter.local:5173 |
| 市民端（citizen） | http://citizen.letter.local:5174 |

---

## 注意事项

1. 登录后 Token 存储在 `localStorage`，刷新页面不会丢失登录状态
2. 遇到 401 响应自动清除 Token 并跳转登录页
3. 开发模式验证码直接由后端返回（不会实际发送短信）
4. 市民端与管理端使用完全独立的用户体系（不同数据库表）
