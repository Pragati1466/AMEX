"""
DisputeIQ - AI-Powered Multi-Agent Dispute Resolution System
Module 1: Investigation & Evidence Intelligence + Module 3: Resolution & Collaboration
FastAPI Application Entry Point
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings, get_cors_origins
from app.core.database import engine, Base
from app.models import *  # noqa: F401, F403 - Import all models for table creation
from app.utils.error_handler import (
    DisputeIQError,
    handle_database_error,
    create_error_response,
    log_and_handle_error
)

# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS with robust origin parsing
cors_origins = get_cors_origins()
logger.info(f"Configuring CORS with origins: {cors_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handlers
@app.exception_handler(DisputeIQError)
async def disputeiq_error_handler(request: Request, exc: DisputeIQError):
    """Handle DisputeIQ application errors."""
    await log_and_handle_error(exc, f"Request: {request.url}")
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(exc)
    )


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors."""
    disputeiq_error = handle_database_error(exc)
    await log_and_handle_error(exc, f"Database error in {request.url}")
    return JSONResponse(
        status_code=disputeiq_error.status_code,
        content=create_error_response(disputeiq_error)
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors."""
    await log_and_handle_error(exc, f"Unexpected error in {request.url}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "details": {"original_error": str(exc)}
            },
            "status": "error"
        }
    )


# Lazy-load router modules to avoid OOM crashes during import on memory-constrained environments
def _include_routers(app_instance: FastAPI) -> None:
    """Import and include API routers lazily, with graceful fallback on import failure."""
    from loguru import logger as _log
    _log.info("Loading API router modules...")
    
    router_modules = [
        ("auth", "app.api.v1.auth"),
        ("evidence", "app.api.v1.evidence"),
        ("timeline", "app.api.v1.timeline"),
        ("validation", "app.api.v1.validation"),
        ("policy", "app.api.v1.policy"),  # Re-enabled - has lazy loading fix
        ("case_file", "app.api.v1.case_file"),
        ("resolution", "app.api.v1.resolution"),
    ]
    
    for name, module_path in router_modules:
        try:
            import importlib
            mod = importlib.import_module(module_path)
            app_instance.include_router(mod.router, prefix="/api/v1")
            _log.info(f"Included router: {name}")
        except Exception as e:
            _log.warning(f"Failed to load router '{name}': {e}. Endpoints under /api/v1/{name} will be unavailable.")


# Include API routers
_include_routers(app)


@app.get("/")
def root():
    """Root health check endpoint."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "module": "Investigation & Evidence Intelligence + Resolution & Collaboration",
        "features": [
            "Module 1: Evidence Collection, Timeline Reconstruction, Evidence Validation, Policy Mapping",
            "Module 2: Multi-Agent Reasoning Engine (Customer/Merchant Advocates, Fairness Decision)",
            "Module 3: Resolution Dashboard, Smart Evidence Recommendations, Real-Time Re-Scoring"
        ]
    }


@app.get("/health")
def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy", "version": settings.APP_VERSION}


# Startup event
@app.on_event("startup")
def on_startup():
    """Initialize database tables and log startup."""
    try:
        # Create all tables (works with both SQLite and PostgreSQL)
        logger.info(f"Connecting to database: {settings.DATABASE_URL[:30]}...")
        Base.metadata.create_all(bind=engine)
        logger.info(f"Database tables created/verified successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        logger.error(f"DATABASE_URL used: {settings.DATABASE_URL}")
        # Don't crash - let the app start so health check can respond
        logger.warning("Starting without database - some endpoints may fail")
    
    logger.info(f"{settings.APP_NAME} v{settings.APP_VERSION} is starting...")
    logger.info(f"Module: Investigation & Evidence Intelligence + Resolution & Collaboration")
    logger.info(f"Documentation: http://localhost:8000/docs")
    logger.info("All three modules (Investigation, Reasoning, Resolution) are integrated")


# Shutdown event
@app.on_event("shutdown")
def on_shutdown():
    """Log application shutdown."""
    logger.info(f"{settings.APP_NAME} is shutting down...")