# Dialogflow Fulfillment with OpenAI

This repository contains the implementation of a Dialogflow fulfillment webhook integrated with OpenAI's GPT-3. The fulfillment handles user queries by providing intelligent and contextually relevant responses, leveraging caching to optimize performance and user experience.

## Features

- **Dialogflow Integration**: Seamlessly connects with Dialogflow to handle webhook requests.
- **OpenAI GPT-3**: Uses OpenAI's powerful language model for generating responses.
- **Caching**: Implements caching with `node-cache` to store user prompts and responses, improving response time and consistency.
- **Similarity Matching**: Uses `string-similarity` to match user queries with cached responses, ensuring similar questions get consistent answers.
- **Express Server**: Runs on an Express server to handle incoming requests.

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/your-username/dialogflow-fulfillment.git
    cd dialogflow-fulfillment
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Create a `.env` file in the root directory and add your OpenAI API key:
    ```env
    OPENAI_API_KEY=your_openai_api_key
    ```

4. Start the server:
    ```sh
    npm start
    ```

## Usage

1. Deploy the server to a platform of your choice (e.g., Heroku, Vercel, AWS).
2. Set up Dialogflow to use the deployed webhook URL for fulfillment.
3. Configure the intent in Dialogflow to use the webhook for responses.

## Code Overview

### Dependencies

- `openai`: For interacting with OpenAI's GPT-3 API.
- `dialogflow-fulfillment`: For handling Dialogflow webhook requests.
- `express`: For creating the server.
- `dotenv`: For loading environment variables.
- `body-parser`: For parsing incoming request bodies.
- `string-similarity`: For finding similar strings.
- `node-cache`: For caching user prompts and responses.

### Main Files

- `index.js`: Main server file that sets up the Express server and handles incoming webhook requests from Dialogflow.

### Key Functions

- `checkLines(str)`: Ensures that the conversation history does not exceed a certain length.
- `getSimilarKey(userSays)`: Finds the most similar cached key to the user's query.
- `hasSimilarKey(userSays)`: Checks if there is a similar key in the cache.
- `getSimilarValue(userSays)`: Retrieves the cached response for a similar user query.
- `main(agent)`: Main function that processes the incoming request, checks cache, and generates a response using GPT-3 if needed.

## Example Flow

1. **User Query**: The user sends a query through the Dialogflow interface.
2. **Cache Check**: The webhook checks if a similar query has been cached.
3. **Response Generation**:
    - If a cached response is found, it is returned.
    - If no cached response is found, the query is sent to OpenAI's GPT-3 to generate a response.
4. **Response Storage**: The generated response is cached for future similar queries.
5. **User Interaction**: The response is sent back to the user through Dialogflow.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an issue.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
