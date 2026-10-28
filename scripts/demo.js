const { ethers } = require("hardhat");

// 所有名称、持有人和文件内容均为虚构演示数据。
async function main() {
  const factory = await ethers.getContractFactory("LCT");
  const lct = await factory.deploy();
  await lct.waitForDeployment();
  const metadata = (description, extra = {}) =>
    JSON.stringify({ description, ...extra });

  async function writeAndGetId(transaction, eventName, field) {
    const receipt = await (await transaction).wait();
    for (const log of receipt.logs) {
      let event;
      try {
        event = lct.interface.parseLog(log);
      } catch {
        continue;
      }
      if (event && event.name === eventName) return event.args[field];
    }
    throw new Error(`Missing event: ${eventName}`);
  }

  const platformId = await writeAndGetId(
    lct.registerPlatform("示例业务平台", metadata("LCT 接入演示")),
    "PlatformRegistered", "platformId"
  );
  const projectId = await writeAndGetId(
    lct.registerProject(platformId, "示例数据服务项目", "示例机构", 1,
      metadata("项目登记", { businessId: "DEMO-PROJECT-001" })),
    "ProjectRegistered", "projectId"
  );
  const credentialId = await writeAndGetId(
    lct.createCredential(projectId, 1000, 1,
      metadata("示例凭证", { unit: "份", businessId: "DEMO-CREDENTIAL-001" })),
    "CredentialCreated", "credentialId"
  );

  const holderA = "demo:holder:a";
  const holderB = "demo:holder:b";
  await (await lct.changeCredentialHolder(credentialId, "", holderA, 1000,
    metadata("初始分配"))).wait();
  await (await lct.changeCredentialHolder(credentialId, holderA, holderB, 200,
    metadata("持有人变更", { businessId: "DEMO-TRANSFER-001" }))).wait();
  await (await lct.changeCredentialHolderLock(credentialId, holderB, 50, true,
    metadata("锁定记录，仅用于追溯"))).wait();
  await (await lct.changeCredentialHolderLock(credentialId, holderB, 20, false,
    metadata("解除部分锁定记录"))).wait();
  await (await lct.recordCredentialBenefit(credentialId, holderB, 200, 10,
    metadata("权益记录，不执行支付", { unit: "示例权益单位" }))).wait();

  // 仅为内存字符串计算摘要，接入真实文件时应对原始文件字节计算摘要。
  const fileHash = ethers.keccak256(ethers.toUtf8Bytes("LCT demo document"));
  const fileId = await writeAndGetId(
    lct.registerFile(platformId, "demo.txt", fileHash,
      metadata("示例文件摘要", {
        hashAlgorithm: "keccak256", projectId: projectId.toString(),
        credentialId: credentialId.toString()
      })),
    "FileRegistered", "fileId"
  );

  console.log("LCT:", await lct.getAddress());
  console.log("IDs:", { platformId, projectId, credentialId, fileId });
  console.log("Holder A:", await lct.getCredentialHolderCount(credentialId, holderA));
  console.log("Holder B:", await lct.getCredentialHolderCount(credentialId, holderB));
  const length = await lct.getCredentialHolderChangeLength(credentialId);
  for (let index = 0n; index < length; index++) {
    console.log("Holder change:", await lct.getCredentialHolderChange(credentialId, index));
  }
  console.log("File:", await lct.getFile(fileId));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
