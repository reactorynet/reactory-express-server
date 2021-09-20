import { Reactory } from "@reactory/server-core/types/reactory";

export interface ReactoryFormGenerator {
  id: string,
  generate(props: any): Promise<Reactory.IReactoryForm[]>
}