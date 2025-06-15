import { serve } from "@hono/node-server"
import { app } from "./src/app.js"

const server = serve(app, (info) => {
    console.log(
        `Server spuštěn na portu: http://localhost:${info.port}`
    )
})
