import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import Joi from "joi";


const cartRouter = new Hono();

// Serverová logika košíku


// Validace vstupních informací pro košík pomocí Joi
const cartItemSchema = Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    price: Joi.number().min(0).required(),
    quantity: Joi.number().integer().min(1).max(100).required()
});


// Přidání produktu do košíku
cartRouter.post("/add", async (c) => {
    const payload = await c.req.json();

    const { error } = cartItemSchema.validate(payload);
    if (error) {
        return c.json({ message: "Neplatný vstup: " + error.message }, 400);
    }

    const { id, name, price, quantity } = payload;

    let cart = JSON.parse(getCookie(c, "cart") || "[]");

    const existingProduct = cart.find((item) => item.id === id);
    if (existingProduct) {
        existingProduct.quantity += quantity;
    } else {
        cart.push({ id, name, price, quantity });
    }

    setCookie(c, "cart", JSON.stringify(cart), { path: "/" });

    return c.json({ message: "Produkt přidán do košíku", cart });
});


// Získání obsahu košíku
cartRouter.get("/", (c) => {
    const cart = JSON.parse(getCookie(c, "cart") || "[]");
    return c.json(cart);
});

// Odebrání produktu z košíku
cartRouter.post("/remove", async (c) => {
    const { id } = await c.req.json();

    let cart = JSON.parse(getCookie(c, "cart") || "[]");
    cart = cart.filter((item) => item.id !== id);

    setCookie(c, "cart", JSON.stringify(cart), { path: "/" });

    return c.json({ message: "Produkt odebrán z košíku", cart });
});


// Validace aktualizace množství v košíku pomocí Joi
const updateQuantitySchema = Joi.object({
    id: Joi.string().required(),
    quantity: Joi.number().integer().min(1).max(100).required()
});

// Aktualizace množství produktu v košíku
cartRouter.post("/update", async (c) => {
    const payload = await c.req.json();

    const { error } = updateQuantitySchema.validate(payload);
    if (error) {
        return c.json({ message: "Neplatný vstup: " + error.message }, 400);
    }

    const { id, quantity } = payload;

    let cart = JSON.parse(getCookie(c, "cart") || "[]");

    const existingProduct = cart.find((item) => item.id === id);
    if (existingProduct) {
        existingProduct.quantity = quantity; // Aktualizace množství
    } else {
        return c.json({ message: "Produkt nebyl nalezen v košíku" }, 404);
    }

    setCookie(c, "cart", JSON.stringify(cart), { path: "/" });

    return c.json({ message: "Množství produktu aktualizováno", cart });
});

// Vyprázdnění košíku
cartRouter.post("/clear", (c) => {
    setCookie(c, "cart", JSON.stringify([]), { path: "/" });
    return c.json({ message: "Košík byl vyprázdněn" });
});

export { cartRouter };
