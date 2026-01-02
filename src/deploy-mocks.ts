import {
  checkNetworkAndSkip,
  hardhatSetCode,
  logDeployment,
  logEmpty,
  logError,
  logSuccess,
  logWarning,
} from "./utils";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  FHE_NETWORK_ADDRESS,
  ZK_VERIFIER_ADDRESS,
  QUERY_DECRYPTER_ADDRESS,
  TEST_BED_ADDRESS,
} from "./addresses";
import { Contract } from "ethers";
import { compileMockContractPaths } from "./compile-mock-contracts";
import chalk from "chalk";
import { MOCK_ZK_VERIFIER_SIGNER_ADDRESS } from "./const";

// Deploy

const deployMockFHENetwork = async (hre: HardhatRuntimeEnvironment) => {
  const [signer] = await hre.ethers.getSigners();

  // Deploy MockFHENetwork (contract still named TaskManager in Solidity)
  const FHENetworkArtifact = await hre.artifacts.readArtifact("TaskManager");
  await hardhatSetCode(
    hre,
    FHE_NETWORK_ADDRESS,
    FHENetworkArtifact.deployedBytecode,
  );
  const fheNetwork = await hre.ethers.getContractAt(
    "TaskManager",
    FHE_NETWORK_ADDRESS,
  );

  // Initialize MockFHENetwork
  const initTx = await fheNetwork.initialize(signer.address);
  await initTx.wait();

  // Check if MockFHENetwork exists
  const networkExists = await fheNetwork.exists();
  if (!networkExists) {
    throw new Error("MockFHENetwork does not exist");
  }

  return fheNetwork;
};

const deployMockACL = async (hre: HardhatRuntimeEnvironment) => {
  // Get Signer
  const [signer] = await hre.ethers.getSigners();

  // Deploy ACL implementation
  const aclFactory = await hre.ethers.getContractFactory("ACL");
  const acl = await aclFactory.deploy(signer.address);
  await acl.waitForDeployment();

  // Check if ACL exists
  const exists = await acl.exists();
  if (!exists) {
    logError("ACL does not exist", 2);
    throw new Error("ACL does not exist");
  }

  return acl;
};

const deployMockZkVerifier = async (hre: HardhatRuntimeEnvironment) => {
  const zkVerifierArtifact = await hre.artifacts.readArtifact("MockZkVerifier");
  await hardhatSetCode(
    hre,
    ZK_VERIFIER_ADDRESS,
    zkVerifierArtifact.deployedBytecode,
  );
  const zkVerifier = await hre.ethers.getContractAt(
    "MockZkVerifier",
    ZK_VERIFIER_ADDRESS,
  );

  const zkVerifierExists = await zkVerifier.exists();
  if (!zkVerifierExists) {
    logError("MockZkVerifier does not exist", 2);
    throw new Error("MockZkVerifier does not exist");
  }

  return zkVerifier;
};

const deployMockQueryDecrypter = async (
  hre: HardhatRuntimeEnvironment,
  acl: Contract,
) => {
  const queryDecrypterArtifact = await hre.artifacts.readArtifact(
    "MockQueryDecrypter",
  );
  await hardhatSetCode(
    hre,
    QUERY_DECRYPTER_ADDRESS,
    queryDecrypterArtifact.deployedBytecode,
  );
  const queryDecrypter = await hre.ethers.getContractAt(
    "MockQueryDecrypter",
    QUERY_DECRYPTER_ADDRESS,
  );

  // Initialize MockQueryDecrypter
  const initTx = await queryDecrypter.initialize(
    FHE_NETWORK_ADDRESS,
    await acl.getAddress(),
  );
  await initTx.wait();

  // Check if MockQueryDecrypter exists
  const queryDecrypterExists = await queryDecrypter.exists();
  if (!queryDecrypterExists) {
    logError("MockQueryDecrypter does not exist", 2);
    throw new Error("MockQueryDecrypter does not exist");
  }

  return queryDecrypter;
};

const deployTestBedContract = async (hre: HardhatRuntimeEnvironment) => {
  const testBedFactory = await hre.artifacts.readArtifact("TestBed");
  await hardhatSetCode(hre, TEST_BED_ADDRESS, testBedFactory.deployedBytecode);
  const testBed = await hre.ethers.getContractAt("TestBed", TEST_BED_ADDRESS);
  await testBed.waitForDeployment();
  return testBed;
};

// Funding

const fundZkVerifierSigner = async (hre: HardhatRuntimeEnvironment) => {
  const zkVerifierSigner = await hre.ethers.getSigner(
    MOCK_ZK_VERIFIER_SIGNER_ADDRESS,
  );
  await hre.network.provider.send("hardhat_setBalance", [
    zkVerifierSigner.address,
    "0x" + hre.ethers.parseEther("10").toString(16),
  ]);
};

// Initializations

const setFHENetworkACL = async (fheNetwork: Contract, acl: Contract) => {
  const setAclTx = await fheNetwork.setACLContract(await acl.getAddress());
  await setAclTx.wait();
};

export type DeployMocksArgs = {
  deployTestBed?: boolean;
  gasWarning?: boolean;
  silent?: boolean;
};

export const deployMocks = async (
  hre: HardhatRuntimeEnvironment,
  options: DeployMocksArgs = {
    deployTestBed: true,
    gasWarning: true,
    silent: false,
  },
) => {
  // Check if network is Hardhat, if not log skip message and return
  const isHardhat = await checkNetworkAndSkip(hre);
  if (!isHardhat) return;

  const logEmptyIfNoisy = () => {
    if (!options.silent) {
      logEmpty();
    }
  };
  const logSuccessIfNoisy = (message: string, indent = 0) => {
    if (!options.silent) {
      logSuccess(message, indent);
    }
  };
  const logDeploymentIfNoisy = (contractName: string, address: string) => {
    if (!options.silent) {
      logDeployment(contractName, address);
    }
  };
  const logWarningIfNoisy = (message: string, indent = 0) => {
    if (!options.silent) {
      logWarning(message, indent);
    }
  };

  // Log start message
  logEmptyIfNoisy();
  logSuccessIfNoisy(chalk.bold("luxfhe-hardhat-plugin :: deploy mocks"), 0);
  logEmptyIfNoisy();

  // Compile mock contracts
  await compileMockContractPaths(hre);
  logEmptyIfNoisy();
  logSuccessIfNoisy("Mock contracts compiled", 1);

  // Deploy mock contracts
  const fheNetwork = await deployMockFHENetwork(hre);
  logDeploymentIfNoisy("MockFHENetwork", await fheNetwork.getAddress());

  const acl = await deployMockACL(hre);
  logDeploymentIfNoisy("MockACL", await acl.getAddress());

  await setFHENetworkACL(fheNetwork, acl);
  logSuccessIfNoisy("ACL address set in FHENetwork", 2);

  await fundZkVerifierSigner(hre);
  logSuccessIfNoisy(
    `ZkVerifier signer (${MOCK_ZK_VERIFIER_SIGNER_ADDRESS}) funded`,
    1,
  );

  const zkVerifierSignerBalance = await hre.ethers.provider.getBalance(
    MOCK_ZK_VERIFIER_SIGNER_ADDRESS,
  );
  logSuccessIfNoisy(`ETH balance: ${zkVerifierSignerBalance.toString()}`, 2);

  const zkVerifier = await deployMockZkVerifier(hre);
  logDeploymentIfNoisy("MockZkVerifier", await zkVerifier.getAddress());

  const queryDecrypter = await deployMockQueryDecrypter(hre, acl);
  logDeploymentIfNoisy("MockQueryDecrypter", await queryDecrypter.getAddress());

  if (options.deployTestBed) {
    logSuccessIfNoisy("TestBed deployment enabled", 2);
    const testBed = await deployTestBedContract(hre);
    logDeploymentIfNoisy("TestBed", await testBed.getAddress());
  }

  // Log success message
  logEmptyIfNoisy();
  logSuccessIfNoisy(
    chalk.bold("luxfhe-hardhat-plugin :: mocks deployed successfully"),
    0,
  );

  // Log warning about mocks increased gas costs
  if (options.gasWarning) {
    logEmptyIfNoisy();
    logWarningIfNoisy(
      "When using mocks, FHE operations (eg FHE.add / FHE.mul) report a higher gas price due to additional on-chain mocking logic. Deploy your contracts on a testnet chain to check the true gas costs.\n(Disable this warning by setting 'luxfhe.gasWarning' to false in your hardhat config",
      0,
    );
  }

  logEmptyIfNoisy();
};
