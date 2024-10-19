
import { NextFunction, Request, Response } from "express";
import { baseQuery, NewProductRequestBody, NewUserRequestBody, searchRequestQuery } from "../types/types.js";
import { Product } from "../models/product.js";
import fs from "fs";
import { myCache } from "../app.js";
import { invalidatesCache } from "../utils/features.js";


export const newProduct = async (
    req: Request<{}, {}, NewProductRequestBody>,
    res: Response,
    next: NextFunction
) => {
    try {

        const { title, price, stock, category } = req.body;


        let image = req.file

        // if (!title || !price || !image || !stock || !category) {
        //     return res.status(400).json({
        //         success: false,
        //         message: "All fields are required"
        //     })
        // }

        await Product.create({
            title, image: image?.path, price, stock, category: category.toLowerCase(),
        })

        invalidatesCache({ product: true, admin: true })

        return res.status(201).json({
            success: true,
            message: `Product Added Successfully `,
        });
    } catch (error: any) {
        return next(error)
    }
}


// Revalidate on New, Update, Delete & on New Order
export const getLatestProducts = async (
    req: Request<{}, {}, NewUserRequestBody>,
    res: Response,
    next: NextFunction
) => {
    try {

        let products

        if (myCache.has("latest-products")) {
            // get latest products from cache
            products = JSON.parse(myCache.get("latest-products")!)
        }
        else {
            // get latest products from server 
            products = await Product.find().sort({ createdAt: -1 }).limit(6)

            myCache.set("latest-products", JSON.stringify(products));
        }

        return res.status(200).json({
            success: true,
            message: `All Products`,
            products
        });
    } catch (error: any) {
        console.log(error);
        
        return next(error)
    }
}


export const getAdminProducts = async (
    req: Request<{}, {}, NewUserRequestBody>,
    res: Response,
    next: NextFunction
) => {
    try {
        let products;

        if (myCache.has("all-products")) {
            // get all products from cache
            products = JSON.parse(myCache.get("all-products")!)
        } else {
            // get all products from server
            products = await Product.find()
            myCache.set("all-products", JSON.stringify(products));
        }

        return res.status(200).json({
            success: true,
            message: `All Products`,
            products
        });
    } catch (error: any) {
        return next(error)
    }
}


export const getProductDetail = async (
    req: Request<{ id: string }, {}, NewUserRequestBody>,
    res: Response,
    next: NextFunction
) => {
    try {

        let product;
        let id = req.params.id
        if (myCache.has(`product-${id}`)) {
            // get product from cache
            product = JSON.parse(myCache.get(`product-${id}`)!)
            if (product._id == id) {
                return res.status(200).json({
                    success: true,
                    message: `Product Detail`,
                    product
                });
            }
        }
        else {
            // get product from server

            product = await Product.findById(id)

            if (!product) {
                return res.status(404).json({ message: "Product not found", success: false })
            }

            myCache.set(`product-${id}`, JSON.stringify(product));
        }

        return res.status(200).json({
            success: true,
            message: `User Detail`,
            product
        });
    } catch (error: any) {
        return next(error)
    }
}


// update product details
// validate inputs
// remove existing image if image upload
// save product
// return updated product details

export const updateProduct = async (
    req: Request<{ id: string }, {}, NewProductRequestBody>,
    res: Response,
    next: NextFunction
) => {
    try {

        const { title, price, stock, category } = req.body;
         const id = req.params.id;
        let product = await Product.findById(id)


        if (!product) {
            return res.status(404).json({ message: "Product not found", success: false })
        }

        if (req.file) {
            fs.unlinkSync(product.image)
            product.image = req.file.path
        }

        if (title) {
            product.title = title
        }
        if (price) {
            product.price = price
        }
        if (stock) {
            product.stock = stock
        }
        if (category) {
            product.category = category.toLowerCase()
        }

        await product.save()
        invalidatesCache({ product: true, productId: String(product._id), admin: true })

        return res.status(200).json({
            success: true,
            message: `Product updated successfully`,

        });

    } catch (error) {
        return next(error)
    }
}





// delete product API, also delete image of product

export const deleteProduct = async (
    req: Request<{ id: string }, {}, NewUserRequestBody>,
    res: Response,
    next: NextFunction
) => {
    try {

        const id = req.params.id;
        
        let product = await Product.findById(id)


        if (!product) {
            return res.status(404).json({ message: "Product not found", success: false })
        }
        if (product.image) {
            fs.unlinkSync(product.image)
        }

        await product.deleteOne()


        invalidatesCache({ product: true, productId: String(product._id), admin: true })

        return res.status(200).json({
            success: true,
            message: `Product Deleted Successfully`
        });
    } catch (error: any) {
        return next(error)
    }
}


// Revalidate on New, Update, Delete & on New Order
// get all categories products by distinct category
export const getAllCategories = async (
    req: Request<{}, {}, NewUserRequestBody>,
    res: Response,
    next: NextFunction
) => {
    try {

        let categories;

        if (myCache.has("categories")) {
            categories = JSON.parse(myCache.get("categories")!);
        } else {
            categories = await Product.distinct('category')
            myCache.set('categories', JSON.stringify(categories));
        }


        return res.status(200).json({
            success: true,
            message: `All Categories`,
            categories
        });
    } catch (error: any) {
        return next(error)
    }
}



export const getAllProducts = async (
    req: Request<{}, {}, {}, searchRequestQuery>,
    res: Response,
    next: NextFunction
) => {
    try {

        const { category, price, search, sort } = req.query

        const page = Number(req.query.page) || 1

        const limit = Number(process.env.Product_Per_Page) || 8

        const skip = limit * (page - 1)

        const baseQuery: baseQuery = {}

        if (search) baseQuery.title = {
            $regex: search,
            $options: "i",
        }

        if (price) baseQuery.price = {
            $lte: Number(price)
        }

        if (category) baseQuery.category = category

        const productsPromise = Product.find(baseQuery).sort(sort && { price: sort === "asc" ? 1 : -1 }).limit(limit).skip(skip)

        const [products, filteredOnlyProducts] = await Promise.all([
            productsPromise, Product.find(baseQuery)
        ])


        let totalPages = Math.ceil(filteredOnlyProducts.length / limit);

        return res.status(200).json({
            success: true,
            message: `All Products`,
            products,
            totalPages
        });
    } catch (error: any) {
        return next(error)
    }
}