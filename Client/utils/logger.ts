export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

// Colors for terminal output
export const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  blueBg: "\x1b[44m",
  blue: "\x1b[34m",
  white: "\x1b[37m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

export class Logger {
  private characterName: string;
  private logFilePath: string;

  constructor(characterName: string) {
    this.characterName = characterName;
    this.logFilePath = `./logs/${characterName}.log`;
    this.ensureLogDir();
  }

  private async ensureLogDir() {
    try {
      await Deno.mkdir("./logs", { recursive: true });
    } catch {
      // Directory already exists
    }
  }

  /** Write structured log entry to file and console */
  async log(level: LogLevel, tag: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();

    // Format optional object/JSON payload neatly
    const payloadStr = data !== undefined
      ? `\n  📦 Payload: ${JSON.stringify(data, null, 2)}`
      : "";

    const logLine =
      `[${timestamp}] [${level}] [${tag}] ${message}${payloadStr}\n`;

    // 1. Append to character log file (logs/Heolig.log)
    try {
      await Deno.writeTextFile(this.logFilePath, logLine, { append: true });
    } catch (err) {
      console.error(`Failed writing to log file ${this.logFilePath}:`, err);
    }

    // 2. Format colorful console output for live debugging
    const colorMap = {
      DEBUG: c.cyan,
      INFO: c.green,
      WARN: c.yellow,
      ERROR: c.red,
    };
    const reset = "\x1b[0m";

    console.log(
      `${colorMap[level]}[${
        new Date().toLocaleTimeString()
      }] [${this.characterName}] [${tag}] ${message}${reset}${payloadStr}`,
    );
  }

  debug(tag: string, message: string, data?: any) {
    return this.log("DEBUG", tag, message, data);
  }

  info(tag: string, message: string, data?: any) {
    return this.log("INFO", tag, message, data);
  }

  warn(tag: string, message: string, data?: any) {
    return this.log("WARN", tag, message, data);
  }

  error(tag: string, message: string, error?: any) {
    const errDetails = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;

    return this.log("ERROR", tag, message, errDetails);
  }
}
