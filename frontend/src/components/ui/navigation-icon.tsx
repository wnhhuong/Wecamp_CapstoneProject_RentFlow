import type { SVGProps } from 'react'

const paths: Record<string, string> = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  rooms: 'M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16 M2 21h20 M8 7h1 M15 7h1 M8 11h1 M15 11h1 M9 21v-6h6v6',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-3.87',
  invoices: 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 7h6 M9 11h6 M9 15h3',
  requests: 'M8 5H5a2 2 0 0 0-2 2v13h16V7a2 2 0 0 0-2-2h-3 M8 3h6v4H8z M7 12h8 M7 16h5',
  tickets: 'M4 8a8 8 0 0 1 16 0v9a3 3 0 0 1-3 3h-3 M4 9H2v7h4V9z M20 9h2v7h-4V9z M10 19h4v3h-4z',
  parameters: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
  property: 'M3 10l9-7 9 7 M5 9v12h14V9 M9 21v-7h6v7',
  electricity: 'M13 2L4 14h7l-1 8 10-13h-7z',
  profile: 'M20 21v-2a7 7 0 0 0-14 0v2 M13 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
}

function NavigationIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] ?? paths.property} /></svg>
}

export { NavigationIcon }
