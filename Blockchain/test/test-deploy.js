const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AnomalyLog", function() {
    let anomalyLog;
    beforeEach(async function() {
        const AnomalyLog = await ethers.getContractFactory("AnomalyLog");
        anomalyLog = await AnomalyLog.deploy();
        await anomalyLog.deployed();
    });
    it("logs an anomaly and retrieves it", async function() {
        await anomalyLog.logAnomaly(
            "cam-01", "camera", 3, 15, "dns_frequency", "ISOLATE"
        );
        expect(await anomalyLog.getTotalLogs()).to.equal(1);
        const logs = await anomalyLog.getDeviceLogs("cam-01");
        expect(logs[0].deviceId).to.equal("cam-01");
        expect(logs[0].severity).to.equal(3);
    });
    it("returns recent N logs", async function() {
        await anomalyLog.logAnomaly("cam-01","camera",1,72,"beacon_interval","MONITOR");
        await anomalyLog.logAnomaly("cam-02","camera",3,18,"dns_frequency","ISOLATE");
        const recent = await anomalyLog.getRecentLogs(1);
        expect(recent[0].deviceId).to.equal("cam-02");
    });
});

