import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/blog/', '/compare/'],
        disallow: ['/app/login', '/app/billing', '/app/c/', '/api/'],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/blog/', '/compare/'],
        disallow: ['/app/login', '/app/billing', '/app/c/', '/api/'],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: ['/blog/', '/compare/'],
        disallow: ['/app/login', '/app/billing', '/app/c/', '/api/'],
      },
      {
        userAgent: 'Claude-Web',
        allow: ['/blog/', '/compare/'],
        disallow: ['/app/login', '/app/billing', '/app/c/', '/api/'],
      },
    ],
    sitemap: 'https://aidly.me/sitemap.xml',
  }
}
