import { expect } from "chai";
import { useEnvironment } from "./helpers";
import { FHE_NETWORK_ADDRESS } from "../src/addresses";
import {
  TASK_LUXFHE_MOCKS_DEPLOY,
  TASK_LUXFHE_MOCKS_SET_LOG_OPS,
} from "../src/const";
import { mock_setLoggingEnabled, mock_withLogs } from "../src/mock-logs";
import { Contract } from "ethers";

describe("Set Log Ops Task", function () {
  useEnvironment("hardhat");

  let fheNetwork: Contract;

  beforeEach(async function () {
    await this.hre.run(TASK_LUXFHE_MOCKS_DEPLOY, { silent: true });

    fheNetwork = await this.hre.ethers.getContractAt(
      "MockNetwork",
      FHE_NETWORK_ADDRESS,
    );
  });

  const expectLogOps = async (enabled: boolean) => {
    const logOps = await fheNetwork.logOps();
    console.log(`${enabled ? "├ " : ""}(hh-test) Logging Enabled?`, logOps);
    expect(logOps).to.equal(enabled);
  };

  it("(task) should enable logging", async function () {
    // Verify initial state
    await expectLogOps(false);

    // Enable logging
    await this.hre.run(TASK_LUXFHE_MOCKS_SET_LOG_OPS, {
      enable: true,
    });

    expect(await fheNetwork.logOps()).to.equal(true);
  });
  it("(function) should enable logging", async function () {
    // Verify initial state
    await expectLogOps(false);

    // Enable logging
    await this.hre.luxfhe.mocks.enableLogs();

    await expectLogOps(true);

    await this.hre.luxfhe.mocks.disableLogs();

    // Disable logging (not hre)
    await mock_setLoggingEnabled(this.hre, false);

    await expectLogOps(false);
  });

  it("(task) should disable logging", async function () {
    await this.hre.luxfhe.mocks.enableLogs();
    await expectLogOps(true);

    // Disable logging
    await this.hre.run(TASK_LUXFHE_MOCKS_SET_LOG_OPS, {
      enable: false,
    });

    await expectLogOps(false);
  });
  it("(function) should disable logging", async function () {
    await this.hre.luxfhe.mocks.enableLogs();

    await expectLogOps(true);

    // Disable logging
    await this.hre.luxfhe.mocks.disableLogs();

    await expectLogOps(false);

    await this.hre.luxfhe.mocks.enableLogs();

    // Disable logging (not hre)
    await mock_setLoggingEnabled(this.hre, false);

    await expectLogOps(false);
  });

  it("(function) mock_withLogs should enable logging", async function () {
    await this.hre.luxfhe.mocks.withLogs(
      "'hre.luxfhe.mocks.withLogs' logging enabled?",
      async () => {
        // Verify logging is enabled inside the closure
        await expectLogOps(true);
      },
    );

    // Verify logging is disabled outside of the closure
    await expectLogOps(false);

    await mock_withLogs(
      this.hre,
      "'mock_withLogs' logging enabled?",
      async () => {
        // Verify logging is enabled inside the closure
        await expectLogOps(true);
      },
    );

    // Verify logging is disabled outside of the closure
    await expectLogOps(false);
  });
});
