import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { getQueueSummaries } from '#services/queue_dashboard_service'

/**
 * Read only view of the BullMQ queues. It is guarded by a shared token rather
 * than the normal bearer auth so it can be opened straight in a browser, and it
 * exposes no patient data: only job ids, states and timings.
 */
export default class QueueDashboardController {
  private isAuthorised(ctx: HttpContext): boolean {
    const expected = env.get('QUEUE_DASHBOARD_TOKEN', '')
    if (!expected) return false

    const provided =
      (ctx.request.input('token') as string | undefined) ??
      ctx.request.header('x-queue-dashboard-token') ??
      ''

    return provided === expected
  }

  async stats(ctx: HttpContext) {
    if (!this.isAuthorised(ctx)) {
      return ctx.response.unauthorized({ message: 'Invalid or missing dashboard token' })
    }

    return ctx.response.ok({
      generatedAt: new Date().toISOString(),
      queues: await getQueueSummaries(),
    })
  }

  async index(ctx: HttpContext) {
    if (!this.isAuthorised(ctx)) {
      return ctx.response.unauthorized({ message: 'Invalid or missing dashboard token' })
    }

    const queues = await getQueueSummaries()
    const html = renderDashboard(queues, String(ctx.request.input('token') ?? ''))

    return ctx.response.header('content-type', 'text/html; charset=utf-8').send(html)
  }
}

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const formatTime = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC' : '—'

const renderDashboard = (
  queues: Awaited<ReturnType<typeof getQueueSummaries>>,
  token: string
): string => {
  const cards = queues
    .map((queue) => {
      const counts = Object.entries(queue.counts)
        .map(
          ([state, count]) =>
            `<div class="stat"><span class="stat-value">${count}</span><span class="stat-label">${escapeHtml(state)}</span></div>`
        )
        .join('')

      const rows = queue.recentJobs.length
        ? queue.recentJobs
            .map((job) => {
              const detail = job.failedReason
                ? escapeHtml(job.failedReason)
                : escapeHtml(
                    typeof job.result === 'object' && job.result !== null
                      ? JSON.stringify(job.result)
                      : (job.result ?? '')
                  )
              return `<tr>
                <td>${escapeHtml(job.id)}</td>
                <td><span class="badge badge-${escapeHtml(job.state)}">${escapeHtml(job.state)}</span></td>
                <td>${formatTime(job.createdAt)}</td>
                <td>${job.durationMs === null ? '—' : `${(job.durationMs / 1000).toFixed(1)}s`}</td>
                <td class="detail">${detail || '—'}</td>
              </tr>`
            })
            .join('')
        : '<tr><td colspan="5" class="empty">No recent jobs</td></tr>'

      return `<section class="card">
        <header>
          <div>
            <h2>${escapeHtml(queue.label)}</h2>
            <p class="queue-name">${escapeHtml(queue.name)}</p>
          </div>
          <div class="meta">
            <span class="${queue.workers > 0 ? 'ok' : 'warn'}">${queue.workers} worker${queue.workers === 1 ? '' : 's'} connected</span>
            ${queue.paused ? '<span class="warn">paused</span>' : ''}
            ${queue.nextRunAt ? `<span>next run ${formatTime(queue.nextRunAt)}</span>` : ''}
          </div>
        </header>
        <div class="stats">${counts}</div>
        <table>
          <thead><tr><th>Job</th><th>State</th><th>Created</th><th>Duration</th><th>Result</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`
    })
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="refresh" content="15${token ? `;url=?token=${encodeURIComponent(token)}` : ''}" />
<title>MMHC queues</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 32px; background: #f5f6f8; color: #1b1f23; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .generated { color: #6a737d; font-size: 13px; margin: 0 0 24px; }
  .card { background: #fff; border: 1px solid #e1e4e8; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
  .card header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
  h2 { font-size: 16px; margin: 0; }
  .queue-name { margin: 2px 0 0; font-size: 12px; color: #6a737d; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .meta { display: flex; gap: 12px; font-size: 12px; color: #6a737d; flex-wrap: wrap; }
  .meta .ok { color: #1a7f37; font-weight: 600; }
  .meta .warn { color: #bc4c00; font-weight: 600; }
  .stats { display: flex; gap: 24px; margin: 16px 0; flex-wrap: wrap; }
  .stat { display: flex; flex-direction: column; }
  .stat-value { font-size: 20px; font-weight: 600; }
  .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #6a737d; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #6a737d; border-bottom: 1px solid #e1e4e8; padding: 6px 8px; }
  td { padding: 6px 8px; border-bottom: 1px solid #f0f2f4; vertical-align: top; }
  td.detail { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-word; max-width: 420px; }
  td.empty { color: #6a737d; text-align: center; padding: 16px; }
  .badge { padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .badge-completed { background: #dafbe1; color: #1a7f37; }
  .badge-active { background: #ddf4ff; color: #0969da; }
  .badge-failed { background: #ffebe9; color: #cf222e; }
  .badge-waiting, .badge-delayed { background: #f1f2f4; color: #57606a; }
</style>
</head>
<body>
  <h1>MMHC background queues</h1>
  <p class="generated">Refreshes every 15 seconds. Generated ${formatTime(new Date().toISOString())}.</p>
  ${cards}
</body>
</html>`
}
