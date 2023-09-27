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

        await client.db('admin').command({ ping: 1 });
        console.log('You successfully connected to MongoDB!');
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