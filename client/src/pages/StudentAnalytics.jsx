import React, { useMemo, useState, useEffect } from 'react';
import { API_BASE, authHeaders } from '../utils/api';
import { IconRefresh } from '../components/Icons';
import './StudentAnalytics.css';

function parseDate(r) {
  const d = new Date(r.timestamp || r.createdAt || r.date);
  return Number.isNaN(d.getTime()) ? null : d;
}
function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short' }) + ` '${String(y).slice(-2)}`;
}
function dayName(i) { return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]; }

/* Minimal donut — thin stroke, flat color, no glow */
function Donut({ value, size = 132, stroke = 9 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const dash = (clamped / 100) * c;
  const isLow = clamped < 75;
  return (
    <div className="sa-donut-wrap" style={{ width: size, height: size }} role="img" aria-label={`Attendance ${Number.isFinite(value) ? value.toFixed(1)+'%' : '—'}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--ap-border)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke={isLow ? 'var(--ap-danger)' : 'var(--ap-primary)'}
          strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 700ms ease' }}
        />
      </svg>
      <div className="sa-donut-center">
        <strong>{Number.isFinite(value) ? `${value.toFixed(1)}%` : '—'}</strong>
        <span>{isLow ? 'Below target' : 'On track'}</span>
      </div>
    </div>
  );
}

function BarChart({ data }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="sa-bars" role="list">
      {data.map(d => (
        <div key={d.label} className="sa-bar-row" role="listitem">
          <span className="sa-bar-label" title={d.label}>{d.label}</span>
          <div className="sa-bar-track" aria-hidden="true">
            <div className="sa-bar-fill" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="sa-bar-value">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ points, width = 640, height = 140 }) {
  const max = Math.max(1, ...points.map(p => p.value));
  const pad = { l: 28, r: 10, t: 10, b: 24 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : innerW;
  const coords = points.map((p, i) => ({
    x: pad.l + i * stepX,
    y: pad.t + innerH - (p.value / max) * innerH,
    v: p.value, label: p.labelShort || p.label,
    full: p.label,
  }));
  const poly = coords.map(c => `${c.x},${c.y}`).join(' ');
  const [hover, setHover] = useState(null);
  return (
    <div className="sa-line-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="sa-line-svg" role="img" aria-label="14 day trend" onMouseLeave={() => setHover(null)}>
        {/* single baseline grid */}
        <line x1={pad.l} x2={width - pad.r} y1={pad.t + innerH} y2={pad.t + innerH} stroke="var(--ap-border)" strokeWidth="1" />
        <line x1={pad.l} x2={width - pad.r} y1={pad.t + innerH/2} y2={pad.t + innerH/2} stroke="var(--ap-border)" strokeWidth="1" strokeDasharray="3 5" opacity="0.5" />
        <text x={pad.l - 6} y={pad.t + 3} textAnchor="end" fontSize="10" fill="var(--ap-text-muted)">{max}</text>
        <text x={pad.l - 6} y={pad.t + innerH/2 + 3} textAnchor="end" fontSize="10" fill="var(--ap-text-muted)">{Math.round(max/2)}</text>
        <polyline points={poly} fill="none" stroke="var(--ap-primary)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0}>
            <rect x={c.x - stepX/2} y={pad.t} width={stepX} height={innerH} fill="transparent" />
            <circle cx={c.x} cy={c.y} r={hover===i ? 4 : 3} fill={hover===i ? 'var(--ap-primary)' : c.v ? 'var(--ap-primary)' : 'var(--ap-border)'} stroke="white" strokeWidth="1.5" style={{ transition: 'r 0.12s' }} />
            <text x={c.x} y={height - 6} textAnchor="middle" fontSize="10" fill="var(--ap-text-muted)">{c.label}</text>
            {hover===i && (
              <g>
                <rect x={c.x - 34} y={c.y - 32} width={68} height={20} rx={6} fill="var(--ap-text)" />
                <text x={c.x} y={c.y - 19} textAnchor="middle" fontSize="10" fill="white" fontWeight="600">{c.full}: {c.v}</text>
              </g>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function WeekBars({ data }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="sa-week" role="list">
      {data.map(d => (
        <div key={d.label} className="sa-week-col" role="listitem" aria-label={`${d.label} ${d.value}`}>
          <div className="sa-week-track"><div className="sa-week-fill" style={{ height: `${(d.value / max) * 100}%` }} /></div>
          <span className="sa-week-label">{d.label.slice(0,3)}</span>
          <span className="sa-week-value">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function StudentAnalytics({ history = [], department, semester }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (department) params.set('department', department);
        if (semester) params.set('semester', semester);
        const res = await fetch(`${API_BASE}/api/reports/sessions?${params.toString()}`, { headers: authHeaders() });
        const ct = res.headers.get('content-type') || '';
        const data = ct.includes('application/json') ? await res.json() : { success: false };
        if (!cancelled && data.success) setSessions(data.sessions || []);
      } catch {} finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [department, semester]);

  useEffect(() => { if (!toast) return; const t = setTimeout(()=>setToast(''), 2000); return ()=>clearTimeout(t); }, [toast]);

  const stats = useMemo(() => {
    const totalHeld = sessions.length;
    const attended = history.length;
    const absent = Math.max(totalHeld - attended, 0);
    const pct = totalHeld > 0 ? Math.round((attended / totalHeld) * 1000) / 10 : (attended > 0 ? 100 : 0);

    const bySubject = {};
    history.forEach(r => { bySubject[r.subject] = (bySubject[r.subject] || 0) + 1; });
    const subjectData = Object.entries(bySubject).map(([label, value]) => ({ label, value })).sort((a,b)=>b.value-a.value).slice(0,6);

    const heldBySubject = {};
    sessions.forEach(s => { heldBySubject[s.subject] = (heldBySubject[s.subject] || 0) + 1; });
    const subjectPct = Object.keys({ ...bySubject, ...heldBySubject }).map(sub => {
      const h = heldBySubject[sub] || 0;
      const a = bySubject[sub] || 0;
      return { label: sub, value: a, held: h, pct: h ? Math.round((a/h)*1000)/10 : 100 };
    }).sort((a,b)=>a.pct-b.pct);

    const now = new Date();
    const daily = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-CA');
      const cnt = history.filter(r => { const rd = parseDate(r); return rd && rd.toLocaleDateString('en-CA') === key; }).length;
      daily.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), labelShort: d.toLocaleDateString('en-US', { day: 'numeric' }), value: cnt, key });
    }

    const week = Array.from({ length: 7 }, (_, i) => ({ label: dayName(i), value: 0 }));
    history.forEach(r => { const d = parseDate(r); if (d) week[d.getDay()].value++; });

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      const cnt = history.filter(r => { const rd = parseDate(r); return rd && monthKey(rd) === key; }).length; // monthKey already uses local components
      months.push({ label: monthLabel(key), value: cnt, key });
    }

    const qr = history.filter(r => r.method === 'qr').length;
    const manual = history.filter(r => r.method === 'manual' || r.method === 'teacher_override').length;

    let streak = 0;
    const dateSet = new Set(history.map(r => { const d=parseDate(r); return d ? d.toLocaleDateString('en-CA') : null; }).filter(Boolean));
    let cursor = new Date(now); cursor.setHours(0,0,0,0);
    const todayKey = cursor.toLocaleDateString('en-CA');
    if (!dateSet.has(todayKey)) cursor.setDate(cursor.getDate()-1);
    while (dateSet.has(cursor.toLocaleDateString('en-CA'))) { streak++; cursor.setDate(cursor.getDate()-1); }

    let need = 0;
    if (totalHeld > 0 && pct < 75) need = Math.max(0, Math.ceil(0.75 * totalHeld - attended));

    const last7 = history.filter(r => { const d = parseDate(r); return d && (now - d)/86400000 <= 7; }).length;

    return { totalHeld, attended, absent, pct, subjectData, subjectPct, daily, week, months, qr, manual, streak, need, last7 };
  }, [history, sessions]);

  const status = stats.totalHeld === 0 ? 'neutral' : stats.pct >= 75 ? 'ok' : 'low';

  const refresh = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (department) params.set('department', department);
      if (semester) params.set('semester', semester);
      const res = await fetch(`${API_BASE}/api/reports/sessions?${params.toString()}`, { headers: authHeaders() });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : { success: false };
      if (data.success) setSessions(data.sessions || []);
      setToast('Updated');
    } catch { setToast('Failed'); } finally { setLoading(false); }
  };

  if (loading && history.length === 0) {
    return (
      <div className="sa sa--loading">
        <div className="sa-skel" style={{ height: 72 }} />
        <div className="sa-kpis">{[1,2,3,4].map(i => <div key={i} className="sa-skel" style={{ height: 92 }} />)}</div>
        <div className="sa-grid">{[1,2,3,4,5,6].map(i => <div key={i} className="sa-skel" style={{ height: 240 }} />)}</div>
      </div>
    );
  }

  return (
    <div className="sa">
      {/* Header — minimal */}
      <div className="sa-header">
        <div>
          <h2>Analytics</h2>
          <p>{department || '—'} · Sem {semester || '—'} · {stats.attended} of {loading ? '…' : stats.totalHeld} classes</p>
        </div>
        <div className="sa-header-actions">
          <button className="sa-link" onClick={refresh}><IconRefresh size={14} /> Refresh</button>
        </div>
      </div>

      {/* KPIs — minimal */}
      <div className="sa-kpis">
        <div className={`sa-kpi ${status}`}>
          <span className="sa-kpi-label">Attendance</span>
          <strong>{stats.totalHeld ? `${stats.pct}%` : '—'}</strong>
          <span className="sa-kpi-meta">{stats.attended}/{loading ? '…' : stats.totalHeld} {stats.totalHeld ? (status==='ok' ? '· meets 75%' : `· need ${stats.need} more`) : ''}</span>
        </div>
        <div className="sa-kpi">
          <span className="sa-kpi-label">Present</span>
          <strong>{stats.attended}</strong>
          <span className="sa-kpi-meta">{stats.last7} in last 7 days</span>
        </div>
        <div className="sa-kpi">
          <span className="sa-kpi-label">Absent</span>
          <strong>{loading ? '…' : stats.absent}</strong>
          <span className="sa-kpi-meta">of {loading ? '…' : stats.totalHeld} held</span>
        </div>
        <div className="sa-kpi">
          <span className="sa-kpi-label">Streak</span>
          <strong>{stats.streak}<em>d</em></strong>
          <span className="sa-kpi-meta">{stats.streak ? 'consecutive days' : 'attend today'}</span>
        </div>
      </div>

      {stats.totalHeld > 0 && (
        <div className={`sa-note ${status}`}>
          {status === 'low' ? (
            <><strong>Below 75%</strong> — you need {stats.need} more class{stats.need!==1?'es':''} to reach eligibility.</>
          ) : (
            <><strong>{stats.pct}% — on track.</strong> Keep attending to stay above 75%.</>
          )}
        </div>
      )}

      <div className="sa-grid">
        <div className="sa-card">
          <div className="sa-card-head"><h3>Overall</h3><span>{loading ? '…' : `${stats.totalHeld} held`}</span></div>
          <div className="sa-card-body center">
            <Donut value={stats.pct} />
            <p className="sa-caption">{stats.attended} present · {loading ? '…' : stats.absent} absent</p>
          </div>
        </div>

        <div className="sa-card">
          <div className="sa-card-head"><h3>Method</h3><span>QR vs Manual</span></div>
          <div className="sa-card-body">
            {stats.qr + stats.manual === 0 ? (
              <p className="sa-muted">No check-ins yet.</p>
            ) : (
              <div className="sa-method-min">
                <div className="sa-method-row"><span>QR</span><div className="sa-method-track"><div className="sa-method-fill" style={{ width: `${(stats.qr/(stats.qr+stats.manual))*100}%` }} /></div><span>{stats.qr}</span></div>
                <div className="sa-method-row"><span>Manual</span><div className="sa-method-track"><div className="sa-method-fill muted" style={{ width: `${(stats.manual/(stats.qr+stats.manual))*100}%` }} /></div><span>{stats.manual}</span></div>
              </div>
            )}
          </div>
        </div>

        <div className="sa-card span-2">
          <div className="sa-card-head"><h3>By subject</h3><span>{stats.subjectData.length} subjects</span></div>
          <div className="sa-card-body">
            {stats.subjectData.length === 0 ? <p className="sa-muted">No data yet.</p> : <BarChart data={stats.subjectData} />}
            {stats.subjectPct.length > 0 && !loading && stats.totalHeld > 0 && (
              <div className="sa-table">
                <div className="sa-table-head"><span>Subject</span><span>Present</span><span>Held</span><span>%</span></div>
                {stats.subjectPct.map(r => (
                  <div key={r.label} className="sa-table-row">
                    <span title={r.label}>{r.label}</span><span>{r.value}</span><span>{r.held || '—'}</span><span className={r.pct < 75 ? 'low' : ''}>{r.held ? `${r.pct}%` : '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sa-card span-2">
          <div className="sa-card-head"><h3>Last 14 days</h3><span>Daily check-ins</span></div>
          <div className="sa-card-body"><LineChart points={stats.daily} /></div>
        </div>

        <div className="sa-card">
          <div className="sa-card-head"><h3>By weekday</h3></div>
          <div className="sa-card-body"><WeekBars data={stats.week} /></div>
        </div>

        <div className="sa-card">
          <div className="sa-card-head"><h3>Last 6 months</h3></div>
          <div className="sa-card-body">
            <div className="sa-bars compact">
              {stats.months.map(m => {
                const max = Math.max(1, ...stats.months.map(x => x.value));
                return (
                  <div key={m.key} className="sa-bar-row">
                    <span className="sa-bar-label" style={{ flexBasis: 84 }}>{m.label}</span>
                    <div className="sa-bar-track"><div className="sa-bar-fill" style={{ width: `${(m.value/max)*100}%` }} /></div>
                    <span className="sa-bar-value">{m.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="sa-card span-2">
          <div className="sa-card-head"><h3>Notes</h3></div>
          <div className="sa-card-body">
            <ul className="sa-notes">
              {stats.subjectPct.filter(s=>s.pct < 75 && s.held).length > 0 && (
                <li><strong>Low in {stats.subjectPct.filter(s=>s.pct<75&&s.held).slice(0,3).map(s=>s.label).join(', ')}</strong> — below 75%, prioritize these.</li>
              )}
              {stats.subjectPct.filter(s=>s.pct<75&&s.held).length===0 && stats.totalHeld>0 && <li>All subjects above 75%.</li>}
              <li>{stats.qr} QR · {stats.manual} manual — {stats.qr >= stats.manual ? 'mostly QR.' : 'try QR when available.'}</li>
              {stats.streak >= 2 && <li>{stats.streak}-day streak — keep going.</li>}
              {stats.totalHeld===0 && <li>No classes held for this section yet.</li>}
            </ul>
          </div>
        </div>
      </div>

      {toast && <div className="sa-toast" role="status">{toast}</div>}
    </div>
  );
}
