import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import axios from "axios";
import nodemailer from "nodemailer";
import { config } from "../config/config";
import { AuthRequest } from "../middleware/auth";

interface User {
	id: number;
	email: string;
	tasteProfile: TasteProfile;
}
interface InventoryItem {
	id: number;
	name: string;
	price: number;
	tasteProfile: TasteProfile;
	stockQuantity: number;
}
interface TasteProfile {
	primaryFlavor?: string;
	sweetness?: string;
	bitterness?: string;
}
interface Order {
	id: number;
	user: string;
	items: { product: string; quantity: number; priceAtOrder: number }[];
}

export class NotificationsController {
	private readonly breweryApiUrl = config.breweryApiUrl;
	private readonly transporter = nodemailer.createTransport({
		service: "gmail",
		auth: { user: config.emailUser, pass: config.emailPass },
	});

	async sendSaleNotification(
		req: AuthRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const { productId } = req.body;
		try {
			const productResponse = await axios.get<InventoryItem>(
				`${this.breweryApiUrl}/api/inventory/${productId}`
			);
			const product = productResponse.data;
			const ordersResponse = await axios.get<Order[]>(
				`${this.breweryApiUrl}/api/order`
			);
			const usersResponse = await axios.get<User[]>(
				`${this.breweryApiUrl}/api/auth`
			);
			const usersToNotify = new Set<string>();

			ordersResponse.data.forEach((order) => {
				if (order.items.some((item) => item.product === product.name))
					usersToNotify.add(order.user);
			});
			usersResponse.data.forEach((user) => {
				if (
					this.matchTasteProfile(
						user.tasteProfile,
						product.tasteProfile
					)
				)
					usersToNotify.add(user.id.toString());
			});

			const emailPromises = Array.from(usersToNotify).map(
				async (userId) => {
					const user = usersResponse.data.find(
						(u) => u.id.toString() === userId
					) || { email: userId };
					const mailOptions = {
						from: config.emailUser,
						to: user.email,
						subject: `Sale Alert: ${product.name} is on Sale!`,
						text: `Hi,\n\n${product.name} is now $${product.price}! Shop now: [link]\n\nCheers,\nBrewer Team`,
					};
					return this.transporter.sendMail(mailOptions);
				}
			);

			await Promise.all(emailPromises);
			res.status(200).json({
				message: `Sent sale notifications to ${usersToNotify.size} users`,
			});
		} catch (error: any) {
			console.error(
				"Error sending sale notifications:",
				error.response?.data || error.message
			);
			res.status(error.response?.status || 500).json({
				message:
					error.response?.data?.message ||
					"Error sending notifications",
				error: error.response?.data?.errors || error.message,
			});
		}
	}

	async sendOrderStatusNotification(
		req: AuthRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const { user_id, order_id, status } = req.body;
		try {
			const userResponse = await axios.get<User>(
				`${this.breweryApiUrl}/api/auth/${user_id}`
			);
			const mailOptions = {
				from: config.emailUser,
				to: userResponse.data.email,
				subject: `Order #${order_id} Update`,
				text: `Hi,\n\nYour order #${order_id} is now ${status}. Track it here: [link]\n\nCheers,\nBrewer Team`,
			};
			await this.transporter.sendMail(mailOptions);
			res.status(200).json({
				message: `Sent order status notification to user ${user_id}`,
			});
		} catch (error: any) {
			console.error(
				"Error sending order status notification:",
				error.response?.data || error.message
			);
			res.status(error.response?.status || 500).json({
				message:
					error.response?.data?.message ||
					"Error sending notification",
				error: error.response?.data?.errors || error.message,
			});
		}
	}

	async sendLowStockNotification(
		req: AuthRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const { productId } = req.body;
		try {
			const productResponse = await axios.get<InventoryItem>(
				`${this.breweryApiUrl}/api/inventory/${productId}`
			);
			const mailOptions = {
				from: config.emailUser,
				to: config.emailUser, // Send to admin for now
				subject: `Low Stock Alert: ${productResponse.data.name}`,
				text: `Hi,\n\n${productResponse.data.name} is low on stock. Current quantity: ${productResponse.data.stockQuantity}. Reorder now!\n\nCheers,\nBrewer Team`,
			};
			await this.transporter.sendMail(mailOptions);
			res.status(200).json({
				message: `Sent low stock notification for product ${productId}`,
			});
		} catch (error: any) {
			console.error(
				"Error sending low stock notification:",
				error.response?.data || error.message
			);
			res.status(error.response?.status || 500).json({
				message:
					error.response?.data?.message ||
					"Error sending notification",
				error: error.response?.data?.errors || error.message,
			});
		}
	}

	private matchTasteProfile(
		userProfile: TasteProfile,
		productProfile: TasteProfile
	): boolean {
		const user = userProfile || {};
		const product = productProfile || {};
		return (
			(user.primaryFlavor &&
				product.primaryFlavor === user.primaryFlavor) ||
			(user.sweetness && product.sweetness === user.sweetness) ||
			(user.bitterness && product.bitterness === user.bitterness) ||
			false
		);
	}
}
