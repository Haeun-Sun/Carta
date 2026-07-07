const ADMIN_SESSION_KEY = "carta_admin_password";

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
  const label = active ? "관리자 모드 끄기" : "관리자";
  btn.title = label;
  btn.setAttribute("aria-label", label);
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
}

document.getElementById("admin-toggle").addEventListener("click", handleAdminToggleClick);
document.getElementById("video-modal-close").addEventListener("click", closeVideoModal);
document.querySelector(".video-modal-backdrop").addEventListener("click", closeVideoModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeVideoModal();
});

setAdminMode(isAdminMode());
loadBoard();
