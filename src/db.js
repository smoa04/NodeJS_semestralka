import crypto from "crypto"
import { drizzle } from "drizzle-orm/libsql"
import { eq } from "drizzle-orm"
import { productsTable, usersTable} from "./schema.js";


const isTest = process.env.NODE_ENV === "test"
export const db = drizzle({
    connection: isTest ? "file::memory:" : "file:db.sqlite",
    logger: false,
})


// Funkce pro vytvoření uživatele
export const createUser = async (username, password, jmeno, prijmeni, mesto, ulice, tel, email) => {
    const salt = crypto.randomBytes(16).toString("hex")
    const hashedPassword = crypto
        .pbkdf2Sync(password, salt, 100000, 64, "sha512")
        .toString("hex")
    const token = crypto.randomBytes(16).toString("hex")

    const user = await db
        .insert(usersTable)
        .values({
            username,
            hashedPassword,
            token,
            salt,
            jmeno,
            prijmeni,
            mesto,
            ulice,
            tel,
            email
        })
        .returning(usersTable)
        .get()

    return user
}

export const getUserByUsername = async (username) => {
    const user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.username, username))
        .get();

    return user;

}

export const getUserByToken = async (token) => {
    if (!token) return null

    const user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.token, token))
        .get()

    return user
}
