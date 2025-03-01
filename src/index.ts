import express from "express";
import cors from "cors";
import dotenv from "dotenv-safe";
import notificationRoutes from "./ports/rest/routes/notifications";
import { config } from "./config/config";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


dotenv.config({
    allowEmptyValues: true,
    path: `.env.${process.env.NODE_ENV || "local"}`,
    example: ".env.example",
});

const port = config.port;

app.use("/healtcheck", (req, res) => {
    res.send("Nofications are alive and annoying people already!");
});

app.use("/notifications", notificationRoutes);

app.listen(port, () => {
    console.log(`Notifications service is running on port ${port}`);
});