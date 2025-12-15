const express = require("express")
const {open} = require("sqlite")
const sqlite3 = require("sqlite3")
const path = require("path")
const cors = require("cors")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const app = express()
app.use(cors())
app.use(express.json())
const dbPath = path.join(__dirname, "tasks.db")

let db = null

const initiateDbAndStartServer = async () => {
    try{
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        })
        app.listen(3000, () => {
            console.log("Server started successfully at port: 4000")
        })
    }
    catch(error){
        console.log(`Error occurred: ${error}`)
    }
}

initiateDbAndStartServer()

const authentication = async (request, response, next) => {
    let jwtToken
    const authHeader = request.headers['authorization']
    if (authHeader){
        jwtToken = authHeader.split(" ")[1]
    }

    if (jwtToken){
        jwt.verify(jwtToken, "INTERNSHIP", (error, payload) => {
            if (error){
                response.status(401).send("Invalid JWT Token")
            }
            else{
                request.username = payload.username
                request.userId = payload.userId
                next()
            }
        })
    }
    else{
        response.status(401).send("Invalid JWT Token")
    }
}

// SIGNUP API
app.post("/signup/", async (request, response) => {
    const {username, full_name: fullName, email, password} = request.body
    const getUserDetails = `SELECT * FROM users WHERE username = '${username}'`
    const userData = await db.get(getUserDetails)

    if (userData !== undefined){
        response.status(400)
        response.send("User already exists.")
    }
    else{
        if (password.length < 8){
            response.status(400)
            response.send("Password must have minimum 8 characters.")
        }
        else{
            const hashedPassword = await bcrypt.hash(password, 10)
            const createNewUser = `
                INSERT INTO users(username, full_name, email, password)
                VALUES ('${username}', '${fullName}', '${email}', '${hashedPassword}')
            `
            await db.run(createNewUser)
            response.send("User created successfully.")
        }
    }
})

// LOGIN API
app.post("/login/", async(request, response) => {
    const {username, password} = request.body
    const getUserData = `SELECT * FROM users WHERE username = '${username}'`
    const userData = await db.get(getUserData)

    if (userData !== undefined){
        const isPasswordMatched = await bcrypt.compare(password, userData.password)

        if (isPasswordMatched){
            const payload = {username, userId: userData.user_id}
            const jwtToken = jwt.sign(payload, "INTERNSHIP")
            response.send({jwtToken})
        }
        else{
            response.status(400)
            response.send("Invalid Password")
        }
    }
    else{
        response.status(400)
        response.send("Invalid User")
    }
})

// USER PROFILE API
app.get("/user-profile", authentication, async (request, response) => {
    const {username} = request.body
    const getUserProfile = `SELECT username, full_name, email FROM users WHERE username = '${username}'`

    const userProfile = await db.get(getUserProfile)
    response.status(200).send(userProfile)
})

// ADD TASKS
app.post("/user/tasks", authentication, async (request, response) => {
    const {task} = request.body
    const userId = parseInt(request.userId)

    const createTask = `
        INSERT INTO tasks (task, user_id)
        VALUES ('${task}', '${userId}')
    `
    await db.run(createTask)
    response.send("Task created successfully.")
})

// GET TASKS
app.get("/user/tasks", authentication, async (request, response) => {
    const {user_id} = request.params
    const getAllTasks = `SELECT * FROM tasks WHERE user_id = '${user_id}'`
    
    const allTasks = await db.all(getAllTasks)
    response.send(allTasks)
})

module.exports = app