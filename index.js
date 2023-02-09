const { Configuration, OpenAIApi } = require("openai");
const {WebhookClient} = require('dialogflow-fulfillment');
const express = require('express');
require('dotenv').config()
const bodyParser = require('body-parser');
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const mongoose = require("mongoose");

var uri = "mongodb+srv://winston:higibertigibet@cluster0.qdgj8zs.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(uri, { useUnifiedTopology: true, useNewUrlParser: true });

const connection = mongoose.connection;

connection.once("open", function() {
  console.log("MongoDB database connection established successfully");
});
const userSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    prompt: {
        type: String,
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);
const openai = new OpenAIApi(configuration);
const app = express();
app.use(bodyParser.json());
//app.use(express.json());
let users = [];
async function addOrUpdateUser(sessionId, userSays) {
    try {
        // check if user with sessionId already exists
        let user = await User.findOne({ sessionId });

        if (!user) {
            // if user does not exist, create new user
            user = new User({ sessionId, prompt: userSays });
        } else {
            // if user exists, append userSays to prompt and update updatedAt
            user.prompt += ' ' + userSays;
            user.updatedAt = Date.now();
        }

        // save user to database
        await user.save();
    } catch (error) {
        console.log(error);
    }
}
app.post('/webhook', (req, res) => {
    const agent = new WebhookClient({ request: req, response: res });
    async function main(agent) {
        try{
            let userSays = req.body.queryResult.queryText;
        let user1 = req.body.session;
        let user2 = user1.substring(user1.lastIndexOf('/') + 1)
        let user = await User.findOne({ user2 });
        
        let addToPrompt = '\nHuman: ' + userSays + '\nAI: ';
        let promptToSend = ''
        if (!user) {
            console.log('user not found')
            user = new User({ 
                sessionId: user2, 
                prompt: 'The following is a conversation with a Myavana haircare AI assistant. The assistant is helpful, creative, clever, and very friendly.' + addToPrompt
             });
             promptToSend = 'The following is a conversation with a Myavana haircare AI assistant. The assistant is helpful, creative, clever, and very friendly.' + addToPrompt;
        } else {
            user.prompt += ' ' + userSays;
            user.updatedAt = Date.now();
            if(user.prompt.length > 1000){
                let firstNewLineIndex = user.prompt.indexOf("\n");
                let secondNewLineIndex = user.prompt.indexOf("\n", firstNewLineIndex + 1);
                let thirdNewLineIndex = user.prompt.indexOf("\n", secondNewLineIndex + 1);
                let newString = user.prompt.slice(0, firstNewLineIndex) + user.prompt.slice(thirdNewLineIndex);
                user.prompt = newString
                promptToSend = newString
            }else{
                promptToSend = user.prompt
            }
        }
        
        await new Promise((resolve, reject) => {
            openai.createCompletion({
                model: "text-curie-001",
                prompt: promptToSend,
                temperature: 0.3,
                max_tokens: 1200,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
                stop: [" Human:", " AI:"],
            }).then(async (response) => {
                console.log(response.data.choices[0].text);
                agent.add(response.data.choices[0].text);
                try {
                    user.prompt += response.data.choices[0].text
                    await user.save();
                } catch (error) {
                    let user = await User.findOne({ user2 });
                    user.prompt += response.data.choices[0].text
                    await user.save();
                }
                resolve(response.data.choices[0].text);
                
            }).catch((error) => {
                console.log(error);
                reject(error);
            });
        });
        
        } catch(err){
            console.log(err)
            agent.add('Sorry, I am having trouble understanding you. Please try again.')
        }
        
        
    }
    let intentMap = new Map();
    intentMap.set('Default Fallback Intent', main);
    agent.handleRequest(intentMap);
    //res.status(200).send(agent);

})
app.listen(process.env.PORT || 3000)