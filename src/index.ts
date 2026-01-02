import chalk from "chalk";
import { extendConfig, extendEnvironment, task, types } from "hardhat/config";

import { localLuxFHEFundAccount } from "./common";
import {
  TASK_LUXFHE_MOCKS_DEPLOY,
  TASK_LUXFHE_MOCKS_SET_LOG_OPS,
  TASK_LUXFHE_USE_FAUCET,
} from "./const";
import { TASK_TEST, TASK_NODE } from "hardhat/builtin-tasks/task-names";
import { deployMocks, DeployMocksArgs } from "./deploy-mocks";
import { mock_setLoggingEnabled, mock_withLogs } from "./mock-logs";
import { mock_expectPlaintext } from "./mockUtils";
import { mock_getPlaintext } from "./mockUtils";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  luxfhe_initializeWithHardhatSigner,
  HHSignerInitializationParams,
  isPermittedLuxFHEEnvironment,
} from "./networkUtils";
import { Permit, Result } from "@luxfhe/sdk/node";
import {
  expectResultError,
  expectResultPartialValue,
  expectResultSuccess,
  expectResultValue,
} from "./result";

/**
 * Configuration interface for the LuxFHE Hardhat plugin.
 * Allows users to configure mock logging and gas warning settings.
 */
declare module "hardhat/types/config" {
  interface HardhatUserConfig {
    luxfhe?: {
      /** Whether to log mock operations (default: true) */
      logMocks?: boolean;
      /** Whether to show gas usage warnings for mock operations (default: true) */
      gasWarning?: boolean;
    };
  }

  interface HardhatConfig {
    luxfhe: {
      logMocks: boolean;
      gasWarning: boolean;
    };
  }
}

extendConfig((config, userConfig) => {
  // Allow users to override the localluxfhe network config
  if (userConfig.networks && userConfig.networks.localluxfhe) {
    return;
  }

  // Default config
  config.networks.localluxfhe = {
    gas: "auto",
    gasMultiplier: 1.2,
    gasPrice: "auto",
    timeout: 10_000,
    httpHeaders: {},
    url: "http://127.0.0.1:42069",
    accounts: [
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
      "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    ],
  };

  // Only add Sepolia config if user hasn't defined it
  if (!userConfig.networks?.["eth-sepolia"]) {
    config.networks["eth-sepolia"] = {
      url:
        process.env.SEPOLIA_RPC_URL ||
        "https://ethereum-sepolia.publicnode.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
      gas: "auto",
      gasMultiplier: 1.2,
      gasPrice: "auto",
      timeout: 60_000,
      httpHeaders: {},
    };
  }

  // Only add Arbitrum Sepolia config if user hasn't defined it
  if (!userConfig.networks?.["arb-sepolia"]) {
    config.networks["arb-sepolia"] = {
      url:
        process.env.ARBITRUM_SEPOLIA_RPC_URL ||
        "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 421614,
      gas: "auto",
      gasMultiplier: 1.2,
      gasPrice: "auto",
      timeout: 60_000,
      httpHeaders: {},
    };
  }

  // Add luxfhe config
  config.luxfhe = {
    logMocks: userConfig.luxfhe?.logMocks ?? true,
    gasWarning: userConfig.luxfhe?.gasWarning ?? true,
  };
});

type UseFaucetArgs = {
  address?: string;
};

task(TASK_LUXFHE_USE_FAUCET, "Fund an account from the funder")
  .addOptionalParam("address", "Address to fund", undefined, types.string)
  .setAction(async ({ address }: UseFaucetArgs, hre) => {
    const { network } = hre;
    const { name: networkName } = network;

    if (networkName !== "localluxfhe") {
      console.info(
        chalk.yellow(`Programmatic faucet only supported for localluxfhe`),
      );
      return;
    }

    if (!address) {
      console.info(chalk.red(`Failed to get address to fund`));
      return;
    }

    console.info(chalk.green(`Getting funds from faucet for ${address}`));

    try {
      await localLuxFHEFundAccount(hre, address);
    } catch (e) {
      console.info(
        chalk.red(`failed to get funds from localluxfhe for ${address}: ${e}`),
      );
    }
  });

// DEPLOY TASKS

task(
  TASK_LUXFHE_MOCKS_DEPLOY,
  "Deploys the mock contracts on the Hardhat network",
)
  .addOptionalParam(
    "deployTestBed",
    "Whether to deploy the test bed",
    true,
    types.boolean,
  )
  .addOptionalParam(
    "silent",
    "Whether to suppress output",
    false,
    types.boolean,
  )
  .setAction(async ({ deployTestBed, silent }: DeployMocksArgs, hre) => {
    await deployMocks(hre, {
      deployTestBed: deployTestBed ?? true,
      gasWarning: hre.config.luxfhe.gasWarning ?? true,
      silent: silent ?? false,
    });
  });

task(TASK_TEST, "Deploy mock contracts on hardhat").setAction(
  async ({}, hre, runSuper) => {
    await deployMocks(hre, {
      deployTestBed: true,
      gasWarning: hre.config.luxfhe.gasWarning ?? true,
    });
    return runSuper();
  },
);

task(TASK_NODE, "Deploy mock contracts on hardhat").setAction(
  async ({}, hre, runSuper) => {
    await deployMocks(hre, {
      deployTestBed: true,
      gasWarning: hre.config.luxfhe.gasWarning ?? true,
    });
    return runSuper();
  },
);

// SET LOG OPS

task(TASK_LUXFHE_MOCKS_SET_LOG_OPS, "Set logging for the Mock LuxFHE contracts")
  .addParam("enable", "Whether to enable logging", false, types.boolean)
  .setAction(async ({ enable }, hre) => {
    await mock_setLoggingEnabled(hre, enable);
  });

// MOCK UTILS

export * from "./mockUtils";
export * from "./networkUtils";
export * from "./result";
export * from "./common";
export * from "./mock-logs";
export * from "./deploy-mocks";

/**
 * Runtime environment extensions for the LuxFHE Hardhat plugin.
 * Provides access to LuxFHE initialization, environment checks, and mock utilities.
 */
declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    luxfhe: {
      /**
       * Initialize `luxfhejs` using a Hardhat signer
       * @param {HardhatEthersSigner} signer - The Hardhat ethers signer to use
       * @param {HHSignerInitializationParams} params - Optional initialization parameters to be passed to `luxfhejs`
       * @returns {Promise<Result<Permit | undefined>>} The initialized LuxFHE instance
       */
      initializeWithHardhatSigner: (
        signer: HardhatEthersSigner,
        params?: HHSignerInitializationParams,
      ) => Promise<Permit | undefined>;

      /**
       * Check if a LuxFHE environment is permitted for the current network
       * @param {string} env - The environment name to check. Must be "MOCK" | "LOCAL" | "TESTNET" | "MAINNET"
       * @returns {boolean} Whether the environment is permitted
       */
      isPermittedEnvironment: (env: string) => boolean;

      /**
       * Assert that a Result type (see luxfhejs) returned from a function is successful and return its value
       * @param {Result<T>} result - The Result to check
       * @returns {T} The inner data of the Result (non null)
       */
      expectResultSuccess: <T>(
        result: Result<T> | Promise<Result<T>>,
      ) => Promise<T>;

      /**
       * Assert that a Result type (see luxfhejs) contains an error matching the partial string
       * @param {Result<T>} result - The Result to check
       * @param {string} errorPartial - The partial error string to match
       */
      expectResultError: <T>(
        result: Result<T> | Promise<Result<T>>,
        errorPartial: string,
      ) => Promise<void>;

      /**
       * Assert that a Result type (see luxfhejs) contains a specific value
       * @param {Result<T>} result - The Result to check
       * @param {T} value - The inner data of the Result (non null)
       */
      expectResultValue: <T>(
        result: Result<T> | Promise<Result<T>>,
        value: T,
      ) => Promise<T>;

      /**
       * Assert that a Result type (see luxfhejs) contains a value matching the partial object
       * @param {Result<T>} result - The Result to check
       * @param {Partial<T>} partial - The partial object to match against
       * @returns {T} The inner data of the Result (non null)
       */
      expectResultPartialValue: <T>(
        result: Result<T> | Promise<Result<T>>,
        partial: Partial<T>,
      ) => Promise<T>;

      mocks: {
        /**
         * **[MOCKS ONLY]**
         *
         * Execute a block of code with LuxFHE mock contracts logging enabled.
         *
         * _(If logging only a function, we recommend passing the function name as the closureName (ex "counter.increment()"))_
         *
         * Expected output:
         * ```
         * ┌──────────────────┬──────────────────────────────────────────────────
         * │ [LUXFHE-MOCKS]   │ "counter.increment()" logs:
         * ├──────────────────┴──────────────────────────────────────────────────
         * ├ FHE.add          | euint32(4473..3424)[0] + euint32(1157..3648)[1]  =>  euint32(1106..1872)[1]
         * ├ FHE.allowThis    | euint32(1106..1872)[1] -> 0x663f..6602
         * ├ FHE.allow        | euint32(1106..1872)[1] -> 0x3c44..93bc
         * └─────────────────────────────────────────────────────────────────────
         * ```
         * @param {string} closureName - Name of the code block to log within
         * @param {() => Promise<void>} closure - The async function to execute
         */
        withLogs: (
          closureName: string,
          closure: () => Promise<void>,
        ) => Promise<void>;

        /**
         * **[MOCKS ONLY]**
         *
         * Enable logging from LuxFHE mock contracts
         * @param {string} closureName - Optional name of the code block to enable logging for
         */
        enableLogs: (closureName?: string) => Promise<void>;

        /**
         * **[MOCKS ONLY]**
         *
         * Disable logging from LuxFHE mock contracts
         */
        disableLogs: () => Promise<void>;

        /**
         * **[MOCKS ONLY]**
         *
         * Deploy the LuxFHE mock contracts (normally this is done automatically)
         * @param {DeployMocksArgs} options - Deployment options
         */
        deployMocks: (options: DeployMocksArgs) => Promise<void>;

        /**
         * **[MOCKS ONLY]**
         *
         * Get the plaintext value for a ciphertext hash
         * @param {bigint} ctHash - The ciphertext hash to look up
         * @returns {Promise<bigint>} The plaintext value
         */
        getPlaintext: (ctHash: bigint) => Promise<bigint>;

        /**
         * **[MOCKS ONLY]**
         *
         * Assert that a ciphertext hash represents an expected plaintext value
         * @param {bigint} ctHash - The ciphertext hash to check
         * @param {bigint} expectedValue - The expected plaintext value
         */
        expectPlaintext: (
          ctHash: bigint,
          expectedValue: bigint,
        ) => Promise<void>;
      };
    };
  }
}

extendConfig((config) => {
  config.luxfhe = config.luxfhe || {};
});

extendEnvironment((hre) => {
  hre.luxfhe = {
    initializeWithHardhatSigner: async (
      signer: HardhatEthersSigner,
      params?: HHSignerInitializationParams,
    ) => {
      return luxfhe_initializeWithHardhatSigner(hre, signer, params);
    },
    isPermittedEnvironment: (env: string) => {
      return isPermittedLuxFHEEnvironment(hre, env);
    },
    expectResultSuccess: async <T>(result: Result<T> | Promise<Result<T>>) => {
      const awaitedResult = await result;
      return expectResultSuccess(awaitedResult);
    },
    expectResultError: async <T>(
      result: Result<T> | Promise<Result<T>>,
      errorPartial: string,
    ) => {
      const awaitedResult = await result;
      return expectResultError(awaitedResult, errorPartial);
    },
    expectResultValue: async <T>(
      result: Result<T> | Promise<Result<T>>,
      value: T,
    ) => {
      const awaitedResult = await result;
      return expectResultValue(awaitedResult, value);
    },
    expectResultPartialValue: async <T>(
      result: Result<T> | Promise<Result<T>>,
      partial: Partial<T>,
    ) => {
      const awaitedResult = await result;
      return expectResultPartialValue(awaitedResult, partial);
    },
    mocks: {
      withLogs: async (closureName: string, closure: () => Promise<void>) => {
        return mock_withLogs(hre, closureName, closure);
      },
      enableLogs: async (closureName?: string) => {
        return mock_setLoggingEnabled(hre, true, closureName);
      },
      disableLogs: async () => {
        return mock_setLoggingEnabled(hre, false);
      },
      deployMocks: async (options: DeployMocksArgs) => {
        return deployMocks(hre, options);
      },
      getPlaintext: async (ctHash: bigint) => {
        const [signer] = await hre.ethers.getSigners();
        return mock_getPlaintext(signer.provider, ctHash);
      },
      expectPlaintext: async (ctHash: bigint, expectedValue: bigint) => {
        const [signer] = await hre.ethers.getSigners();
        return mock_expectPlaintext(signer.provider, ctHash, expectedValue);
      },
    },
  };
});
