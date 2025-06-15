import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";

const cartRouter = new Hono();

// Serverová logika košíku
// Přidání produktu do košíku
cartRouter.post("/add", async (c) => {
    const { id, name, price, quantity } = await c.req.json();

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

// Aktualizace množství produktu v košíku
cartRouter.post("/update", async (c) => {
    const { id, quantity } = await c.req.json();

    if (quantity < 1) {
        return c.json({ message: "Množství musí být alespoň 1" }, 400);
    }

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
