import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import HttpError from '../models/errorModel';
import dotenv from 'dotenv';

dotenv.config();

const secret = process.env.JWT_SECRET || '';

export const authMiddleware = async (req: Request | any, res: Response, next: NextFunction) => {
  const Authorization = req.headers.Authorization || req.headers.authorization;
  if (Authorization && typeof Authorization === 'string' && Authorization.startsWith('Bearer')) {
    const token = Authorization.split(' ')[1];
    jwt.verify(token, secret, (err, info) => {
      if (err) {
        return next(new HttpError('Unauthorized. Invalid token.', 403));
      }
      req.user = info;
      next();
    });
  } else {
    return next(new HttpError('Unauthorized. No token.', 402));
  }
};
