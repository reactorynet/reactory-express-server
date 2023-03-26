
export const REACTORY_KNOWN_MODEL_MAP: Reactory.Models.ReactoryKnownModelMap = {
  User: "User",
  BusinessUnit: "BusinessUnit",
  Organization: "Organization",
  ReactoryModelMeta: "ReactoryModelMeta",
  Team: "Team"
}

export const REACTORY_KNOWN_MODEL_ARRAY: Reactory.Models.ReactoryKnownModels = Object.keys(REACTORY_KNOWN_MODEL_MAP).map( p => REACTORY_KNOWN_MODEL_MAP[p]);