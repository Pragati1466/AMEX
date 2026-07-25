"""
Cloudinary integration for file uploads.
Handles uploading evidence files to Cloudinary storage.
"""

import io
from typing import Optional

import cloudinary
import cloudinary.uploader
from loguru import logger

from app.core.config import settings


def configure_cloudinary() -> None:
    """Initialize Cloudinary with credentials from settings."""
    if not all([
        settings.CLOUDINARY_CLOUD_NAME,
        settings.CLOUDINARY_API_KEY,
        settings.CLOUDINARY_API_SECRET,
    ]):
        logger.warning("Cloudinary not configured. File uploads will be disabled.")
        return

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    logger.info("Cloudinary configured successfully")


def upload_file(
    file_data: bytes,
    file_name: str,
    folder: str = "dispute_iq_evidence",
    resource_type: str = "auto",
) -> Optional[dict]:
    """
    Upload a file to Cloudinary.

    Args:
        file_data: Raw bytes of the file.
        file_name: Name of the file (used for public_id).
        folder: Cloudinary folder to store in.
        resource_type: 'auto', 'image', 'raw', or 'video'.

    Returns:
        Dict with upload result (url, public_id, etc.) or None on failure.
    """
    if not settings.CLOUDINARY_CLOUD_NAME:
        logger.error("Cloudinary not configured. Cannot upload file.")
        return None

    try:
        result = cloudinary.uploader.upload(
            io.BytesIO(file_data),
            public_id=file_name,
            folder=folder,
            resource_type=resource_type,
            overwrite=True,
        )
        logger.info(f"File uploaded to Cloudinary: {result.get('secure_url')}")
        return {
            "url": result.get("secure_url"),
            "public_id": result.get("public_id"),
            "format": result.get("format"),
            "bytes": result.get("bytes"),
            "original_filename": result.get("original_filename"),
        }
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        return None


def delete_file(public_id: str) -> bool:
    """Delete a file from Cloudinary by its public_id."""
    if not settings.CLOUDINARY_CLOUD_NAME:
        logger.error("Cloudinary not configured. Cannot delete file.")
        return False

    try:
        result = cloudinary.uploader.destroy(public_id)
        success = result.get("result") == "ok"
        if success:
            logger.info(f"File deleted from Cloudinary: {public_id}")
        else:
            logger.warning(f"Cloudinary delete returned: {result}")
        return success
    except Exception as e:
        logger.error(f"Cloudinary delete failed: {e}")
        return False