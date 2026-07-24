"""Module 3 resolution agents."""

from app.agents.resolution.dashboard_agent import LiveFairnessDashboardAgent
from app.agents.resolution.evidence_recommendation_agent import SmartEvidenceRecommendationAgent
from app.agents.resolution.rescoring_agent import RealTimeRescoringAgent
from app.agents.resolution.resolution_agent import ResolutionAgent

__all__ = [
    "LiveFairnessDashboardAgent",
    "SmartEvidenceRecommendationAgent",
    "RealTimeRescoringAgent",
    "ResolutionAgent",
]
