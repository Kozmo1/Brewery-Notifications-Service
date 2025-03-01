import { Request, Response, NextFunction } from "express";
import axios from "axios";
import nodemailer from "nodemailer";
import { config } from "../config/config";
import { validationResult } from "express-validator";

interface User {
    id: number;
    email: string;
    tasteProfile: TasteProfile;
}

interface TasteProfile {
    primaryFlavor?: string;
    secondaryFlavors?: string[];
    sweetness?: string;
    bitterness?: string;
    mouthfeel?: string;
    body?: string;
    acidity?: number;
    aftertaste?: string;
    aroma?: string[];
}

interface InventoryItem {
    id: number;
    name: string;
    price: number;
    tasteProfile: TasteProfile;
}

interface Order {
    id: number;
    user: string;
    items: {product: string, quantity: number; priceAtOrder: number;}[];
}

export class NotificationsController {
    private readonly breweryApiUrl = config.breweryApiUrl;
    private readonly transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: config.emailUser,
            pass: config.emailPass,
        },
    });

    public async sendSaleNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { proudctId } = req.body;

        try {
            // fecthing product details
            const productResponse = await axios.get<InventoryItem>(`${this.breweryApiUrl}/inventory/${proudctId}`);
            const product = productResponse.data;

            //fetch all orders to find usres who bought this product
            const ordersResponse = await axios.get<Order[]>(`${this.breweryApiUrl}/orders`);
            const orders = ordersResponse.data;

            const usersToNotify = new Set<string>();
            orders.forEach(order => {
                if (order.items.some(item => item.product === product.name)) {
                    usersToNotify.add(order.user);
                }
            });

            //fetch taste profile matches
            const usersReponse = await axios.get<User[]>(`${this.breweryApiUrl}/users`); // i might need to create an all users endpoint
            const users = usersReponse.data;
            users.forEach(user => {
                if (this.matchTasteProfile(user.tasteProfile, product.tasteProfile)) {
                    usersToNotify.add(user.id.toString());
                }
            });

            // send email notifications to all releavent users
            const emailPromises = Array.from(usersToNotify).map(async userId => {
                const user = users.find(u => u.id.toString() === userId) || { email: userId };
                const mailOptions = {
                    from: config.emailUser,
                    to: user.email,
                    subject: `Sale Alert! ${product.name} is on sale!`,
                    text: `Dear customer, ${product.name} is now on sale for $${product.price}. Based on your past purchases or taste preferences, we thought you’d like to know!`,
                };
                return this.transporter.sendMail(mailOptions);
            });

            await Promise.all(emailPromises);
            res.status(200).json({ message: `Sale notifications sent successfully to ${usersToNotify.size} users for ${product.name}` });

        } catch (error: any) {
            console.error("Error sending the sale notification", error.response?.data || error.message);
            res.status(error.response?.status || 500).json({
                message: error.response?.data?.message || "Error sending notifications",
                error: error.response?.data?.errors || error.message 
            });
        }
    }

    private matchTasteProfile(userProfile: TasteProfile, productProfile: TasteProfile): boolean {
        const user = userProfile || {};
        const product = productProfile || {};

        return (
            (user.primaryFlavor && product.primaryFlavor === user.primaryFlavor) ||
            (user.sweetness && product.sweetness === user.sweetness) ||
            (user.bitterness && product.bitterness === user.bitterness) ||
            false
        );
    }
}