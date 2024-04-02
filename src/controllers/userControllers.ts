import { Request, Response, NextFunction } from 'express';
import HttpError from '../models/errorModel';
import UserModel from '../models/userModel';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';

dotenv.config();

// ================================ REGISTER A NEW USER
// POST: api/users/register
// UNPROTECTED
export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, password2 } = req.body;
    if (!name || !email || !password) {
      return next(new HttpError('Fill in all fields.', 422));
    }

    const newEmail = email.toLowerCase();

    const emailExists = await UserModel.findOne({ email: newEmail });
    if (emailExists) {
      return next(new HttpError('Email already exists.', 422));
    }
    if (password.trim().length < 6) {
      return next(
        new HttpError('Password should be at least 6 characters', 422),
      );
    }
    if (password != password2) {
      return next(new HttpError('Password do not match', 422));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(password, salt);
    const newUser = await UserModel.create({name, email: newEmail, password: hashedPass});
    res.status(201).json(`New user ${newUser.email} registered.`);
  } catch (error) {
    return next(new HttpError('User registration failed.', 422));
  }
};

// ================================ LOGIN A REGISTERED USER
// POST: api/users/login
// UNPROTECTED
export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new HttpError('Fill in all fields.', 422));
    }

    const newEmail = email.toLowerCase();

    const user = await UserModel.findOne({ email: newEmail });
    if (!user) {
      return next(new HttpError('Invalid credentials.', 422));
    }

    const comparePass = await bcrypt.compare(password, user.password);
    if (!comparePass) {
      return next(new HttpError('Invalid credentials.', 422));
    }

    const { _id: id, name } = user;
    const secret = process.env.JWT_SECRET || '';

    const token = jwt.sign({ id, name }, secret, {
      expiresIn: '1d',
    });

    res.status(200).json({ token, id, name });
  } catch (error) {
    return next(
      new HttpError('Login failed. Please check your credentials', 422),
    );
  }
};

// ================================ USER PROFILE
// GET: api/users/:id
// PROTECTED
export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await UserModel.findById(id).select('-password');
    if (!user) {
      return next(new HttpError('User not found.', 404));
    }
    res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
};

// ================================ CHANGE USER AVATAR
// POST: api/users/change-avatar
// PROTECTED
export const changeAvatar = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    if (!req.files.avatar) {
      return next(new HttpError('Please choose an image.', 422));
    }

    // find user from database
    const user = await UserModel.findById(req.user.id);
    // delete old avatar if exists
    if (user && user.avatar) {
      fs.unlink(path.join(__dirname, '..', 'uploads', user.avatar), (err) => {
        if (err) {
          return next(err);
        }
      });
    }

    const { avatar } = req.files;
    // check file size
    if (avatar.size > 500000) {
      return next(
        new HttpError('Profile icture too big. Should be less than 500kb', 422),
      );
    }

    const fileName = avatar.name;
    const splittedFileName = fileName.split('.');
    const newFileName = splittedFileName[0] + uuid() + '.' + splittedFileName[splittedFileName.length - 1];
    avatar.mv(path.join(__dirname, '..', 'uploads', newFileName), async (err: Error) => {
        if (err) {
          return next(new HttpError(`Avatar couldn't be changed.`, 422));
        }

        const updatedAvatar = await UserModel.findByIdAndUpdate(req.user.id, { avatar: newFileName }, { new: true });
        if (!updatedAvatar) {
          return next(new HttpError(`Avatar couldn't be changed.`, 422));
        }
        res.status(200).json(updatedAvatar);
      },
    );
  } catch (error) {
    return next(error);
  }
};

// ================================ EDIT USER DETAILS (from profile)
// PATCH: api/users/edit-user
// PROTECTED
export const editUser = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const { name, email, currentPassword, newPassword, newConfirmPassword } = req.body;
    if (!name || !email || !currentPassword || !newPassword) {
      return next(new HttpError('Fill in all fields.', 422));
    }

    //get user from database
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return next(new HttpError('User not found.', 404));
    }

    // make sure new email doesn't already exist
    const emailExist = await UserModel.findOne({ email });
    // we want to update other details with/without changing the email (which is a unique id because we use it to login)
    if (emailExist && emailExist._id !== req.user.id) {
      return next(new HttpError('Email already exist.', 422));
    }
    // compare current password to db password
    const validateUserPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validateUserPassword) {
      return next(new HttpError('Invalid current password', 422));
    }

    // compare new passwords
    if (newPassword !== newConfirmPassword) {
      return next(new HttpError('New passwords do not match', 422));
    }

    // hash new password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    //update user info in database
    const newInfo = await UserModel.findByIdAndUpdate(
      req.user.id,
      { name, email, password: hash },
      { new: true },
    );

    res.status(200).json(newInfo);
  } catch (err) {
    return next(err);
  }
};

// ================================ GET AUTHORS
// GET: api/users/authors
// UNPROTECTED
export const getAuthors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authors = await UserModel.find().select('-password');
    res.json(authors);
  } catch (error) {
    return next(error);
  }
};
