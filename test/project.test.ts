// tslint:disable-next-line no-implicit-dependencies
import { expect } from "chai";
import { TASK_LUXFHE_MOCKS_DEPLOY, TASK_LUXFHE_USE_FAUCET } from "../src/const";
import { useEnvironment } from "./helpers";
import {
  QUERY_DECRYPTER_ADDRESS,
  FHE_NETWORK_ADDRESS,
  ZK_VERIFIER_ADDRESS,
} from "../src/addresses";

describe("LuxFHE Hardhat Plugin", function () {
  describe("LocalLuxFHE Faucet command", async function () {
    useEnvironment("localluxfhe");
    it("checks that the faucet works", async function () {
      await this.hre.run(TASK_LUXFHE_USE_FAUCET);
    });
  });

  describe("Hardhat Mocks", async () => {
    useEnvironment("hardhat");
    it("checks that the mocks are deployed", async function () {
      await this.hre.run(TASK_LUXFHE_MOCKS_DEPLOY);

      const fheNetwork = await this.hre.ethers.getContractAt(
        "MockNetwork",
        FHE_NETWORK_ADDRESS,
      );
      const fheNetworkExists = await fheNetwork.exists();
      expect(fheNetworkExists).to.equal(true);

      const aclAddress = await fheNetwork.acl();

      const acl = await this.hre.ethers.getContractAt("ACL", aclAddress);
      const aclExists = await acl.exists();
      expect(aclExists).to.equal(true);

      const queryDecrypter = await this.hre.ethers.getContractAt(
        "MockQueryDecrypter",
        QUERY_DECRYPTER_ADDRESS,
      );
      const qdExists = await queryDecrypter.exists();
      expect(qdExists).to.equal(true);

      const zkVerifier = await this.hre.ethers.getContractAt(
        "MockZkVerifier",
        ZK_VERIFIER_ADDRESS,
      );
      const zkVerifierExists = await zkVerifier.exists();
      expect(zkVerifierExists).to.equal(true);
    });
  });
});
