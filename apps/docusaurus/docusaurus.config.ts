import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'service-creator',
  tagline: 'Type-safe HTTP services with zero boilerplate',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://royriojas.github.io',
  baseUrl: '/create-service/',

  organizationName: 'royriojas',
  projectName: 'create-service',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/royriojas/create-service/tree/main/apps/docusaurus/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'service-creator',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://www.npmjs.com/package/service-creator',
          label: 'npm',
          position: 'right',
        },
        {
          href: 'https://github.com/royriojas/create-service',
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
            {
              label: 'Getting Started',
              to: '/',
            },
            {
              label: 'createEndpoint',
              to: '/create-endpoint',
            },
            {
              label: 'API Reference',
              to: '/api-reference',
            },
          ],
        },
        {
          title: 'Links',
          items: [
            {
              label: 'npm',
              href: 'https://www.npmjs.com/package/service-creator',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/royriojas/create-service',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Roy Riojas. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
