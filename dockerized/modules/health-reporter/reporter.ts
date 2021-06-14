
import reportNodeHealth from "./reportNodeHealth"
import onContainerStatusChanged from "./onContainerStatusChanged"
import { NODE_HEALTH_INTERVAL } from "../../config"
import database from "../../lib/database"
import { StoredContainerStatus } from "../../definitions"

async function start(): Promise<void> {
    setInterval(reportNodeHealth, NODE_HEALTH_INTERVAL)
    onContainerStatusChanged(function (podStatus: StoredContainerStatus) {
        database.setWithDelay(`podHealth/${podStatus.podName}/${podStatus.containerName}`, podStatus)
    })
}

export default { start }

if (require.main === module) {
    start();
}
