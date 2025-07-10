/*
* Minimal Express type declarations used solely to satisfy the TypeScript
* compiler in environments where `@types/express` is not installed. The
* definitions purposefully cover only the symbols referenced in `server.ts`.
* They are **not** a full recreation of the Express API.
*/

declare module 'express' {
  export interface Request {
    body?: unknown;
    header(name: string): string | undefined;
  }

  export interface Response {
    status(code: number): Response;
    json(body: unknown): void;
    header(name: string, value: string): void;
    sendStatus(code: number): void;
  }

  export type NextFunction = () => void;

  export interface Express {
    use(handler: unknown): void;
    options(path: string, handler: unknown): void;
    post(path: string, handler: unknown): void;
    listen(port: number, callback?: () => void): void;
  }

  function createExpress(): Express;

  namespace createExpress {
    function json(): unknown;
  }

  namespace createExpress {
    function Router(): unknown;
  }

  export default createExpress;
}
