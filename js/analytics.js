// ===== analytics.js =====

function renderAnalytics() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.done).length;
  const rate    = total ? Math.round(done/total*100) : 0;
  const todayT  = getTasksByDate(todayKey()).length;

  document.getElementById('analyticsStats').innerHTML = `
    <div class="stat-card purple"><div class="stat-label">Total Tasks</div><div class="stat-val">${total}</div><div class="stat-chg">All time</div></div>
    <div class="stat-card green"> <div class="stat-label">Completed</div>  <div class="stat-val">${done}</div> <div class="stat-chg">✅ Finished</div></div>
    <div class="stat-card pink">  <div class="stat-label">Rate</div>       <div class="stat-val">${rate}%</div><div class="stat-chg">📈 Overall</div></div>
    <div class="stat-card amber"> <div class="stat-label">Today</div>      <div class="stat-val">${todayT}</div><div class="stat-chg">📅 Planned</div></div>
  `;

  // Category bars
  const cats   = ['work','personal','health','study'];
  const colors = { work:'var(--accent)', personal:'var(--accent2)', health:'var(--accent3)', study:'var(--amber)' };
  const icons  = { work:'💼', personal:'🏡', health:'💪', study:'📚' };
  const counts = cats.map(c => ({ c, n: tasks.filter(t => t.tag === c).length }));
  const maxN   = Math.max(...counts.map(x => x.n), 1);

  document.getElementById('categoryChart').innerHTML = counts.map(({ c, n }) => `
    <div class="bar-row">
      <span class="bar-lbl">${icons[c]} ${c}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:${n/maxN*100}%;background:${colors[c]}"></div>
      </div>
      <span class="bar-cnt">${n}</span>
    </div>
  `).join('');

  // Completion ring
  const R    = 50;
  const circ = 2 * Math.PI * R;
  const off  = circ - (rate/100) * circ;
  const pend = total - done;

  document.getElementById('completionChart').innerHTML = `
    <div class="ring-wrap">
      <div style="position:relative;width:120px;height:120px;flex-shrink:0">
        <svg width="120" height="120" style="transform:rotate(-90deg)">
          <circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--bg3)" stroke-width="12"/>
          <circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--accent3)" stroke-width="12"
            stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
            stroke-linecap="round" style="transition:stroke-dashoffset .8s ease"/>
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <span style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;">${rate}%</span>
          <span style="font-size:10px;color:var(--text3);">done</span>
        </div>
      </div>
      <div class="ring-info">
        <div class="ring-info-item"><div class="ring-dot" style="background:var(--accent3)"></div>Completed: <strong>${done}</strong></div>
        <div class="ring-info-item"><div class="ring-dot" style="background:var(--accent2)"></div>Pending: <strong>${pend}</strong></div>
        <div class="ring-info-item"><div class="ring-dot" style="background:var(--accent)"></div>Total: <strong>${total}</strong></div>
      </div>
    </div>
  `;

  // Weekly chart — last 7 days
  const bars = [];
  for (let i = 6; i >= 0; i--) {
    const d   = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const dt  = getTasksByDate(key);
    bars.push({
      label: d.toLocaleDateString('en-US',{ weekday:'short' }),
      total: dt.length,
      done:  dt.filter(t => t.done).length
    });
  }
  const maxBar = Math.max(...bars.map(b => b.total), 1);

  document.getElementById('weeklyChart').innerHTML = bars.map(b => `
    <div class="bar-row">
      <span class="bar-lbl" style="width:36px;font-size:11px;">${b.label}</span>
      <div class="bar-track" style="position:relative;">
        <div style="position:absolute;height:100%;border-radius:999px;background:rgba(108,99,255,.25);
          width:${b.total/maxBar*100}%;"></div>
        <div class="bar-fill" style="width:${b.done/maxBar*100}%;background:var(--accent3)"></div>
      </div>
      <span class="bar-cnt">${b.done}/${b.total}</span>
    </div>
  `).join('');
}
