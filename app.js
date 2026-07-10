const ADMIN_SESSION_KEY = "carta_admin_password";

// DB의 분류값(한글)을 필터 버튼에 표시할 영어 라벨로 묶습니다.
// match에 여러 한글 분류를 넣으면 한 버튼으로 합쳐집니다(예: 큐레이션 매체 2곳 → Curated).
// 표시 순서는 이 배열 순서를 따르고, 카드가 하나도 없는 분류의 버튼은 자동으로 숨깁니다.
const CATEGORY_FILTERS = [
  { label: "Motion Graphics", match: ["모션그래픽 스튜디오"] },
  { label: "VFX", match: ["VFX 스튜디오"] },
  { label: "Animation", match: ["애니메이션 스튜디오"] },
  { label: "Media Art", match: ["미디어아트"] },
  { label: "Music Video", match: ["뮤직비디오 프로덕션"] },
  { label: "Tech", match: ["테크 기업"] },
  { label: "Staff Picks", match: ["Vimeo Staff Picks"] },
  { label: "Curated", match: ["큐레이션 (Motionographer)", "큐레이션 (The FWA)"] }
];

let supabaseClient = null;

function getClient() {
  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
  }
  return supabaseClient;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function isAdminMode() {
  return Boolean(sessionStorage.getItem(ADMIN_SESSION_KEY));
}

function setAdminMode(active) {
  document.body.classList.toggle("admin-mode", active);
  const btn = document.getElementById("admin-toggle");
  // title(호버 툴팁)은 HTML의 "No Bunnies Allowed!"를 유지하고, 상태는 aria-label로만 반영
  btn.setAttribute("aria-label", active ? "관리자 모드 끄기" : "관리자");
  btn.classList.toggle("is-active", active);
}

async function handleAdminToggleClick() {
  if (isAdminMode()) {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setAdminMode(false);
    return;
  }

  const input = window.prompt("관리자 비밀번호를 입력하세요");
  if (!input) return;

  const { data, error } = await getClient().rpc("verify_admin_password", { input_password: input });

  if (error || !data) {
    window.alert("비밀번호가 올바르지 않습니다.");
    return;
  }

  sessionStorage.setItem(ADMIN_SESSION_KEY, input);
  setAdminMode(true);
}

async function handleDeleteClick(event, item) {
  event.preventDefault(); // <a> 태그 안 버튼이라, 클릭해도 페이지 이동 안 되게 막음
  event.stopPropagation();

  const ok = window.confirm(`"${item.title}"\n이 레퍼런스를 삭제할까요? 되돌릴 수 없습니다.`);
  if (!ok) return;

  const password = sessionStorage.getItem(ADMIN_SESSION_KEY);
  const { error } = await getClient().rpc("delete_reference", {
    target_id: item.id,
    input_password: password
  });

  if (error) {
    window.alert("삭제 실패: 비밀번호가 만료됐거나 올바르지 않습니다. 관리자 모드를 다시 켜주세요.");
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setAdminMode(false);
    return;
  }

  event.currentTarget.closest(".board-item").remove();
}

/**
 * source_url(유튜브/비메오 시청 페이지 링크)을 팝업에 바로 넣을 수 있는
 * embed용 iframe 주소로 변환합니다. 알 수 없는 형식이면 null을 반환합니다.
 */
function toEmbedUrl(sourceUrl) {
  let url;
  try {
    url = new URL(sourceUrl);
  } catch {
    return null;
  }

  if (url.hostname.includes("youtu.be")) {
    const id = url.pathname.slice(1);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null;
  }
  if (url.hostname.includes("youtube.com")) {
    const id = url.searchParams.get("v") ?? url.pathname.match(/\/shorts\/([\w-]+)/)?.[1];
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null;
  }
  if (url.hostname.includes("vimeo.com")) {
    const id = url.pathname.match(/(\d+)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : null;
  }
  return null;
}

/** 입력 URL을 영상 ID 기반의 정규 주소로 변환합니다(수집 스크립트와 같은 형식). */
function canonicalUrl(raw) {
  let u;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.hostname.includes("youtu.be")) {
    const id = u.pathname.slice(1);
    return id ? { source: "youtube", url: `https://www.youtube.com/watch?v=${id}`, id } : null;
  }
  if (u.hostname.includes("youtube.com")) {
    const id = u.searchParams.get("v") || u.pathname.match(/\/(?:shorts|embed)\/([\w-]+)/)?.[1];
    return id ? { source: "youtube", url: `https://www.youtube.com/watch?v=${id}`, id } : null;
  }
  if (u.hostname.includes("vimeo.com")) {
    const id = u.pathname.match(/(\d+)/)?.[1];
    return id ? { source: "vimeo", url: `https://vimeo.com/${id}`, id } : null;
  }
  return null;
}

/** YouTube/Vimeo oEmbed로 제목·제작자·썸네일을 자동으로 가져옵니다(실패해도 무해). */
async function fetchOEmbed(source, url) {
  try {
    const api =
      source === "youtube"
        ? `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
        : `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
    const res = await fetch(api);
    if (!res.ok) return null;
    const j = await res.json();
    return { title: j.title, author: j.author_name, thumbnail: j.thumbnail_url };
  } catch {
    return null;
  }
}

function populateAddCategories() {
  const select = document.getElementById("add-category");
  if (!select) return;
  for (const g of CATEGORY_FILTERS) {
    const opt = document.createElement("option");
    opt.value = g.match[0]; // 저장은 한글 분류값으로
    opt.textContent = g.label; // 표시는 영어 라벨
    select.appendChild(opt);
  }
}

async function handleAddSubmit(event) {
  event.preventDefault();
  const status = document.getElementById("add-status");
  const c = canonicalUrl(document.getElementById("add-url").value);
  if (!c) {
    status.textContent = "YouTube / Vimeo 링크만 추가할 수 있어요";
    return;
  }

  status.textContent = "추가 중 —";
  const meta = await fetchOEmbed(c.source, c.url);
  const title = document.getElementById("add-title").value.trim() || meta?.title || "(제목 없음)";
  const author = document.getElementById("add-author").value.trim() || meta?.author || null;
  const category = document.getElementById("add-category").value || null;
  const thumbnail =
    meta?.thumbnail || (c.source === "youtube" ? `https://img.youtube.com/vi/${c.id}/hqdefault.jpg` : null);

  const { error } = await getClient().rpc("add_reference", {
    input_password: sessionStorage.getItem(ADMIN_SESSION_KEY),
    p_source_url: c.url,
    p_source: c.source,
    p_title: title,
    p_author: author,
    p_category: category,
    p_thumbnail_url: thumbnail
  });

  if (error) {
    status.textContent = /이미 등록/.test(error.message)
      ? "이미 등록된 영상이에요"
      : `추가 실패: ${error.message}`;
    return;
  }

  status.textContent = "추가됐습니다 ✓";
  event.target.reset();
  loadBoard();
}

function openVideoModal(item) {
  const embedUrl = toEmbedUrl(item.source_url);
  if (!embedUrl) {
    window.open(item.source_url, "_blank", "noopener");
    return;
  }

  const modal = document.getElementById("video-modal");
  const frame = modal.querySelector(".video-modal-frame");
  frame.innerHTML = "";

  const iframe = document.createElement("iframe");
  iframe.src = embedUrl;
  iframe.title = item.title;
  iframe.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
  iframe.allowFullscreen = true;
  frame.appendChild(iframe);

  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeVideoModal() {
  const modal = document.getElementById("video-modal");
  if (modal.hidden) return;
  modal.hidden = true;
  modal.querySelector(".video-modal-frame").innerHTML = ""; // 재생 중지
  document.body.classList.remove("modal-open");
}

function renderCard(item) {
  const tpl = document.getElementById("card-template").content.cloneNode(true);
  const link = tpl.querySelector(".board-item");
  link.href = item.source_url;
  link.dataset.category = item.category ?? ""; // 필터링 기준
  link.addEventListener("click", (e) => {
    e.preventDefault(); // 새 탭 이동 대신 팝업으로 바로 재생 (휠클릭/우클릭으로 새 탭 열기는 그대로 가능)
    openVideoModal(item);
  });

  const deleteBtn = tpl.querySelector(".board-delete");
  deleteBtn.addEventListener("click", (e) => handleDeleteClick(e, item));

  const media = tpl.querySelector(".board-media");
  if (item.thumbnail_url) {
    const img = document.createElement("img");
    img.src = item.thumbnail_url;
    img.alt = item.title;
    img.loading = "lazy";
    media.appendChild(img);
  } else {
    media.remove();
  }

  // 1. 제목 (한 줄, 넘치면 CSS에서 자동 줄임표 처리)
  const titleEl = tpl.querySelector(".board-title");
  titleEl.textContent = item.title;
  titleEl.title = item.title; // 마우스 오버 시 전체 제목 툴팁

  // 2. 제작 스튜디오/기업 (못 찾으면 공백으로 둠)
  const authorEl = tpl.querySelector(".board-author");
  authorEl.textContent = item.author || "\u00A0"; // 빈 줄이라도 높이는 유지

  // 3. 분류 기준 + 키워드
  const categoryEl = tpl.querySelector(".board-category");
  if (item.category) categoryEl.textContent = item.category; else categoryEl.remove();

  const keywordsEl = tpl.querySelector(".board-keywords");
  if (item.keywords && item.keywords.length) {
    item.keywords.slice(0, 4).forEach((kw) => {
      const span = document.createElement("span");
      span.className = "keyword-tag";
      span.textContent = kw;
      keywordsEl.appendChild(span);
    });
  } else {
    keywordsEl.remove();
  }

  // 짧은 코멘트
  const descEl = tpl.querySelector(".board-desc");
  if (item.description) descEl.textContent = item.description; else descEl.remove();

  return tpl;
}

/** 선택된 분류(match 배열)에 맞는 카드만 보이고 나머지는 숨깁니다. match가 null이면 전체 표시. */
function applyFilter(match) {
  document.querySelectorAll("#board .board-item").forEach((el) => {
    const show = !match || match.includes(el.dataset.category);
    el.style.display = show ? "" : "none";
  });
}

/** 실제 데이터에 존재하는 분류만 골라 ALL + 분류별 태그 버튼을 만듭니다. */
function buildFilterBar(data) {
  const bar = document.getElementById("filter-bar");
  if (!bar) return;

  const present = new Set(data.map((d) => d.category).filter(Boolean));
  const groups = CATEGORY_FILTERS.filter((g) => g.match.some((m) => present.has(m)));

  bar.innerHTML = "";
  const buttons = [];

  const makeTag = (label, match) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter-tag";
    btn.textContent = label;
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.toggle("is-active", b === btn));
      applyFilter(match);
    });
    buttons.push(btn);
    bar.appendChild(btn);
    return btn;
  };

  makeTag("All", null).classList.add("is-active");
  groups.forEach((g) => makeTag(g.label, g.match));
}

async function loadBoard() {
  const board = document.getElementById("board");

  if (!window.SUPABASE_CONFIG || window.SUPABASE_CONFIG.url.includes("YOUR_PROJECT")) {
    board.innerHTML = '<p class="loading-msg">config.js에 Supabase URL/anon key를 먼저 설정해주세요.</p>';
    return;
  }

  const { data, error } = await getClient()
    .from("references")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    board.innerHTML = `<p class="loading-msg">불러오기 실패: ${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    board.innerHTML = '<p class="loading-msg">아직 큐레이션된 레퍼런스가 없습니다 —</p>';
    return;
  }

  board.innerHTML = "";
  data.forEach((item) => board.appendChild(renderCard(item)));
  buildFilterBar(data);
}

document.getElementById("admin-toggle").addEventListener("click", handleAdminToggleClick);
document.getElementById("video-modal-close").addEventListener("click", closeVideoModal);
document.querySelector(".video-modal-backdrop").addEventListener("click", closeVideoModal);
document.getElementById("admin-add").addEventListener("submit", handleAddSubmit);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeVideoModal();
});

populateAddCategories();
setAdminMode(isAdminMode());
loadBoard();
