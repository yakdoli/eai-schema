// 인증 관련 타입 정의

import { BaseEntity } from './common';

export interface User extends BaseEntity {
  email: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: string[];
  tier: 'free' | 'premium' | 'enterprise';
  isActive: boolean;
  lastLoginAt?: Date;
}

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'user' | 'viewer';
}

export interface AuthToken {
  token: string;
  expiresAt: Date;
  user: User;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: string[];
  permissions?: string[];
}

export interface ValidationMiddlewareOptions {
  body?: any;
  query?: any;
  params?: any;
}