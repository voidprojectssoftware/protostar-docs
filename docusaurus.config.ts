import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type {PluginOptions as DocsPluginOptions} from '@docusaurus/plugin-content-docs';
import {themes as prismThemes} from 'prism-react-renderer';

import manifest from './docs.manifest.json';

// ---------------------------------------------------------------------------
// The hub is manifest-driven. docs.manifest.json lists the product repos whose
// docs are lifted into this site. Each product becomes its own docs plugin
// instance (its own route, sidebar, and "edit this page" link pointing back to
// the source repo). Adding a product is a one-line manifest change — nothing
// here needs to be touched.
//
// Content for each product is fetched into external/<id>/docs by
// scripts/fetch-docs.mjs before the build runs (see package.json scripts).
// This file contains NO hosting or infrastructure detail by design — deploy
// lives in a separate private repo.
// ---------------------------------------------------------------------------

type Product = {
  id: string;
  label: string;
  repo: string; // owner/name on GitHub
  ref: string; // branch or tag the docs are lifted from
  docsPath: string; // path to the docs folder inside the product repo
  routeBasePath: string; // URL segment under which the product docs are served
  navbarPosition?: 'left' | 'right';
};

const products = manifest.products as Product[];

const ORG = 'voidprojectssoftware';
// Canonical public URL. The site is hosted on Azure Static Web Apps (deploy
// lives in the private protostar-docs-infra repo); this repo stays host-agnostic.
const SITE_URL = 'https://docs.voidprojects.ai';

// One docs plugin instance per product. The default docs instance (the hub's
// own platform-level docs) is configured in the preset below.
const productDocsPlugins = products.map((p) => {
  const options: Partial<DocsPluginOptions> = {
    id: p.id,
    path: `external/${p.id}/docs`,
    routeBasePath: p.routeBasePath,
    sidebarPath: require.resolve('./sidebars.product.ts'),
    // Send "edit this page" back to where the docs actually live: next to code.
    editUrl: `https://github.com/${p.repo}/edit/${p.ref}/${p.docsPath}/`,
  };
  return ['@docusaurus/plugin-content-docs', options];
});

// Navbar entry per product, linking to the first doc of its instance.
const productNavbarItems = products.map((p) => ({
  type: 'docSidebar' as const,
  sidebarId: 'product',
  docsPluginId: p.id,
  position: (p.navbarPosition ?? 'left') as 'left' | 'right',
  label: p.label,
}));

const config: Config = {
  title: 'Protostar',
  tagline: 'Live, continuous refinement of agent skills',
  favicon: 'img/logo.svg',

  url: SITE_URL,
  baseUrl: '/',

  organizationName: ORG,
  projectName: 'protostar-docs',

  // Catch broken cross-product links at build time rather than shipping them.
  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        // Default docs instance = the hub's own platform-level docs, authored
        // in this repo under docs-hub/. Product docs come from the plugins
        // generated above.
        docs: {
          path: 'docs-hub',
          routeBasePath: 'docs',
          sidebarPath: require.resolve('./sidebars.ts'),
          editUrl: `https://github.com/${ORG}/protostar-docs/edit/main/`,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [...productDocsPlugins],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    // Site-wide early-stage disclaimer. Protostar's docs are AI-drafted and not
    // yet human-reviewed; this banner makes that clear on every page. Remove it
    // once the docs have had a proper review pass.
    announcementBar: {
      id: 'ai-generated-docs',
      content:
        'These docs are AI-generated and have not been reviewed yet. Protostar is in early development, so content may be incomplete or inaccurate.',
      backgroundColor: '#fde68a',
      textColor: '#1f2937',
      isCloseable: false,
    },
    navbar: {
      title: 'Protostar',
      logo: {
        alt: 'Protostar',
        src: 'img/logo.svg',
      },
      items: [
        {
          to: '/docs/intro',
          label: 'Docs',
          position: 'left',
        },
        ...productNavbarItems,
        {
          href: `https://github.com/${ORG}`,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Overview', to: '/docs/intro'},
            ...products.map((p) => ({
              label: p.label,
              to: `/${p.routeBasePath}`,
            })),
          ],
        },
        {
          title: 'Project',
          items: [{label: 'GitHub', href: `https://github.com/${ORG}`}],
        },
      ],
      copyright: `Protostar — Void Projects.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['powershell', 'bash', 'csharp', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
