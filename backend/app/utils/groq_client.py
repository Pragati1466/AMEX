"""
Groq API Client for AI-powered validation suggestions.
Provides intelligent recommendations for evidence validation issues.
"""

import os
from typing import Optional, Dict, List, Any
from dataclasses import dataclass

from loguru import logger
from app.core.config import settings

try:
    from groq import Groq
    HAS_GROQ = True
except ImportError:
    HAS_GROQ = False
    logger.warning("Groq library not available. AI suggestions will use rule-based fallback.")


@dataclass
class ValidationSuggestion:
    """Structured output from AI-powered validation suggestions."""
    suggestion: str
    priority: str  # high, medium, low
    action_items: List[str]
    confidence: float


class GroqClient:
    """
    Client for interacting with Groq API for intelligent validation suggestions.
    Supports multiple models: Llama 3.3 70B, Llama 4 Scout, Qwen.
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "llama-3.3-70b-versatile"):
        """
        Initialize the Groq client.

        Args:
            api_key: Groq API key (defaults to settings.GROQ_API_KEY)
            model: Model to use for generation
        """
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model = model
        self.client = None

        if HAS_GROQ and self.api_key:
            try:
                self.client = Groq(api_key=self.api_key)
                logger.info(f"Groq client initialized with model: {model}")
            except Exception as e:
                logger.error(f"Failed to initialize Groq client: {e}")
                self.client = None
        else:
            logger.warning("Groq client not available - using rule-based fallback")

    def is_available(self) -> bool:
        """Check if Groq API is available."""
        return HAS_GROQ and self.client is not None and self.api_key is not None

    def generate_validation_suggestion(
        self,
        validation_type: str,
        context: Dict[str, Any],
        evidence_summary: Optional[str] = None,
    ) -> ValidationSuggestion:
        """
        Generate an AI-powered suggestion for a validation issue.

        Args:
            validation_type: Type of validation (missing_evidence, contradiction, etc.)
            context: Context about the validation issue
            evidence_summary: Summary of available evidence

        Returns:
            ValidationSuggestion with AI-generated recommendation
        """
        if not self.is_available():
            return self._generate_rule_based_suggestion(validation_type, context)

        try:
            prompt = self._build_validation_prompt(
                validation_type, context, evidence_summary
            )

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert payment dispute investigator. Provide clear, actionable suggestions for evidence validation issues. Focus on practical steps investigators can take to resolve issues.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=500,
            )

            suggestion_text = response.choices[0].message.content
            return self._parse_ai_response(suggestion_text)

        except Exception as e:
            logger.error(f"Groq API call failed: {e}")
            return self._generate_rule_based_suggestion(validation_type, context)

    def _build_validation_prompt(
        self,
        validation_type: str,
        context: Dict[str, Any],
        evidence_summary: Optional[str] = None,
    ) -> str:
        """Build the prompt for Groq API."""
        prompt = f"""
Validation Type: {validation_type}

Issue Details:
{context.get('detail', 'No additional details provided')}

Current Evidence:
{evidence_summary or 'No evidence summary available'}

Severity: {context.get('severity', 'unknown')}

Please provide:
1. A clear, actionable suggestion to resolve this issue
2. Priority level (high/medium/low)
3. Specific action items the investigator should take
4. Your confidence in this recommendation (0.0 to 1.0)

Format your response as:
Suggestion: [your suggestion]
Priority: [high/medium/low]
Action Items:
- [item 1]
- [item 2]
- [item 3]
Confidence: [0.0-1.0]
"""
        return prompt

    def _parse_ai_response(self, response_text: str) -> ValidationSuggestion:
        """Parse the AI response into structured format."""
        try:
            lines = response_text.strip().split('\n')
            suggestion = ""
            priority = "medium"
            action_items = []
            confidence = 0.7

            current_section = None

            for line in lines:
                line = line.strip()
                if line.startswith("Suggestion:"):
                    suggestion = line.replace("Suggestion:", "").strip()
                    current_section = "suggestion"
                elif line.startswith("Priority:"):
                    priority = line.replace("Priority:", "").strip().lower()
                elif line.startswith("Action Items:"):
                    current_section = "action_items"
                elif line.startswith("-") and current_section == "action_items":
                    action_items.append(line.replace("-", "").strip())
                elif line.startswith("Confidence:"):
                    confidence = float(line.replace("Confidence:", "").strip())
                elif current_section == "suggestion" and line:
                    suggestion += " " + line

            # Ensure we have at least some action items
            if not action_items:
                action_items = [suggestion]

            return ValidationSuggestion(
                suggestion=suggestion,
                priority=priority,
                action_items=action_items,
                confidence=confidence,
            )

        except Exception as e:
            logger.error(f"Failed to parse AI response: {e}")
            return ValidationSuggestion(
                suggestion=response_text,
                priority="medium",
                action_items=[response_text],
                confidence=0.5,
            )

    def _generate_rule_based_suggestion(
        self, validation_type: str, context: Dict[str, Any]
    ) -> ValidationSuggestion:
        """Generate rule-based suggestions when Groq is unavailable."""
        suggestions = {
            "missing_evidence": ValidationSuggestion(
                suggestion="Contact the relevant data source to obtain the missing evidence. Check if the evidence exists in alternative systems or formats.",
                priority="high",
                action_items=[
                    "Contact the data provider for missing records",
                    "Check backup systems or archives",
                    "Request manual upload if automated collection failed",
                    "Document why evidence is unavailable if it cannot be obtained",
                ],
                confidence=0.8,
            ),
            "contradiction": ValidationSuggestion(
                suggestion="Verify the conflicting information by checking original source documents. Contact the data provider to resolve discrepancies.",
                priority="high",
                action_items=[
                    "Review original source documents for both conflicting items",
                    "Contact the data provider to verify accuracy",
                    "Check for data entry errors or system issues",
                    "Document the resolution once verified",
                ],
                confidence=0.7,
            ),
            "incomplete_submission": ValidationSuggestion(
                suggestion="Update the evidence record with missing information. If information is unavailable, document the reason.",
                priority="medium",
                action_items=[
                    "Fill in missing fields from available sources",
                    "Contact the submitter for additional information",
                    "Document why certain fields cannot be completed",
                    "Consider if the evidence is sufficient despite being incomplete",
                ],
                confidence=0.6,
            ),
            "timeline_gap": ValidationSuggestion(
                suggestion="Investigate whether evidence is missing for the time period or if the gap is expected.",
                priority="medium",
                action_items=[
                    "Check if evidence exists for the gap period",
                    "Verify if the gap is normal for this type of transaction",
                    "Request additional documentation if needed",
                    "Document the explanation for the timeline gap",
                ],
                confidence=0.5,
            ),
            "format_issue": ValidationSuggestion(
                suggestion="Fix the format issue to ensure the evidence can be properly processed and analyzed.",
                priority="low",
                action_items=[
                    "Convert the evidence to a supported format",
                    "Re-upload the file in the correct format",
                    "Verify the file is not corrupted",
                    "Check file size and type requirements",
                ],
                confidence=0.7,
            ),
        }

        return suggestions.get(
            validation_type,
            ValidationSuggestion(
                suggestion="Review the validation issue and take appropriate action based on the details provided.",
                priority="medium",
                action_items=["Review the issue details", "Take appropriate corrective action"],
                confidence=0.5,
            ),
        )

    def generate_batch_suggestions(
        self, validations: List[Dict[str, Any]], evidence_summary: str
    ) -> List[ValidationSuggestion]:
        """
        Generate suggestions for multiple validation issues in batch.

        Args:
            validations: List of validation dictionaries
            evidence_summary: Summary of available evidence

        Returns:
            List of ValidationSuggestion objects
        """
        suggestions = []

        for validation in validations:
            suggestion = self.generate_validation_suggestion(
                validation_type=validation.get("category", "unknown"),
                context=validation,
                evidence_summary=evidence_summary,
            )
            suggestions.append(suggestion)

        return suggestions

    def analyze_evidence_completeness(
        self, evidence_summary: str, dispute_context: str
    ) -> Dict[str, Any]:
        """
        Analyze overall evidence completeness using AI.

        Args:
            evidence_summary: Summary of collected evidence
            dispute_context: Context about the dispute

        Returns:
            Dict with completeness analysis and recommendations
        """
        if not self.is_available():
            return {
                "completeness_score": 0.5,
                "analysis": "Rule-based analysis: Standard evidence collection performed",
                "recommendations": [
                    "Ensure all required evidence types are collected",
                    "Verify evidence quality and completeness",
                    "Check for any contradictions or gaps",
                ],
            }

        try:
            prompt = f"""
Evidence Summary:
{evidence_summary}

Dispute Context:
{dispute_context}

Please analyze the evidence completeness and provide:
1. A completeness score (0.0 to 1.0)
2. Overall analysis of the evidence quality
3. Specific recommendations for improvement

Format your response as:
Completeness Score: [0.0-1.0]
Analysis: [your analysis]
Recommendations:
- [recommendation 1]
- [recommendation 2]
- [recommendation 3]
"""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert payment dispute investigator. Analyze evidence completeness and provide actionable recommendations.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.5,
                max_tokens=600,
            )

            response_text = response.choices[0].message.content
            return self._parse_completeness_response(response_text)

        except Exception as e:
            logger.error(f"Groq completeness analysis failed: {e}")
            return {
                "completeness_score": 0.5,
                "analysis": "Analysis unavailable due to API error",
                "recommendations": ["Review evidence manually for completeness"],
            }

    def generate_investigation_summary(self, context: str) -> str:
        """
        Generate an investigation summary using AI.

        Args:
            context: Investigation context including dispute details, evidence, timeline, etc.

        Returns:
            Generated investigation summary text.
        """
        if not self.is_available():
            return "AI summary generation unavailable - use rule-based summary"

        try:
            prompt = f"""
Investigation Context:
{context}

Please generate a concise investigation summary that includes:
1. Brief overview of the dispute
2. Key findings from evidence
3. Timeline highlights
4. Validation issues (if any)
5. Applicable policies
6. Overall confidence assessment

Keep the summary professional and focused on facts. Limit to 300 words.
"""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert payment dispute investigator. Generate clear, factual investigation summaries.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=500,
            )

            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"Groq investigation summary generation failed: {e}")
            return "AI summary generation failed - review investigation details manually"

    def _parse_completeness_response(self, response_text: str) -> Dict[str, Any]:
        """Parse the completeness analysis response."""
        try:
            lines = response_text.strip().split('\n')
            completeness_score = 0.5
            analysis = ""
            recommendations = []

            current_section = None

            for line in lines:
                line = line.strip()
                if line.startswith("Completeness Score:"):
                    completeness_score = float(
                        line.replace("Completeness Score:", "").strip()
                    )
                elif line.startswith("Analysis:"):
                    analysis = line.replace("Analysis:", "").strip()
                    current_section = "analysis"
                elif line.startswith("Recommendations:"):
                    current_section = "recommendations"
                elif line.startswith("-") and current_section == "recommendations":
                    recommendations.append(line.replace("-", "").strip())
                elif current_section == "analysis" and line:
                    analysis += " " + line

            return {
                "completeness_score": completeness_score,
                "analysis": analysis,
                "recommendations": recommendations,
            }

        except Exception as e:
            logger.error(f"Failed to parse completeness response: {e}")
            return {
                "completeness_score": 0.5,
                "analysis": response_text,
                "recommendations": [],
            }
