import { Request, Response, NextFunction } from "express";

export const asyncHandler = <
  TReq extends Request = Request,
  TRes extends Response = Response
>(
  fn: (req: TReq, res: TRes, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as TReq, res as TRes, next)).catch(next);
  };
};

export default asyncHandler;





