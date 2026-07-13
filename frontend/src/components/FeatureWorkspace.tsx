import { lazy, Suspense, useMemo, useState } from 'react'
import './FeatureWorkspace.css'
import WhatIfSimulator from './WhatIfSimulator'

const ProjectGalaxy=lazy(()=>import('./ProjectGalaxy'))

export type WorkspaceView = 'architecture' | 'galaxy' | 'simulator' | 'onboarding' | 'health' | 'chat'

const views: Array<{id: WorkspaceView; label: string; eyebrow: string}> = [
  {id: 'architecture', label: 'Architecture', eyebrow: 'SYSTEM MAP'},
  {id: 'galaxy', label: 'Galaxy', eyebrow: '3D EXPLORER'},
  {id: 'simulator', label: 'What-If', eyebrow: 'IMPACT LAB'},
  {id: 'onboarding', label: 'Onboarding', eyebrow: 'GUIDED TOUR'},
  {id: 'health', label: 'Health', eyebrow: 'PROJECT SIGNALS'},
  {id: 'chat', label: 'AI Chat', eyebrow: 'LOCAL ASSISTANT'},
]

const chatAnswers: Record<string, string> = {
  'Where does authentication start?': 'Authentication enters through web/middleware/auth.ts, validates the session in auth/session.ts, then attaches the user context before protected routes execute.',
  'What is the safest module to change?': 'The shared formatting utilities have only two dependents and full test coverage. They are the lowest-risk place for an isolated first contribution.',
  'Explain the checkout flow': 'The web client creates a checkout request, the API validates inventory, core calculates totals, and the worker confirms payment before the order is persisted.',
}

export default function FeatureWorkspace({initialView='architecture'}:{initialView?:WorkspaceView}){
  const [view,setView]=useState<WorkspaceView>(initialView)
  const [completed,setCompleted]=useState([true,false,false,false])
  const [question,setQuestion]=useState('Where does authentication start?')
  const answer=useMemo(()=>chatAnswers[question],[question])

  return <div className="feature-workspace reveal">
    <aside className="workspace-nav">
      <div className="workspace-project"><span>CA</span><div><small>ACTIVE PROJECT</small><b>commerce-platform</b></div></div>
      <nav>{views.map(item=><button key={item.id} className={view===item.id?'active':''} onClick={()=>setView(item.id)}><i>{item.label.slice(0,2)}</i><span><small>{item.eyebrow}</small><b>{item.label}</b></span><em>→</em></button>)}</nav>
      <div className="workspace-local"><i/><span><b>Local engine ready</b><small>Demo data · no network calls</small></span></div>
    </aside>

    <section className="workspace-canvas">
      {view==='galaxy'&&<div className="workspace-full-view"><header><div><small>PROJECT GALAXY</small><h3>Explore the living architecture</h3><p>Orbit modules, isolate layers, and focus dependency paths.</p></div><span>Interactive 3D</span></header><Suspense fallback={<div className="workspace-loading">Initializing 3D architecture…</div>}><ProjectGalaxy/></Suspense></div>}

      {view==='simulator'&&<div className="workspace-full-view simulator-workspace"><header><div><small>WHAT-IF SIMULATOR</small><h3>Model impact before the commit</h3><p>Explore how architectural changes propagate through the project.</p></div><span>Local preview</span></header><WhatIfSimulator/></div>}

      {view==='architecture'&&<div className="architecture-view">
        <header><div><small>ARCHITECTURE MAP</small><h3>Request-to-data flow</h3><p>Follow responsibilities across every layer without opening a file.</p></div><span>12 services · 28 links</span></header>
        <div className="architecture-flow">
          <div className="flow-layer"><small>INTERFACE</small><button className="teal active"><i>WEB</i><b>Web client</b><em>38 files</em></button><button className="teal"><i>CLI</i><b>Developer CLI</b><em>11 files</em></button></div>
          <div className="flow-arrows"><i>→</i><i>→</i></div>
          <div className="flow-layer"><small>SERVICES</small><button className="amber"><i>API</i><b>API gateway</b><em>31 files</em></button><button className="amber"><i>AU</i><b>Authentication</b><em>19 files</em></button></div>
          <div className="flow-arrows"><i>→</i><i>→</i></div>
          <div className="flow-layer"><small>DOMAIN</small><button><i>CO</i><b>Core logic</b><em>52 files</em></button><button><i>SH</i><b>Shared types</b><em>27 files</em></button></div>
          <div className="flow-arrows"><i>→</i><i>→</i></div>
          <div className="flow-layer"><small>DATA</small><button className="coral"><i>DB</i><b>Database</b><em>16 files</em></button><button className="coral"><i>CA</i><b>Cache</b><em>8 files</em></button></div>
        </div>
        <div className="architecture-insight"><span>✦</span><div><small>ARCHITECTURE INSIGHT</small><p><b>Authentication is a high-impact boundary.</b> Seven protected routes and three services depend on its session contract.</p></div><button onClick={()=>setView('chat')}>Ask about this →</button></div>
      </div>}

      {view==='onboarding'&&<div className="onboarding-view">
        <header><div><small>AI ONBOARDING</small><h3>Your first 30 minutes</h3><p>A guided path through the concepts and files that matter most.</p></div><span>{completed.filter(Boolean).length}/4 complete</span></header>
        <div className="onboarding-grid"><div className="learning-path">{[
          ['Project shape','Understand apps, packages, and entry points','README.md · package.json','6 min'],
          ['Request lifecycle','Trace one request from web to database','api/router.ts · core/order.ts','9 min'],
          ['Identity model','Learn sessions, roles, and route guards','auth/session.ts · middleware.ts','8 min'],
          ['Make a safe change','Update an isolated utility with tests','shared/format.ts · format.test.ts','7 min'],
        ].map(([title,copy,files,time],index)=><button className={completed[index]?'done':''} onClick={()=>setCompleted(items=>items.map((item,i)=>i===index?!item:item))} key={title}><i>{completed[index]?'✓':index+1}</i><span><b>{title}</b><p>{copy}</p><em>{files}</em></span><small>{time}</small></button>)}</div><aside className="onboarding-summary"><small>CODEBASE BRIEF</small><h4>Commerce Platform</h4><p>A modular TypeScript platform with a React storefront, API gateway, background workers, and shared domain core.</p><dl><dt>Start here</dt><dd>apps/web/src/main.tsx</dd><dt>Core concept</dt><dd>Order lifecycle</dd><dt>Risk area</dt><dd>Auth session contract</dd><dt>Good first issue</dt><dd>Shared date formatter</dd></dl></aside></div>
      </div>}

      {view==='health'&&<div className="health-view">
        <header><div><small>PROJECT HEALTH</small><h3>Strong foundation, two hotspots</h3><p>Prioritized signals instead of another wall of metrics.</p></div><span className="health-score">82<small>/100</small></span></header>
        <div className="health-metrics">{[['Maintainability','88','Healthy'],['Test coverage','76%','Watch'],['Dependency risk','Low','Healthy'],['Complexity','7.4','Watch']].map(([label,value,state])=><article key={label}><small>{label}</small><b>{value}</b><span className={state==='Watch'?'watch':''}><i/>{state}</span></article>)}</div>
        <div className="health-content"><div className="risk-list"><small>PRIORITIZED FINDINGS</small><article><i className="critical">01</i><div><b>Checkout service is doing too much</b><p>Four responsibilities and 19 incoming dependencies make changes expensive.</p><span>core/checkout.ts · complexity 18</span></div><em>High</em></article><article><i className="warning">02</i><div><b>Authentication tests miss expiry paths</b><p>Session refresh and revoked-token branches have no direct coverage.</p><span>auth/session.test.ts · 4 paths</span></div><em>Medium</em></article><article><i>03</i><div><b>Two packages can be upgraded safely</b><p>Patch updates have no API changes across current usage.</p><span>package.json · low blast radius</span></div><em>Low</em></article></div><aside className="health-trend"><small>HEALTH TREND</small><div className="trend-bars">{[48,55,52,64,61,72,76,82].map((height,index)=><i key={index} style={{height:`${height}%`}}/> )}</div><span><b>+12</b> points this month</span><p>Coverage and circular-dependency cleanup drove the improvement.</p></aside></div>
      </div>}

      {view==='chat'&&<div className="chat-view">
        <header><div><small>AI CHAT</small><h3>Ask the codebase, not the internet</h3><p>Answers are grounded in project files and architecture context.</p></div><span><i/> Local preview</span></header>
        <div className="chat-layout"><aside><small>SUGGESTED QUESTIONS</small>{Object.keys(chatAnswers).map(item=><button className={question===item?'active':''} onClick={()=>setQuestion(item)} key={item}>{item}<span>→</span></button>)}</aside><div className="conversation"><div className="chat-question"><span>YOU</span><p>{question}</p></div><div className="chat-answer"><span>CA</span><div><small>CODEATLAS · GROUNDED ANSWER</small><p>{answer}</p><div className="chat-sources"><b>Sources</b><span>auth/session.ts</span><span>middleware/auth.ts</span><span>routes/protected.ts</span></div></div></div><div className="chat-input"><span>Ask another question about this repository…</span><button>↑</button></div></div></div>
      </div>}
    </section>
  </div>
}
