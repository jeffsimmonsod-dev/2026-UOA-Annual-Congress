import "express";

declare global {
  namespace Express {
    interface Request {
      conferenceId: number;
    }
  }
}
