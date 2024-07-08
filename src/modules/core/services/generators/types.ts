

export interface ReactoryFormGenerator extends Reactory.IComponentFqnDefinition {
  id: string,
  generate(props: any): Promise<Reactory.Forms.IReactoryForm[]>
}