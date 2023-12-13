import { promises as fs } from 'fs';

export const inFile = async (path: string): Promise<string> => {
  try {
    const data = await fs.readFile(path.trim(), 'utf-8');
    const mime = path.split('.').pop() || 'txt';
    return `
    \`\`\`${mime}
    ${data.toString()}
    \`\`\`
    `;
  } catch (err) {
    console.error(`Error reading file at ${path}:`, err);
    return '';
  }
};

const CODE_BLOCK_REGEX = /```(.+?)\n([\s\S]+?)\n```/g;

export const outFile = async (args: string[]) => {
  const [ path, content ] = args;
  try {
    // Extract code blocks from content using regex
    const codeBlockRegex = /```([\s\S]*?)```/g;
    let match;
    let codeBlocks = '';

    while ((match = codeBlockRegex.exec(content)) !== null) {
      codeBlocks += match[1] + '\n';
    }
    await fs.writeFile(path.trim(), codeBlocks.trim(), 'utf-8');
    return `File was written successfully at ${path.trim()}`;
  } catch (err) {
    console.error(`Error writing to file at ${path}:`, err);
    return '';
  }
}
