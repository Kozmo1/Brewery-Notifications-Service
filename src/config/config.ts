import dotenv from "dotenv-safe";

dotenv.config({
    allowEmptyValues: true,
    path: `.env.${process.env.NODE_ENV || "local"}`,
    example: ".env.example",
});

const ENVIRONMENT = process.env.NODE_ENV || "development";
const BREWERY_API_URL = process.env.BREWERY_API_URL ?? "http://localhost:5089";
const PORT = process.env.PORT ?? "3005"; 
const JWT_SECRET = process.env.JWT_SECRET ?? "";
const EMAIL_USER = process.env.EMAIL_USER ?? "";
const EMAIL_PASS = process.env.EMAIL_PASS ?? "";

export interface Config {
    environment: string;
    breweryApiUrl: string;
    port: number;
    jwtSecret: string;
    emailUser: string;
    emailPass: string;
}

export const config: Config = {
    environment: ENVIRONMENT,
    breweryApiUrl: BREWERY_API_URL,
    port: parseInt(PORT, 10),
    jwtSecret: JWT_SECRET,
    emailUser: EMAIL_USER,
    emailPass: EMAIL_PASS,
};