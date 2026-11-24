import { memo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Award, Coffee, Download, Droplets, Eye, ScanFace, Sparkles } from 'lucide-react';
import { Snapshot } from '../shared/types';
import { dayKey } from '../shared/defaults';
import {
  badges,
  dailySummary,
  hydrationStreak,
  weekSummary,
  weeklyInsight,
} from '../data/insights';
import { CardHeading, Empty } from './components';
import { useSystemReducedMotion } from './useAppearance';
function Progress({ data }: { data: Snapshot }) {
  const [days, setDays] = useState(7),
    [status, setStatus] = useState(''),
    [exporting, setExporting] = useState(false);
  const systemReduced = useSystemReducedMotion();
  const animate =
    !data.settings.reducedMotion && data.settings.motionLevel !== 'off' && !systemReduced;
  const today = dailySummary(data.events, data.settings);
  const week = weekSummary(data.events, data.settings, Date.now(), days);
  const hasBreaksOrWater = week.some((day) => day.breaks > 0 || day.water > 0);
  const hasHabitScore = week.some((day) => day.score !== null);
  const focusTotal = week.reduce((sum, day) => sum + day.focusMinutes, 0);
  const focusDays = week.filter((day) => day.focusMinutes > 0).length;
  const reportStart = week[0].day;
  const awaySeconds = data.events.reduce(
    (sum, event) =>
      event.type === 'study-away' && event.day >= reportStart && event.day <= today.day
        ? sum + event.value
        : sum,
    0,
  );
  const posture = data.events
    .filter((e) => e.type === 'posture-score' && e.day === dayKey())
    .map((e) => ({
      time: new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      score: e.value,
    }));
  const chart = week.map((d) => ({
    ...d,
    label: new Date(d.day + 'T12:00:00').toLocaleDateString([], {
      weekday: 'short',
      day: 'numeric',
    }),
  }));
  const exportReport = async (format: 'csv' | 'pdf') => {
    if (exporting) return;
    setExporting(true);
    setStatus('Preparing your local report…');
    try {
      const path = await window.screenwell.export(format, days);
      setStatus(path ? `Saved on this computer: ${path}` : 'Export cancelled.');
    } catch {
      setStatus('Couldn’t export. Choose a writable folder and try again.');
    } finally {
      setExporting(false);
    }
  };
  return (
    <>
      <div className="page-title progress-title">
        <div>
          <p className="eyebrow">SMALL MOMENTS ADD UP</p>
          <h1>Your progress, at your pace</h1>
          <p>A little reflection. No pressure to be perfect.</p>
        </div>
        <div className="export-controls">
          <select
            aria-label="Report period"
            value={days}
            disabled={exporting}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={1}>Today</option>
            <option value={7}>Last 7 days</option>
          </select>
          <button
            className="secondary"
            disabled={exporting}
            onClick={() => void exportReport('csv')}
          >
            <Download size={15} />
            CSV
          </button>
          <button className="primary" disabled={exporting} onClick={() => void exportReport('pdf')}>
            <Download size={15} />
            PDF
          </button>
        </div>
      </div>
      <p className="export-status" role="status">
        {status}
      </p>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon green">
            <Coffee size={20} />
          </span>
          <p>Today’s mindful pauses</p>
          <strong>
            {today.breaks}
            <span> taken · {today.skipped} skipped</span>
          </strong>
          <small>Every pause is a choice.</small>
        </div>
        <div className="stat-card">
          <span className="stat-icon blue">
            <Droplets size={20} />
          </span>
          <p>Hydration streak</p>
          <strong>
            {hydrationStreak(data.events, data.settings.waterGoal)}
            <span> days</span>
          </strong>
          <small>{today.water} glasses logged today</small>
        </div>
        <div className="stat-card">
          <span className="stat-icon peach">
            <Eye size={20} />
          </span>
          <p>Average blink rhythm</p>
          <strong>
            {today.blink === null ? '—' : Math.round(today.blink)}
            <span> / minute</span>
          </strong>
          <small>
            {today.blink === null
              ? 'Not observed. Camera is optional.'
              : 'Estimates from clear observed minutes.'}
          </small>
        </div>
        <div className="stat-card">
          <span className="stat-icon lavender">
            <ScanFace size={20} />
          </span>
          <p>Longest completed focus</p>
          <strong>
            {Math.round(today.focus)}
            <span> minutes</span>
          </strong>
          <small>Time you made for your work.</small>
        </div>
      </div>
      <section className="card chart-card focus-activity space-top" aria-label="Focus activity">
        <div className="focus-activity-heading">
          <CardHeading eyebrow={days === 1 ? 'TODAY' : 'LAST 7 DAYS'} title="Study & focus time" />
          <div className="focus-activity-total">
            <strong>{focusTotal.toLocaleString([], { maximumFractionDigits: 1 })} min</strong>
            <span>
              {focusDays} {focusDays === 1 ? 'active day' : 'active days'}
            </span>
          </div>
        </div>
        {focusDays > 0 ? (
          <>
            <div
              className="chart"
              role="img"
              aria-label="Focus minutes by day. Daily values are available below."
            >
              <ResponsiveContainer width="100%" height={205}>
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 5" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis width={34} allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) =>
                      `${Number(value).toLocaleString([], { maximumFractionDigits: 1 })} min`
                    }
                    contentStyle={{
                      background: 'var(--surface)',
                      borderColor: 'var(--line)',
                      borderRadius: 10,
                    }}
                  />
                  <Bar
                    dataKey="focusMinutes"
                    name="Study & focus"
                    fill="var(--chart-a)"
                    isAnimationActive={animate}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={52}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="muted focus-activity-caption">
              Includes logged study blocks and focus timers.
            </p>
          </>
        ) : (
          <Empty>Finish a study block or focus timer to see your time here.</Empty>
        )}
        {awaySeconds > 0 && (
          <p className="muted focus-activity-caption">
            Time out of camera view during guided study · {Math.floor(awaySeconds / 60)} min{' '}
            {awaySeconds % 60} sec
          </p>
        )}
      </section>
      <div className="two-col space-top">
        <section className="card chart-card">
          <CardHeading eyebrow={days === 1 ? 'TODAY' : 'LAST 7 DAYS'} title="Breaks & water" />
          {hasBreaksOrWater ? (
            <>
              <div
                className="chart"
                role="img"
                aria-label="Bar chart of completed breaks and logged water by day"
              >
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={chart}>
                    <CartesianGrid strokeDasharray="3 5" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={25}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface)',
                        borderColor: 'var(--line)',
                        borderRadius: 10,
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="breaks"
                      name="Breaks"
                      fill="var(--chart-a)"
                      isAnimationActive={animate}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="water"
                      name="Water glasses"
                      fill="var(--chart-b)"
                      isAnimationActive={animate}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-legend">
                <span>
                  <i />
                  Breaks
                </span>
                <span>
                  <i />
                  Water glasses
                </span>
              </div>
            </>
          ) : (
            <Empty>Your first pause or glass of water will appear here.</Empty>
          )}
        </section>
        <section className="card score-card">
          <CardHeading
            eyebrow="A HABIT INDICATOR, NOT A HEALTH SCORE"
            title="Today’s wellness score"
          />
          <div className="wellness-score">
            <strong>{today.score ?? '—'}</strong>
            <span>/ 100</span>
          </div>
          <p className="muted">
            {today.score === null
              ? 'No break, water or camera observations logged today.'
              : 'A simple reflection of logged habits. Camera observations are optional.'}
          </p>
          <details>
            <summary>How is this calculated?</summary>
            <ul>
              {today.components.map((c) => (
                <li key={c.label}>
                  <strong>
                    {c.label} · weight {c.weight}
                  </strong>
                  <span>{c.explanation}</span>
                </li>
              ))}
            </ul>
            <p>
              Only available components are weighted. Missing camera data never counts as zero. The
              thresholds are project heuristics, not clinical targets.
            </p>
          </details>
        </section>
      </div>
      <div className="two-col space-top">
        <section className="card chart-card">
          <CardHeading eyebrow="COMPARE WITH YOUR OWN BASELINE" title="Posture through today" />
          {posture.length > 1 ? (
            <div className="chart" role="img" aria-label="Posture score timeline">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={posture}>
                  <CartesianGrid strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} width={30} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      borderColor: 'var(--line)',
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Posture estimate"
                    stroke="var(--chart-a)"
                    isAnimationActive={animate}
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty>
              {today.posture === null
                ? 'No posture observations. Timed check-ins work without the camera.'
                : 'Keep the camera running a little longer to see a timeline.'}
            </Empty>
          )}
        </section>
        <section className="card chart-card">
          <CardHeading eyebrow={days === 1 ? 'TODAY' : 'LAST 7 DAYS'} title="Habit score trend" />
          {hasHabitScore ? (
            <div className="chart" role="img" aria-label="Habit score trend">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chart}>
                  <CartesianGrid strokeDasharray="3 5" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis domain={[0, 100]} width={30} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      borderColor: 'var(--line)',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    name="Habit score"
                    stroke="var(--chart-a)"
                    isAnimationActive={animate}
                    fill="var(--accent-soft)"
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty>Find your own rhythm. Your trend will grow with you.</Empty>
          )}
        </section>
      </div>
      <section className="insight-card space-top">
        <Sparkles size={23} />
        <div>
          <h2>A gentle observation</h2>
          <p>{weeklyInsight(data.events)}</p>
          <small>
            Written by local rules using your activity. No AI service or cloud processing.
          </small>
        </div>
      </section>
      <div className="section-title">
        <h2>Little milestones</h2>
        <span>Encouragement, without the pressure.</span>
      </div>
      <div className="badges-grid">
        {badges(data.events, data.settings).map((b) => (
          <section className={`card badge-card ${b.earned ? 'earned' : ''}`} key={b.name}>
            <span className="badge-icon">
              <Award size={28} />
            </span>
            <h3>{b.name}</h3>
            <p>{b.detail}</p>
            <small>
              {b.earned ? 'A little milestone, made yours.' : 'Here whenever you’re ready.'}
            </small>
          </section>
        ))}
      </div>
      <details className="card space-top accessible-data">
        <summary>View the report as a table</summary>
        <table>
          <caption>Daily habit summaries</caption>
          <thead>
            <tr>
              <th>Date</th>
              <th>Focus (min)</th>
              <th>Breaks</th>
              <th>Water</th>
              <th>Posture</th>
              <th>Blinks/min</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {week.map((d) => (
              <tr key={d.day}>
                <td>{d.day}</td>
                <td>{d.focusMinutes.toLocaleString([], { maximumFractionDigits: 1 })}</td>
                <td>{d.breaks}</td>
                <td>{d.water}</td>
                <td>{d.posture === null ? 'Not observed' : Math.round(d.posture)}</td>
                <td>{d.blink === null ? 'Not observed' : Math.round(d.blink)}</td>
                <td>{d.score ?? 'No activity'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}

export default memo(Progress);
