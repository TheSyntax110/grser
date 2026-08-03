"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Save, FileCode2, Loader as Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CodeEditorProps {
  sessionId: string;
  /** List of open file paths */
  openFiles: string[];
  /** Currently active file path */
  activeFile: string | null;
  /** Called when user clicks a tab's close button */
  onCloseTab: (path: string) => void;
  /** Called when user switches tab */
  onSwitchTab: (path: string) => void;
  /** Called when a file is saved */
  onSaved?: () => void;
}

interface FileState {
  content: string;
  original: string;
  dirty: boolean;
  loading: boolean;
  error: string | null;
}

const EXT_LANG: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".jsx": "javascript",
  ".json": "json", ".css": "css", ".scss": "scss", ".html": "html", ".py": "python",
  ".sh": "shell", ".sql": "sql", ".yml": "yaml", ".yaml": "yaml", ".md": "markdown", ".xml": "xml"
};

function getLang(path: string): string {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  return EXT_LANG[ext] || "plaintext";
}

export default function CodeEditor({
  sessionId,
  openFiles,
  activeFile,
  onCloseTab,
  onSwitchTab,
  onSaved
}: CodeEditorProps) {
  const [files, setFiles] = useState<Record<string, FileState>>({});
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<any>(null);

  // Load a file when it becomes active and isn't loaded yet
  const loadFile = useCallback(async (path: string) => {
    setFiles((prev) => {
      if (prev[path] && !prev[path].error) return prev;
      return { ...prev, [path]: { content: "", original: "", dirty: false, loading: true, error: null } };
    });

    try {
      const res = await fetch(`/api/file?sessionId=${sessionId}&path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.binary) {
        setFiles((prev) => ({
          ...prev,
          [path]: { content: "", original: "", dirty: false, loading: false, error: "Bu dosya ikili formatta, editörde düzenlenemez." }
        }));
      } else {
        setFiles((prev) => ({
          ...prev,
          [path]: { content: data.content || "", original: data.content || "", dirty: false, loading: false, error: null }
        }));
      }
    } catch (err: any) {
      setFiles((prev) => ({
        ...prev,
        [path]: { content: "", original: "", dirty: false, loading: false, error: err?.message || "Dosya yüklenemedi." }
      }));
    }
  }, [sessionId]);

  useEffect(() => {
    if (activeFile && !files[activeFile]) {
      loadFile(activeFile);
    }
  }, [activeFile, files, loadFile]);

  // Ctrl+S / Cmd+S to save
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (activeFile) handleSave(activeFile);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeFile, files]);

  async function handleSave(path: string) {
    const state = files[path];
    if (!state || !state.dirty) return;
    setSaving(true);
    try {
      const res = await fetch("/api/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, path, content: state.content })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFiles((prev) => ({
        ...prev,
        [path]: { ...prev[path], original: state.content, dirty: false }
      }));
      onSaved?.();
    } catch (err: any) {
      setFiles((prev) => ({
        ...prev,
        [path]: { ...prev[path], error: err?.message || "Kaydetme başarısız." }
      }));
    } finally {
      setSaving(false);
    }
  }

  function handleChange(path: string, value: string | undefined) {
    const v = value || "";
    setFiles((prev) => {
      const cur = prev[path];
      if (!cur) return prev;
      return {
        ...prev,
        [path]: { ...cur, content: v, dirty: v !== cur.original }
      };
    });
  }

  const current = activeFile ? files[activeFile] : null;
  const hasFiles = openFiles.length > 0;

  return (
    <AnimatePresence>
      {hasFiles && (
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.2 }}
          className="glass absolute inset-0 z-30 flex flex-col"
        >
          {/* Tab bar */}
          <div className="flex items-center border-b border-line bg-panel-soft/50">
            <div className="flex flex-1 overflow-x-auto">
              {openFiles.map((path) => {
                const st = files[path];
                const isActive = path === activeFile;
                const name = path.split("/").pop() || path;
                return (
                  <div
                    key={path}
                    className={`group flex cursor-pointer items-center gap-1.5 border-r border-line px-3 py-2 font-mono text-[11px] transition-colors ${
                      isActive
                        ? "bg-panel text-chalk"
                        : "text-mist hover:bg-panel-soft hover:text-chalk/80"
                    }`}
                    onClick={() => onSwitchTab(path)}
                  >
                    <FileCode2 size={12} className={isActive ? "text-plasma-soft" : "text-signal/50"} />
                    <span className="max-w-[120px] truncate">{name}</span>
                    {st?.dirty && <span className="h-1.5 w-1.5 rounded-full bg-signal" />}
                    <button
                      onClick={(e) => { e.stopPropagation(); onCloseTab(path); }}
                      className="rounded p-0.5 text-mist opacity-0 transition-opacity hover:bg-line hover:text-signal group-hover:opacity-100"
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
            {activeFile && (
              <button
                onClick={() => handleSave(activeFile)}
                disabled={!current?.dirty || saving}
                className="btn-plasma mr-2 text-xs disabled:opacity-40"
                title="Kaydet (Ctrl+S)"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Kaydet
              </button>
            )}
          </div>

          {/* Editor body */}
          {current?.error ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-signal">
              {current.error}
            </div>
          ) : current?.loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 size={20} className="animate-spin text-mist" />
            </div>
          ) : activeFile ? (
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                language={getLang(activeFile)}
                value={current?.content || ""}
                theme="vs-dark"
                onChange={(val) => handleChange(activeFile, val)}
                onMount={(editor) => { editorRef.current = editor; }}
                options={{
                  fontSize: 13,
                  fontFamily: "var(--font-mono), monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  tabSize: 2,
                  automaticLayout: true,
                  padding: { top: 12 }
                }}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-mist">
              Soldaki dosya ağacından bir dosyaya tıkla
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
