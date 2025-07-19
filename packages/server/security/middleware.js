const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

// Rate limiting configuration
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
    return rateLimit({
        windowMs,
        max, // limit each IP to max requests per windowMs
        message: {
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        handler: (req, res) => {
            res.status(429).json({
                error: 'Too many requests from this IP, please try again later.',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
    });
};

// Specific rate limiters for different endpoints
const authRateLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes for auth
const apiRateLimiter = createRateLimiter(15 * 60 * 1000, 1000); // 1000 requests per 15 minutes for API
const generalRateLimiter = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes general

// CSRF protection middleware
const csrfProtection = (req, res, next) => {
    // For API-only applications, we'll use a simple token-based approach
    // In a real application, you might want to use csurf package
    const csrfToken = req.headers['x-csrf-token'];
    const sessionToken = req.headers['x-session-token'];
    
    // Skip CSRF for API key authentication
    if (req.headers['x-api-key'] || req.headers['api-key']) {
        return next();
    }
    
    // For JWT tokens, we'll rely on the token itself as CSRF protection
    // since JWT tokens are cryptographically signed
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        return next();
    }
    
    // For other requests, require CSRF token
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
        if (!csrfToken || !sessionToken) {
            return res.status(403).json({
                error: 'CSRF token missing or invalid'
            });
        }
    }
    
    next();
};

// Input validation middleware
const validateInput = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

// Sanitize user input
const sanitizeInput = (req, res, next) => {
    // Recursively sanitize request body
    const sanitize = (obj) => {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }
        
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                // Remove potentially dangerous characters
                sanitized[key] = value
                    .replace(/[<>]/g, '') // Remove < and >
                    .trim();
            } else {
                sanitized[key] = sanitize(value);
            }
        }
        return sanitized;
    };
    
    if (req.body) {
        req.body = sanitize(req.body);
    }
    
    next();
};

// Security headers middleware
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// API key hashing utility
const hashApiKey = async (apiKey) => {
    const saltRounds = 12;
    return await bcrypt.hash(apiKey, saltRounds);
};

const verifyApiKey = async (plainApiKey, hashedApiKey) => {
    return await bcrypt.compare(plainApiKey, hashedApiKey);
};

// JWT secret rotation utility
const generateJWTSecret = () => {
    return require('crypto').randomBytes(64).toString('hex');
};

// Session validation middleware
const validateSession = async (req, res, next) => {
    // Additional session validation logic
    // This could check against a database of active sessions
    // For now, we'll rely on JWT token validation
    next();
};

module.exports = {
    createRateLimiter,
    authRateLimiter,
    apiRateLimiter,
    generalRateLimiter,
    csrfProtection,
    validateInput,
    sanitizeInput,
    securityHeaders,
    hashApiKey,
    verifyApiKey,
    generateJWTSecret,
    validateSession
}; 