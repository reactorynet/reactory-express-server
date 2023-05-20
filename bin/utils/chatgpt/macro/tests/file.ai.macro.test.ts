import * as fs from 'fs-extra';
import { inFile, outFile } from '../file.ai.macro';

describe('file utilities', () => {
  describe('inFile', () => {
    test('returns the contents of a file as a string, formatted with backticks', async () => {
      const expectedString = `
      \`\`\`txt
      contents of file
      \`\`\`
      `.trim();

      const filePath = '/path/to/file';
      const mockFileContents = 'contents of file';
      jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from(mockFileContents));
      const result = await inFile(filePath);
      expect(result.trim()).toEqual(expectedString);
    });
  });

  describe('outFile', () => {
    test('writes a string to a file, formatted without backticks', async () => {
      const filePath = `${process.env.APP_DATA_ROOT}/tmp/test-file-${Date.now()}.txt`;
      const mockString = 'string to write to file';
      jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
      await outFile([filePath, mockString]);
      const fileContents = await fs.readFile(filePath, 'utf-8');
      expect(fileContents.trim()).toEqual(mockString);
    });
  });
});