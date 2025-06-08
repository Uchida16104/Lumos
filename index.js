#!/usr/bin/env node

const readline = require("readline");

class BreakException {}
class ContinueException {}

const vars = {};
const functions = {};
const history = [];

function evaluateExpression(expr) {
  try {
    return Function(...Object.keys(vars), `return (${expr})`)(...Object.values(vars));
  } catch (e) {
    throw new Error("Invalid expression: " + expr);
  }
}

function preprocessCommand(command) {
  command = command.replace(/\r\n/g, "\n");

  const timesRegex = /^(\d+)\.times\s+do\s+\|([a-zA-Z_][a-zA-Z0-9_]*)\|([\s\S]+?)end$/;
  const timesMatch = command.match(timesRegex);
  if (timesMatch) {
    const count = parseInt(timesMatch[1]);
    const varName = timesMatch[2];
    const body = timesMatch[3].trim();
    let result = "";
    for (let i = 0; i < count; i++) {
      vars[varName] = i;
      result += interpret(body) + "\n";
    }
    return result.trim();
  }

  const ifElseRegex = /^if\s*\((.+?)\)\s*\{([\s\S]+?)\}(?:\s*elsif\s*\((.+?)\)\s*\{([\s\S]+?)\})?(?:\s*else\s*\{([\s\S]+?)\})?$/;
  const ifElseMatch = command.match(ifElseRegex);
  if (ifElseMatch) {
    const [, cond1, body1, cond2, body2, body3] = ifElseMatch;
    if (evaluateExpression(cond1)) return interpret(body1.trim());
    if (cond2 && evaluateExpression(cond2)) return interpret(body2.trim());
    if (body3) return interpret(body3.trim());
    return "If condition was false.";
  }

  return null;
}

function interpret(command) {
  const preprocessed = preprocessCommand(command);
  if (preprocessed !== null) return preprocessed;

  command = command.trim();

  if (/^let\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/.test(command)) {
    const [, name, value] = command.match(/^let\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
    vars[name] = evaluateExpression(value);
    return `${name} = ${vars[name]}`;
  }

  if (/^def\s+([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\)\s*\{([\s\S]*)\}$/.test(command)) {
    const [, name, args, body] = command.match(/^def\s+([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\)\s*\{([\s\S]*)\}$/);
    functions[name] = {
      args: args.split(",").map((s) => s.trim()).filter((s) => s),
      body: body.trim(),
    };
    return `Function ${name} defined.`;
  }

  if (/^([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/.test(command)) {
    const [, name, argstr] = command.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/);
    if (!functions[name]) throw new Error("Undefined function: " + name);
    const func = functions[name];
    const argValues = argstr.split(",").map((s) => evaluateExpression(s.trim()));
    const localVars = {};
    func.args.forEach((arg, i) => (localVars[arg] = argValues[i]));

    const prevVars = Object.assign({}, vars);
    Object.assign(vars, localVars);

    let result;
    try {
      result = interpret(func.body);
    } finally {
      Object.assign(vars, prevVars);
    }
    return result;
  }

  let loopMatch = command.match(/^for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+?)\s+to\s+(.+?)\s*\{([\s\S]+)\}$/);
  if (loopMatch) {
    const vname = loopMatch[1];
    const start = evaluateExpression(loopMatch[2]);
    const end = evaluateExpression(loopMatch[3]);
    const body = loopMatch[4];

    for (let i = start; i <= end; i++) {
      vars[vname] = i;
      try {
        interpret(body.trim());
      } catch (e) {
        if (e instanceof BreakException) break;
        if (e instanceof ContinueException) continue;
        throw e;
      }
    }
    return `Looped ${vname} from ${start} to ${end}`;
  }

  let whileMatch = command.match(/^while\s*\((.+?)\)\s*\{([\s\S]+)\}$/);
  if (whileMatch) {
    const condition = whileMatch[1];
    const body = whileMatch[2];

    while (evaluateExpression(condition)) {
      try {
        interpret(body.trim());
      } catch (e) {
        if (e instanceof BreakException) break;
        if (e instanceof ContinueException) continue;
        throw e;
      }
    }
    return "While loop executed.";
  }

  if (command === "break") throw new BreakException();
  if (command === "continue") throw new ContinueException();

  return evaluateExpression(command);
}

console.log("Welcome to Lumos CLI");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: ">>> ",
});

rl.prompt();

rl.on("line", (line) => {
  const command = line.trim();
  if (command === "") return rl.prompt();

  history.push(command);
  try {
    const result = interpret(command);
    console.log("> " + result);
  } catch (err) {
    console.error("! " + err.message);
  }
  rl.prompt();
});
