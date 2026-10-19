from datetime import date, timedelta
import re

from sqlalchemy.orm import Session

from app.auth import hash_password
from app.models import Client, Engineer, Feedback, Product, User


def seed_data(db: Session) -> None:
    admin = db.query(User).filter(User.email == "admin@biyani.com").first()
    if not admin:
        db.add(User(
            username="admin",
            email="admin@biyani.com",
            password_hash=hash_password("admin123"),
            role="admin",
        ))

    products = {}
    for name, description in [
        ("Fee Management", "Fee collection, invoicing and finance reporting."),
        ("Library System", "Cataloguing, circulation and library member management."),
        ("Attendance System", "Attendance capture, summaries and alerts."),
    ]:
        product = db.query(Product).filter(Product.product_name == name).first()
        if not product:
            product = Product(product_name=name, description=description)
            db.add(product)
            db.flush()
        products[name] = product

    clients = []
    client_specs = [
        ("Biyani School", "Neha Biyani", "+91 98765 43210", "neha@biyanischool.edu", "Jaipur",
         ["Fee Management", "Attendance System"]),
        ("City College", "Rahul Mehta", "+91 98290 12345", "rahul@citycollege.edu", "Jaipur",
         ["Library System", "Attendance System"]),
        ("Sunshine Institute", "Priya Sethi", "+91 98111 23456", "priya@sunshine.edu", "Ajmer",
         ["Fee Management", "Library System"]),
    ]
    for institution, contact, mobile, email, city, product_names in client_specs:
        client = db.query(Client).filter(Client.institution_name == institution).first()
        if not client:
            client = Client(
                institution_name=institution,
                contact_person=contact,
                mobile=mobile,
                email=email,
                address=f"{city}, Rajasthan",
                city=city,
            )
            db.add(client)
            db.flush()
        if not client.user_id:
            client_user = db.query(User).filter(User.email == email).first()
            if not client_user:
                username = re.sub(r"[^a-z0-9]+", "-", institution.lower()).strip("-")
                client_user = User(
                    username=username,
                    email=email,
                    password_hash=hash_password("client123"),
                    role="client",
                )
                db.add(client_user)
                db.flush()
            client.user_id = client_user.id
        client.products = [products[name] for name in product_names]
        clients.append(client)

    engineer_names = [("Amit Sharma", "+91 98100 01001", "amit@biyani.com"),
                      ("Priya Patel", "+91 98100 01002", "priya.patel@biyani.com")]
    engineers = {}
    for name, mobile, email in engineer_names:
        engineer = db.query(Engineer).filter(Engineer.engineer_name == name).first()
        if not engineer:
            engineer = Engineer(engineer_name=name, mobile=mobile, email=email)
            db.add(engineer)
            db.flush()
        if not engineer.user_id:
            engineer_user = db.query(User).filter(User.email == email).first()
            if not engineer_user:
                username = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
                engineer_user = User(
                    username=username,
                    email=email,
                    password_hash=hash_password("engineer123"),
                    role="engineer",
                )
                db.add(engineer_user)
                db.flush()
            engineer.user_id = engineer_user.id
        engineers[name] = engineer

    if db.query(Feedback).count() == 0:
        examples = [
            (0, "Fee Management", "Installation", 5, 5, "Fully", "Yes", 0),
            (1, "Library System", "Training", 4, 4, "Fully", "Yes", 1),
            (2, "Fee Management", "Complaint", 3, 2, "Partially", "No", 0),
            (0, "Attendance System", "Maintenance", 5, 4, "Fully", "Yes", 1),
            (1, "Attendance System", "Other", 4, 5, "Not Applicable", "Yes", 0),
        ]
        for index, (client_index, product_name, service, quality, satisfaction, resolved, punctual, engineer_index) in enumerate(examples):
            client = clients[client_index]
            pending = "Waiting for the attendance export fix." if index == 2 else ""
            db.add(Feedback(
                client_id=client.id,
                contact_person_name=client.contact_person,
                mobile_email=f"{client.mobile} / {client.email}",
                product_software_name=product_name,
                type_of_service=service,
                date_of_service=date.today() - timedelta(days=index * 8),
                support_engineer_name=list(engineers)[engineer_index],
                was_engineer_punctual=punctual,
                was_issue_resolved=resolved,
                quality_of_service=quality,
                overall_satisfaction=satisfaction,
                feedback_on_software="Simple to use and well supported.",
                problems_still_pending=pending,
                suggestions_for_improvement="Keep improving the reporting experience.",
                engineers_behaviour=5 if index != 2 else 4,
                engineers_technical_knowledge=5 if index < 3 else 4,
                additional_requirements=None,
                references_for_clients=None,
                any_other_comments=None,
                service_ticket_id=f"BT-SEED-{index + 1:03}",
                feedback_status="Submitted" if index == 2 else "Reviewed",
                priority="High" if min(quality, satisfaction) <= 2 else "Medium" if min(quality, satisfaction) < 5 else "Low",
                nps_score="Promoter" if satisfaction >= 4 else "Passive" if satisfaction == 3 else "Detractor",
                follow_up_required=resolved != "Fully" or bool(pending),
            ))
    db.commit()
