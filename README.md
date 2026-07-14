# 💼 Q1 Jobs — Tech Career & Recruitment Board

> **Job board platform for tech professionals connecting top talent with high-impact software engineering roles.**

[![JavaScript](https://img.shields.io/badge/JavaScript-ESNext-yellow?style=flat-square&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![SaaS Platform](https://img.shields.io/badge/Platform-SaaS-purple?style=flat-square)](https://github.com/kreftamarcio/q1jobs)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

---

## Overview

Q1 Jobs is a focused recruitment and career marketplace engineered for software developers, product managers, and UI/UX designers. It delivers an intuitive, fast applicant tracking experience with dynamic filtering by technical stack (`TypeScript`, `React`, `Python`, `Go`), remote work eligibility, and compensation brackets.

## Features

- 🔍 **Real-Time Job Filtering:** Search and segment opportunities by stack, seniority level, and geographical flexibility instantly.
- 🚀 **Streamlined Application Workflow:** Candidate profile submission and resume attachment pipeline designed to maximize conversion rates.
- 📱 **Mobile-First Responsive Layout:** Fluid CSS grid architecture optimized for on-the-go browsing and recruiter reviews.
- 🛠️ **Modular Data Layer:** Clean JSON/REST data models allowing straightforward integration with external ATS backends.

## Tech stack

- **Frontend & Logic:** JavaScript (ESNext), HTML5 Semantic Architecture
- **Styling:** Vanilla CSS / Modern Flexbox & Grid layouts
- **Deployment:** Static & Serverless Cloud Hosting

## Screenshots

> Interactive job listing cards and candidate profile modals will be attached after the upcoming visual overhaul.

## Getting started

### Prerequisites

- Node.js (`v20+` if running local build server)
- Modern Web Browser (`Chrome`, `Firefox`, `Safari`, `Edge`)

### Installation

```bash
git clone https://github.com/kreftamarcio/q1jobs.git
cd q1jobs
```

### Environment variables

Copy `.env.example` to `.env.local` to define your API endpoint targets:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
| :--- | :--- | :--- |
| `API_BASE_URL` | Yes | Backend job listing API endpoint (`https://api.q1jobs.com/v1`) |
| `ANALYTICS_KEY` | No | Anonymous recruitment conversion tracking key |

### Development

You can serve the platform locally using any static HTTP server or Node utility:

```bash
# Using npx serve
npx serve . -p 3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
# If using a bundling step
npm run build
```

### Tests

```bash
npm test
```

## Project structure

```text
q1jobs/
├── assets/          # Stylesheets, icons, and company logo placeholders
├── scripts/         # Core application logic, search filtering, and DOM manipulation
├── data/            # Mock job listings and candidate schemas
└── index.html       # Main application entry layout
```

## Roadmap

- Add automated salary benchmarking calculator for software engineers.
- Build recruiter analytics dashboard for tracking application funnel metrics.
- Support one-click GitHub profile import for developer candidates.

## Contributing

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/job-filtering`).
3. Commit your changes (`git commit -m 'feat: improve job filtering'`).
4. Push to the branch (`git push origin feature/job-filtering`).
5. Open a Pull Request.

## License

Distributed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
