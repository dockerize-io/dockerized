import express from 'express';
import { assert, create } from 'superstruct'
import { AppUpdate, ScaleCheck } from "../validators"
import stackDeploy from '../../lib/docker/stackDeploy';
import { updateStack as updateStackInDatabase, getStack } from "../../lib/database"
import yaml from "js-yaml"
import logger from '../../lib/logger';
import { DockerStack } from '../../types';
export default async function (req: express.Request, res: express.Response) {
    const validatedBody = create(req.body, AppUpdate)
    assert(validatedBody.scale, ScaleCheck)

    await updateStackInDatabase(validatedBody.team, function (stack: DockerStack): DockerStack {
        stack.services[validatedBody.name] = {
            image: validatedBody.image,
            networks: {
                [validatedBody.team]: {
                    aliases: [`${validatedBody.team}--${validatedBody.team}`]
                }
            },
            deploy: { replicas: validatedBody.scale },
        }

        const internetPort = validatedBody.internetPort || 80

        if (validatedBody.internetDomain) {
            stack.services[validatedBody.name].networks["caddy"] = {
                aliases: [`${validatedBody.team}--${validatedBody.team}`]
            }
            stack.services[validatedBody.name].labels = {
                "caddy": validatedBody.internetDomain,
                "caddy.reverse_proxy": `{{upstreams ${internetPort}}}`,
            }
        }

        return stack
    })

    const stack = await getStack(validatedBody.team)
    logger.debug("Deploing stack", yaml.dump(stack))

    await stackDeploy(yaml.dump(stack), validatedBody.team)

    return res.send({
        success: true,
        debug: validatedBody
    })
}