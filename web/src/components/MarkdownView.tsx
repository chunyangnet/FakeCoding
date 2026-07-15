import { isValidElement, memo, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Icon } from './Icon'

function textContent(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textContent).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return textContent(node.props.children)
  return ''
}

function Code({ className, children }: { className?: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false)
  const value = textContent(children).replace(/\n$/, '')
  const isBlock = Boolean(className?.includes('language-')) || value.includes('\n')
  if (!isBlock) return <code className={className}>{children}</code>
  const language = className?.match(/language-([^\s]+)/)?.[1] || 'text'
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return <div className="code-block">
    <div className="code-toolbar"><span>{language}</span><button onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={15}/>{copied ? '已复制' : '复制'}</button></div>
    <code className={className}>{children}</code>
  </div>
}

export const MarkdownView = memo(function MarkdownView({ children, enabled = true, gfm = true }: { children: string; enabled?: boolean; gfm?: boolean }) {
  if (!enabled) return <pre className="plain-output">{children}</pre>
  return <div className="markdown-body">
    <ReactMarkdown remarkPlugins={gfm ? [remarkGfm] : []} rehypePlugins={[rehypeHighlight]} components={{ code: Code }}>{children}</ReactMarkdown>
  </div>
})
