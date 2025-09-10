const amqp = require("amqplib");
const logger = require("./logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook_events";

async function connectToRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to rabbit mq");
    return channel;
  } catch (e) {
    logger.error("Error connecting to  rabbit Mq", e);
  }
}

async function publishEvent(routingkey,message){
  if(!channel){
    await connectToRabbitMQ()
  }

  channel.publish(EXCHANGE_NAME,routingkey,Buffer.from(JSON.stringify(message)))
  logger.info(`Event published : ${routingkey}`)

}

module.exports = {connectToRabbitMQ,publishEvent}