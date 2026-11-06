# Sophia AI Backend Authentication Implementation Plan

## Current State: No Authentication Backend

The backend currently only implements document operations:
- `POST /api/v1/documents` - Upload PDF
- `GET /api/v1/documents/{id}` - Get document
- `GET /api/v1/documents/{id}/chunks` - Get chunks
- `POST /api/v1/documents/{id}/summary` - Generate summary
- `POST /api/v1/documents/{id}/questions` - RAG Q&A

**No user management, authentication, or authorization exists.**

---

## Required Backend Auth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register with username, email, password |
| POST | `/api/v1/auth/login` | Login with username/email + password |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Invalidate session |
| POST | `/api/v1/auth/forgot-password` | Request password reset email |
| POST | `/api/v1/auth/reset-password` | Reset password with token |
| GET | `/api/v1/auth/google` | Initiate Google OAuth |
| GET | `/api/v1/auth/google/callback` | Handle Google OAuth callback |
| GET | `/api/v1/auth/me` | Get current user profile |
| GET | `/api/v1/auth/verify-email` | Verify email with token |

---

## Required Infrastructure

### 1. Database Models (PostgreSQL + SQLAlchemy)

```python
# User model
- id (UUID, PK)
- username (unique, indexed)
- email (unique, indexed)
- password_hash (argon2)
- full_name (optional)
- avatar_url (optional)
- is_active (bool, default=True)
- is_verified (bool, default=False)
- created_at, updated_at
- last_login_at (optional)

# OAuth account linking
- id (UUID, PK)
- user_id (FK → User)
- provider (google, github)
- provider_user_id
- access_token (encrypted)
- refresh_token (encrypted)
- expires_at

# Password reset tokens
- id (UUID, PK)
- user_id (FK → User)
- token_hash (sha256)
- expires_at
- used_at (nullable)

# Email verification tokens
- id (UUID, PK)
- user_id (FK → User)
- token_hash (sha256)
- expires_at
- used_at (nullable)

# Document ownership (modify existing)
- Add user_id FK to documents table
```

### 2. Password Security
- Use `argon2-cffi` for password hashing (OWASP recommended)
- Minimum 12 characters, require mixed case + number + symbol
- Rate limiting on auth endpoints

### 3. JWT Tokens
- Access token: 15 min expiry, RS256
- Refresh token: 7 days, stored hashed in DB
- Token payload: `sub` (user_id), `username`, `email`, `exp`, `iat`, `type`
- Rotate refresh tokens on use

### 4. Google OAuth
- Configure in Google Cloud Console
- Store client ID/secret in `.env`
- Scopes: `openid`, `email`, `profile`
- Link OAuth account to existing user by email or create new

### 5. Email Service
- SMTP configuration in `.env`
- Templates for: verification, password reset, welcome
- Async sending via background task

### 6. Session/Token Validation Middleware
- Dependency: `get_current_user` → validates access token
- Dependency: `get_current_user_optional` → for optional auth
- Verify document ownership on all document endpoints

---

## Implementation Phases

### Phase 1: Core Auth (Week 1)
- [ ] Add SQLAlchemy models + Alembic migration
- [ ] Password hashing utility
- [ ] JWT creation/validation
- [ ] Register endpoint
- [ ] Login endpoint
- [ ] Refresh token endpoint
- [ ] Logout endpoint
- [ ] Get current user endpoint
- [ ] Unit tests for auth endpoints

### Phase 2: Password Reset + Email (Week 1-2)
- [ ] Email service abstraction
- [ ] Forgot password endpoint
- [ ] Reset password endpoint
- [ ] Email verification endpoint
- [ ] Email templates
- [ ] Rate limiting

### Phase 3: Google OAuth (Week 2)
- [ ] OAuth config in settings
- [ ] Google OAuth initiation endpoint
- [ ] Callback endpoint
- [ ] Account linking logic
- [ ] Tests

### Phase 4: Authorization Integration (Week 2)
- [ ] Add user_id to documents
- [ ] Ownership verification on all document endpoints
- [ ] User isolation for vector data (ChromaDB collections per user)
- [ ] Migration for existing documents

---

## Environment Variables Needed

```env
# Auth
JWT_SECRET_KEY=...           # 32+ char random
JWT_ALGORITHM=RS256
JWT_PRIVATE_KEY_PATH=...     # Path to RSA private key
JWT_PUBLIC_KEY_PATH=...      # Path to RSA public key
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Password
ARGON2_TIME_COST=3
ARGON2_MEMORY_COST=65536
ARGON2_PARALLELISM=4

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
EMAIL_FROM=noreply@sophia-ai.local
EMAIL_VERIFICATION_URL=http://localhost:5173/auth/verify-email
PASSWORD_RESET_URL=http://localhost:5173/auth/reset-password
```

---

## Frontend Dependencies

Once backend is implemented, frontend needs:
- Auth context/provider for centralized state
- Login page (`/login`)
- Register page (`/register`)
- Forgot password page (`/forgot-password`)
- Reset password page (`/reset-password`)
- Google OAuth callback page (`/auth/google/callback`)
- Protected route wrapper
- Redirect logic for authenticated users
- Token storage in memory (not localStorage) + httpOnly cookies for refresh
- Axios interceptors for token refresh

---

## Testing Requirements

- Unit tests for all auth endpoints
- Integration tests for full flows
- Password strength validation
- Rate limiting verification
- OAuth flow testing
- Token expiry/refresh behavior
- Document ownership enforcement