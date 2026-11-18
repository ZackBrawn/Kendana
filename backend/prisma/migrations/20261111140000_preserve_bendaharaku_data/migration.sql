ALTER TABLE "wallets"
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "deleted_at" TIMESTAMP(3),
  ADD COLUMN "is_pinned" BOOLEAN,
  ADD COLUMN "account_name" TEXT,
  ADD COLUMN "account_number" TEXT,
  ADD COLUMN "bank_code" TEXT,
  ADD COLUMN "updated_at" TIMESTAMP(3);

ALTER TABLE "wallets"
  ALTER COLUMN "icon" DROP NOT NULL;

ALTER TABLE "categories"
  ADD COLUMN "custom_name" TEXT,
  ADD COLUMN "custom_icon" TEXT,
  ADD COLUMN "custom_keyword" TEXT,
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "deleted_at" TIMESTAMP(3),
  ADD COLUMN "updated_at" TIMESTAMP(3);

ALTER TABLE "categories"
  ALTER COLUMN "icon" DROP NOT NULL;

ALTER TABLE "transaction_logs"
  ADD COLUMN "deleted_at" TIMESTAMP(3),
  ADD COLUMN "updated_at" TIMESTAMP(3),
  ADD COLUMN "due_date" TIMESTAMP(3),
  ADD COLUMN "due_date_type" TEXT,
  ADD COLUMN "due_date_interval" INTEGER,
  ALTER COLUMN "destination_wallet_id" DROP NOT NULL;
