#!/usr/bin/env node

const fs = require("fs");
const readline = require("readline");

const vars = {};
const functions = {};

function evaluateExpression(expr, scope = vars) {
  expr = expr.trim();
  if (/^".*"$/.test(expr)) return expr.slice(1, -1);
  if (expr in scope) return scope[expr];
  if (!isNaN(expr)) return Number(expr);

  let m;

  if ((m = expr.match(/^(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)$/))) {
    const a = evaluateExpression(m[1], scope);
    const b = evaluateExpression(m[3], scope);
    switch (m[2]) {
      case "==": return a == b;
      case "!=": return a != b;
      case "<=": return a <= b;
      case ">=": return a >= b;
      case "<":  return a < b;
      case ">":  return a > b;
    }
  }

  if ((m = expr.match(/^(.+?)\s*([+\-*/%])\s*(.+)$/))) {
    const a = evaluateExpression(m[1], scope);
    const b = evaluateExpression(m[3], scope);
    switch (m[2]) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return a / b;
      case "%": return a % b;
    }
  }

  throw new Error("Invalid expression: " + expr);
}

function interpret(cmd) {
  let m;

  if ((m = cmd.match(/^let\s+(\w+)\s*=\s*(.+)$/))) {
    const name = m[1], value = evaluateExpression(m[2]);
    vars[name] = value;
    return `${name} = ${value}`;
  }

  if ((m = cmd.match(/^def\s+(\w+)\(([^)]*)\)\s*{([\s\S]+)}$/))) {
    const name = m[1];
    const params = m[2].split(",").map(s => s.trim()).filter(Boolean);
    const body = m[3].trim();
    functions[name] = { params, body };
    return `Function ${name} defined.`;
  }

  if ((m = cmd.match(/^(\w+)\((.*)\)$/)) && functions[m[1]]) {
    const func = functions[m[1]];
    const args = m[2] ? m[2].split(",").map(s => s.trim()) : [];
    const localScope = { ...vars };
    func.params.forEach((p, i) => {
      localScope[p] = evaluateExpression(args[i], vars);
    });
    const letm = func.body.match(/^let\s+(\w+)\s*=\s*(.+)$/);
    if (!letm) throw new Error("Invalid function body");
    const res = evaluateExpression(letm[2], localScope);
    vars[letm[1]] = res;
    return `${letm[1]} = ${res}`;
  }

  if ((m = cmd.match(/^for\s+(\w+)\s*=\s*(\d+)\s+to\s+(\d+)\s*{([\s\S]+)}$/))) {
    const [_, v, s, e, body] = m;
    for (let i = +s; i <= +e; i++) {
      vars[v] = i;
      interpret(body.trim());
    }
    return `Looped ${v} from ${s} to ${e}`;
  }

  if ((m = cmd.match(/^while\s*\((.+?)\)\s*{([\s\S]+)}$/))) {
    const cond = m[1], body = m[2].trim();
    let count = 0;
    while (evaluateExpression(cond)) {
      interpret(body);
      if (++count > 10000) throw new Error("Infinite loop detected");
    }
    return "While loop executed.";
  }

  if ((m = cmd.match(/^if\s*\((.+?)\)\s*{([\s\S]+?)}(?:\s*elsif\s*\((.+?)\)\s*{([\s\S]+?)})?(?:\s*else\s*{([\s\S]+?)})?$/))) {
    if (evaluateExpression(m[1])) return interpret(m[2].trim());
    else if (m[3] && evaluateExpression(m[3])) return interpret(m[4].trim());
    else if (m[5]) return interpret(m[5].trim());
    return "If condition was false.";
  }

  if ((m = cmd.match(/^(\d+)\.times\s+do\s+\|(\w+)\|\s*{([\s\S]+)}\s*end$/))) {
    const [_, n, v, body] = m;
    let out = [];
    for (let i = 0; i < +n; i++) {
      vars[v] = i;
      out.push(interpret(body.trim()));
    }
    return out.join("\n");
  }

  if (vars.hasOwnProperty(cmd)) {
    return vars[cmd];
  }

  throw new Error("Unrecognized command: " + cmd);
}

function runFile(fn) {
  const lines = fs.readFileSync(fn, "utf8").split(/\r?\n/);
  lines.filter(line => line.trim()).forEach(line => {
    const res = interpret(line.trim());
    console.log("> " + res);
  });
}

function startREPL() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "Lumos> ",
  });
  console.log("Welcome to Lumos CLI (type exit)");
  rl.prompt();

  rl.on("line", line => {
    if (line.trim() === "exit") return rl.close();
    if (line.trim()) {
      try {
        const res = interpret(line.trim());
        console.log("> " + res);
      } catch (e) {
        console.error("! " + e.message);
      }
    }
    rl.prompt();
  });

  rl.on("close", () => {
    console.log("Goodbye!");
    process.exit(0);
  });
}

const args = process.argv.slice(2);
if (args.length) runFile(args[0]);
else startREPL();