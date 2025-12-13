# Documentation Index / ドキュメント索引

## 📚 Main Documentation / 主要ドキュメント

### Project Overview / プロジェクト概要
- **[README.md](../README.md)** - Main project documentation (English/Japanese)
  - Quick start guide
  - Technology stack
  - Development setup
  - Docker deployment
  - Troubleshooting

### Technical Documentation / 技術ドキュメント

#### Architecture / アーキテクチャ
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and design
  - Component overview
  - Data flow diagrams
  - Security architecture
  - Technology choices
  - Extensibility guide

#### Deployment / デプロイ
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
  - AWS EC2 deployment
  - HTTPS/SSL configuration
  - Database migration to RDS
  - ECS Fargate deployment
  - Monitoring and logging
  - Backup strategies
  - Security checklist

#### API / API仕様
- **[API.md](API.md)** - Backend API reference
  - Endpoints documentation
  - Authentication methods
  - Request/response examples
  - Error codes
  - Database schema

#### Features / 機能
- **[VIRTUAL_TRACKERS.md](VIRTUAL_TRACKERS.md)** - Virtual tracker system
  - 11-point tracker overview
  - Usage instructions
  - IK solver details
  - Troubleshooting
  - Advanced tips

---

## 🧩 Repository Meta / リポジトリ運用

- **[LICENSE](../LICENSE)** - Project license
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guide
- **[SECURITY.md](../SECURITY.md)** - Security policy
- **[public/README.md](../public/README.md)** - Public static files directory

## 📁 Component-specific Documentation / コンポーネント別ドキュメント

### Frontend
- **[frontend/README.md](../frontend/README.md)** - Vue 3 + Vite frontend
  - Development setup
  - Build process
  - Project structure

### Backend
- **[backend/README.md](../backend/README.md)** - Backend services overview
  - Java (Spring Boot)
  - Python (Flask) - Optional

#### Java Backend
- **[backend/java/README.md](../backend/java/README.md)** - Spring Boot service
  - Technology stack
  - Package structure
  - Run instructions

#### Python Service
- **[backend/python/README.md](../backend/python/README.md)** - Flask service
  - Setup instructions
  - API endpoints

---

## 🗂️ Documentation Structure / ドキュメント構造

```
MokuMokuDanceWeb/
├── README.md                    # Main project README (English/Japanese)
├── docs/                        # Technical documentation
│   ├── INDEX.md                 # This file
│   ├── ARCHITECTURE.md          # System architecture
│   ├── DEPLOYMENT.md            # Production deployment
│   ├── API.md                   # API reference
│   └── VIRTUAL_TRACKERS.md      # Virtual tracker feature
├── frontend/
│   └── README.md                # Frontend-specific docs
└── backend/
    ├── README.md                # Backend overview
    ├── java/README.md           # Java backend docs
    └── python/README.md         # Python service docs
```

---

## 🔍 Quick Navigation / クイックナビゲーション

### Getting Started / 始め方
1. [Project README](../README.md#quick-start) - Quick start guide
2. [Frontend Setup](../frontend/README.md) - Frontend development
3. [Backend Setup](../backend/README.md) - Backend services

### Development / 開発
1. [Architecture Overview](ARCHITECTURE.md) - Understand the system
2. [API Reference](API.md) - API integration
3. [Virtual Trackers](VIRTUAL_TRACKERS.md) - Feature documentation

### Deployment / デプロイ
1. [Local Docker](../README.md#docker-deployment) - Docker Compose setup
2. [Production AWS](DEPLOYMENT.md) - AWS deployment guide
3. [Security Checklist](DEPLOYMENT.md#security-checklist) - Production security

---

## 📝 Document Conventions / ドキュメント規約

### Language / 言語
- Main technical docs in `docs/` are **bilingual** (English/Japanese)
- Repo meta docs (e.g. `LICENSE`, `SECURITY.md`) may be **English-first**
- Use `[English](#english)` and `[日本語](#japanese)` anchors where applicable

### Format / フォーマット
- **Markdown (.md)** for all documentation
- Use emoji headers for visual organization (🎭 🛠️ 🚀 📦 etc.)
- Code blocks with syntax highlighting
- Tables for structured data

### Links / リンク
- Use **relative paths** for internal documentation links
- Example: `[README](../README.md)` instead of absolute URLs

---

## 🔄 Change Log / 変更履歴

### 2025-12-13
- **Public repo readiness refresh**
  - Fixed `/api/*` reverse-proxy behavior and clarified health-check URLs
  - Added `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, and `public/README.md`

### 2025-10-31
- **Reorganized documentation structure**
  - Moved all technical docs to `docs/` directory
  - Created bilingual main README
  - Consolidated Docker/deployment docs into single files
  - Simplified component-specific READMEs
  - Removed redundant documentation files

### Previous Structure (Removed) / 旧構成（削除済み）
- ❌ `DOCKER_QUICKSTART.md` - Integrated into main README
- ❌ `DOCKER_SETUP.md` - Integrated into main README
- ❌ `PRODUCTION_DEPLOYMENT.md` - Moved to `docs/DEPLOYMENT.md`
- ❌ `frontend/docs/virtual-trackers.md` - Moved to `docs/VIRTUAL_TRACKERS.md`

---

## 📧 Contributing / 貢献

When adding new documentation:
1. Place technical docs in `docs/` directory
2. Use bilingual format (English/Japanese)
3. Update this index file
4. Follow markdown formatting conventions
5. Test all internal links

---

**Last Updated**: December 13, 2025
