/**
 * Environment variables configuration with validation and type safety
 * 
 * This module validates all required environment variables at startup
 * and provides typed access to them throughout the application.
 * 
 * If a required variable is missing or invalid, the application will
 * fail fast with a clear error message.
 */

import { z } from 'zod';

/**
 * Schema for environment variables validation
 */
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Server configuration
  PORT: z.string()
    .transform((val) => {
      const port = Number(val);
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error(`PORT must be a number between 1 and 65535, got: ${val}`);
      }
      return port;
    })
    .default('3001'),
  
  HOST: z.string().default('0.0.0.0'),
  
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  
  // JWT
  JWT_SECRET: z.string()
    .min(1, 'JWT_SECRET is required')
    .refine(
      (secret) => {
        const isProduction = process.env.NODE_ENV === 'production';
        // En producción, requiere mínimo 32 caracteres
        if (isProduction && secret.length < 32) {
          return false;
        }
        // No permitir "dev_secret" en ningún ambiente
        if (secret === 'dev_secret') {
          return false;
        }
        return true;
      },
      (secret) => {
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction && secret.length < 32) {
          return { message: 'JWT_SECRET must be at least 32 characters long in production' };
        }
        if (secret === 'dev_secret') {
          return { message: 'JWT_SECRET cannot be "dev_secret" in any environment' };
        }
        return { message: 'JWT_SECRET validation failed' };
      }
    ),
  
  // CORS
  ALLOWED_ORIGINS: z.string().optional(),
  
  // SMTP (optional for email notifications)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string()
    .transform((val) => val ? Number(val) : undefined)
    .refine(
      (port) => !port || (port >= 1 && port <= 65535),
      { message: 'SMTP_PORT must be a number between 1 and 65535' }
    )
    .optional(),
  SMTP_USER: z.string().email('SMTP_USER must be a valid email').optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email('SMTP_FROM must be a valid email').optional(),
  
  // SMS (optional - requires Twilio or similar)
  SMS_API_KEY: z.string().optional(),
  SMS_PROVIDER: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  
  // Seed users (optional - for initial setup)
  ADMIN_NAME: z.string().optional(),
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email').optional(),
  ADMIN_PASSWORD: z.string().optional(),
  CAPTADOR_NAME: z.string().optional(),
  CAPTADOR_EMAIL: z.string().email('CAPTADOR_EMAIL must be a valid email').optional(),
  CAPTADOR_PASSWORD: z.string().optional(),
  OFTALMOLOGO_NAME: z.string().optional(),
  OFTALMOLOGO_EMAIL: z.string().email('OFTALMOLOGO_EMAIL must be a valid email').optional(),
  OFTALMOLOGO_PASSWORD: z.string().optional(),
  
  // Frontend API URL (for CORS and CSP)
  VITE_API_URL: z.string().url().optional(),
});

/**
 * Type-safe environment variables
 * Access this object instead of process.env directly
 */
export type Env = z.infer<typeof envSchema>;

let env: Env;

/**
 * Validate and parse environment variables
 * Call this once at application startup
 * 
 * @throws Error if required variables are missing or invalid
 */
export function validateEnv(): Env {
  try {
    env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code
      }));
      
      console.error('[ERROR] Environment variables validation failed:');
      console.error('\nMissing or invalid variables:');
      missing.forEach(({ path, message }) => {
        console.error(`  - ${path}: ${message}`);
      });
      
      // Si solo es JWT_SECRET y estamos en desarrollo, permitir pero advertir
      const isJWTSecretOnly = missing.length === 1 && missing[0].path === 'JWT_SECRET';
      const isDevelopment = process.env.NODE_ENV !== 'production';
      
      if (isJWTSecretOnly && isDevelopment) {
        console.warn('\n[WARN] JWT_SECRET validation warning in development.');
        console.warn('       Using default/fallback JWT_SECRET for development only.');
        console.warn('       This is NOT secure for production!');
        
        // Permitir continuar en desarrollo con un valor por defecto temporal
        const tempSecret = process.env.JWT_SECRET || 'dev-secret-temp-' + Date.now();
        const tempEnv = { ...process.env, JWT_SECRET: tempSecret };
        env = envSchema.parse(tempEnv);
        return env;
      }
      
      console.error('\nPlease check your .env file or environment variables.');
      throw new Error('Invalid environment configuration');
    }
    throw error;
  }
}

/**
 * Get validated environment variables
 * Must call validateEnv() first
 * 
 * @returns Typed environment variables
 * @throws Error if validateEnv() hasn't been called
 */
export function getEnv(): Env {
  if (!env) {
    throw new Error(
      'Environment variables not initialized. Call validateEnv() first.'
    );
  }
  return env;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return getEnv().NODE_ENV === 'test';
}

