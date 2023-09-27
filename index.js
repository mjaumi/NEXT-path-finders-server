const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
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

        console.log('You successfully connected to MongoDB!');

        /**
         * ------------------------
         * SERVICES API
         * ------------------------
         */

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