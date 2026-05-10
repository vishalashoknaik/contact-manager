-- Prevent the same contact being recorded twice in the same attendance session.
-- Previously attendanceSessionEntry.create was called without a uniqueness guard,
-- allowing duplicate rows if the form was submitted twice (network retry, two
-- volunteers submitting the same person, etc.).
-- The backend now uses upsert with this constraint as the unique key.

-- Step 1: Remove duplicate rows that accumulated before this constraint existed.
-- For each (sessionId, contactId) pair keep only the most-recently created entry.
DELETE FROM "attendance_session_entries"
WHERE id NOT IN (
  SELECT DISTINCT ON ("sessionId", "contactId") id
  FROM "attendance_session_entries"
  ORDER BY "sessionId", "contactId", "createdAt" DESC
);

-- Step 2: Now that duplicates are gone, the unique index can be created safely.
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_session_entries_sessionId_contactId_key"
ON "attendance_session_entries"("sessionId", "contactId");
