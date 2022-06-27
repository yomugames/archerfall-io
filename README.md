# Installation

1. Install node.js version 16.15.0
2. Install mysql
3. Create database named archerfall_development

4. Go to archerfall-io folder and install dependencies

        npm install

5. Populate database
        mysql -u root archerfall_development  < ./scripts/archerfall_development.sql

6.  For local mysql database, we assume there's a root user with no password. Otherwise, you can set these environment variables

        export ARCHERFALL_DB_USER=<your sql user>
        export ARCHERFALL_DB_PASS=<your sql pass>

# Running

1.  Run matchmaker. archerfall-io needs to connect to matchmaker in order to work properly

        cd ~/
        git clone https://github.com/yomugames/archerfall-matchmaker.git
        cd ~/archerfall-matchmaker && npm run dev

2.  Run server

        npm run dev

3.  Run client

        npx gulp

