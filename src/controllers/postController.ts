import { Request, Response, NextFunction } from 'express';
import PostModel from '../models/postModel';
import UserModel from '../models/userModel';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import HttpError from '../models/errorModel';

// ================================ CREATE A POST
// POST: api/posts
// PROTECTED
export const createPost = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const { title, category, description } = req.body;
    if (!title || !category || !description) {
      return next(
        new HttpError('Fill in all fileds and choose thumbnail.', 422),
      );
    }
    const { thumbnail } = req.files;
    // check the file size
    if (thumbnail.size > 2000000) {
      return next(
        new HttpError('Thumnail too big. File should be less than 2mb.', 422),
      );
    }
    const fileName = thumbnail.name;
    const splittedFileName = fileName.split('.');
    const newFileName = splittedFileName[0] + uuid() + '.' + splittedFileName[splittedFileName.length - 1];
    thumbnail.mv(path.join(__dirname, '..', '/uploads', newFileName), async (err: Error) => {
        if (err) {
          return next(new HttpError(`Avatar couldn't be added.`, 422));
        } else {
          const newPost = await PostModel.create({title, category, description, thumbnail: newFileName, creator: req.user.id});
          if (!newPost) {
            return next(new HttpError(`Post couldn't be created.`, 422));
          }
          // find user and increase post count by 1
          const currentUser = await UserModel.findById(req.user.id);
          let userPostCount;
          if (currentUser) {
            userPostCount = currentUser.posts + 1;
          }
          await UserModel.findByIdAndUpdate(req.user.id, {posts: userPostCount});
          res.status(201).json(newPost);
        }
      },
    );
  } catch (error) {
    return next(error);
  }
};

// ================================ GET ALL POSTS
// GET: api/posts
// UNPROTECTED
export const getPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const posts = await PostModel.find()
      .sort({ updatedAt: -1 })
      .populate({ path: 'creator', select: ['name', 'email'] })
      .exec();
    res.status(200).json(posts);
  } catch (error) {
    return next(error);
  }
};

// ================================ GET SINGLE POST
// GET: api/posts/:id
// UNPROTECTED
export const getPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const postId = req.params.id;
    const post = await PostModel.findById(postId)
      .populate({ path: 'creator', select: ['name', 'email'] })
      .exec();
    if (!post) {
      return next(new HttpError('Post not found.', 404));
    }
    res.status(200).json(post);
  } catch (error) {
    return next(error);
  }
};

// ================================ GET POSTS BY CATEGORY
// GET: api/posts/categories/:category
// UNPROTECTED
export const getCatPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category } = req.params;
    const catPosts = await PostModel.find({ category })
      .sort({ createdAt: -1 })
      .populate({ path: 'creator', select: ['name', 'email'] })
      .exec();
    res.status(200).json(catPosts);
  } catch (error) {
    return next(error);
  }
};

// ================================ GET USER/AUTHOR POST
// GET: api/posts/users/:id
// UNPROTECTED
export const getUserPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const posts = await PostModel.find({ creator: id })
      .sort({ createdAt: -1 })
      .populate({ path: 'creator', select: ['name', 'email'] })
      .exec();
    res.status(200).json(posts);
  } catch (error) {
    return next(error);
  }
};

// ================================ EDIT POST
// PATCH: api/posts/:id
// PROTECTED
export const editPost = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let fileName;
    let newFileName;
    let updatedPost;

    const postId = req.params.id;
    const { title, category, description } = req.body;
    // ReactQuill has a paragraph opening and closing tag with a break tag in between so there are 11 characters in there already
    if (!title || !category || description.length < 12) {
      return next(new HttpError('Fill in all fields', 422));
    }
    // get old post from database
    const oldPost = await PostModel.findById(postId);
    if (req.user.id == oldPost?.creator) { 
      if (!req.files) {
        updatedPost = await PostModel.findByIdAndUpdate(postId, { title, category, description },{ new: true });
      } else {
        // delete old thumbnail from upload
        if (oldPost && oldPost.thumbnail) {
          fs.unlink(path.join(__dirname, '..', 'uploads', oldPost.thumbnail), (err) => {
              if (err) {
                return next(err);
              } 
          });
        }
      // upload new thumbnail
        const { thumbnail } = req.files;
        // check file size
        if (thumbnail.size > 2000000) {
          return next(new HttpError('Thumbnail too big. Should be less than 2mb', 422));
        }
        fileName = thumbnail.name;
        const splittedFileName = fileName.split('.');
        newFileName = splittedFileName[0] + uuid() + '.' + splittedFileName[splittedFileName.length - 1];
        thumbnail.mv(path.join(__dirname, '..', 'uploads', newFileName), async (err: Error) => {
            if (err) {
              return next(new HttpError(`Thumbnail couldn't be changed.`, 422));
            }
        });
        updatedPost = await PostModel.findByIdAndUpdate(postId, { title, category, description, thumbnail: newFileName }, { new: true })
      }
    }
    if (!updatedPost) {
      return next(new HttpError(`Couldn't update post.`, 400))
    }
    res.status(200).json(updatedPost);
  } catch (error) {
    return next(error);
  }
};

// ================================ DELETE POST
// DELETE: api/posts/:id
// PROTECTED
export const deletePost = async (req: Request | any, res: Response, next: NextFunction) => {
  try{
    const postId = req.params.id;
    if (!postId) {
      return next(new HttpError('Post unavailable', 400))
    }
    const post = await PostModel.findById(postId);
    const fileName = post?.thumbnail;
    if (req.user.id == post?.creator) {
      if (fileName) {
        // delete thumbnail from uploads folder;
        fs.unlink(path.join(__dirname, '..', 'uploads', fileName), async (err) => {
          if (err) {
            return next(err)
          } else {
            await PostModel.findByIdAndDelete(postId);
            // find user and reduce post count by 1
            const currentUser = await UserModel.findById(req.user.id);
            if (currentUser) {
              const userPostCount = currentUser.posts - 1;
              await UserModel.findByIdAndUpdate(req.user.id, { posts: userPostCount });
            }
          }
        })
      }
    } else {
      return next(new HttpError(`Post couldn't be deleted`, 403))
    }
    res.json(`Post ${postId} deleted successfully.`);
  } catch(err){
    return next(err);
  }
};
