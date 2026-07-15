import { CodexGlyph, Icon, OpenAILogo } from './Icon'
import type { AppMode } from '../types'

const suggestions = {
  codex: [
    { icon: 'code' as const, title: '探索并理解代码', text: '分析这个项目的入口和关键模块' },
    { icon: 'spark' as const, title: '构建新功能、应用或工具', text: '为当前项目规划并实现一个新功能' },
    { icon: 'repeat' as const, title: '审查代码并提出修改建议', text: '检查最近的变更并给出改进建议' },
    { icon: 'test' as const, title: '修复问题和失败', text: '运行测试，定位失败并修复根因' },
  ],
  chatgpt: [
    { icon: 'spark' as const, title: '创建文件或搭建网站', text: '帮我创建一个精致的项目页面' },
    { icon: 'book' as const, title: '调研并规划后续步骤', text: '调研这个项目并规划下一步' },
    { icon: 'repeat' as const, title: '获取近期工作简报', text: '总结近期任务和重要进展' },
    { icon: 'timer' as const, title: '自动处理日常和重复性工作', text: '把常见维护工作整理成执行清单' },
  ],
}

export function EmptyState({ mode, projectName, onSuggestion }: { mode: AppMode; projectName: string; onSuggestion: (text: string) => void }) {
  return <div className="empty-state" data-testid="empty-state">
    <div className="empty-logo">{mode === 'codex' ? <CodexGlyph size={48}/> : <OpenAILogo size={48}/>}</div>
    <h1>我们应该在<span>{projectName}</span>中{mode === 'codex' ? '做些什么' : '处理什么'}？</h1>
    <div className="suggestion-grid">
      {suggestions[mode].map((item) => <button key={item.title} className="suggestion-card" onClick={() => onSuggestion(item.text)}>
        <Icon name={item.icon} size={19}/><strong>{item.title}</strong>
      </button>)}
    </div>
  </div>
}
