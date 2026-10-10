import sqlite3

conn = sqlite3.connect('formless.db')
c = conn.cursor()
c.execute("""
    UPDATE requirement 
    SET id = '15da6218-9870-4ed5-8c65-5600b2a4d5b5' 
    WHERE code = 'FSSAI-REQ-07' 
      AND application_id IN (SELECT id FROM application WHERE applicant_context_id = 'demo_applicant_01')
""")
conn.commit()
print("Updated rows:", c.rowcount)
row = c.execute("SELECT id, code, title FROM requirement WHERE id = '15da6218-9870-4ed5-8c65-5600b2a4d5b5'").fetchone()
print("Verified requirement in DB:", row)
conn.close()
