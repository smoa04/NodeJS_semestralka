import { Hono } from "hono"
import { serveStatic } from "@hono/node-server/serve-static"
import { renderFile } from "ejs"
import { getUserByToken} from "./db.js"
import { usersRouter } from "./users.js"
import { getCookie } from "hono/cookie"
import { productsRouter } from "./products.js";
import { cartRouter } from "./cart.js";
import { ordersRouter } from "./orders.js";


const app = new Hono();

// Slouží k obsluze statických souborů (např. CSS, obrázky, frontendové skripty)
app.use(serveStatic({ root: "public" }))
app.use(serveStatic({ root: "views" }))

//Middleware pro autentizaci uživatele
app.use(async (c, next) => {
    const token = getCookie(c, "token")
    const user = await getUserByToken(token)
    c.set("user", user)
    await next()
})

//Users router, obsluha uživatelských tras definované v users.js (například /register)
app.route("/", usersRouter)
//Produkt router
app.route("/", productsRouter);
//Košík router
app.route("/cart", cartRouter);
//Objednávky router
app.route("/orders", ordersRouter);
//Routa pro navbar
app.get("/nav_bar", async (c) => {
    const user = c.get("user");
    const navbar = await renderFile("views/nav_bar.html", { user });
    return c.html(navbar);
});


// Hlavní stránka aplikace
app.get("/", async (c) => {
    const index = await renderFile("views/index.html", {
        user: c.get("user"),
    });

    return c.html(index);
});


export { app };
