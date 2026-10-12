declare global {
  namespace Express {
    interface Request {
      userId?: string;
      actorId?: string;
      readOnly?: boolean;
    }
  }
}

export {};
