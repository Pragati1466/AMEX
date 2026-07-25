"""
API endpoints for policy mapping and semantic search.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.policy_service import PolicyService
from app.schemas.policy import (
    PolicyResponse,
    PolicyMappingResponse,
    PolicyMappingSummary,
    PolicyMappingListResponse,
    MapPoliciesRequest,
    MapPoliciesResponse,
    UpdatePolicyMappingRequest,
    VectorSearchResult,
    SemanticSearchRequest,
    SimilarCaseSearchRequest,
    IndexingStats,
    VectorStoreStats,
    VectorStoresStatsResponse,
)

router = APIRouter(prefix="/policy", tags=["Policy Mapping"])


# --------------- Policy Mapping Orchestration Endpoints ---------------

@router.post("/map", response_model=MapPoliciesResponse)
def map_policies(
    payload: MapPoliciesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger the Strategy & Policy Agent to map applicable policies
    and find similar historical cases using semantic search.

    Provide either case_file_id or dispute_id to identify the case.
    """
    service = PolicyService(db)

    # Determine which ID to use
    if payload.case_file_id:
        result = service.map_policies_for_case_file(
            case_file_id=payload.case_file_id,
            clear_existing=payload.clear_existing,
        )
    elif payload.dispute_id:
        result = service.map_policies_for_dispute(
            dispute_id=payload.dispute_id,
            clear_existing=payload.clear_existing,
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either case_file_id or dispute_id must be provided",
        )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case file or dispute not found",
        )

    return MapPoliciesResponse(
        success=True,
        message="Policy mapping completed successfully",
        **result,
    )


# --------------- Policy Mapping Retrieval Endpoints ---------------

@router.get("/case-file/{case_file_id}", response_model=PolicyMappingListResponse)
def get_policy_mappings(
    case_file_id: int,
    applicable_only: bool = False,
    match_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get policy mappings for a case file with optional filters.
    """
    service = PolicyService(db)
    mapping_data = service.get_policy_mappings_for_case_file(
        case_file_id=case_file_id,
        applicable_only=applicable_only,
        match_type=match_type,
    )

    return PolicyMappingListResponse(**mapping_data)


@router.get("/mapping/{mapping_id}", response_model=PolicyMappingResponse)
def get_policy_mapping(
    mapping_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a single policy mapping by ID.
    """
    service = PolicyService(db)
    mapping = service.get_policy_mapping(mapping_id)

    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Policy mapping {mapping_id} not found",
        )

    return PolicyMappingResponse(**mapping)


@router.put("/mapping/{mapping_id}", response_model=PolicyMappingResponse)
def update_policy_mapping(
    mapping_id: int,
    payload: UpdatePolicyMappingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update a policy mapping.
    """
    service = PolicyService(db)
    mapping = service.update_policy_mapping(
        mapping_id=mapping_id,
        relevance_score=payload.relevance_score,
        explanation=payload.explanation,
        is_applicable=payload.is_applicable,
    )

    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Policy mapping {mapping_id} not found",
        )

    return PolicyMappingResponse(**mapping)


@router.delete("/mapping/{mapping_id}")
def delete_policy_mapping(
    mapping_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a policy mapping.
    """
    service = PolicyService(db)
    success = service.delete_policy_mapping(mapping_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Policy mapping {mapping_id} not found",
        )

    return {"success": True, "message": f"Policy mapping {mapping_id} deleted"}


# --------------- Policy Retrieval Endpoints ---------------

@router.get("/policies", response_model=list[PolicyResponse])
def get_policies(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all policies from the repository.
    """
    service = PolicyService(db)
    policies = service.get_all_policies(active_only=active_only)

    return [PolicyResponse(**p) for p in policies]


@router.get("/policies/{policy_id}", response_model=PolicyResponse)
def get_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a policy by primary key.
    """
    service = PolicyService(db)
    policy = service.get_policy_by_id(policy_id)

    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Policy {policy_id} not found",
        )

    return PolicyResponse(**policy)


@router.get("/policies/type/{policy_type}", response_model=list[PolicyResponse])
def get_policies_by_type(
    policy_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get policies by type.
    """
    service = PolicyService(db)
    policies = service.get_policies_by_type(policy_type)

    return [PolicyResponse(**p) for p in policies]


@router.get("/policies/search/{keyword}", response_model=list[PolicyResponse])
def search_policies_by_keyword(
    keyword: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search policies by keyword.
    """
    service = PolicyService(db)
    policies = service.search_policies_by_keyword(keyword)

    return [PolicyResponse(**p) for p in policies]


# --------------- Vector Store Operations Endpoints ---------------

@router.post("/index-policies", response_model=IndexingStats)
def index_policies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Index all active policies into the vector store for semantic search.
    """
    service = PolicyService(db)
    stats = service.index_policies()

    return IndexingStats(**stats)


@router.post("/index-cases", response_model=IndexingStats)
def index_historical_cases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Index resolved historical disputes into the vector store for similarity search.
    """
    service = PolicyService(db)
    stats = service.index_historical_cases()

    return IndexingStats(**stats)


@router.get("/vector-store-stats", response_model=VectorStoresStatsResponse)
def get_vector_store_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get statistics for both vector stores.
    """
    service = PolicyService(db)
    stats = service.get_vector_store_stats()

    return VectorStoresStatsResponse(
        policy_vector_store=VectorStoreStats(**stats["policy_vector_store"]),
        case_vector_store=VectorStoreStats(**stats["case_vector_store"]),
    )


# --------------- Semantic Search Endpoints ---------------

@router.post("/search-policies", response_model=list[VectorSearchResult])
def search_policies_semantic(
    payload: SemanticSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search for policies using semantic similarity via vector store.
    """
    service = PolicyService(db)
    results = service.search_policies_semantic(
        query=payload.query,
        policy_type=payload.policy_type,
        category=payload.category,
        n_results=payload.n_results,
    )

    return [VectorSearchResult(**r) for r in results]


@router.post("/search-similar-cases", response_model=list[VectorSearchResult])
def search_similar_cases(
    payload: SimilarCaseSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search for similar historical cases using semantic similarity.
    """
    service = PolicyService(db)
    results = service.search_similar_cases(
        query=payload.query,
        reason=payload.reason,
        n_results=payload.n_results,
    )

    return [VectorSearchResult(**r) for r in results]
