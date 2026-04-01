const { ethers } = require("hardhat");

// USDC addresses
const USDC = {
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;

  const usdcAddress = USDC[network];
  if (!usdcAddress) {
    throw new Error(`No USDC address configured for network: ${network}`);
  }

  console.log("===========================================");
  console.log("Desplegando BuildLink USDC con la cuenta:", deployer.address);
  console.log("Red:", network);
  console.log("USDC:", usdcAddress);
  console.log("===========================================\n");

  // Deploy EscrowFactoryUSDC
  console.log("1. Desplegando EscrowFactoryUSDC...");
  const EscrowFactoryUSDC = await ethers.getContractFactory("EscrowFactoryUSDC");
  const factory = await EscrowFactoryUSDC.deploy(usdcAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("   EscrowFactoryUSDC desplegado en:", factoryAddress);

  // Note: EscrowVaultUSDC is deployed per-project by the factory — not deployed directly here.

  console.log("\n===========================================");
  console.log("DESPLIEGUE COMPLETADO");
  console.log("===========================================");
  console.log("EscrowFactoryUSDC:  ", factoryAddress);
  console.log("USDC token:         ", usdcAddress);
  console.log("\nGuarda estas direcciones en tu .env o en el frontend.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error durante el despliegue:", error);
    process.exit(1);
  });
