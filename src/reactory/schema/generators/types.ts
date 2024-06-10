

export interface ReactoryFormGenerator {
  id: string,
  generate(props: any): Promise<Reactory.Forms.IReactoryForm[]>
}