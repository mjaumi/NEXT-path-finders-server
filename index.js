const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@cluster0.ipdatst.mongodb.net/?retryWrites=true&w=majority`;

// Creating a MongoClient here
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        // connecting to mongoDB here
        await client.connect();
        const pathFinderDb = client.db('path-finders');

        const usersCollection = pathFinderDb.collection('users');
        const postsCollection = pathFinderDb.collection('posts');

        console.log('You successfully connected to MongoDB!');

        /**
         * ------------------------
         * SERVICES API
         * ------------------------
         */

        // POST API to signup new user with email and password
        app.post('/user-signup', async (req, res) => {
            let newUser = req.body;

            const existingUser = await usersCollection.findOne({ email: newUser.email });

            if (existingUser) {
                res.send({
                    status: 404,
                    message: 'User Already Exists!',
                    user: null,
                });
            } else {
                const hash = await bcrypt.hash(newUser.password, 10);

                newUser = {
                    ...newUser,
                    password: hash,
                }

                const userResult = await usersCollection.insertOne(newUser);

                if (userResult.insertedId) {
                    res.send({
                        status: 200,
                        message: 'Registration Successful!',
                        user: newUser,
                    });
                } else {
                    res.send({
                        status: 500,
                        message: 'Something Went Wrong!',
                        user: null,
                    });
                }
            }

        });

        // POST API to signin with email and password
        app.post('/user-signin', async (req, res) => {
            const credentials = req.body;

            const existingUser = await usersCollection.findOne({ email: credentials.email });

            if (!existingUser) {
                res.send({
                    status: 404,
                    message: 'No Such User Exists!',
                    user: null,
                });
            } else {
                const passwordMatch = await bcrypt.compare(credentials.password, existingUser.password);

                if (!passwordMatch) {
                    res.send({
                        status: 401,
                        message: 'Invalid Credentials!',
                        user: null,
                    });
                } else {
                    res.send({
                        status: 200,
                        message: 'Login Successful!',
                        user: existingUser,
                    });
                }
            }
        });

        // POST API to create new user
        app.post('/new-user', async (req, res) => {
            const newUser = req.body;

            const existingUser = await usersCollection.findOne({ email: newUser.email });

            if (!existingUser?._id) {
                const addNewUserResult = await usersCollection.insertOne(newUser);

                if (addNewUserResult.insertedId) {
                    res.send({
                        status: 200,
                        message: 'New User Created!',
                        user: newUser,
                    });
                } else {
                    res.send({
                        status: 500,
                        message: 'Something Went Wrong!',
                        user: null,
                    });
                }
            } else {
                res.send({
                    status: 201,
                    message: 'User Already Exists!',
                    user: existingUser,
                });
            }
        });

        // POST API to create new post
        app.post('/create-post', async (req, res) => {
            const newPost = req.body;

            const addNewPostResult = await postsCollection.insertOne(newPost);

            if (addNewPostResult.insertedId) {
                res.send({
                    status: 200,
                    message: 'New Post Created!',
                    post: newPost,
                });
            } else {
                res.send({
                    status: 500,
                    message: 'Something Went Wrong!',
                    post: null,
                });
            }
        });

        // GET API to get all the posts from server
        app.get('/get-posts', async (req, res) => {
            const posts = await postsCollection.find({}).toArray();

            if (posts.length) {
                res.send({
                    status: 200,
                    message: 'Posts fetch successful!',
                    posts,
                });
            } else {
                res.send({
                    status: 500,
                    message: 'Something Went Wrong!',
                    posts: null,
                });
            }
        });

        // GET API to get currently logged in user details
        app.get('/current-user/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);

            if (user._id) {
                res.send({
                    status: 200,
                    message: 'user found!',
                    user,
                });
            } else {
                res.send({
                    status: 404,
                    message: 'No user found!',
                    user: null,
                });
            }
        });

        // PATCH API to add comment to a particular post in server
        app.patch('/post-comment/:id', async (req, res) => {
            const postId = req.params.id;
            const newComment = req.body;

            const filter = { _id: new ObjectId(postId) };
            const addComment = {
                $push: {
                    comments: newComment
                }
            }

            const updatePost = await postsCollection.updateOne(filter, addComment);

            if (updatePost.modifiedCount) {
                res.send({
                    status: 200,
                    message: 'Comment add successful!',
                });
            } else {
                res.send({
                    status: 500,
                    message: 'Something Went Wrong!',
                });
            }

        });

        app.patch('/calculate-reactions', async (req, res) => {
            const data = req.body;

            const userFilter = { email: data.email };
            const postFilter = { _id: new ObjectId(data.postId) };

            const user = await usersCollection.findOne(userFilter);

            let alterLikedPosts = null;
            let alterReactions = null;

            if (user.likedPosts.includes(data.postId)) {
                alterLikedPosts = {
                    $pull: {
                        likedPosts: data.postId,
                    },
                };

                alterReactions = {
                    $set: {
                        reacts: data.reacts - 1,
                    },
                };
            } else {
                alterLikedPosts = {
                    $push: {
                        likedPosts: data.postId,
                    },
                };

                alterReactions = {
                    $set: {
                        reacts: data.reacts + 1,
                    },
                };
            }

            const updateUser = await usersCollection.updateOne(userFilter, alterLikedPosts);

            const updatePost = await postsCollection.updateOne(postFilter, alterReactions);

            if (updateUser.modifiedCount && updatePost.modifiedCount) {
                res.send({
                    status: 200,
                    message: 'Reaction added successfully!',
                });
            } else {
                res.send({
                    status: 500,
                    message: 'Something Went Wrong!',
                });
            }
        });

    } finally {

    }
}

run().catch(console.dir);

// base API
app.get('/', (req, res) => {
    res.send('Path Finder Server Running!!');
})

// listening API
app.listen(port, () => {
    console.log('Listening to PORT', port);
})