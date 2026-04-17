// ===== calendar.js =====
const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT= ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

let calYear, calMonth, calView = 'month', selectedCalDate = null;

function initCalendar() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
}

function setCalView(v, el) {
  calView = v;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderCalendar();
}

function changeMonth(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCalendar();
}

function renderCalendar() {
  document.getElementById('calTitle').textContent = MONTHS[calMonth] + ' ' + calYear;
  calView === 'month'
    ? renderMonthView(document.getElementById('calGrid'))
    : renderWeekView(document.getElementById('calGrid'));
}

const DOT_COLORS = { work:'#9b93ff', personal:'#ff6584', health:'#43e97b', study:'#f6c90e' };

function renderMonthView(grid) {
  const today   = todayKey();
  const first   = new Date(calYear, calMonth, 1).getDay();
  const lastDay = new Date(calYear, calMonth+1, 0).getDate();
  const prevLast= new Date(calYear, calMonth, 0).getDate();

  let html = `<div class="cal-dow">${DAYS_SHORT.map(d=>`<span>${d}</span>`).join('')}</div><div class="cal-days">`;

  for (let i=0; i<first; i++) {
    html += `<div class="cal-day other-month"><div class="day-num">${prevLast-first+i+1}</div></div>`;
  }

  for (let d=1; d<=lastDay; d++) {
    const dateStr  = `${calYear}-${pad2(calMonth+1)}-${pad2(d)}`;
    const dayTasks = getTasksByDate(dateStr);
    const isToday  = dateStr === today;
    const isSel    = dateStr === selectedCalDate;

    const dots = dayTasks.slice(0,4).map(t =>
      `<div class="day-dot" style="background:${DOT_COLORS[t.tag]||'#9b93ff'}"></div>`
    ).join('');

    html += `<div class="cal-day ${isToday?'today':''} ${isSel?'selected':''}" onclick="selectCalDay('${dateStr}')">
      <div class="day-num">${d}</div>
      <div class="day-dots">${dots}</div>
      ${dayTasks.length ? `<span class="task-count-badge">${dayTasks.length}</span>` : ''}
    </div>`;
  }

  const total = first + lastDay;
  const rows  = Math.ceil(total/7)*7;
  for (let i=1; i<=rows-total; i++) {
    html += `<div class="cal-day other-month"><div class="day-num">${i}</div></div>`;
  }
  html += '</div>';
  grid.innerHTML = html;
}

function renderWeekView(grid) {
  const now    = new Date();
  const today  = now.toISOString().split('T')[0];
  const sun    = new Date(now); sun.setDate(now.getDate()-now.getDay());

  let html = `<div class="cal-dow">`;
  for (let i=0; i<7; i++) {
    const d = new Date(sun); d.setDate(sun.getDate()+i);
    html += `<span>${DAYS_SHORT[i]} ${d.getDate()}</span>`;
  }
  html += `</div><div class="cal-days">`;

  for (let i=0; i<7; i++) {
    const d       = new Date(sun); d.setDate(sun.getDate()+i);
    const dateStr = d.toISOString().split('T')[0];
    const dt      = getTasksByDate(dateStr);
    const isToday = dateStr === today;
    const isSel   = dateStr === selectedCalDate;

    const pills = dt.map(t =>
      `<div style="font-size:10px;background:rgba(108,99,255,.18);color:#9b93ff;
        border-radius:4px;padding:2px 5px;margin-bottom:2px;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        ${t.done?'text-decoration:line-through;opacity:.5':''}">${escHtml(t.name)}</div>`
    ).join('');

    html += `<div class="cal-day ${isToday?'today':''} ${isSel?'selected':''}"
              style="min-height:110px" onclick="selectCalDay('${dateStr}')">
      <div class="day-num">${d.getDate()}</div>${pills}
    </div>`;
  }
  html += '</div>';
  grid.innerHTML = html;
}

function selectCalDay(dateStr) {
  selectedCalDate = dateStr;
  renderCalendar();

  const dayTasks = getTasksByDate(dateStr);
  const d        = new Date(dateStr + 'T00:00:00');
  const label    = d.toLocaleDateString('en-US',{ weekday:'long', month:'long', day:'numeric', year:'numeric' });

  document.getElementById('selectedDayPanel').innerHTML =
    `<div class="panel">
      <div class="panel-hdr">
        <span class="panel-title">📅 ${label}</span>
        <button style="background:var(--accent);color:#fff;border:none;padding:7px 16px;
          border-radius:var(--r3);font-size:12px;font-weight:600;cursor:pointer;
          font-family:'DM Sans',sans-serif;" onclick="openModal('${dateStr}')">+ Add Task</button>
      </div>
      ${dayTasks.length
        ? dayTasks.map(t => taskHTML(t)).join('')
        : '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">No tasks for this day.<br/>Click "+ Add Task" to plan!</div></div>'
      }
    </div>`;
}
