import { type ReactNode, useState } from "react";

/**
 * Minimal, safe Markdown renderer (no dangerouslySetInnerHTML).
 * Supports: fenced code blocks ```lang, inline `code`, **bold**, *italic*,
 * headings (#, ##, ###), unordered (-/*) and ordered (1.) lists, and paragraphs.
 * Kept tiny on purpose — enough for chat replies that include code.
 */

type Block =
  | { type: "code"; lang?: string; code: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "heading"; level: number; text: string }
  | { type: "p"; text: string };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] || undefined;
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++; // consume closing fence (if present)
      blocks.push({ type: "code", lang, code: code.join("\n") });
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      blocks.push({ type: "heading", level: h[1].length, text: h[2] });
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^```/.test(lines[i]) &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: "p", text: para.join("\n") });
  }
  return blocks;
}

function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+?\*)/g;
  const parts = text.split(regex);
  parts.forEach((part, idx) => {
    if (!part) return;
    const key = `${keyBase}-${idx}`;
    if (part.startsWith("`") && part.endsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-[0.82em] text-brand-200"
        >
          {part.slice(1, -1)}
        </code>,
      );
    } else if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>,
      );
    } else if (part.startsWith("*") && part.endsWith("*")) {
      nodes.push(
        <em key={key} className="italic">
          {part.slice(1, -1)}
        </em>,
      );
    } else {
      nodes.push(<span key={key}>{part}</span>);
    }
  });
  return nodes;
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <div className="group relative my-2 overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-700/60 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-slate-400">
          {lang || "code"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="text-[11px] font-medium text-slate-300 transition-colors hover:text-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed">
        <code className="font-mono text-slate-100">{code}</code>
      </pre>
    </div>
  );
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className={className}>
      {blocks.map((b, i) => {
        const key = `b-${i}`;
        switch (b.type) {
          case "code":
            return <CodeBlock key={key} code={b.code} lang={b.lang} />;
          case "heading": {
            const size =
              b.level === 1
                ? "text-base font-bold"
                : b.level === 2
                  ? "text-sm font-bold"
                  : "text-sm font-semibold";
            return (
              <p key={key} className={`mt-2 first:mt-0 ${size} text-slate-900`}>
                {renderInline(b.text, key)}
              </p>
            );
          }
          case "ul":
            return (
              <ul key={key} className="my-1.5 list-disc space-y-1 pl-5">
                {b.items.map((it, j) => (
                  <li key={`${key}-${j}`} className="text-sm leading-relaxed">
                    {renderInline(it, `${key}-${j}`)}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="my-1.5 list-decimal space-y-1 pl-5">
                {b.items.map((it, j) => (
                  <li key={`${key}-${j}`} className="text-sm leading-relaxed">
                    {renderInline(it, `${key}-${j}`)}
                  </li>
                ))}
              </ol>
            );
          case "p":
          default: {
            const segs = b.text.split("\n");
            return (
              <p key={key} className="text-sm leading-relaxed text-slate-700">
                {segs.map((s, j) => (
                  <span key={`${key}-${j}`}>
                    {renderInline(s, `${key}-${j}`)}
                    {j < segs.length - 1 ? <br /> : null}
                  </span>
                ))}
              </p>
            );
          }
        }
      })}
    </div>
  );
}
