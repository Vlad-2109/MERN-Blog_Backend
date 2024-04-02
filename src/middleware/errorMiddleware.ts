import { Request, Response, NextFunction } from 'express';

interface ErrorWithCodes extends Error{
    code: number;
}

// Unsupported (404) routes
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Middleware to handle Errors
export const errorHandler = (error: ErrorWithCodes, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent){
        return next(error)
    }
    res.status(error.code || 500).json({message: error.message || 'An unknown error occured'})
}

