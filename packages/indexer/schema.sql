-- Generated from apps/ponder/ponder.schema.ts by `pnpm --filter @filoz/indexer schema:sql`. Do not edit.

CREATE TABLE "data_sets" (
	"data_set_id" bigint PRIMARY KEY NOT NULL,
	"provider_id" bigint NOT NULL,
	"payer" text NOT NULL,
	"source" text,
	"metadata" jsonb,
	"with_cdn" boolean NOT NULL,
	"with_ipfs_indexing" boolean NOT NULL,
	"pdp_end_epoch" bigint,
	"pdp_rail_id" bigint NOT NULL,
	"cache_miss_rail_id" bigint,
	"cdn_rail_id" bigint,
	"deleted" boolean NOT NULL,
	"created_at_block" bigint NOT NULL,
	"updated_at_block" bigint NOT NULL
);

CREATE TABLE "pieces" (
	"data_set_id" bigint NOT NULL,
	"piece_id" bigint NOT NULL,
	"cid" text NOT NULL,
	"raw_size" bigint NOT NULL,
	"metadata" jsonb,
	"removed" boolean NOT NULL,
	"added_at_block" bigint NOT NULL,
	"removed_at_block" bigint,
	"updated_at_block" bigint NOT NULL,
	CONSTRAINT "pieces_data_set_id_piece_id_pk" PRIMARY KEY("data_set_id","piece_id")
);

CREATE TABLE "providers" (
	"provider_id" bigint PRIMARY KEY NOT NULL,
	"provider_address" text,
	"name" text,
	"service_url" text,
	"provider_active" boolean NOT NULL,
	"pdp_product_active" boolean NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"endorsed" boolean DEFAULT false NOT NULL,
	"created_at_block" bigint,
	"updated_at_block" bigint NOT NULL
);

CREATE TABLE "rail_settlements" (
	"block_number" bigint NOT NULL,
	"log_index" integer NOT NULL,
	"rail_id" bigint NOT NULL,
	"total_settled_amount" numeric(78) NOT NULL,
	"total_net_payee_amount" numeric(78) NOT NULL,
	"operator_commission" numeric(78) NOT NULL,
	"network_fee" numeric(78) NOT NULL,
	"settled_up_to" bigint NOT NULL,
	"timestamp" bigint NOT NULL,
	"tx_hash" text NOT NULL,
	CONSTRAINT "rail_settlements_block_number_log_index_pk" PRIMARY KEY("block_number","log_index")
);

CREATE TABLE "rails" (
	"rail_id" bigint PRIMARY KEY NOT NULL,
	"payer" text NOT NULL,
	"payee" text NOT NULL,
	"token" text NOT NULL,
	"operator" text NOT NULL,
	"validator" text NOT NULL,
	"service_fee_recipient" text NOT NULL,
	"commission_rate_bps" numeric(78) NOT NULL,
	"payment_rate" numeric(78) DEFAULT 0 NOT NULL,
	"lockup_period" numeric(78) DEFAULT 0 NOT NULL,
	"lockup_fixed" numeric(78) DEFAULT 0 NOT NULL,
	"end_epoch" bigint,
	"terminated_by" text,
	"finalized" boolean DEFAULT false NOT NULL,
	"settled_up_to" bigint,
	"total_settled_amount" numeric(78) DEFAULT 0 NOT NULL,
	"total_net_payee_amount" numeric(78) DEFAULT 0 NOT NULL,
	"total_operator_commission" numeric(78) DEFAULT 0 NOT NULL,
	"total_network_fee" numeric(78) DEFAULT 0 NOT NULL,
	"created_at_block" bigint NOT NULL,
	"created_at" bigint NOT NULL,
	"tx_hash" text NOT NULL,
	"updated_at_block" bigint NOT NULL
);

CREATE TABLE "session_key_events" (
	"block_number" bigint NOT NULL,
	"log_index" integer NOT NULL,
	"identity" text NOT NULL,
	"signer" text NOT NULL,
	"expiry" numeric(78) NOT NULL,
	"permissions" text[] NOT NULL,
	"origin" text NOT NULL,
	"timestamp" bigint NOT NULL,
	"tx_hash" text NOT NULL,
	CONSTRAINT "session_key_events_block_number_log_index_pk" PRIMARY KEY("block_number","log_index")
);

CREATE TABLE "session_key_permissions" (
	"identity" text NOT NULL,
	"signer" text NOT NULL,
	"permission" text NOT NULL,
	"expiry" numeric(78) NOT NULL,
	"origin" text NOT NULL,
	"updated_at_block" bigint NOT NULL,
	"tx_hash" text NOT NULL,
	CONSTRAINT "session_key_permissions_identity_signer_permission_pk" PRIMARY KEY("identity","signer","permission")
);

CREATE INDEX IF NOT EXISTS "data_sets_provider_id_index" ON "data_sets" USING btree ("provider_id");
CREATE INDEX IF NOT EXISTS "data_sets_payer_data_set_id_index" ON "data_sets" USING btree ("payer","data_set_id");
CREATE INDEX IF NOT EXISTS "data_sets_pdp_rail_id_index" ON "data_sets" USING btree ("pdp_rail_id");
CREATE INDEX IF NOT EXISTS "data_sets_cache_miss_rail_id_index" ON "data_sets" USING btree ("cache_miss_rail_id");
CREATE INDEX IF NOT EXISTS "data_sets_cdn_rail_id_index" ON "data_sets" USING btree ("cdn_rail_id");
CREATE INDEX IF NOT EXISTS "pieces_cid_index" ON "pieces" USING btree ("cid");
CREATE INDEX IF NOT EXISTS "providers_provider_address_index" ON "providers" USING btree ("provider_address");
CREATE INDEX IF NOT EXISTS "rail_settlements_rail_id_block_number_log_index_index" ON "rail_settlements" USING btree ("rail_id","block_number","log_index");
CREATE INDEX IF NOT EXISTS "rails_payer_rail_id_index" ON "rails" USING btree ("payer","rail_id");
CREATE INDEX IF NOT EXISTS "rails_payee_rail_id_index" ON "rails" USING btree ("payee","rail_id");
CREATE INDEX IF NOT EXISTS "rails_operator_rail_id_index" ON "rails" USING btree ("operator","rail_id");
CREATE INDEX IF NOT EXISTS "session_key_events_identity_index" ON "session_key_events" USING btree ("identity");
CREATE INDEX IF NOT EXISTS "session_key_events_signer_index" ON "session_key_events" USING btree ("signer");
CREATE INDEX IF NOT EXISTS "session_key_permissions_signer_index" ON "session_key_permissions" USING btree ("signer");
