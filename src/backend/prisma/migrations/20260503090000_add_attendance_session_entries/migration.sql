-- CreateTable: AttendanceSessionEntry
CREATE TABLE "attendance_session_entries" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "submittedByPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_session_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "attendance_session_entries"
ADD CONSTRAINT "attendance_session_entries_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_session_entries"
ADD CONSTRAINT "attendance_session_entries_contactId_fkey"
FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
