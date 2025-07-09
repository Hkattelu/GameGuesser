declare namespace NodeJS {
  // Minimal subset used in this codebase.
  interface ProcessEnv {
    [key: string]: string | undefined;
    GEMINI_API_KEY?: string;
  }
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Process {
    env: ProcessEnv;
  }
}

declare const process: NodeJS.Process;
