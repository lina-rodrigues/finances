import type { Request, RequestHandler, Response } from "express";

/** Forwards rejections from async route handlers to the Express error handler. */
export function asyncHandler<P = Record<string, string>>(
  fn: (req: Request<P>, res: Response) => Promise<void>,
): RequestHandler<P> {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}
