import * as path from "node:path";
import * as fs from "node:fs";
import * as zlib from "node:zlib";
import * as readline from "node:readline";
import * as winston from "winston";

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface LogEntry {
  /** ISO timestamp extracted from the log line, if present */
  timestamp?: string;
  /** Normalised log level (debug | info | warn | error), if present */
  level?: string;
  /** Human-readable message body */
  message: string;
  /** Structured metadata attached to the log entry, if present */
  meta?: Record<string, unknown>;
  /** The raw, unparsed log line */
  raw: string;
  /** 1-based line number within the log file */
  lineNumber: number;
}

export interface ReadLogsOptions {
  /**
   * 1-based line number to start reading from.
   * Defaults to 1 (beginning of file).
   */
  startLine?: number;
  /**
   * Number of lines to return.
   * Defaults to 100, capped internally at 1000.
   */
  lines?: number;
}

export interface SearchLogsOptions {
  /**
   * Maximum number of matching lines to return.
   * Defaults to 100.
   */
  maxResults?: number;
  /**
   * 1-based line number to begin the search at.
   * Defaults to 1.
   */
  startLine?: number;
}

// ---------------------------------------------------------------------------
// InstanceResourceManager
// ---------------------------------------------------------------------------

/**
 * InstanceResourceManager manages per-instance resources for a workflow run.
 *
 * Responsibilities:
 *  - **Directory provisioning**: guarantees the resource tree exists on disk.
 *  - **Path / filename factory**: canonical getters for all paths within the
 *    resource tree.
 *  - **Structured logging**: a dedicated Winston file logger that writes to
 *    `<REACTORY_DATA>/workflows/<nameSpace>/<name>/<version>/logs/<instanceId>.log`
 *  - **Log reading**: paginated access to log entries.
 *  - **Log search**: full-text / regex search over the log file.
 *  - **File management**: delete individual files or the entire resource tree.
 *  - **Archiving**: gzip-compress the instance log and return a CDN-relative URL.
 *
 * The resource path used by all utilities:
 *   `<REACTORY_DATA>/workflows/<nameSpace>/<name>/<version>/`
 *
 * The log file path:
 *   `<REACTORY_DATA>/workflows/<nameSpace>/<name>/<version>/logs/<instanceId>.log`
 *
 * A static registry allows any service to look up the manager for a running
 * instance by its workflow instance ID without carrying a direct reference.
 */
export class InstanceResourceManager {
  private readonly logger: winston.Logger;
  private readonly logFilePath: string;
  private readonly logDir: string;
  private readonly resourceDir: string;
  private readonly rawInstanceId: string;
  private readonly safeNameSpace: string;
  private readonly safeName: string;
  private readonly safeVersion: string;
  private readonly safeInstanceId: string;

  /** Global registry of active managers keyed by raw instanceId */
  private static readonly registry: Map<string, InstanceResourceManager> = new Map();

  /**
   * @param nameSpace  - Workflow namespace (e.g. `"kb"`)
   * @param name       - Workflow name (e.g. `"CollectSystemDocsWorkflow"`)
   * @param version    - Workflow version string (e.g. `"1.0.0"`)
   * @param instanceId - Unique ID for the running workflow instance
   */
  constructor(
    nameSpace: string,
    name: string,
    version: string,
    instanceId: string,
  ) {
    const dataRoot = process.env.REACTORY_DATA || process.env.APP_DATA_ROOT;
    if (!dataRoot) {
      throw new Error(
        "InstanceResourceManager requires REACTORY_DATA or APP_DATA_ROOT to be set",
      );
    }

    const safe = (s: string): string => s.replace(/[^a-zA-Z0-9_\-.]/g, "_");

    this.rawInstanceId = instanceId;
    this.safeNameSpace = safe(nameSpace);
    this.safeName = safe(name);
    this.safeVersion = safe(version);
    this.safeInstanceId = safe(instanceId);

    // <dataRoot>/workflows/<nameSpace>/<name>/<version>
    this.resourceDir = path.join(
      dataRoot,
      "workflows",
      "catalog",
      this.safeNameSpace,
      this.safeName,
      this.safeVersion,
    );

    // <resourceDir>/logs
    this.logDir = path.join(this.resourceDir, "logs");

    // <logDir>/<instanceId>.log
    this.logFilePath = path.join(this.logDir, `${this.safeInstanceId}.log`);

    // Ensure the log directory exists before Winston tries to write
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || "debug",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr =
            Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
          return `[${String(timestamp)}] [${String(level).toUpperCase()}] ${String(message)}${metaStr}`;
        }),
      ),
      transports: [
        new winston.transports.File({
          filename: this.logFilePath,
          maxsize: 10 * 1024 * 1024, // 10 MB per file
          maxFiles: 5,
        }),
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // Static registry
  // ---------------------------------------------------------------------------

  /**
   * Register a manager so other services can retrieve it by instance ID.
   */
  static register(instanceId: string, manager: InstanceResourceManager): void {
    InstanceResourceManager.registry.set(instanceId, manager);
  }

  /**
   * Look up the manager for a running workflow instance.
   * Returns `null` if no manager has been registered for this instance.
   */
  static forInstance(instanceId: string): InstanceResourceManager | null {
    return InstanceResourceManager.registry.get(instanceId) ?? null;
  }

  /**
   * Remove the manager from the registry (e.g. after the workflow completes).
   */
  static unregister(instanceId: string): void {
    InstanceResourceManager.registry.delete(instanceId);
  }

  // ---------------------------------------------------------------------------
  // Path / filename factory
  // ---------------------------------------------------------------------------

  /** Root directory for all resources belonging to this workflow version. */
  getResourceDir(): string {
    return this.resourceDir;
  }

  /** Directory that holds all log files for this workflow version. */
  getLogDir(): string {
    return this.logDir;
  }

  /** Absolute path to the log file for this specific instance. */
  getLogFilePath(): string {
    return this.logFilePath;
  }

  /**
   * Build the absolute path for a named file inside the resource directory.
   * `filename` is basename-sanitised to prevent directory-traversal attacks.
   *
   * @param filename - Relative filename (e.g. `"report.json"`)
   */
  getFilePath(filename: string): string {
    return path.join(this.resourceDir, path.basename(filename));
  }

  // ---------------------------------------------------------------------------
  // File management
  // ---------------------------------------------------------------------------

  /**
   * Delete a specific file within the resource directory.
   * Throws if the resolved path would escape the resource directory.
   */
  deleteFile(filename: string): void {
    const target = path.resolve(this.resourceDir, path.basename(filename));
    if (!target.startsWith(this.resourceDir + path.sep)) {
      throw new Error(
        `Refused to delete a file outside the resource directory: ${target}`,
      );
    }
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
  }

  /**
   * Recursively delete every file and subdirectory within the resource
   * directory, leaving the directory itself in place.
   */
  deleteAllFiles(): void {
    if (!fs.existsSync(this.resourceDir)) return;
    for (const entry of fs.readdirSync(this.resourceDir, { withFileTypes: true })) {
      const entryPath = path.join(this.resourceDir, entry.name);
      if (entry.isDirectory()) {
        fs.rmSync(entryPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(entryPath);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Log reading
  // ---------------------------------------------------------------------------

  /**
   * Read log entries with pagination support.
   *
   * @param options.startLine - 1-based line number to begin reading (default 1)
   * @param options.lines     - Number of lines to return (default 100, max 1000)
   */
  async readLogs(options: ReadLogsOptions = {}): Promise<LogEntry[]> {
    const { startLine = 1, lines = 100 } = options;
    const maxLines = Math.min(Math.max(1, lines), 1000);

    if (!fs.existsSync(this.logFilePath)) return [];

    return this.streamLogLines((raw, lineNumber, accumulator) => {
      if (lineNumber < startLine) return true; // skip
      if (accumulator.length >= maxLines) return false; // stop
      accumulator.push(this.parseLogLine(raw, lineNumber));
      return true; // continue
    });
  }

  // ---------------------------------------------------------------------------
  // Log search
  // ---------------------------------------------------------------------------

  /**
   * Search log entries for a plain-text substring or regular expression.
   *
   * @param query              - Plain string (case-insensitive) or `RegExp`
   * @param options.maxResults - Maximum matching lines to return (default 100)
   * @param options.startLine  - 1-based line number to begin searching (default 1)
   */
  async searchLogs(
    query: string | RegExp,
    options: SearchLogsOptions = {},
  ): Promise<LogEntry[]> {
    const { maxResults = 100, startLine = 1 } = options;

    const regex =
      query instanceof RegExp
        ? query
        : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`), "i");

    if (!fs.existsSync(this.logFilePath)) return [];

    return this.streamLogLines((raw, lineNumber, accumulator) => {
      if (lineNumber < startLine) return true; // skip
      if (accumulator.length >= maxResults) return false; // stop
      if (regex.test(raw)) {
        accumulator.push(this.parseLogLine(raw, lineNumber));
      }
      return true; // continue
    });
  }

  // ---------------------------------------------------------------------------
  // Archive
  // ---------------------------------------------------------------------------

  /**
   * gzip-compress the instance log file.
   * The compressed archive is written alongside the log file as
   * `<instanceId>.log.gz`.
   *
   * @returns A CDN-relative URL to the compressed archive, e.g.
   *          `/cdn/workflows/kb/CollectSystemDocsWorkflow/1.0.0/logs/<id>.log.gz`
   */
  async archive(): Promise<string> {
    if (!fs.existsSync(this.logFilePath)) {
      throw new Error(`Cannot archive: log file not found at ${this.logFilePath}`);
    }

    const archivePath = `${this.logFilePath}.gz`;
    const dataRoot = process.env.REACTORY_DATA || process.env.APP_DATA_ROOT || "";
    const relPath = path.relative(dataRoot, archivePath);

    await new Promise<void>((resolve, reject) => {
      const input = fs.createReadStream(this.logFilePath);
      const output = fs.createWriteStream(archivePath);
      const gzip = zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });

      input.pipe(gzip).pipe(output);

      output.on("finish", resolve);
      output.on("error", reject);
      input.on("error", reject);
    });

    return `/cdn/${relPath}`;
  }

  // ---------------------------------------------------------------------------
  // Logging
  // ---------------------------------------------------------------------------

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, meta);
  }

  log(message: string, meta?: Record<string, unknown>, level = "debug"): void {
    this.logger.log(level, message, meta);
  }

  /**
   * Flush and close the underlying logger transports, then remove this
   * manager from the static registry. Call when the workflow instance ends.
   */
  async close(): Promise<void> {
    InstanceResourceManager.unregister(this.rawInstanceId);
    return new Promise((resolve) => {
      this.logger.on("finish", resolve);
      this.logger.end();
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Core line-streaming primitive used by `readLogs` and `searchLogs`.
   *
   * `visitor` is called for every line; returning `false` terminates the
   * stream early.  The accumulator is shared between calls so the visitor
   * can push entries directly.
   */
  private streamLogLines(
    visitor: (
      raw: string,
      lineNumber: number,
      accumulator: LogEntry[],
    ) => boolean,
  ): Promise<LogEntry[]> {
    return new Promise((resolve, reject) => {
      const accumulator: LogEntry[] = [];
      let lineNumber = 0;
      let done = false;

      const fileStream = fs.createReadStream(this.logFilePath, {
        encoding: "utf-8",
      });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      const finish = (): void => {
        if (done) return;
        done = true;
        rl.close();
        fileStream.destroy();
        resolve(accumulator);
      };

      rl.on("line", (raw) => {
        lineNumber++;
        const shouldContinue = visitor(raw, lineNumber, accumulator);
        if (!shouldContinue) finish();
      });

      rl.on("close", () => resolve(accumulator));
      rl.on("error", reject);
      fileStream.on("error", reject);
    });
  }

  /**
   * Parse a structured log line into a `LogEntry`.
   * Expected format: `[<timestamp>] [<LEVEL>] <message>[ <json-meta>]`
   */
  private parseLogLine(raw: string, lineNumber: number): LogEntry {
    // Match: [2026-04-11T10:00:00.000Z] [INFO] Some message {"key":"value"}
    const match = /^\[(.+?)\] \[(.+?)\] (.*?)(\s+(\{[\s\S]*\}))?$/.exec(raw);
    if (match) {
      let meta: Record<string, unknown> | undefined;
      if (match[5]) {
        try {
          meta = JSON.parse(match[5]);
        } catch {
          // unparseable meta — leave undefined
        }
      }
      return {
        timestamp: match[1],
        level: match[2].toLowerCase(),
        message: match[3],
        meta,
        raw,
        lineNumber,
      };
    }
    return { message: raw, raw, lineNumber };
  }
}

export default InstanceResourceManager;
