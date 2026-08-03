"use client";

import { useState, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  FileCode2,
  RotateCcw,
  Eye,
  Pencil,
  Play,
  FileText,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { DiskTreeNode } from "@/lib/types";

interface DiskExplorerProps {
  tree: DiskTreeNode[];
  onReset: () => void;
  onOpenFile?: (path: string, mode: "edit" | "preview" | "live") => void;
  activePath?: string | null;
}

const BINARY_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf", ".docx", ".zip"]);
const HTML_EXT = new Set([".html", ".htm"]);

function isBinary(name: string): boolean {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return BINARY_EXT.has(ext);
}

function isHtml(name: string): boolean {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return HTML_EXT.has(ext);
}

function Node({
  node,
  depth = 0,
  onOpenFile,
  activePath,
  expandedSet,
  toggleFolder
}: {
  node: DiskTreeNode;
  depth?: number;
  onOpenFile?: (path: string, mode: "edit" | "preview" | "live") => void;
  activePath?: string | null;
  expandedSet: Set<string>;
  toggleFolder: (path: string) => void;
}) {
  const isActive = activePath === node.path;

  if (node.type === "folder") {
    const isOpen = expandedSet.has(node.path);
    return (
      <div>
        <button
          onClick={() => toggleFolder(node.path)}
          className="flex w-full items-center gap-1 py-1 font-mono text-[11px] text-mist transition-colors hover:text-chalk"
          style={{ paddingLeft: depth * 12 }}
        >
          {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          {isOpen ? <FolderOpen size={12} className="text-plasma-soft" /> : <Folder size={12} className="text-plasma-soft" />}
          {node.name}
        </button>
        {isOpen && node.children?.map((child) => (
          <Node
            key={child.path}
            node={child}
            depth={depth + 1}
            onOpenFile={onOpenFile}
            activePath={activePath}
            expandedSet={expandedSet}
            toggleFolder={toggleFolder}
          />
        ))}
      </div>
    );
  }

  const binary = isBinary(node.name);
  const html = isHtml(node.name);

  return (
    <div
      className={`group flex items-center gap-1.5 rounded py-1 font-mono text-[11px] transition-colors ${
        isActive ? "bg-plasma/10 text-chalk" : "text-chalk/70 hover:bg-panel-soft"
      }`}
      style={{ paddingLeft: depth * 12 + 16 }}
    >
      <FileCode2 size={12} className={isActive ? "text-plasma-soft" : "text-signal/60"} />
      <button
        onClick={() => onOpenFile?.(node.path, binary ? "preview" : "edit")}
        className="flex-1 truncate text-left"
        title={node.path}
      >
        {node.name}
      </button>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {html && (
          <button
            onClick={() => onOpenFile?.(node.path, "live")}
            title="Canlı önizleme"
            className="rounded p-0.5 text-mist hover:bg-line hover:text-signal"
          >
            <Play size={10} />
          </button>
        )}
        <button
          onClick={() => onOpenFile?.(node.path, binary ? "preview" : "edit")}
          title={binary ? "Önizle" : "Düzenle"}
          className="rounded p-0.5 text-mist hover:bg-line hover:text-chalk"
        >
          {binary ? <Eye size={10} /> : <Pencil size={10} />}
        </button>
        <button
          onClick={() => onOpenFile?.(node.path, "preview")}
          title="Önizle"
          className="rounded p-0.5 text-mist hover:bg-line hover:text-chalk"
        >
          {binary ? <FileText size={10} /> : <Eye size={10} />}
        </button>
      </div>
    </div>
  );
}

export default function DiskExplorer({ tree, onReset, onOpenFile, activePath }: DiskExplorerProps) {
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());

  // Auto-expand top-level folders on first load
  useEffect(() => {
    if (tree.length > 0 && expandedSet.size === 0) {
      const topFolders = tree.filter((n) => n.type === "folder").map((n) => n.path);
      if (topFolders.length > 0) setExpandedSet(new Set(topFolders));
    }
  }, [tree]);

  function toggleFolder(path: string) {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <div className="glass flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wide text-mist">Sanal Disk</span>
        <button
          onClick={onReset}
          title="Diski sıfırla"
          className="text-mist transition-colors hover:text-signal"
        >
          <RotateCcw size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tree.length === 0 ? (
          <p className="text-[11px] leading-relaxed text-mist/70">
            Henüz dosya yok. Agent bir şey ürettiğinde burada belirecek.
          </p>
        ) : (
          tree.map((node) => (
            <Node
              key={node.path}
              node={node}
              onOpenFile={onOpenFile}
              activePath={activePath}
              expandedSet={expandedSet}
              toggleFolder={toggleFolder}
            />
          ))
        )}
      </div>
    </div>
  );
}
