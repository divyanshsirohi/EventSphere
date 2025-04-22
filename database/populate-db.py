import faker
import random
import psycopg2
from datetime import datetime, timedelta

# Connect to PostgreSQL database
conn = psycopg2.connect(
    dbname="eventsphere",
    user="postgres",
    password="yourpassword",
    host="localhost",
    port="5432"
)
cursor = conn.cursor()

# Initialize Faker
fake = faker.Faker()

# Get existing host IDs from the database
print("Getting host IDs...")
cursor.execute("SELECT person_id FROM person WHERE role = 'host'")
host_ids = [row[0] for row in cursor.fetchall()]
print(f"Found {len(host_ids)} hosts")

if not host_ids:
    print("No hosts found in database. Events require host organizers.")
    cursor.close()
    conn.close()
    exit(1)

# Get existing category IDs
print("Getting category IDs...")
cursor.execute("SELECT category_id FROM category")
category_ids = [row[0] for row in cursor.fetchall()]
print(f"Found {len(category_ids)} categories")

if not category_ids:
    print("No categories found in database. Events require categories.")
    cursor.close()
    conn.close()
    exit(1)

# Get existing location IDs
print("Getting location IDs...")
cursor.execute("SELECT location_id FROM location")
location_ids = [row[0] for row in cursor.fetchall()]
print(f"Found {len(location_ids)} locations")

if not location_ids:
    print("No locations found in database. Events require locations.")
    cursor.close()
    conn.close()
    exit(1)

# Generate and insert events
print("Generating events...")
event_ids = []

# Calculate date 1 month from now (April 18, 2025 + 30 days)
one_month_later = datetime.now() + timedelta(days=30)

for i in range(300):
    event_name = fake.catch_phrase()
    description = fake.text(max_nb_chars=200)
    price = round(random.uniform(10, 200), 2)
    
    # Create dates - all at least 1 month in the future
    start_date = fake.date_time_between(start_date=one_month_later, end_date='+6m')
    end_date = start_date + timedelta(hours=random.randint(1, 8))
    
    capacity = random.randint(10, 300)
    organizer_id = random.choice(host_ids)
    category_id = random.choice(category_ids)
    
    cursor.execute(
        """INSERT INTO events 
           (event_name, description, price, start_date, end_date, capacity, organizer_id, category_id) 
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING event_id""",
        (event_name, description, price, start_date, end_date, capacity, organizer_id, category_id)
    )
    event_id = cursor.fetchone()[0]
    event_ids.append(event_id)
    
    # Assign a location to the event
    location_id = random.choice(location_ids)
    cursor.execute(
        "INSERT INTO location_hosting (location_id, event_id) VALUES (%s, %s)",
        (location_id, event_id)
    )
    
    if i % 10 == 0:
        print(f"  Created {i} events...")

conn.commit()
print(f"Created {len(event_ids)} events")

# Close connection
cursor.close()
conn.close()

print("Event generation completed successfully!")
