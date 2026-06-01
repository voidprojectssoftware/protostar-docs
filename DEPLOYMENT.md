# Deployment architecture

This repo is **public**. Its job is to hold documentation source and the site
that presents it. It deliberately contains **no information about how or where
the site is hosted** — no deploy workflow, no host config files, no secrets, no
internal hostnames. That detail lives in a separate **private** repo.

This document explains the split and the reasoning. It intentionally describes
the *shape* of the setup, not the specific endpoints, accounts, or credentials.

## The split: public content, private deployment

```
  ┌────────────────────────────┐         ┌─────────────────────────────┐
  │  protostar-docs  (PUBLIC)   │         │   docs-deploy  (PRIVATE)    │
  │                             │         │                             │
  │  • Markdown / MDX           │  build  │  • deploy workflow          │
  │  • Docusaurus config        │ trigger │  • host config              │
  │  • docs.manifest.json       │ ──────▶ │  • secrets / tokens         │
  │  • PR build-check (no       │         │  • checks out public repo,  │
  │    secrets)                 │         │    builds, and ships the    │
  │                             │         │    static output            │
  └────────────────────────────┘         └─────────────────────────────┘
```

The public repo can be built by anyone (`npm run build` produces `./build`), but
it never knows where that output goes. The private repo checks out the public
content, runs the same build, and deploys the artifact.

### Why split at all

The easy path for every host (GitHub Pages branch publishing, Cloudflare /
Netlify / Vercel Git integration) wants config files and a deploy workflow to sit
in the same repo as the content. If that repo is public, all of it is public —
the host, the domain, the deploy method, the names of every secret. Moving the
deploy step into a private repo keeps the public repo at 100% content and zero
operational signal.

### What we keep out of this public repo

These never get committed here (and are listed in `.gitignore` as a backstop):

- `.github/workflows/*` deploy jobs (a PR build-check that uses no secrets is the
  only workflow allowed here)
- `CNAME` (would commit the custom domain into git history)
- `wrangler.toml`, `netlify.toml`, `vercel.json` (host + account identifiers)
- any `cloudflared` tunnel config or internal hostnames

## How the build is triggered across repos

Two mechanisms, used together:

1. **Push trigger** — on merge to this repo's `main`, a tiny workflow fires a
   `repository_dispatch` at the private deploy repo (using a fine-grained token
   with access to only that one repo). The private repo then checks out this
   content at that commit, builds, and deploys. *Note: even this trigger workflow
   reveals that a private deploy repo exists, so if we want to hide that too, we
   use mechanism 2 alone.*
2. **Pull / scheduled trigger** — the private deploy repo runs on a schedule
   (and on manual dispatch), checks out this public repo (no token needed — it is
   public), builds, and deploys. This leaks nothing into the public repo at all.

For maximum caution, prefer **mechanism 2** (scheduled pull from the private
repo) so this public repo contains no cross-repo trigger at all. Accept a short
deploy latency in exchange for zero operational signal here.

## Host options (decided and configured in the private repo)

Ranked for a small, homelab-capable team that wants to be cautious about exposing
hosting:

1. **Self-host behind a Cloudflare Tunnel (homelab).** The built static site is
   served from our own infrastructure (nginx/Caddy in a container) and exposed
   via a Cloudflare Tunnel — no open ports, no static IP, no exposed home IP, TLS
   terminated at the edge. Nothing about the hosting touches any public repo.
   Most under our control and the best fit if we want to keep it in-house.
2. **Cloudflare Pages via Direct Upload** (`wrangler pages deploy ./build` from
   the private repo). Unlimited bandwidth, free TLS, generous free tier. Use
   **Direct Upload, not the Git integration** — Git integration would connect
   Cloudflare to a repo and wants `wrangler.toml` in it. With Direct Upload the
   account id, API token, and project name stay in the private repo. (Direct
   Upload vs Git integration is a one-time, irreversible choice per Pages
   project — pick Direct Upload up front.)
3. **AWS S3 + CloudFront**, deployed from the private repo via OIDC (no long-
   lived keys), ACM cert in `us-east-1`. More moving parts; choose only if we
   want an AWS footprint.

GitHub Pages is intentionally *not* the first choice: branch publishing commits a
`CNAME` to the repo, and serving Pages from a private repo needs a paid plan.

## Security notes for this public repo

- **No secrets live here, ever.** That single rule neutralizes most of the risk.
- The only workflow allowed here is a **PR build-check** that runs on
  `pull_request`, has `permissions: contents: read`, uses no secrets, and only
  verifies the site compiles. See `.github/workflows/build-check.yml`.
- **Never use `pull_request_target`** in this repo. On public repos it runs with
  the base repo's token/secrets and is a well-known exfiltration vector. Since
  there are no secrets here, `pull_request` (fork-isolated, no secrets) is all we
  need.
- Pin third-party Actions to a full commit SHA.
- Set the repo's default `GITHUB_TOKEN` permission to read-only.

## Local build (for anyone)

```bash
npm install
npm run build      # -> ./build  (static site; deploy is a separate, private step)
npm run serve      # preview the built output locally
```
