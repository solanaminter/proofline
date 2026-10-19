/**
 * Unzip a repo zipball and parse each source file with ts-morph
 * (in-memory, no type checking). Keeps TS/JS sources plus config
 * files; classifies test/config/script/file; resolves relative
 * imports to repo-relative paths.
 */
import JSZip from "jszip";
import { Project } from "ts-morph";
import { NodeKind, RepoError, RepoRef } from "./types";

export interface ParsedFile {
  path: string;
  kind: NodeKind;
  /** Resolved repo-relative paths (relative imports only, best effort). */
  imports: string[];
  /** Exported symbol names. */
  exports: string[];
  /** Declared class/function names. */
  symbols: string[];
  /** Content truncated to 4000 chars for lexical scoring. */
  content: string;
  size: number;
}

export interface ParsedRepo {
  repo: RepoRef;
  files: ParsedFile[];
  /** package.json scripts ({} when absent). */
  scripts: Record<string, string>;
  limits: string[];
}

const MAX_FILES = 200;
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const CONTENT_TRUNCATE = 4000;

const EXCLUDED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "vendor",
  "coverage",
]);
const SOURCE_EXT = /\.(ts|tsx|js|jsx)$/;

function isConfigFile(basename: string): boolean {
  return (
    basename === "package.json" ||
    /^tsconfig.*\.json$/.test(basename) ||
    /\.config\.(ts|tsx|js|jsx|mjs|cjs|json)$/.test(basename)
  );
}

function classifyFile(path: string, basename: string): NodeKind {
  if (
    /(^|\/)(__tests__|tests?|spec)(\/|$)/.test(path) ||
    /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(basename)
  ) {
    return "test";
  }
  if (isConfigFile(basename)) return "config";
  if (/^(scripts|bin)\//.test(path)) return "script";
  return "file";
}

function keepFile(basename: string): boolean {
  if (isConfigFile(basename)) return true;
  return (
    SOURCE_EXT.test(basename) &&
    !/\.d\.ts$/.test(basename) &&
    !/\.min\.js$/.test(basename)
  );
}

function normalizePath(p: string): string {
  const out: string[] = [];
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }
  return out.join("/");
}

function resolveImport(
  fromPath: string,
  spec: string,
  fileSet: Set<string>
): string | null {
  if (!spec.startsWith(".")) return null;
  const dir = fromPath.split("/").slice(0, -1).join("/");
  const base = normalizePath(dir + "/" + spec);
  const candidates = [
    base,
    base + ".ts",
    base + ".tsx",
    base + ".js",
    base + ".jsx",
    base + "/index.ts",
    base + "/index.tsx",
    base + "/index.js",
    base + "/index.jsx",
  ];
  for (const c of candidates) {
    if (fileSet.has(c)) return c;
  }
  return null;
}

interface ModuleInfo {
  specs: string[];
  exports: string[];
  symbols: string[];
}

function extractModuleInfo(
  project: Project,
  path: string,
  content: string
): ModuleInfo {
  try {
    const sf = project.createSourceFile(path, content, { overwrite: true });
    const specs = sf
      .getImportDeclarations()
      .map((d) => d.getModuleSpecifierValue());
    const exports = new Set<string>();
    sf.getExportedDeclarations().forEach((_decls, name) => {
      if (name !== "default") exports.add(name);
    });
    const symbols = new Set<string>();
    for (const c of sf.getClasses()) {
      const n = c.getName();
      if (n) symbols.add(n);
    }
    for (const f of sf.getFunctions()) {
      const n = f.getName();
      if (n) symbols.add(n);
    }
    project.removeSourceFile(sf);
    return { specs, exports: [...exports], symbols: [...symbols] };
  } catch {
    // A broken file must not kill the whole analysis.
    return { specs: [], exports: [], symbols: [] };
  }
}

export async function parseZip(
  zipBuffer: Buffer,
  repo: RepoRef
): Promise<ParsedRepo> {
  const zip = await JSZip.loadAsync(zipBuffer);
  const rawNames = Object.keys(zip.files)
    .filter((n) => !zip.files[n].dir)
    .sort();
  // Pair each raw entry with its prefix-stripped path.
  const entries: { raw: string; path: string }[] = [];
  const first = rawNames.length > 0 ? rawNames[0].split("/")[0] : "";
  // Only strip when the common top-level dir looks like a GitHub zipball
  // prefix ("owner-repo-HEAD"); a repo whose files all live under "src/"
  // must keep that segment.
  const hasPrefix =
    first !== "" &&
    first.includes("-") &&
    rawNames.every((n) => n === first || n.startsWith(first + "/"));
  for (const raw of rawNames) {
    const path = hasPrefix
      ? raw === first
        ? ""
        : raw.slice(first.length + 1)
      : raw;
    if (path.length > 0) entries.push({ raw, path });
  }

  const kept: { path: string; basename: string; text: string; size: number }[] =
    [];
  for (const { raw, path } of entries) {
    const segments = path.split("/");
    const basename = segments[segments.length - 1];
    if (segments.some((s) => EXCLUDED_DIRS.has(s))) continue;
    if (!keepFile(basename)) continue;
    const text = await zip.files[raw].async("string");
    kept.push({ path, basename, text, size: Buffer.byteLength(text) });
  }

  if (kept.length > MAX_FILES) {
    throw new RepoError(
      "too-large",
      `repo has ${kept.length} source files (cap ${MAX_FILES})`
    );
  }
  const totalBytes = kept.reduce((s, f) => s + f.size, 0);
  if (totalBytes > MAX_SOURCE_BYTES) {
    throw new RepoError(
      "too-large",
      `repo source is ${(totalBytes / 1024 / 1024).toFixed(1)}MB (cap 2MB)`
    );
  }
  const sourceFiles = kept.filter(
    (f) => classifyFile(f.path, f.basename) !== "config"
  );
  if (sourceFiles.length === 0) {
    throw new RepoError(
      "unsupported",
      "no TypeScript/JavaScript source files found — only TS/JS repos are supported"
    );
  }

  const fileSet = new Set(kept.map((f) => f.path));
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { allowJs: true },
  });

  let scripts: Record<string, string> = {};
  const files: ParsedFile[] = [];
  for (const f of kept) {
    const kind = classifyFile(f.path, f.basename);
    let imports: string[] = [];
    let exports: string[] = [];
    let symbols: string[] = [];
    if (kind !== "config") {
      const info = extractModuleInfo(project, f.path, f.text);
      imports = info.specs
        .map((s) => resolveImport(f.path, s, fileSet))
        .filter((s): s is string => s !== null);
      exports = info.exports;
      symbols = info.symbols;
    }
    if (f.basename === "package.json") {
      try {
        const pkg = JSON.parse(f.text);
        if (pkg && typeof pkg.scripts === "object" && pkg.scripts !== null) {
          scripts = pkg.scripts as Record<string, string>;
        }
      } catch {
        scripts = {};
      }
    }
    files.push({
      path: f.path,
      kind,
      imports,
      exports,
      symbols,
      content: f.text.slice(0, CONTENT_TRUNCATE),
      size: f.size,
    });
  }

  return {
    repo,
    files,
    scripts,
    limits: [
      `cap: ${MAX_FILES} source files, 2MB total source bytes`,
      `parsed ${kept.length} files (${(totalBytes / 1024).toFixed(1)}KB)`,
      `content truncated to ${CONTENT_TRUNCATE} chars per file for lexical scoring`,
    ],
  };
}
