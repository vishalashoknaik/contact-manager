-- Prevent the same contact being recorded twice in the same attendance session.
-- Previously attendanceSessionEntry.create was called without a uniqueness guard,
-- allowing duplicate rows if the form was submitted twice (network retry, two
-- volunteers submitting the same person, etc.).
-- The backend now uses upsert with this constraint as the unique key.

CREATE UNIQUE INDEX IF NOT EXISTS "attendance_session_entries_sessionId_contactId_key"
ON "attendance_session_entries"("sessionId", "contactId");
