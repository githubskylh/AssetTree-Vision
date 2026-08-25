# 🌐 AssetTree-Vision (URL 全维度资产穿透与树状拓扑图可视化系统)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![React Flow](https://img.shields.io/badge/Graph-React%20Flow-ff0072.svg)](https://reactflow.dev/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-000000.svg)](https://nextjs.org/)

> **AssetTree-Vision** 是一款现代化的在线全维度 URL 资产透视与站点拓扑分析工具。输入任意 URL（主域/多级子域/深层页面路径），系统能够自动执行横向同根关联域探测、纵向多级子域名挖掘以及站内深层子页面/JS隐蔽路由穿透，并通过高美感的 React Flow 卡片式拓扑图进行动态流式（SSE）生长呈现。

---

## 🌟 核心特性

- 🎯 **智能 URL 归一化**：基于 Public Suffix List 精确拆解任意输入，自动识别主域名、多级子域名与起始路径。
- 🌳 **三维资产穿透引擎**：
  - **横向关联**：基于 SSL 证书 SANs 备用名称与 Favicon Hash 反查兄弟主域名。
  - **纵向深挖**：融合公开证书透明度日志 (CT Logs) 与超高并发异步 DNS 校验。
  - **叶脉穿透**：DOM 静态链接递归嗅探 + 现代 SPA 前端打包 JS 隐蔽路由 AST/正则提取。
- 🎨 **现代化赛博美学 UI**：
  - 极简深色玻璃拟态 (Glassmorphism) 设计。
  - React Flow 卡片式节点流图，内置状态码呼吸灯、IP/ASN 徽章与手风琴式子页面抽屉。
  - Server-Sent Events (SSE) 毫秒级单向流式推送，呈现“植物萌芽生长”般的动态图谱渲染。
- 🚀 **GitHub Actions 全自动 CI/CD**：代码提交自动运行审计检查并热更新部署。

---

## 🏗️ 架构概览

```
[前端界面: Next.js 14 + React Flow + TailwindCSS]
       │
       │ (HTTP SSE 实时流式传输)
       ▼
[探测中枢: FastAPI + aiodns + httpx + JS Route Extractor]
       │
       ├── 被动源: CT Logs (crt.sh / Certspotter)
       ├── 主动源: 异步并发 DNS 解析器
       └── 爬虫源: DOM Spider + JS 路由逆向引擎
```

---

## 🛠️ 本地快速启动

### 1. 后端探查服务 (Backend)
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. 前端展示工程 (Frontend)
```bash
cd frontend
npm install
npm run dev
```

浏览器打开 `http://localhost:3000` 即可体验。

---

## 📄 开源协议
本项目采用 [MIT License](LICENSE) 授权。
