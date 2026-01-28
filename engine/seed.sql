-- =========================
-- DEPARTMENTS
-- =========================
CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

INSERT INTO departments (id, name) VALUES
  (1, 'Engineering'),
  (2, 'Sales'),
  (3, 'HR'),
  (4, 'Finance');

-- =========================
-- EMPLOYEES
-- =========================
CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  department_id INTEGER NOT NULL,
  salary INTEGER NOT NULL CHECK (salary > 0),
  hire_date TEXT NOT NULL,

  FOREIGN KEY (department_id) REFERENCES departments(id)
);

INSERT INTO employees VALUES
  (1, 'Alice', 'alice@corp.com', 1, 90000, '2020-01-10'),
  (2, 'Bob', 'bob@corp.com', 1, 85000, '2021-03-15'),
  (3, 'Charlie', 'charlie@corp.com', 2, 70000, '2019-07-22'),
  (4, 'Diana', 'diana@corp.com', 2, 72000, '2022-02-01'),
  (5, 'Eve', 'eve@corp.com', 3, 60000, '2018-11-30'),
  (6, 'Frank', 'frank@corp.com', 4, 95000, '2017-06-05');

-- =========================
-- CUSTOMERS
-- =========================
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  city TEXT NOT NULL
);

INSERT INTO customers VALUES
  (1, 'Acme Corp', 'contact@acme.com', 'New York'),
  (2, 'Globex', 'sales@globex.com', 'Chicago'),
  (3, 'Initech', 'info@initech.com', 'San Francisco'),
  (4, 'Umbrella', 'hello@umbrella.com', 'Boston');

-- =========================
-- PRODUCTS
-- =========================
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL CHECK (price > 0)
);

INSERT INTO products VALUES
  (1, 'Laptop', 'Electronics', 1200.00),
  (2, 'Keyboard', 'Electronics', 50.00),
  (3, 'Mouse', 'Electronics', 25.00),
  (4, 'Desk', 'Furniture', 300.00),
  (5, 'Chair', 'Furniture', 150.00);

-- =========================
-- ORDERS
-- =========================
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  order_date TEXT NOT NULL,

  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

INSERT INTO orders VALUES
  (1, 1, '2024-01-05'),
  (2, 2, '2024-01-10'),
  (3, 1, '2024-02-01'),
  (4, 3, '2024-02-10'),
  (5, 4, '2024-03-01');

-- =========================
-- ORDER ITEMS
-- =========================
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),

  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

INSERT INTO order_items VALUES
  (1, 1, 1, 2),
  (2, 1, 2, 5),
  (3, 2, 3, 10),
  (4, 3, 4, 1),
  (5, 3, 5, 4),
  (6, 4, 1, 1),
  (7, 5, 5, 2);

-- =========================
-- PAYMENTS
-- =========================
CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  amount REAL NOT NULL CHECK (amount >= 0),
  payment_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),

  FOREIGN KEY (order_id) REFERENCES orders(id)
);

INSERT INTO payments VALUES
  (1, 1, 2500.00, '2024-01-06', 'COMPLETED'),
  (2, 2, 250.00, '2024-01-11', 'COMPLETED'),
  (3, 3, 900.00, '2024-02-02', 'PENDING'),
  (4, 4, 1200.00, '2024-02-11', 'COMPLETED'),
  (5, 5, 300.00, '2024-03-02', 'FAILED');
