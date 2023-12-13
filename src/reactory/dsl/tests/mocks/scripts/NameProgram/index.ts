import { fileAsString } from "@reactory/server-core/utils/io";

const VariableDeclarationScript = fileAsString(require.resolve('./01 VariableDeclaration.rxs'));
const PrintHelloWorld = fileAsString(require.resolve('./02 PrintHelloWorld.rxs'));
const PrintNameVariable = fileAsString(require.resolve('./03 PrintNameVariable.rxs'));
const PrintNameAndHelloWorld = fileAsString(require.resolve('./04 PrintNameAndHelloWorld.rxs'));
const PrintNameAndNumbers = fileAsString(require.resolve('./05 PrintNameAndNumbers.rxs'));
const PrintNameConditionally = fileAsString(require.resolve('./06 PrintNameConditionally.rxs'));
const PrintNameWithStringInterpolation = fileAsString(require.resolve('./07 PrintNameWithStringInterpolation.rxs'));
const PrintNameConditionallyMultiLine = fileAsString(require.resolve('./08 PrintNameConditionallyMultiLine.rxs'));
const PrintNameInWhileLoop = fileAsString(require.resolve('./09 PrintNameInWhileLoop.rxs'));
const PrintNameInForLoop = fileAsString(require.resolve('./10 PrintNameInForLoop.rxs'));
const AskForNameInput = fileAsString(require.resolve('./11 AskForNameInput.rxs'));
const SearchForName = fileAsString(require.resolve('./12 SearchForName.rxs'));
const DisplayResults = fileAsString(require.resolve('./13 DisplayResults.rxs'));

export default {
  _01_VariableDeclaration: VariableDeclarationScript,
  _02_PrintHelloWorld: PrintHelloWorld,
  _03_PrintNameVariable: PrintNameVariable,
  _04_PrintNameAndHelloWorld: PrintNameAndHelloWorld,
  _05_PrintNameAndNumbers: PrintNameAndNumbers,
  _06_PrintNameConditionally: PrintNameConditionally,
  _07_PrintNameWithStringInterpolation: PrintNameWithStringInterpolation,
  _08_PrintNameConditionallyMultiLine: PrintNameConditionallyMultiLine,
  _09_PrintNameInWhileLoop: PrintNameInWhileLoop,
  _10_PrintNameInForLoop: PrintNameInForLoop,
  _11_AskForNameInput: AskForNameInput,
  _12_SearchForName: SearchForName,
  _13_DisplayResults: DisplayResults
};