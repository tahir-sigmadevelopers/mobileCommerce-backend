import { User } from "../models/user.js";
export const newUser = async (req, res, next) => {
    try {
        const { name, email, image, gender, _id, dob } = req.body;
        if (!name || !email || !image || !gender || !_id || !dob) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }
        let user = await User.findById(_id);
        let userWithEmail = await User.findOne({ email });
        if (userWithEmail) {
            return res.status(200).json({
                success: false,
                message: `Welcome Back ${user?.name}`
            });
        }
        if (user) {
            return res.status(400).json({
                success: false,
                message: `User with ID ${_id} already exists`
            });
        }
        user = await User.create({
            name, email, image, gender, _id, dob: new Date(dob)
        });
        return res.status(201).json({
            success: true,
            message: `Welcome ${user?.name}, Registered Successfully `,
        });
    }
    catch (error) {
        return next(error);
    }
};
export const getAllUsers = async (req, res, next) => {
    try {
        let users = await User.find();
        return res.status(200).json({
            success: true,
            message: `All Users`,
            users
        });
    }
    catch (error) {
        return next(error);
    }
};
export const getUserDetail = async (req, res, next) => {
    try {
        const id = req.params?.id;
        let user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found ", success: false, id });
        }
        return res.status(200).json({
            success: true,
            message: `User Detail`,
            user
        });
    }
    catch (error) {
        return next(error);
    }
};
export const deleteUser = async (req, res, next) => {
    try {
        const id = req.params.id;
        let user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found", success: false });
        }
        await user.deleteOne();
        return res.status(200).json({
            success: true,
            message: `User Deleted Successfully`
        });
    }
    catch (error) {
        return next(error);
    }
};
