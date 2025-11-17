import { IReactoryContext } from "@reactory/server-core/types/ReactoryContext";
import createMockContext from "./context/MockContext";

/**
 * Mock ReactoryContextProvider for DSL Tests
 * 
 * This provides a mock implementation of the ReactoryContextProvider
 * to avoid environment dependencies in DSL tests.
 */

class MockReactoryContextProvider {
  private static instance: MockReactoryContextProvider;
  private context: IReactoryContext;

  private constructor() {
    this.context = createMockContext();
  }

  static getInstance(): MockReactoryContextProvider {
    if (!MockReactoryContextProvider.instance) {
      MockReactoryContextProvider.instance = new MockReactoryContextProvider();
    }
    return MockReactoryContextProvider.instance;
  }

  getContext(): IReactoryContext {
    return this.context;
  }

  createContext(options?: any): IReactoryContext {
    return createMockContext();
  }

  // Mock methods that might be called
  async initialize(): Promise<void> {
    // Mock initialization
  }

  async cleanup(): Promise<void> {
    // Mock cleanup
  }
}

export default MockReactoryContextProvider; 