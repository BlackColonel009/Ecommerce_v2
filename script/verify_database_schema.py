"""Vérifie la structure SQLAlchemy réellement présente, sans modifier la base."""

import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from dotenv import load_dotenv

load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

import models  # noqa: E402,F401 - remplit Base.metadata avec tous les modèles
from database import Base, engine  # noqa: E402
from sqlalchemy import inspect, text  # noqa: E402


def verify_database_schema() -> list[str]:
    problems: list[str] = []
    inspector = inspect(engine)
    database_tables = set(inspector.get_table_names())
    expected_tables = set(Base.metadata.tables)

    for table_name in sorted(expected_tables - database_tables):
        problems.append(f"table absente: {table_name}")

    for table_name in sorted(expected_tables & database_tables):
        actual_columns = {column["name"] for column in inspector.get_columns(table_name)}
        expected_columns = {column.name for column in Base.metadata.tables[table_name].columns}
        for column_name in sorted(expected_columns - actual_columns):
            problems.append(f"colonne absente: {table_name}.{column_name}")

    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return problems


if __name__ == "__main__":
    issues = verify_database_schema()
    if issues:
        print("❌ Structure de base incomplète:")
        for issue in issues:
            print(f"  - {issue}")
        raise SystemExit(1)
    print(f"✅ Base accessible et conforme: {len(Base.metadata.tables)} tables vérifiées")
