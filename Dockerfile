# ============================================================
# people_page_web — 企业级多阶段构建
# Vue3/Vite SPA → Nginx 静态服务 + API 反向代理
# ============================================================

# ── Stage 1: 构建前端产物 ───────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /src
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY . .
RUN npm run build

# ── Stage 2: Nginx 运行时 ───────────────────────────────────
FROM nginx:1.27-alpine

# 删除默认配置
RUN rm -f /etc/nginx/conf.d/default.conf

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=builder /src/dist /usr/share/nginx/html

# 健康检查
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
    CMD wget -qO- http://localhost:5174/ || exit 1

EXPOSE 5174

CMD ["nginx", "-g", "daemon off;"]
