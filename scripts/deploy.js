const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("===========================================");
  console.log("Desplegando BuildLink con la cuenta:", deployer.address);
  console.log("===========================================\n");

  // 1. Desplegar EscrowFactory
  console.log("1. Desplegando EscrowFactory...");
  const EscrowFactory = await ethers.getContractFactory("EscrowFactory");
  const factory = await EscrowFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("   EscrowFactory desplegado en:", factoryAddress);

  // 2. Desplegar BuildLinkFunctionsConsumer
  console.log("\n2. Desplegando BuildLinkFunctionsConsumer...");
  const FunctionsConsumer = await ethers.getContractFactory("BuildLinkFunctionsConsumer");
  const consumer = await FunctionsConsumer.deploy();
  await consumer.waitForDeployment();
  const consumerAddress = await consumer.getAddress();
  console.log("   BuildLinkFunctionsConsumer desplegado en:", consumerAddress);

  // Nota: EscrowVault se despliega automáticamente desde EscrowFactory
  // al crear cada proyecto — no se despliega directamente aquí.

  console.log("\n===========================================");
  console.log("DESPLIEGUE COMPLETADO");
  console.log("===========================================");
  console.log("EscrowFactory:               ", factoryAddress);
  console.log("BuildLinkFunctionsConsumer:  ", consumerAddress);
  console.log("\nGuarda estas direcciones — las necesitarás para interactuar con BuildLink.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error durante el despliegue:", error);
    process.exit(1);
  });
