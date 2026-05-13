import app from '../index';

describe('Application Module', () => {
  describe('exports', () => {
    it('should export Admin', () => {
      expect(app.Admin).toBeDefined();
    });
  });
});