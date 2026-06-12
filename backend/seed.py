"""
Seed the database from data_200/ CSV files.

Run from the backend/ directory:
    python seed.py

WARNING: This WIPES all existing data and replaces it with the CSV data.
"""
import sys

sys.path.insert(0, ".")

from app.seed_data import seed_database

if __name__ == "__main__":
    print("Seeding database (wiping existing data)...")
    seed_database(wipe=True)
    print("\nSeeding complete!")
    print("Login: demo@example.com / demo1234")
