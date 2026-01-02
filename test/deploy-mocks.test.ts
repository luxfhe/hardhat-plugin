import { expect } from "chai";
import { useEnvironment } from "./helpers";
import {
  QUERY_DECRYPTER_ADDRESS,
  FHE_NETWORK_ADDRESS,
  TEST_BED_ADDRESS,
  ZK_VERIFIER_ADDRESS,
} from "../src/addresses";
import { TASK_LUXFHE_MOCKS_DEPLOY } from "../src/const";
import { HardhatRuntimeEnvironment } from "hardhat/types";

describe("Deploy Mocks Task", function () {
  const getTestBedBytecode = async (hre: HardhatRuntimeEnvironment) => {
    return await hre.ethers.provider.getCode(TEST_BED_ADDRESS);
  };
  useEnvironment("hardhat");

  it("should deploy mock contracts", async function () {
    await this.hre.run(TASK_LUXFHE_MOCKS_DEPLOY);

    const fheNetwork = await this.hre.ethers.getContractAt(
      "MockNetwork",
      FHE_NETWORK_ADDRESS,
    );
    expect(await fheNetwork.exists()).to.equal(true);

    const acl = await this.hre.ethers.getContractAt(
      "ACL",
      await fheNetwork.acl(),
    );
    expect(await acl.exists()).to.equal(true);

    const zkVerifier = await this.hre.ethers.getContractAt(
      "MockZkVerifier",
      ZK_VERIFIER_ADDRESS,
    );
    expect(await zkVerifier.exists()).to.equal(true);

    const queryDecrypter = await this.hre.ethers.getContractAt(
      "MockQueryDecrypter",
      QUERY_DECRYPTER_ADDRESS,
    );
    expect(await queryDecrypter.exists()).to.equal(true);
  });

  it("should deploy mocks with test bed", async function () {
    await this.hre.run(TASK_LUXFHE_MOCKS_DEPLOY, {
      deployTestBed: true,
    });

    const fheNetwork = await this.hre.ethers.getContractAt(
      "MockNetwork",
      FHE_NETWORK_ADDRESS,
    );
    expect(await fheNetwork.exists()).to.equal(true);

    const testBedBytecode = await getTestBedBytecode(this.hre);
    expect(testBedBytecode.length).to.be.greaterThan(2);

    const testBed = await this.hre.ethers.getContractAt(
      "FHETest",
      TEST_BED_ADDRESS,
    );
    expect(await testBed.exists()).to.equal(true);
  });

  it("should deploy mocks without test bed", async function () {
    await this.hre.run(TASK_LUXFHE_MOCKS_DEPLOY, {
      deployTestBed: false,
    });

    const fheNetwork = await this.hre.ethers.getContractAt(
      "MockNetwork",
      FHE_NETWORK_ADDRESS,
    );
    expect(await fheNetwork.exists()).to.equal(true);

    const testBedBytecode = await getTestBedBytecode(this.hre);
    expect(testBedBytecode).to.equal("0x");
  });
});
