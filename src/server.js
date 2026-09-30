/**
 * Dental benefits helper.
 *
 * The user gives their plan and what they need done, and the model works out the numbers and
 * explains them. Keeping the logic in the prompt made this much quicker to build than coding
 * every plan rule ourselves.
 */
import { createServer } from 'node:http'
import { matchProcedure, REFERENCE_COSTS } from './costs.js'
import { ask } from './model.js'

const PORT = Number(process.env.PORT ?? 8080)
const sessions = new Map()

const FIELDS = [
  'annualMaximum', 'deductible', 'coinsurance', 'network', 'waitingPeriods', 'frequencyLimits',
]

function prompt(plan, procedures) {
  const known = Object.entries(plan).map(([k, v]) => `${k}: ${v}`).join('\n')
  const wanted = procedures
    .map((c) => `${c} — ${REFERENCE_COSTS[c]?.description ?? 'unknown'}`)
    .join('\n')
  return `A member has this dental plan:
${known}

They are planning:
${wanted}

Work out what the plan pays and what the member owes for each one. Then put them in the best
order across the plan year to make the most of their benefits. Give the dollar amounts.`
}

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body, null, 2))
}

async function body(req) {
  let raw = ''
  for await (const chunk of req) raw += chunk
  return raw ? JSON.parse(raw) : {}
}

const server = createServer(async (req, res) => {
  const url = (req.url ?? '/').split('?')[0]

  if (req.method === 'GET' && (url === '/' || url === '/health')) {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(`<h1>Dental benefits helper</h1>
      <p>POST /plan with your plan details, POST /procedure with what you need done,
      then POST /answer for the breakdown and the order to do it in.</p>`)
    return
  }

  const session = (id) => {
    if (!sessions.has(id)) sessions.set(id, { plan: {}, procedures: [] })
    return sessions.get(id)
  }

  if (req.method === 'POST' && url === '/plan') {
    const b = await body(req)
    const s = session(b.sessionId ?? 'default')
    for (const f of FIELDS) if (b[f] !== undefined) s.plan[f] = b[f]
    json(res, 200, { plan: s.plan, missing: FIELDS.filter((f) => s.plan[f] === undefined) })
    return
  }

  if (req.method === 'POST' && url === '/procedure') {
    const b = await body(req)
    const s = session(b.sessionId ?? 'default')
    const match = matchProcedure(b.description)
    if (!match.matched) { json(res, 422, { message: match.reason }); return }
    s.procedures.push(match.code)
    json(res, 200, { code: match.code, procedures: s.procedures })
    return
  }

  if (req.method === 'POST' && url === '/answer') {
    const b = await body(req)
    const s = session(b.sessionId ?? 'default')
    const reply = await ask(prompt(s.plan, s.procedures))
    json(res, 200, {
      breakdown: reply.text,
      source: reply.source,
      note: 'Estimates only. Check your plan document.',
    })
    return
  }

  json(res, 404, { message: 'not found' })
})

server.listen(PORT, () => console.log(JSON.stringify({ event: 'listening', port: PORT })))
