import { keyable, StoredMicroservice, StoredPod } from "../../types";
import database from "../../lib/database"

export default async function (microserviceList: keyable<StoredMicroservice>) {
    const pods: keyable<StoredPod> = database.pod.getAll()
    const desiredPodsToNodesMapping: keyable<string> = {}

    for (let [msName, storedMs] of Object.entries(microserviceList)) {
        storedMs.currentPodNames.map(podName => desiredPodsToNodesMapping[podName] = msName)
    }

    const desiredPodsNames = Object.keys(desiredPodsToNodesMapping)
    const actualPodNames = Object.keys(pods)

    const podsToCreate = desiredPodsNames.filter(name => !actualPodNames.includes(name))
    const podsToDelete = actualPodNames.filter(name => !desiredPodsNames.includes(name))

    for (let podName of podsToCreate) {
        const microservice: StoredMicroservice = await database.microservice.get(desiredPodsToNodesMapping[podName])

        const newPod: StoredPod = {
            name: podName,
            parentName: 'microservice/' + microservice.currentConfig.name,
            containers: [],
        }

        for (let containerName in microservice.currentConfig.containers) {
            const container = microservice.currentConfig.containers[containerName]
            newPod.containers.push({
                name: containerName,
                image: container.image,
                memLimit: container.memLimit,
                cpus: container.cpus,
                env: container.env,
                httpPorts: container.httpPorts,
            })
        }

        await database.pod.update(podName, newPod)

    }
}