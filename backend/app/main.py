"""
DisputeIQ - AI-Powered Multi-Agent Dispute Resolution System
Module 1: Investigation & Evidence Intelligence
FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.api.v1 import auth

# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include API routers
app.include_router(auth.router, prefix="/api/v1")


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
    """Log application startup."""
    logger.info(f"{settings.APP_NAME} v{settings.APP_VERSION} is starting...")
    logger.info(f"Module: Investigation & Evidence Intelligence")
    logger.info(f"Documentation: http://localhost:8000/docs")


# Shutdown event
@app.on_event("shutdown")
def on_shutdown():
    """Log application shutdown."""
    logger.info(f"{settings.APP_NAME} is shutting down...")