// Standalone public directory. Reads live from the read-only Worker, which
// holds the ReadyOp token and returns only public-flagged records.
// Worker URL (change if you rename the Worker or use another Cloudflare account).
const API_URL = "https://readyop-public-contacts.tnreadyop.workers.dev/contacts";
const BATCH = 100;
const REGIONS = ["West", "Middle", "Southeast", "East"];
const $ = (id) => document.getElementById(id);
let all = [], shown = 0, filtered = [], region = "", county = "";

function fmtPhone(p) {
  let d = p.replace(/\D/g, "");
  if (d.length === 11 && d[0] === "1") d = d.slice(1);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p;
}
const norm = (s) => String(s || "").toLowerCase();
const hay = (c) => norm([c.first, c.last, c.organization, c.title, c.county, c.region, c.city].join(" "));

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text; // textContent: data is never parsed as HTML
  return e;
}

function row(c) {
  const li = el("li");
  li.append(el("div", "name", [c.first, c.last].filter(Boolean).join(" ") || "(no name)"));
  const org = [c.title, c.organization].filter(Boolean).join(" · ");
  if (org) li.append(el("div", "meta", org));
  const loc = [c.county && `${c.county} County`, c.region && `${c.region} Region`].filter(Boolean).join(" · ");
  if (loc) li.append(el("div", "meta", loc));
  const digits = c.phone.replace(/[^\d+]/g, "");
  if (digits) {
    const a = el("a", "phone", fmtPhone(c.phone));
    a.href = "tel:" + digits;
    li.append(a);
  }
  return li;
}

function render(reset) {
  if (reset) { $("list").replaceChildren(); shown = 0; }
  const next = filtered.slice(shown, shown + BATCH);
  $("list").append(...next.map(row));
  shown += next.length;
  $("more").hidden = shown >= filtered.length;
  $("count").textContent = `${filtered.length} contact${filtered.length === 1 ? "" : "s"}`;
}

function apply() {
  const terms = norm($("q").value).split(/\s+/).filter(Boolean);
  filtered = all.filter((c) =>
    (!region || norm(c.region) === norm(region)) &&
    (!county || c.county === county) &&
    terms.every((t) => hay(c).includes(t)));
  render(true);
}

function buildFilters() {
  const rp = $("regions");
  for (const r of REGIONS) {
    const b = el("button", "", r);
    b.type = "button"; b.setAttribute("aria-pressed", "false");
    b.onclick = () => {
      region = region === r ? "" : r;
      [...rp.children].forEach((x) => x.setAttribute("aria-pressed", String(x.textContent === region)));
      apply();
    };
    rp.append(b);
  }
  const counties = [...new Set(all.map((c) => c.county).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  for (const c of counties) $("county").append(new Option(c, c));
}

async function init() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    all = data.contacts || [];
    if (data.generated) $("updated").textContent = "Updated " + new Date(data.generated).toLocaleDateString();
    buildFilters();
    apply();
  } catch (e) {
    $("count").textContent = "Unable to load the contact list right now. Please try again shortly.";
  }
}
$("q").addEventListener("input", apply);
$("county").addEventListener("change", (e) => { county = e.target.value; apply(); });
$("more").addEventListener("click", () => render(false));
init();
