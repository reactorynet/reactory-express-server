import { Reactory } from "types/reactory";

export interface ReactoryFormGenerator {
  id: string,
  generate(props: any): Promise<Reactory.IReactoryForm[]>
}