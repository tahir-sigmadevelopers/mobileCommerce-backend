import mongoose from 'mongoose';
import { myCache } from '../app.js';
import { Product } from '../models/product.js';
export const connectDB = async () => {
    try {
        let conn = await mongoose.connect(process.env.MONGO_URL || "", {
            dbName: "Final_Year_ECommerce"
        });
        console.log(`Connected to ${conn.connection.host}`);
    }
    catch (error) {
        console.log(`Error connecting to DB`, error);
    }
};
export const invalidatesCache = ({ product, order, admin, userId, orderId, productId }) => {
    if (product) {
        const productKeys = ["latest-products", "categories", "all-products", `product-${productId}`];
        if (typeof productId === "string")
            productKeys.push(`product-${productId}`);
        if (typeof productId === "object")
            productId.forEach((i) => productKeys.push(`product-${i}`));
        myCache.del(productKeys);
    }
    if (order) {
        const orderKeys = ["all-orders", `userOrders_${userId}`, `order - ${orderId}`];
        myCache.del(orderKeys);
    }
    if (admin) {
        myCache.del(["admin-stats", "admin-pie-charts", "admin-bar-charts", "admin-line-charts"]);
    }
};
export const reduceStock = async (orderItems) => {
    for (let index = 0; index < orderItems.length; index++) {
        const order = orderItems[index];
        const product = await Product.findById(order.productId);
        if (!product) {
            throw new Error(`Product not found with id ${order.productId} `);
        }
        product.stock -= order.quantity;
        await product.save();
    }
};
export const percentageCalculate = (thisMonth, lastMonth) => {
    if (lastMonth === 0)
        return thisMonth * 100;
    return ((thisMonth / lastMonth) * 100).toFixed(0);
};
export const getCategories = async ({ categories, productCount }) => {
    const categoriesCountPromise = categories.map((category) => Product.countDocuments({ category }));
    const categoriesCount = await Promise.all(categoriesCountPromise);
    const categoryCount = [];
    categories.forEach((category, index) => {
        categoryCount.push({
            [category]: Math.round(categoriesCount[index] / productCount * 100)
        });
    });
    return categoryCount;
};
export const getChartsData = ({ length, docArr, today, property, }) => {
    const data = new Array(length).fill(0);
    docArr?.forEach((i) => {
        const creationDate = i.createdAt;
        const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;
        if (monthDiff < length) {
            if (property) {
                data[length - monthDiff - 1] += i[property];
            }
            else {
                data[length - monthDiff - 1] += 1;
            }
        }
    });
    return data;
};
