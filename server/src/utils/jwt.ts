import jwt, { SignOptions } from 'jsonwebtoken';
import { Response } from 'express';
import { User, JWTPayload } from '../types';

export const generateToken = (user: any): string => {
  const payload = {
    userId: user.id,
    rut: user.rut,
    role: user.role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '7d', // 7 days for better user experience
  });
};

export const generateSocketToken = (user: any): string => {
  const payload = {
    userId: user.id,
    rut: user.rut,
    role: user.role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '7d', // 7 days for socket connections
  });
};

export const generateRefreshToken = (user: any): string => {
  const payload = {
    userId: user.id,
    rut: user.rut,
    role: user.role,
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: '7d',
  });
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JWTPayload;
};

export const decodeTokenWithoutVerification = (token: string): any => {
  return jwt.decode(token);
};

export const getTokenExpirationTime = (token: string): Date | null => {
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const isTokenExpiringSoon = (token: string, thresholdMinutes: number = 5): boolean => {
  try {
    const expirationTime = getTokenExpirationTime(token);
    if (!expirationTime) return true;
    
    const now = new Date();
    const threshold = new Date(now.getTime() + (thresholdMinutes * 60 * 1000));
    
    return expirationTime <= threshold;
  } catch (error) {
    return true;
  }
};

export const setTokenCookies = (
  res: Response,
  token: string,
  refreshToken: string
): void => {
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
  };

  res.cookie('token', token, cookieOptions);
  res.cookie('refreshToken', refreshToken, cookieOptions);
};

export const clearTokenCookies = (res: Response): void => {
  res.cookie('token', '', {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  
  res.cookie('refreshToken', '', {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
};