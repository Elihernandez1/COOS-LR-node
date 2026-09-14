# COOS-LR — Customizable Online Ordering System for Local Restaurants

A multi-tenant SaaS web application that enables technology freelancers to deploy fully branded digital ordering platforms for local, independent restaurants.

Built with Node.js, Express.js, and PostgreSQL (via the `pg` library). This is the production rewrite of the original Flask/Python prototype — see [COOS-LR-flask](https://github.com/Elihernandez1/COOS-LR-flask).

## Live Demo

[coos-lr-node.onrender.com](https://coos-lr-node.onrender.com)

> Hosted on Render's free tier — the first load after inactivity can take up to a minute to spin up.

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@coos-lr.com | demo123 |
| Luigi's Staff | staff@luigi.com | demo123 |
| Sakura Staff | staff@sakura.com | demo123 |
| Brew & Bean Staff | staff@brewbean.com | demo123 |

## Demo Restaurants

- Luigi's Pizzeria → /order/pizzeria-luigi
- Sakura Sushi → /order/sakura-sushi
- Brew & Bean Coffee → /order/brew-and-bean

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express.js |
| Database | PostgreSQL (Render managed), accessed via `pg` |
| Auth | bcrypt, session-based RBAC |
| Deployment | Render.com |

## Features

- Multi-tenant architecture with fully isolated restaurant data
- Three user portals: Customer, Restaurant Staff, Admin
- Role-Based Access Control (RBAC)
- Customer ordering flow: browse menu, cart, checkout
- Order management with real-time status tracking
- Admin dashboard with tenant management and analytics

## Run Locally

npm install
npm start

Then open http://localhost:3000

Requires a `.env` file with `DATABASE_URL` and `JWT_SECRET` set (see `.gitignore` — never commit this file).
