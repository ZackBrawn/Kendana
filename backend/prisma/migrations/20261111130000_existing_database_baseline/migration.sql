-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."budget_categories" (
    "budget_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "budget_categories_pkey" PRIMARY KEY ("budget_id","category_id")
);

-- CreateTable
CREATE TABLE "public"."budget_expense_groups" (
    "id" SERIAL NOT NULL,
    "budget_group_id" INTEGER NOT NULL,
    "group_key" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "category_ids" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_expense_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."budget_generation_statuses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_generation_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."budget_groups" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "total_budget_amount" DECIMAL(15,2) NOT NULL,
    "ai_notes" TEXT,
    "generated_by" TEXT NOT NULL,
    "over_alert_sent_at" TIMESTAMP(3),
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."budget_items" (
    "id" SERIAL NOT NULL,
    "budget_group_id" INTEGER NOT NULL,
    "budgetable_type" TEXT NOT NULL,
    "budgetable_id" INTEGER NOT NULL,
    "target_amount" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."budgets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'PhFolder',
    "limit_amount" DECIMAL(65,30) NOT NULL,
    "wallet_scope" TEXT NOT NULL,
    "wallet_id" INTEGER,
    "category_scope" TEXT NOT NULL,
    "period_type" TEXT NOT NULL,
    "period_multiplier" INTEGER NOT NULL DEFAULT 1,
    "start_date" TIMESTAMP(3) NOT NULL,
    "is_permanent" BOOLEAN NOT NULL DEFAULT true,
    "end_date" TIMESTAMP(3),
    "show_on_dashboard" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_threshold" BOOLEAN NOT NULL DEFAULT false,
    "notify_threshold_percent" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type_id" INTEGER NOT NULL,
    "category_name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '📁',
    "keyword" TEXT,
    "system_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_messages" (
    "id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "error_message" TEXT,
    "content" JSONB NOT NULL,
    "raw_text" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conversations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."custom_notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'once',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "is_test" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."evidence" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "original_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "disk" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "source" TEXT NOT NULL DEFAULT 'CHAT_UPLOAD',
    "processing_started_at" TIMESTAMP(3),
    "processing_finished_at" TIMESTAMP(3),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_processed_at" TIMESTAMP(3),
    "ocr_text" TEXT,
    "normalized_text" TEXT,
    "normalization_duration_ms" INTEGER,
    "normalization_changes" INTEGER,
    "ocr_engine" TEXT,
    "ocr_duration_ms" INTEGER,
    "ocr_version" TEXT,
    "document_type" TEXT,
    "classifier_engine" TEXT,
    "classifier_version" TEXT,
    "classifier_confidence" DOUBLE PRECISION,
    "parsed_data" JSONB,
    "parser_engine" TEXT,
    "parser_version" TEXT,
    "parser_confidence" DOUBLE PRECISION,
    "resolved_data" JSONB,
    "resolver_engine" TEXT,
    "resolver_version" TEXT,
    "resolver_confidence" DOUBLE PRECISION,
    "resolver_warnings" JSONB,
    "transaction_id" INTEGER,
    "completed_at" TIMESTAMP(3),
    "commit_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."evidence_processing_logs" (
    "id" SERIAL NOT NULL,
    "evidence_id" INTEGER NOT NULL,
    "stage" TEXT NOT NULL,
    "status_before" TEXT,
    "status_after" TEXT NOT NULL,
    "duration_ms" INTEGER,
    "message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_processing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."net_worth_snapshots" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL,
    "total_wallet_balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_receivables" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_debts" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "net_worth" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "net_worth_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."push_subscriptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transaction_drafts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "conversation_id" INTEGER,
    "ai_provider" VARCHAR(50),
    "ai_model" VARCHAR(100),
    "draft_type" VARCHAR(20) NOT NULL DEFAULT 'single',
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "confirmed_transaction_ids" JSONB,
    "expires_at" TIMESTAMP(3),
    "ai_confidence" DECIMAL(4,3),
    "original_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transaction_logs" (
    "id" SERIAL NOT NULL,
    "reference_number" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type_id" INTEGER NOT NULL,
    "category_id" INTEGER,
    "source_wallet_id" INTEGER NOT NULL,
    "destination_wallet_id" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "balance_before" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "balance_after" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "subject" TEXT,
    "notes" TEXT,
    "is_cleared" BOOLEAN NOT NULL DEFAULT true,
    "client_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transaction_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "transaction_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_settings_changes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "setting_key" TEXT,
    "setting_page" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_settings_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "allow_negative_balance" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp" TEXT,
    "telegram" TEXT,
    "avatar" TEXT,
    "google_id" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "date_format" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "locale" TEXT NOT NULL DEFAULT 'id',
    "accent_color" TEXT NOT NULL DEFAULT 'indigo',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "category_icon_colored" BOOLEAN NOT NULL DEFAULT true,
    "bot_name" TEXT NOT NULL DEFAULT 'ZackBrawn',
    "bot_avatar" TEXT,
    "bot_display_name" TEXT,
    "auto_budget_enabled" BOOLEAN NOT NULL DEFAULT false,
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "push_notifications" BOOLEAN NOT NULL DEFAULT true,
    "dashboard_show_budget" BOOLEAN NOT NULL DEFAULT true,
    "dashboard_budget_expanded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wallets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "group_type" TEXT NOT NULL DEFAULT 'Liquid',
    "icon" TEXT NOT NULL DEFAULT '💵',
    "keyword" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "budget_generation_statuses_user_id_year_month_key" ON "public"."budget_generation_statuses"("user_id" ASC, "year" ASC, "month" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "budget_groups_user_id_period_month_period_year_key" ON "public"."budget_groups"("user_id" ASC, "period_month" ASC, "period_year" ASC);

-- CreateIndex
CREATE INDEX "chat_messages_conversation_id_created_at_idx" ON "public"."chat_messages"("conversation_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "conversations_user_id_is_active_archived_at_idx" ON "public"."conversations"("user_id" ASC, "is_active" ASC, "archived_at" ASC);

-- CreateIndex
CREATE INDEX "custom_notifications_active_scheduled_at_idx" ON "public"."custom_notifications"("active" ASC, "scheduled_at" ASC);

-- CreateIndex
CREATE INDEX "custom_notifications_user_id_active_idx" ON "public"."custom_notifications"("user_id" ASC, "active" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "evidence_uuid_key" ON "public"."evidence"("uuid" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "net_worth_snapshots_user_id_snapshot_date_key" ON "public"."net_worth_snapshots"("user_id" ASC, "snapshot_date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "public"."push_subscriptions"("endpoint" ASC);

-- CreateIndex
CREATE INDEX "transaction_drafts_conversation_id_status_idx" ON "public"."transaction_drafts"("conversation_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "transaction_drafts_expires_at_idx" ON "public"."transaction_drafts"("expires_at" ASC);

-- CreateIndex
CREATE INDEX "transaction_drafts_user_id_status_expires_at_idx" ON "public"."transaction_drafts"("user_id" ASC, "status" ASC, "expires_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_logs_client_id_key" ON "public"."transaction_logs"("client_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_logs_reference_number_key" ON "public"."transaction_logs"("reference_number" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_types_name_key" ON "public"."transaction_types"("name" ASC);

-- CreateIndex
CREATE INDEX "user_settings_changes_user_id_changed_at_idx" ON "public"."user_settings_changes"("user_id" ASC, "changed_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- AddForeignKey
ALTER TABLE "public"."budget_categories" ADD CONSTRAINT "budget_categories_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."budget_categories" ADD CONSTRAINT "budget_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."budget_expense_groups" ADD CONSTRAINT "budget_expense_groups_budget_group_id_fkey" FOREIGN KEY ("budget_group_id") REFERENCES "public"."budget_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."budget_generation_statuses" ADD CONSTRAINT "budget_generation_statuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."budget_groups" ADD CONSTRAINT "budget_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."budget_items" ADD CONSTRAINT "budget_items_budget_group_id_fkey" FOREIGN KEY ("budget_group_id") REFERENCES "public"."budget_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."budgets" ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."budgets" ADD CONSTRAINT "budgets_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."transaction_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."custom_notifications" ADD CONSTRAINT "custom_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evidence" ADD CONSTRAINT "evidence_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transaction_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evidence" ADD CONSTRAINT "evidence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evidence_processing_logs" ADD CONSTRAINT "evidence_processing_logs_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."net_worth_snapshots" ADD CONSTRAINT "net_worth_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transaction_drafts" ADD CONSTRAINT "transaction_drafts_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transaction_drafts" ADD CONSTRAINT "transaction_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transaction_logs" ADD CONSTRAINT "transaction_logs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transaction_logs" ADD CONSTRAINT "transaction_logs_destination_wallet_id_fkey" FOREIGN KEY ("destination_wallet_id") REFERENCES "public"."wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transaction_logs" ADD CONSTRAINT "transaction_logs_source_wallet_id_fkey" FOREIGN KEY ("source_wallet_id") REFERENCES "public"."wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transaction_logs" ADD CONSTRAINT "transaction_logs_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."transaction_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transaction_logs" ADD CONSTRAINT "transaction_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_settings_changes" ADD CONSTRAINT "user_settings_changes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
