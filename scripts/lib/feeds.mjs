// 업계 큐레이션 매체의 RSS 피드에서 소개된 영상을 수집합니다.
// 이 매체들은 에디터가 선별한 작업물만 싣기 때문에 신뢰 소스로 취급합니다
// (AI 퀄리티 게이트를 건너뜁니다).
//
// RSS 본문(<content:encoded> 등)에 박혀 있는 Vimeo/YouTube 임베드 링크를
// 정규식으로 추출합니다. 별도 라이브러리 없이 동작하도록 최소한으로 파싱합니다.

const FEEDS = [
  { name: "Motionographer", category: "큐레이션 (Motionographer)", url: "https://motionographer.com/feed/" },
  // The FWA는 피드 경로가 유동적이라 여러 후보를 시도합니다 (실패해도 조용히 건너뜀).
  { name: "The FWA", category: "큐레이션 (The FWA)", url: "https://thefwa.com/feed" }
];

function decodeEntities(str) {
  return (str || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");
}

function stripCdata(str) {
  return (str || "").replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function firstMatch(text, regex) {
  const m = regex.exec(text);
  return m ? m[1] : null;
}

/** RSS 텍스트를 <item> 단위로 쪼개 각 항목의 제목·링크·본문을 뽑습니다. */
function parseItems(xml) {
  const items = [];
  const blocks = xml.split(/<item\b/i).slice(1);
  for (const raw of blocks) {
    const block = raw.split(/<\/item>/i)[0];
    const title = decodeEntities(stripCdata(firstMatch(block, /<title>([\s\S]*?)<\/title>/i) || ""));
    const content =
      firstMatch(block, /<content:encoded>([\s\S]*?)<\/content:encoded>/i) ||
      firstMatch(block, /<description>([\s\S]*?)<\/description>/i) ||
      "";
    items.push({ title, content: stripCdata(content) });
  }
  return items;
}

/** 본문 HTML에서 Vimeo/YouTube 영상 URL을 추출합니다 (임베드 iframe 포함). */
function extractVideoUrl(html) {
  const decoded = decodeEntities(html);

  const vimeo = /(?:player\.)?vimeo\.com\/(?:video\/)?(\d{6,})/i.exec(decoded);
  if (vimeo) return { source: "vimeo", url: `https://vimeo.com/${vimeo[1]}` };

  const yt =
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/i.exec(decoded);
  if (yt) return { source: "youtube", url: `https://www.youtube.com/watch?v=${yt[1]}` };

  return null;
}

async function fetchFeed(feed) {
  let res;
  try {
    res = await fetch(feed.url, { headers: { "User-Agent": "CARTA-curation-bot" } });
  } catch (err) {
    console.warn(`[rss] ${feed.name} 요청 실패:`, err.message);
    return [];
  }
  if (!res.ok) {
    console.warn(`[rss] ${feed.name} 응답 오류 (${res.status})`);
    return [];
  }

  const xml = await res.text();
  const results = [];

  for (const item of parseItems(xml)) {
    const video = extractVideoUrl(item.content);
    if (!video) continue; // 영상 링크가 없는 글(뉴스/인터뷰 등)은 건너뜀

    results.push({
      source: video.source,
      sourceUrl: video.url,
      title: item.title || "(제목 없음)",
      author: null, // RSS에서 스튜디오명을 일관되게 뽑기 어려워 비워두고, AI가 필요시 채움
      category: feed.category,
      trustedQuality: true, // 에디터 큐레이션 매체이므로 게이트 통과
      thumbnailUrl: null, // 썸네일은 이후 GIF 생성 단계에서 채워짐
      publishedAt: new Date().toISOString(),
      viewCount: 0,
      description: ""
    });
  }
  return results;
}

/**
 * 등록된 큐레이션 매체 RSS 피드에서 소개된 영상들을 수집합니다.
 * @returns {Promise<Array<object>>}
 */
export async function fetchCurationFeedCandidates() {
  const results = await Promise.all(
    FEEDS.map((feed) =>
      fetchFeed(feed).catch((err) => {
        console.warn(`[rss] ${feed.name} 처리 실패:`, err.message);
        return [];
      })
    )
  );
  return results.flat();
}
