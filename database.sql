CREATE TYPE user_role AS ENUM ('admin', 'client', 'engineer');
CREATE TYPE service_type AS ENUM ('Installation', 'Training', 'Complaint', 'Maintenance', 'Other');
CREATE TYPE punctuality_answer AS ENUM ('Yes', 'No', 'Not Applicable');
CREATE TYPE resolution_answer AS ENUM ('Fully', 'Partially', 'Not Resolved', 'Not Applicable');
CREATE TYPE feedback_status AS ENUM ('Submitted', 'Reviewed', 'Action Taken', 'Closed');
CREATE TYPE feedback_priority AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE nps_score AS ENUM ('Promoter', 'Passive', 'Detractor');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_users_username ON users (username);
CREATE INDEX ix_users_email ON users (email);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  product_name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  institution_name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(150) NOT NULL,
  mobile VARCHAR(40) NOT NULL,
  email VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_clients_institution_name ON clients (institution_name);

CREATE TABLE client_products (
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, product_id)
);

CREATE TABLE engineers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  engineer_name VARCHAR(150) NOT NULL,
  mobile VARCHAR(40),
  email VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feedbacks (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  contact_person_name VARCHAR(150) NOT NULL,
  mobile_email VARCHAR(255) NOT NULL,
  product_software_name VARCHAR(150) NOT NULL,
  type_of_service service_type NOT NULL,
  date_of_service DATE NOT NULL,
  support_engineer_name VARCHAR(150) NOT NULL,
  was_engineer_punctual punctuality_answer NOT NULL,
  was_issue_resolved resolution_answer NOT NULL,
  quality_of_service INTEGER NOT NULL CHECK (quality_of_service BETWEEN 1 AND 5),
  overall_satisfaction INTEGER NOT NULL CHECK (overall_satisfaction BETWEEN 1 AND 5),
  feedback_on_software TEXT,
  problems_still_pending TEXT,
  suggestions_for_improvement TEXT,
  engineers_behaviour INTEGER NOT NULL CHECK (engineers_behaviour BETWEEN 1 AND 5),
  engineers_technical_knowledge INTEGER NOT NULL CHECK (engineers_technical_knowledge BETWEEN 1 AND 5),
  additional_requirements TEXT,
  references_for_clients TEXT,
  any_other_comments TEXT,
  service_ticket_id VARCHAR(50),
  feedback_status feedback_status NOT NULL DEFAULT 'Submitted',
  priority feedback_priority NOT NULL,
  nps_score nps_score NOT NULL,
  follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
  admin_remarks TEXT,
  action_taken TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_feedbacks_client_id ON feedbacks (client_id);
CREATE INDEX ix_feedbacks_date_of_service ON feedbacks (date_of_service);
CREATE INDEX ix_feedbacks_created_at ON feedbacks (created_at);
