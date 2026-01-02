import { HardhatRuntimeEnvironment } from "hardhat/types";
import { FHE_NETWORK_ADDRESS } from "./addresses";
import chalk from "chalk";

const getDeployedMockFHENetwork = async (hre: HardhatRuntimeEnvironment) => {
  // Fetch the deployed MockFHENetwork (contract still named TaskManager in Solidity)
  const fheNetwork = await hre.ethers.getContractAt(
    "TaskManager",
    FHE_NETWORK_ADDRESS,
  );

  return fheNetwork;
};

const getLoggingEnabled = async (hre: HardhatRuntimeEnvironment) => {
  const fheNetwork = await getDeployedMockFHENetwork(hre);
  return await fheNetwork.logOps();
};

const setLoggingEnabled = async (
  hre: HardhatRuntimeEnvironment,
  enabled: boolean,
) => {
  const fheNetwork = await getDeployedMockFHENetwork(hre);
  await fheNetwork.setLogOps(enabled);
};

// prettier-ignore
const printLogsEnabledMessage = (closureMessage: string) => {
  console.log("┌──────────────────┬──────────────────────────────────────────────────");
  console.log(`│ [LUXFHE-MOCKS]   │ ${closureMessage}`);
  console.log("├──────────────────┴──────────────────────────────────────────────────");
};

// prettier-ignore
const printLogsBlockEnd = () => {
  console.log("└─────────────────────────────────────────────────────────────────────");
};

export const mock_setLoggingEnabled = async (
  hre: HardhatRuntimeEnvironment,
  enabled: boolean,
  closureName?: string,
) => {
  try {
    const initiallyEnabled = await getLoggingEnabled(hre);

    await setLoggingEnabled(hre, enabled);

    // Only print if enabling logs
    if (enabled) {
      printLogsEnabledMessage(
        `${closureName ? `"${chalk.bold(closureName)}" logs:` : "Logs:"}`,
      );
    }

    // Only print if disabling logs AND logs currently enabled
    if (!enabled && initiallyEnabled) {
      printLogsBlockEnd();
    }
  } catch (error) {
    console.log(chalk.red("mock_setLoggingEnabled error"), error);
  }
};

export const mock_withLogs = async (
  hre: HardhatRuntimeEnvironment,
  closureName: string,
  closure: () => Promise<void>,
) => {
  const initiallyEnabled = await getLoggingEnabled(hre);

  await setLoggingEnabled(hre, true);
  printLogsEnabledMessage(`"${chalk.bold(closureName)}" logs:`);
  await closure();
  printLogsBlockEnd();

  // If logs were disabled, disable them again
  if (!initiallyEnabled) {
    await setLoggingEnabled(hre, false);
  }
};
