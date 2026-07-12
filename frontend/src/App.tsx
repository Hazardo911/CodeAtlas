import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import './App.css'
import './wide.css'
import './components/FeatureCards.css'
import ShinyText from './components/ShinyText'
import Lightfall from './components/Lightfall'
import UploadFlow from './components/UploadFlow'
import WhatIfSimulator from './components/WhatIfSimulator'
const ProjectGalaxy=lazy(()=>import('./components/ProjectGalaxy'))

const lightfallColors=['#B7FF2A','#FFB84D','#FF6B6B','#2DD4BF']
const architectureSignals=[
 {from:'frontend',to:'api',kind:'dependency',tone:'green',position:'signal-a'},
 {from:'api',to:'database',kind:'data flow',tone:'amber',position:'signal-b'},
 {from:'auth',to:'gateway',kind:'security',tone:'coral',position:'signal-c'},
 {from:'core',to:'utils',kind:'import',tone:'teal',position:'signal-d'},
 {from:'worker',to:'events',kind:'async',tone:'green',position:'signal-e'},
]

type IconName = 'ai' | 'arrow' | 'branch' | 'chat' | 'code' | 'folder' | 'github' | 'graph' | 'health' | 'lock' | 'play' | 'shield' | 'spark'

const paths: Record<IconName, ReactNode> = {
  ai: <><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9h6v6H9zM9 1v3m6-3v3M9 20v3m6-3v3M1 9h3m16 0h3M1 15h3m16 0h3"/></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
  branch: <><circle cx="6" cy="5" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 5h3a5 5 0 0 1 5 5v6M8 5v13h8"/></>,
  chat: <path d="M5 5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 3v-4a2 2 0 0 1-1-2V7a2 2 0 0 1 2-2Z"/>,
  code: <path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-11-2 14"/>,
  folder: <path d="M3 6h7l2 2h9v11H3z"/>,
  github: <path d="M12 2a10 10 0 0 0-3 19.5c.5.1.7-.2.7-.5v-2c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.7-1.4-2.3-.3-4.7-1.1-4.7-5A4 4 0 0 1 7 8.5c-.1-.3-.5-1.3.1-2.7 0 0 .9-.3 2.8 1.1a10 10 0 0 1 5.1 0c2-1.4 2.8-1.1 2.8-1.1.6 1.4.2 2.4.1 2.7a4 4 0 0 1 1.1 2.7c0 3.9-2.4 4.7-4.7 5 .4.3.7 1 .7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z"/>,
  graph: <><circle cx="5" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="19" cy="9" r="2"/><circle cx="15" cy="19" r="2"/><path d="m7 11 3.5-4.5m3.5-.8 3 2M18 11l-2 6m-2.5.5-7-4"/></>,
  health: <path d="M3 12h4l2-5 4 10 2-5h6M5 4h14v16H5z"/>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/></>,
  play: <path d="m9 7 8 5-8 5z"/>,
  shield: <path d="M12 3 4 6v6c0 5 3.4 8 8 10 4.6-2 8-5 8-10V6z"/>,
  spark: <path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7z"/>,
}

function Icon({name, size=18}:{name:IconName,size?:number}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg> }
function Brand(){ return <a className="brand" href="#top"><span>✳</span>CodeAtlas</a> }
function Heading({eyebrow,title,children}:{eyebrow:string,title:ReactNode,children?:ReactNode}){return <header className="heading reveal"><small>{eyebrow}</small><h2>{title}</h2>{children&&<p>{children}</p>}</header>}

const trust=[['ai','100% On-Device','All analysis happens locally.'],['lock','Private by Design','Your code never leaves your machine.'],['health','AI-Powered','Deep code understanding using local LLMs.'],['code','Open Source','Built for developers, by developers.']] as const
const steps=[['folder','Upload','Drag & drop your repo. 100% local processing.'],['branch','Analyze','We parse, map and understand your entire project.'],['graph','Visualize','Explore interactive graphs, dependencies and modules.'],['chat','Ask & Simulate','Ask questions, simulate changes and get insights.']] as const
const features=[['graph','Architecture Map','Auto-generate a detailed architecture diagram of your entire codebase.'],['spark','Project Galaxy','Visualize modules and their relationships in an interactive galaxy.'],['health','What-if Simulator','Simulate changes and see the impact before you touch the code.'],['ai','AI Onboarding','Get up to speed with any codebase in minutes, not hours.'],['shield','Project Health','Get a health score and insights on maintainability and risks.'],['chat','AI Chat','Ask anything about your codebase, powered by local LLMs.']] as const
const featureLinks:Record<string,string>={'Project Galaxy':'#galaxy','What-if Simulator':'#simulator'}

function Dashboard(){return <div className="dashboard reveal"><aside><Brand/><nav>{['Overview','Architecture','Galaxy','Simulator','Health','AI Chat','Settings'].map((x,i)=><span className={i===2?'active':''} key={x}><Icon name={i===2?'spark':i===4?'health':'graph'} size={14}/>{x}</span>)}</nav><div className="profile"><i>AY</i><b>Aayush<small>Pro Plan</small></b></div></aside><div className="map"><div className="map-lines"/><span className="map-core"><Icon name="code"/>core<small>52 files</small></span>{[['auth','top'],['api','right'],['web','far'],['database','bottom'],['utils','left'],['shared','upper']].map(([x,p])=><span className={`map-node ${p}`} key={x}>{x}<small>{Math.ceil(x.length*7)} files</small></span>)}</div><section className="details"><span>core</span><small>Module</small><hr/><dl><dt>Type</dt><dd>Module</dd><dt>Language</dt><dd>TypeScript</dd><dt>Dependencies</dt><dd>12</dd><dt>Dependents</dt><dd>5</dd><dt>LOC</dt><dd>3,245</dd></dl><p>Core business logic and domain services.</p><a>View Dependencies →</a></section></div>}

function App(){
 const [repoName,setRepoName]=useState('')
 const [uploadOpen,setUploadOpen]=useState(false)

 useEffect(()=>{
  const root=document.documentElement
  root.classList.add('motion-ready')
  const reveals=[...document.querySelectorAll<HTMLElement>('.reveal')]
  const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if(entry.isIntersecting){entry.target.classList.add('visible');revealObserver.unobserve(entry.target)}
  }),{threshold:.08,rootMargin:'0px 0px -50px'})
  reveals.forEach((element,index)=>{element.style.setProperty('--delay',`${Math.min(index%4,3)*70}ms`);revealObserver.observe(element)})

  const sections=[...document.querySelectorAll<HTMLElement>('section[id]')]
  const links=[...document.querySelectorAll<HTMLAnchorElement>('.navlinks a')]
  const sectionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if(entry.isIntersecting) links.forEach(link=>link.classList.toggle('active',link.hash===`#${entry.target.id}`))
  }),{rootMargin:'-35% 0px -55%'})
  sections.forEach(section=>sectionObserver.observe(section))

  const updateProgress=()=>{
   const max=document.documentElement.scrollHeight-window.innerHeight
   root.style.setProperty('--scroll-progress',`${max>0?(window.scrollY/max)*100:0}%`)
  }
  updateProgress()
  window.addEventListener('scroll',updateProgress,{passive:true})
  return()=>{revealObserver.disconnect();sectionObserver.disconnect();window.removeEventListener('scroll',updateProgress);root.classList.remove('motion-ready')}
 },[])

 const chooseRepository=()=>setUploadOpen(true)

 return <main id="top">
  <div className="scroll-progress"/>
  <nav className="topnav"><Brand/><div className="navlinks"><a href="#features">Features</a><a href="#how">How it Works</a><a href="#showcase">Showcase</a><a href="#security">Security</a><a href="#docs">Docs</a></div><a className="github" href="https://github.com/Hazardo911/CodeAtlas" target="_blank" rel="noreferrer"><Icon name="github" size={15}/>Star on GitHub</a></nav>
  <UploadFlow open={uploadOpen} onClose={()=>setUploadOpen(false)} onComplete={setRepoName}/>
  <section className="hero hero-centered"><Lightfall className="hero-lightfall" colors={lightfallColors} backgroundColor="#050505" speed={.58} streakCount={3} streakWidth={.72} streakLength={1.25} glow={.42} density={.68} twinkle={.18} zoom={2} backgroundGlow={.12} opacity={.68} mouseInteraction mouseStrength={.1} mouseRadius={.7}/><div className="architecture-signals" aria-hidden="true">{architectureSignals.map(signal=><div className={`signal-chip ${signal.tone} ${signal.position}`} key={`${signal.from}-${signal.to}`}><i/><span><small>{signal.kind}</small><b>{signal.from}</b><em>→</em><b>{signal.to}</b></span></div>)}</div><div className="hero-copy reveal visible"><span className="pill">● &nbsp; 100% On-Device AI</span><h1 className="shiny-title"><ShinyText text="Understand Any Codebase."/><ShinyText text="Visually." delay={1.45}/><ShinyText className="shiny-accent" text="Privately." color="#b7ff2a" shineColor="#efffc9" delay={1.7}/></h1><p>CodeAtlas is your on-device AI software architect. Upload any repository and get an interactive digital twin of your codebase.</p><div className="actions"><button className="primary" type="button" onClick={chooseRepository}><Icon name="folder"/>{repoName||'Upload Repository'}</button><a href="#galaxy"><Icon name="play"/>Explore Demo</a></div><small className="safe"><Icon name="shield" size={13}/>{repoName?`${repoName} selected locally.`:'Your code never leaves your machine.'}</small></div></section>
  <section className="trust reveal">{trust.map(([i,t,d])=><article key={t}><span><Icon name={i}/></span><div><b>{t}</b><p>{d}</p></div></article>)}</section>
  <section className="section galaxy-story" id="galaxy"><Heading eyebrow="PROJECT GALAXY" title={<>See How Your Code<br/><em>Connects.</em></>}>Explore modules, services, and dependencies as a living map of your software.</Heading><Suspense fallback={<div className="galaxy-loading"><span>✳</span><b>Initializing 3D galaxy…</b></div>}><ProjectGalaxy/></Suspense></section>
  <section className="section simulator-section" id="simulator"><Heading eyebrow="WHAT-IF SIMULATOR" title={<>Know the impact<br/><em>Before the commit.</em></>}>Model architectural changes against the project map and reveal what could break before touching the code.</Heading><WhatIfSimulator/></section>
  <section className="section" id="how"><Heading eyebrow="HOW IT WORKS" title="From Code to Clarity in Seconds">We analyze your entire codebase locally and transform it into an interactive architecture you can explore.</Heading><div className="steps">{steps.map(([i,t,d],n)=><article className="reveal" key={t}><span><Icon name={i}/></span><b>{n+1}. {t}</b><p>{d}</p></article>)}</div></section>
  <section className="section" id="features"><Heading eyebrow="POWERFUL FEATURES" title={<>Everything You Need to<br/>Understand Software</>}/><div className="feature-grid">{features.map(([i,t,d],n)=>{const link=featureLinks[t];const content=<><span><Icon name={i}/></span><div><b>{t}</b><p>{d}</p><i>{link?'Explore →':'Coming soon'}</i></div></>;return link?<a href={link} className={`feature-card completed reveal c${n}`} key={t}>{content}</a>:<article className={`feature-card reveal c${n}`} key={t}>{content}</article>})}</div></section>
  <section className="section showcase" id="showcase"><Heading eyebrow="SEE IT IN ACTION" title={<>Your Codebase, <em>Visualized</em></>}/><Dashboard/></section>
  <section className="section security" id="security"><Heading eyebrow="PRIVACY FIRST" title={<>Your Code. Your Machine. <em>Always.</em></>}/><div className="privacy-row">{[['shield','Offline First','Works completely offline. No cloud required.'],['lock','No Data Collection','We don’t collect or track anything.'],['code','Transparent','Open source and community driven.'],['lock','You’re in Control','Run it offline, behind your firewall.']].map(([i,t,d])=><article className="reveal" key={t}><Icon name={i as IconName}/><div><b>{t}</b><p>{d}</p></div></article>)}</div></section>
  <section className="cta reveal" id="docs"><div><h2>Ready to Understand Your Codebase?</h2><p>Join developers who are building better software with CodeAtlas.</p><div className="actions"><button className="primary" type="button" onClick={chooseRepository}>Get Started Now <Icon name="arrow"/></button><a href="#showcase"><Icon name="play"/>Try Live Demo</a></div></div><div className="mountain">✦</div></section>
  <footer><Brand/><span>© 2026 CodeAtlas. All rights reserved.</span><nav><a href="https://github.com">GitHub</a><a href="#">Twitter</a><a href="#docs">Docs</a><a href="mailto:hello@codeatlas.dev">Contact</a></nav></footer>
 </main>
}
export default App
