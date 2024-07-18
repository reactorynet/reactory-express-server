import { fileAsString } from "@reactory/server-core/utils/io";

const apiStatusQuery = fileAsString(__dirname + "/apiStatus.graphql");

export default {
  apiStatusQuery
};