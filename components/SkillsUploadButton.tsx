"use client";

import { useRef, useState, useEffect } from "react";
import { BookOpen, Loader as Loader2, X } from "lucide-react";
import { useAetherStore } from "@/lib/store";

interface UploadedSkill {
  path: string;
  name: string;
}

export default function SkillsUploadButton({
  onSkillsChanged
}: {
  onSkillsChanged?: () => void;
}) {
  const { sessionId } = useAetherStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [skills, setSkills] = useState<UploadedSkill[]>([]);
  const [showList, setShowList] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function loadSkills() {
    try {
      const res = await fetch(`/api/skills?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSkills(
          (data.skills || []).map((p: string) => ({
            path: p,
            name: p.replace("_skills/", "")
          }))
        );
      }
    } catch {
      // sessizce geç
    }
  }

  useEffect(() => {
    loadSkills();
  }, [sessionId]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);

    const form = new FormData();
    form.set("sessionId", sessionId);
    Array.from(fileList).forEach((f) => form.append("files", f));

    try {
      const res = await fetch("/api/skills", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        const parts: string[] = [];
        if (data.written?.length > 0) parts.push(`${data.written.length} skill yüklendi`);
        if (data.skipped?.length > 0) parts.push(`${data.skipped.length} dosya atlandı`);
        setNote(parts.length > 0 ? parts.join(" · ") : "Yükleme tamamlandı");
        loadSkills();
        onSkillsChanged?.();
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(skillPath: string) {
    await fetch("/api/skills", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, skillPath })
    });
    loadSkills();
    onSkillsChanged?.();
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".md,.markdown"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        title="Skill (.md) yükle — agent otomatik uygular"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-mist transition-colors hover:border-plasma/50 hover:text-chalk disabled:opacity-40"
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
        Skill
        {skills.length > 0 && (
          <span className="rounded-full bg-plasma/20 px-1.5 font-mono text-[10px] text-plasma-soft">
            {skills.length}
          </span>
        )}
      </button>

      {skills.length > 0 && (
        <button
          onClick={() => setShowList((v) => !v)}
          className="ml-1 rounded-full p-1 text-mist hover:text-chalk"
          title="Yüklenen skill'leri göster"
        >
          <BookOpen size={12} />
        </button>
      )}

      {showList && skills.length > 0 && (
        <div className="glass absolute bottom-10 right-0 z-40 w-56 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wide text-mist">
              Yüklenen Skill'ler
            </span>
            <button onClick={() => setShowList(false)} className="text-mist hover:text-chalk">
              <X size={12} />
            </button>
          </div>
          <div className="space-y-1">
            {skills.map((s) => (
              <div
                key={s.path}
                className="group flex items-center gap-1.5 rounded border border-line bg-panel-soft px-2 py-1"
              >
                <BookOpen size={10} className="text-plasma-soft" />
                <span className="flex-1 truncate font-mono text-[10px] text-chalk/80">
                  {s.name}
                </span>
                <button
                  onClick={() => handleDelete(s.path)}
                  className="rounded p-0.5 text-mist opacity-0 transition-opacity hover:text-signal group-hover:opacity-100"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {note && (
        <div className="absolute bottom-10 right-0 z-40 rounded-lg border border-line bg-panel px-3 py-1.5 font-mono text-[10px] text-plasma-soft">
          {note}
        </div>
      )}
    </div>
  );
}
