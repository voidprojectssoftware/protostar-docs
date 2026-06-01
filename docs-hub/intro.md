---
sidebar_position: 1
slug: /intro
title: Overview
---

# Protostar

Live, continuous refinement of agent skills — the opposite of the "install a
versioned plugin" model. Skills are treated as evolving organisms, not packages:
you use them, they sync to a registry, an engine refines and merges them, and
improvements are offered back to you inside your harness, without the friction of
version-control deploys.

The loop: **use → sync → refine → suggest → adopt → use.**

## Documentation map

Protostar is built as a set of components, each developed in its own repository
with its docs living next to the code. This site lifts those docs into one place:

- **[CLI](/cli)** — the `protostar` command-line tool: a self-contained binary
  you can run without installing the .NET runtime.

More components will appear here as they land. Each one keeps its docs in its own
repo; this hub aggregates them at build time.

## How this site is organized

- The **Overview** section (these pages) covers project-wide concepts that do not
  belong to any single component.
- Each **component** has its own top-level section, sourced directly from that
  component's repository. Use the navbar to jump between them.
