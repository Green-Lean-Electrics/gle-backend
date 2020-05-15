## Green Lean Electrics Dashboard
This repository contains all the necessary code to build and deploy the backend server used to provide access to all GLE's API services. A copy of this NodeJS application is deployed right now at [pure-badlands-64215.herokuapp.com/](https://pure-badlands-64215.herokuapp.com/) in a Heroku virtual machine. Please note that due limitations of the free Heroku plan, slow wake up times are expected.

### Deploy process
##### Requirements
- Access to a MongoDB database
- `npm` installed and running

##### Build and deploy steps
1. Configure the app. Place a `.env` file in the root path of the project with the following data

```
DB_USER=
DB_PASSWORD=
DB_HOST=
DB_NAME=
DB_PORT=
YAHOO_APP_ID=
YAHOO_KEY=
YAHOO_SECRET=
JWT_KEY=
```
2. Build and launch
```sh
$ npm install
$ npm run local
```

After this steps, a running version of the server app will be accesible at `http://localhost:4000`
