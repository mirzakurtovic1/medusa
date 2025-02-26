import {
  Logger,
  MedusaContainer,
  MODULE_RESOURCE_TYPE,
  MODULE_SCOPE,
  ModulesSdkTypes,
} from "@medusajs/types"
import { asValue } from "awilix"
import { PostgreSqlDriver, SqlEntityManager } from "@mikro-orm/postgresql"
import { ContainerRegistrationKeys, MedusaError } from "../../common"
import { loadDatabaseConfig } from "../load-module-database-config"
import { mikroOrmCreateConnection } from "../../dal"

export async function mikroOrmConnectionLoader({
  container,
  options,
  moduleDeclaration,
  entities,
}: {
  entities: any[]
  container: MedusaContainer
  options?:
    | ModulesSdkTypes.ModuleServiceInitializeOptions
    | ModulesSdkTypes.ModuleServiceInitializeCustomDataLayerOptions
  moduleDeclaration?: ModulesSdkTypes.InternalModuleDeclaration
  logger?: Logger
}) {
  let manager = (
    options as ModulesSdkTypes.ModuleServiceInitializeCustomDataLayerOptions
  )?.manager

  // Custom manager provided
  if (manager) {
    container.register({
      manager: asValue(manager),
    })
    return
  }

  if (
    moduleDeclaration?.scope === MODULE_SCOPE.INTERNAL &&
    moduleDeclaration.resources === MODULE_RESOURCE_TYPE.SHARED
  ) {
    return await loadShared({ container, entities })
  }

  /**
   * Reuse an existing connection if it is passed in the options
   */
  let dbConfig
  const shouldSwallowError = !!(
    options as ModulesSdkTypes.ModuleServiceInitializeOptions
  )?.database.connection
  dbConfig = {
    ...loadDatabaseConfig(
      "product",
      (options ?? {}) as ModulesSdkTypes.ModuleServiceInitializeOptions,
      shouldSwallowError
    ),
    connection: (options as ModulesSdkTypes.ModuleServiceInitializeOptions)
      ?.database.connection,
  }

  manager ??= await loadDefault({
    database: dbConfig,
    entities,
  })

  container.register({
    manager: asValue(manager),
  })
}

async function loadDefault({
  database,
  entities,
}): Promise<SqlEntityManager<PostgreSqlDriver>> {
  if (!database) {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      `Database config is not present at module config "options.database"`
    )
  }

  const orm = await mikroOrmCreateConnection(database, entities)

  return orm.em.fork()
}

async function loadShared({ container, entities }) {
  const sharedConnection = container.resolve(
    ContainerRegistrationKeys.PG_CONNECTION,
    {
      allowUnregistered: true,
    }
  )
  if (!sharedConnection) {
    throw new Error(
      "The module is setup to use a shared resources but no shared connection is present. A new connection will be created"
    )
  }

  const manager = await loadDefault({
    entities,
    database: {
      connection: sharedConnection,
    },
  })
  container.register({
    manager: asValue(manager),
  })
}
