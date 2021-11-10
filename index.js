const express = require('express')
const mongodb = require('mongodb')
const app = express()
const DATABASE_NAME = 'wpr-quiz'

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// Connect to the database
let db = null
let docs = null
async function startServer() {
    const client = await mongodb.MongoClient.connect(`mongodb://localhost:27017/${DATABASE_NAME}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    
    db = client.db()
    console.log('Connected')
    
    app.listen(3000, function () {
        console.log('Listening on port 3000!')
    })
}
startServer()

// Attempts: Start the new quiz
app.post('/attempts', async function (req, res) {
    docs = await db.collection('questions').aggregate([{ $sample: { size: 10 } }]).toArray()
    const questions = docs.map(question => {
        return {
            _id: question._id,
            text: question.text,
            answers: question.answers
        }
    })

    const data = {
        _id: new mongodb.ObjectId(),
        questions: questions,
        completed: false,
        startedAt: new Date(),
    }

    await db.collection('attempts').insertOne(data)

    return res.status(201).json(data)
})

// Score text
function scoreText(score) {
    if (score < 5) {
        return 'Practice more to improve it :D'
    } else if (score < 7) {
        return 'Good, keep up!'
    } else if (score < 9) {
        return 'Well done!'
    } else {
        return 'Perfect!!'
    }
}

// Submit quiz
app.post('/attempts/:id/submit', async function (req, res) {
    const _id = req.params.id
    const answers = req.body.answers
    const data = await db.collection('attempts').findOne({ _id: mongodb.ObjectId(_id) })

    if (!data.completed) {
        const correctAnswers = {}
        let score = 0

        const questions = docs.map(question => {
            return {
                _id: question._id,
                text: question.text,
                answers: question.answers
            }
        })

        for (const doc of docs) {
            correctAnswers[doc._id] = doc.correctAnswer
        }

        // Score
        for (const answer in answers) {
            if (answers[answer] === correctAnswers[answer]) {
                score++
            }
        }
        const result = {
            _id: mongodb.ObjectId(_id),
            questions: questions,
            completed: true,
            startedAt: new Date(),
            answers: answers,
            correctAnswers: correctAnswers,
            score: score,
            scoreText: scoreText(score),
        }

        await db.collection('attempts').updateOne({ _id: mongodb.ObjectId(_id) }, { $set: result })

        return res.status(200).json(result)
    }

    return res.status(200).json(data)
})
