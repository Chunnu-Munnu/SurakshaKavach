// SPDX-License-Identifier: MIT
pragma solidity 0.8.8;

contract AnomalyLog {
    struct AnomalyEvent {
        uint256 id;
        uint256 timestamp;
        string deviceId;
        string deviceClass;
        uint8 severity;        // 0=HEALTHY 1=DRIFTING 2=SUSPICIOUS 3=CRITICAL
        uint256 trustScore;    // 0-100
        string topFeature;
        string actionTaken;
        bytes32 dataHash;
    }

    AnomalyEvent[] private _events;
    mapping(bytes32 => uint256[]) private _deviceToEventIds;

    event AnomalyLogged(
        uint256 indexed id,
        string deviceId,
        string deviceClass,
        uint8 severity,
        uint256 trustScore,
        string topFeature,
        string actionTaken,
        bytes32 dataHash,
        uint256 timestamp
    );

    function logAnomaly(
        string memory deviceId,
        string memory deviceClass,
        uint8 severity,
        uint256 trustScore,
        string memory topFeature,
        string memory actionTaken
    ) public returns (uint256 logId) {
        bytes32 dataHash = keccak256(abi.encode(
            deviceId, deviceClass, severity, 
            trustScore, topFeature, actionTaken
        ));
        logId = _events.length;
        _events.push(AnomalyEvent({
            id: logId,
            timestamp: block.timestamp,
            deviceId: deviceId,
            deviceClass: deviceClass,
            severity: severity,
            trustScore: trustScore,
            topFeature: topFeature,
            actionTaken: actionTaken,
            dataHash: dataHash
        }));
        bytes32 deviceKey = keccak256(abi.encodePacked(deviceId));
        _deviceToEventIds[deviceKey].push(logId);
        emit AnomalyLogged(logId, deviceId, deviceClass, severity,
            trustScore, topFeature, actionTaken, dataHash, block.timestamp);
    }

    function getDeviceLogs(string memory deviceId) 
        public view returns (AnomalyEvent[] memory) {
        bytes32 deviceKey = keccak256(abi.encodePacked(deviceId));
        uint256[] storage ids = _deviceToEventIds[deviceKey];
        AnomalyEvent[] memory result = new AnomalyEvent[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = _events[ids[i]];
        }
        return result;
    }

    function getTotalLogs() public view returns (uint256) {
        return _events.length;
    }

    function getRecentLogs(uint256 n) 
        public view returns (AnomalyEvent[] memory) {
        uint256 total = _events.length;
        if (n > total) n = total;
        AnomalyEvent[] memory result = new AnomalyEvent[](n);
        uint256 start = total - n;
        for (uint256 i = 0; i < n; i++) {
            result[i] = _events[start + i];
        }
        return result;
    }
}

