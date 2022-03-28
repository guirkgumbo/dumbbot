const dotenv = require("dotenv");
dotenv.config();

const { ethers } = require("ethers");
const BigNumber = require("bignumber.js");
const contract = require("./contract.json");
const cron = require("node-cron");

// Api key of the fantom node TODO: run your own again
const API_KEY = process.env.HTTP_PROVIDER_FANTOM;
// Shit wallet
const PRIVATE_KEY = process.env.PK_FANTOM;
// Contract address for dutchauction by defiolympiads
const CONTRACT_ADDRESS = "0xD5D5C07CC2A21fce523b8C16B51F769B0aFa08B4";

// Provider
const provider = new ethers.providers.JsonRpcProvider(API_KEY);

// Signer
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// Contract
const ContDutchAuction = new ethers.Contract(
  CONTRACT_ADDRESS,
  contract.result,
  signer
);

// Normalise number to match BigNumber
const normalise = (amount) => {
  return new BigNumber(amount).times(new BigNumber(10).pow(18));
};

// Denormalise for reading
const denormalise = (amount) => {
  return new BigNumber(amount).div(new BigNumber(10).pow(18));
};

let primer = 0.13;

async function main() {
  // magic number cause small even numbers seem to be the best outcome from the getY function
  const magicNumber = normalise(primer.toString()).toFixed(0);
  const y = await ContDutchAuction.getY(magicNumber);
  console.log("The potential y is: " + denormalise(y._hex).toFixed(4));
  const readableY = denormalise(y._hex).toFixed(4);
  // When I have a favorable Y FYI: This check is really needed but just in case
  if (readableY > 1.1) {
    // execute swap
    try {
      const gasPrice = await provider.getGasPrice();
      console.log("gas price: ", gasPrice.toString()); //returns the price of gas from the network
      // TODO: find a way to get the current gasLimit if the network
      const swap = await ContDutchAuction.swap(magicNumber, y, {
        gasPrice: gasPrice.add(gasPrice.div(35)),
        gasLimit: 220000,
      });
      console.log("Swap results!");
      console.log(swap);
    } catch (err) {
      console.log("error!");
      console.error(err);
    }
  }
}

// Cron scheduler cause setInterval is dumb
cron.schedule("*/30 * * * * *", () => {
  console.log("running a task every minute");
  primer = primer + 0.0001;
  if (primer > 0.2) {
    primer = 0.13;
  }
  main();
});
