/**
 * event-detail.js
 * Reads ?id= from the URL, finds the matching event in ra-events.json,
 * and renders the full detail view.
 */

function shortDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function gcalDateTime(dateStr, timeStr, offsetDays = 0) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + offsetDays);
  const pad = (n) => String(n).padStart(2, "0");
  const datepart = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  if (!timeStr) return datepart;
  const [hh, mm] = timeStr.split(":");
  return `${datepart}T${hh}${mm}00`;
}

function openGoogleCalendar(event) {
  const endH = event.endTime ? parseInt(event.endTime) : null;
  const startH = event.startTime ? parseInt(event.startTime) : 20;
  const endOffsetDays = endH !== null && endH < startH ? 1 : 0;
  const dtstart = gcalDateTime(event.date, event.startTime || "20:00");
  const dtend = gcalDateTime(event.date, event.endTime || "", endOffsetDays) ||
                gcalDateTime(event.date, "", 1);
  const params = new URLSearchParams({
    action:   "TEMPLATE",
    text:     event.title,
    dates:    `${dtstart}/${dtend}`,
    location: event.venue,
    details:  `Tickets & info: ${event.tickets}`,
  });
  window.open(`https://calendar.google.com/calendar/render?${params}`, "_blank", "noopener,noreferrer");
}

function isUpcoming(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) >= today;
}

function render(event, allEvents) {
  const main = document.getElementById("event-detail");
  const upcoming = isUpcoming(event.date);

  const idx  = allEvents.findIndex((e) => e.id === event.id);
  const prev = allEvents[idx - 1] || null;
  const next = allEvents[idx + 1] || null;

  const navLink = (ev, label) =>
    `<a class="detail-nav-btn" href="event.html?id=${encodeURIComponent(ev.id)}">${label}</a>`;

  const navHtml = (prev || next) ? `
    <div class="detail-nav">
      ${prev ? navLink(prev, "← Previous event") : "<span></span>"}
      ${next ? navLink(next, "Next event →") : "<span></span>"}
    </div>` : "";

  const isFbUrl = (url) => url && (url.includes("facebook.com") || url.includes("fb.me"));
  const fbLink = (event.promotionalLinks || []).find((l) => isFbUrl(l.url));
  const otherLinks = (event.promotionalLinks || []).filter((l) => !isFbUrl(l.url));

  const timeStr = event.startTime
    ? event.endTime
      ? `${event.startTime} – ${event.endTime}`
      : event.startTime
    : null;

  main.innerHTML = `
    <div class="detail-back">
      <a href="index.html" class="back-link">← Back to events</a>
    </div>

    <article class="detail-card">
      ${event.flyer ? `
      <div class="detail-flyer">
        <img src="${event.flyer}" alt="Flyer for ${escHtml(event.title)}" loading="lazy" decoding="async" fetchpriority="high" />
      </div>` : ""}

      <div class="detail-body">
        <div class="detail-meta-row">
          <div class="detail-date-block">
            <span class="detail-date">${shortDate(event.date)}</span>
            ${timeStr ? `<span class="detail-time">${escHtml(timeStr)}</span>` : ""}
          </div>
          ${event.soldOut ? `<span class="tag sold-out detail-soldout">Sold out</span>` : ""}
        </div>

        <h1 class="detail-title">${escHtml(event.title)}</h1>

        <div class="detail-venue">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <a class="detail-venue-link" href="https://www.google.com/maps/search/${encodeURIComponent(event.venue)}" target="_blank" rel="noopener noreferrer">${escHtml(event.venue)}</a>
        </div>

        ${event.lineup && event.lineup.length > 0 ? `
        <div class="detail-section">
          <h2 class="detail-section-label">Lineup</h2>
          <ul class="detail-lineup">
            ${event.lineup.map(a => `<li>${escHtml(a)}</li>`).join("")}
          </ul>
        </div>` : ""}

        <div class="detail-actions">
          ${upcoming && !event.soldOut ? `
          <button class="detail-action-btn cal" id="cal-btn" type="button">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
            Add to calendar
          </button>` : ""}

          ${fbLink ? `
          <a class="detail-action-btn fb" href="${fbLink.url}" target="_blank" rel="noopener noreferrer">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="6 2 12 20" fill="currentColor" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            Facebook event
          </a>` : ""}

          <a class="detail-action-btn ra" href="${event.tickets}" target="_blank" rel="noopener noreferrer">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            View on RA
          </a>

          <div class="share-wrap" id="share-wrap">
            <button class="detail-action-btn share" id="share-btn" type="button">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share
            </button>
            <div class="share-dropdown hidden" id="share-dropdown">
              <button class="share-item" id="share-copy" type="button">Copy link</button>
              <a class="share-item" id="share-wa" href="#" target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <a class="share-item" id="share-x" href="#" target="_blank" rel="noopener noreferrer">X / Twitter</a>
            </div>
          </div>
        </div>

        ${otherLinks.length > 0 ? `
        <div class="detail-section">
          <h2 class="detail-section-label">Links</h2>
          <ul class="detail-links">
            ${otherLinks.map(l => `
            <li><a href="${l.url}" target="_blank" rel="noopener noreferrer">${escHtml(l.title)} ↗</a></li>
            `).join("")}
          </ul>
        </div>` : ""}
      </div>
    </article>
    ${navHtml}
  `;

  if (upcoming && !event.soldOut) {
    document.getElementById("cal-btn")?.addEventListener("click", () => openGoogleCalendar(event));
  }

  // Share
  const pageUrl  = window.location.href;
  const shareText = `${event.title} — ${shortDate(event.date)} at ${event.venue}`;
  const shareBtn  = document.getElementById("share-btn");
  const shareDrop = document.getElementById("share-dropdown");

  if (navigator.share) {
    shareBtn?.addEventListener("click", () => {
      navigator.share({ title: event.title, text: shareText, url: pageUrl }).catch(() => {});
    });
  } else {
    // Fallback dropdown
    document.getElementById("share-wa").href =
      `https://wa.me/?text=${encodeURIComponent(shareText + "\n" + pageUrl)}`;
    document.getElementById("share-x").href =
      `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`;

    shareBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      shareDrop?.classList.toggle("hidden");
    });

    document.getElementById("share-copy")?.addEventListener("click", () => {
      navigator.clipboard.writeText(pageUrl).then(() => {
        const btn = document.getElementById("share-copy");
        if (btn) { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = "Copy link"; }, 1800); }
      });
    });

    document.addEventListener("click", () => shareDrop?.classList.add("hidden"));
  }

  document.title = `${event.title} — Ravely`;
}

function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderError(msg) {
  const main = document.getElementById("event-detail");
  main.innerHTML = `
    <div class="detail-back"><a href="index.html" class="back-link">← Back to events</a></div>
    <p class="detail-error">${msg}</p>
  `;
}

async function init() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) { renderError("No event specified."); return; }

  let data;
  try {
    const res = await fetch("ra-events.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch {
    renderError("Could not load event data.");
    return;
  }

  const events = data.events || [];
  const event = events.find((e) => e.id === id);

  if (!event) { renderError("Event not found."); return; }

  render(event, events);

  const el = document.getElementById("last-updated");
  if (el && data.fetched) {
    const d = new Date(data.fetched);
    el.textContent = d.toLocaleDateString("en-DK", {
      day: "numeric", month: "long", year: "numeric",
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
