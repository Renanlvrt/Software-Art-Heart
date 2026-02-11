import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'demoTable.db')
print(f'Opening: {db_path}')
print(f'Exists: {os.path.exists(db_path)}')

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# List tables
cur.execute("SELECT name, sql FROM sqlite_master WHERE type='table'")
tables = cur.fetchall()

print('\n=== TABLES ===')
for name, sql in tables:
    cur.execute(f'SELECT COUNT(*) FROM [{name}]')
    count = cur.fetchone()[0]
    print(f'\nTABLE: {name} ({count} rows)')
    print(sql)

# Column info
print('\n=== COLUMNS ===')
for name, _ in tables:
    cur.execute(f'PRAGMA table_info([{name}])')
    cols = cur.fetchall()
    print(f'\n{name}:')
    for col in cols:
        print(f'  {col[1]:20s} {col[2]:15s} {"NOT NULL" if col[3] else "":10s} {"PK" if col[5] else ""}')

# Sample rows
print('\n=== SAMPLE DATA (first 3 rows per table) ===')
for name, _ in tables:
    cur.execute(f'SELECT * FROM [{name}] LIMIT 3')
    rows = cur.fetchall()
    print(f'\n{name}:')
    # Get column names
    col_names = [desc[0] for desc in cur.description]
    print(f'  Columns: {col_names}')
    for row in rows:
        print(f'  {row}')

# Last 3 rows too
print('\n=== LAST 3 ROWS (to see time range) ===')
for name, _ in tables:
    cur.execute(f'SELECT * FROM [{name}] ORDER BY rowid DESC LIMIT 3')
    rows = cur.fetchall()
    print(f'\n{name}:')
    for row in rows:
        print(f'  {row}')

conn.close()
print('\nDone.')
