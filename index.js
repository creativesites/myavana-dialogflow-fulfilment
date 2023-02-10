const { Configuration, OpenAIApi } = require("openai");
const {WebhookClient} = require('dialogflow-fulfillment');
const express = require('express');
require('dotenv').config()
const bodyParser = require('body-parser');
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const app = express();
app.use(bodyParser.json());
//app.use(express.json());
let users = [];
app.post('/webhook', (req, res) => {
    console.log('req')
    const agent = new WebhookClient({ request: req, response: res });
    async function main(agent) {
        let userSays = req.body.queryResult.queryText;
        let user1 = req.body.session;
        let user = user1.substring(user1.lastIndexOf('/') + 1)
        let addToPrompt = '\nHuman: ' + userSays + '\nAI: ';
        let promptToSend = ''
        let hasId = users.some( vendor => vendor['id'] === user )
        if (hasId) {
            users.forEach( vendor => {
                if (vendor['id'] === user) {
                    let c = vendor.prompt
                    if(c.length > 1000){
                        let firstNewLineIndex = c.indexOf("\n");
                        let secondNewLineIndex = c.indexOf("\n", firstNewLineIndex + 1);
                        let thirdNewLineIndex = c.indexOf("\n", secondNewLineIndex + 1);
                        let newString = c.slice(0, firstNewLineIndex) + c.slice(thirdNewLineIndex);
                        console.log(newString);
                        vendor['prompt'] = newString
                        promptToSend = newString
                    }
                    vendor['prompt'] += addToPrompt;
                    promptToSend = vendor['prompt']
                }
            })
        }else {
            users.push({
                id: user,
                prompt: 'The following is a conversation with a Myavana haircare AI assistant. The assistant is helpful, creative, clever, and very friendly.' + addToPrompt
            })
            promptToSend = 'The following is a conversation with a Myavana haircare AI assistant. The assistant is helpful, creative, clever, and very friendly.' + addToPrompt;
        }
        console.log(promptToSend)
        const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: promptToSend,
        temperature: 0.3,
        max_tokens: 1200,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stop: [" Human:", " AI:"],
        });
        console.log(response.data.choices[0].text);
        await agent.add(`${response.data.choices[0].text}`);
        users.forEach( vendor => {
            if (vendor['id'] === user) {
                let c = vendor.prompt
                if(c.length > 1000){
                    let firstNewLineIndex = c.indexOf("\n");
                    let secondNewLineIndex = c.indexOf("\n", firstNewLineIndex + 1);
                    let thirdNewLineIndex = c.indexOf("\n", secondNewLineIndex + 1);
                    let newString = c.slice(0, firstNewLineIndex) + c.slice(thirdNewLineIndex);
                    console.log(newString);
                    vendor['prompt'] = newString += response.data.choices[0].text
                }
                vendor['prompt'] += response.data.choices[0].text
            }
        })
    }
    let intentMap = new Map();
    intentMap.set('Default Fallback Intent', main);
    agent.handleRequest(intentMap);

})
app.listen(process.env.PORT || 3000)