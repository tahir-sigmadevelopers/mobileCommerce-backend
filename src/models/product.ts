import mongoose from "mongoose";

const productSchema = new mongoose.Schema({

    title: {
        type: String,
        required: [true, "Please Enter Name"]
    },

    image: {
        type: String,
        required: [true, "Please Add Image"]
    },
    price: {
        type: Number,
        required: [true, "Please Add Price"]
    },
    stock: {
        type: Number,
        required: [true, "Please Add Stock"]
    },

    category: {
        type: String,
        required: [true, "Please Add Category"],
        trim: true
    },

}, {
    timestamps: true
})



export const Product = mongoose.model('Product', productSchema);

