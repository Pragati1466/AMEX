"""
Vector Database Setup with ChromaDB and Sentence Transformers.
Provides semantic search capabilities for policy and historical case matching.
"""

import os
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

from loguru import logger
from app.core.config import settings

try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False
    logger.warning("sentence-transformers not available. Install with: pip install sentence-transformers")

try:
    import chromadb
    from chromadb.config import Settings
    HAS_CHROMADB = True
except ImportError:
    HAS_CHROMADB = False
    logger.warning("chromadb not available. Install with: pip install chromadb")


@dataclass
class SearchResult:
    """Structured output from vector similarity search."""
    id: str
    content: str
    metadata: Dict[str, Any]
    score: float
    distance: Optional[float] = None


class VectorStore:
    """
    Vector database client using ChromaDB and Sentence Transformers.
    Provides semantic search for policies and historical cases.
    """

    def __init__(
        self,
        collection_name: str = "policies",
        model_name: str = "all-MiniLM-L6-v2",
        persist_directory: Optional[str] = None,
    ):
        """
        Initialize the vector store.

        Args:
            collection_name: Name of the ChromaDB collection
            model_name: Sentence Transformer model name
            persist_directory: Directory to persist ChromaDB data
        """
        self.collection_name = collection_name
        self.model_name = model_name
        self.persist_directory = persist_directory or settings.CHROMA_PERSIST_DIR
        self.client = None
        self.collection = None
        self.embedding_model = None

        self._initialize_chromadb()
        self._initialize_embedding_model()

    def _initialize_chromadb(self) -> None:
        """Initialize ChromaDB client and collection."""
        if not HAS_CHROMADB:
            logger.error("ChromaDB not available - vector search will be disabled")
            return

        try:
            # Create persist directory if it doesn't exist
            os.makedirs(self.persist_directory, exist_ok=True)

            # Initialize ChromaDB client
            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True,
                )
            )

            # Get or create collection
            self.collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"description": "Policy and historical case embeddings"}
            )

            logger.info(f"ChromaDB initialized with collection: {self.collection_name}")

        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            self.client = None
            self.collection = None

    def _initialize_embedding_model(self) -> None:
        """Initialize Sentence Transformer model."""
        if not HAS_SENTENCE_TRANSFORMERS:
            logger.error("Sentence Transformers not available - using fallback embedding")
            return

        try:
            self.embedding_model = SentenceTransformer(self.model_name)
            logger.info(f"Embedding model loaded: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            self.embedding_model = None

    def is_available(self) -> bool:
        """Check if vector store is available."""
        return HAS_CHROMADB and self.client is not None and self.collection is not None

    def is_embedding_available(self) -> bool:
        """Check if embedding model is available."""
        return HAS_SENTENCE_TRANSFORMERS and self.embedding_model is not None

    def add_documents(
        self,
        documents: List[str],
        ids: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None,
    ) -> bool:
        """
        Add documents to the vector store.

        Args:
            documents: List of document texts
            ids: List of unique document IDs
            metadatas: Optional list of metadata dictionaries

        Returns:
            True if successful, False otherwise.
        """
        if not self.is_available():
            logger.warning("Vector store not available - cannot add documents")
            return False

        if not self.is_embedding_available():
            logger.warning("Embedding model not available - cannot add documents")
            return False

        if len(documents) != len(ids):
            logger.error("Documents and IDs must have the same length")
            return False

        if metadatas and len(metadatas) != len(documents):
            logger.error("Metadatas must have the same length as documents")
            return False

        try:
            # Generate embeddings
            embeddings = self.embedding_model.encode(
                documents,
                show_progress_bar=False,
                convert_to_numpy=True
            )

            # Add to collection
            self.collection.add(
                documents=documents,
                ids=ids,
                embeddings=embeddings.tolist(),
                metadatas=metadatas or [{}] * len(documents)
            )

            logger.info(f"Added {len(documents)} documents to vector store")
            return True

        except Exception as e:
            logger.error(f"Failed to add documents to vector store: {e}")
            return False

    def search(
        self,
        query: str,
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, Any]] = None,
    ) -> List[SearchResult]:
        """
        Search for similar documents using semantic similarity.

        Args:
            query: Search query text
            n_results: Number of results to return
            where: Optional metadata filter
            where_document: Optional document content filter

        Returns:
            List of SearchResult objects.
        """
        if not self.is_available():
            logger.warning("Vector store not available - returning empty results")
            return []

        if not self.is_embedding_available():
            logger.warning("Embedding model not available - returning empty results")
            return []

        try:
            # Generate query embedding
            query_embedding = self.embedding_model.encode(
                [query],
                show_progress_bar=False,
                convert_to_numpy=True
            )

            # Search collection
            results = self.collection.query(
                query_embeddings=query_embedding.tolist(),
                n_results=n_results,
                where=where,
                where_document=where_document,
            )

            # Convert to SearchResult objects
            search_results = []
            if results['ids'] and results['ids'][0]:
                for i, doc_id in enumerate(results['ids'][0]):
                    search_results.append(SearchResult(
                        id=doc_id,
                        content=results['documents'][0][i],
                        metadata=results['metadatas'][0][i] if results['metadatas'] else {},
                        score=1.0 - results['distances'][0][i] if results['distances'] else 0.0,
                        distance=results['distances'][0][i] if results['distances'] else None,
                    ))

            logger.info(f"Found {len(search_results)} results for query: {query[:50]}...")
            return search_results

        except Exception as e:
            logger.error(f"Failed to search vector store: {e}")
            return []

    def delete_documents(self, ids: List[str]) -> bool:
        """
        Delete documents from the vector store.

        Args:
            ids: List of document IDs to delete

        Returns:
            True if successful, False otherwise.
        """
        if not self.is_available():
            logger.warning("Vector store not available - cannot delete documents")
            return False

        try:
            self.collection.delete(ids=ids)
            logger.info(f"Deleted {len(ids)} documents from vector store")
            return True

        except Exception as e:
            logger.error(f"Failed to delete documents from vector store: {e}")
            return False

    def get_document(self, id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific document by ID.

        Args:
            id: Document ID

        Returns:
            Dict with document data, or None if not found.
        """
        if not self.is_available():
            return None

        try:
            results = self.collection.get(ids=[id])
            if results['ids'] and results['ids'][0]:
                return {
                    'id': results['ids'][0],
                    'content': results['documents'][0][0] if results['documents'] else None,
                    'metadata': results['metadatas'][0][0] if results['metadatas'] else {},
                }
            return None

        except Exception as e:
            logger.error(f"Failed to get document from vector store: {e}")
            return None

    def update_document(
        self,
        id: str,
        document: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Update a document in the vector store.

        Args:
            id: Document ID
            document: New document content (optional)
            metadata: New metadata (optional)

        Returns:
            True if successful, False otherwise.
        """
        if not self.is_available():
            logger.warning("Vector store not available - cannot update document")
            return False

        if not self.is_embedding_available():
            logger.warning("Embedding model not available - cannot update document")
            return False

        try:
            update_data = {}

            if document:
                embedding = self.embedding_model.encode(
                    [document],
                    show_progress_bar=False,
                    convert_to_numpy=True
                )
                update_data['embeddings'] = embedding.tolist()
                update_data['documents'] = [document]

            if metadata:
                update_data['metadatas'] = [metadata]

            if update_data:
                self.collection.update(ids=[id], **update_data)
                logger.info(f"Updated document {id} in vector store")
                return True

            return False

        except Exception as e:
            logger.error(f"Failed to update document in vector store: {e}")
            return False

    def clear_collection(self) -> bool:
        """
        Clear all documents from the collection.

        Returns:
            True if successful, False otherwise.
        """
        if not self.is_available():
            logger.warning("Vector store not available - cannot clear collection")
            return False

        try:
            # Delete the collection and recreate it
            self.client.delete_collection(name=self.collection_name)
            self.collection = self.client.create_collection(
                name=self.collection_name,
                metadata={"description": "Policy and historical case embeddings"}
            )
            logger.info(f"Cleared collection: {self.collection_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to clear collection: {e}")
            return False

    def get_collection_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the collection.

        Returns:
            Dict with collection statistics.
        """
        if not self.is_available():
            return {
                "available": False,
                "document_count": 0,
                "collection_name": self.collection_name,
            }

        try:
            count = self.collection.count()
            return {
                "available": True,
                "document_count": count,
                "collection_name": self.collection_name,
                "embedding_model": self.model_name,
                "embedding_available": self.is_embedding_available(),
            }

        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {
                "available": False,
                "document_count": 0,
                "collection_name": self.collection_name,
                "error": str(e),
            }


class PolicyVectorStore(VectorStore):
    """Specialized vector store for policy documents."""

    def __init__(self):
        super().__init__(
            collection_name="policies",
            model_name="all-MiniLM-L6-v2",
            persist_directory=os.path.join(settings.CHROMA_PERSIST_DIR, "policies"),
        )

    def add_policy(
        self,
        policy_id: str,
        title: str,
        content: str,
        policy_type: str,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Add a policy document to the vector store.

        Args:
            policy_id: Unique policy identifier
            title: Policy title
            content: Policy content text
            policy_type: Type of policy (refund_policy, dispute_resolution, etc.)
            category: Policy category
            tags: List of tags
            metadata: Additional metadata

        Returns:
            True if successful, False otherwise.
        """
        # Combine title and content for better search
        full_text = f"{title}\n\n{content}"

        # Build metadata
        policy_metadata = {
            "policy_id": policy_id,
            "title": title,
            "policy_type": policy_type,
            "category": category or "general",
            "tags": tags or [],
            "document_type": "policy",
        }

        if metadata:
            policy_metadata.update(metadata)

        return self.add_documents(
            documents=[full_text],
            ids=[policy_id],
            metadatas=[policy_metadata],
        )

    def search_policies(
        self,
        query: str,
        policy_type: Optional[str] = None,
        category: Optional[str] = None,
        n_results: int = 5,
    ) -> List[SearchResult]:
        """
        Search for policies with optional filters.

        Args:
            query: Search query
            policy_type: Filter by policy type
            category: Filter by category
            n_results: Number of results

        Returns:
            List of SearchResult objects.
        """
        where = {"document_type": "policy"}

        if policy_type:
            where["policy_type"] = policy_type

        if category:
            where["category"] = category

        return self.search(query=query, n_results=n_results, where=where)


class HistoricalCaseVectorStore(VectorStore):
    """Specialized vector store for historical dispute cases."""

    def __init__(self):
        super().__init__(
            collection_name="historical_cases",
            model_name="all-MiniLM-L6-v2",
            persist_directory=os.path.join(settings.CHROMA_PERSIST_DIR, "historical_cases"),
        )

    def add_case(
        self,
        dispute_id: str,
        description: str,
        reason: str,
        amount: float,
        outcome: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Add a historical dispute case to the vector store.

        Args:
            dispute_id: Unique dispute identifier
            description: Dispute description
            reason: Dispute reason
            amount: Dispute amount
            outcome: Case outcome
            metadata: Additional metadata

        Returns:
            True if successful, False otherwise.
        """
        # Combine fields for better search
        full_text = f"Reason: {reason}\nDescription: {description}\nAmount: {amount}"

        if outcome:
            full_text += f"\nOutcome: {outcome}"

        # Build metadata
        case_metadata = {
            "dispute_id": dispute_id,
            "reason": reason,
            "amount": float(amount),
            "outcome": outcome or "unknown",
            "document_type": "historical_case",
        }

        if metadata:
            case_metadata.update(metadata)

        return self.add_documents(
            documents=[full_text],
            ids=[dispute_id],
            metadatas=[case_metadata],
        )

    def search_similar_cases(
        self,
        query: str,
        reason: Optional[str] = None,
        min_amount: Optional[float] = None,
        max_amount: Optional[float] = None,
        n_results: int = 5,
    ) -> List[SearchResult]:
        """
        Search for similar historical cases.

        Args:
            query: Search query
            reason: Filter by dispute reason
            min_amount: Minimum amount filter
            max_amount: Maximum amount filter
            n_results: Number of results

        Returns:
            List of SearchResult objects.
        """
        where = {"document_type": "historical_case"}

        if reason:
            where["reason"] = reason

        # Note: ChromaDB doesn't support numeric range filters directly
        # This would need additional filtering after search

        return self.search(query=query, n_results=n_results, where=where)
