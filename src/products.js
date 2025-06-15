import { Hono } from "hono";
import { db } from "./db.js";
import { productsTable } from "./schema.js";
import { renderFile } from "ejs";

export const productsRouter = new Hono();

// Načtení produktů pro CPU a GPU html
productsRouter.get("/products", async (c) => {
    const products = await db.select().from(productsTable).all();
    return c.json(products);
});

