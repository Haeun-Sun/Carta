import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, unlinkSync, existsSync } from "node:fs";
import { getServiceClient } from "./supabase.mjs";

const BUCKET = "thumbnails";
let bucketReady = false;

async function ensureBucket(supabase) {
  if (bucketReady) return;
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {});
  bucketReady = true;
}

/**
 * 영상 URL에서 앞부분 3초를 뽑아 480px 폭의 GIF로 변환하고
 * Supabase Storage에 업로드한 뒤 공개 URL을 반환합니다.
 * yt-dlp / ffmpeg 실행에 실패하면 null을 반환합니다 (호출부에서 원본 썸네일로 대체).
 *
 * @param {string} sourceUrl
 * @returns {Promise<string|null>}
 */
export async function makeGifThumbnail(sourceUrl) {
  const id = randomUUID();
  const clipPath = `/tmp/${id}.mp4`;
  const gifPath = `/tmp/${id}.gif`;

  try {
    execFileSync("yt-dlp", [
      "--download-sections", "*0-3",
      "-f", "bv*[height<=480]+ba/b[height<=480]/best[height<=480]",
      "--force-keyframes-at-cuts",
      "-o", clipPath,
      sourceUrl
    ], { stdio: "ignore", timeout: 60_000 });

    if (!existsSync(clipPath)) throw new Error("clip download failed");

    execFileSync("ffmpeg", [
      "-y", "-i", clipPath,
      "-vf", "fps=10,scale=480:-1:flags=lanczos",
      "-loop", "0",
      gifPath
    ], { stdio: "ignore", timeout: 60_000 });

    if (!existsSync(gifPath)) throw new Error("gif conversion failed");

    const buffer = readFileSync(gifPath);
    const supabase = getServiceClient();
    await ensureBucket(supabase);

    const filePath = `${id}.gif`;
    const { error } = await supabase.storage.from(BUCKET).upload(filePath, buffer, {
      contentType: "image/gif",
      upsert: true
    });
    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err) {
    console.error(`[gif] ${sourceUrl} 썸네일 생성 실패 → 원본 썸네일 사용:`, err.message);
    return null;
  } finally {
    for (const p of [clipPath, gifPath]) {
      try { unlinkSync(p); } catch {}
    }
  }
}
