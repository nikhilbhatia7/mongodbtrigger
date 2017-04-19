// Imports
const os = require('os')
const yargs = require('yargs')
const retry = require('retry')
const mongodb = require('mongodb')
const username = require('username')

// DB URLs
const devUrl = 'mongodb://mongodbtrigger:password@ds161580.mlab.com:61580/mongodbtrigger'
const prodUrl = 'mongodb://localhost:27017/history'

// ENV Vars
const url = process.env.NODE_ENV === "production" ? prodUrl : devUrl

// Set time
const time = new Date()

// Init
const argv = yargs.argv
const operation = retry.operation()
const mongoClient = mongodb.MongoClient

// Exit if no task provided
if (!argv.task) throw new Error("No task found... Exiting")

const task = argv.task.toLowerCase()
console.log("Task at hand:", task)

// Exit if wrong task provided
if (task !== "login" && task !== "logout") throw new Error("Wrong task found... Exiting")

const dbEntryTask = async(taskType) => {

    const user = await username() || "NO USER FOUND"
    const hostname = os.hostname() || "NO HOST FOUND"

    console.log("Logged in user is", user, "on host", hostname)
    console.log("Attempting to create DB entry")

    operation.attempt(currentAttempt => {
        console.log("Currently at attempt: ", currentAttempt)

        mongoClient.connect(url, async(err, db) => {
            if (operation.retry(err)) return
            // Set collection name as host name
            const hosts = db.collection(hostname)
            // Search for existing entry
            const host = await hosts.findOne({})

            if (!!host) {
                console.log("Found entry for current host... Updating!")
                host.user = user
                host[taskType] = time
                await hosts.save(host)
            } else {
                console.log("No entry for current host found... Creating!")
                const query = {}
                query["user"] = user
                query[taskType] = time
                await hosts.insert(query)
            }
            db.close()
        })
    })
}

dbEntryTask(task)