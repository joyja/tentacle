FROM keymetrics/pm2:latest-stretch

# Bundle APP files
COPY src src/
COPY package.json .
COPY ecosystem.config.js .

# Install app dependencies
ENV NPM_CONFIG_LOGLEVEL warn
RUN npm install --production

# Expose the listening port of your app
EXPOSE 4000

# Show current folder structure in logs
CMD [ "pm2-runtime", "start", "ecosystem.config.js" ]
