import {
  SyncProvider,
  ChangeHistoryItem,
} from "../../interfaces/sync.interface";
import { IDrawing } from "../../interfaces/drawing.interface";
import { XLogger } from "../../lib/logger";
import type {
  GiteaSyncConfig,
  AnySyncConfig,
} from "../../interfaces/sync-config.interface";
import { encodeBase64, createAuthedFetch, repoFilePath } from "../git/shared";

function normalizeToGiteaConfig(
  input: GiteaSyncConfig | AnySyncConfig
): GiteaSyncConfig {
  const c = input as AnySyncConfig;
  if (c.provider === "gitea") {
    return {
      provider: "gitea",
      nickname: c.nickname,
      token: c.token,
      owner: c.owner,
      repo: c.repo,
      branch: c.branch || "main",
      baseUrl: c.baseUrl || "https://codeberg.org/api/v1",
    };
  }
  throw new Error("GiteaProvider received non-Gitea config");
}

export class GiteaProvider implements SyncProvider {
  private config: GiteaSyncConfig | null = null;
  private authedFetch: ReturnType<typeof createAuthedFetch> | null = null;

  constructor(
    initialConfig?: GiteaSyncConfig | AnySyncConfig,
    deviceName?: string
  ) {
    if (initialConfig) {
      this.setConfig(initialConfig, deviceName);
    }
  }

  public setConfig(
    config: GiteaSyncConfig | AnySyncConfig,
    deviceName?: string
  ): void {
    const gt = normalizeToGiteaConfig(config);
    this.config = gt;
    this.authedFetch = createAuthedFetch(gt.token, deviceName);
  }

  public async getConfig(): Promise<GiteaSyncConfig | null> {
    return this.config;
  }

  public async removeConfig(): Promise<void> {
    // Storage is managed by SyncConfigService; provider just clears in-memory
    this.config = null;
    this.authedFetch = null;
  }

  public async saveConfig(config: GiteaSyncConfig | AnySyncConfig) {
    const gt = normalizeToGiteaConfig(config);
    this.setConfig(gt);
  }

  private getBase(): string {
    return (this.config?.baseUrl || "https://codeberg.org/api/v1").replace(
      /\/$/,
      ""
    );
  }

  private getBranch(): string {
    return this.config?.branch || "main";
  }

  private filePath(id: string): string {
    return repoFilePath(id);
  }

  /**
   * Robustly obtain the current git blob SHA for a drawing file on a branch.
   * Implements the approaches suggested for Codeberg/Forgejo:
   *   - List repo root contents via /contents?ref=... (and without ref)
   *   - Resolve branch HEAD, then /git/trees/{sha} (and also /git/trees/{branch} directly)
   * Plus direct /contents/{path} probes with various ref forms.
   * Tries common ref variants: bare branch, refs/heads/branch.
   * Returns the sha string if found, otherwise null. Lots of logging for diagnostics.
   */
  private async getCurrentFileSha(
    drawingId: string,
    branch?: string
  ): Promise<string | null> {
    if (!this.config || !this.authedFetch) return null;
    const br = branch || this.getBranch();
    const file = this.filePath(drawingId); // encoded for the URL path segment
    const owner = this.config.owner;
    const repo = this.config.repo;
    const base = this.getBase();
    const target = `${drawingId}.json`; // raw name with ":" etc. as stored in the tree

    // Start with user-provided branch variants + common alternates.
    const refVariants: string[] = [br, `refs/heads/${br}`];
    if (br !== "main") refVariants.push("main", "refs/heads/main");
    if (br !== "master") refVariants.push("master", "refs/heads/master");

    // Also discover the repo's declared default branch and add it (very useful on Codeberg if user picked the wrong symbolic name).
    try {
      const repoMeta = await this.authedFetch(`${base}/repos/${owner}/${repo}`);
      if (repoMeta.ok) {
        const meta = await repoMeta.json();
        const def = meta && (meta.default_branch || meta.defaultBranch);
        if (def && typeof def === "string") {
          if (!refVariants.includes(def)) refVariants.push(def);
          const defRef = `refs/heads/${def}`;
          if (!refVariants.includes(defRef)) refVariants.push(defRef);
        }
      }
    } catch (e) {
      XLogger.debug(
        "getCurrentFileSha: fetching repo default_branch failed",
        e
      );
    }

    const tryDirect = async (
      url: string,
      label: string
    ): Promise<string | null> => {
      try {
        const r = await this.authedFetch(url);
        if (r.ok) {
          const j = await r.json();
          if (j && typeof j.sha === "string" && j.sha) {
            XLogger.log(
              `getCurrentFileSha: ${label} succeeded, sha=${j.sha.slice(0, 8)}`
            );
            return j.sha;
          }
          XLogger.log(`getCurrentFileSha: ${label} 200 but no sha in json`);
        } else {
          XLogger.log(`getCurrentFileSha: ${label} status=${r.status}`);
        }
      } catch (e) {
        XLogger.debug(`getCurrentFileSha: ${label} threw`, e);
      }
      return null;
    };

    // 1. Direct contents GET with various refs + no ref
    for (const rv of refVariants) {
      const sha = await tryDirect(
        `${base}/repos/${owner}/${repo}/contents/${file}?ref=${encodeURIComponent(
          rv
        )}`,
        `direct-ref:${rv}`
      );
      if (sha) return sha;
    }
    const directNoRef = await tryDirect(
      `${base}/repos/${owner}/${repo}/contents/${file}`,
      "direct-no-ref"
    );
    if (directNoRef) return directNoRef;

    // 2. List root via /contents (the "list repo root contents through the repository contents endpoint, using the repo’s default branch/ref" approach)
    for (const rv of refVariants) {
      try {
        const listUrl = `${base}/repos/${owner}/${repo}/contents?ref=${encodeURIComponent(
          rv
        )}`;
        const lr = await this.authedFetch(listUrl);
        if (lr.ok) {
          const items = await lr.json();
          const arr = Array.isArray(items) ? items : [];
          let found = arr.find(
            (it: any) => it && (it.name === target || it.path === target)
          );
          if (!found) {
            // be a bit more lenient: match by end of path
            found = arr.find(
              (it: any) =>
                it &&
                it.path &&
                (String(it.path).endsWith("/" + target) ||
                  String(it.path).endsWith(target))
            );
          }
          if (found && typeof found.sha === "string" && found.sha) {
            XLogger.log(
              `getCurrentFileSha: list-ref:${rv} found sha (count=${arr.length})`
            );
            return found.sha;
          }
          const sample = arr
            .slice(0, 5)
            .map((x: any) => x && (x.name || x.path))
            .join(",");
          XLogger.log(
            `getCurrentFileSha: list-ref:${rv} no match for ${target} (count=${arr.length}, sample=${sample})`
          );
        } else {
          XLogger.log(`getCurrentFileSha: list-ref:${rv} status=${lr.status}`);
        }
      } catch (e) {
        XLogger.debug(`getCurrentFileSha: list ref:${rv} failed`, e);
      }
    }

    // List without ref (server default branch view)
    try {
      const listUrl = `${base}/repos/${owner}/${repo}/contents`;
      const lr = await this.authedFetch(listUrl);
      if (lr.ok) {
        const items = await lr.json();
        const arr = Array.isArray(items) ? items : [];
        let found = arr.find(
          (it: any) => it && (it.name === target || it.path === target)
        );
        if (!found) {
          found = arr.find(
            (it: any) =>
              it &&
              it.path &&
              (String(it.path).endsWith("/" + target) ||
                String(it.path).endsWith(target))
          );
        }
        if (found && typeof found.sha === "string" && found.sha) {
          XLogger.log(
            `getCurrentFileSha: list-no-ref found sha (count=${arr.length})`
          );
          return found.sha;
        }
        const sample = arr
          .slice(0, 5)
          .map((x: any) => x && (x.name || x.path))
          .join(",");
        XLogger.log(
          `getCurrentFileSha: list-no-ref no match for ${target} (count=${arr.length}, sample=${sample})`
        );
      } else {
        XLogger.log(`getCurrentFileSha: list-no-ref status=${lr.status}`);
      }
    } catch (e) {
      XLogger.debug("getCurrentFileSha: list no-ref failed", e);
    }

    // 3. Resolve the branch HEAD first using the canonical Forgejo/Gitea form:
    //    GET /repos/{owner}/{repo}/git/refs/heads/{branch}
    //    This is the correct way per the Forgejo API (and matches what the user confirmed fails for bare /git/refs/main).
    //    Then call the tree endpoint with the returned commit SHA (the second approach the user quoted).
    // We only call the proper /heads/ form here. No more bare /git/refs/{name} calls.
    const branchNameForHeads = br.replace(/^refs\/heads\//, "");
    const headsRefUrl = `${base}/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(
      branchNameForHeads
    )}`;

    XLogger.log(`getCurrentFileSha: resolving branch HEAD via ${headsRefUrl}`);
    try {
      const rr = await this.authedFetch(headsRefUrl);
      if (rr.ok) {
        const refj = await rr.json();
        const headSha: string | undefined = refj?.object?.sha;
        if (headSha) {
          XLogger.log(
            `getCurrentFileSha: HEAD resolved sha=${headSha.slice(0, 8)}`
          );
          // Now call the tree at that SHA (non-recursive first is enough for root-level files)
          const treeUrl = `${base}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(
            headSha
          )}`;
          XLogger.log(`getCurrentFileSha: fetching tree ${treeUrl}`);
          const tr = await this.authedFetch(treeUrl);
          if (tr.ok) {
            const tj = await tr.json();
            const tree = Array.isArray(tj?.tree) ? tj.tree : [];
            let entry = tree.find(
              (e: any) =>
                e &&
                e.path === target &&
                (e.type === "blob" || e.type === "file" || !e.type)
            );
            if (!entry) {
              entry = tree.find(
                (e: any) =>
                  e &&
                  e.path &&
                  (String(e.path).endsWith("/" + target) ||
                    String(e.path).endsWith(target))
              );
            }
            if (entry && typeof entry.sha === "string" && entry.sha) {
              XLogger.log(
                `getCurrentFileSha: tree at HEAD sha found entry (entries=${tree.length})`
              );
              return entry.sha;
            }
            XLogger.log(
              `getCurrentFileSha: tree at HEAD sha had no match for ${target} (entries=${tree.length})`
            );
          } else {
            XLogger.log(
              `getCurrentFileSha: tree at HEAD status=${tr.status} url=${treeUrl}`
            );
          }

          // Also try recursive tree at the SHA (cheap second request only if needed)
          const recTreeUrl = `${base}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(
            headSha
          )}?recursive=true`;
          const tr2 = await this.authedFetch(recTreeUrl);
          if (tr2.ok) {
            const tj2 = await tr2.json();
            const tree2 = Array.isArray(tj2?.tree) ? tj2.tree : [];
            let entry2 = tree2.find(
              (e: any) =>
                e &&
                e.path === target &&
                (e.type === "blob" || e.type === "file" || !e.type)
            );
            if (!entry2) {
              entry2 = tree2.find(
                (e: any) =>
                  e &&
                  e.path &&
                  (String(e.path).endsWith("/" + target) ||
                    String(e.path).endsWith(target))
              );
            }
            if (entry2 && typeof entry2.sha === "string" && entry2.sha) {
              XLogger.log(
                `getCurrentFileSha: recursive tree at HEAD sha found entry`
              );
              return entry2.sha;
            }
          }
        } else {
          XLogger.log(
            `getCurrentFileSha: ${headsRefUrl} returned 200 but no object.sha`
          );
        }
      } else {
        XLogger.log(`getCurrentFileSha: ${headsRefUrl} status=${rr.status}`);
      }
    } catch (e) {
      XLogger.debug(
        `getCurrentFileSha: heads ref+tree failed for ${headsRefUrl}`,
        e
      );
    }

    // 4. Last-resort tree-ish by branch name (some instances allow /git/trees/{branch} directly).
    // We still prefer the resolve-HEAD-then-tree above.
    const treeByBranchUrls = [
      `${base}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(
        branchNameForHeads
      )}`,
      `${base}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(
        branchNameForHeads
      )}?recursive=true`,
    ];
    for (const tu of treeByBranchUrls) {
      try {
        XLogger.log(`getCurrentFileSha: trying direct tree-ish ${tu}`);
        const tr = await this.authedFetch(tu);
        if (tr.ok) {
          const tj = await tr.json();
          const tree = Array.isArray(tj?.tree) ? tj.tree : [];
          let entry = tree.find(
            (e: any) =>
              e &&
              e.path === target &&
              (e.type === "blob" || e.type === "file" || !e.type)
          );
          if (!entry) {
            entry = tree.find(
              (e: any) =>
                e &&
                e.path &&
                (String(e.path).endsWith("/" + target) ||
                  String(e.path).endsWith(target))
            );
          }
          if (entry && typeof entry.sha === "string" && entry.sha) {
            XLogger.log(
              `getCurrentFileSha: direct tree-ish found sha (url=${tu})`
            );
            return entry.sha;
          }
        } else {
          XLogger.log(
            `getCurrentFileSha: direct tree-ish status=${tr.status} url=${tu}`
          );
        }
      } catch (e) {
        XLogger.debug(`getCurrentFileSha: direct tree-ish ${tu} threw`, e);
      }
    }

    XLogger.log(
      `getCurrentFileSha: ALL strategies exhausted for ${target} on branch variants=${refVariants.join(
        "|"
      )}`
    );
    return null;
  }

  public async initialize(): Promise<void> {
    if (!this.config) {
      throw new Error("Gitea/Forgejo configuration not set");
    }
    await this.isAuthenticated();
  }

  public async isAuthenticated(): Promise<boolean> {
    XLogger.debug("Gitea provider is authenticated");
    if (!this.config || !this.authedFetch) return false;

    try {
      const res = await this.authedFetch(
        `${this.getBase()}/repos/${this.config.owner}/${this.config.repo}`
      );
      return res.ok;
    } catch (error) {
      XLogger.error("Failed to authenticate with Gitea/Forgejo", error);
      return false;
    }
  }

  public async saveDrawing(drawing: IDrawing): Promise<boolean> {
    if (!this.config || !this.authedFetch) return false;

    const branch = this.getBranch();
    const file = this.filePath(drawing.id);
    const url = `${this.getBase()}/repos/${this.config.owner}/${
      this.config.repo
    }/contents/${file}`;
    try {
      // Per Forgejo/Gitea (Codeberg) API (as documented in swagger):
      // - POST /contents/{path}  → create new file (no sha)
      // - PUT  /contents/{path}  → update existing file (requires current blob sha)
      const sha = await this.getCurrentFileSha(drawing.id, branch);

      const method = sha ? "PUT" : "POST";
      const body: any = {
        message: `Save drawing ${drawing.id}`,
        content: encodeBase64(JSON.stringify(drawing)),
        branch,
      };
      if (sha) body.sha = sha;

      const res = await this.authedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let details = "";
        try {
          const txt = await res.clone().text();
          details = txt ? ` body=${txt.slice(0, 300)}` : "";
        } catch {}
        XLogger.error(
          `Gitea saveDrawing ${method} failed: ${res.status} ${
            res.statusText
          }${details} (branch=${branch}, hasSha=${!!sha}) url=${url}`
        );

        // Specific recovery for Codeberg/Forgejo 422 "[SHA]: Required"
        // Re-probe using the correct strategies and retry once as PUT (with sha).
        if (
          res.status === 422 &&
          /SHA.*Required|Required.*SHA/i.test(details)
        ) {
          XLogger.log(
            "Gitea saveDrawing: got 422 SHA required, re-probing sha for retry"
          );
          const freshSha = await this.getCurrentFileSha(drawing.id, branch);
          if (freshSha) {
            const retryBody: any = {
              message: `Save drawing ${drawing.id}`,
              content: encodeBase64(JSON.stringify(drawing)),
              branch,
              sha: freshSha,
            };
            const retryRes = await this.authedFetch(url, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(retryBody),
            });
            if (retryRes.ok) {
              XLogger.log("Gitea saveDrawing: retry with fresh sha succeeded");
              return true;
            } else {
              let rdetails = "";
              try {
                const rtxt = await retryRes.clone().text();
                rdetails = rtxt ? ` body=${rtxt.slice(0, 300)}` : "";
              } catch {}
              XLogger.error(
                `Gitea saveDrawing retry still failed: ${retryRes.status} ${retryRes.statusText}${rdetails}`
              );
            }
          } else {
            XLogger.log(
              "Gitea saveDrawing: re-probe for fresh sha also returned null"
            );
          }
        }
      }
      return res.ok;
    } catch (error) {
      XLogger.error("Failed to save drawing to Gitea/Forgejo", error);
      return false;
    }
  }

  public async updateDrawing(
    drawing: IDrawing
  ): Promise<
    | boolean
    | { conflict: boolean; localDrawing: IDrawing; remoteDrawing: IDrawing }
  > {
    if (!this.config || !this.authedFetch) return false;

    const branch = this.getBranch();
    const file = this.filePath(drawing.id);
    const getUrl = `${this.getBase()}/repos/${this.config.owner}/${
      this.config.repo
    }/contents/${file}?ref=${encodeURIComponent(branch)}`;
    const putUrl = `${this.getBase()}/repos/${this.config.owner}/${
      this.config.repo
    }/contents/${file}`;
    try {
      // Robust sha lookup using the three strategies (direct contents, root list by ref, resolve HEAD+tree).
      // This is required for some Gitea/Forgejo hosts (e.g. Codeberg) that 422 with "[SHA]: Required"
      // when a PUT is issued for an existing path without the current blob's sha.
      const sha = await this.getCurrentFileSha(drawing.id, branch);
      if (!sha) {
        // Not found via any method, or no sha obtainable → fall back to create path.
        return this.saveDrawing(drawing);
      }

      const putRes = await this.authedFetch(putUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Update drawing ${drawing.id}`,
          content: encodeBase64(JSON.stringify(drawing)),
          sha,
          branch,
        }),
      });

      if (putRes.status === 409 || putRes.status === 422) {
        const remoteRes = await this.authedFetch(getUrl);
        if (remoteRes.ok) {
          const remote = await remoteRes.json();
          // Gitea returns {content: base64} on the file object
          let remoteContent: any = null;
          if (remote.content) {
            try {
              remoteContent = JSON.parse(
                atob(String(remote.content).replace(/\n/g, ""))
              );
            } catch {}
          }
          if (!remoteContent && remote.download_url) {
            const raw = await fetch(remote.download_url);
            if (raw.ok) remoteContent = await raw.json();
          }
          if (remoteContent) {
            return {
              conflict: true,
              localDrawing: drawing,
              remoteDrawing: remoteContent,
            };
          }
        }
        // If we couldn't obtain remote content for conflict, fall through to return the status
      }

      if (!putRes.ok) {
        let details = "";
        try {
          const txt = await putRes.clone().text();
          details = txt ? ` body=${txt.slice(0, 300)}` : "";
        } catch {}
        XLogger.error(
          `Gitea updateDrawing PUT failed: ${putRes.status} ${
            putRes.statusText
          }${details} (branch=${branch}, hasSha=${!!sha}) url=${putUrl}`
        );
      }
      return putRes.ok;
    } catch (error) {
      XLogger.error("Failed to update drawing on Gitea/Forgejo", error);
      return false;
    }
  }

  public async deleteDrawing(drawing: IDrawing): Promise<boolean> {
    if (!this.config || !this.authedFetch) return false;

    const branch = this.getBranch();
    const file = this.filePath(drawing.id);
    try {
      const currentRes = await this.authedFetch(
        `${this.getBase()}/repos/${this.config.owner}/${
          this.config.repo
        }/contents/${file}?ref=${encodeURIComponent(branch)}`
      );

      if (!currentRes.ok) {
        return true;
      }

      const current = await currentRes.json();

      const delRes = await this.authedFetch(
        `${this.getBase()}/repos/${this.config.owner}/${
          this.config.repo
        }/contents/${file}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Delete drawing ${drawing.id}`,
            sha: current.sha,
            branch,
          }),
        }
      );

      return delRes.ok;
    } catch (error) {
      XLogger.error("Failed to delete drawing from Gitea/Forgejo", error);
      return false;
    }
  }

  public async getAllFiles(): Promise<IDrawing[]> {
    if (!this.config || !this.authedFetch) {
      XLogger.error("Gitea/Forgejo configuration not set");
      return [];
    }

    const branch = this.getBranch();
    try {
      const listRes = await this.authedFetch(
        `${this.getBase()}/repos/${this.config.owner}/${
          this.config.repo
        }/contents?ref=${encodeURIComponent(branch)}`
      );

      if (!listRes.ok) {
        XLogger.error("Failed to fetch repository contents (gitea)");
        return [];
      }

      const files = await listRes.json();
      const drawings: IDrawing[] = [];

      const list = Array.isArray(files) ? files : [];
      for (const file of list) {
        if (file.name && file.name.endsWith(".json")) {
          try {
            let rawData: any = null;
            if (file.content) {
              try {
                rawData = JSON.parse(
                  atob(String(file.content).replace(/\n/g, ""))
                );
              } catch {}
            }
            if (!rawData && file.download_url) {
              const r = await fetch(file.download_url);
              if (r.ok) rawData = await r.json();
            }
            if (rawData) {
              const drawing: IDrawing = {
                id: file.name.replace(".json", ""),
                name: rawData.name || file.name.replace(".json", ""),
                sync: rawData.sync,
                createdAt: rawData.createdAt || new Date().toISOString(),
                imageBase64: rawData.imageBase64,
                viewBackgroundColor: rawData.viewBackgroundColor,
                data: {
                  excalidraw: rawData.data?.excalidraw || "",
                  excalidrawState: rawData.data?.excalidrawState || "",
                  versionFiles: rawData.data?.versionFiles || "",
                  versionDataState: rawData.data?.versionDataState || "",
                },
              };
              drawings.push(drawing);
            }
          } catch (error) {
            XLogger.error(`Failed to fetch drawing ${file.name}`, error);
          }
        }
      }

      return drawings;
    } catch (error) {
      XLogger.error("Failed to fetch drawings from Gitea/Forgejo", error);
      return [];
    }
  }

  public async getChangeHistory(limit?: number): Promise<ChangeHistoryItem[]> {
    if (!this.config || !this.authedFetch) return [];

    const branch = this.getBranch();
    try {
      const res = await this.authedFetch(
        `${this.getBase()}/repos/${this.config.owner}/${
          this.config.repo
        }/commits?sha=${encodeURIComponent(branch)}&limit=${limit || 10}`
      );

      if (!res.ok) {
        XLogger.error("Failed to fetch commit history (gitea)", res.status);
        return [];
      }

      const commits = await res.json();
      const arr = Array.isArray(commits) ? commits : [];

      return arr.map((c: any) => ({
        id: c.sha || c.id,
        message: c.commit?.message || c.commit?.summary || "",
        author: {
          name: c.commit?.author?.name || c.commit?.author?.email || "",
          date: c.commit?.author?.date || c.commit?.committer?.date || "",
        },
      }));
    } catch (error) {
      XLogger.error("Failed to fetch commit history (gitea)", error);
      return [];
    }
  }
}
