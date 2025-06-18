import crypto from "crypto";
import { renderFile } from "ejs";
import { Hono } from "hono";
import { createUser, getUserByUsername, getUserByToken } from "./db.js";
import { setCookie, getCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { db } from "./db.js";
import { ordersTable } from "./schema.js";
import Joi from "joi";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);


export const usersRouter = new Hono();

// Validace pomocí package Joi
const userSchema = Joi.object({
    username: Joi.string().min(2).max(20).required(),
    password: Joi.string().min(5).required(),
    jmeno: Joi.string().min(2).max(20).required(),
    prijmeni: Joi.string().min(2).max(20).required(),
    mesto: Joi.string().min(2).max(20).required(),
    ulice: Joi.string().min(2).max(30).required(),
    tel: Joi.string().pattern(/^\+?[0-9]{9,15}$/).required(),
    email: Joi.string().email().required(),
});

// Registrace – zobrazí HTML formulář
usersRouter.get("/register", async (c) => {
    const rendered = await renderFile("views/register.html");
    return c.html(rendered);
});

// Přihlášení – zobrazí HTML formulář
usersRouter.get("/login", async (c) => {
    const rendered = await renderFile("views/login.html");
    return c.html(rendered);
});


// Registrace
usersRouter.post("/register", async (c) => {
    const form = await c.req.formData();

    // Sanitizace vstupů
    const sanitizedData = {};
    for (const field of ["username", "password", "jmeno", "prijmeni", "mesto", "ulice", "tel", "email"]) {
        const value = form.get(field);
        sanitizedData[field] = typeof value === "string" ? DOMPurify.sanitize(value) : "";
    }


    // Validace vstupů
    const { error } = userSchema.validate(sanitizedData);
    if (error) return c.json({ message: "Tvůj vstup obsahuje neplatné vstupní údaje! Zkonrtoluj si hlavně email a telefonní číslo." +
            " Pro telefonní číslo jsou povoleny pouze čísla, s volitelným znakem + na začátku (např. +420123456789).\" Minimální délka hesla je 5 znaků" }, 400);

    const user = await createUser(
        sanitizedData.username,
        sanitizedData.password,
        sanitizedData.jmeno,
        sanitizedData.prijmeni,
        sanitizedData.mesto,
        sanitizedData.ulice,
        sanitizedData.tel,
        sanitizedData.email
    );

    setCookie(c, "token", user.token, { httpOnly: true, secure: true });

    return c.redirect("/profile");
});

// Validace přihlašovacích údajů pomocí Joi
const loginSchema = Joi.object({
    username: Joi.string().min(2).max(20).required(),
    password: Joi.string().min(5).required(),
});

// Přihlášení
usersRouter.post("/login", async (c) => {
    const form = await c.req.formData();
    const username = form.get("username");
    const password = form.get("password");

    // Validace vstupních údajů (username i password)
    const { error } = loginSchema.validate({ username, password });
    if (error) {
        return c.json({ message: "Neplatné přihlašovací údaje." }, 400);
    }

    // Ověření, zda `password` existuje a je string
    if (!password || typeof password !== "string") {
        return c.json({ message: "Neplatné heslo – musí být textový řetězec." }, 400);
    }

    const sanitizedUsername = typeof username === "string" ? DOMPurify.sanitize(username) : "";

    // Získání uživatele z DB
    const user = await getUserByUsername(sanitizedUsername);
    if (!user) {
        return c.json({ message: "Neplatné přihlašovací údaje" }, 401);
    }

    // Hashování hesla a porovnání
    const hashedPassword = crypto.pbkdf2Sync(password, user.salt, 100000, 64, "sha512").toString("hex");

    if (user.hashedPassword !== hashedPassword) {
        return c.json({ message: "Neplatné přihlašovací údaje" }, 401);
    }

    setCookie(c, "token", user.token, { httpOnly: true, secure: true });
    return c.redirect("/profile");
});



// Middleware pro ověření uživatele
const onlyForUsers = async (c, next) => {
    const token = getCookie(c, "token");
    if (!token) return c.redirect("/login");

    const user = await getUserByToken(token);
    if (!user) return c.redirect("/login");

    c.set("user", user);
    await next();
};

// Profil
usersRouter.get("/profile", onlyForUsers, async (c) => {
    const user = c.get("user");
    let allOrders = [];

    if (user.role === "admin") {
        allOrders = await db.select().from(ordersTable).where(eq(ordersTable.status, "pending")).all();
    }

    const orders = await db.select().from(ordersTable).where(eq(ordersTable.email, user.email)).all();
    const profilePage = await renderFile("views/profile.html", { user, orders, allOrders });

    return c.html(profilePage);
});

usersRouter.get("/checkout", async (c) => {
    const user = c.get("user"); // Získání přihlášeného uživatele
    const checkoutPage = await renderFile("views/checkout.html", { user });
    return c.html(checkoutPage);
});


// Odhlášení
usersRouter.post("/logout", async (c) => {
    setCookie(c, "token", "", { httpOnly: true, secure: true, maxAge: 0 });
    return c.redirect("/");
});
