"""
DisputeIQ - AI-Powered Multi-Agent Dispute Resolution System
Module 1: Investigation & Evidence Intelligence
FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings, get_cors_origins
from app.core.database import engine, Base
from app.models import *  # noqa: F401, F403 - Import all models for table creation

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
        ("policy", "app.api.v1.policy"),
        ("case_file", "app.api.v1.case_file"),
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
        "module": "Investigation & Evidence Intelligence",
    }


@app.get("/health")
def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}


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
    logger.info(f"Module: Investigation & Evidence Intelligence")
    logger.info(f"Documentation: http://localhost:8000/docs")


# Shutdown event
@app.on_event("shutdown")
def on_shutdown():
    """Log application shutdown."""
    logger.info(f"{settings.APP_NAME} is shutting down...")