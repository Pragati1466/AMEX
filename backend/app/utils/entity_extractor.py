"""
Entity Extraction Utility.
Extracts structured information (merchant, amount, date, IDs) from raw text
using spaCy NER and regex patterns.

Supports:
  - Merchant name extraction (NER + regex indicators)
  - Amount and currency extraction (multiple formats)
  - Date extraction and ISO normalization (multiple formats)
  - Transaction ID, Order ID, Invoice number extraction
  - Email and phone extraction
  - Customer name extraction
  - Confidence scoring for each entity
  - Deduplication and priority-based field selection

This is the core NLP layer consumed by:
  - EntityExtractionService
  - EvidenceCollectionAgent (auto-extraction during collection)
  - API layer via POST /evidence/extract
"""

import re
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional

from loguru import logger

# spaCy
try:
    import spacy
    HAS_SPACY = True
    _nlp = None
except ImportError:
    HAS_SPACY = False
    _nlp = None
    logger.warning("spaCy not available. Entity extraction will use regex only.")


# --------------- Data Structures ---------------

@dataclass
class ExtractedEntities:
    """Structured output of entity extraction with confidence scores."""
    merchant_name: Optional[str] = None
    merchant_confidence: float = 0.0
    customer_name: Optional[str] = None
    amount: Optional[float] = None
    amount_confidence: float = 0.0
    currency: Optional[str] = None
    transaction_id: Optional[str] = None
    order_id: Optional[str] = None
    date: Optional[str] = None
    date_iso: Optional[str] = None
    date_confidence: float = 0.0
    email: Optional[str] = None
    phone: Optional[str] = None
    invoice_number: Optional[str] = None

    # All found values (deduplicated, for downstream use)
    all_merchants: list[str] = field(default_factory=list)
    all_amounts: list[float] = field(default_factory=list)
    all_dates: list[str] = field(default_factory=list)
    all_transaction_ids: list[str] = field(default_factory=list)
    all_order_ids: list[str] = field(default_factory=list)
    all_invoice_numbers: list[str] = field(default_factory=list)

    # Raw spaCy NER entities (for debugging / transparency)
    raw_entities: list[dict] = field(default_factory=list)

    # Overall extraction metadata
    extraction_confidence: float = 0.0
    extraction_method: str = "regex_only"

    def to_dict(self) -> dict:
        return asdict(self)


# --------------- spaCy Initialization ---------------

def _get_nlp():
    """Lazy-load the spaCy model."""
    global _nlp
    if _nlp is None and HAS_SPACY:
        try:
            _nlp = spacy.load("en_core_web_sm")
            logger.debug("Loaded spaCy model: en_core_web_sm")
        except OSError:
            logger.error(
                "spaCy model 'en_core_web_sm' not found. "
                "Run: python -m spacy download en_core_web_sm"
            )
            return None
    return _nlp


# --------------- Constants ---------------

# Currency symbols -> ISO codes
CURRENCY_MAP = {
    "$": "USD", "€": "EUR", "£": "GBP", "¥": "JPY",
    "₹": "INR", "₩": "KRW", "₽": "RUB", "₱": "PHP",
    "R$": "BRL", "A$": "AUD", "C$": "CAD", "HK$": "HKD",
    "S$": "SGD", "NT$": "TWD", "CHF": "CHF",
}

MONTH_NAMES = {
    "jan": 1, "january": 1, "feb": 2, "february": 2,
    "mar": 3, "march": 3, "apr": 4, "april": 4,
    "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}


# --------------- Regex Patterns ---------------

# --- Amounts ---
# Pattern 1: symbol + number (e.g., ₹4999, $199.99)
# Pattern 2: number + currency code (e.g., 199.99 USD)
AMOUNT_RE = re.compile(
    r'(?:'
    r'([₹$€£¥₩₽₱AUCNSHKR]+)\s*([\d,]+(?:\.\d{1,2})?)'  # symbol before
    r'|'
    r'([\d,]+(?:\.\d{1,2})?)\s*(USD|EUR|GBP|INR|JPY|KRW|RUB|PHP|BRL|AUD|CAD|HKD|SGD|TWD|CHF)'  # code after
    r')'
)

# --- Transaction IDs ---
TXN_ID_RE = re.compile(
    r'(?:TXN|TX|TRX|TRANS|REF)[-_]?(\d{4,})',
    re.IGNORECASE
)

# --- Order IDs ---
ORDER_ID_RE = re.compile(
    r'(?:ORD|ORDER|PO)[-_]?\s*(\d{4,})',
    re.IGNORECASE
)

# --- Invoice numbers ---
# Handles: INV-12345, Invoice #12345, INV12345, Invoice No. 12345
INVOICE_RE = re.compile(
    r'(?:INV|INVOICE)[-_\s#]*(?:NO|NUMBER|#)?[-_\s]*([A-Za-z0-9]{4,})',
    re.IGNORECASE
)

# --- Emails ---
EMAIL_RE = re.compile(r'[\w.+-]+@[\w-]+\.[\w.]+')

# --- Phone numbers ---
PHONE_RE = re.compile(
    r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}'
)

# --- Date patterns (ordered by specificity) ---
# 1. ISO format: 2024-06-23
# 2. "23 June 2024", "23rd June 2024"
# 3. "June 23, 2024", "June 23 2024"
# 4. "23/06/2024" or "06/23/2024"
# 5. "23-06-2024"
# 6. "23 Jun 2024"
# 7. "Jun 23, 2024"
DATE_PATTERNS = [
    # (pattern, format_type)
    re.compile(r'(\d{4})-(\d{2})-(\d{2})'),  # ISO
    re.compile(
        r'(\d{1,2})(?:st|nd|rd|th)?\s+'
        r'(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|'
        r'Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
        r'\s+(\d{4})',
        re.IGNORECASE
    ),
    re.compile(
        r'(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|'
        r'Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
        r'\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})',
        re.IGNORECASE
    ),
    re.compile(r'(\d{2})/(\d{2})/(\d{4})'),  # MM/DD/YYYY or DD/MM/YYYY
    re.compile(r'(\d{2})-(\d{2})-(\d{4})'),  # DD-MM-YYYY
    re.compile(
        r'(\d{1,2})(?:st|nd|rd|th)?\s+'
        r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)'
        r'\s+(\d{4})',
        re.IGNORECASE
    ),
    re.compile(
        r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)'
        r'\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})',
        re.IGNORECASE
    ),
]

# --- Merchant indicators ---
# Ordered by specificity (most specific first)
# These capture the merchant name after an indicator keyword.
# Each match is truncated at common boundary tokens to avoid
# capturing trailing amount/date/ID text.
MERCHANT_INDICATORS = [
    # Explicit labeled fields
    r'(?:Merchant|Vendor|Seller|Store|Company|Business|Retailer)[:\s]+(.+)',
    # Paid to / Payment to
    r'(?:Paid to|Payment to)[:\s]+(.+)',
    # Invoice from / Bill from
    r'(?:Invoice from|Bill from|Receipt from|Order from)[:\s]+(.+)',
    # From / By (most general, low priority)
    r'(?:From|By)[:\s]+(.+)',
    # Simple "Invoice X", "Receipt X", "Bill X", "Order X"
    r'^(?:Invoice|Receipt|Bill|Order|Receipt)\s+(.+)$',
]

# --- Customer indicators ---
CUSTOMER_INDICATORS = [
    r'(?:Customer|Client|Buyer|User)[:\s]+(.+)',
    r'(?:Name)[:\s]+(.+)',
    r'(?:To)[:\s]+(.+)',
]

# --- Boundary tokens for truncating merchant/customer names ---
# When a merchant indicator match captures too much (e.g.,
# "Amazon for ₹4999 on 23 June"), we truncate at these tokens.
MERCHANT_BOUNDARY_RE = re.compile(
    r'\s+(?:for|on|at|by|via|with|from|to|in|of|₹|\$|€|£|¥|₩|₽|₱|TXN|ORD|INV|#|\d[\d,.]*|$)'
)


# --------------- Core Extraction Functions ---------------

def extract_entities(text: str) -> ExtractedEntities:
    """
    Extract structured entities from raw text using spaCy NER and regex.

    Pipeline:
      1. spaCy NER (if available) -> raw entities, primary candidates
      2. Regex extraction -> supplements NER findings
      3. Deduplication and priority-based merging
      4. Confidence scoring

    Args:
        text: Raw text content to analyze.

    Returns:
        ExtractedEntities dataclass with all found entities and confidence scores.
    """
    if not text or not text.strip():
        return ExtractedEntities()

    text_clean = text.strip()
    result = ExtractedEntities()
    has_spacy = False

    # =========================================================
    # PHASE 1: spaCy NER
    # =========================================================
    nlp = _get_nlp()
    if nlp:
        has_spacy = True
        result.extraction_method = "spacy_regex"
        try:
            doc = nlp(text_clean[:10000])  # Limit to 10K chars for performance
            for ent in doc.ents:
                result.raw_entities.append({
                    "text": ent.text,
                    "label": ent.label_,
                    "start": ent.start_char,
                    "end": ent.end_char,
                })

                if ent.label_ == "ORG":
                    result.all_merchants.append(ent.text.strip())
                elif ent.label_ == "MONEY":
                    # NER money is often just the number; we use regex for actual parsing
                    pass
                elif ent.label_ == "DATE":
                    date_text = ent.text.strip()
                    if date_text not in result.all_dates:
                        result.all_dates.append(date_text)
                elif ent.label_ == "PERSON":
                    if not result.customer_name:
                        result.customer_name = ent.text.strip()
                elif ent.label_ == "EMAIL":
                    if not result.email:
                        result.email = ent.text.strip()
                elif ent.label_ == "PHONE":
                    if not result.phone:
                        result.phone = ent.text.strip()
                elif ent.label_ == "CARDINAL":
                    # Could be an amount/invoice number
                    pass
        except Exception as e:
            logger.error(f"spaCy NER failed: {e}")

    # =========================================================
    # PHASE 2: Regex Extraction
    # =========================================================

    # --- 2a. Amounts (regex is the primary amount source) ---
    _extract_amounts(text_clean, result)

    # --- 2b. Transaction IDs ---
    _extract_transaction_ids(text_clean, result)

    # --- 2c. Order IDs ---
    _extract_order_ids(text_clean, result)

    # --- 2d. Invoice numbers ---
    _extract_invoice_numbers(text_clean, result)

    # --- 2e. Emails ---
    _extract_emails(text_clean, result)

    # --- 2f. Phones ---
    _extract_phones(text_clean, result)

    # --- 2g. Dates ---
    _extract_dates(text_clean, result)

    # --- 2h. Merchant names ---
    _extract_merchants(text_clean, result)

    # --- 2i. Customer names ---
    _extract_customers(text_clean, result)

    # =========================================================
    # PHASE 3: Deduplication & Primary Selection
    # =========================================================

    # Deduplicate all lists
    result.all_merchants = _deduplicate(result.all_merchants)
    result.all_dates = _deduplicate(result.all_dates)
    result.all_transaction_ids = _deduplicate(result.all_transaction_ids)
    result.all_order_ids = _deduplicate(result.all_order_ids)
    result.all_invoice_numbers = _deduplicate(result.all_invoice_numbers)

    # Set primary fields with confidence

    # Merchant: prefer first from all_merchants, then spaCy ORG
    if result.all_merchants:
        # Pick the shortest merchant name as most likely correct
        # (long ones tend to be over-captures)
        best_merchant = min(result.all_merchants, key=lambda x: len(x))
        if len(best_merchant) < 100:
            result.merchant_name = best_merchant

    # Amount: already set during extraction, set confidence
    if result.amount is not None:
        result.amount_confidence = _compute_amount_confidence(
            result.amount, result.all_amounts, has_spacy
        )

    # Date: already set during extraction
    if result.date_iso:
        result.date_confidence = 0.95 if has_spacy else 0.85

    # Merchant confidence
    if result.merchant_name:
        result.merchant_confidence = _compute_merchant_confidence(
            result.merchant_name, result.raw_entities, has_spacy
        )

    # =========================================================
    # PHASE 4: Overall Confidence
    # =========================================================
    _compute_overall_confidence(result)

    logger.debug(
        f"Extracted entities: merchant={result.merchant_name} "
        f"(conf={result.merchant_confidence:.2f}), "
        f"amount={result.amount} (conf={result.amount_confidence:.2f}), "
        f"date={result.date} (conf={result.date_confidence:.2f}), "
        f"txn={result.transaction_id}, order={result.order_id}, "
        f"invoice={result.invoice_number}"
    )

    return result


# --------------- Phase 2 Extractors ---------------

def _extract_amounts(text: str, result: ExtractedEntities) -> None:
    """Extract monetary amounts and currencies using regex."""
    seen_amounts = set()
    for match in AMOUNT_RE.finditer(text):
        symbol = match.group(1)
        amount_str = match.group(2) or match.group(3)
        currency_code = match.group(4)

        try:
            amount_val = float(amount_str.replace(",", ""))
            # Avoid exact duplicates
            amount_key = round(amount_val, 2)
            if amount_key in seen_amounts:
                continue
            seen_amounts.add(amount_key)

            result.all_amounts.append(amount_val)

            # Set primary amount (first found)
            if result.amount is None:
                result.amount = amount_val

            # Set currency from symbol or code
            if symbol and not result.currency:
                result.currency = CURRENCY_MAP.get(symbol.upper(), symbol)
            elif currency_code and not result.currency:
                result.currency = currency_code.upper()
        except (ValueError, TypeError):
            pass


def _extract_transaction_ids(text: str, result: ExtractedEntities) -> None:
    """Extract transaction reference IDs."""
    for match in TXN_ID_RE.finditer(text):
        txn_id = f"TXN-{match.group(1)}"
        if txn_id not in result.all_transaction_ids:
            result.all_transaction_ids.append(txn_id)
            if result.transaction_id is None:
                result.transaction_id = txn_id


def _extract_order_ids(text: str, result: ExtractedEntities) -> None:
    """Extract order reference IDs."""
    for match in ORDER_ID_RE.finditer(text):
        order_id = f"ORD-{match.group(1)}"
        if order_id not in result.all_order_ids:
            result.all_order_ids.append(order_id)
            if result.order_id is None:
                result.order_id = order_id


def _extract_invoice_numbers(text: str, result: ExtractedEntities) -> None:
    """Extract invoice numbers."""
    for match in INVOICE_RE.finditer(text):
        inv_num = match.group(1).strip()
        if inv_num not in result.all_invoice_numbers:
            result.all_invoice_numbers.append(inv_num)
            if result.invoice_number is None:
                result.invoice_number = inv_num


def _extract_emails(text: str, result: ExtractedEntities) -> None:
    """Extract email addresses."""
    for match in EMAIL_RE.finditer(text):
        if result.email is None:
            result.email = match.group(0)


def _extract_phones(text: str, result: ExtractedEntities) -> None:
    """Extract phone numbers."""
    for match in PHONE_RE.finditer(text):
        if result.phone is None:
            result.phone = match.group(0)


def _extract_dates(text: str, result: ExtractedEntities) -> None:
    """Extract dates using multiple regex patterns and normalize to ISO."""
    seen_date_texts = set()

    for pattern in DATE_PATTERNS:
        for match in pattern.finditer(text):
            date_str = match.group(0).strip()
            date_key = date_str.lower()
            if date_key in seen_date_texts:
                continue
            seen_date_texts.add(date_key)

            result.all_dates.append(date_str)

            # Set primary date (first well-formed one)
            if result.date is None:
                result.date = date_str
                result.date_iso = _normalize_date(match)


def _extract_merchants(text: str, result: ExtractedEntities) -> None:
    """Extract merchant names using regex indicators.
    
    Uses spaCy ORG as the most reliable source.
    Regex indicators supplement when no ORG found.
    Each indicator match is truncated at boundary tokens to avoid
    capturing trailing amount/date/ID text.
    """
    # If spaCy already found ORG entities, use them as merchant candidates
    # (already added to all_merchants in Phase 1)

    # Now try regex indicators for additional candidates
    for pattern in MERCHANT_INDICATORS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            raw_name = match.group(1).strip().rstrip(".,;:")
            if not raw_name or len(raw_name) > 150:
                continue

            # Truncate at boundary tokens to avoid over-capture
            boundary_match = MERCHANT_BOUNDARY_RE.search(raw_name)
            if boundary_match and boundary_match.start() > 0:
                raw_name = raw_name[:boundary_match.start()].strip()

            if raw_name and len(raw_name) >= 2 and len(raw_name) < 100:
                if raw_name not in result.all_merchants:
                    result.all_merchants.append(raw_name)


def _extract_customers(text: str, result: ExtractedEntities) -> None:
    """Extract customer/person names from labeled indicators."""
    for pattern in CUSTOMER_INDICATORS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            name = match.group(1).strip().rstrip(".,;:")
            if name and len(name) < 100:
                if result.customer_name is None:
                    # Truncate at boundary
                    bm = MERCHANT_BOUNDARY_RE.search(name)
                    if bm and bm.start() > 0:
                        name = name[:bm.start()].strip()
                    result.customer_name = name
                    break


# --------------- Confidence Helpers ---------------

def _compute_merchant_confidence(
    merchant_name: str,
    raw_entities: list[dict],
    has_spacy: bool,
) -> float:
    """
    Compute confidence for a merchant name extraction.
    
    - 0.95+: Confirmed by spaCy ORG
    - 0.85:  From explicit label (Merchant:, Vendor:)
    - 0.75:  From "from/by" indicator
    - 0.60:  From simple prefix (Invoice X)
    - 0.50:  Regex only, no spaCy
    """
    if has_spacy:
        # Check if any spaCy ORG entity contains or matches this name
        for ent in raw_entities:
            if ent["label"] == "ORG":
                if merchant_name.lower() == ent["text"].lower():
                    return 0.95
                if merchant_name.lower() in ent["text"].lower():
                    return 0.90
                if ent["text"].lower() in merchant_name.lower():
                    return 0.85
        return 0.70  # Regex match with spaCy available but no ORG confirmation
    return 0.50  # Regex only


def _compute_amount_confidence(
    amount: float,
    all_amounts: list[float],
    has_spacy: bool,
) -> float:
    """Compute confidence for amount extraction.
    
    - 1.0:  Single amount found
    - 0.85: Multiple amounts, but one is primary
    - 0.60: No spaCy, regex only
    """
    if len(all_amounts) == 1:
        return 1.0 if has_spacy else 0.85
    return 0.85 if has_spacy else 0.70


def _compute_overall_confidence(result: ExtractedEntities) -> None:
    """
    Compute overall extraction confidence based on how many
    key fields were successfully extracted and their individual confidences.
    """
    # Key fields: merchant, amount, date, transaction_id
    key_fields = [
        result.merchant_confidence if result.merchant_name else 0.0,
        result.amount_confidence if result.amount is not None else 0.0,
        result.date_confidence if result.date_iso else 0.0,
        1.0 if result.transaction_id else 0.0,
    ]

    if key_fields:
        result.extraction_confidence = sum(key_fields) / len(key_fields)
    else:
        result.extraction_confidence = 0.0


# --------------- Date Normalization ---------------

def _normalize_date(match: re.Match) -> Optional[str]:
    """Convert a regex date match to ISO format (YYYY-MM-DD)."""
    groups = match.groups()
    try:
        if len(groups) < 2:
            return None

        if len(groups) == 3:
            a, b, c = groups

            # Case: first group is a month name -> "23 June 2024"
            if a and a.lower() in MONTH_NAMES:
                month = MONTH_NAMES[a.lower()]
                day = int(re.sub(r'[^\d]', '', b))
                year = int(c)
                dt = datetime(year, month, day)
                return dt.strftime("%Y-%m-%d")

            # Case: second group is a month name -> "June 23, 2024"
            if b and b.lower() in MONTH_NAMES:
                month = MONTH_NAMES[b.lower()]
                day = int(re.sub(r'[^\d]', '', a))
                year = int(c)
                dt = datetime(year, month, day)
                return dt.strftime("%Y-%m-%d")

            # All numeric: determine format
            a_int, b_int, c_int = int(a), int(b), int(c)

            if a_int > 31:  # YYYY-MM-DD
                year, month, day = a_int, b_int, c_int
            elif c_int > 31:  # MM/DD/YYYY or DD/MM/YYYY
                year = c_int
                if a_int > 12:  # DD/MM/YYYY
                    day, month = a_int, b_int
                else:  # MM/DD/YYYY (US format assumed)
                    month, day = a_int, b_int
            else:
                # If both day/month are <= 12 and year <= 31, it's ambiguous
                # Prefer DD/MM/YYYY if day > 12, else MM/DD/YYYY
                if a_int > 12:
                    day, month = a_int, b_int
                elif b_int > 12:
                    month, day = a_int, b_int
                else:
                    # Truly ambiguous; fallback to MM/DD/YYYY (US default)
                    month, day = a_int, b_int
                year = c_int

            # Validate ranges
            if not (1 <= month <= 12 and 1 <= day <= 31 and year >= 1900):
                return None

            dt = datetime(year, month, day)
            return dt.strftime("%Y-%m-%d")

        if len(groups) == 1:
            # Single group - might be ISO
            try:
                dt = datetime.strptime(groups[0][:10], "%Y-%m-%d")
                return dt.strftime("%Y-%m-%d")
            except (ValueError, IndexError):
                pass

    except (ValueError, TypeError, IndexError) as e:
        logger.debug(f"Date normalization failed for {match.group(0)}: {e}")

    return None


# --------------- Deduplication ---------------

def _deduplicate(items: list[str]) -> list[str]:
    """Remove duplicates while preserving order (case-insensitive)."""
    seen = set()
    result = []
    for item in items:
        key = item.lower().strip()
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result


# --------------- Convenience API ---------------

def extract_and_format(text: str) -> dict:
    """
    Extract entities and return a dict suitable for storing in
    EvidenceRepository.content_json.
    """
    entities = extract_entities(text)
    return entities.to_dict()


def update_evidence_from_text(
    evidence_record,
    text: str,
) -> None:
    """
    Update an EvidenceRepository SQLAlchemy model instance with
    extracted entities from the given text.

    This mutates the record in-place; caller must commit the session.
    Sets is_processed to True after successful extraction.
    """
    entities = extract_entities(text)

    # Update fields only if extraction produced meaningful results
    if entities.merchant_name:
        evidence_record.merchant_name = entities.merchant_name
    if entities.customer_name:
        evidence_record.customer_name = entities.customer_name
    if entities.amount is not None:
        evidence_record.amount = entities.amount
    if entities.currency:
        evidence_record.currency = entities.currency
    if entities.transaction_id:
        evidence_record.transaction_id_ref = entities.transaction_id
    if entities.order_id:
        evidence_record.order_id_ref = entities.order_id

    # Store full extraction result in content_json
    evidence_record.content_json = entities.to_dict()
    evidence_record.is_processed = True

    # Add processing notes with confidence summary
    evidence_record.processing_notes = (
        f"Entity extraction completed. "
        f"Merchant: {entities.merchant_name or 'N/A'} "
        f"(conf={entities.merchant_confidence:.2f}), "
        f"Amount: {entities.amount or 'N/A'} "
        f"(conf={entities.amount_confidence:.2f}), "
        f"Date: {entities.date_iso or entities.date or 'N/A'} "
        f"(conf={entities.date_confidence:.2f}), "
        f"Overall confidence: {entities.extraction_confidence:.2f}, "
        f"Method: {entities.extraction_method}"
    )