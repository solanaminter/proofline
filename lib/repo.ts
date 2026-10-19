/**
 * Repo acquisition: parse a GitHub URL and download the public zipball
 * via codeload (no auth). Throws RepoError with a machine-readable kind.
 */
import { RepoError, RepoRef } from "./types";

const ZIP_TIMEOUT_MS = 25000;
const MAX_DOWNLOAD_BYTES = 8 * 1024 * 1024;

export function parseRepoUrl(input: string): { owner: string; repo: string } {
  const s = input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\.git\/?$/i, "")
    .replace(/\/+$/, "");
  const m =
    s.match(/^(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/) ??
    s.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!m) {
    throw new RepoError(
      "invalid-url",
      `cannot parse a GitHub repo from "${input}" — expected https://github.com/owner/repo or owner/repo`
    );
  }
  return { owner: m[1], repo: m[2] };
}

export async function downloadRepoZip(
  repoUrl: string
): Promise<{ repo: RepoRef; zip: Buffer }> {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const url = `https://codeload.github.com/${owner}/${repo}/zip/HEAD`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ZIP_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
  } catch (e) {
    clearTimeout(timer);
    if ((e as Error).name === "AbortError") {
      throw new RepoError(
        "timeout",
        `fetch of ${owner}/${repo} timed out after ${ZIP_TIMEOUT_MS / 1000}s`
      );
    }
    throw new RepoError(
      "not-found",
      `failed to fetch ${owner}/${repo}: ${(e as Error).message}`
    );
  }
  clearTimeout(timer);

  if (res.status === 404) {
    throw new RepoError("not-found", `repo ${owner}/${repo} not found`);
  }
  if (!res.ok) {
    throw new RepoError(
      "not-found",
      `fetch failed for ${owner}/${repo}: HTTP ${res.status}`
    );
  }

  // Stream with a hard cap so a huge repo can't blow up memory.
  const chunks: Buffer[] = [];
  let total = 0;
  const reader = res.body!.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_DOWNLOAD_BYTES) {
      throw new RepoError(
        "too-large",
        `zipball for ${owner}/${repo} exceeds the download cap`
      );
    }
    chunks.push(Buffer.from(value));
  }

  return {
    repo: { owner, name: repo, ref: "HEAD" },
    zip: Buffer.concat(chunks),
  };
}
