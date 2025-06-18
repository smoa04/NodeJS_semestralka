import { Hono } from "hono";
import { db } from "./db.js";
import { getUserByToken } from "./db.js";
import { getCookie, setCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { ordersTable } from "./schema.js";
import Joi from "joi";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);



const ordersRouter = new Hono();

// Validace vstupních informací k objednávce pro nepřihlášeného uživatele pomocí Joi
const guestOrderSchema = Joi.object({
    jmeno: Joi.string().min(2).max(20).required(),
    prijmeni: Joi.string().min(2).max(20).required(),
    mesto: Joi.string().min(2).max(20).required(),
    ulice: Joi.string().min(2).max(30).required(),
    tel: Joi.string().pattern(/^\+?[0-9]{9,15}$/).required(),
    email: Joi.string().email().required(),
});


// Odeslání objednávky (automaticky vyplní údaje přihlášeného uživatele)
ordersRouter.post("/createOrder", async (c) => {
    const token = getCookie(c, "token");
    const user = await getUserByToken(token);

    let orderData = {};

    if (user) {
        // Přihlášený uživatel
        orderData = {
            jmeno: user.jmeno,
            prijmeni: user.prijmeni,
            mesto: user.mesto,
            ulice: user.ulice,
            tel: user.tel,
            email: user.email,
        };
    } else {
        // Nepřihlášený uživatel – zformulujeme, sanitizujeme a validujeme vstup
        const formData = await c.req.formData();

        const raw = {
            jmeno: formData.get("jmeno"),
            prijmeni: formData.get("prijmeni"),
            mesto: formData.get("mesto"),
            ulice: formData.get("ulice"),
            tel: formData.get("tel"),
            email: formData.get("email"),
        };

        // Sanitizace
        const sanitized = {};
        for (const key in raw) {
            sanitized[key] = typeof raw[key] === "string" ? DOMPurify.sanitize(raw[key]) : "";
        }

        // Validace
        const { error } = guestOrderSchema.validate(sanitized);
        if (error) {
            return c.json({ message: "Neplatný vstup: " + error.message }, 400);
        }

        orderData = sanitized;
    }


    // Získání dat o košíku
    const cart = JSON.parse(getCookie(c, "cart") || "[]");

    if (!cart || cart.length === 0) {
        return c.json({ message: "Košík je prázdný" }, 400);
    }

    // Vytvoření nové objednávky
    const order = await db.insert(ordersTable).values({
        ...orderData,
        items: JSON.stringify(cart),
        createdAt: new Date().toISOString(),
        status: "pending",
    }).returning(ordersTable).get();

    // Vymazání košíku po odeslání objednávky
    setCookie(c, "cart", JSON.stringify([]), { path: "/" });

    return c.json({ message: "Objednávka vytvořena", order });
});


// Zrušení objednávky (pro přihlášené uživatele)
ordersRouter.post("/cancel", async (c) => {
    const token = getCookie(c, "token");
    const user = await getUserByToken(token);

    if (!user) {
        return c.json({ message: "Uživatel není přihlášen" }, 401);
    }

    const { orderId } = await c.req.json();

    const order = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).get();
    if (!order) {
        return c.json({ message: "Objednávka neexistuje" }, 404);
    }

    // Admin může rušit jakoukoli objednávku, ostatní uživatelé jen své vlastní
    if (user.role !== "admin" && order.email !== user.email) {
        return c.json({ message: "Objednávku nelze zrušit" }, 403);
    }

    await db.delete(ordersTable).where(eq(ordersTable.id, orderId)).run();
    return c.json({ message: "Objednávka byla zrušena" });
});

//Uzavření objednávky
ordersRouter.post("/complete", async (c) => {
    const token = getCookie(c, "token");
    const user = await getUserByToken(token);

    if (!user || user.role.trim() !== "admin") {
        return c.json({ message: "Nemáte oprávnění uzavřít objednávku" }, 403);
    }

    const { orderId } = await c.req.json();
    const order = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).get();

    if (!order) {
        return c.json({ message: "Objednávka neexistuje" }, 404);
    }

    if (order.status !== "pending") {
        return c.json({ message: "Objednávku lze uzavřít pouze pokud je ve stavu pending" }, 400);
    }

    await db.update(ordersTable).set({ status: "completed" }).where(eq(ordersTable.id, orderId)).run();
    return c.json({ message: "Objednávka byla uzavřena" });
});

export { ordersRouter };


