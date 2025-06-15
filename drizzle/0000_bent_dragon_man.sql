CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer,
	`jmeno` text NOT NULL,
	`prijmeni` text NOT NULL,
	`mesto` text NOT NULL,
	`ulice` text NOT NULL,
	`tel` text NOT NULL,
	`email` text NOT NULL,
	`items` text NOT NULL,
	`createdAt` text NOT NULL,
	`status` text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`brand` text NOT NULL,
	`name` text NOT NULL,
	`price` integer NOT NULL,
	`image_url` text,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role` text DEFAULT 'zakaznik' NOT NULL,
	`username` text NOT NULL,
	`hashedPassword` text NOT NULL,
	`salt` text NOT NULL,
	`token` text NOT NULL,
	`jmeno` text NOT NULL,
	`prijmeni` text NOT NULL,
	`mesto` text NOT NULL,
	`ulice` text NOT NULL,
	`tel` integer NOT NULL,
	`email` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);