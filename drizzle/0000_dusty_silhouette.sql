CREATE TABLE `cases` (
	`owner` text NOT NULL,
	`episode` text NOT NULL,
	`data` text NOT NULL,
	`version` integer NOT NULL,
	`updated_at` text NOT NULL,
	`mutation_id` text NOT NULL,
	PRIMARY KEY(`owner`, `episode`)
);
--> statement-breakpoint
CREATE TABLE `case_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner` text NOT NULL,
	`episode` text NOT NULL,
	`data` text NOT NULL,
	`version` integer NOT NULL,
	`updated_at` text NOT NULL,
	`mutation_id` text NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER cases_audit_insert AFTER INSERT ON cases BEGIN INSERT INTO case_history(owner,episode,data,version,updated_at,mutation_id) VALUES(NEW.owner,NEW.episode,NEW.data,NEW.version,NEW.updated_at,NEW.mutation_id); END;
--> statement-breakpoint
CREATE TRIGGER cases_audit_update AFTER UPDATE ON cases BEGIN INSERT INTO case_history(owner,episode,data,version,updated_at,mutation_id) VALUES(NEW.owner,NEW.episode,NEW.data,NEW.version,NEW.updated_at,NEW.mutation_id); END;
--> statement-breakpoint
CREATE TRIGGER history_no_update BEFORE UPDATE ON case_history BEGIN SELECT RAISE(ABORT,'History is append-only'); END;
--> statement-breakpoint
CREATE TRIGGER history_no_delete BEFORE DELETE ON case_history BEGIN SELECT RAISE(ABORT,'History is append-only'); END;
