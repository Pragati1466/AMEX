"""
Pytest Configuration for DisputeIQ Testing.
Configures pytest with fixtures, plugins, and test discovery.
"""

import pytest
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom settings."""
    config.addinivalue_line(
        "markers", "unit: Unit tests for individual components"
    )
    config.addinivalue_line(
        "markers", "integration: Integration tests for API endpoints"
    )
    config.addinivalue_line(
        "markers", "e2e: End-to-end tests for complete workflows"
    )
    config.addinivalue_line(
        "markers", "slow: Tests that take a long time to run"
    )
    config.addinivalue_line(
        "markers", "external: Tests that require external services"
    )


# Test discovery patterns
pytest_plugins = []

# Default test collection patterns
collect_ignore = [
    "migrations",
    "venv",
    "env",
    ".venv",
    ".env",
]

# Python files to collect
python_files = ["test_*.py", "*_test.py"]

# Python classes to collect
python_classes = ["Test*"]

# Python functions to collect
python_functions = ["test_*"]


# Test directories
testpaths = [
    "tests",
]


# Output options
addopts = [
    "-v",  # Verbose output
    "--strict-markers",  # Strict marker checking
    "--tb=short",  # Short traceback format
    "--disable-warnings",  # Disable warnings
    "-ra",  # Show summary of all test results
]


# Coverage options (when pytest-cov is installed)
try:
    import pytest_cov
    addopts.extend([
        "--cov=app",
        "--cov-report=html",
        "--cov-report=term-missing",
        "--cov-fail-under=80",  # Require 80% coverage
    ])
except ImportError:
    pass


# Async test support (when pytest-asyncio is installed)
try:
    import pytest_asyncio
    addopts.append("--asyncio-mode=auto")
except ImportError:
    pass


# Mock database for testing
@pytest.fixture(scope="session")
def test_db_url():
    """Provide test database URL."""
    return "sqlite:///./test.db"


@pytest.fixture(scope="function")
def test_db(test_db_url):
    """Provide test database session."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.database import Base
    
    # Create test database engine
    engine = create_engine(test_db_url, connect_args={"check_same_thread": False})
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    
    try:
        yield db
    finally:
        db.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=engine)


# Mock user for testing
@pytest.fixture
def mock_user():
    """Provide mock user for testing."""
    return {
        "id": 1,
        "username": "testuser",
        "email": "test@example.com",
        "is_active": True,
    }


# Mock dispute for testing
@pytest.fixture
def mock_dispute():
    """Provide mock dispute for testing."""
    return {
        "id": 1,
        "dispute_id": "DSP-12345",
        "customer_id": 1,
        "merchant_id": 1,
        "transaction_id": 1,
        "reason": "product_not_received",
        "amount": 99.99,
        "currency": "USD",
        "status": "open",
        "description": "Customer claims package never arrived",
    }


# Mock case file for testing
@pytest.fixture
def mock_case_file():
    """Provide mock case file for testing."""
    return {
        "id": 1,
        "case_file_id": "CF-ABC123",
        "dispute_id": 1,
        "status": "draft",
        "confidence_score": 0.85,
        "investigation_summary": "Test investigation summary",
        "generated_by": 1,
    }


# Mock evidence for testing
@pytest.fixture
def mock_evidence():
    """Provide mock evidence for testing."""
    return {
        "id": 1,
        "evidence_id": "EV-001",
        "case_file_id": 1,
        "evidence_type": "transaction",
        "source": "database",
        "title": "Transaction Record",
        "description": "Transaction details",
        "status": "validated",
    }


# Mock timeline event for testing
@pytest.fixture
def mock_timeline_event():
    """Provide mock timeline event for testing."""
    return {
        "id": 1,
        "event_id": "TE-001",
        "case_file_id": 1,
        "event_type": "payment_made",
        "event_date": "2024-06-01",
        "title": "Payment Made",
        "description": "Customer made payment",
        "chronological_order": 1,
    }


# Mock validation for testing
@pytest.fixture
def mock_validation():
    """Provide mock validation for testing."""
    return {
        "id": 1,
        "validation_id": "VL-001",
        "case_file_id": 1,
        "category": "missing_evidence",
        "severity": "warning",
        "description": "Missing receipt",
        "is_resolved": False,
    }


# Mock policy mapping for testing
@pytest.fixture
def mock_policy_mapping():
    """Provide mock policy mapping for testing."""
    return {
        "id": 1,
        "mapping_id": "PM-001",
        "case_file_id": 1,
        "policy_id": 1,
        "match_type": "semantic",
        "relevance_score": 0.85,
        "is_applicable": True,
    }


# Mock Groq API response
@pytest.fixture
def mock_groq_response():
    """Provide mock Groq API response for testing."""
    return {
        "id": "test-response-id",
        "choices": [
            {
                "message": {
                    "content": "Test investigation summary",
                    "role": "assistant"
                }
            }
        ],
        "usage": {
            "prompt_tokens": 100,
            "completion_tokens": 50,
            "total_tokens": 150
        }
    }


# Mock vector store results
@pytest.fixture
def mock_vector_results():
    """Provide mock vector store results for testing."""
    return [
        {
            "id": "policy-1",
            "score": 0.85,
            "metadata": {
                "policy_id": 1,
                "title": "Test Policy",
                "category": "refund"
            }
        },
        {
            "id": "policy-2",
            "score": 0.75,
            "metadata": {
                "policy_id": 2,
                "title": "Another Policy",
                "category": "dispute"
            }
        }
    ]


# Test client for FastAPI
@pytest.fixture
def test_client():
    """Provide test client for FastAPI application."""
    from fastapi.testclient import TestClient
    from app.main import app
    
    return TestClient(app)


# Authentication headers
@pytest.fixture
def auth_headers():
    """Provide authentication headers for testing."""
    return {
        "Authorization": "Bearer test-token",
        "Content-Type": "application/json"
    }


# Mock file upload
@pytest.fixture
def mock_file_upload():
    """Provide mock file upload for testing."""
    from io import BytesIO
    
    file_content = b"Test file content"
    file = BytesIO(file_content)
    file.name = "test_document.pdf"
    file.content_type = "application/pdf"
    
    return file


# Performance test configuration
@pytest.fixture
def performance_config():
    """Provide performance test configuration."""
    return {
        "max_response_time_ms": 1000,
        "max_memory_mb": 100,
        "max_cpu_percent": 80,
    }


# Skip external tests by default
def pytest_collection_modifyitems(config, items):
    """Modify test collection to skip external tests by default."""
    skip_external = config.getoption("--run-external", default=False)
    
    if not skip_external:
        skip_marker = pytest.mark.skip(reason="Skipping external tests (use --run-external to run)")
        for item in items:
            if "external" in item.keywords:
                item.add_marker(skip_marker)


def pytest_addoption(parser):
    """Add custom command line options."""
    parser.addoption(
        "--run-external",
        action="store_true",
        default=False,
        help="Run tests that require external services"
    )
    parser.addoption(
        "--skip-slow",
        action="store_true",
        default=False,
        help="Skip slow tests"
    )
