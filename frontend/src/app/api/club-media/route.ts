import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { ClubMediaCatalog, ClubMediaItem, clubSlugFromCode } from "@/lib/media";

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|avif)$/i;

async function safeListFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && IMAGE_EXT_RE.test(e.name))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const publicImagesRoot = path.join(process.cwd(), "public", "images");
  const clubsDir = path.join(publicImagesRoot, "clubs");
  const introDir = path.join(publicImagesRoot, "intro");

  const clubs: Record<string, ClubMediaItem> = {};
  try {
    const folders = await readdir(clubsDir, { withFileTypes: true });
    for (const entry of folders) {
      if (!entry.isDirectory()) continue;
      const slug = clubSlugFromCode(entry.name);
      if (!slug) continue;
      const files = await safeListFiles(path.join(clubsDir, entry.name));
      const logoFile = files.find((f) => /^logo\./i.test(f)) ?? null;
      const coverFile = files.find((f) => /^cover\./i.test(f)) ?? null;
      const galleryFiles = files.filter((f) => /^gallery-/i.test(f));
      const base = `/images/clubs/${entry.name}`;
      clubs[slug] = {
        slug,
        logo: logoFile ? `${base}/${logoFile}` : null,
        cover: coverFile ? `${base}/${coverFile}` : galleryFiles[0] ? `${base}/${galleryFiles[0]}` : null,
        gallery: galleryFiles.map((f) => `${base}/${f}`),
      };
    }
  } catch {
    // Directory may not exist in minimal test environments
  }

  const introFiles = await safeListFiles(introDir);
  const intro = introFiles.map((f) => `/images/intro/${f}`);

  const codeParam = request.nextUrl.searchParams.get("code");
  if (codeParam) {
    const slug = clubSlugFromCode(codeParam);
    return NextResponse.json({
      item: clubs[slug] ?? { slug, logo: null, cover: null, gallery: [] },
    });
  }

  const payload: ClubMediaCatalog = { clubs, intro };
  return NextResponse.json(payload);
}
