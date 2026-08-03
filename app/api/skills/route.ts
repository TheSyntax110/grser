import { NextRequest, NextResponse } from "next/server";
import { writeBinaryFile, writeFile, buildTree } from "@/lib/virtualDisk";

export const runtime = "nodejs";

const MAX_SKILL_BYTES = 200_000;

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Geçersiz form verisi." }, { status: 400 });
  }

  const sessionId = form.get("sessionId");
  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json({ error: "sessionId zorunludur." }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Hiç dosya gönderilmedi." }, { status: 400 });
  }

  const written: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length > MAX_SKILL_BYTES) {
      skipped.push(`${file.name} (çok büyük)`);
      continue;
    }

    const name = file.name.replace(/\\/g, "/").split("/").filter((p) => p && p !== "..").join("/");
    if (!name || !name.toLowerCase().endsWith(".md")) {
      skipped.push(`${file.name} (yalnızca .md)`);
      continue;
    }

    const target = `_skills/${name}`;
    writeFile(sessionId, target, buffer.toString("utf-8"));
    written.push(target);
  }

  return NextResponse.json({
    written,
    skipped,
    tree: buildTree(sessionId)
  });
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId zorunludur." }, { status: 400 });
  }

  try {
    const { listFiles } = await import("@/lib/virtualDisk");
    const skills = listFiles(sessionId)
      .filter((f) => f.path.startsWith("_skills/") && f.path.toLowerCase().endsWith(".md"))
      .map((f) => f.path);
    return NextResponse.json({ skills });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Skill'ler okunamadı." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.sessionId) {
    return NextResponse.json({ error: "sessionId zorunludur." }, { status: 400 });
  }

  try {
    const { listFiles, resetDisk } = await import("@/lib/virtualDisk");
    if (body.skillPath) {
      // Delete a single skill file
      const { unlinkFile } = await import("@/lib/virtualDisk");
      unlinkFile(body.sessionId, body.skillPath);
    } else {
      // Delete all skills
      const skills = listFiles(body.sessionId).filter((f) => f.path.startsWith("_skills/"));
      const { unlinkFile } = await import("@/lib/virtualDisk");
      for (const s of skills) {
        unlinkFile(body.sessionId, s.path);
      }
    }
    const { buildTree } = await import("@/lib/virtualDisk");
    return NextResponse.json({ ok: true, tree: buildTree(body.sessionId) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Skill silinemedi." }, { status: 500 });
  }
}
