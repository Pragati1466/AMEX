# DisputeIQ - Complete Setup Guide

## Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL 14+ (or use SQLite for development)
- Groq API Key (free): https://console.groq.com/
- Cloudinary Account (free tier): https://cloudinary.com/

## Installation

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys and database configuration

# Initialize database
alembic upgrade head

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### 3. Environment Configuration

Edit `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/disputiq
# For development, you can use SQLite:
# DATABASE_URL=sqlite:///./test.db

# Groq API
GROQ_API_KEY=your_groq_api_key_here

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Database Seeding

Create sample data for testing:

```bash
# Run the seed script
python scripts/seed_database.py
```

Or use the API to create test data:

```bash
# Register a user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "investigator@example.com",
    "username": "investigator1",
    "password": "SecurePass123!",
    "full_name": "Test Investigator"
  }'

# Login to get token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "investigator1",
    "password": "SecurePass123!"
  }'
```

## Running Tests

```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run integration tests only
pytest tests/integration/

# Run specific test
pytest tests/unit/test_evidence_agent.py -v
```

## Module-Specific Testing

### Module 1 (Investigation)

```bash
# Test evidence collection
curl -X POST http://localhost:8000/api/v1/evidence/collect \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dispute_id": 1}'

# Test timeline reconstruction
curl -X POST http://localhost:8000/api/v1/timeline/reconstruct \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"case_file_id": 1, "clear_existing": true}'
```

### Module 2 (Reasoning)

```bash
# Test Module 2 directly (if running separately)
cd backend/agents
python reasoning_main.py

# Or test through integration
curl -X POST http://localhost:8000/api/v1/resolution/1/rescore \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "test_reasoning"}'
```

### Module 3 (Resolution)

```bash
# Get dashboard
curl -X GET http://localhost:8000/api/v1/resolution/1/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"

# Generate evidence recommendations
curl -X POST http://localhost:8000/api/v1/resolution/1/evidence-recommendations/generate \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get AI recommendation
curl -X GET http://localhost:8000/api/v1/resolution/1/recommendation \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Deployment

### Backend (Render)

1. Create a new PostgreSQL database on Render
2. Set environment variables in Render dashboard
3. Connect your GitHub repository
4. Deploy with build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend (Vercel)

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel` in frontend directory
3. Set environment variables for API URL
4. Deploy

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## Troubleshooting

### Module 2 Connection Issues

If Module 2 can't connect to Module 1:

1. Check both services are running
2. Verify `INVESTIGATION_MODULE_BASE_URL` in `backend/agents/reasoning_main.py`
3. Ensure authentication credentials are correct
4. Check firewall settings

### Groq API Issues

If Groq API fails:

1. Verify your API key is valid
2. Check your usage limits
3. The system will automatically fall back to deterministic reasoning
4. Check logs for specific error messages

### Database Connection Issues

For PostgreSQL:

```bash
# Check if PostgreSQL is running
pg_isready

# Test connection
psql -U username -d database_name
```

For SQLite (development):

```bash
# The database file will be created automatically
# Check permissions if you get file access errors
```

## Performance Optimization

### Database Indexing

The system includes proper indexing on:
- `disputes.id`, `disputes.dispute_id`
- `evidence_repository.case_file_id`
- `timeline_events.case_file_id`
- `resolution_states.dispute_id`

### Caching

Enable Redis for production:

```env
REDIS_URL=redis://localhost:6379/0
```

### Vector Database Optimization

For ChromaDB:

```python
# In production, use persistent storage
chroma_client = chromadb.PersistentClient(path="./chroma_db")
```

## Security Considerations

1. **API Keys**: Never commit `.env` files
2. **Database**: Use strong passwords and SSL connections
3. **Authentication**: JWT tokens expire after 30 minutes
4. **Rate Limiting**: Implement rate limiting for production
5. **Input Validation**: All inputs are validated via Pydantic schemas

## Monitoring

### Health Checks

```bash
# Backend health
curl http://localhost:8000/health

# Frontend health
curl http://localhost:3000
```

### Logging

Logs are stored in `backend/logs/` directory with:
- `app.log` - Application logs
- `error.log` - Error logs
- `audit.log` - Audit trail

## Support

For issues or questions:
- Check the API Testing Guide: `API_TESTING_GUIDE.md`
- Review the code documentation in each module
- Check test files for usage examples
- Review logs for specific error messages