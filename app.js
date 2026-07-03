function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function renderCard(item) {
  const tpl = document.getElementById("card-template").content.cloneNode(true);
  const link = tpl.querySelector(".board-item");
  link.href = item.source_url;

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

  const client = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
  const { data, error } = await client
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

loadBoard();
