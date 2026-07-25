"""
Existing database tables (Read-only from Module 1 perspective).
These represent the source data that the Evidence Collection Agent queries.
"""

import datetime
import enum
from decimal import Decimal

from sqlalchemy import (
    Column, Integer, String, Text, Numeric, Boolean, DateTime,
    ForeignKey, Enum as SAEnum, Date, JSON,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.mixins import IDMixin, TimestampMixin


# --------------- Enums ---------------

class DisputeStatus(str, enum.Enum):
    OPEN = "open"
    UNDER_REVIEW = "under_review"
    EVIDENCE_REQUESTED = "evidence_requested"
    RESOLVED = "resolved"
    CLOSED = "closed"
    ESCALATED = "escalated"


class DisputeReason(str, enum.Enum):
    FRAUD = "fraud"
    DUPLICATE = "duplicate"
    PRODUCT_NOT_RECEIVED = "product_not_received"
    PRODUCT_DEFECTIVE = "product_defective"
    REFUND_NOT_PROCESSED = "refund_not_processed"
    UNAUTHORIZED = "unauthorized"
    OTHER = "other"


class CommunicationType(str, enum.Enum):
    EMAIL = "email"
    CHAT = "chat"
    PHONE = "phone"
    INTERNAL_NOTE = "internal_note"


class PaymentMethod(str, enum.Enum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BANK_TRANSFER = "bank_transfer"
    DIGITAL_WALLET = "digital_wallet"
    OTHER = "other"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class RefundStatus(str, enum.Enum):
    REQUESTED = "requested"
    APPROVED = "approved"
    PROCESSED = "processed"
    REJECTED = "rejected"


class TransactionType(str, enum.Enum):
    SALE = "sale"
    REFUND = "refund"
    CHARGEBACK = "chargeback"
    ADJUSTMENT = "adjustment"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"


# --------------- Models ---------------

class Customer(Base, IDMixin, TimestampMixin):
    """Represents a customer who filed or is involved in a dispute."""

    __tablename__ = "customers"

    customer_id = Column(String(100), unique=True, index=True, nullable=False, comment="External customer identifier")
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    address_line1 = Column(String(255), nullable=True)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(100), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Relationships
    transactions = relationship("Transaction", back_populates="customer")
    orders = relationship("Order", back_populates="customer")
    payments = relationship("Payment", back_populates="customer")
    refunds = relationship("RefundHistory", back_populates="customer")
    communications = relationship("Communication", back_populates="customer")
    disputes = relationship("Dispute", back_populates="customer")

    def __repr__(self) -> str:
        return f"<Customer(id={self.id}, name={self.first_name} {self.last_name})>"


class Merchant(Base, IDMixin, TimestampMixin):
    """Represents a merchant involved in a dispute."""

    __tablename__ = "merchants"

    merchant_id = Column(String(100), unique=True, index=True, nullable=False, comment="External merchant identifier")
    business_name = Column(String(255), nullable=False)
    legal_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    website = Column(String(255), nullable=True)
    address_line1 = Column(String(255), nullable=True)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(100), nullable=True)
    category = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    metadata_json = Column(JSON, nullable=True, comment="Arbitrary merchant metadata")

    # Relationships
    transactions = relationship("Transaction", back_populates="merchant")
    orders = relationship("Order", back_populates="merchant")
    disputes = relationship("Dispute", back_populates="merchant")

    def __repr__(self) -> str:
        return f"<Merchant(id={self.id}, name={self.business_name})>"


class Transaction(Base, IDMixin, TimestampMixin):
    """Represents a financial transaction between a customer and merchant."""

    __tablename__ = "transactions"

    transaction_id = Column(String(100), unique=True, index=True, nullable=False, comment="External transaction ID")
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=False, index=True)
    transaction_type = Column(SAEnum(TransactionType), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    description = Column(Text, nullable=True)
    transaction_date = Column(DateTime, nullable=False, index=True)
    is_disputed = Column(Boolean, default=False, nullable=False)
    reference_number = Column(String(100), nullable=True)
    metadata_json = Column(JSON, nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="transactions")
    merchant = relationship("Merchant", back_populates="transactions")

    def __repr__(self) -> str:
        return f"<Transaction(id={self.id}, tx={self.transaction_id}, amount={self.amount})>"


class Order(Base, IDMixin, TimestampMixin):
    """Represents a customer order placed with a merchant."""

    __tablename__ = "orders"

    order_id = Column(String(100), unique=True, index=True, nullable=False, comment="External order ID")
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=False, index=True)
    order_date = Column(DateTime, nullable=False, index=True)
    status = Column(SAEnum(OrderStatus), nullable=False, default=OrderStatus.PENDING)
    total_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    shipping_address = Column(Text, nullable=True)
    billing_address = Column(Text, nullable=True)
    tracking_number = Column(String(100), nullable=True)
    delivery_date = Column(DateTime, nullable=True)
    items_json = Column(JSON, nullable=True, comment="List of order items with details")
    notes = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="orders")
    merchant = relationship("Merchant", back_populates="orders")

    def __repr__(self) -> str:
        return f"<Order(id={self.id}, order={self.order_id}, status={self.status})>"


class Payment(Base, IDMixin, TimestampMixin):
    """Represents a payment made for an order or transaction."""

    __tablename__ = "payments"

    payment_id = Column(String(100), unique=True, index=True, nullable=False, comment="External payment ID")
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    payment_method = Column(SAEnum(PaymentMethod), nullable=False)
    payment_date = Column(DateTime, nullable=False, index=True)
    status = Column(SAEnum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING)
    gateway_reference = Column(String(200), nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    metadata_json = Column(JSON, nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="payments")

    def __repr__(self) -> str:
        return f"<Payment(id={self.id}, payment={self.payment_id}, amount={self.amount})>"


class RefundHistory(Base, IDMixin, TimestampMixin):
    """Represents the history of refunds processed for a customer."""

    __tablename__ = "refund_history"

    refund_id = Column(String(100), unique=True, index=True, nullable=False, comment="External refund ID")
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    refund_date = Column(DateTime, nullable=False)
    status = Column(SAEnum(RefundStatus), nullable=False, default=RefundStatus.REQUESTED)
    reason = Column(Text, nullable=True)
    approved_by = Column(String(100), nullable=True)
    metadata_json = Column(JSON, nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="refunds")

    def __repr__(self) -> str:
        return f"<RefundHistory(id={self.id}, refund={self.refund_id}, amount={self.amount})>"


class Communication(Base, IDMixin, TimestampMixin):
    """Represents a communication record (email, chat, phone call, note)."""

    __tablename__ = "communications"

    communication_id = Column(String(100), unique=True, index=True, nullable=False, comment="External communication ID")
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    dispute_id = Column(Integer, ForeignKey("disputes.id"), nullable=True, index=True)
    communication_type = Column(SAEnum(CommunicationType), nullable=False)
    subject = Column(String(500), nullable=True)
    body = Column(Text, nullable=False)
    sender = Column(String(255), nullable=False)
    recipient = Column(String(255), nullable=False)
    sent_at = Column(DateTime, nullable=False, index=True)
    is_internal = Column(Boolean, default=False, nullable=False)
    attachment_urls = Column(JSON, nullable=True, comment="List of attachment file URLs")
    metadata_json = Column(JSON, nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="communications")

    def __repr__(self) -> str:
        return f"<Communication(id={self.id}, type={self.communication_type}, subject={self.subject})>"


class Dispute(Base, IDMixin, TimestampMixin):
    """Represents a dispute case filed by a customer."""

    __tablename__ = "disputes"

    dispute_id = Column(String(100), unique=True, index=True, nullable=False, comment="External dispute/case ID")
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=False, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    reason = Column(SAEnum(DisputeReason), nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    status = Column(SAEnum(DisputeStatus), nullable=False, default=DisputeStatus.OPEN)
    filed_at = Column(DateTime, nullable=False, index=True)
    resolved_at = Column(DateTime, nullable=True)
    assigned_to = Column(String(100), nullable=True, comment="Investigator user ID")
    priority = Column(String(20), default="normal", nullable=False)
    metadata_json = Column(JSON, nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="disputes")
    merchant = relationship("Merchant", back_populates="disputes")

    def __repr__(self) -> str:
        return f"<Dispute(id={self.id}, dispute={self.dispute_id}, reason={self.reason})>"


class PolicyRepository(Base, IDMixin, TimestampMixin):
    """Represents a policy document in the policy repository."""

    __tablename__ = "policy_repository"

    policy_id = Column(String(100), unique=True, index=True, nullable=False, comment="External policy ID")
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    policy_type = Column(String(100), nullable=False, comment="e.g., refund_policy, dispute_resolution, terms_of_service")
    effective_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    version = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    category = Column(String(100), nullable=True)
    tags = Column(JSON, nullable=True, comment="List of tags for search")
    source_url = Column(String(500), nullable=True)
    metadata_json = Column(JSON, nullable=True)

    def __repr__(self) -> str:
        return f"<PolicyRepository(id={self.id}, title={self.title}, type={self.policy_type})>"