const { ethers } = require("hardhat");

const ADMIN = "0xFaae61D0a3E4d03Eb6C2f6531Eafc6684a6ef4E2";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("===========================================");
  console.log("Deploying BuildLinkFunctionsConsumer");
  console.log("Deployer:", deployer.address);
  console.log("Admin:   ", ADMIN);
  console.log("===========================================\n");

  const FunctionsConsumer = await ethers.getContractFactory("BuildLinkFunctionsConsumer");
  const consumer = await FunctionsConsumer.deploy(ADMIN);
  await consumer.waitForDeployment();
  const consumerAddress = await consumer.getAddress();

  console.log("BuildLinkFunctionsConsumer deployed at:", consumerAddress);
  console.log("\nNext: add this address as a consumer on Chainlink Functions subscription 143.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error durante el despliegue:", error);
    process.exit(1);
  });
