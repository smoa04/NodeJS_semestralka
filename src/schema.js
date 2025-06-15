import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";

// Definice tabulky pro produkty
export const productsTable = sqliteTable("products", {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    category: text().notNull(),
    brand: text().notNull(),
    name: text().notNull(),
    price: integer().notNull(),
    image_url: text(),
    description: text(),
});

// Definice tabulky pro uživatele
export const usersTable = sqliteTable("users", {
    id: integer().primaryKey({ autoIncrement: true }),
    role: text().notNull().default("zakaznik"),
    username: text().notNull().unique(),
    hashedPassword: text().notNull(),
    salt: text().notNull(),
    token: text().notNull(),

    jmeno: text().notNull(),
    prijmeni: text().notNull(),
    mesto: text().notNull(),
    ulice: text().notNull(),
    tel: integer().notNull(),
    email: text().notNull()

})

// Definice tabulky pro objednávky
export const ordersTable = sqliteTable("orders", {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer(), // Pokud je uživatel přihlášen, ukládáme jeho ID (jinak null)
    jmeno: text().notNull(),
    prijmeni: text().notNull(),
    mesto: text().notNull(),
    ulice: text().notNull(),
    tel: text().notNull(),
    email: text().notNull(),
    items: text().notNull(), // Uložené produkty košíku jako JSON
    createdAt: text().notNull(),
    status: text().default("pending")
});


