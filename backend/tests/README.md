# Testing Infrastructure for DisputeIQ

This directory contains comprehensive tests for the DisputeIQ investigation system.

## Test Structure

```
tests/
├── conftest.py                 # Pytest configuration and fixtures
├── unit/                       # Unit tests for individual components
│   ├── test_evidence_agent.py  # Evidence Collection Agent tests
│   ├── test_timeline_agent.py  # Timeline Agent tests
│   ├── test_validation_agent.py # Validation Agent tests
│   ├── test_policy_agent.py    # Policy Agent tests
│   ├── test_case_file_agent.py # Case File Agent tests
│   └── test_investigation_workflow.py # Investigation Workflow tests
├── integration/                # Integration tests for API endpoints
│   ├── test_evidence_api.py    # Evidence API tests
│   ├── test_timeline_api.py    # Timeline API tests
│   ├── test_validation_api.py  # Validation API tests
│   ├── test_policy_api.py      # Policy API tests
│   ├── test_case_file_api.py   # Case File API tests
│   └── test_investigation_api.py # Investigation API tests
└── e2e/                        # End-to-end tests for complete workflows
    └── test_complete_investigation.py # Complete investigation workflow test
```

## Running Tests

### Run all tests
```bash
pytest
```

### Run specific test category
```bash
# Unit tests only
pytest -m unit

# Integration tests only
pytest -m integration

# End-to-end tests only
pytest -m e2e
```

### Run specific test file
```bash
pytest tests/unit/test_evidence_agent.py
```

### Run with coverage
```bash
pytest --cov=app --cov-report=html
```

### Run external tests (requires external services)
```bash
pytest --run-external
```

### Skip slow tests
```bash
pytest --skip-slow
```

## Test Categories

### Unit Tests
- Test individual components in isolation
- Use mock objects and fixtures
- Fast execution
- No external dependencies

### Integration Tests
- Test API endpoints
- Test database interactions
- Test external service integrations
- Medium execution time

### End-to-End Tests
- Test complete workflows
- Test system integration
- Test real-world scenarios
- Longer execution time

## Test Markers

- `@pytest.mark.unit` - Unit tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.e2e` - End-to-end tests
- `@pytest.mark.slow` - Slow tests
- `@pytest.mark.external` - Tests requiring external services

## Fixtures

Available fixtures in `conftest.py`:
- `test_db` - Test database session
- `mock_user` - Mock user object
- `mock_dispute` - Mock dispute object
- `mock_case_file` - Mock case file object
- `mock_evidence` - Mock evidence object
- `mock_timeline_event` - Mock timeline event
- `mock_validation` - Mock validation object
- `mock_policy_mapping` - Mock policy mapping
- `mock_groq_response` - Mock Groq API response
- `mock_vector_results` - Mock vector store results
- `test_client` - FastAPI test client
- `auth_headers` - Authentication headers
- `mock_file_upload` - Mock file upload

## Coverage Goals

- Overall coverage: 80%
- Critical components: 90%
- Agents: 85%
- API endpoints: 80%
- Services: 85%

## Continuous Integration

Tests are run automatically on:
- Every commit
- Pull requests
- Daily schedule

## Postman Collection

Postman collection for API testing is available at:
`postman/DisputeIQ_API_Collection.json`

Import into Postman to test API endpoints manually.

## FastAPI Documentation

Interactive API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
