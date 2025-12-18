# 📄 Automated Resume System (LaTeX + GitHub Actions)

![Build Status](https://github.com/sf-mantis/sf-mantis.github.io/actions/workflows/latex_build.yml/badge.svg)
이 저장소는 **LaTeX**로 작성된 이력서를 **GitHub Actions**를 통해 자동으로 컴파일하고, **GitHub Pages**를 통해 배포하는 자동화 시스템입니다.

## 🚀 Project Overview

개발자로서 이력서의 버전 관리와 배포 효율성을 높이기 위해 구축했습니다.
`.tex` 소스 코드만 수정하여 Push하면, 서버가 자동으로 PDF를 생성하고 웹페이지에 반영합니다.

- **Live Demo:** [https://sf-mantis.github.io](https://sf-mantis.github.io)
- **Latest PDF:** [Download Resume](main.pdf)

## 🛠 Architecture & Workflow

이 프로젝트는 **IaC (Infrastructure as Code)** 개념을 이력서 관리에 적용했습니다.

1.  **Code:** 로컬 환경(VS Code)에서 `main.tex` (LaTeX 소스) 수정.
2.  **Push:** 수정 사항을 GitHub 저장소로 `git push`.
3.  **CI/CD (GitHub Actions):**
    - `latex_build.yml` 워크플로우가 트리거됨.
    - Ubuntu 컨테이너 위에서 `xelatex` 엔진이 가동.
    - `.tex` 파일을 컴파일하여 고품질 PDF 생성.
4.  **Deploy:** 생성된 PDF 파일을 자동으로 저장소에 Commit & Push 하여 배포 완료.

## 📂 Directory Structure

```bash
.
├── .github/workflows/
│   └── latex_build.yml  # CI/CD 자동화 스크립트 (Auto-compile Logic)
├── index.html           # Landing Page (포트폴리오 대문 & PDF 다운로드)
├── main.tex             # 이력서 원본 소스 코드 (LaTeX)
└── README.md            # 프로젝트 설명서