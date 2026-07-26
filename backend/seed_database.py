"""
Seed database with sample data for DisputeIQ testing.
Run this script to populate your database with test data.
"""

import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from app.core.database import engine, Base, get_db
from app.models.existing import Customer, Merchant, Transaction, Order, Dispute, DisputeReason
from app.models.new import CaseFile


def seed_database():
    """Seed the database with sample data."""
    
    # Create all tables
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Get database session
    db = next(get_db())
    
    try:
        # Check if data already exists
        existing_customer = db.query(Customer).first()
        if existing_customer:
            print("Sample data already exists! Skipping seed.")
            return
        
        print("Seeding sample data...")
        
        # Create Customer
        customer = Customer(
            customer_id="CUST001",
            first_name="John",
            last_name="Doe",
            email="john.doe@example.com",
            is_verified=True
        )
        db.add(customer)
        db.flush()  # Get the ID without committing
        
        print(f"✅ Created Customer: {customer.first_name} {customer.last_name} (ID: {customer.id})")
        
        # Create Merchant
        merchant = Merchant(
            merchant_id="MCH001",
            business_name="Test Merchant",
            email="merchant@example.com",
            is_active=True
        )
        db.add(merchant)
        db.flush()
        
        print(f"✅ Created Merchant: {merchant.business_name} (ID: {merchant.id})")
        
        # Create Transaction
        transaction = Transaction(
            transaction_id="TXN001",
            customer_id=customer.id,
            merchant_id=merchant.id,
            transaction_type="sale",
            amount=100.00,
            currency="USD",
            transaction_date="2026-01-15T10:00:00",
            is_disputed=True
        )
        db.add(transaction)
        db.flush()
        
        print(f"✅ Created Transaction: {transaction.transaction_id} (ID: {transaction.id})")
        
        # Create Order
        order = Order(
            order_id="ORD001",
            customer_id=customer.id,
            merchant_id=merchant.id,
            order_date="2026-01-15T10:00:00",
            status="shipped",
            total_amount=100.00,
            currency="USD"
        )
        db.add(order)
        db.flush()
        
        print(f"✅ Created Order: {order.order_id} (ID: {order.id})")
        
        # Create Dispute
        dispute = Dispute(
            dispute_id="DSP001",
            customer_id=customer.id,
            merchant_id=merchant.id,
            transaction_id=transaction.id,
            order_id=order.id,
            reason=DisputeReason.PRODUCT_NOT_RECEIVED,
            description="Customer claims product not received",
            amount=100.00,
            currency="USD",
            filed_at="2026-01-20T10:00:00"
        )
        db.add(dispute)
        db.flush()
        
        print(f"✅ Created Dispute: {dispute.dispute_id} (ID: {dispute.id})")
        
        # Create additional sample data for variety
        customer2 = Customer(
            customer_id="CUST002",
            first_name="Jane",
            last_name="Smith",
            email="jane.smith@example.com",
            is_verified=True
        )
        db.add(customer2)
        db.flush()
        
        transaction2 = Transaction(
            transaction_id="TXN002",
            customer_id=customer2.id,
            merchant_id=merchant.id,
            transaction_type="sale",
            amount=299.99,
            currency="USD",
            transaction_date="2026-06-15T14:30:00",
            is_disputed=True
        )
        db.add(transaction2)
        db.flush()
        
        dispute2 = Dispute(
            dispute_id="DSP002",
            customer_id=customer2.id,
            merchant_id=merchant.id,
            transaction_id=transaction2.id,
            order_id=order.id,
            reason=DisputeReason.UNAUTHORIZED_CHARGE,
            description="Customer claims unauthorized charge on credit card",
            amount=299.99,
            currency="USD",
            filed_at="2026-06-20T09:15:00"
        )
        db.add(dispute2)
        db.flush()
        
        print(f"✅ Created second sample dispute: {dispute2.dispute_id} (ID: {dispute2.id})")
        
        # Commit all changes
        db.commit()
        
        print("\n🎉 Database seeded successfully!")
        print("\n📋 Sample Data Summary:")
        print(f"   - Customers: {db.query(Customer).count()}")
        print(f"   - Merchants: {db.query(Merchant).count()}")
        print(f"   - Transactions: {db.query(Transaction).count()}")
        print(f"   - Orders: {db.query(Order).count()}")
        print(f"   - Disputes: {db.query(Dispute).count()}")
        print("\n🔍 You can now use dispute_id = 1 or dispute_id = 2 for testing!")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()