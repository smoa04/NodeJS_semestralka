import crypto from "crypto"
import { renderFile } from "ejs";
import { Hono } from "hono";
import { createUser, getUserByUsername, getUserByToken} from "./db.js";
import { setCookie, getCookie } from "hono/cookie";
import { eq } from "drizzle-orm"
import { db } from "./db.js";
import { ordersTable } from "./schema.js";

export const usersRouter = new Hono();


// Registrace – obsluha formuláře
usersRouter.get("/register", async (c) => {
    const rendered = await renderFile("views/register.html")

    return c.html(rendered)
})

//Registrace
usersRouter.post("/register", async (c) => {
    const form = await c.req.formData()

    const user = await createUser(
        form.get("username"),
        form.get("password"),
        form.get("jmeno"),
        form.get("prijmeni"),
        form.get("mesto"),
        form.get("ulice"),
        form.get("tel"),
        form.get("email")
    )
    setCookie(c, "token", user.token)

    return c.redirect("/profile")
})

// Přihlášení – zobrazí HTML formulář
usersRouter.get("/login", async (c) => {
    const rendered = await renderFile("views/login.html");
    return c.html(rendered);
});

// Přihlášení – zpracování formuláře s ověřením hesla
usersRouter.post("/login", async (c) => {
    const form = await c.req.formData();
    const username = form.get("username");
    const password = form.get("password");

    const user = await getUserByUsername(username, password);
    if (!user) {
        return c.json({ message: "Neplatné přihlašovací údaje" }, 401);
    }

    // Kontrola hesla podle db.js
    const hashedPassword = crypto
        .pbkdf2Sync(password, user.salt, 100000, 64, "sha512")
        .toString("hex");

    if (user.hashedPassword !== hashedPassword) {
        return c.json({ message: "Neplatné přihlašovací údaje" }, 401);
    }

    setCookie(c, "token", user.token, { httpOnly: true });

    return c.redirect("/profile");
});

// Middleware pro přístup na Profile jen pro přihlášené uživatele
const onlyForUsers = async (c, next) => {
    const token = getCookie(c, "token");
    if (!token) return c.redirect("/login"); // Přesměrování místo 404

    const user = await getUserByToken(token);
    if (!user) return c.redirect("/login"); // Pokud uživatel neexistuje, přesměrování na login

    c.set("user", user);
    await next();
};

usersRouter.get("/profile", onlyForUsers, async (c) => {
    const user = c.get("user");
    let allOrders = [];

    // Pokud je admin, načti všechny nevyřízené (pending) objednávky
    if (user.role === "admin") {
        allOrders = await db
            .select()
            .from(ordersTable)
            .where(eq(ordersTable.status, "pending"))
            .all();}

    // Pokud není admin, načti jen objednávky přihlášeného uživatele
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.email, user.email)).all();
    const profilePage = await renderFile("views/profile.html", { user, orders, allOrders });
    return c.html(profilePage);
});


usersRouter.get("/checkout", async (c) => {
    const user = c.get("user"); // Získání přihlášeného uživatele
    const checkoutPage = await renderFile("views/checkout.html", { user });
    return c.html(checkoutPage);
});


// Odhlášení + odstanění cookie
usersRouter.post("/logout", async (c) => {
    // Odstranění cookie s tokenem
    setCookie(c, "token", "", { httpOnly: true, maxAge: 0 });

    // Přesměrování na hlavní stránku po odhlášení
    return c.redirect("/");
});


