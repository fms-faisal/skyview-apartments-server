const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require('jsonwebtoken')
require("dotenv").config();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zedvr4o.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const apartmentsCollection = client.db('skyviewDb').collection('apartments')
    const reservationCollection = client.db('skyviewDb').collection('reservation')
    const userCollection = client.db('skyviewDb').collection('users')

    //middlewares

        const verifyToken = (req, res, next) => {
            console.log('inside verify token', req.headers)
            if (!req.headers.authorization){
                return res.status(401).send({message: 'forbidden access'})
            }

            const token = req.headers.authorization.split(' ')[1];
            
            
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) {
                if (err){
                    return res.status(401).send({message: 'forbidden access'})
                }
                req.decoded = decoded;
                next()
            })

        }


    //user related api
    app.get('/users', verifyToken, async(req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result)
    });
    app.post('/users', async (req, res) => {
        const user = req.body;

        const query = {email: user.email}
        const existingUser = await userCollection.findOne(query)
        if (existingUser){
            return res.send({message: 'user already exists', insertedId: null})
        }
        const result = await userCollection.insertOne(user)
        res.send(result)
    })

    app.delete('/users/:id', async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await userCollection.deleteOne(query);
        res.send(result)
    })

    app.patch('/users/admin/:id', async(req, res)=> {
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)}
        const updatedDoc = {
            $set: {
                role: 'admin'
            }
        }
        const result = await userCollection.updateOne(filter, updatedDoc)
        res.send(result)

    })



    app.get('/apartments', async (req, res)=> {
        const result = await apartmentsCollection.find().toArray();
        res.send(result);
    })


    // app.post('/reservation', async (req, res)=> {
    //     const data = req.body;
    //     const result = await reservationCollection.insertOne(data);
    //     res.send(result);
    // })

    app.post("/reservation", async (req, res) => {
        const data = req.body;
        console.log(data);
        const userId = data.email; 
      
        try {
          // Ensure userId is present
          if (!userId) {
            return res.status(400).send({ message: "User ID is required." });
          }
      
          // Check if a reservation already exists for the user
          const existingReservation = await reservationCollection.findOne({ email: userId }); 
      
          if (existingReservation) {
            return res.status(400).send({ message: "User has already applied for a job." });
          }
      
          // Insert new reservation
          const result = await reservationCollection.insertOne(data);
          res.status(201).send(result);
        } catch (error) {
          console.error("Error processing reservation:", error);
          res.status(500).send({ message: "An error occurred. Please try again later." });
        }
      });

    app.get('/reservation', async (req, res)=> {
        const email = req.query.email;
        const query = {email: email};
        const result = await reservationCollection.find().toArray();
        res.send(result);
    })

    app.delete('/reservation/:id', async (req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await reservationCollection.deleteOne(query);
        res.send(result)
    })

    //jwt related api

    app.post('/jwt', async(req, res)=> {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
        res.send({token})
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`skyview apartment listening on port ${port}`);
});
