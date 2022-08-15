# Payrill - API

> There are some changes I'll be making to this repo, make sure you pull updated changes using `git pull`. then add your changes before pushing.

# Setup

- ## Clone the repo

```js
    git clone https://github.com/Benrobo/payrill-api.git
```

- ## Install all dependencies

```js
    // if npm is default package manager
    npm install

    // if yarn is default package manager
    yarn add
```

- ## Create a .env file. Paste and update the created .env file to the variables found in `.env.development`

```js

    DATABASE_URL="mongodb database url"

    ACCESS_TOKEN_SECRET=""

    REFRESH_TOKEN_SECRET=""

    MAX_API_REQUEST_COUNT = 100
    
    RAPYD_SECRET_KEY=""

    RAPYD_ACCESS_KEY=""
```

## Testing Application.
The backend API uses `Jest` as the prefered testing library for our application. All `test` files are found within the `./test` directory.

