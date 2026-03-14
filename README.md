# Claudinho

SaaS inventory management system for small businesses, built as a modular monolith. Enables product registration, stock movement tracking (inflows and outflows), and provides a centralized dashboard with stock health indicators to support logistics decisions.

Multi-tenant via row-level tenancy — each registered organization accesses exclusively its own data, with isolation enforced by PostgreSQL RLS and application-layer guards.

Two main user personas: stock operators (responsible for recording movements and products) and managers (responsible for viewing the dashboard and making data-driven decisions).

**Stack:** NestJS (back-end) · React + Vite (front-end) · PostgreSQL (database) · Prisma (ORM)

**Vibe-coded with Claude Code as an experiment [suggested by Akita](https://akitaonrails.com/2026/02/20/do-zero-a-pos-producao-em-1-semana-como-usar-ia-em-projetos-de-verdade-bastidores-do-the-m-akita-chronicles/#o-claudemd-a-spec-que-evolui)**

For architecture decisions, development setup, coding conventions and domain rules, see [CLAUDE.MD](./CLAUDE.MD).
