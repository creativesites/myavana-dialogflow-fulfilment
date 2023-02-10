const { Configuration, OpenAIApi } = require("openai");
const {WebhookClient} = require('dialogflow-fulfillment');
const express = require('express');
require('dotenv').config()
const bodyParser = require('body-parser');
const stringSimilarity = require("string-similarity");
const NodeCache = require( "node-cache" );
const userCache = new NodeCache( { stdTTL: 604800, checkperiod: 12000 } );
const promptCache = new NodeCache( { stdTTL: 604800, checkperiod: 12000 } );
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const app = express();
app.use(bodyParser.json());
//app.use(express.json());
let users = [];
function checkLines(str) {
    let lines = str.split('\n');
    if (lines.length >= 7) {
      let firstLine = lines[0];
      let lastFourLines = lines.slice(lines.length - 4).join('\n');
      return firstLine + '\n' + lastFourLines;
    }
    return str;
}
function getSimilarKey(userSays) {
    try {
        const keys = promptCache.keys();
        const similarityScores = stringSimilarity.findBestMatch(userSays, keys);
        return similarityScores.bestMatch.target;
    } catch (error) {
        return undefined
    }
  }
  
  function hasSimilarKey(userSays) {
    try {
        const similarKey = getSimilarKey(userSays);
        return promptCache.has(similarKey);
    } catch (error) {
        return false
    }
  }
  
  function getSimilarValue(userSays) {
    try {
        const similarKey = getSimilarKey(userSays);
        return promptCache.get(similarKey);
    } catch (error) {
        return undefined
    }
  }

app.post('/webhook', (req, res) => {
    console.log('req')
    const agent = new WebhookClient({ request: req, response: res });
    async function main(agent) {
        let userSays = req.body.queryResult.queryText;
        let user1 = req.body.session;
        let user = user1.substring(user1.lastIndexOf('/') + 1)
        let addToPrompt = '\nHuman: ' + userSays + '\nAI: ';
        let promptToSend = ''
        
        if(hasSimilarKey(userSays)){
            let isPromptCached = getSimilarValue(userSays);
            agent.add(isPromptCached) 
            if(userCache.has(user)){
                let userobj = userCache.take(user);
                let lastPrompt = userobj.prompt;
                lastPrompt += addToPrompt;
                lastPrompt += isPromptCached;
                let result = checkLines(lastPrompt);
                userCache.set(user, {
                    id: user,
                    prompt: result
                })
            }else{
                let promptToSave = 'The following is a conversation with a Myavana haircare AI assistant. The assistant is helpful, creative, clever, and very friendly.' + addToPrompt
                userCache.set(user, {
                    id: user,
                    prompt: promptToSave
                }) 
            }
        }else{
            let isUserCached = userCache.get( user );
            if ( isUserCached == undefined ){
                // handle miss!
                promptToSend = 'The following is a conversation with a Myavana haircare AI assistant. The assistant is helpful, creative, clever, and very friendly.' + addToPrompt;
                await openai.createCompletion({
                    model: "text-davinci-003",
                    prompt: promptToSend,
                    temperature: 0.3,
                    max_tokens: 1200,
                    top_p: 1.0,
                    frequency_penalty: 0.0,
                    presence_penalty: 0.0,
                    stop: [" Human:", " AI:"],
                }).then(async(response)=>{
                    console.log(response.data.choices[0].text);
                    await agent.add(`${response.data.choices[0].text}`);
                    userCache.set(user, {
                        id: user,
                        prompt: 'The following is a conversation with a Myavana haircare AI assistant. The assistant is helpful, creative, clever, and very friendly.' + addToPrompt + response.data.choices[0].text
                    });
                    promptCache.set(userSays, response.data.choices[0].text);
                }).catch((err)=>{
                    console.log(err)
                    agent.add('I missed what you said. I am directing to one of our agents. Is that okay?')
                })
                    
                
            }else{
                let savedPrompt = isUserCached.prompt;
                savedPrompt += addToPrompt
                await openai.createCompletion({
                    model: "text-davinci-003",
                    prompt: savedPrompt,
                    temperature: 0.3,
                    max_tokens: 1200,
                    top_p: 1.0,
                    frequency_penalty: 0.0,
                    presence_penalty: 0.0,
                    stop: [" Human:", " AI:"],
                }).then(async(response)=>{
                    console.log(response.data.choices[0].text);
                    await agent.add(`${response.data.choices[0].text}`);
                    savedPrompt += response.data.choices[0].text;
                    let result = checkLines(savedPrompt);
                    userCache.set(user, {
                        id: user,
                        prompt: result
                    });
                    promptCache.set(userSays, response.data.choices[0].text);
                }).catch((err)=>{
                    console.log(err)
                    agent.add('I missed what you said. I am directing to one of our agents. Is that okay?')
                })
                
            }
        }
        
        
    }
    let intentMap = new Map();
    intentMap.set('Default Fallback Intent', main);
    agent.handleRequest(intentMap);

})
app.listen(process.env.PORT || 3000)