CREATE TABLE `servers` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`username` text NOT NULL,
	`ssh_port` integer DEFAULT 22 NOT NULL,
	`private_key_path` text NOT NULL,
	`passphrase` text,
	`status` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` text PRIMARY KEY,
	`server_id` text NOT NULL,
	`level` text NOT NULL,
	`message` text NOT NULL,
	`timestamp` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	CONSTRAINT `fk_logs_server_id_servers_id_fk` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `servers_name_active_unique_idx` ON `servers` (`name`) WHERE "servers"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX `servers_address_active_unique_idx` ON `servers` (`address`) WHERE "servers"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX `logs_server_id_timestamp_idx` ON `logs` (`server_id`,`timestamp`);