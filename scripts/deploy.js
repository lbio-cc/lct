const { ethers } = require("hardhat");

async function main() {
  const factory = await ethers.getContractFactory("LCT");
  const lct = await factory.deploy();
  await lct.waitForDeployment();
  console.log("LCT address:", await lct.getAddress());
  console.log("Admin:", await lct.admin());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
