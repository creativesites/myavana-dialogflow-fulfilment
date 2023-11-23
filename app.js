const { Configuration, OpenAIApi } = require("openai");
const OpenAI = require("openai");
const {WebhookClient} = require('dialogflow-fulfillment');
const express = require('express');
require('dotenv').config()
const bodyParser = require('body-parser');
const stringSimilarity = require("string-similarity");
const NodeCache = require( "node-cache" );
const userCache = new NodeCache( { stdTTL: 604800, checkperiod: 12000 } );
const promptCache = new NodeCache( { stdTTL: 604800, checkperiod: 12000 } );

//const openai = new OpenAI(configuration);
const secretKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey: secretKey,
});
const app = express();
app.use(bodyParser.json());


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
      const threshold = 0.7; // You can adjust this threshold value to your liking
      if (similarityScores.bestMatch.rating >= threshold) {
        return similarityScores.bestMatch.target;
      } else {
        return undefined;
      }
    } catch (error) {
      return undefined;
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
  async function createThread() {
    try {
        return await openai.beta.threads.create();
    } catch (error) {
        console.error("Error creating thread:", error);
        throw error;
    }
}

app.post('/webhook', (req, res) => {
    console.log('req')
    const agent = new WebhookClient({ request: req, response: res });

    
    async function main(agent) {
        let userSays = req.body.queryResult.queryText;
        let user1 = req.body.session;
        let user = user1.substring(user1.lastIndexOf('/') + 1)
        const assistant = await openai.beta.assistants.retrieve('asst_z0d2hXrIhUbasLEWKnvYuUUr');
        async function runAPI(threadId){
            try {
                // Pass in the user question into the existing thread
            await openai.beta.threads.messages.create(threadId, {
                role: "user",
                content: userSays,
            });
            // Use runs to wait for the assistant response and then retrieve it
            const run = await openai.beta.threads.runs.create(threadId, {
                assistant_id: assistant.id,
            });
    
            let runStatus = await openai.beta.threads.runs.retrieve(
                threadId,
                run.id
            );
            // Polling mechanism to see if runStatus is completed
            // This should be made more robust.
            while (runStatus.status !== "completed") {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
            }
    
            // Get the last assistant message from the messages array
            const messages = await openai.beta.threads.messages.list(threadId);
            // Find the last message for the current run
            const lastMessageForRun = messages.data
            .filter(
                (message) => message.run_id === run.id && message.role === "assistant"
            )
            .pop();
    
            // If an assistant message is found, console.log() it
            if (lastMessageForRun) {
            console.log(`${lastMessageForRun.content[0].text.value} \n`);
            }
            agent.add(lastMessageForRun.content[0].text.value)
            userCache.set(user, {
                id: user,
                threadId: threadId
            });
            promptCache.set(userSays, lastMessageForRun.content[0].text.value);
            } catch (error) {
                console.error("Error in runAPI:", error);
                agent.add('I missed what you said. I am directing to one of our agents. Is that okay?');
            }
            
       }
       try {
        if(hasSimilarKey(userSays)){
            let isPromptCached = getSimilarValue(userSays);
            agent.add(isPromptCached) 
            if(userCache.has(user)){
            }else{
                const thread = await openai.beta.threads.create();
                await openai.beta.threads.messages.create(thread.id, {
                    role: "user",
                    content: userSays,
                });
                
                userCache.set(user, {
                    id: user,
                    threadId: thread.id
                }) 
                

            }
        }else{
            let isUserCached = userCache.get(user);
            if ( isUserCached == undefined ){
                // handle miss!
                const thread = await openai.beta.threads.create();
                try {
                   await runAPI(thread.id)
                } catch (error) {
                   console.log(error) 
                   agent.add('I missed what you said. I am directing to one of our agents. Is that okay?')
                }
               
            }else{
                try {
                    await runAPI(isUserCached.threadId)
                 } catch (error) {
                    console.log(error) 
                    agent.add('I missed what you said. I am directing to one of our agents. Is that okay?')
                 }
                
            }
        }
       } catch (error) {
        console.error("Error in main handler:", error);
        agent.add("Sorry, I encountered an issue processing your request.");
       }
        
    }
    let intentMap = new Map();
    intentMap.set('Default Fallback Intent', main);
    agent.handleRequest(intentMap);

})
app.listen(process.env.PORT || 3000)