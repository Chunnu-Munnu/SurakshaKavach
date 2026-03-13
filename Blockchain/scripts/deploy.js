const { ethers, run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const AnomalyLogFactory = await ethers.getContractFactory("AnomalyLog");
    console.log("Deploying AnomalyLog...");
    const anomalyLog = await AnomalyLogFactory.deploy();
    await anomalyLog.deployed();
    console.log(`AnomalyLog deployed to: ${anomalyLog.address}`);

    const outDir = path.resolve(__dirname, "../../backend");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    
    fs.writeFileSync(
        path.join(outDir, "contract-address.json"),
        JSON.stringify({
            address: anomalyLog.address,
            network: network.name,
            chainId: network.config.chainId,
            updatedAt: new Date().toISOString()
        }, null, 2)
    );
    console.log("Contract address saved to backend/contract-address.json");

    if (network.config.chainId === 11155111 && process.env.ETHERSCAN_API_KEY) {
        await anomalyLog.deployTransaction.wait(6);
        try {
            await run("verify:verify", { 
                address: anomalyLog.address, 
                constructorArguments: [] 
            });
        } catch(e) { console.log(e.message); }
    }
}

main().then(() => process.exit(0)).catch(e => { 
    console.error(e); process.exit(1); 
});

