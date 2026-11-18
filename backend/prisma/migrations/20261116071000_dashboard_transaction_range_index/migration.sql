CREATE INDEX "transaction_logs_user_id_deleted_at_date_idx"
ON "transaction_logs"("user_id", "deleted_at", "date");
