const favicon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`

export const customLogo = (website?: string) =>
  website ? favicon(website.replace(/^https?:\/\//, '').split('/')[0]) : ''
