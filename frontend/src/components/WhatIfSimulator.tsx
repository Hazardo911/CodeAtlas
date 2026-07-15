import { useEffect, useMemo, useRef, useState } from 'react'
import './WhatIfSimulator.css'

type Action = 'remove' | 'replace' | 'modify'
type Phase = 'idle' | 'running' | 'ready'

const scenarios = {
  auth: {
    remove: {
      risk: 94,
      files: 24,
      routes: 7,
      affected: ['web', 'api', 'database'],
      outcome:
        'Authentication disappears completely. Login, session refresh, role checks, and every protected request lose their trust boundary.',
      failure:
        'Users enter login loops or receive 401 responses while services may accidentally expose routes that relied on upstream authorization.',
      recommendation:
        'Do not delete auth directly. Put an identity bridge in front of the current provider, migrate consumers, then retire the old module.',
      steps: [
        'Inventory every token and session consumer',
        'Shadow traffic through the replacement provider',
        'Cut over by route with an instant rollback flag',
      ],
      checks: ['Login + logout', 'Token refresh', 'Roles and permissions'],
    },
    replace: {
      risk: 68,
      files: 17,
      routes: 7,
      affected: ['web', 'api', 'core'],
      outcome:
        'The trust boundary remains, but token shape, claim names, expiry rules, and session storage can change underneath every consumer.',
      failure:
        'A valid user is accepted by one service and rejected by another because issuer, audience, or role claims no longer match.',
      recommendation:
        'Introduce a provider-neutral auth adapter and accept old and new tokens during a controlled overlap window.',
      steps: [
        'Normalize claims behind one adapter',
        'Enable dual-token verification',
        'Migrate clients before removing legacy verification',
      ],
      checks: ['Issuer and audience', 'Session expiry', 'Cross-service roles'],
    },
    modify: {
      risk: 82,
      files: 20,
      routes: 7,
      affected: ['web', 'api', 'workers'],
      outcome:
        'Changing the auth contract breaks callers that depend on the existing login response, token payload, middleware, or error format.',
      failure:
        'The system appears healthy, but older clients silently lose sessions or misread permissions after the contract ships.',
      recommendation:
        'Version the auth contract, publish a compatibility schema, and keep the previous response shape until all callers migrate.',
      steps: [
        'Diff request, response, and claim schemas',
        'Ship a versioned compatibility endpoint',
        'Track old-contract usage before removal',
      ],
      checks: ['Schema compatibility', 'Old client login', 'Auth error handling'],
    },
  },
  api: {
    remove: {
      risk: 97,
      files: 31,
      routes: 12,
      affected: ['web', 'workers', 'cache'],
      outcome:
        'Removing the API cuts the primary communication layer between the interface, background jobs, and application services.',
      failure:
        'The frontend loads its shell but data requests fail; queued jobs retry continuously and can amplify load on remaining services.',
      recommendation:
        'Keep a thin compatibility gateway alive until every client and worker has a confirmed replacement route.',
      steps: [
        'Map routes to every known consumer',
        'Proxy legacy traffic to replacement handlers',
        'Retire endpoints only after traffic reaches zero',
      ],
      checks: ['Frontend requests', 'Worker retries', 'Error and timeout rates'],
    },
    replace: {
      risk: 72,
      files: 25,
      routes: 12,
      affected: ['web', 'workers', 'auth'],
      outcome:
        'A replacement API can preserve capability while changing base URLs, authentication, pagination, timeouts, and error semantics.',
      failure:
        'Happy paths work in testing, while retries, rate limits, and edge-case response codes fail after production traffic arrives.',
      recommendation:
        'Use an anti-corruption adapter and replay captured local requests against both implementations before cutover.',
      steps: [
        'Define behavioral parity, not only schema parity',
        'Replay representative requests against both APIs',
        'Canary consumers and compare response metrics',
      ],
      checks: ['Status codes', 'Pagination', 'Retries and timeouts'],
    },
    modify: {
      risk: 89,
      files: 28,
      routes: 12,
      affected: ['web', 'workers', 'cache'],
      outcome:
        'A breaking route or payload change propagates immediately to UI queries, worker clients, cached responses, and generated types.',
      failure:
        'Mixed client versions deserialize different shapes, producing partial screens, poisoned caches, or permanently failed jobs.',
      recommendation:
        'Create a versioned contract, generate clients from one schema, and make cache keys version-aware.',
      steps: [
        'Generate and review an explicit contract diff',
        'Release additive fields before removing old ones',
        'Migrate clients and invalidate incompatible cache entries',
      ],
      checks: ['OpenAPI diff', 'Client deserialization', 'Cache key isolation'],
    },
  },
  database: {
    remove: {
      risk: 99,
      files: 18,
      routes: 9,
      affected: ['core', 'auth', 'workers'],
      outcome:
        'Removing persistence makes every stateful flow unavailable and risks irreversible loss of user, session, and job data.',
      failure:
        'Writes fail immediately, read paths return empty state, and retrying workers can flood logs or queues with unrecoverable operations.',
      recommendation:
        'Treat deletion as a data-retention operation: freeze writes, create verified backups, and provide a replacement store first.',
      steps: [
        'Classify and back up retained data',
        'Quiesce writers and drain jobs',
        'Verify restore before decommissioning storage',
      ],
      checks: ['Backup restore', 'Write shutdown', 'Data retention rules'],
    },
    replace: {
      risk: 84,
      files: 18,
      routes: 9,
      affected: ['core', 'auth', 'workers'],
      outcome:
        'Moving databases changes query behavior, transaction guarantees, indexes, data types, and operational failure modes.',
      failure:
        'Copied data looks correct, but concurrency, ordering, or type conversion differences corrupt writes under real load.',
      recommendation:
        'Hide storage behind an adapter, backfill in checkpoints, dual-write temporarily, and compare reads before promotion.',
      steps: [
        'Validate schema and semantic type mappings',
        'Backfill with resumable checkpoints',
        'Dual-write and compare before switching reads',
      ],
      checks: ['Row counts + checksums', 'Transaction behavior', 'Rollback restore'],
    },
    modify: {
      risk: 76,
      files: 15,
      routes: 8,
      affected: ['core', 'api', 'workers'],
      outcome:
        'A schema contract change affects queries, serializers, background jobs, and any API response derived from the changed fields.',
      failure:
        'Old and new application instances overlap during deployment and disagree about required columns or data representation.',
      recommendation:
        'Use expand-and-contract migrations so both application versions remain compatible throughout deployment.',
      steps: [
        'Add compatible fields without removing old ones',
        'Backfill data and deploy dual-read logic',
        'Remove legacy fields in a later release',
      ],
      checks: ['Mixed-version deploy', 'Migration rollback', 'Null and default handling'],
    },
  },
  cache: {
    remove: {
      risk: 48,
      files: 9,
      routes: 3,
      affected: ['api', 'database'],
      outcome:
        'Requests can remain correct, but every cache hit becomes origin work and pushes latency and database load upward.',
      failure:
        'A sudden cache removal creates a thundering herd that exhausts database connections during ordinary traffic spikes.',
      recommendation:
        'Measure origin capacity first, then drain cache traffic gradually with request coalescing and rate limits.',
      steps: [
        'Benchmark uncached origin capacity',
        'Reduce cache use gradually',
        'Enable request coalescing and load protection',
      ],
      checks: ['P95 latency', 'Database connections', 'Origin error rate'],
    },
    replace: {
      risk: 39,
      files: 7,
      routes: 3,
      affected: ['api', 'auth'],
      outcome:
        'The cache remains available, but serialization, TTL precision, eviction, and distributed locking behavior may differ.',
      failure:
        'Stale or differently encoded entries produce intermittent errors that disappear whenever the cache is cleared.',
      recommendation:
        'Namespace replacement keys, warm them separately, and compare hit rate and payload compatibility before cutover.',
      steps: [
        'Create a new versioned key namespace',
        'Dual-read and warm the replacement',
        'Switch traffic after hit-rate parity',
      ],
      checks: ['Serialization', 'TTL behavior', 'Hit and eviction rates'],
    },
    modify: {
      risk: 56,
      files: 8,
      routes: 3,
      affected: ['api', 'auth', 'database'],
      outcome:
        'Changing cache keys or payload contracts can mix incompatible entries across application versions.',
      failure:
        'A caller reads a valid key containing the wrong schema and fails only until that entry expires.',
      recommendation:
        'Version both key names and serialized payloads, then expire the old namespace after all readers migrate.',
      steps: [
        'Document the key and payload contract',
        'Write new and legacy formats during transition',
        'Monitor old-key reads before expiration',
      ],
      checks: ['Key collisions', 'Payload versions', 'Cold-start behavior'],
    },
  },
  workers: {
    remove: {
      risk: 64,
      files: 14,
      routes: 2,
      affected: ['api', 'database'],
      outcome:
        'Scheduled work, event consumers, notifications, and long-running jobs stop while synchronous application paths keep responding.',
      failure:
        'The product looks healthy initially, but queues grow silently and delayed side effects never complete.',
      recommendation:
        'Pause producers, drain pending jobs, and move essential side effects to a replacement execution path before removal.',
      steps: [
        'Inventory queues, schedules, and producers',
        'Pause new jobs and drain in-flight work',
        'Verify every side effect has a new owner',
      ],
      checks: ['Queue depth', 'Dead-letter jobs', 'Scheduled task parity'],
    },
    replace: {
      risk: 52,
      files: 11,
      routes: 2,
      affected: ['api', 'database'],
      outcome:
        'A new worker runtime changes acknowledgement, retry, ordering, concurrency, and shutdown behavior.',
      failure:
        'Jobs run twice or disappear when the old and new runtimes disagree about acknowledgement and retry timing.',
      recommendation:
        'Make handlers idempotent and canary one queue with explicit deduplication before migrating all workers.',
      steps: [
        'Define delivery and acknowledgement semantics',
        'Add idempotency keys to handlers',
        'Canary one queue and compare completion metrics',
      ],
      checks: ['Duplicate execution', 'Retry policy', 'Graceful shutdown'],
    },
    modify: {
      risk: 71,
      files: 13,
      routes: 2,
      affected: ['api', 'database', 'core'],
      outcome:
        'Changing the job or event contract breaks queued messages created by older producers and stored before deployment.',
      failure:
        'New workers reject historical messages, creating a poison-message loop that blocks later work in the same queue.',
      recommendation:
        'Version event envelopes and keep backward-compatible consumers until the oldest queued message has expired.',
      steps: [
        'Version the event envelope and payload',
        'Teach consumers to read both schemas',
        'Remove legacy parsing after queue retention passes',
      ],
      checks: ['Old message replay', 'Poison-message isolation', 'Producer-consumer skew'],
    },
  },
}

type ModuleName = keyof typeof scenarios

const actions: Record<
  Action,
  { title: string; description: string; icon: string; query: (module: string) => string }
> = {
  remove: {
    title: 'Remove module',
    description: 'Trace deletion and unavailable capabilities.',
    icon: '−',
    query: (module) => `remove the ${module} module`,
  },
  replace: {
    title: 'Replace implementation',
    description: 'Model migration and behavior drift.',
    icon: '⇄',
    query: (module) => `replace ${module} with an alternative`,
  },
  modify: {
    title: 'Change contract',
    description: 'Find incompatible callers and stored data.',
    icon: '≈',
    query: (module) => `change the ${module} contract`,
  },
}

const presets: { label: string; module: ModuleName; action: Action }[] = [
  { label: 'Auth outage', module: 'auth', action: 'remove' },
  { label: 'API v2', module: 'api', action: 'modify' },
  { label: 'DB migration', module: 'database', action: 'replace' },
]

const topology = [
  { id: 'web', label: 'Web app', x: 15, y: 24 },
  { id: 'api', label: 'API', x: 46, y: 15 },
  { id: 'auth', label: 'Auth', x: 78, y: 26 },
  { id: 'core', label: 'Core', x: 49, y: 48 },
  { id: 'cache', label: 'Cache', x: 18, y: 72 },
  { id: 'database', label: 'Database', x: 50, y: 82 },
  { id: 'workers', label: 'Workers', x: 81, y: 70 },
] as const

const topologyLinks = [
  ['web', 'api'],
  ['web', 'auth'],
  ['api', 'auth'],
  ['api', 'core'],
  ['api', 'cache'],
  ['core', 'database'],
  ['auth', 'database'],
  ['workers', 'api'],
  ['workers', 'database'],
] as const

export default function WhatIfSimulator() {
  const [module, setModule] = useState<ModuleName>('auth')
  const [action, setAction] = useState<Action>('remove')
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const timer = useRef<number>(0)

  const result = useMemo(() => {
    return scenarios[module][action]
  }, [action, module])

  const affected = useMemo(() => new Set([module, ...result.affected]), [module, result.affected])
  const activePreset = presets.find(
    (preset) => preset.module === module && preset.action === action,
  )

  useEffect(() => () => clearInterval(timer.current), [])

  const resetPreview = (nextModule = module, nextAction = action) => {
    clearInterval(timer.current)
    setModule(nextModule)
    setAction(nextAction)
    setProgress(0)
    setPhase('idle')
  }

  const run = () => {
    clearInterval(timer.current)
    setPhase('running')
    setProgress(4)
    timer.current = window.setInterval(() => {
      setProgress((value) => {
        const next = Math.min(100, value + (value < 70 ? 6 : 3))
        if (next === 100) {
          clearInterval(timer.current)
          window.setTimeout(() => setPhase('ready'), 250)
        }
        return next
      })
    }, 70)
  }

  const riskLabel = result.risk > 80 ? 'Critical' : result.risk > 55 ? 'High' : 'Medium'

  return (
    <div className="whatif-console">
      <section className="whatif-builder">
        <header>
          <span aria-hidden="true">✦</span>
          <div>
            <small>INTERACTIVE CONCEPT LAB</small>
            <h3>Compose a change</h3>
            <p>Explore a demo impact model before touching code.</p>
          </div>
        </header>

        <div className="scenario-presets">
          <small>QUICK SCENARIOS</small>
          <div>
            {presets.map((preset) => (
              <button
                type="button"
                className={activePreset === preset ? 'active' : ''}
                key={preset.label}
                onClick={() => resetPreview(preset.module, preset.action)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <label>
          Target module
          <select
            value={module}
            onChange={(event) => resetPreview(event.target.value as ModuleName, action)}
          >
            {Object.keys(scenarios).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>

        <div className="action-list">
          <small>CHANGE TYPE</small>
          {(Object.keys(actions) as Action[]).map((key) => (
            <button
              type="button"
              className={action === key ? 'active' : ''}
              onClick={() => resetPreview(module, key)}
              key={key}
            >
              <i>{actions[key].icon}</i>
              <span>
                <b>{actions[key].title}</b>
                <em>{actions[key].description}</em>
              </span>
              <strong>{action === key ? '✓' : ''}</strong>
            </button>
          ))}
        </div>

        <div className="sim-query">
          <small>SIMULATION QUERY</small>
          <p>
            What happens if I <b>{actions[action].query(module)}</b>?
          </p>
        </div>

        <button className="run-sim" onClick={run} disabled={phase === 'running'}>
          {phase === 'running'
            ? `Tracing impact ${progress}%`
            : phase === 'ready'
              ? 'Run again'
              : 'Run impact simulation'}
          <span>{phase === 'running' ? '•••' : '→'}</span>
        </button>
        <p className="browser-note">ⓘ Illustrative local demo · no backend impact engine yet</p>
      </section>

      <section className={`whatif-result phase-${phase}`}>
        <div className="impact-map">
          <header className="map-toolbar">
            <div>
              <small>LIVE ARCHITECTURE PREVIEW</small>
              <b>{module} dependency radius</b>
            </div>
            <span className={`risk-chip ${riskLabel.toLowerCase()}`}>
              {riskLabel} risk · {result.risk}
            </span>
          </header>

          <div className="topology-canvas">
            <div className="map-glow" />
            <svg
              className="topology-links"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {topologyLinks.map(([from, to]) => {
                const start = topology.find((node) => node.id === from)!
                const end = topology.find((node) => node.id === to)!
                const isImpactPath = affected.has(from) && affected.has(to)
                return (
                  <line
                    key={`${from}-${to}`}
                    className={isImpactPath ? 'impact-link' : ''}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    pathLength="1"
                  />
                )
              })}
            </svg>

            {topology.map((node, index) => {
              const selectable = node.id in scenarios
              const isSelected = node.id === module
              const isAffected = result.affected.includes(node.id)
              return (
                <button
                  type="button"
                  key={node.id}
                  className={`topology-node ${isSelected ? 'selected' : ''} ${isAffected ? 'affected' : ''}`}
                  style={
                    {
                      '--x': `${node.x}%`,
                      '--y': `${node.y}%`,
                      '--delay': `${index * 90}ms`,
                    } as React.CSSProperties
                  }
                  onClick={() => selectable && resetPreview(node.id as ModuleName, action)}
                  disabled={!selectable}
                  aria-label={selectable ? `Select ${node.label}` : node.label}
                >
                  <i>{node.label.slice(0, 2)}</i>
                  <span>{node.label}</span>
                  <small>{isSelected ? 'TARGET' : isAffected ? 'IMPACT' : 'SERVICE'}</small>
                </button>
              )
            })}

            <div className="map-legend">
              <span>
                <i className="target-dot" />
                Target
              </span>
              <span>
                <i className="impact-dot" />
                Affected
              </span>
              <span>
                <i />
                Stable
              </span>
            </div>
          </div>
        </div>

        {phase === 'idle' && (
          <div className="draft-insight">
            <div>
              <small>{action.toUpperCase()} SCENARIO PREVIEW</small>
              <b>{result.affected.length} downstream areas may be affected</b>
              <p>{result.outcome}</p>
            </div>
            <div className="draft-metrics">
              <span>
                <b>~{result.files}</b> files
              </span>
              <span>
                <b>{result.routes}</b> routes
              </span>
              <span>
                <b>{result.risk}</b> risk
              </span>
            </div>
          </div>
        )}

        {phase === 'running' && (
          <div className="result-running">
            <div className="loading-ring">
              <span>{progress}%</span>
            </div>
            <div>
              <small>LOCAL GRAPH WALK</small>
              <h3>
                {progress < 40
                  ? 'Building module context'
                  : progress < 75
                    ? 'Following incoming connections'
                    : 'Calculating architectural risk'}
              </h3>
              <div className="sim-progress">
                <i style={{ width: `${progress}%` }} />
              </div>
              <p>
                {module} → {result.affected.join(' → ')}
              </p>
            </div>
          </div>
        )}

        {phase === 'ready' && (
          <div className="result-ready">
            <header>
              <div>
                <small>IMPACT REPORT · DEMO MODEL</small>
                <h3>
                  {actions[action].title}: {module}
                </h3>
              </div>
              <span className={riskLabel.toLowerCase()}>{riskLabel} risk</span>
            </header>

            <div className="risk-row">
              <div
                className="risk-dial"
                style={{ '--score': `${result.risk * 3.6}deg` } as React.CSSProperties}
              >
                <b>{result.risk}</b>
                <small>/100</small>
              </div>
              <div className="impact-stats">
                <article>
                  <b>{result.files}</b>
                  <span>Likely files</span>
                </article>
                <article>
                  <b>{result.routes}</b>
                  <span>Exposed routes</span>
                </article>
                <article>
                  <b>{result.affected.length}</b>
                  <span>Critical flows</span>
                </article>
              </div>
              <div className="impact-copy">
                <small>EXPECTED OUTCOME</small>
                <p>{result.outcome}</p>
              </div>
            </div>

            <div className="analysis-grid">
              <article className="failure-card">
                <span>!</span>
                <div>
                  <small>LIKELY FAILURE MODE</small>
                  <p>{result.failure}</p>
                </div>
              </article>
              <article className="fix">
                <span>✓</span>
                <div>
                  <small>SAFER ENGINEERING PATH</small>
                  <p>{result.recommendation}</p>
                </div>
              </article>
            </div>

            <div className="rollout-plan">
              <small>RECOMMENDED 3-STEP PLAN</small>
              <div>
                {result.steps.map((step, index) => (
                  <article key={step}>
                    <b>0{index + 1}</b>
                    <p>{step}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="validation-row">
              <small>VALIDATE BEFORE CUTOVER</small>
              <div>
                {result.checks.map((check) => (
                  <span key={check}>✓ {check}</span>
                ))}
              </div>
            </div>

            <div className="affected">
              <small>PROPAGATION PATH</small>
              <div>
                <b>{module}</b>
                {result.affected.map((name) => (
                  <span key={name}>
                    <i>→</i>
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <button className="edit-sim" onClick={() => resetPreview()}>
              ← Edit scenario
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
