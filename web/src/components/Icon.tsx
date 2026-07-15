import type { SVGProps } from 'react'

type IconName =
  | 'app' | 'arrow-left' | 'arrow-right' | 'minus' | 'square' | 'close' | 'sidebar'
  | 'compose' | 'clock' | 'plugin' | 'branch' | 'search' | 'folder' | 'chevron-down'
  | 'chevron-right' | 'settings' | 'pin' | 'more' | 'archive' | 'trash' | 'edit'
  | 'panel' | 'plus' | 'shield' | 'send' | 'stop' | 'paperclip' | 'copy' | 'check'
  | 'spark' | 'book' | 'repeat' | 'timer' | 'terminal' | 'diff' | 'test' | 'info'
  | 'refresh' | 'download' | 'arrow-down' | 'code' | 'file' | 'git' | 'sun' | 'moon'

const paths: Record<IconName, React.ReactNode> = {
  app: <><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 4v16"/></>,
  'arrow-left': <path d="m15 18-6-6 6-6"/>,
  'arrow-right': <path d="m9 18 6-6-6-6"/>,
  minus: <path d="M5 12h14"/>,
  square: <rect x="5" y="5" width="14" height="14" rx="2"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  sidebar: <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></>,
  compose: <><path d="M12 20h7a1 1 0 0 0 1-1v-7"/><path d="m16 4 4 4L10 18l-5 1 1-5Z"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l-3 2"/></>,
  plugin: <><circle cx="12" cy="12" r="9"/><path d="M8.5 10.5a2 2 0 1 1 2-2M13.5 15.5a2 2 0 1 1 2-2M10 15l4-6"/></>,
  branch: <><circle cx="6" cy="5" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="19" r="2"/><path d="M6 7v10M8 10c5 0 3-4 8-4"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  folder: <path d="M3 7.5a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>,
  'chevron-down': <path d="m7 10 5 5 5-5"/>,
  'chevron-right': <path d="m10 7 5 5-5 5"/>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  pin: <path d="m9 4 6 6m-8.5 1.5 6 6M14 3l7 7-3 1-4 4-1 4-7-7 4-1 4-4Z"/>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>,
  archive: <><rect x="3" y="5" width="18" height="4" rx="1"/><path d="M5 9v10h14V9M10 13h4"/></>,
  trash: <><path d="M4 7h16M9 3h6l1 4H8zM7 7l1 14h8l1-14"/><path d="M10 11v6M14 11v6"/></>,
  edit: <><path d="m14 5 5 5L9 20l-6 1 1-6Z"/><path d="m12 7 5 5"/></>,
  panel: <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M16 4v16M7 9h5M7 13h5"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  shield: <><path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6Z"/><path d="m9 12 2 2 4-4"/></>,
  send: <><path d="M12 19V5M6 11l6-6 6 6"/></>,
  stop: <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none"/>,
  paperclip: <path d="m20 12-8.5 8.5a6 6 0 0 1-8.5-8.5L13.5 1.5a4 4 0 0 1 5.7 5.7L8.7 17.7a2 2 0 0 1-2.9-2.9L15 5.6"/>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  spark: <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7ZM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7Z"/>,
  book: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22Z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22Z"/></>,
  repeat: <><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></>,
  timer: <><circle cx="12" cy="13" r="8"/><path d="M12 9v4l-2 2M9 2h6"/></>,
  terminal: <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 3 3-3 3M13 15h4"/></>,
  diff: <><circle cx="7" cy="5" r="2"/><circle cx="7" cy="19" r="2"/><path d="M7 7v10M14 6h6M17 3v6M14 17h6"/></>,
  test: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 15h8"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  refresh: <><path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 0-2 5"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>,
  'arrow-down': <path d="M12 5v14M6 13l6 6 6-6"/>,
  code: <path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/>,
  file: <><path d="M6 2h8l4 4v16H6Z"/><path d="M14 2v5h5"/></>,
  git: <><circle cx="6" cy="5" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="19" r="2"/><path d="M6 7v10M8 11h4a6 6 0 0 0 6-5"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  moon: <path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z"/>,
}

export function Icon({ name, size = 18, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>{paths[name]}</svg>
}

export function OpenAILogo({ size = 42 }: { size?: number }) {
  return <svg className="openai-logo" aria-hidden="true" viewBox="0 0 48 48" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23.9 7.3a9 9 0 0 1 15.2 6.5v5.5a9 9 0 0 1-4.5 15.6l-4.8 2.8a9 9 0 0 1-13.6-7.8v-5.5A9 9 0 0 1 20.7 8.7l4.7-2.8"/>
    <path d="m23.9 7.3 4.8 2.8a9 9 0 0 1 0 15.6L24 28.4M39.1 13.8l-4.7 2.8A9 9 0 0 1 20.8 8.8M16.2 29.9l4.7-2.8a9 9 0 0 1 13.6 7.8M8.8 19.3l4.8 2.8a9 9 0 0 1 0 15.6m0-15.6 4.7 2.8A9 9 0 0 0 31.9 17"/>
  </svg>
}

export function CodexGlyph({ size = 44 }: { size?: number }) {
  return <svg className="codex-glyph" aria-hidden="true" viewBox="0 0 48 48" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 13.5c-5.4 1.8-8 6.1-6.5 11.5.6 2.1 1.9 3.7 3.7 4.8-.5 4.2 2.1 7.6 6.1 8.6 3.1.8 6-.2 7.9-2.5 3.8 1.2 7.6-.4 9.3-3.9 1-2.1 1-4.3.1-6.2 2.1-3.3 1.4-7.3-1.7-9.8-1.6-1.3-3.5-1.9-5.4-1.7-2.5-3.2-7-4.1-10.5-1.9-1.3.8-2.3 2-3 3.4"/>
    <path d="M15.5 24h.01M32.5 24h.01M19 30.5c3.1 1.8 6.9 1.8 10 0" strokeWidth="3.2"/>
    <path d="M12 18.5 8.5 17M36 18.5l3.5-1.5"/>
  </svg>
}
