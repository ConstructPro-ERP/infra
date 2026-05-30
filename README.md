# ConstructPro ERP - Infrastructure

## Project Description

This repository contains the Infrastructure as Code (Docker, docker-compose, CI/CD configurations, deployment scripts) for the **ConstructPro ERP** system. It supports the deployment and orchestration of the backend API, frontend application, and database services.

**Broader Project:** [ConstructPro ERP Organization](https://github.com/ConstructPro-ERP)

## Prerequisites

- Docker & Docker Compose
- Environment Variables (see `.env.example`)

## Installation & Run Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ConstructPro-ERP/infra.git
   cd infra
   ```
2. **Set up environment variables:**
   Copy `.env.example` to `.env` and configure your infrastructure secrets.
   ```bash
   cp .env.example .env
   ```
3. **Spin up the environment:**
   ```bash
   docker-compose up -d
   ```

## Deployed Application

Infrastructure provisions: [ConstructPro ERP (Staging)](https://staging.constructpro.com)
