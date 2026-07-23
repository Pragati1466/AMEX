"""
Pydantic schemas for policy mapping and semantic search.
"""

from datetime import datetime, date
from typing import Optional, List, Any, Dict

from pydantic import BaseModel, Field


class PolicyResponse(BaseModel):
    """Response schema for a policy document."""

    id: int
    policy_id: str
    title: str
    content: str
    policy_type: str
    effective_date: Optional[str] = None
    expiry_date: Optional[str] = None
    version: Optional[str] = None
    is_active: bool
    category: Optional[str] = None
    tags: List[str] = []
    source_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PolicyMappingResponse(BaseModel):
    """Response schema for a policy mapping."""

    id: int
    mapping_id: str
    case_file_id: int
    policy_id: int
    match_type: str
    relevance_score: Optional[float] = None
    matched_text: Optional[str] = None
    explanation: Optional[str] = None
    evidence_id: Optional[int] = None
    evidence_type: Optional[str] = None
    similar_dispute_id: Optional[int] = None
    similarity_score: Optional[float] = None
    is_applicable: bool
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PolicyMappingSummary(BaseModel):
    """Policy mapping summary statistics."""

    total: int
    applicable: int
    not_applicable: int
    by_match_type: Dict[str, int] = {}
    average_relevance: float = 0.0


class PolicyMappingListResponse(BaseModel):
    """Response containing a list of policy mappings."""

    case_file_id: int
    mappings: List[PolicyMappingResponse] = []
    summary: PolicyMappingSummary


class MapPoliciesRequest(BaseModel):
    """Request to trigger policy mapping."""

    case_file_id: Optional[int] = Field(None, description="Primary key of the case file")
    dispute_id: Optional[int] = Field(None, description="Primary key of the dispute")
    clear_existing: bool = Field(True, description="Clear existing mappings first")


class MapPoliciesResponse(BaseModel):
    """Response after policy mapping is triggered."""

    success: bool
    message: str
    case_file_id: Optional[int] = None
    case_file_ref: Optional[str] = None
    policy_mapping_completed: bool = False
    total_mappings: int = 0
    applicable: int = 0
    not_applicable: int = 0
    by_match_type: Dict[str, int] = {}
    average_relevance: float = 0.0


class UpdatePolicyMappingRequest(BaseModel):
    """Request to update a policy mapping."""

    relevance_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Relevance score (0.0 to 1.0)")
    explanation: Optional[str] = Field(None, description="Explanation for the mapping")
    is_applicable: Optional[bool] = Field(None, description="Whether the policy is applicable")


class VectorSearchResult(BaseModel):
    """Result from vector similarity search."""

    id: str
    content: str
    metadata: Dict[str, Any] = {}
    score: float
    distance: Optional[float] = None


class SemanticSearchRequest(BaseModel):
    """Request for semantic policy search."""

    query: str = Field(..., min_length=1, description="Search query")
    policy_type: Optional[str] = Field(None, description="Filter by policy type")
    category: Optional[str] = Field(None, description="Filter by category")
    n_results: int = Field(5, ge=1, le=20, description="Number of results")


class SimilarCaseSearchRequest(BaseModel):
    """Request for similar historical case search."""

    query: str = Field(..., min_length=1, description="Search query")
    reason: Optional[str] = Field(None, description="Filter by dispute reason")
    n_results: int = Field(5, ge=1, le=20, description="Number of results")


class IndexingStats(BaseModel):
    """Statistics for vector store indexing."""

    indexed: int
    failed: int
    total: int


class VectorStoreStats(BaseModel):
    """Statistics for a vector store."""

    available: bool
    document_count: int
    collection_name: str
    embedding_model: Optional[str] = None
    embedding_available: bool = False
    error: Optional[str] = None


class VectorStoresStatsResponse(BaseModel):
    """Statistics for both vector stores."""

    policy_vector_store: VectorStoreStats
    case_vector_store: VectorStoreStats
