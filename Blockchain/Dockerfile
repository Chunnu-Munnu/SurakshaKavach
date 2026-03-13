FROM node:18-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN npm install -g yarn && yarn install
COPY . .
EXPOSE 8545
CMD ["yarn", "hardhat", "node", "--hostname", "0.0.0.0"]
