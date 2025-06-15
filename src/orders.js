import { Hono } from "hono";
import { db } from "./db.js";
import { getUserByToken } from "./db.js";
import { getCookie, setCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { ordersTable } from "./schema.js"; // Přidej ordersTable do schema.js

const ordersRouter = new Hono();

// Odeslání objednávky (automaticky vyplní údaje přihlášeného uživatele)
ordersRouter.post("/createOrder", async (c) => {
    const token = getCookie(c, "token");
    const user = await getUserByToken(token);

    let orderData = {};

    if (user) {
        // Přihlášený uživatel - automaticky vyplní údaje z jeho profilu
        orderData = {
            jmeno: user.jmeno,
            prijmeni: user.prijmeni,
            mesto: user.mesto,
            ulice: user.ulice,
            tel: user.tel,
            email: user.email,
        };
    } else {
        // Nepřihlášený uživatel - získání údajů z formuláře
        const formData = await c.req.formData();
        orderData = {
            jmeno: formData.get("jmeno"),
            prijmeni: formData.get("prijmeni"),
            mesto: formData.get("mesto"),
            ulice: formData.get("ulice"),
            tel: formData.get("tel"),
            email: formData.get("email"),
        };
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


