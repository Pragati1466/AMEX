"""
Centralized error handling utilities for DisputeIQ.
Provides consistent error responses and logging across all modules.
"""

from typing import Any, Optional, Dict
from fastapi import HTTPException, status
from loguru import logger
from sqlalchemy.exc import SQLAlchemyError


class DisputeIQError(Exception):
    """Base exception for DisputeIQ application errors."""
    
    def __init__(
        self,
        message: str,
        error_code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class AuthenticationError(DisputeIQError):
    """Authentication related errors."""
    
    def __init__(self, message: str = "Authentication failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="AUTH_ERROR",
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details
        )


class AuthorizationError(DisputeIQError):
    """Authorization related errors."""
    
    def __init__(self, message: str = "Insufficient permissions", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="AUTHZ_ERROR",
            status_code=status.HTTP_403_FORBIDDEN,
            details=details
        )


class ValidationError(DisputeIQError):
    """Data validation errors."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details
        )


class NotFoundError(DisputeIQError):
    """Resource not found errors."""
    
    def __init__(self, resource: str, identifier: str, details: Optional[Dict[str, Any]] = None):
        message = f"{resource} with identifier '{identifier}' not found"
        super().__init__(
            message=message,
            error_code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details
        )


class ExternalServiceError(DisputeIQError):
    """External service integration errors."""
    
    def __init__(
        self,
        service: str,
        message: str = "External service unavailable",
        details: Optional[Dict[str, Any]] = None
    ):
        full_message = f"{service}: {message}"
        super().__init__(
            message=full_message,
            error_code="EXTERNAL_SERVICE_ERROR",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details
        )


class Module2Error(ExternalServiceError):
    """Module 2 reasoning engine specific errors."""
    
    def __init__(self, message: str = "Reasoning engine unavailable", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            service="Module 2 Reasoning Engine",
            message=message,
            details=details
        )


class EvidenceProcessingError(DisputeIQError):
    """Evidence processing errors."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="EVIDENCE_PROCESSING_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details
        )


def handle_database_error(error: SQLAlchemyError) -> DisputeIQError:
    """Convert SQLAlchemy errors to DisputeIQ errors."""
    logger.error(f"Database error: {str(error)}")
    
    error_message = "Database operation failed"
    if "unique constraint" in str(error).lower():
        return ValidationError(
            message="Resource already exists",
            details={"original_error": str(error)}
        )
    elif "foreign key constraint" in str(error).lower():
        return ValidationError(
            message="Referenced resource does not exist",
            details={"original_error": str(error)}
        )
    else:
        return DisputeIQError(
            message=error_message,
            details={"original_error": str(error)}
        )


def handle_external_service_error(service: str, error: Exception) -> ExternalServiceError:
    """Handle external service errors with fallback information."""
    logger.error(f"{service} error: {str(error)}")
    
    return ExternalServiceError(
        service=service,
        message=f"Service temporarily unavailable",
        details={
            "original_error": str(error),
            "fallback_available": True
        }
 )


def create_error_response(error: DisputeIQError) -> Dict[str, Any]:
    """Create standardized error response."""
    return {
        "error": {
            "code": error.error_code,
            "message": error.message,
            "details": error.details
        },
        "status": "error"
    }


async def log_and_handle_error(error: Exception, context: str = "") -> None:
    """Central error logging with context."""
    error_context = f"Error in {context}: " if context else "Error: "
    logger.error(f"{error_context}{str(error)}")
    
    # Additional context logging based on error type
    if isinstance(error, DisputeIQError):
        logger.error(f"Error code: {error.error_code}, Status: {error.status_code}")
        if error.details:
            logger.error(f"Error details: {error.details}")
    else:
        logger.exception("Unexpected error occurred")