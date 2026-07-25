# DisputeIQ API Testing Guide

**Base URL**: `http://localhost:8000`  
**Auth**: JWT Bearer Token (obtained via `/api/v1/auth/login`)

---

## Table of Contents
1. [Authentication](#1-authentication)
2. [Evidence Collection](#2-evidence-collection)
3. [Timeline Reconstruction](#3-timeline-reconstruction)
4. [Evidence Validation](#4-evidence-validation)
5. [Policy Mapping](#5-policy-mapping)
6. [Case File Generation](#6-case-file-generation)
7. [Health & Root](#7-health--root)

---

## 1. Authentication

### 1.1 Register User
```
POST /api/v1/auth/register
```

**Sample Request:**
```json
{
  "email": "investigator@example.com",
  "username": "investigator1",
  "password": "securePassword123!",
  "full_name": "John Investigator"
}
```

**Expected Success Response (201):**
```json
{
  "id": 1,
  "email": "investigator@example.com",
  "username": "investigator1",
  "full_name": "John Investigator",
  "role": "investigator",
  "is_active": true,
  "created_at": "2026-07-24T10:00:00"
}
```

### 1.2 Login
```
POST /api/v1/auth/login
```

**Sample Request:**
```json
{
  "username": "investigator1",
  "password": "securePassword123!"
}
```

**Expected Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

> **Usage**: Copy the `access_token` → Add header `Authorization: Bearer <token>` to all subsequent requests.

### 1.3 Get Current User Info
```
GET /api/v1/auth/me
```
**Headers**: `Authorization: Bearer <token>`

**Expected Response (200):**
```json
{
  "id": 1,
  "email": "investigator@example.com",
  "username": "investigator1",
  "full_name": "John Investigator",
  "role": "investigator",
  "is_active": true,
  "created_at": "2026-07-24T10:00:00"
}
```

---

## 2. Evidence Collection

### 2.1 Collect Evidence
```
POST /api/v1/evidence/collect
```

**Sample Request:**
```json
{
  "dispute_id": 1
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Evidence collection completed for dispute 1",
  "case_file": {
    "id": 1,
    "case_file_id": "CF-20260724-001",
    "dispute_id": 1,
    "status": "evidence_collected",
    "evidence_count": 5,
    "created_at": "2026-07-24T10:05:00",
    "updated_at": "2026-07-24T10:05:00"
  },
  "evidence_count": 5
}
```

**What this does**: Triggers AI-powered evidence collection from transaction, communication, and document tables.

### 2.2 Upload Evidence
```
POST /api/v1/evidence/upload
```
**Content-Type**: `multipart/form-data`

**Form Fields:**
| Field | Type | Value |
|-------|------|-------|
| file | File | (select a PDF, DOCX, or image file) |
| dispute_id | Text | `1` |
| title | Text | `Customer signed agreement` |
| description | Text | `Signed contract from customer confirming the dispute terms` |
| evidence_type | Text | `uploaded_document` |

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Evidence uploaded successfully",
  "evidence_id": 10,
  "evidence_ref": "EVD-0010",
  "file_url": "https://res.cloudinary.com/.../uploaded_doc.pdf"
}
```

### 2.3 Get Case File (Evidence Summary)
```
GET /api/v1/evidence/case-file/{dispute_id}
```
URL Example: `GET /api/v1/evidence/case-file/1`

**Expected Response (200):**
```json
{
  "id": 1,
  "case_file_id": "CF-20260724-001",
  "dispute_id": 1,
  "status": "evidence_collected",
  "investigation_summary": null,
  "confidence_score": null,
  "created_at": "2026-07-24T10:05:00",
  "updated_at": "2026-07-24T10:05:00",
  "evidence_items": [
    {
      "id": 1,
      "evidence_id": "EVD-0001",
      "evidence_type": "transaction",
      "source": "transactions",
      "status": "collected",
      "title": "Transaction Record",
      "description": "Purchase at Amazon.com on 2026-06-15",
      "merchant_name": "Amazon.com",
      "customer_name": "John Doe",
      "amount": 299.99,
      "currency": "USD",
      "transaction_id_ref": "TXN-001",
      "event_date": "2026-06-15T14:30:00",
      "collected_at": "2026-07-24T10:05:00",
      "is_processed": true
    },
    {
      "id": 2,
      "evidence_id": "EVD-0002",
      "evidence_type": "communication",
      "source": "messages",
      "status": "collected",
      "title": "Customer Support Chat",
      "description": "Chat transcript from 2026-06-20 regarding missing item",
      "merchant_name": "Amazon.com",
      "customer_name": "John Doe",
      "event_date": "2026-06-20T09:15:00",
      "collected_at": "2026-07-24T10:05:00",
      "is_processed": true
    }
  ]
}
```

### 2.4 List Evidence
```
GET /api/v1/evidence/list/{case_file_id}
```
URL Example: `GET /api/v1/evidence/list/1`

**Expected Response (200):**
```json
{
  "items": [
    {
      "id": 1,
      "evidence_id": "EVD-0001",
      "evidence_type": "transaction",
      "source": "transactions",
      "status": "collected",
      "title": "Transaction Record",
      "amount": 299.99,
      "currency": "USD",
      "merchant_name": "Amazon.com",
      "collected_at": "2026-07-24T10:05:00",
      "is_processed": true
    },
    {
      "id": 2,
      "evidence_id": "EVD-0002",
      "evidence_type": "communication",
      "source": "messages",
      "status": "collected",
      "title": "Customer Support Chat",
      "description": "Chat transcript regarding missing item",
      "collected_at": "2026-07-24T10:05:00",
      "is_processed": true
    }
  ],
  "total": 2
}
```

### 2.5 Extract Entities From Evidence
```
POST /api/v1/evidence/extract
```

**Sample Request (batch by case file):**
```json
{
  "case_file_id": 1,
  "re_extract": false
}
```

**Sample Request (single evidence):**
```json
{
  "evidence_id": 1,
  "re_extract": false
}
```

**Expected Response (200):**
```json
{
  "total": 5,
  "processed": 5,
  "skipped": 0,
  "errors": 0,
  "details": [
    {"evidence_id": 1, "status": "processed", "entities_found": 4},
    {"evidence_id": 2, "status": "processed", "entities_found": 3}
  ]
}
```

### 2.6 Get Entities For Evidence
```
GET /api/v1/evidence/{evidence_id}/entities
```
URL Example: `GET /api/v1/evidence/1/entities`

**Expected Response (200):**
```json
{
  "evidence_id": 1,
  "evidence_ref": "EVD-0001",
  "is_processed": true,
  "merchant_name": "Amazon.com",
  "customer_name": "John Doe",
  "amount": 299.99,
  "currency": "USD",
  "transaction_id_ref": "TXN-001",
  "order_id_ref": "ORD-12345",
  "content_json": {
    "payment_method": "Visa ****4242",
    "shipping_address": "123 Main St, NY",
    "items": ["Electronics Gadget"]
  },
  "processing_notes": "Entities extracted successfully via Groq AI"
}
```

---

## 3. Timeline Reconstruction

### 3.1 Reconstruct Timeline
```
POST /api/v1/timeline/reconstruct
```

**Sample Request (by case_file_id):**
```json
{
  "case_file_id": 1,
  "clear_existing": true
}
```

**Alternative (by dispute_id):**
```json
{
  "dispute_id": 1,
  "clear_existing": true
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Timeline reconstructed for case file 1",
  "case_file_id": 1,
  "case_file_ref": "CF-20260724-001",
  "timeline_reconstructed": true,
  "total_events": 4,
  "date_range": {
    "start": "2026-06-15T14:30:00",
    "end": "2026-07-10T11:00:00"
  },
  "event_types": {
    "purchase": 1,
    "communication": 2,
    "dispute_filing": 1
  }
}
```

### 3.2 Get Timeline
```
GET /api/v1/timeline/case-file/{case_file_id}
```
URL Example: `GET /api/v1/timeline/case-file/1`

**Expected Response (200):**
```json
{
  "case_file_id": 1,
  "events": [
    {
      "id": 1,
      "event_id": "TE-0001",
      "event_type": "purchase",
      "event_date": "2026-06-15T14:30:00",
      "title": "Customer purchased Electronics Gadget",
      "sequence_order": 1,
      "amount": 299.99,
      "currency": "USD"
    },
    {
      "id": 2,
      "event_id": "TE-0002",
      "event_type": "communication",
      "event_date": "2026-06-20T09:15:00",
      "title": "Customer contacted support about missing item",
      "sequence_order": 2,
      "amount": null,
      "currency": null
    },
    {
      "id": 3,
      "event_id": "TE-0003",
      "event_type": "communication",
      "event_date": "2026-06-25T16:00:00",
      "title": "Merchant requested proof of delivery",
      "sequence_order": 3,
      "amount": null,
      "currency": null
    },
    {
      "id": 4,
      "event_id": "TE-0004",
      "event_type": "dispute_filing",
      "event_date": "2026-07-10T11:00:00",
      "title": "Dispute filed",
      "sequence_order": 4,
      "amount": 299.99,
      "currency": "USD"
    }
  ],
  "summary": null
}
```

### 3.3 Get Timeline Event
```
GET /api/v1/timeline/event/{event_id}
```
URL Example: `GET /api/v1/timeline/event/1`

**Expected Response (200):**
```json
{
  "id": 1,
  "event_id": "TE-0001",
  "event_type": "purchase",
  "event_date": "2026-06-15T14:30:00",
  "title": "Customer purchased Electronics Gadget",
  "description": "Customer John Doe purchased an Electronics Gadget from Amazon.com for $299.99",
  "sequence_order": 1,
  "amount": 299.99,
  "currency": "USD",
  "merchant_name": "Amazon.com",
  "customer_name": "John Doe",
  "evidence_id": 1,
  "source_table": "transactions",
  "source_record_id": 1,
  "metadata": {
    "payment_method": "Visa",
    "order_id": "ORD-12345"
  },
  "created_at": "2026-07-24T10:10:00",
  "updated_at": "2026-07-24T10:10:00"
}
```

### 3.4 Update Timeline Event
```
PUT /api/v1/timeline/event/{event_id}
```
URL Example: `PUT /api/v1/timeline/event/1`

**Sample Request:**
```json
{
  "title": "Customer purchased Electronics Gadget - Updated",
  "description": "Revised description with additional context",
  "event_date": "2026-06-15T15:00:00",
  "sequence_order": 1
}
```

**Expected Response (200):**
```json
{
  "id": 1,
  "event_id": "TE-0001",
  "event_type": "purchase",
  "event_date": "2026-06-15T15:00:00",
  "title": "Customer purchased Electronics Gadget - Updated",
  "description": "Revised description with additional context",
  "sequence_order": 1,
  "amount": 299.99,
  "currency": "USD",
  "merchant_name": "Amazon.com",
  "customer_name": "John Doe",
  "evidence_id": 1,
  "source_table": "transactions",
  "source_record_id": 1,
  "created_at": "2026-07-24T10:10:00",
  "updated_at": "2026-07-24T10:15:00"
}
```

### 3.5 Delete Timeline Event
```
DELETE /api/v1/timeline/event/{event_id}
```
URL Example: `DELETE /api/v1/timeline/event/5`

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Timeline event 5 deleted successfully"
}
```

### 3.6 Get Timeline Events (List)
```
GET /api/v1/timeline/case-file/{case_file_id}/events
```
URL Example: `GET /api/v1/timeline/case-file/1/events`

**Expected Response (200):**
```json
{
  "case_file_id": 1,
  "total": 3,
  "events": [
    {
      "id": 1,
      "event_id": "TE-0001",
      "event_type": "purchase",
      "event_date": "2026-06-15T14:30:00",
      "title": "Customer purchased Electronics Gadget",
      "sequence_order": 1,
      "amount": 299.99,
      "currency": "USD"
    },
    {
      "id": 2,
      "event_id": "TE-0002",
      "event_type": "communication",
      "event_date": "2026-06-20T09:15:00",
      "title": "Customer contacted support about missing item",
      "sequence_order": 2,
      "amount": null,
      "currency": null
    }
  ]
}
```

### 3.7 Get Timeline Summary
```
GET /api/v1/timeline/case-file/{case_file_id}/summary
```
URL Example: `GET /api/v1/timeline/case-file/1/summary`

**Expected Response (200):**
```json
{
  "total_events": 4,
  "date_range": {
    "start": "2026-06-15T14:30:00",
    "end": "2026-07-10T11:00:00"
  },
  "event_types": {
    "purchase": 1,
    "communication": 2,
    "dispute_filing": 1
  },
  "key_events": [
    {
      "event": "Customer purchased Electronics Gadget",
      "date": "2026-06-15",
      "type": "purchase"
    },
    {
      "event": "Dispute filed",
      "date": "2026-07-10",
      "type": "dispute_filing"
    }
  ]
}
```

### 3.8 Add Manual Event
```
POST /api/v1/timeline/event/manual
```

**Sample Request:**
```json
{
  "case_file_id": 1,
  "event_type": "manual_entry",
  "event_date": "2026-07-05T10:00:00",
  "title": "Customer sent email to dispute team",
  "description": "Customer sent follow-up email with additional screenshots",
  "merchant_name": "Amazon.com",
  "customer_name": "John Doe"
}
```

**Expected Response (200):**
```json
{
  "id": 6,
  "event_id": "TE-0006",
  "event_type": "manual_entry",
  "event_date": "2026-07-05T10:00:00",
  "title": "Customer sent email to dispute team",
  "description": "Customer sent follow-up email with additional screenshots",
  "sequence_order": 5,
  "merchant_name": "Amazon.com",
  "customer_name": "John Doe",
  "evidence_id": null,
  "source_table": null,
  "source_record_id": null,
  "created_at": "2026-07-24T10:20:00",
  "updated_at": "2026-07-24T10:20:00"
}
```

### 3.9 Analyze Timeline
```
POST /api/v1/timeline/case-file/{case_file_id}/analyze
```
URL Example: `POST /api/v1/timeline/case-file/1/analyze`

**Expected Response (200):**
```json
{
  "summary": {
    "total_events": 4,
    "date_range": {
      "start": "2026-06-15T14:30:00",
      "end": "2026-07-10T11:00:00"
    },
    "event_types": {
      "purchase": 1,
      "communication": 2,
      "dispute_filing": 1
    },
    "key_events": [
      {"event": "Customer purchased Electronics Gadget", "date": "2026-06-15", "type": "purchase"},
      {"event": "Dispute filed", "date": "2026-07-10", "type": "dispute_filing"}
    ]
  },
  "gaps": [
    {
      "after_event": "Customer contacted support about missing item",
      "before_event": "Dispute filed",
      "after_date": "2026-06-20T09:15:00",
      "before_date": "2026-07-10T11:00:00",
      "gap_days": 20,
      "severity": "high"
    }
  ],
  "has_gaps": true,
  "gap_count": 1
}
```

### 3.10 Detect Timeline Gaps
```
POST /api/v1/timeline/case-file/{case_file_id}/detect-gaps
```
URL Example: `POST /api/v1/timeline/case-file/1/detect-gaps`

**Sample Request (optional body):**
```json
{
  "case_file_id": 1,
  "gap_threshold_days": 7
}
```

**Expected Response (200):**
```json
{
  "gaps": [
    {
      "after_event": "Customer contacted support about missing item",
      "before_event": "Dispute filed",
      "after_date": "2026-06-20T09:15:00",
      "before_date": "2026-07-10T11:00:00",
      "gap_days": 20,
      "severity": "high"
    }
  ],
  "gap_count": 1,
  "has_gaps": true,
  "summary": {
    "total_events": 4,
    "date_range": {"start": "2026-06-15T14:30:00", "end": "2026-07-10T11:00:00"},
    "event_types": {"purchase": 1, "communication": 2, "dispute_filing": 1},
    "key_events": []
  }
}
```

### 3.11 Reorder Timeline Events
```
POST /api/v1/timeline/reorder
```

**Sample Request:**
```json
{
  "case_file_id": 1,
  "event_ids": [4, 1, 2, 3]
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Timeline events reordered successfully",
  "case_file_id": 1,
  "events": [
    {"id": 4, "event_id": "TE-0004", "sequence_order": 1},
    {"id": 1, "event_id": "TE-0001", "sequence_order": 2},
    {"id": 2, "event_id": "TE-0002", "sequence_order": 3},
    {"id": 3, "event_id": "TE-0003", "sequence_order": 4}
  ]
}
```

### 3.12 Auto Reorder Timeline
```
POST /api/v1/timeline/case-file/{case_file_id}/auto-reorder
```
URL Example: `POST /api/v1/timeline/case-file/1/auto-reorder`

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Timeline auto-reordered by event dates",
  "total_events": 4
}
```

---

## 4. Evidence Validation

### 4.1 Validate Case File
```
POST /api/v1/validation/validate
```

**Sample Request:**
```json
{
  "case_file_id": 1,
  "clear_existing": true
}
```

**Alternative (by dispute_id):**
```json
{
  "dispute_id": 1,
  "clear_existing": true
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Validation completed for case file 1",
  "case_file_id": 1,
  "case_file_ref": "CF-20260724-001",
  "validation_completed": true,
  "total_validations": 6,
  "resolved": 0,
  "unresolved": 6,
  "by_category": {
    "data_completeness": 2,
    "consistency": 2,
    "timeliness": 1,
    "authenticity": 1
  },
  "by_severity": {
    "critical": 1,
    "high": 2,
    "medium": 2,
    "low": 1
  }
}
```

### 4.2 Get Validations
```
GET /api/v1/validation/case-file/{case_file_id}
```
URL Example: `GET /api/v1/validation/case-file/1`

**Expected Response (200):**
```json
{
  "case_file_id": 1,
  "validations": [
    {
      "id": 1,
      "validation_id": "VAL-0001",
      "case_file_id": 1,
      "category": "data_completeness",
      "severity": "critical",
      "title": "Missing delivery confirmation",
      "description": "No delivery confirmation found for transaction TXN-001",
      "detail": "The transaction record lacks any proof of delivery, which is critical for determining liability",
      "suggestion": "Request delivery confirmation from merchant or shipping provider",
      "evidence_id": 1,
      "evidence_type": "transaction",
      "conflicting_evidence_id": null,
      "conflicting_field": null,
      "is_resolved": false,
      "resolved_at": null,
      "resolved_by": null,
      "resolution_notes": null,
      "metadata": null,
      "created_at": "2026-07-24T10:25:00",
      "updated_at": "2026-07-24T10:25:00"
    },
    {
      "id": 2,
      "validation_id": "VAL-0002",
      "case_file_id": 1,
      "category": "consistency",
      "severity": "high",
      "title": "Amount mismatch between evidence items",
      "description": "Transaction amount ($299.99) differs from dispute claim amount ($349.99)",
      "detail": "The original transaction shows $299.99 but the customer claims $349.99",
      "suggestion": "Verify the correct amount with merchant records",
      "evidence_id": 1,
      "evidence_type": "transaction",
      "conflicting_evidence_id": 4,
      "conflicting_field": "amount",
      "is_resolved": false,
      "resolved_at": null,
      "resolved_by": null,
      "resolution_notes": null,
      "metadata": {"transaction_amount": 299.99, "claim_amount": 349.99},
      "created_at": "2026-07-24T10:25:00",
      "updated_at": "2026-07-24T10:25:00"
    }
  ],
  "summary": {
    "total": 6,
    "resolved": 0,
    "unresolved": 6,
    "by_category": {
      "data_completeness": 2,
      "consistency": 2,
      "timeliness": 1,
      "authenticity": 1
    },
    "by_severity": {
      "critical": 1,
      "high": 2,
      "medium": 2,
      "low": 1
    }
  }
}
```

### 4.3 Get Validation
```
GET /api/v1/validation/validation/{validation_id}
```
URL Example: `GET /api/v1/validation/validation/1`

**Expected Response (200):**
```json
{
  "id": 1,
  "validation_id": "VAL-0001",
  "case_file_id": 1,
  "category": "data_completeness",
  "severity": "critical",
  "title": "Missing delivery confirmation",
  "description": "No delivery confirmation found for transaction TXN-001",
  "detail": "The transaction record lacks any proof of delivery, which is critical for determining liability",
  "suggestion": "Request delivery confirmation from merchant or shipping provider",
  "evidence_id": 1,
  "evidence_type": "transaction",
  "is_resolved": false,
  "created_at": "2026-07-24T10:25:00",
  "updated_at": "2026-07-24T10:25:00"
}
```

### 4.4 Delete Validation
```
DELETE /api/v1/validation/validation/{validation_id}
```
URL Example: `DELETE /api/v1/validation/validation/5`

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Validation 5 deleted successfully"
}
```

### 4.5 Get Validations By Category
```
GET /api/v1/validation/case-file/{case_file_id}/category/{category}
```
URL Example: `GET /api/v1/validation/case-file/1/category/consistency`

**Expected Response (200):**
```json
{
  "case_file_id": 1,
  "validations": [
    {
      "id": 2,
      "validation_id": "VAL-0002",
      "category": "consistency",
      "severity": "high",
      "title": "Amount mismatch between evidence items",
      "is_resolved": false
    }
  ],
  "summary": {
    "total": 2,
    "resolved": 0,
    "unresolved": 2,
    "by_severity": {"high": 1, "medium": 1}
  }
}
```

### 4.6 Get Validations By Severity
```
GET /api/v1/validation/case-file/{case_file_id}/severity/{severity}
```
URL Example: `GET /api/v1/validation/case-file/1/severity/critical`

**Expected Response (200):**
```json
{
  "case_file_id": 1,
  "validations": [
    {
      "id": 1,
      "validation_id": "VAL-0001",
      "category": "data_completeness",
      "severity": "critical",
      "title": "Missing delivery confirmation",
      "is_resolved": false
    }
  ],
  "summary": {
    "total": 1,
    "resolved": 0,
    "unresolved": 1,
    "by_category": {"data_completeness": 1}
  }
}
```

### 4.7 Get Critical Validations
```
GET /api/v1/validation/case-file/{case_file_id}/critical
```
URL Example: `GET /api/v1/validation/case-file/1/critical`

**Expected Response (200):**
```json
{
  "case_file_id": 1,
  "validations": [
    {
      "id": 1,
      "validation_id": "VAL-0001",
      "category": "data_completeness",
      "severity": "critical",
      "title": "Missing delivery confirmation",
      "is_resolved": false
    }
  ],
  "summary": {
    "total": 1,
    "resolved": 0,
    "unresolved": 1
  }
}
```

### 4.8 Resolve Validation
```
POST /api/v1/validation/validation/{validation_id}/resolve
```
URL Example: `POST /api/v1/validation/validation/1/resolve`

**Sample Request:**
```json
{
  "resolution_notes": "Obtained delivery confirmation from UPS tracking #1Z999AA10123456784"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Validation 1 resolved successfully",
  "validation": {
    "id": 1,
    "validation_id": "VAL-0001",
    "category": "data_completeness",
    "severity": "critical",
    "title": "Missing delivery confirmation",
    "is_resolved": true,
    "resolved_at": "2026-07-24T11:00:00",
    "resolved_by": "investigator1",
    "resolution_notes": "Obtained delivery confirmation from UPS tracking #1Z999AA10123456784"
  }
}
```

### 4.9 Reopen Validation
```
POST /api/v1/validation/validation/{validation_id}/reopen
```
URL Example: `POST /api/v1/validation/validation/1/reopen`

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Validation 1 reopened successfully",
  "validation": {
    "id": 1,
    "validation_id": "VAL-0001",
    "is_resolved": false,
    "resolved_at": null,
    "resolved_by": null
  }
}
```

### 4.10 Get Validation Summary
```
GET /api/v1/validation/case-file/{case_file_id}/summary
```
URL Example: `GET /api/v1/validation/case-file/1/summary`

**Expected Response (200):**
```json
{
  "total": 6,
  "resolved": 1,
  "unresolved": 5,
  "by_category": {
    "data_completeness": 2,
    "consistency": 2,
    "timeliness": 1,
    "authenticity": 1
  },
  "by_severity": {
    "critical": 1,
    "high": 2,
    "medium": 2,
    "low": 1
  }
}
```

### 4.11 Analyze Validations
```
GET /api/v1/validation/case-file/{case_file_id}/analyze
```
URL Example: `GET /api/v1/validation/case-file/1/analyze`

**Expected Response (200):**
```json
{
  "summary": {
    "total": 6,
    "resolved": 1,
    "unresolved": 5,
    "by_category": {
      "data_completeness": 2,
      "consistency": 2,
      "timeliness": 1,
      "authenticity": 1
    },
    "by_severity": {
      "critical": 1,
      "high": 2,
      "medium": 2,
      "low": 1
    }
  },
  "critical_issues": [
    {
      "id": 1,
      "validation_id": "VAL-0001",
      "category": "data_completeness",
      "severity": "critical",
      "title": "Missing delivery confirmation",
      "is_resolved": false
    }
  ],
  "has_critical_issues": true,
  "critical_issue_count": 1
}
```

### 4.12 Analyze Evidence Completeness
```
GET /api/v1/validation/case-file/{case_file_id}/completeness
```
URL Example: `GET /api/v1/validation/case-file/1/completeness`

**Expected Response (200):**
```json
{
  "case_file_id": 1,
  "evidence_count": 5,
  "completeness_score": 0.72,
  "analysis": "The evidence package is 72% complete. Notable gaps include missing delivery confirmation and lack of payment method verification. Recommend obtaining delivery proof and bank statement showing the charge.",
  "recommendations": [
    "Obtain delivery confirmation from shipping carrier",
    "Request bank statement showing the disputed charge",
    "Capture merchant's refund/return policy",
    "Document customer's account history"
  ]
}
```

### 4.13 Generate AI Suggestions
```
POST /api/v1/validation/ai-suggestions
```

**Sample Request (all unresolved validations):**
```json
{
  "case_file_id": 1
}
```

**Sample Request (specific validations only):**
```json
{
  "case_file_id": 1,
  "validation_ids": [1, 2]
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "suggestions": [
    {
      "validation_id": 1,
      "validation_ref": "VAL-0001",
      "suggestion": "Contact shipping carrier with tracking ID to obtain official delivery confirmation. If delivery was not made, initiate claim with carrier.",
      "priority": "high",
      "action_items": [
        "Call UPS at 1-800-PICK-UPS with tracking number",
        "Request proof of delivery letter",
        "Upload obtained document as evidence"
      ],
      "confidence": 0.85
    },
    {
      "validation_id": 2,
      "validation_ref": "VAL-0002",
      "suggestion": "Compare transaction receipt with dispute claim. The $50 difference may be due to taxes or shipping fees not included in original transaction record.",
      "priority": "medium",
      "action_items": [
        "Request itemized receipt from merchant",
        "Check if shipping/taxes were charged separately",
        "Update evidence with correct amounts"
      ],
      "confidence": 0.72
    }
  ]
}
```

---

## 5. Policy Mapping

### 5.1 Map Policies
```
POST /api/v1/policy/map
```

**Sample Request:**
```json
{
  "case_file_id": 1,
  "clear_existing": true
}
```

**Alternative (by dispute_id):**
```json
{
  "dispute_id": 1,
  "clear_existing": true
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Policy mapping completed for case file 1",
  "case_file_id": 1,
  "case_file_ref": "CF-20260724-001",
  "policy_mapping_completed": true,
  "total_mappings": 4,
  "applicable": 3,
  "not_applicable": 1,
  "by_match_type": {
    "direct": 1,
    "semantic": 2,
    "historical": 1
  },
  "average_relevance": 0.78
}
```

### 5.2 Get Policy Mappings
```
GET /api/v1/policy/case-file/{case_file_id}
```
URL Example: `GET /api/v1/policy/case-file/1`

**Expected Response (200):**
```json
{
  "case_file_id": 1,
  "mappings": [
    {
      "id": 1,
      "mapping_id": "PM-0001",
      "case_file_id": 1,
      "policy_id": 1,
      "match_type": "direct",
      "relevance_score": 0.95,
      "matched_text": "Item not received within expected delivery timeframe",
      "explanation": "Policy 3.2.1 directly addresses scenarios where customer claims non-receipt of item",
      "evidence_id": 1,
      "evidence_type": "transaction",
      "similar_dispute_id": null,
      "similarity_score": null,
      "is_applicable": true,
      "created_at": "2026-07-24T10:30:00",
      "updated_at": "2026-07-24T10:30:00"
    },
    {
      "id": 2,
      "mapping_id": "PM-0002",
      "case_file_id": 1,
      "policy_id": 3,
      "match_type": "semantic",
      "relevance_score": 0.82,
      "matched_text": "Customer must provide proof of non-delivery within 30 days",
      "explanation": "Policy 5.1.3 requires customer to provide written statement within 30 days of expected delivery",
      "evidence_id": 2,
      "evidence_type": "communication",
      "is_applicable": true,
      "created_at": "2026-07-24T10:30:00",
      "updated_at": "2026-07-24T10:30:00"
    },
    {
      "id": 3,
      "mapping_id": "PM-0003",
      "case_file_id": 1,
      "policy_id": 7,
      "match_type": "historical",
      "relevance_score": 0.65,
      "matched_text": "Similar dispute resolved in favor of merchant",
      "explanation": "Historical case DIS-2025-0423 had similar facts and was resolved in merchant's favor",
      "similar_dispute_id": 42,
      "similarity_score": 0.88,
      "is_applicable": true,
      "created_at": "2026-07-24T10:30:00",
      "updated_at": "2026-07-24T10:30:00"
    }
  ],
  "summary": {
    "total": 4,
    "applicable": 3,
    "not_applicable": 1,
    "by_match_type": {
      "direct": 1,
      "semantic": 2,
      "historical": 1
    },
    "average_relevance": 0.78
  }
}
```

### 5.3 Get Policy Mapping
```
GET /api/v1/policy/mapping/{mapping_id}
```
URL Example: `GET /api/v1/policy/mapping/1`

**Expected Response (200):**
```json
{
  "id": 1,
  "mapping_id": "PM-0001",
  "case_file_id": 1,
  "policy_id": 1,
  "match_type": "direct",
  "relevance_score": 0.95,
  "matched_text": "Item not received within expected delivery timeframe",
  "explanation": "Policy 3.2.1 directly addresses scenarios where customer claims non-receipt of item",
  "evidence_id": 1,
  "evidence_type": "transaction",
  "is_applicable": true,
  "created_at": "2026-07-24T10:30:00",
  "updated_at": "2026-07-24T10:30:00"
}
```

### 5.4 Update Policy Mapping
```
PUT /api/v1/policy/mapping/{mapping_id}
```
URL Example: `PUT /api/v1/policy/mapping/1`

**Sample Request:**
```json
{
  "relevance_score": 0.98,
  "explanation": "Updated explanation after detailed review",
  "is_applicable": true
}
```

**Expected Response (200):**
```json
{
  "id": 1,
  "mapping_id": "PM-0001",
  "relevance_score": 0.98,
  "explanation": "Updated explanation after detailed review",
  "is_applicable": true,
  "updated_at": "2026-07-24T11:00:00"
}
```

### 5.5 Delete Policy Mapping
```
DELETE /api/v1/policy/mapping/{mapping_id}
```
URL Example: `DELETE /api/v1/policy/mapping/4`

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Policy mapping 4 deleted successfully"
}
```

### 5.6 Get All Policies
```
GET /api/v1/policy/policies
```

**Expected Response (200):**
```json
{
  "policies": [
    {
      "id": 1,
      "policy_id": "POL-001",
      "title": "Non-Receipt of Item Policy",
      "content": "If customer claims item was not received...",
      "policy_type": "dispute_policy",
      "effective_date": "2026-01-01",
      "expiry_date": null,
      "version": "3.2",
      "is_active": true,
      "category": "fulfillment",
      "tags": ["non-receipt", "delivery", "missing-item"],
      "source_url": null,
      "created_at": "2026-01-01T00:00:00",
      "updated_at": "2026-06-15T00:00:00"
    }
  ],
  "total": 10
}
```

### 5.7 Get Policy By ID
```
GET /api/v1/policy/policies/{policy_id}
```
URL Example: `GET /api/v1/policy/policies/1`

**Expected Response (200):**
```json
{
  "id": 1,
  "policy_id": "POL-001",
  "title": "Non-Receipt of Item Policy",
  "content": "If customer claims item was not received within the expected delivery timeframe, the merchant must provide proof of delivery. If proof cannot be provided, liability falls on the merchant.",
  "policy_type": "dispute_policy",
  "effective_date": "2026-01-01",
  "expiry_date": null,
  "version": "3.2",
  "is_active": true,
  "category": "fulfillment",
  "tags": ["non-receipt", "delivery", "missing-item"],
  "source_url": null,
  "created_at": "2026-01-01T00:00:00",
  "updated_at": "2026-06-15T00:00:00"
}
```

### 5.8 Get Policies By Type
```
GET /api/v1/policy/policies/type/{policy_type}
```
URL Example: `GET /api/v1/policy/policies/type/dispute_policy`

**Expected Response (200):**
```json
{
  "policies": [
    {
      "id": 1,
      "policy_id": "POL-001",
      "title": "Non-Receipt of Item Policy",
      "policy_type": "dispute_policy",
      "is_active": true,
      "category": "fulfillment"
    },
    {
      "id": 2,
      "policy_id": "POL-002",
      "title": "Fraud Claim Policy",
      "policy_type": "dispute_policy",
      "is_active": true,
      "category": "fraud"
    }
  ],
  "total": 5
}
```

### 5.9 Search Policies By Keyword
```
GET /api/v1/policy/policies/search/{keyword}
```
URL Example: `GET /api/v1/policy/policies/search/non-receipt`

**Expected Response (200):**
```json
{
  "policies": [
    {
      "id": 1,
      "policy_id": "POL-001",
      "title": "Non-Receipt of Item Policy",
      "content": "If customer claims item was not received...",
      "policy_type": "dispute_policy",
      "is_active": true,
      "category": "fulfillment",
      "relevance": 0.95
    }
  ],
  "total": 1
}
```

### 5.10 Index Policies
```
POST /api/v1/policy/index-policies
```

**Expected Response (200):**
```json
{
  "indexed": 10,
  "failed": 0,
  "total": 10
}
```

### 5.11 Index Historical Cases
```
POST /api/v1/policy/index-cases
```

**Expected Response (200):**
```json
{
  "indexed": 50,
  "failed": 2,
  "total": 52
}
```

### 5.12 Get Vector Store Stats
```
GET /api/v1/policy/vector-store-stats
```

**Expected Response (200):**
```json
{
  "policy_vector_store": {
    "available": true,
    "document_count": 10,
    "collection_name": "dispute_policies",
    "embedding_model": "all-MiniLM-L6-v2",
    "embedding_available": true,
    "error": null
  },
  "case_vector_store": {
    "available": true,
    "document_count": 50,
    "collection_name": "historical_cases",
    "embedding_model": "all-MiniLM-L6-v2",
    "embedding_available": true,
    "error": null
  }
}
```

### 5.13 Search Policies (Semantic)
```
POST /api/v1/policy/search-policies
```

**Sample Request:**
```json
{
  "query": "customer claims item not received what are our obligations",
  "policy_type": "dispute_policy",
  "category": "fulfillment",
  "n_results": 5
}
```

**Expected Response (200):**
```json
{
  "results": [
    {
      "id": "POL-001",
      "content": "If customer claims item was not received within the expected delivery timeframe, the merchant must provide proof of delivery...",
      "metadata": {
        "title": "Non-Receipt of Item Policy",
        "policy_type": "dispute_policy",
        "category": "fulfillment"
      },
      "score": 0.92,
      "distance": 0.08
    },
    {
      "id": "POL-003",
      "content": "Customers must file non-receipt disputes within 30 calendar days of the expected delivery date...",
      "metadata": {
        "title": "Dispute Filing Timeline Policy",
        "policy_type": "dispute_policy",
        "category": "timeliness"
      },
      "score": 0.78,
      "distance": 0.22
    }
  ]
}
```

### 5.14 Search Similar Cases
```
POST /api/v1/policy/search-similar-cases
```

**Sample Request:**
```json
{
  "query": "Customer did not receive electronics item worth $299.99 from Amazon",
  "reason": "non_receipt",
  "n_results": 5
}
```

**Expected Response (200):**
```json
{
  "results": [
    {
      "id": "CASE-0423",
      "content": "Dispute DIS-2025-0423: Customer purchased laptop from Best Buy for $899.99, claimed non-receipt. Resolution: Merchant provided UPS delivery confirmation, case closed in merchant favor.",
      "metadata": {
        "dispute_id": 42,
        "reason": "non_receipt",
        "resolution": "merchant_favor"
      },
      "score": 0.88,
      "distance": 0.12
    },
    {
      "id": "CASE-0517",
      "content": "Dispute DIS-2025-0517: Customer claimed non-receipt of smartphone from Amazon. No delivery proof available. Resolution: Refund issued to customer.",
      "metadata": {
        "dispute_id": 51,
        "reason": "non_receipt",
        "resolution": "customer_favor"
      },
      "score": 0.72,
      "distance": 0.28
    }
  ]
}
```

---

## 6. Case File Generation

### 6.1 Generate Case File
```
POST /api/v1/case-file/generate
```

**Sample Request:**
```json
{
  "case_file_id": 1
}
```

**Alternative (by dispute_id):**
```json
{
  "dispute_id": 1
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Case file generated successfully",
  "case_file_id": 1,
  "case_file_ref": "CF-20260724-001",
  "dispute_id": 1,
  "status": "generated",
  "investigation_summary": "Investigation into dispute #1 (Amazon.com, $299.99) for non-receipt of Electronics Gadget. Evidence collected includes transaction records, communication logs, and uploaded documents. Timeline reconstructed with 4 events spanning 2026-06-15 to 2026-07-10. Policy mapping identified 3 applicable policies. Case confidence score: 0.74.",
  "confidence_score": 0.74,
  "package": {
    "case_file": {
      "id": 1,
      "case_file_id": "CF-20260724-001",
      "dispute_id": 1,
      "status": "generated",
      "confidence_score": 0.74
    },
    "timeline": [
      {"id": 1, "event_id": "TE-0001", "type": "purchase", "date": "2026-06-15", "title": "Customer purchased Electronics Gadget", "sequence_order": 1},
      {"id": 2, "event_id": "TE-0002", "type": "communication", "date": "2026-06-20", "title": "Customer contacted support about missing item", "sequence_order": 2}
    ],
    "evidence": [
      {"id": 1, "evidence_id": "EVD-0001", "type": "transaction", "title": "Transaction Record", "status": "collected", "amount": 299.99, "currency": "USD"},
      {"id": 2, "evidence_id": "EVD-0002", "type": "communication", "title": "Customer Support Chat", "status": "collected"}
    ],
    "validations": [
      {"id": 1, "validation_id": "VAL-0001", "category": "data_completeness", "severity": "critical", "title": "Missing delivery confirmation", "is_resolved": false}
    ],
    "policy_mapping": [
      {"id": 1, "mapping_id": "PM-0001", "match_type": "direct", "relevance_score": 0.95, "explanation": "Policy 3.2.1 addresses non-receipt", "is_applicable": true}
    ],
    "investigation_summary": "Investigation into dispute #1...",
    "confidence_score": 0.74
  }
}
```

### 6.2 Get Case File
```
GET /api/v1/case-file/{case_file_id}
```
URL Example: `GET /api/v1/case-file/1`

**Expected Response (200):**
```json
{
  "id": 1,
  "case_file_id": "CF-20260724-001",
  "dispute_id": 1,
  "status": "generated",
  "investigation_summary": "Investigation into dispute #1...",
  "confidence_score": 0.74,
  "generated_by": 1,
  "submitted_at": null,
  "metadata": {
    "merchant": "Amazon.com",
    "amount": 299.99,
    "currency": "USD",
    "reason": "non_receipt"
  },
  "created_at": "2026-07-24T10:05:00",
  "updated_at": "2026-07-24T10:35:00"
}
```

### 6.3 Get Case File By Dispute
```
GET /api/v1/case-file/dispute/{dispute_id}
```
URL Example: `GET /api/v1/case-file/dispute/1`

**Expected Response (200):**
```json
{
  "id": 1,
  "case_file_id": "CF-20260724-001",
  "dispute_id": 1,
  "status": "generated",
  "confidence_score": 0.74,
  "created_at": "2026-07-24T10:05:00",
  "updated_at": "2026-07-24T10:35:00"
}
```

### 6.4 List Case Files
```
GET /api/v1/case-file/
```

**Expected Response (200):**
```json
{
  "case_files": [
    {
      "id": 1,
      "case_file_id": "CF-20260724-001",
      "dispute_id": 1,
      "status": "generated",
      "confidence_score": 0.74,
      "created_at": "2026-07-24T10:05:00",
      "updated_at": "2026-07-24T10:35:00"
    },
    {
      "id": 2,
      "case_file_id": "CF-20260724-002",
      "dispute_id": 2,
      "status": "evidence_collected",
      "confidence_score": null,
      "created_at": "2026-07-24T09:00:00",
      "updated_at": "2026-07-24T09:05:00"
    }
  ],
  "total": 2
}
```

### 6.5 Get Standardized Package
```
GET /api/v1/case-file/{case_file_id}/package
```
URL Example: `GET /api/v1/case-file/1/package`

**Expected Response (200):**
```json
{
  "case_file": {
    "id": 1,
    "case_file_id": "CF-20260724-001",
    "dispute_id": 1,
    "status": "generated",
    "confidence_score": 0.74
  },
  "timeline": [
    {"id": 1, "event_id": "TE-0001", "type": "purchase", "date": "2026-06-15", "title": "Customer purchased Electronics Gadget", "sequence_order": 1},
    {"id": 2, "event_id": "TE-0002", "type": "communication", "date": "2026-06-20", "title": "Customer contacted support about missing item", "sequence_order": 2}
  ],
  "evidence": [
    {"id": 1, "evidence_id": "EVD-0001", "type": "transaction", "title": "Transaction Record", "status": "collected", "merchant_name": "Amazon.com", "amount": 299.99, "currency": "USD", "event_date": "2026-06-15"}
  ],
  "validations": [
    {"id": 1, "validation_id": "VAL-0001", "category": "data_completeness", "severity": "critical", "title": "Missing delivery confirmation", "is_resolved": false}
  ],
  "policy_mapping": [
    {"id": 1, "mapping_id": "PM-0001", "match_type": "direct", "relevance_score": 0.95, "explanation": "Policy 3.2.1 addresses non-receipt", "is_applicable": true}
  ],
  "investigation_summary": "Investigation into dispute #1...",
  "confidence_score": 0.74
}
```

### 6.6 Get Standardized Package For Dispute
```
GET /api/v1/case-file/dispute/{dispute_id}/package
```
URL Example: `GET /api/v1/case-file/dispute/1/package`

**Expected Response (200):**
```json
{
  "case_file": {
    "id": 1,
    "case_file_id": "CF-20260724-001",
    "dispute_id": 1,
    "status": "generated",
    "confidence_score": 0.74
  },
  "timeline": [],
  "evidence": [],
  "validations": [],
  "policy_mapping": [],
  "investigation_summary": "Investigation into dispute #1...",
  "confidence_score": 0.74
}
```

### 6.7 Update Case File Status
```
PUT /api/v1/case-file/{case_file_id}/status
```
URL Example: `PUT /api/v1/case-file/1/status`

**Sample Request:**
```json
{
  "status": "submitted",
  "submitted_at": "2026-07-24T12:00:00"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Case file 1 status updated to 'submitted'",
  "case_file": {
    "id": 1,
    "case_file_id": "CF-20260724-001",
    "status": "submitted",
    "submitted_at": "2026-07-24T12:00:00"
  }
}
```

### 6.8 Submit Case File
```
POST /api/v1/case-file/{case_file_id}/submit
```
URL Example: `POST /api/v1/case-file/1/submit`

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Case file 1 submitted successfully",
  "case_file": {
    "id": 1,
    "case_file_id": "CF-20260724-001",
    "status": "submitted",
    "submitted_at": "2026-07-24T12:00:00"
  }
}
```

### 6.9 Get Confidence Analysis
```
GET /api/v1/case-file/{case_file_id}/confidence
```
URL Example: `GET /api/v1/case-file/1/confidence`

**Expected Response (200):**
```json
{
  "overall_score": 0.74,
  "components": {
    "evidence_completeness": 0.72,
    "timeline_quality": 0.85,
    "validation_status": 0.60,
    "policy_mapping": 0.80,
    "evidence_processing": 0.75
  },
  "recommendations": [
    "Resolve critical validation 'Missing delivery confirmation' to improve score",
    "Add manual events to fill the 20-day gap in timeline",
    "Upload additional evidence to improve evidence completeness score"
  ]
}
```

---

## 7. Health & Root

### 7.1 Health Check
```
GET /health
```

**Expected Response (200):**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-07-24T12:00:00"
}
```

### 7.2 Root
```
GET /
```

**Expected Response (200):**
```json
{
  "name": "DisputeIQ",
  "version": "1.0.0",
  "description": "AI-Powered Multi-Agent Dispute Resolution System",
  "docs": "/docs"
}
```

---

## Quick Start - Complete End-to-End Test Flow

Run these requests in order to test the full workflow:

```bash
# Step 1: Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"TestPass123!"}'

# Step 2: Login (save the token)
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPass123!"}'

export TOKEN="<paste-token-here>"

# Step 3: Collect Evidence
curl -X POST http://localhost:8000/api/v1/evidence/collect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dispute_id": 1}'

# Step 4: Extract Entities
curl -X POST http://localhost:8000/api/v1/evidence/extract \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"case_file_id": 1}'

# Step 5: Reconstruct Timeline
curl -X POST http://localhost:8000/api/v1/timeline/reconstruct \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"case_file_id": 1}'

# Step 6: Validate Case File
curl -X POST http://localhost:8000/api/v1/validation/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"case_file_id": 1}'

# Step 7: Map Policies
curl -X POST http://localhost:8000/api/v1/policy/map \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"case_file_id": 1}'

# Step 8: Generate Case File
curl -X POST http://localhost:8000/api/v1/case-file/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"case_file_id": 1}'

# Step 9: Get Confidence Analysis
curl -X GET http://localhost:8000/api/v1/case-file/1/confidence \
  -H "Authorization: Bearer $TOKEN"

# Step 10: Submit Case File
curl -X POST http://localhost:8000/api/v1/case-file/1/submit \
  -H "Authorization: Bearer $TOKEN"
```

---

## Error Handling Reference

| Status Code | Meaning | Common Causes |
|------------|---------|---------------|
| 200 | Success | Request processed correctly |
| 201 | Created | Resource (user) created successfully |
| 400 | Bad Request | Missing/invalid fields in request body |
| 401 | Unauthorized | Missing/invalid/expired JWT token |
| 403 | Forbidden | User lacks permissions for this action |
| 404 | Not Found | Resource ID (dispute, case_file, evidence) doesn't exist |
| 422 | Validation Error | Request body fails schema validation (check response `detail` array) |
| 500 | Internal Server Error | Backend exception (check server logs) |

**Sample 422 Error Response:**
```json
{
  "detail": [
    {
      "loc": ["body", "username"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}