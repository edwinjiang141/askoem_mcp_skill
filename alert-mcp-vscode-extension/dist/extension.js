"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/isexe/windows.js
var require_windows = __commonJS({
  "node_modules/isexe/windows.js"(exports2, module2) {
    module2.exports = isexe;
    isexe.sync = sync;
    var fs = require("fs");
    function checkPathExt(path, options) {
      var pathext = options.pathExt !== void 0 ? options.pathExt : process.env.PATHEXT;
      if (!pathext) {
        return true;
      }
      pathext = pathext.split(";");
      if (pathext.indexOf("") !== -1) {
        return true;
      }
      for (var i = 0; i < pathext.length; i++) {
        var p = pathext[i].toLowerCase();
        if (p && path.substr(-p.length).toLowerCase() === p) {
          return true;
        }
      }
      return false;
    }
    function checkStat(stat, path, options) {
      if (!stat.isSymbolicLink() && !stat.isFile()) {
        return false;
      }
      return checkPathExt(path, options);
    }
    function isexe(path, options, cb) {
      fs.stat(path, function(er, stat) {
        cb(er, er ? false : checkStat(stat, path, options));
      });
    }
    function sync(path, options) {
      return checkStat(fs.statSync(path), path, options);
    }
  }
});

// node_modules/isexe/mode.js
var require_mode = __commonJS({
  "node_modules/isexe/mode.js"(exports2, module2) {
    module2.exports = isexe;
    isexe.sync = sync;
    var fs = require("fs");
    function isexe(path, options, cb) {
      fs.stat(path, function(er, stat) {
        cb(er, er ? false : checkStat(stat, options));
      });
    }
    function sync(path, options) {
      return checkStat(fs.statSync(path), options);
    }
    function checkStat(stat, options) {
      return stat.isFile() && checkMode(stat, options);
    }
    function checkMode(stat, options) {
      var mod = stat.mode;
      var uid = stat.uid;
      var gid = stat.gid;
      var myUid = options.uid !== void 0 ? options.uid : process.getuid && process.getuid();
      var myGid = options.gid !== void 0 ? options.gid : process.getgid && process.getgid();
      var u = parseInt("100", 8);
      var g = parseInt("010", 8);
      var o = parseInt("001", 8);
      var ug = u | g;
      var ret = mod & o || mod & g && gid === myGid || mod & u && uid === myUid || mod & ug && myUid === 0;
      return ret;
    }
  }
});

// node_modules/isexe/index.js
var require_isexe = __commonJS({
  "node_modules/isexe/index.js"(exports2, module2) {
    var fs = require("fs");
    var core;
    if (process.platform === "win32" || global.TESTING_WINDOWS) {
      core = require_windows();
    } else {
      core = require_mode();
    }
    module2.exports = isexe;
    isexe.sync = sync;
    function isexe(path, options, cb) {
      if (typeof options === "function") {
        cb = options;
        options = {};
      }
      if (!cb) {
        if (typeof Promise !== "function") {
          throw new TypeError("callback not provided");
        }
        return new Promise(function(resolve, reject) {
          isexe(path, options || {}, function(er, is) {
            if (er) {
              reject(er);
            } else {
              resolve(is);
            }
          });
        });
      }
      core(path, options || {}, function(er, is) {
        if (er) {
          if (er.code === "EACCES" || options && options.ignoreErrors) {
            er = null;
            is = false;
          }
        }
        cb(er, is);
      });
    }
    function sync(path, options) {
      try {
        return core.sync(path, options || {});
      } catch (er) {
        if (options && options.ignoreErrors || er.code === "EACCES") {
          return false;
        } else {
          throw er;
        }
      }
    }
  }
});

// node_modules/which/which.js
var require_which = __commonJS({
  "node_modules/which/which.js"(exports2, module2) {
    var isWindows = process.platform === "win32" || process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys";
    var path = require("path");
    var COLON = isWindows ? ";" : ":";
    var isexe = require_isexe();
    var getNotFoundError = (cmd) => Object.assign(new Error(`not found: ${cmd}`), { code: "ENOENT" });
    var getPathInfo = (cmd, opt) => {
      const colon = opt.colon || COLON;
      const pathEnv = cmd.match(/\//) || isWindows && cmd.match(/\\/) ? [""] : [
        // windows always checks the cwd first
        ...isWindows ? [process.cwd()] : [],
        ...(opt.path || process.env.PATH || /* istanbul ignore next: very unusual */
        "").split(colon)
      ];
      const pathExtExe = isWindows ? opt.pathExt || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM" : "";
      const pathExt = isWindows ? pathExtExe.split(colon) : [""];
      if (isWindows) {
        if (cmd.indexOf(".") !== -1 && pathExt[0] !== "")
          pathExt.unshift("");
      }
      return {
        pathEnv,
        pathExt,
        pathExtExe
      };
    };
    var which = (cmd, opt, cb) => {
      if (typeof opt === "function") {
        cb = opt;
        opt = {};
      }
      if (!opt)
        opt = {};
      const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
      const found = [];
      const step = (i) => new Promise((resolve, reject) => {
        if (i === pathEnv.length)
          return opt.all && found.length ? resolve(found) : reject(getNotFoundError(cmd));
        const ppRaw = pathEnv[i];
        const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
        const pCmd = path.join(pathPart, cmd);
        const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
        resolve(subStep(p, i, 0));
      });
      const subStep = (p, i, ii) => new Promise((resolve, reject) => {
        if (ii === pathExt.length)
          return resolve(step(i + 1));
        const ext = pathExt[ii];
        isexe(p + ext, { pathExt: pathExtExe }, (er, is) => {
          if (!er && is) {
            if (opt.all)
              found.push(p + ext);
            else
              return resolve(p + ext);
          }
          return resolve(subStep(p, i, ii + 1));
        });
      });
      return cb ? step(0).then((res) => cb(null, res), cb) : step(0);
    };
    var whichSync = (cmd, opt) => {
      opt = opt || {};
      const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
      const found = [];
      for (let i = 0; i < pathEnv.length; i++) {
        const ppRaw = pathEnv[i];
        const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
        const pCmd = path.join(pathPart, cmd);
        const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
        for (let j = 0; j < pathExt.length; j++) {
          const cur = p + pathExt[j];
          try {
            const is = isexe.sync(cur, { pathExt: pathExtExe });
            if (is) {
              if (opt.all)
                found.push(cur);
              else
                return cur;
            }
          } catch (ex) {
          }
        }
      }
      if (opt.all && found.length)
        return found;
      if (opt.nothrow)
        return null;
      throw getNotFoundError(cmd);
    };
    module2.exports = which;
    which.sync = whichSync;
  }
});

// node_modules/path-key/index.js
var require_path_key = __commonJS({
  "node_modules/path-key/index.js"(exports2, module2) {
    "use strict";
    var pathKey = (options = {}) => {
      const environment = options.env || process.env;
      const platform = options.platform || process.platform;
      if (platform !== "win32") {
        return "PATH";
      }
      return Object.keys(environment).reverse().find((key) => key.toUpperCase() === "PATH") || "Path";
    };
    module2.exports = pathKey;
    module2.exports.default = pathKey;
  }
});

// node_modules/cross-spawn/lib/util/resolveCommand.js
var require_resolveCommand = __commonJS({
  "node_modules/cross-spawn/lib/util/resolveCommand.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var which = require_which();
    var getPathKey = require_path_key();
    function resolveCommandAttempt(parsed, withoutPathExt) {
      const env = parsed.options.env || process.env;
      const cwd = process.cwd();
      const hasCustomCwd = parsed.options.cwd != null;
      const shouldSwitchCwd = hasCustomCwd && process.chdir !== void 0 && !process.chdir.disabled;
      if (shouldSwitchCwd) {
        try {
          process.chdir(parsed.options.cwd);
        } catch (err) {
        }
      }
      let resolved;
      try {
        resolved = which.sync(parsed.command, {
          path: env[getPathKey({ env })],
          pathExt: withoutPathExt ? path.delimiter : void 0
        });
      } catch (e) {
      } finally {
        if (shouldSwitchCwd) {
          process.chdir(cwd);
        }
      }
      if (resolved) {
        resolved = path.resolve(hasCustomCwd ? parsed.options.cwd : "", resolved);
      }
      return resolved;
    }
    function resolveCommand(parsed) {
      return resolveCommandAttempt(parsed) || resolveCommandAttempt(parsed, true);
    }
    module2.exports = resolveCommand;
  }
});

// node_modules/cross-spawn/lib/util/escape.js
var require_escape = __commonJS({
  "node_modules/cross-spawn/lib/util/escape.js"(exports2, module2) {
    "use strict";
    var metaCharsRegExp = /([()\][%!^"`<>&|;, *?])/g;
    function escapeCommand(arg) {
      arg = arg.replace(metaCharsRegExp, "^$1");
      return arg;
    }
    function escapeArgument(arg, doubleEscapeMetaChars) {
      arg = `${arg}`;
      arg = arg.replace(/(?=(\\+?)?)\1"/g, '$1$1\\"');
      arg = arg.replace(/(?=(\\+?)?)\1$/, "$1$1");
      arg = `"${arg}"`;
      arg = arg.replace(metaCharsRegExp, "^$1");
      if (doubleEscapeMetaChars) {
        arg = arg.replace(metaCharsRegExp, "^$1");
      }
      return arg;
    }
    module2.exports.command = escapeCommand;
    module2.exports.argument = escapeArgument;
  }
});

// node_modules/shebang-regex/index.js
var require_shebang_regex = __commonJS({
  "node_modules/shebang-regex/index.js"(exports2, module2) {
    "use strict";
    module2.exports = /^#!(.*)/;
  }
});

// node_modules/shebang-command/index.js
var require_shebang_command = __commonJS({
  "node_modules/shebang-command/index.js"(exports2, module2) {
    "use strict";
    var shebangRegex = require_shebang_regex();
    module2.exports = (string4 = "") => {
      const match = string4.match(shebangRegex);
      if (!match) {
        return null;
      }
      const [path, argument] = match[0].replace(/#! ?/, "").split(" ");
      const binary = path.split("/").pop();
      if (binary === "env") {
        return argument;
      }
      return argument ? `${binary} ${argument}` : binary;
    };
  }
});

// node_modules/cross-spawn/lib/util/readShebang.js
var require_readShebang = __commonJS({
  "node_modules/cross-spawn/lib/util/readShebang.js"(exports2, module2) {
    "use strict";
    var fs = require("fs");
    var shebangCommand = require_shebang_command();
    function readShebang(command) {
      const size = 150;
      const buffer = Buffer.alloc(size);
      let fd;
      try {
        fd = fs.openSync(command, "r");
        fs.readSync(fd, buffer, 0, size, 0);
        fs.closeSync(fd);
      } catch (e) {
      }
      return shebangCommand(buffer.toString());
    }
    module2.exports = readShebang;
  }
});

// node_modules/cross-spawn/lib/parse.js
var require_parse = __commonJS({
  "node_modules/cross-spawn/lib/parse.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var resolveCommand = require_resolveCommand();
    var escape2 = require_escape();
    var readShebang = require_readShebang();
    var isWin = process.platform === "win32";
    var isExecutableRegExp = /\.(?:com|exe)$/i;
    var isCmdShimRegExp = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;
    function detectShebang(parsed) {
      parsed.file = resolveCommand(parsed);
      const shebang = parsed.file && readShebang(parsed.file);
      if (shebang) {
        parsed.args.unshift(parsed.file);
        parsed.command = shebang;
        return resolveCommand(parsed);
      }
      return parsed.file;
    }
    function parseNonShell(parsed) {
      if (!isWin) {
        return parsed;
      }
      const commandFile = detectShebang(parsed);
      const needsShell = !isExecutableRegExp.test(commandFile);
      if (parsed.options.forceShell || needsShell) {
        const needsDoubleEscapeMetaChars = isCmdShimRegExp.test(commandFile);
        parsed.command = path.normalize(parsed.command);
        parsed.command = escape2.command(parsed.command);
        parsed.args = parsed.args.map((arg) => escape2.argument(arg, needsDoubleEscapeMetaChars));
        const shellCommand = [parsed.command].concat(parsed.args).join(" ");
        parsed.args = ["/d", "/s", "/c", `"${shellCommand}"`];
        parsed.command = process.env.comspec || "cmd.exe";
        parsed.options.windowsVerbatimArguments = true;
      }
      return parsed;
    }
    function parse3(command, args, options) {
      if (args && !Array.isArray(args)) {
        options = args;
        args = null;
      }
      args = args ? args.slice(0) : [];
      options = Object.assign({}, options);
      const parsed = {
        command,
        args,
        options,
        file: void 0,
        original: {
          command,
          args
        }
      };
      return options.shell ? parsed : parseNonShell(parsed);
    }
    module2.exports = parse3;
  }
});

// node_modules/cross-spawn/lib/enoent.js
var require_enoent = __commonJS({
  "node_modules/cross-spawn/lib/enoent.js"(exports2, module2) {
    "use strict";
    var isWin = process.platform === "win32";
    function notFoundError(original, syscall) {
      return Object.assign(new Error(`${syscall} ${original.command} ENOENT`), {
        code: "ENOENT",
        errno: "ENOENT",
        syscall: `${syscall} ${original.command}`,
        path: original.command,
        spawnargs: original.args
      });
    }
    function hookChildProcess(cp, parsed) {
      if (!isWin) {
        return;
      }
      const originalEmit = cp.emit;
      cp.emit = function(name, arg1) {
        if (name === "exit") {
          const err = verifyENOENT(arg1, parsed);
          if (err) {
            return originalEmit.call(cp, "error", err);
          }
        }
        return originalEmit.apply(cp, arguments);
      };
    }
    function verifyENOENT(status, parsed) {
      if (isWin && status === 1 && !parsed.file) {
        return notFoundError(parsed.original, "spawn");
      }
      return null;
    }
    function verifyENOENTSync(status, parsed) {
      if (isWin && status === 1 && !parsed.file) {
        return notFoundError(parsed.original, "spawnSync");
      }
      return null;
    }
    module2.exports = {
      hookChildProcess,
      verifyENOENT,
      verifyENOENTSync,
      notFoundError
    };
  }
});

// node_modules/cross-spawn/index.js
var require_cross_spawn = __commonJS({
  "node_modules/cross-spawn/index.js"(exports2, module2) {
    "use strict";
    var cp = require("child_process");
    var parse3 = require_parse();
    var enoent = require_enoent();
    function spawn2(command, args, options) {
      const parsed = parse3(command, args, options);
      const spawned = cp.spawn(parsed.command, parsed.args, parsed.options);
      enoent.hookChildProcess(spawned, parsed);
      return spawned;
    }
    function spawnSync(command, args, options) {
      const parsed = parse3(command, args, options);
      const result = cp.spawnSync(parsed.command, parsed.args, parsed.options);
      result.error = result.error || enoent.verifyENOENTSync(result.status, parsed);
      return result;
    }
    module2.exports = spawn2;
    module2.exports.spawn = spawn2;
    module2.exports.sync = spawnSync;
    module2.exports._parse = parse3;
    module2.exports._enoent = enoent;
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(extension_exports);
var vscode8 = __toESM(require("vscode"));

// src/commands/commandHelpers.ts
var vscode = __toESM(require("vscode"));
async function promptAndStoreLlmApiKey(secrets) {
  const value = await vscode.window.showInputBox({
    prompt: "Enter your LLM API key",
    password: true,
    ignoreFocusOut: true
  });
  if (!value) {
    return;
  }
  await secrets.setLlmApiKey(value);
  vscode.window.showInformationMessage("LLM API key saved securely.");
}
async function promptAndStoreMcpToken(secrets) {
  const value = await vscode.window.showInputBox({
    prompt: "Enter your MCP bearer token (optional)",
    password: true,
    ignoreFocusOut: true
  });
  if (!value) {
    return;
  }
  await secrets.setMcpBearerToken(value);
  vscode.window.showInformationMessage("MCP bearer token saved securely.");
}

// src/services/llm/openAiCompatibleLlmService.ts
var OpenAiCompatibleLlmService = class {
  constructor(baseUrl, apiKey, model, temperature) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
    this.temperature = temperature;
  }
  baseUrl;
  apiKey;
  model;
  temperature;
  async complete(messages, tools = []) {
    const endpoint = this.normalizeEndpoint(this.baseUrl);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        temperature: this.temperature,
        stream: false,
        messages: messages.map((message2) => ({
          role: message2.role,
          content: message2.content,
          name: message2.name,
          tool_call_id: message2.tool_call_id,
          tool_calls: message2.tool_calls
        })),
        ...tools.length > 0 ? { tools } : {}
      })
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`LLM request failed: ${response.status} ${response.statusText}
${body}`);
    }
    const json2 = await response.json();
    const message = json2.choices?.[0]?.message;
    if (!message) {
      throw new Error("LLM response does not contain a valid assistant message.");
    }
    return message;
  }
  normalizeEndpoint(baseUrl) {
    const trimmed = baseUrl.replace(/\/$/, "");
    if (trimmed.endsWith("/chat/completions")) {
      return trimmed;
    }
    return `${trimmed}/chat/completions`;
  }
};

// src/charts/parseChartPreferencesFromQuestion.ts
function parseChartPreferencesFromQuestion(question) {
  const q = (question || "").trim();
  if (!q) {
    return {};
  }
  const prefs = {};
  const mergeOneChart = /(合并|一张图|单个图|一图|合在.{0,3}图).{0,8}(展示|显示|画)/i.test(q) || /(用|要|展示|画).{0,6}(一张|单个|一个)(图)?/i.test(q) || /(只|仅).{0,4}(要|需要|展示).{0,4}一(张|个)图/i.test(q);
  const splitMetrics = /(分开展示|分别展示|分别.*图|每个指标|各指标|指标分别|一指标一图|一图一指标|每.{0,4}指标.{0,6}图|单独.{0,4}图|多图|分开.{0,4}画|各画.{0,4}图)/i.test(q) || /(每个|分别).{0,4}(指标|监控项).{0,8}(图|展示|画)/i.test(q) || /(不同|多个).{0,4}指标.{0,8}(分|各|分别)/i.test(q);
  if (splitMetrics && !mergeOneChart) {
    prefs.splitByMetric = true;
  } else if (mergeOneChart && !splitMetrics) {
    prefs.splitByMetric = false;
  }
  const mNum = q.match(/(\d+)\s*[个张幅]\s*图/);
  if (mNum) {
    const n = parseInt(mNum[1], 10);
    if (n > 0 && n <= 10) {
      prefs.maxCharts = n;
    }
  }
  if (/散点图/.test(q) || /\bscatter\b/i.test(q)) {
    prefs.chartType = "scatter";
  } else if (/柱状图|条形图/.test(q) || /\bbar\s*chart\b/i.test(q) || /(?<![折])柱状/.test(q)) {
    prefs.chartType = "bar";
  } else if (/折线图|趋势图/.test(q) || /\bline\s*chart\b/i.test(q)) {
    prefs.chartType = "line";
  }
  if (/\bbar\b/i.test(q) && !/柱状|条形/.test(q) && !prefs.chartType) {
    prefs.chartType = "bar";
  }
  if (/\bline\b/i.test(q) && !/折线|趋势/.test(q) && !prefs.chartType && /chart|图/.test(q)) {
    prefs.chartType = "line";
  }
  const timeRangeQuery = /(?:最近|过去|近)\s*\d+\s*(?:小时|天|周|月|分钟|分)/.test(q) || /\d+\s*(?:h|小时|hr|天|周|week|days?|分钟|分)\b/i.test(q) || /(?:24|48|72)\s*小时/.test(q) || /时间范围|时段|从\s*.+\s*到|between|last\s+\d+/i.test(q) || /趋势|历史|变化|时序|走势|随时间/.test(q) || /今日|昨日|本周|本月|上周/.test(q) || /\b(?:24h|7d|1w|30d)\b/i.test(q) || /过去\s*\d+\s*(?:小时|天)/.test(q);
  if (timeRangeQuery) {
    prefs.timeRangeQuery = true;
    if (!prefs.chartType) {
      prefs.chartType = "line";
    }
  }
  return prefs;
}

// src/charts/buildFetchDataChartsPayload.ts
var MAX_CHARTS = 10;
var MAX_POINTS = 200;
var SENSITIVE_KEY = /password|passwd|pwd|secret|token|credential/i;
function isSensitiveKey(key) {
  return SENSITIVE_KEY.test(key);
}
function asRowArray(v) {
  if (!Array.isArray(v)) {
    return [];
  }
  return v.filter((x) => x !== null && typeof x === "object" && !Array.isArray(x));
}
function parseNumber(v) {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(/,/g, ""));
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return void 0;
}
function findTimeColumn(rows) {
  if (rows.length === 0) {
    return void 0;
  }
  const keys = Object.keys(rows[0]);
  const timeRe = /collection_timestamp|timestamp|time|date|_utc|created|updated|last_updated/i;
  for (const k of keys) {
    if (isSensitiveKey(k)) {
      continue;
    }
    if (timeRe.test(k)) {
      return k;
    }
  }
  return void 0;
}
function findValueColumn(rows) {
  if (rows.length === 0) {
    return void 0;
  }
  const keys = Object.keys(rows[0]);
  const prefer = ["VALUE", "value", "metric_value"];
  for (const p of prefer) {
    if (keys.includes(p) && !isSensitiveKey(p)) {
      return p;
    }
  }
  for (const k of keys) {
    if (isSensitiveKey(k)) {
      continue;
    }
    if (/value|usage|percent|cpu|memory|count|rate/i.test(k)) {
      const n = parseNumber(rows[0][k]);
      if (n !== void 0) {
        return k;
      }
    }
  }
  for (const k of keys) {
    if (isSensitiveKey(k)) {
      continue;
    }
    const n = parseNumber(rows[0][k]);
    if (n !== void 0) {
      return k;
    }
  }
  return void 0;
}
function findGroupKey(rows) {
  if (rows.length === 0) {
    return void 0;
  }
  const keys = Object.keys(rows[0]);
  for (const p of ["COLUMN_LABEL", "column_label"]) {
    if (keys.includes(p)) {
      return p;
    }
  }
  const prefer = ["METRIC_NAME", "metric_name", "METRIC_COLUMN", "metric_column"];
  for (const p of prefer) {
    if (keys.includes(p)) {
      return p;
    }
  }
  return void 0;
}
function findSplitMetricKey(rows) {
  if (rows.length === 0) {
    return void 0;
  }
  const candidates = [
    "COLUMN_LABEL",
    "column_label",
    "METRIC_NAME",
    "metric_name",
    "METRIC_COLUMN",
    "metric_column",
    "TARGET_NAME",
    "target_name"
  ];
  const keys = Object.keys(rows[0]);
  for (const c of candidates) {
    if (!keys.includes(c)) {
      continue;
    }
    const distinct = new Set(rows.map((r) => String(r[c] ?? "")));
    if (distinct.size > 1) {
      return c;
    }
  }
  return void 0;
}
function findCategoryColumn(rows) {
  if (rows.length === 0) {
    return void 0;
  }
  const keys = Object.keys(rows[0]);
  const tk = findTimeColumn(rows);
  const vk = findValueColumn(rows);
  const preferOrder = [
    "COLUMN_LABEL",
    "column_label",
    "METRIC_COLUMN",
    "metric_column",
    "METRIC_NAME",
    "metric_name"
  ];
  for (const p of preferOrder) {
    if (keys.includes(p) && p !== tk && p !== vk && !isSensitiveKey(p)) {
      return p;
    }
  }
  const lower = keys.map((k) => k.toLowerCase());
  for (const p of ["column_label", "metric_column", "metric_name"]) {
    const idx = lower.indexOf(p);
    if (idx >= 0) {
      const k = keys[idx];
      if (k !== tk && k !== vk && !isSensitiveKey(k)) {
        return k;
      }
    }
  }
  for (const k of keys) {
    if (k === tk || k === vk || isSensitiveKey(k)) {
      continue;
    }
    const v = rows[0][k];
    if (typeof v === "string" || typeof v === "number") {
      return k;
    }
  }
  return keys.find((k) => !isSensitiveKey(k) && k !== tk && k !== vk);
}
function friendlyAxisName(columnKey) {
  const map2 = {
    COLUMN_LABEL: "\u6307\u6807",
    column_label: "\u6307\u6807",
    METRIC_COLUMN: "\u76D1\u63A7\u9879",
    metric_column: "\u76D1\u63A7\u9879",
    METRIC_NAME: "\u6307\u6807\u540D",
    metric_name: "\u6307\u6807\u540D",
    VALUE: "\u6570\u503C",
    value: "\u6570\u503C",
    collection_timestamp: "\u65F6\u95F4",
    COLLECTION_TIMESTAMP: "\u65F6\u95F4"
  };
  return map2[columnKey] ?? columnKey;
}
function findTwoNumericColumns(rows) {
  if (rows.length === 0) {
    return void 0;
  }
  const keys = Object.keys(rows[0]).filter((k) => !isSensitiveKey(k));
  const numericKeys = [];
  for (const k of keys) {
    if (parseNumber(rows[0][k]) !== void 0) {
      numericKeys.push(k);
    }
  }
  if (numericKeys.length >= 2) {
    return [numericKeys[0], numericKeys[1]];
  }
  return void 0;
}
function getMetricNameColumnKey(rows) {
  if (rows.length === 0) {
    return void 0;
  }
  const keys = Object.keys(rows[0]);
  if (keys.includes("METRIC_NAME")) {
    return "METRIC_NAME";
  }
  if (keys.includes("metric_name")) {
    return "metric_name";
  }
  return void 0;
}
var METRIC_BUCKET_ORDER = [
  { key: "cpu", title: "CPU" },
  { key: "memory", title: "\u5185\u5B58" },
  { key: "disk", title: "\u78C1\u76D8" },
  { key: "io", title: "I/O" },
  { key: "network", title: "\u7F51\u7EDC" }
];
function bucketMetricCategory(row) {
  const mn = String(row.METRIC_NAME ?? row.metric_name ?? "").toLowerCase();
  const cl = String(row.COLUMN_LABEL ?? row.column_label ?? "");
  const clLower = cl.toLowerCase();
  const mc = String(row.METRIC_COLUMN ?? row.metric_column ?? "").toLowerCase();
  const ml = String(row.METRIC_LABEL ?? row.metric_label ?? "").toLowerCase();
  const hay = `${mn} ${clLower} ${mc} ${ml}`;
  const hayZh = `${cl} ${mn} ${mc} ${ml}`;
  if (/\b(load|cpu)\b/.test(mn)) {
    return "cpu";
  }
  if (/\bmemory\b/.test(mn)) {
    return "memory";
  }
  if (/\b(filesystems|filesystem|response)\b/.test(mn) && !/memory/i.test(mn)) {
    return "disk";
  }
  const memHit = /\b(memory|mem|sga|pga|buffer cache|heap size)\b/.test(hay) || /内存|sga|pga|缓冲池/i.test(hayZh);
  const cpuHit = /\b(cpu|load|processor|cores|time per sec|usage)\b/.test(hay) || /cpu|处理器|负载|使用量|利用率/i.test(hayZh);
  const diskHit = /filesystem|disk space|tablespace|archive area|usable fast recovery|磁盘|表空间|归档|未保护数据窗口/i.test(
    hay
  ) || /表空间|磁盘|空间\s*\(/i.test(hayZh);
  const ioHit = /physical read|physical write|i\s*\/\s*o|io wait|foreground wait|read.*latency|write.*latency/i.test(
    hay
  ) || /物理读|物理写|等待.*类|i\s*\/\s*o/i.test(hayZh);
  const netHit = /\bnetwork\b|tcp|traffic|listener|网络|监听/i.test(hay + hayZh);
  if (netHit && !cpuHit && !memHit) {
    return "network";
  }
  if (diskHit && !ioHit) {
    return "disk";
  }
  if (ioHit && !diskHit) {
    return "io";
  }
  if (diskHit && ioHit) {
    return /tablespace|filesystem|space\s*\(|磁盘|表空间|archive|fast recovery/i.test(hay + hayZh) ? "disk" : "io";
  }
  if (cpuHit && !memHit) {
    return "cpu";
  }
  if (memHit && !cpuHit) {
    return "memory";
  }
  if (cpuHit && memHit) {
    return clLower.includes("memory") || /内存|sga|pga/i.test(hayZh) ? "memory" : "cpu";
  }
  return null;
}
function getColumnLabelKey(rows) {
  if (rows.length === 0) {
    return void 0;
  }
  const keys = Object.keys(rows[0]);
  if (keys.includes("COLUMN_LABEL")) {
    return "COLUMN_LABEL";
  }
  if (keys.includes("column_label")) {
    return "column_label";
  }
  return void 0;
}
function truncateLegendLabel(s, max = 80) {
  return s.length > max ? s.slice(0, max - 1) + "\u2026" : s;
}
function columnLabelSemanticBucket(label) {
  const row = {
    COLUMN_LABEL: label,
    column_label: label,
    METRIC_NAME: "",
    metric_name: "",
    METRIC_COLUMN: "",
    metric_column: "",
    METRIC_LABEL: "",
    metric_label: ""
  };
  const b = bucketMetricCategory(row);
  return b ?? "other";
}
function groupColumnLabelsIntoPairs(seriesNames) {
  const buckets = /* @__PURE__ */ new Map();
  for (const name of seriesNames) {
    const b = columnLabelSemanticBucket(name);
    const arr = buckets.get(b) ?? [];
    arr.push(name);
    buckets.set(b, arr);
  }
  const order = [
    ...METRIC_BUCKET_ORDER.map((x) => x.key),
    "other"
  ];
  const out = [];
  for (const key of order) {
    const arr = [...buckets.get(key) ?? []].sort((a, b) => a.localeCompare(b));
    for (let i = 0; i < arr.length; i += 2) {
      out.push(arr.slice(i, i + 2));
    }
  }
  return out;
}
function buildOneMultiSeriesLineChart(rows, timeKey, valKey, columnLabelKey, seriesNames, title) {
  if (seriesNames.length < 1 || seriesNames.length > 2) {
    return void 0;
  }
  const sorted = sortRowsByTime(rows, timeKey).slice(-MAX_POINTS);
  const timeSet = /* @__PURE__ */ new Set();
  for (const r of sorted) {
    const col = String(r[columnLabelKey] ?? "").trim();
    if (!seriesNames.includes(col)) {
      continue;
    }
    const t = labelForTime(r[timeKey]);
    if (t !== "") {
      timeSet.add(t);
    }
  }
  const allLabels = [...timeSet].sort((a, b) => a.localeCompare(b));
  if (allLabels.length === 0) {
    return void 0;
  }
  const datasets = [];
  for (const seriesName of seriesNames) {
    const timeToVal = /* @__PURE__ */ new Map();
    for (const r of sorted) {
      const col = String(r[columnLabelKey] ?? "").trim();
      if (col !== seriesName) {
        continue;
      }
      const t = labelForTime(r[timeKey]);
      if (t === "") {
        continue;
      }
      const v = parseNumber(r[valKey]);
      timeToVal.set(t, v === void 0 ? 0 : v);
    }
    const data = allLabels.map((l) => {
      const v = timeToVal.get(l);
      return v === void 0 ? null : v;
    });
    datasets.push({ label: truncateLegendLabel(seriesName), data });
  }
  if (datasets.length === 0) {
    return void 0;
  }
  return {
    title,
    chartType: "line",
    labels: allLabels,
    datasets,
    xAxisLabel: friendlyAxisName(timeKey),
    yAxisLabel: friendlyAxisName(valKey)
  };
}
function buildMultiSeriesLineCharts(rows, timeKey, valKey, columnLabelKey, title) {
  const sorted = sortRowsByTime(rows, timeKey).slice(-MAX_POINTS);
  const seriesNames = [
    ...new Set(sorted.map((r) => String(r[columnLabelKey] ?? "").trim()).filter(Boolean))
  ].sort((a, b) => a.localeCompare(b));
  if (seriesNames.length < 2) {
    return [];
  }
  if (seriesNames.length <= 2) {
    const one = buildOneMultiSeriesLineChart(rows, timeKey, valKey, columnLabelKey, seriesNames, title);
    return one ? [one] : [];
  }
  const groups = groupColumnLabelsIntoPairs(seriesNames);
  const out = [];
  const total = groups.length;
  groups.forEach((g, gi) => {
    const subTitle = total > 1 ? `${title} (${gi + 1}/${total})` : title;
    const spec = buildOneMultiSeriesLineChart(rows, timeKey, valKey, columnLabelKey, g, subTitle);
    if (spec) {
      out.push(spec);
    }
  });
  return out;
}
function buildLineChartFromRows(rows, timeKey, valKey, title) {
  if (rows.length === 0) {
    return [];
  }
  const clk = getColumnLabelKey(rows);
  if (clk) {
    const distinctLabels = [
      ...new Set(rows.map((r) => String(r[clk] ?? "").trim()).filter(Boolean))
    ];
    if (distinctLabels.length >= 2) {
      return buildMultiSeriesLineCharts(rows, timeKey, valKey, clk, title);
    }
  }
  const sorted = sortRowsByTime(rows, timeKey).slice(-MAX_POINTS);
  const map2 = /* @__PURE__ */ new Map();
  for (const r of sorted) {
    const t = labelForTime(r[timeKey]);
    if (t === "") {
      continue;
    }
    const v = parseNumber(r[valKey]);
    map2.set(t, v === void 0 ? 0 : v);
  }
  const labels = [...map2.keys()];
  const values = [...map2.values()];
  if (labels.length === 0) {
    return [];
  }
  let datasetLabel = valKey;
  if (clk) {
    const one = [...new Set(rows.map((r) => String(r[clk] ?? "").trim()).filter(Boolean))];
    if (one.length === 1) {
      datasetLabel = truncateLegendLabel(one[0]);
    }
  }
  return [
    {
      title,
      chartType: "line",
      labels,
      datasets: [{ label: datasetLabel, data: values }],
      xAxisLabel: friendlyAxisName(timeKey),
      yAxisLabel: friendlyAxisName(valKey)
    }
  ];
}
function tryBuildLatestTimeRangeLineCharts(latest, maxCharts, timeKey, valKey) {
  const out = [];
  const mk = getMetricNameColumnKey(latest);
  if (mk) {
    const byMetric = /* @__PURE__ */ new Map();
    for (const row of latest) {
      const name = String(row[mk] ?? "").trim() || "_";
      if (!byMetric.has(name)) {
        byMetric.set(name, []);
      }
      byMetric.get(name).push(row);
    }
    if (byMetric.size >= 1) {
      const names = [...byMetric.keys()].sort((a, b) => a.localeCompare(b));
      for (const name of names) {
        if (out.length >= maxCharts) {
          break;
        }
        const groupRows = byMetric.get(name);
        if (!groupRows?.length) {
          continue;
        }
        const specs2 = buildLineChartFromRows(groupRows, timeKey, valKey, `\u6307\u6807: ${name}`);
        for (const spec of specs2) {
          if (out.length >= maxCharts) {
            break;
          }
          out.push(spec);
        }
      }
      if (out.length > 0) {
        return out;
      }
    }
  }
  const bySemantic = /* @__PURE__ */ new Map();
  for (const b of METRIC_BUCKET_ORDER) {
    bySemantic.set(b.key, []);
  }
  for (const row of latest) {
    const cat = bucketMetricCategory(row);
    if (cat) {
      bySemantic.get(cat).push(row);
    }
  }
  const nonEmptyBuckets = METRIC_BUCKET_ORDER.filter(({ key }) => (bySemantic.get(key) ?? []).length > 0);
  if (nonEmptyBuckets.length >= 1) {
    for (const { key, title } of nonEmptyBuckets) {
      if (out.length >= maxCharts) {
        break;
      }
      const rows = bySemantic.get(key) ?? [];
      const specs2 = buildLineChartFromRows(rows, timeKey, valKey, `${title} \u4F7F\u7528\u91CF`);
      for (const spec of specs2) {
        if (out.length >= maxCharts) {
          break;
        }
        out.push(spec);
      }
    }
    if (out.length > 0) {
      return out;
    }
  }
  const specs = buildLineChartFromRows(latest, timeKey, valKey, "latest_data (\u65F6\u95F4\u5E8F\u5217)");
  return specs.slice(0, maxCharts);
}
function tryBuildLatestGroupedBarCharts(latest, maxCharts, prefs) {
  const out = [];
  if (latest.length === 0 || maxCharts < 1) {
    return out;
  }
  const valKey = findValueColumn(latest);
  if (!valKey) {
    return out;
  }
  if (prefs.timeRangeQuery) {
    const timeKey = findTimeColumn(latest);
    if (timeKey && timeKey !== valKey) {
      const lineCharts = tryBuildLatestTimeRangeLineCharts(latest, maxCharts, timeKey, valKey);
      if (lineCharts.length > 0) {
        return lineCharts;
      }
    }
  }
  const buildBucketChart = (rows, title) => {
    let catKey = findCategoryColumn(rows);
    if (!catKey || catKey === valKey) {
      const k0 = Object.keys(rows[0]);
      catKey = k0.find((k) => (k === "COLUMN_LABEL" || k === "column_label") && k !== valKey);
    }
    if (!catKey || catKey === valKey) {
      return void 0;
    }
    const slice = rows.slice(0, MAX_POINTS);
    const labels = slice.map((r) => String(r[catKey] ?? "").slice(0, 40));
    const values = slice.map((r) => parseNumber(r[valKey])).map((v) => v === void 0 ? 0 : v);
    if (!labels.some(Boolean)) {
      return void 0;
    }
    return {
      title,
      chartType: "bar",
      labels,
      datasets: [{ label: valKey, data: values }],
      xAxisLabel: friendlyAxisName(catKey),
      yAxisLabel: friendlyAxisName(valKey)
    };
  };
  const mk = getMetricNameColumnKey(latest);
  if (mk) {
    const byMetric = /* @__PURE__ */ new Map();
    for (const row of latest) {
      const name = String(row[mk] ?? "").trim() || "_";
      if (!byMetric.has(name)) {
        byMetric.set(name, []);
      }
      byMetric.get(name).push(row);
    }
    if (byMetric.size >= 2) {
      const names = [...byMetric.keys()].sort((a, b) => a.localeCompare(b));
      for (const name of names) {
        if (out.length >= maxCharts) {
          break;
        }
        const groupRows = byMetric.get(name);
        if (!groupRows?.length) {
          continue;
        }
        let catKey = findCategoryColumn(groupRows);
        if (!catKey || catKey === valKey) {
          const k0 = Object.keys(groupRows[0]);
          catKey = k0.find((k) => (k === "COLUMN_LABEL" || k === "column_label") && k !== valKey);
        }
        if (!catKey || catKey === valKey) {
          continue;
        }
        const slice = groupRows.slice(0, MAX_POINTS);
        const labels = slice.map((r) => String(r[catKey] ?? "").slice(0, 40));
        const values = slice.map((r) => parseNumber(r[valKey])).map((v) => v === void 0 ? 0 : v);
        if (!labels.some(Boolean)) {
          continue;
        }
        out.push({
          title: `\u6307\u6807: ${name}`,
          chartType: "bar",
          labels,
          datasets: [{ label: valKey, data: values }],
          xAxisLabel: friendlyAxisName(catKey),
          yAxisLabel: friendlyAxisName(valKey)
        });
      }
      if (out.length > 0) {
        return out;
      }
    }
  }
  const bySemantic = /* @__PURE__ */ new Map();
  for (const b of METRIC_BUCKET_ORDER) {
    bySemantic.set(b.key, []);
  }
  for (const row of latest) {
    const cat = bucketMetricCategory(row);
    if (cat) {
      bySemantic.get(cat).push(row);
    }
  }
  const nonEmptyBuckets = METRIC_BUCKET_ORDER.filter(({ key }) => (bySemantic.get(key) ?? []).length > 0);
  if (nonEmptyBuckets.length >= 2) {
    for (const { key, title } of nonEmptyBuckets) {
      if (out.length >= maxCharts) {
        break;
      }
      const rows = bySemantic.get(key) ?? [];
      const chart = buildBucketChart(rows, `${title} \u4F7F\u7528\u91CF`);
      if (chart) {
        out.push(chart);
      }
    }
    if (out.length > 0) {
      return out;
    }
  }
  return out;
}
function sortRowsByTime(rows, timeKey) {
  return [...rows].sort((a, b) => {
    const ta = String(a[timeKey] ?? "");
    const tb = String(b[timeKey] ?? "");
    return ta.localeCompare(tb);
  });
}
function labelForTime(v) {
  if (v === null || v === void 0) {
    return "";
  }
  const s = String(v);
  return s.length > 32 ? s.slice(0, 29) + "\u2026" : s;
}
function formatChartTableNumber(n) {
  if (!Number.isFinite(n)) {
    return "";
  }
  if (Number.isInteger(n) && Math.abs(n) < 1e15) {
    return String(n);
  }
  const a = Math.abs(n);
  if (a >= 1e7 || a > 0 && a < 1e-4) {
    return n.toExponential(4);
  }
  const s = n.toFixed(6);
  return s.replace(/\.?0+$/, "");
}
function formatChartTableCell(v) {
  if (v === null || v === void 0 || !Number.isFinite(Number(v))) {
    return "";
  }
  return formatChartTableNumber(Number(v));
}
function lineOrBarChartToTable(chart) {
  if (chart.chartType !== "line" && chart.chartType !== "bar") {
    return chart;
  }
  const labels = chart.labels ?? [];
  const datasets = chart.datasets ?? [];
  if (labels.length === 0 || datasets.length === 0) {
    return chart;
  }
  const xLabel = chart.xAxisLabel || "\u7C7B\u522B";
  const cols = [xLabel, ...datasets.map((d) => String(d.label || chart.yAxisLabel || "\u503C"))];
  const rows = labels.map((_, i) => {
    const row = [String(labels[i] ?? "")];
    for (const ds of datasets) {
      row.push(formatChartTableCell(ds.data[i]));
    }
    return row;
  });
  return {
    ...chart,
    chartType: "table",
    labels: [],
    datasets: [],
    tableColumns: cols,
    tableRows: rows,
    scatterPoints: void 0
  };
}
function lineChartWithAtMostThreePointsToTable(chart) {
  if (chart.chartType !== "line") {
    return chart;
  }
  const n = chart.labels?.length ?? 0;
  if (n === 0 || n > 3) {
    return chart;
  }
  return lineOrBarChartToTable(chart);
}
function applyChartTypePreference(chart, pref) {
  if (chart.chartType === "scatter" && chart.scatterPoints?.length) {
    const pts = chart.scatterPoints;
    if (pref === "line" || pref === "bar") {
      return {
        ...chart,
        chartType: pref,
        labels: pts.map((_, i) => String(i + 1)),
        datasets: [{ label: chart.title, data: pts.map((p) => p.y) }],
        scatterPoints: void 0
      };
    }
    const xLab = chart.xAxisLabel || "X";
    const yLab = chart.yAxisLabel || "Y";
    chart = {
      ...chart,
      chartType: "table",
      labels: [],
      datasets: [],
      tableColumns: [xLab, yLab],
      tableRows: pts.map((p) => [formatChartTableNumber(p.x), formatChartTableNumber(p.y)]),
      scatterPoints: void 0,
      xAxisLabel: chart.xAxisLabel,
      yAxisLabel: chart.yAxisLabel
    };
  }
  if (!pref || chart.chartType === pref) {
    return chart;
  }
  if (chart.chartType === "table" && chart.tableRows?.length && chart.tableColumns?.length === 2) {
    if (pref === "scatter") {
      return chart;
    }
    if (pref === "line" || pref === "bar") {
      const ys = chart.tableRows.map((r) => Number(r[1])).filter(Number.isFinite);
      if (ys.length === chart.tableRows.length && ys.length > 0) {
        return {
          ...chart,
          chartType: pref,
          labels: chart.tableRows.map((_, i) => String(i + 1)),
          datasets: [{ label: chart.title, data: ys }],
          tableColumns: void 0,
          tableRows: void 0,
          scatterPoints: void 0
        };
      }
    }
    return chart;
  }
  if (pref === "scatter") {
    if (chart.chartType === "line" || chart.chartType === "bar") {
      const ds0 = chart.datasets[0];
      const labels = chart.labels;
      const vals = ds0?.data ?? [];
      const xLabel = chart.xAxisLabel || "\u5E8F\u53F7";
      const yLabel = String(ds0?.label ?? chart.yAxisLabel ?? "\u503C");
      return {
        ...chart,
        chartType: "table",
        labels: [],
        datasets: [],
        tableColumns: [xLabel, yLabel],
        tableRows: labels.map((l, i) => {
          const v = vals[i];
          const y = v === null || v === void 0 ? "" : formatChartTableNumber(Number(v));
          return [String(l), y];
        }),
        scatterPoints: void 0,
        xAxisLabel: chart.xAxisLabel,
        yAxisLabel: chart.yAxisLabel
      };
    }
    return chart;
  }
  if ((chart.chartType === "line" || chart.chartType === "bar") && (pref === "line" || pref === "bar")) {
    return { ...chart, chartType: pref };
  }
  return chart;
}
function mergeLineChartSpecs(charts) {
  const lines = charts.filter((c) => c.chartType === "line" && c.datasets.length === 1);
  if (lines.length < 2) {
    return charts;
  }
  const nonLine = charts.filter((c) => !lines.includes(c));
  const allLabels = [...new Set(lines.flatMap((c) => c.labels))].sort();
  const datasets = lines.map((c) => {
    const map2 = new Map(c.labels.map((l, i) => [l, c.datasets[0].data[i]]));
    return {
      label: c.title.replace(/^指标:\s*/, "") || c.datasets[0].label,
      data: allLabels.map((l) => {
        const v = map2.get(l);
        return v === void 0 ? null : v;
      })
    };
  });
  const merged = {
    title: "\u591A\u6307\u6807\u5BF9\u6BD4",
    chartType: "line",
    labels: allLabels,
    datasets,
    xAxisLabel: lines[0].xAxisLabel,
    yAxisLabel: lines[0].yAxisLabel
  };
  return [...nonLine, merged];
}
function mergeChartPrefsForLatestData(prefs, latest) {
  if (latest.length < 2) {
    return prefs;
  }
  const tk = findTimeColumn(latest);
  if (!tk) {
    return prefs;
  }
  const distinctTimes = new Set(
    latest.map((r) => {
      const v = r[tk];
      return v === null || v === void 0 ? "" : String(v);
    })
  );
  if (distinctTimes.size < 2) {
    return prefs;
  }
  const out = { ...prefs, timeRangeQuery: true };
  if (prefs.chartType !== "bar" && prefs.chartType !== "scatter") {
    out.chartType = prefs.chartType ?? "line";
  }
  return out;
}
function buildFetchDataChartsPayload(rawToolResult, userQuestion) {
  const prefs = parseChartPreferencesFromQuestion(userQuestion ?? "");
  const capCharts = Math.min(MAX_CHARTS, prefs.maxCharts ?? MAX_CHARTS);
  const trimmed = rawToolResult.trim();
  if (!trimmed.startsWith("{")) {
    return void 0;
  }
  let root;
  try {
    root = JSON.parse(trimmed);
  } catch {
    return void 0;
  }
  if (root.ok !== true) {
    return void 0;
  }
  if (root.multi_query === true && Array.isArray(root.sub_results)) {
    const subs = root.sub_results;
    const mergedCharts = [];
    for (const sub of subs) {
      if (mergedCharts.length >= capCharts) {
        break;
      }
      const subData = sub.data;
      const subQ = String(sub.sub_question ?? userQuestion ?? "");
      if (!subData || typeof subData !== "object") {
        continue;
      }
      const fakeRoot = {
        ok: true,
        data: subData,
        intent: root.intent,
        routing: root.routing
      };
      const subPayload = buildFetchDataChartsPayload(JSON.stringify(fakeRoot), subQ);
      const subCharts = subPayload?.charts ?? [];
      for (const c of subCharts) {
        if (mergedCharts.length >= capCharts) {
          break;
        }
        mergedCharts.push(c);
      }
    }
    return mergedCharts.length ? finalizeCharts(mergedCharts.slice(0, capCharts), { ...prefs, splitByMetric: true }, capCharts) : void 0;
  }
  const data = root.data;
  if (!data || typeof data !== "object") {
    return void 0;
  }
  const charts = [];
  const ts = asRowArray(data.metric_time_series);
  const latest = asRowArray(data.latest_data);
  const chartPrefs = mergeChartPrefsForLatestData(prefs, latest);
  const metricKeys = root.intent?.metric_keys;
  const metricKeyList = Array.isArray(metricKeys) ? metricKeys.filter((x) => typeof x === "string") : [];
  if (ts.length > 0) {
    let gk = findGroupKey(ts);
    if (chartPrefs.splitByMetric === true && !gk) {
      gk = findSplitMetricKey(ts);
    }
    if (gk) {
      const byGroup = /* @__PURE__ */ new Map();
      for (const row of ts) {
        const g = String(row[gk] ?? "default");
        if (!byGroup.has(g)) {
          byGroup.set(g, []);
        }
        byGroup.get(g).push(row);
      }
      const groupNames = [...byGroup.keys()].sort();
      const orderedGroups = metricKeyList.length > 0 ? metricKeyList.filter((m) => byGroup.has(m)).concat(groupNames.filter((g) => !metricKeyList.includes(g))) : groupNames;
      for (const g of orderedGroups) {
        if (charts.length >= capCharts) {
          break;
        }
        const groupRows = byGroup.get(g);
        if (!groupRows?.length) {
          continue;
        }
        const timeKey = findTimeColumn(groupRows);
        const valKey = findValueColumn(groupRows);
        if (!timeKey || !valKey) {
          continue;
        }
        const lineSpecs = buildLineChartFromRows(groupRows, timeKey, valKey, `\u6307\u6807: ${g}`);
        for (const spec of lineSpecs) {
          if (charts.length >= capCharts) {
            break;
          }
          charts.push(spec);
        }
      }
    } else {
      const timeKey = findTimeColumn(ts);
      const valKey = findValueColumn(ts);
      if (timeKey && valKey) {
        const lineSpecs = buildLineChartFromRows(ts, timeKey, valKey, "metric_time_series");
        for (const spec of lineSpecs) {
          if (charts.length >= capCharts) {
            break;
          }
          charts.push(spec);
        }
      }
    }
  }
  if (charts.length >= capCharts) {
    return finalizeCharts(charts.slice(0, capCharts), chartPrefs, capCharts);
  }
  if (latest.length > 0 && charts.length < capCharts) {
    const groupedBars = tryBuildLatestGroupedBarCharts(latest, capCharts - charts.length, chartPrefs);
    if (groupedBars.length > 0) {
      charts.push(...groupedBars);
    } else {
      const catKey = findCategoryColumn(latest);
      const valKey = findValueColumn(latest);
      const timeKey = findTimeColumn(latest);
      if (catKey && valKey && catKey !== valKey) {
        if (chartPrefs.timeRangeQuery && timeKey && timeKey !== valKey) {
          const lineSpecs = buildLineChartFromRows(latest, timeKey, valKey, `${catKey} vs ${valKey}`);
          for (const lineSpec of lineSpecs) {
            if (charts.length >= capCharts) {
              break;
            }
            charts.push(lineSpec);
          }
        } else {
          const slice = latest.slice(0, MAX_POINTS);
          const labels = slice.map((r) => String(r[catKey] ?? "").slice(0, 40));
          const values = slice.map((r) => parseNumber(r[valKey])).map((v) => v === void 0 ? 0 : v);
          if (labels.some(Boolean)) {
            charts.push({
              title: `${catKey} vs ${valKey}`,
              chartType: "bar",
              labels,
              datasets: [{ label: valKey, data: values }],
              xAxisLabel: friendlyAxisName(catKey),
              yAxisLabel: friendlyAxisName(valKey)
            });
          }
        }
      } else if (timeKey && valKey && !charts.some((c) => c.title.includes("latest_data"))) {
        const sorted = sortRowsByTime(latest, timeKey).slice(-MAX_POINTS);
        const labels = sorted.map((r) => labelForTime(r[timeKey]));
        const values = sorted.map((r) => parseNumber(r[valKey])).map((v) => v === void 0 ? 0 : v);
        if (labels.length) {
          charts.push({
            title: "latest_data (time series)",
            chartType: "line",
            labels,
            datasets: [{ label: valKey, data: values }],
            xAxisLabel: friendlyAxisName(timeKey),
            yAxisLabel: friendlyAxisName(valKey)
          });
        }
      } else {
        const pair = findTwoNumericColumns(latest);
        if (pair) {
          const [k1, k2] = pair;
          const pts = latest.slice(0, MAX_POINTS).map((r) => {
            const x = parseNumber(r[k1]);
            const y = parseNumber(r[k2]);
            if (x === void 0 || y === void 0) {
              return void 0;
            }
            return { x, y };
          }).filter((p) => p !== void 0);
          const xLab = friendlyAxisName(k1);
          const yLab = friendlyAxisName(k2);
          const title = `${k1} vs ${k2}`;
          if (pts.length >= 1) {
            charts.push({
              title,
              chartType: "table",
              labels: [],
              datasets: [],
              tableColumns: [xLab, yLab],
              tableRows: pts.map((p) => [formatChartTableNumber(p.x), formatChartTableNumber(p.y)]),
              xAxisLabel: xLab,
              yAxisLabel: yLab
            });
          }
        }
      }
    }
  }
  if (charts.length === 0) {
    return void 0;
  }
  return finalizeCharts(charts.slice(0, capCharts), chartPrefs, capCharts);
}
function finalizeCharts(charts, prefs, capCharts) {
  if (charts.length === 0) {
    return void 0;
  }
  let out = charts.slice(0, capCharts);
  if (prefs.splitByMetric === false && out.filter((c) => c.chartType === "line").length > 1) {
    out = mergeLineChartSpecs(out);
  }
  out = out.map((c) => lineChartWithAtMostThreePointsToTable(c));
  out = out.map((c) => applyChartTypePreference(c, prefs.chartType));
  return { charts: out.slice(0, capCharts) };
}

// src/orchestration/assistantOrchestrator.ts
function extractQuestionForCharts(args) {
  const q = args.question ?? args.query ?? args.input ?? args.text;
  return typeof q === "string" ? q : "";
}
var AssistantOrchestrator = class {
  constructor(settings, secrets, mcp, output) {
    this.settings = settings;
    this.secrets = secrets;
    this.mcp = mcp;
    this.output = output;
  }
  settings;
  secrets;
  mcp;
  output;
  async ask(userText, conversationContext = [], options = {}) {
    if (!this.mcp.isConnected()) {
      throw new Error("MCP server is not connected. Please connect first.");
    }
    if (this.settings.llm.provider === "copilot") {
      throw new Error("Copilot mode is reserved for a later version. Use openai-compatible for the MVP.");
    }
    const allTools = this.mcp.getCachedTools();
    const allToolNames = allTools.map((tool) => tool.name);
    const preferredToolNames = this.resolvePreferredTools(userText, options.preferredTools, allToolNames);
    let activeTools = preferredToolNames.length > 0 ? allTools.filter((tool) => preferredToolNames.includes(tool.name)) : allTools;
    const explicitLoginToolSelected = preferredToolNames.some((name) => /oem.*login|login.*oem/i.test(name));
    const loginIntent = this.shouldForceOemLoginFirst(userText, allToolNames);
    if (!explicitLoginToolSelected && !loginIntent) {
      activeTools = activeTools.filter((tool) => !/oem.*login|login.*oem/i.test(tool.name));
    }
    const oemPassword = await this.secrets.getOemPassword();
    const chainedToolResult = await this.tryRunPreferredToolChain(
      userText,
      preferredToolNames,
      allToolNames,
      {
        oemBaseUrl: this.settings.oem.baseUrl,
        oemUsername: this.settings.oem.username,
        oemPassword
      },
      options.oemSessionId
    );
    if (chainedToolResult) {
      return chainedToolResult;
    }
    const directLoginResult = await this.tryHandleDirectOemLogin(
      userText,
      allToolNames,
      {
        oemBaseUrl: this.settings.oem.baseUrl,
        oemUsername: this.settings.oem.username,
        oemPassword
      },
      preferredToolNames
    );
    if (directLoginResult) {
      return directLoginResult;
    }
    const apiKey = await this.secrets.getLlmApiKey();
    if (!apiKey) {
      throw new Error("LLM API key is not configured. Run: OEM Assistant: Set LLM API Key");
    }
    const llm = new OpenAiCompatibleLlmService(
      this.settings.llm.baseUrl,
      apiKey,
      this.settings.llm.model,
      this.settings.llm.temperature
    );
    const toolSpecs = activeTools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description ?? "MCP tool",
        parameters: tool.inputSchema ?? {
          type: "object",
          properties: {}
        }
      }
    }));
    const hasOemCredentials = Boolean(this.settings.oem.baseUrl && this.settings.oem.username && oemPassword);
    const forceAskOps = this.shouldForceAskOps(userText, allToolNames);
    const askOpsExists = allToolNames.includes("ask_ops");
    const systemPrompt = [
      "You are a focused alert operations assistant.",
      "Use MCP tools when you need live alert data or operational actions.",
      "For destructive or risky actions, explain intent clearly before taking action.",
      "Never expose secrets, passwords, tokens, usernames, or private endpoints in your final response.",
      hasOemCredentials ? "OEM credentials are already configured in extension settings. For OEM login requests, call login tool directly without asking credentials again." : "OEM credentials are incomplete. If login is requested, ask user to complete OEM settings first.",
      preferredToolNames.length > 0 ? `User explicitly selected tools: ${preferredToolNames.join(", ")}. Only use these tools unless absolutely impossible.` : "",
      forceAskOps && askOpsExists ? "This request is an alert diagnosis request. You MUST call ask_ops before providing any conclusion." : "",
      askOpsExists ? "If ask_ops result says SOP is not found (or equivalent), do not generate your own diagnosis. Reply that SOP is missing and ask user to\u5B8C\u5584\u77E5\u8BC6\u5E93/SOP." : "",
      this.mcp.getInstructions()
    ].filter(Boolean).join("\n\n");
    const shouldForceOemLogin = loginIntent;
    const normalizedUserText = shouldForceOemLogin ? `${userText}

\u8BF7\u5148\u8C03\u7528 OEM \u767B\u5F55\u5DE5\u5177\u5B8C\u6210\u4F1A\u8BDD\u5EFA\u7ACB\uFF0C\u7136\u540E\u518D\u7EE7\u7EED\u540E\u7EED\u4EFB\u52A1\uFF0C\u4E0D\u8981\u91CD\u590D\u8981\u6C42\u7528\u6237\u8F93\u5165 OEM \u8D26\u53F7\u5BC6\u7801\u3002` : userText;
    const steps = [];
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationContext,
      { role: "user", content: normalizedUserText }
    ];
    for (let round = 0; round < this.settings.ui.maxToolRounds; round += 1) {
      const llmReply = await llm.complete(messages, toolSpecs);
      this.output.appendLine(`[LLM] round=${round + 1} tool_calls=${llmReply.tool_calls?.length ?? 0}`);
      messages.push({
        role: "assistant",
        content: llmReply.content ?? "",
        tool_calls: llmReply.tool_calls
      });
      if (!llmReply.tool_calls || llmReply.tool_calls.length === 0) {
        if (forceAskOps && askOpsExists && !this.hasAskOpsExecution(steps)) {
          const detail = "\u8BE5\u95EE\u9898\u5C5E\u4E8E\u544A\u8B66\u8BCA\u65AD\uFF0C\u5FC5\u987B\u5148\u8C03\u7528 ask_ops \u5DE5\u5177\u3002\u8BF7\u5728\u63D0\u95EE\u4E2D\u663E\u5F0F\u4F7F\u7528 @ask_ops \u540E\u91CD\u8BD5\u3002";
          steps.push({ type: "error", title: "Missing required tool call", detail });
          return { finalText: detail, steps };
        }
        const reply = this.stripSqlExecutionTraceFromReportText(
          this.redactSensitiveText(llmReply.content ?? "(empty response)")
        );
        steps.push({
          type: "info",
          title: "Final answer",
          detail: reply
        });
        return {
          finalText: reply,
          steps
        };
      }
      for (const toolCall of llmReply.tool_calls) {
        const toolName = toolCall.function.name;
        const rawArgs = toolCall.function.arguments || "{}";
        let parsedArgs;
        try {
          parsedArgs = JSON.parse(rawArgs);
        } catch {
          parsedArgs = { raw: rawArgs };
        }
        const resolvedArgs = this.resolveToolArgs(toolName, parsedArgs, {
          oemBaseUrl: this.settings.oem.baseUrl,
          oemUsername: this.settings.oem.username,
          oemPassword
        }, options.oemSessionId);
        steps.push({
          type: "tool-call",
          title: `Tool call: ${toolName}`,
          detail: this.redactSensitiveText(JSON.stringify(resolvedArgs, null, 2))
        });
        const toolResult = await this.mcp.callTool(toolName, resolvedArgs);
        const toolResultForLlm = this.prepareToolResultContentForLlm(toolResult);
        const toolResultDisplay = this.redactSensitiveText(this.formatToolResultForExecutionTrace(toolResult));
        const resultStep = {
          type: "tool-result",
          title: `Tool result: ${toolName}`,
          detail: toolResultDisplay
        };
        if (toolName === "fetch_data_from_oem") {
          const fc = buildFetchDataChartsPayload(toolResult, extractQuestionForCharts(resolvedArgs));
          if (fc?.charts?.length) {
            resultStep.fetchCharts = fc;
          }
        }
        steps.push(resultStep);
        if (toolName === "ask_ops" && this.indicatesNoSop(toolResult)) {
          const noSopMessage = "\u672A\u627E\u5230\u5339\u914D\u7684 SOP\uFF0C\u5DF2\u505C\u6B62\u81EA\u52A8\u89E3\u7B54\u3002\u8BF7\u5148\u8865\u5145/\u66F4\u65B0 SOP \u540E\u518D\u91CD\u8BD5\u3002";
          steps.push({
            type: "info",
            title: "SOP not found",
            detail: noSopMessage
          });
          return {
            finalText: noSopMessage,
            steps
          };
        }
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolName,
          content: toolResultForLlm
        });
      }
    }
    const overflowMessage = "Tool round limit reached. Please refine the question or reduce tool chaining.";
    steps.push({
      type: "error",
      title: "Stopped",
      detail: overflowMessage
    });
    return {
      finalText: overflowMessage,
      steps
    };
  }
  resolvePreferredTools(userText, preferredTools, allTools) {
    const mentionOrder = this.extractMentionedToolsInOrder(userText, allTools);
    if (mentionOrder.length > 0) {
      return mentionOrder;
    }
    return this.normalizePreferredTools(preferredTools, allTools);
  }
  extractMentionedToolsInOrder(userText, allTools) {
    const allowed = new Set(allTools);
    const ordered = [];
    const seen = /* @__PURE__ */ new Set();
    for (const match of userText.matchAll(/@([a-zA-Z0-9_:-]+)/g)) {
      const name = match[1];
      if (!name || !allowed.has(name) || seen.has(name)) {
        continue;
      }
      seen.add(name);
      ordered.push(name);
    }
    return ordered;
  }
  normalizePreferredTools(preferredTools, allTools) {
    if (!preferredTools?.length) {
      return [];
    }
    const allowed = new Set(allTools);
    return preferredTools.map((name) => name.trim()).filter(Boolean).filter((name) => allowed.has(name));
  }
  async tryRunPreferredToolChain(userText, preferredToolNames, allToolNames, creds, sessionIdFromContext) {
    if (preferredToolNames.length < 1) {
      return void 0;
    }
    const available = new Set(allToolNames);
    const steps = [];
    let lastResult = "";
    const chainContext = {};
    const authContext = this.buildToolAuthContext(creds, sessionIdFromContext);
    for (const toolName of preferredToolNames) {
      if (!available.has(toolName)) {
        return {
          finalText: `\u5DE5\u5177 ${toolName} \u4E0D\u5B58\u5728\u6216\u5F53\u524D\u4E0D\u53EF\u7528\uFF0C\u8BF7\u5148\u5237\u65B0 MCP \u5DE5\u5177\u5217\u8868\u540E\u91CD\u8BD5\u3002`,
          steps
        };
      }
      let args = this.buildDefaultToolArgs(userText, {
        ...authContext,
        ...chainContext
      });
      if (/oem.*login|login.*oem/i.test(toolName)) {
        if (!creds.oemBaseUrl || !creds.oemUsername || !creds.oemPassword) {
          return {
            finalText: "OEM \u51ED\u636E\u672A\u914D\u7F6E\u5B8C\u6574\u3002\u8BF7\u5148\u5728 Settings \u4E2D\u8865\u5168 OEM \u5730\u5740\u3001\u8D26\u53F7\u4E0E\u5BC6\u7801\u3002",
            steps
          };
        }
        args = this.resolveToolArgs(toolName, {}, creds);
      }
      steps.push({
        type: "tool-call",
        title: `Tool call: ${toolName}`,
        detail: this.redactSensitiveText(JSON.stringify(args, null, 2))
      });
      try {
        lastResult = await this.mcp.callTool(toolName, args);
      } catch (error2) {
        const message = error2 instanceof Error ? error2.message : String(error2);
        steps.push({
          type: "error",
          title: `Tool failed: ${toolName}`,
          detail: this.redactSensitiveText(message)
        });
        return {
          finalText: `\u5DE5\u5177 ${toolName} \u6267\u884C\u5931\u8D25\uFF0C\u540E\u7EED\u94FE\u8DEF\u5DF2\u505C\u6B62\u3002\u8BF7\u5148\u6EE1\u8DB3\u8BE5\u5DE5\u5177\u6267\u884C\u6761\u4EF6\u540E\u518D\u7EE7\u7EED\u3002`,
          steps
        };
      }
      const safeResult = this.redactSensitiveText(this.formatToolResultForExecutionTrace(lastResult));
      const chainResultStep = {
        type: "tool-result",
        title: `Tool result: ${toolName}`,
        detail: safeResult
      };
      if (toolName === "fetch_data_from_oem") {
        const fc = buildFetchDataChartsPayload(lastResult, extractQuestionForCharts(args));
        if (fc?.charts?.length) {
          chainResultStep.fetchCharts = fc;
        }
      }
      steps.push(chainResultStep);
      const sessionId = this.tryExtractSessionId(lastResult);
      if (sessionId) {
        chainContext.session_id = sessionId;
        chainContext.sessionId = sessionId;
      }
      if (this.looksLikePrerequisiteFailure(lastResult)) {
        return {
          finalText: `\u5DE5\u5177 ${toolName} \u672A\u6EE1\u8DB3\u524D\u7F6E\u6761\u4EF6\uFF0C\u5DF2\u6309\u987A\u5E8F\u505C\u6B62\u540E\u7EED @ \u547D\u4EE4\u3002\u8BF7\u6839\u636E\u8FD4\u56DE\u4FE1\u606F\u5148\u5B8C\u6210\u524D\u7F6E\u6761\u4EF6\u540E\u518D\u7EE7\u7EED\u3002`,
          steps
        };
      }
    }
    const rawChainFinal = this.formatToolResultForDisplay(lastResult || "").trim() || lastResult || "\u5DF2\u6309\u987A\u5E8F\u5B8C\u6210\u6240\u6709 @ \u5DE5\u5177\u8C03\u7528\u3002";
    const chainFinal = this.stripSqlExecutionTraceFromReportText(rawChainFinal);
    return {
      finalText: this.redactSensitiveText(chainFinal),
      steps
    };
  }
  buildDefaultToolArgs(userText, chainContext) {
    const normalizedText = userText.replace(/@[a-zA-Z0-9_:-]+\s*/g, "").trim() || userText;
    return {
      query: normalizedText,
      question: normalizedText,
      input: normalizedText,
      text: normalizedText,
      ...chainContext
    };
  }
  buildToolAuthContext(creds, sessionId) {
    const context = {};
    if (sessionId) {
      context.session_id = sessionId;
      context.sessionId = sessionId;
    }
    if (creds.oemBaseUrl) {
      context.oem_base_url = creds.oemBaseUrl;
      context.base_url = creds.oemBaseUrl;
      context.baseUrl = creds.oemBaseUrl;
    }
    if (creds.oemUsername) {
      context.username = creds.oemUsername;
      context.user = creds.oemUsername;
      context.account = creds.oemUsername;
    }
    if (creds.oemPassword) {
      context.password = creds.oemPassword;
      context.pass = creds.oemPassword;
      context.pwd = creds.oemPassword;
    }
    return context;
  }
  tryExtractSessionId(toolResult) {
    try {
      const parsed = JSON.parse(toolResult);
      const direct = parsed.session_id ?? parsed.sessionId;
      if (typeof direct === "string" && direct.trim()) {
        return direct.trim();
      }
    } catch {
    }
    const regexMatch = /"session_id"\s*:\s*"([^"]+)"/i.exec(toolResult);
    if (regexMatch?.[1]) {
      return regexMatch[1];
    }
    return void 0;
  }
  looksLikePrerequisiteFailure(toolResult) {
    const normalized = toolResult.toLowerCase();
    return normalized.includes('"ok": false') || normalized.includes('"success": false') || normalized.includes("not login") || normalized.includes("\u672A\u767B\u5F55") || normalized.includes("\u8BF7\u5148") || normalized.includes("\u9700\u8981\u5148") || normalized.includes("missing required") || normalized.includes("\u524D\u7F6E\u6761\u4EF6");
  }
  shouldForceAskOps(userText, toolNames) {
    if (!toolNames.includes("ask_ops")) {
      return false;
    }
    const normalized = userText.toLowerCase();
    const hasAlertKeyword = normalized.includes("\u544A\u8B66") || normalized.includes("alert") || normalized.includes("alarm") || normalized.includes("cpu") || normalized.includes("io");
    const hasDiagnosisKeyword = normalized.includes("\u8BCA\u65AD") || normalized.includes("\u5206\u6790") || normalized.includes("\u5904\u7F6E") || normalized.includes("\u5904\u7406");
    return hasAlertKeyword && hasDiagnosisKeyword;
  }
  hasAskOpsExecution(steps) {
    return steps.some((step) => step.type === "tool-call" && step.title.includes("ask_ops"));
  }
  indicatesNoSop(toolResult) {
    const normalized = toolResult.toLowerCase();
    return normalized.includes("no sop") || normalized.includes("sop not found") || normalized.includes("\u672A\u627E\u5230sop") || normalized.includes("\u6CA1\u6709sop") || normalized.includes("\u672A\u5339\u914D\u5230sop");
  }
  shouldForceOemLoginFirst(userText, toolNames) {
    const normalized = userText.toLowerCase();
    const isLoginIntent = normalized.includes("\u767B\u5F55oem") || normalized.includes("\u767B\u9646oem") || normalized.includes("login oem") || normalized.includes("oem login") || normalized.includes("@oem_login") || normalized.includes("oem_login") || normalized === "\u767B\u5F55";
    if (!isLoginIntent) {
      return false;
    }
    return toolNames.some((name) => /oem.*login|login.*oem/i.test(name));
  }
  async tryHandleDirectOemLogin(userText, toolNames, creds, preferredToolNames) {
    const normalized = userText.trim().toLowerCase();
    const mentionedLoginTool = preferredToolNames.find((name) => /oem.*login|login.*oem/i.test(name));
    const loginToolName = mentionedLoginTool ?? toolNames.find((name) => /oem.*login|login.*oem/i.test(name));
    const isDirectLoginRequest = normalized === "\u767B\u5F55" || normalized === "\u767B\u5F55oem" || normalized === "\u767B\u9646oem" || normalized === "login oem" || normalized === "oem login" || normalized.includes("@oem_login") || normalized.includes(" oem_login") || Boolean(mentionedLoginTool);
    if (!isDirectLoginRequest) {
      return void 0;
    }
    if (!loginToolName) {
      return {
        finalText: "\u672A\u53D1\u73B0\u53EF\u7528\u7684 OEM \u767B\u5F55\u5DE5\u5177\uFF08\u5982 oem_login\uFF09\uFF0C\u8BF7\u5148\u786E\u8BA4 MCP Server \u662F\u5426\u5DF2\u66B4\u9732\u767B\u5F55\u5DE5\u5177\u3002",
        steps: []
      };
    }
    if (!creds.oemBaseUrl || !creds.oemUsername || !creds.oemPassword) {
      return {
        finalText: "OEM \u51ED\u636E\u672A\u914D\u7F6E\u5B8C\u6574\u3002\u8BF7\u5728 OEM Assistant Settings \u4E2D\u586B\u5199 OEM \u5730\u5740\u3001\u8D26\u53F7\u548C\u5BC6\u7801\u540E\u91CD\u8BD5\u3002",
        steps: []
      };
    }
    const args = this.resolveToolArgs(loginToolName, {}, creds);
    const toolResult = await this.mcp.callTool(loginToolName, args);
    return {
      finalText: this.redactSensitiveText(`\u5DF2\u4F7F\u7528 Settings \u4E2D\u4FDD\u5B58\u7684 OEM \u51ED\u636E\u6267\u884C\u767B\u5F55\u3002${toolResult}`),
      steps: [
        {
          type: "tool-call",
          title: `Tool call: ${loginToolName}`,
          detail: this.redactSensitiveText(JSON.stringify(args, null, 2))
        },
        {
          type: "tool-result",
          title: `Tool result: ${loginToolName}`,
          detail: this.redactSensitiveText(this.formatToolResultForExecutionTrace(toolResult))
        }
      ]
    };
  }
  resolveToolArgs(toolName, args, creds, sessionId) {
    const updated = { ...args };
    const authContext = this.buildToolAuthContext(creds, sessionId);
    Object.assign(updated, authContext);
    if (!/oem.*login|login.*oem/i.test(toolName)) {
      return updated;
    }
    if (creds.oemBaseUrl) {
      updated.oem_base_url = creds.oemBaseUrl;
      updated.base_url = creds.oemBaseUrl;
      updated.baseUrl = creds.oemBaseUrl;
    }
    if (creds.oemUsername) {
      updated.username = creds.oemUsername;
      updated.user = creds.oemUsername;
      updated.account = creds.oemUsername;
    }
    if (creds.oemPassword) {
      updated.password = creds.oemPassword;
      updated.pass = creds.oemPassword;
      updated.pwd = creds.oemPassword;
    }
    return updated;
  }
  /**
   * 从报告正文中移除「SQL 执行追踪」整段（保留至「状态」前），供 Assistant 回复与 LLM 上下文使用；
   * Tool Execution Trace 使用 formatToolResultForExecutionTrace 的完整 report（含 SQL）。
   */
  stripSqlExecutionTraceFromReportText(text) {
    const t = String(text ?? "");
    if (!t.includes("\u3010SQL \u6267\u884C\u8FFD\u8E2A\u3011")) {
      return t;
    }
    if (/\n【状态】/.test(t)) {
      return t.replace(/\n?【SQL 执行追踪】[\s\S]*?(?=\n【状态】)/, "");
    }
    return t.replace(/\n?【SQL 执行追踪】[\s\S]*$/, "").trimEnd();
  }
  /**
   * JSON 工具结果中去掉 report 里的 SQL 追踪段再交给 LLM，避免模型在最终回答中复述 SQL。
   */
  prepareToolResultContentForLlm(raw) {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("{")) {
      return this.redactSensitiveText(raw);
    }
    try {
      const obj = JSON.parse(trimmed);
      if (typeof obj.report === "string") {
        const report = this.stripSqlExecutionTraceFromReportText(obj.report);
        return this.redactSensitiveText(JSON.stringify({ ...obj, report }));
      }
    } catch {
    }
    return this.redactSensitiveText(raw);
  }
  /**
   * Tool Execution Trace：始终优先展示完整 `report`（含【SQL 执行追踪】），不改为仅 llm_summary。
   * 若无 `report` 则回退为格式化后的整段 JSON，避免 Trace 中丢失字段。
   */
  formatToolResultForExecutionTrace(raw) {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("{")) {
      return raw;
    }
    try {
      const obj = JSON.parse(trimmed);
      if (typeof obj.report === "string" && obj.report.trim().length > 0) {
        return obj.report.trim();
      }
      return JSON.stringify(obj, null, 2);
    } catch {
      return raw;
    }
  }
  /**
   * 主回答区 / 链式最终正文：有 llm_summary 时优先短摘要；否则用 report。
   */
  formatToolResultForDisplay(raw) {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("{")) {
      return raw;
    }
    try {
      const obj = JSON.parse(trimmed);
      if (typeof obj.llm_summary === "string" && obj.llm_summary.trim().length > 0) {
        return obj.llm_summary.trim();
      }
      if (typeof obj.report === "string" && obj.report.trim().length > 0) {
        return obj.report.trim();
      }
    } catch {
    }
    return raw;
  }
  redactSensitiveText(input) {
    let s = String(input ?? "");
    s = s.replace(/"password"\s*:\s*"[^"]*"/gi, '"password": "***"');
    s = s.replace(/"pass"\s*:\s*"[^"]*"/gi, '"pass": "***"');
    s = s.replace(/"pwd"\s*:\s*"[^"]*"/gi, '"pwd": "***"');
    return s.replace(/(password\s*[=:]\s*)([^\s,\n]+)/gi, "$1***").replace(/(密码\s*[：:=]\s*)([^\s,\n]+)/g, "$1***").replace(/(username\s*[=:]\s*)([^\s,\n]+)/gi, "$1***").replace(/(用户名\s*[：:=]\s*)([^\s,\n]+)/g, "$1***").replace(/(https?:\/\/[^\s]*\/em\/api)/gi, "[OEM_API_REDACTED]");
  }
};

// src/services/conversationStore.ts
var vscode2 = __toESM(require("vscode"));
var import_node_crypto = require("node:crypto");
var OEM_CONVERSATIONS_STORAGE_KEY = "oemAssistant.conversations.v1";
var RAG_CONVERSATIONS_STORAGE_KEY = "oemAssistant.ragConversations.v1";
function now() {
  return Date.now();
}
function messagesToChatTurns(messages) {
  const turns = [];
  for (const m of messages) {
    if (m.kind === "user") {
      turns.push({ role: "user", content: m.text });
    } else if (m.kind === "assistant") {
      turns.push({ role: "assistant", content: m.result.finalText });
    }
  }
  return turns;
}
var ConversationStore = class {
  constructor(context, storageKey = OEM_CONVERSATIONS_STORAGE_KEY) {
    this.context = context;
    this.storageKey = storageKey;
  }
  context;
  storageKey;
  load() {
    const raw = this.context.globalState.get(this.storageKey);
    if (raw && Array.isArray(raw.conversations)) {
      return {
        conversations: raw.conversations,
        activeId: raw.activeId ?? null
      };
    }
    return { conversations: [], activeId: null };
  }
  save(state) {
    try {
      void this.context.globalState.update(this.storageKey, state);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      void vscode2.window.showErrorMessage(
        `OEM Assistant: \u4F1A\u8BDD\u4FDD\u5B58\u5931\u8D25\uFF08\u82E5\u8D85\u8FC7 VS Code globalState \u5355\u952E\u4E0A\u9650\u4F1A\u51FA\u73B0\u6B64\u9519\u8BEF\uFF09\u3002${msg}`
      );
    }
  }
  ensureAtLeastOneConversation() {
    const state = this.load();
    if (state.conversations.length === 0) {
      const snap = this.createSnapshotNew();
      state.conversations.push(snap);
      state.activeId = snap.meta.id;
      this.save(state);
      return snap;
    }
    if (!state.activeId || !state.conversations.some((c) => c.meta.id === state.activeId)) {
      state.activeId = state.conversations[0]?.meta.id ?? null;
      this.save(state);
    }
    return state.conversations.find((c) => c.meta.id === state.activeId);
  }
  createSnapshotNew() {
    const id = (0, import_node_crypto.randomUUID)();
    const t = now();
    return {
      meta: {
        id,
        title: `\u4F1A\u8BDD ${new Date(t).toLocaleString()}`,
        updatedAt: t
      },
      messages: []
    };
  }
  getBootstrapPayload() {
    const state = this.load();
    this.ensureActiveValid(state);
    const activeId = state.activeId;
    const active = state.conversations.find((c) => c.meta.id === activeId);
    return {
      items: state.conversations.map((c) => ({ ...c.meta })).sort((a, b) => b.updatedAt - a.updatedAt),
      activeId,
      activeMessages: active ? [...active.messages] : []
    };
  }
  ensureActiveValid(state) {
    if (state.conversations.length === 0) {
      const snap = this.createSnapshotNew();
      state.conversations.push(snap);
      state.activeId = snap.meta.id;
      this.save(state);
      return;
    }
    if (!state.activeId || !state.conversations.some((c) => c.meta.id === state.activeId)) {
      state.activeId = state.conversations[0].meta.id;
      this.save(state);
    }
  }
  getActiveId() {
    const state = this.load();
    this.ensureActiveValid(state);
    return state.activeId;
  }
  getConversation(id) {
    return this.load().conversations.find((c) => c.meta.id === id);
  }
  getMessagesForConversation(id) {
    const c = this.getConversation(id);
    return c ? [...c.messages] : [];
  }
  setActive(id) {
    const state = this.load();
    if (!state.conversations.some((c) => c.meta.id === id)) {
      return false;
    }
    state.activeId = id;
    this.save(state);
    return true;
  }
  createConversation() {
    const state = this.load();
    const snap = this.createSnapshotNew();
    state.conversations.push(snap);
    state.activeId = snap.meta.id;
    this.save(state);
    return snap;
  }
  renameConversation(id, title) {
    const state = this.load();
    const c = state.conversations.find((x) => x.meta.id === id);
    if (!c) {
      return false;
    }
    c.meta.title = title.trim() || c.meta.title;
    c.meta.updatedAt = now();
    this.save(state);
    return true;
  }
  deleteConversation(id) {
    const state = this.load();
    const idx = state.conversations.findIndex((c) => c.meta.id === id);
    if (idx < 0) {
      return { newActiveId: state.activeId };
    }
    state.conversations.splice(idx, 1);
    if (state.conversations.length === 0) {
      const snap = this.createSnapshotNew();
      state.conversations.push(snap);
      state.activeId = snap.meta.id;
      this.save(state);
      return { newActiveId: state.activeId };
    }
    if (state.activeId === id) {
      state.activeId = state.conversations[0].meta.id;
    }
    this.save(state);
    return { newActiveId: state.activeId };
  }
  appendUserMessage(conversationId, text, preferredTools) {
    const state = this.load();
    const c = state.conversations.find((x) => x.meta.id === conversationId);
    if (!c) {
      return;
    }
    const msg = {
      id: (0, import_node_crypto.randomUUID)(),
      kind: "user",
      createdAt: now(),
      text,
      preferredTools: preferredTools.length ? preferredTools : void 0
    };
    c.messages.push(msg);
    c.meta.updatedAt = now();
    this.save(state);
  }
  appendAssistantMessage(conversationId, result) {
    const state = this.load();
    const c = state.conversations.find((x) => x.meta.id === conversationId);
    if (!c) {
      return;
    }
    const msg = {
      id: (0, import_node_crypto.randomUUID)(),
      kind: "assistant",
      createdAt: now(),
      result: JSON.parse(JSON.stringify(result))
    };
    c.messages.push(msg);
    c.meta.updatedAt = now();
    this.save(state);
  }
  appendInfoMessage(conversationId, text) {
    const state = this.load();
    const c = state.conversations.find((x) => x.meta.id === conversationId);
    if (!c) {
      return;
    }
    const msg = {
      id: (0, import_node_crypto.randomUUID)(),
      kind: "info",
      createdAt: now(),
      text
    };
    c.messages.push(msg);
    c.meta.updatedAt = now();
    this.save(state);
  }
};

// src/services/secretStorageService.ts
var SecretStorageService = class _SecretStorageService {
  constructor(context) {
    this.context = context;
  }
  context;
  static LLM_API_KEY = "alertMcp.llm.apiKey";
  static MCP_BEARER_TOKEN = "alertMcp.mcp.bearerToken";
  static OEM_PASSWORD = "alertMcp.oem.password";
  static TAVILY_API_KEY = "alertMcp.rag.tavilyApiKey";
  async getLlmApiKey() {
    return this.context.secrets.get(_SecretStorageService.LLM_API_KEY);
  }
  async setLlmApiKey(value) {
    await this.context.secrets.store(_SecretStorageService.LLM_API_KEY, value);
  }
  async getMcpBearerToken() {
    return this.context.secrets.get(_SecretStorageService.MCP_BEARER_TOKEN);
  }
  async setMcpBearerToken(value) {
    await this.context.secrets.store(_SecretStorageService.MCP_BEARER_TOKEN, value);
  }
  async getOemPassword() {
    return this.context.secrets.get(_SecretStorageService.OEM_PASSWORD);
  }
  async setOemPassword(value) {
    await this.context.secrets.store(_SecretStorageService.OEM_PASSWORD, value);
  }
  async getTavilyApiKey() {
    return this.context.secrets.get(_SecretStorageService.TAVILY_API_KEY);
  }
  async setTavilyApiKey(value) {
    await this.context.secrets.store(_SecretStorageService.TAVILY_API_KEY, value);
  }
};

// src/services/settingsService.ts
var vscode3 = __toESM(require("vscode"));
var SettingsService = class {
  get() {
    const config2 = vscode3.workspace.getConfiguration("alertMcp");
    return {
      mcp: {
        serverUrl: config2.get("mcp.serverUrl", "http://127.0.0.1:3000/sse"),
        connectionMode: config2.get("mcp.connectionMode", "auto"),
        requestTimeoutMs: config2.get("mcp.requestTimeoutMs", 6e4)
      },
      llm: {
        provider: config2.get("llm.provider", "openai-compatible"),
        baseUrl: config2.get("llm.baseUrl", "https://api.deepseek.com"),
        model: config2.get("llm.model", "deepseek-chat"),
        temperature: config2.get("llm.temperature", 0.1)
      },
      ui: {
        maxToolRounds: config2.get("ui.maxToolRounds", 4),
        showFetchDataCharts: config2.get("ui.showFetchDataCharts", true)
      },
      oem: {
        baseUrl: config2.get("oem.baseUrl", ""),
        username: config2.get("oem.username", "")
      },
      rag: {
        searchTopK: config2.get("rag.searchTopK", 8),
        snippetMaxChars: config2.get("rag.snippetMaxChars", 6e3),
        fetchSnippetPages: config2.get("rag.fetchSnippetPages", 3)
      }
    };
  }
};

// node_modules/zod/v4/core/core.js
var NEVER = Object.freeze({
  status: "aborted"
});
// @__NO_SIDE_EFFECTS__
function $constructor(name, initializer3, params) {
  function init(inst, def) {
    if (!inst._zod) {
      Object.defineProperty(inst, "_zod", {
        value: {
          def,
          constr: _,
          traits: /* @__PURE__ */ new Set()
        },
        enumerable: false
      });
    }
    if (inst._zod.traits.has(name)) {
      return;
    }
    inst._zod.traits.add(name);
    initializer3(inst, def);
    const proto = _.prototype;
    const keys = Object.keys(proto);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!(k in inst)) {
        inst[k] = proto[k].bind(inst);
      }
    }
  }
  const Parent = params?.Parent ?? Object;
  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    var _a2;
    const inst = params?.Parent ? new Definition() : this;
    init(inst, def);
    (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
    for (const fn of inst._zod.deferred) {
      fn();
    }
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name);
    }
  });
  Object.defineProperty(_, "name", { value: name });
  return _;
}
var $ZodAsyncError = class extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
};
var $ZodEncodeError = class extends Error {
  constructor(name) {
    super(`Encountered unidirectional transform during encode: ${name}`);
    this.name = "ZodEncodeError";
  }
};
var globalConfig = {};
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}

// node_modules/zod/v4/core/util.js
var util_exports = {};
__export(util_exports, {
  BIGINT_FORMAT_RANGES: () => BIGINT_FORMAT_RANGES,
  Class: () => Class,
  NUMBER_FORMAT_RANGES: () => NUMBER_FORMAT_RANGES,
  aborted: () => aborted,
  allowsEval: () => allowsEval,
  assert: () => assert,
  assertEqual: () => assertEqual,
  assertIs: () => assertIs,
  assertNever: () => assertNever,
  assertNotEqual: () => assertNotEqual,
  assignProp: () => assignProp,
  base64ToUint8Array: () => base64ToUint8Array,
  base64urlToUint8Array: () => base64urlToUint8Array,
  cached: () => cached,
  captureStackTrace: () => captureStackTrace,
  cleanEnum: () => cleanEnum,
  cleanRegex: () => cleanRegex,
  clone: () => clone,
  cloneDef: () => cloneDef,
  createTransparentProxy: () => createTransparentProxy,
  defineLazy: () => defineLazy,
  esc: () => esc,
  escapeRegex: () => escapeRegex,
  extend: () => extend,
  finalizeIssue: () => finalizeIssue,
  floatSafeRemainder: () => floatSafeRemainder,
  getElementAtPath: () => getElementAtPath,
  getEnumValues: () => getEnumValues,
  getLengthableOrigin: () => getLengthableOrigin,
  getParsedType: () => getParsedType,
  getSizableOrigin: () => getSizableOrigin,
  hexToUint8Array: () => hexToUint8Array,
  isObject: () => isObject,
  isPlainObject: () => isPlainObject,
  issue: () => issue,
  joinValues: () => joinValues,
  jsonStringifyReplacer: () => jsonStringifyReplacer,
  merge: () => merge,
  mergeDefs: () => mergeDefs,
  normalizeParams: () => normalizeParams,
  nullish: () => nullish,
  numKeys: () => numKeys,
  objectClone: () => objectClone,
  omit: () => omit,
  optionalKeys: () => optionalKeys,
  parsedType: () => parsedType,
  partial: () => partial,
  pick: () => pick,
  prefixIssues: () => prefixIssues,
  primitiveTypes: () => primitiveTypes,
  promiseAllObject: () => promiseAllObject,
  propertyKeyTypes: () => propertyKeyTypes,
  randomString: () => randomString,
  required: () => required,
  safeExtend: () => safeExtend,
  shallowClone: () => shallowClone,
  slugify: () => slugify,
  stringifyPrimitive: () => stringifyPrimitive,
  uint8ArrayToBase64: () => uint8ArrayToBase64,
  uint8ArrayToBase64url: () => uint8ArrayToBase64url,
  uint8ArrayToHex: () => uint8ArrayToHex,
  unwrapMessage: () => unwrapMessage
});
function assertEqual(val) {
  return val;
}
function assertNotEqual(val) {
  return val;
}
function assertIs(_arg) {
}
function assertNever(_x) {
  throw new Error("Unexpected value in exhaustive check");
}
function assert(_) {
}
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values;
}
function joinValues(array2, separator = "|") {
  return array2.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter) {
  const set2 = false;
  return {
    get value() {
      if (!set2) {
        const value = getter();
        Object.defineProperty(this, "value", { value });
        return value;
      }
      throw new Error("cached value already set");
    }
  };
}
function nullish(input) {
  return input === null || input === void 0;
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepString = step.toString();
  let stepDecCount = (stepString.split(".")[1] || "").length;
  if (stepDecCount === 0 && /\d?e-\d?/.test(stepString)) {
    const match = stepString.match(/\d?e-(\d?)/);
    if (match?.[1]) {
      stepDecCount = Number.parseInt(match[1]);
    }
  }
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var EVALUATING = /* @__PURE__ */ Symbol("evaluating");
function defineLazy(object2, key, getter) {
  let value = void 0;
  Object.defineProperty(object2, key, {
    get() {
      if (value === EVALUATING) {
        return void 0;
      }
      if (value === void 0) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object2, key, {
        value: v
        // configurable: true,
      });
    },
    configurable: true
  });
}
function objectClone(obj) {
  return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function mergeDefs(...defs) {
  const mergedDescriptors = {};
  for (const def of defs) {
    const descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
function cloneDef(schema) {
  return mergeDefs(schema._zod.def);
}
function getElementAtPath(obj, path) {
  if (!path)
    return obj;
  return path.reduce((acc, key) => acc?.[key], obj);
}
function promiseAllObject(promisesObj) {
  const keys = Object.keys(promisesObj);
  const promises = keys.map((key) => promisesObj[key]);
  return Promise.all(promises).then((results) => {
    const resolvedObj = {};
    for (let i = 0; i < keys.length; i++) {
      resolvedObj[keys[i]] = results[i];
    }
    return resolvedObj;
  });
}
function randomString(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let str = "";
  for (let i = 0; i < length; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}
function esc(str) {
  return JSON.stringify(str);
}
function slugify(input) {
  return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
};
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
var allowsEval = cached(() => {
  if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
    return false;
  }
  try {
    const F = Function;
    new F("");
    return true;
  } catch (_) {
    return false;
  }
});
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === void 0)
    return true;
  if (typeof ctor !== "function")
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  return o;
}
function numKeys(data) {
  let keyCount = 0;
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      keyCount++;
    }
  }
  return keyCount;
}
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return "undefined";
    case "string":
      return "string";
    case "number":
      return Number.isNaN(data) ? "nan" : "number";
    case "boolean":
      return "boolean";
    case "function":
      return "function";
    case "bigint":
      return "bigint";
    case "symbol":
      return "symbol";
    case "object":
      if (Array.isArray(data)) {
        return "array";
      }
      if (data === null) {
        return "null";
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return "promise";
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return "map";
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return "set";
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return "date";
      }
      if (typeof File !== "undefined" && data instanceof File) {
        return "file";
      }
      return "object";
    default:
      throw new Error(`Unknown data type: ${t}`);
  }
};
var propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
var primitiveTypes = /* @__PURE__ */ new Set(["string", "number", "bigint", "boolean", "symbol", "undefined"]);
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== void 0) {
    if (params?.error !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function createTransparentProxy(getter) {
  let target;
  return new Proxy({}, {
    get(_, prop, receiver) {
      target ?? (target = getter());
      return Reflect.get(target, prop, receiver);
    },
    set(_, prop, value, receiver) {
      target ?? (target = getter());
      return Reflect.set(target, prop, value, receiver);
    },
    has(_, prop) {
      target ?? (target = getter());
      return Reflect.has(target, prop);
    },
    deleteProperty(_, prop) {
      target ?? (target = getter());
      return Reflect.deleteProperty(target, prop);
    },
    ownKeys(_) {
      target ?? (target = getter());
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(_, prop) {
      target ?? (target = getter());
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    defineProperty(_, prop, descriptor) {
      target ?? (target = getter());
      return Reflect.defineProperty(target, prop, descriptor);
    }
  });
}
function stringifyPrimitive(value) {
  if (typeof value === "bigint")
    return value.toString() + "n";
  if (typeof value === "string")
    return `"${value}"`;
  return `${value}`;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
  });
}
var NUMBER_FORMAT_RANGES = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-34028234663852886e22, 34028234663852886e22],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
var BIGINT_FORMAT_RANGES = {
  int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
  uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
};
function pick(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".pick() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = {};
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        newShape[key] = currDef.shape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function omit(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".omit() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = { ...schema._zod.def.shape };
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        delete newShape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function extend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to extend: expected a plain object");
  }
  const checks = schema._zod.def.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    const existingShape = schema._zod.def.shape;
    for (const key in shape) {
      if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) {
        throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
      }
    }
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone(schema, def);
}
function safeExtend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to safeExtend: expected a plain object");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone(schema, def);
}
function merge(a, b) {
  const def = mergeDefs(a._zod.def, {
    get shape() {
      const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    get catchall() {
      return b._zod.def.catchall;
    },
    checks: []
    // delete existing checks
  });
  return clone(a, def);
}
function partial(Class2, schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".partial() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in oldShape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = Class2 ? new Class2({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      } else {
        for (const key in oldShape) {
          shape[key] = Class2 ? new Class2({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function required(Class2, schema, mask) {
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = new Class2({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      } else {
        for (const key in oldShape) {
          shape[key] = new Class2({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    }
  });
  return clone(schema, def);
}
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a2;
    (_a2 = iss).path ?? (_a2.path = []);
    iss.path.unshift(path);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config2) {
  const full = { ...iss, path: iss.path ?? [] };
  if (!iss.message) {
    const message = unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
    full.message = message;
  }
  delete full.inst;
  delete full.continue;
  if (!ctx?.reportInput) {
    delete full.input;
  }
  return full;
}
function getSizableOrigin(input) {
  if (input instanceof Set)
    return "set";
  if (input instanceof Map)
    return "map";
  if (input instanceof File)
    return "file";
  return "unknown";
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function parsedType(data) {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "nan" : "number";
    }
    case "object": {
      if (data === null) {
        return "null";
      }
      if (Array.isArray(data)) {
        return "array";
      }
      const obj = data;
      if (obj && Object.getPrototypeOf(obj) !== Object.prototype && "constructor" in obj && obj.constructor) {
        return obj.constructor.name;
      }
    }
  }
  return t;
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}
function cleanEnum(obj) {
  return Object.entries(obj).filter(([k, _]) => {
    return Number.isNaN(Number.parseInt(k, 10));
  }).map((el) => el[1]);
}
function base64ToUint8Array(base643) {
  const binaryString = atob(base643);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
function uint8ArrayToBase64(bytes) {
  let binaryString = "";
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}
function base64urlToUint8Array(base64url3) {
  const base643 = base64url3.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - base643.length % 4) % 4);
  return base64ToUint8Array(base643 + padding);
}
function uint8ArrayToBase64url(bytes) {
  return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function hexToUint8Array(hex3) {
  const cleanHex = hex3.replace(/^0x/, "");
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}
function uint8ArrayToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
var Class = class {
  constructor(..._args) {
  }
};

// node_modules/zod/v4/core/errors.js
var initializer = (inst, def) => {
  inst.name = "$ZodError";
  Object.defineProperty(inst, "_zod", {
    value: inst._zod,
    enumerable: false
  });
  Object.defineProperty(inst, "issues", {
    value: def,
    enumerable: false
  });
  inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
  Object.defineProperty(inst, "toString", {
    value: () => inst.message,
    enumerable: false
  });
};
var $ZodError = $constructor("$ZodError", initializer);
var $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });
function flattenError(error2, mapper = (issue2) => issue2.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error2.issues) {
    if (sub.path.length > 0) {
      fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
      fieldErrors[sub.path[0]].push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error2, mapper = (issue2) => issue2.message) {
  const fieldErrors = { _errors: [] };
  const processError = (error3) => {
    for (const issue2 of error3.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues });
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues });
      } else if (issue2.path.length === 0) {
        fieldErrors._errors.push(mapper(issue2));
      } else {
        let curr = fieldErrors;
        let i = 0;
        while (i < issue2.path.length) {
          const el = issue2.path[i];
          const terminal = i === issue2.path.length - 1;
          if (!terminal) {
            curr[el] = curr[el] || { _errors: [] };
          } else {
            curr[el] = curr[el] || { _errors: [] };
            curr[el]._errors.push(mapper(issue2));
          }
          curr = curr[el];
          i++;
        }
      }
    }
  };
  processError(error2);
  return fieldErrors;
}

// node_modules/zod/v4/core/parse.js
var _parse = (_Err) => (schema, value, _ctx, _params) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  if (result.issues.length) {
    const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, _params?.callee);
    throw e;
  }
  return result.value;
};
var parse = /* @__PURE__ */ _parse($ZodRealError);
var _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  if (result.issues.length) {
    const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, params?.callee);
    throw e;
  }
  return result.value;
};
var parseAsync = /* @__PURE__ */ _parseAsync($ZodRealError);
var _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  return result.issues.length ? {
    success: false,
    error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);
var _encode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _parse(_Err)(schema, value, ctx);
};
var _decode = (_Err) => (schema, value, _ctx) => {
  return _parse(_Err)(schema, value, _ctx);
};
var _encodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _parseAsync(_Err)(schema, value, ctx);
};
var _decodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _parseAsync(_Err)(schema, value, _ctx);
};
var _safeEncode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _safeParse(_Err)(schema, value, ctx);
};
var _safeDecode = (_Err) => (schema, value, _ctx) => {
  return _safeParse(_Err)(schema, value, _ctx);
};
var _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _safeParseAsync(_Err)(schema, value, ctx);
};
var _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _safeParseAsync(_Err)(schema, value, _ctx);
};

// node_modules/zod/v4/core/regexes.js
var regexes_exports = {};
__export(regexes_exports, {
  base64: () => base64,
  base64url: () => base64url,
  bigint: () => bigint,
  boolean: () => boolean,
  browserEmail: () => browserEmail,
  cidrv4: () => cidrv4,
  cidrv6: () => cidrv6,
  cuid: () => cuid,
  cuid2: () => cuid2,
  date: () => date,
  datetime: () => datetime,
  domain: () => domain,
  duration: () => duration,
  e164: () => e164,
  email: () => email,
  emoji: () => emoji,
  extendedDuration: () => extendedDuration,
  guid: () => guid,
  hex: () => hex,
  hostname: () => hostname,
  html5Email: () => html5Email,
  idnEmail: () => idnEmail,
  integer: () => integer,
  ipv4: () => ipv4,
  ipv6: () => ipv6,
  ksuid: () => ksuid,
  lowercase: () => lowercase,
  mac: () => mac,
  md5_base64: () => md5_base64,
  md5_base64url: () => md5_base64url,
  md5_hex: () => md5_hex,
  nanoid: () => nanoid,
  null: () => _null,
  number: () => number,
  rfc5322Email: () => rfc5322Email,
  sha1_base64: () => sha1_base64,
  sha1_base64url: () => sha1_base64url,
  sha1_hex: () => sha1_hex,
  sha256_base64: () => sha256_base64,
  sha256_base64url: () => sha256_base64url,
  sha256_hex: () => sha256_hex,
  sha384_base64: () => sha384_base64,
  sha384_base64url: () => sha384_base64url,
  sha384_hex: () => sha384_hex,
  sha512_base64: () => sha512_base64,
  sha512_base64url: () => sha512_base64url,
  sha512_hex: () => sha512_hex,
  string: () => string,
  time: () => time,
  ulid: () => ulid,
  undefined: () => _undefined,
  unicodeEmail: () => unicodeEmail,
  uppercase: () => uppercase,
  uuid: () => uuid,
  uuid4: () => uuid4,
  uuid6: () => uuid6,
  uuid7: () => uuid7,
  xid: () => xid
});
var cuid = /^[cC][^\s-]{8,}$/;
var cuid2 = /^[0-9a-z]+$/;
var ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
var xid = /^[0-9a-vA-V]{20}$/;
var ksuid = /^[A-Za-z0-9]{27}$/;
var nanoid = /^[a-zA-Z0-9_-]{21}$/;
var duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
var extendedDuration = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
var uuid = (version2) => {
  if (!version2)
    return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
  return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version2}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
var uuid4 = /* @__PURE__ */ uuid(4);
var uuid6 = /* @__PURE__ */ uuid(6);
var uuid7 = /* @__PURE__ */ uuid(7);
var email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
var html5Email = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
var rfc5322Email = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
var unicodeEmail = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u;
var idnEmail = unicodeEmail;
var browserEmail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
var _emoji = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
  return new RegExp(_emoji, "u");
}
var ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
var mac = (delimiter) => {
  const escapedDelim = escapeRegex(delimiter ?? ":");
  return new RegExp(`^(?:[0-9A-F]{2}${escapedDelim}){5}[0-9A-F]{2}$|^(?:[0-9a-f]{2}${escapedDelim}){5}[0-9a-f]{2}$`);
};
var cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
var cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
var base64url = /^[A-Za-z0-9_-]*$/;
var hostname = /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
var domain = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
var e164 = /^\+[1-9]\d{6,14}$/;
var dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
var date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
function timeSource(args) {
  const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return regex;
}
function time(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
function datetime(args) {
  const time3 = timeSource({ precision: args.precision });
  const opts = ["Z"];
  if (args.local)
    opts.push("");
  if (args.offset)
    opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
  const timeRegex = `${time3}(?:${opts.join("|")})`;
  return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
var string = (params) => {
  const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
  return new RegExp(`^${regex}$`);
};
var bigint = /^-?\d+n?$/;
var integer = /^-?\d+$/;
var number = /^-?\d+(?:\.\d+)?$/;
var boolean = /^(?:true|false)$/i;
var _null = /^null$/i;
var _undefined = /^undefined$/i;
var lowercase = /^[^A-Z]*$/;
var uppercase = /^[^a-z]*$/;
var hex = /^[0-9a-fA-F]*$/;
function fixedBase64(bodyLength, padding) {
  return new RegExp(`^[A-Za-z0-9+/]{${bodyLength}}${padding}$`);
}
function fixedBase64url(length) {
  return new RegExp(`^[A-Za-z0-9_-]{${length}}$`);
}
var md5_hex = /^[0-9a-fA-F]{32}$/;
var md5_base64 = /* @__PURE__ */ fixedBase64(22, "==");
var md5_base64url = /* @__PURE__ */ fixedBase64url(22);
var sha1_hex = /^[0-9a-fA-F]{40}$/;
var sha1_base64 = /* @__PURE__ */ fixedBase64(27, "=");
var sha1_base64url = /* @__PURE__ */ fixedBase64url(27);
var sha256_hex = /^[0-9a-fA-F]{64}$/;
var sha256_base64 = /* @__PURE__ */ fixedBase64(43, "=");
var sha256_base64url = /* @__PURE__ */ fixedBase64url(43);
var sha384_hex = /^[0-9a-fA-F]{96}$/;
var sha384_base64 = /* @__PURE__ */ fixedBase64(64, "");
var sha384_base64url = /* @__PURE__ */ fixedBase64url(64);
var sha512_hex = /^[0-9a-fA-F]{128}$/;
var sha512_base64 = /* @__PURE__ */ fixedBase64(86, "==");
var sha512_base64url = /* @__PURE__ */ fixedBase64url(86);

// node_modules/zod/v4/core/checks.js
var $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
  var _a2;
  inst._zod ?? (inst._zod = {});
  inst._zod.def = def;
  (_a2 = inst._zod).onattach ?? (_a2.onattach = []);
});
var numericOriginMap = {
  number: "number",
  bigint: "bigint",
  object: "date"
};
var $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
    if (def.value < curr) {
      if (def.inclusive)
        bag.maximum = def.value;
      else
        bag.exclusiveMaximum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
    if (def.value > curr) {
      if (def.inclusive)
        bag.minimum = def.value;
      else
        bag.exclusiveMinimum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    var _a2;
    (_a2 = inst2._zod.bag).multipleOf ?? (_a2.multipleOf = def.value);
  });
  inst._zod.check = (payload) => {
    if (typeof payload.value !== typeof def.value)
      throw new Error("Cannot mix number and bigint in multiple_of check.");
    const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
    if (isMultiple)
      return;
    payload.issues.push({
      origin: typeof payload.value,
      code: "not_multiple_of",
      divisor: def.value,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
  $ZodCheck.init(inst, def);
  def.format = def.format || "float64";
  const isInt = def.format?.includes("int");
  const origin = isInt ? "int" : "number";
  const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    bag.minimum = minimum;
    bag.maximum = maximum;
    if (isInt)
      bag.pattern = integer;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (isInt) {
      if (!Number.isInteger(input)) {
        payload.issues.push({
          expected: origin,
          format: def.format,
          code: "invalid_type",
          continue: false,
          input,
          inst
        });
        return;
      }
      if (!Number.isSafeInteger(input)) {
        if (input > 0) {
          payload.issues.push({
            input,
            code: "too_big",
            maximum: Number.MAX_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        } else {
          payload.issues.push({
            input,
            code: "too_small",
            minimum: Number.MIN_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        }
        return;
      }
    }
    if (input < minimum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_big",
        maximum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodCheckBigIntFormat = /* @__PURE__ */ $constructor("$ZodCheckBigIntFormat", (inst, def) => {
  $ZodCheck.init(inst, def);
  const [minimum, maximum] = BIGINT_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    bag.minimum = minimum;
    bag.maximum = maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (input < minimum) {
      payload.issues.push({
        origin: "bigint",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "bigint",
        input,
        code: "too_big",
        maximum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodCheckMaxSize = /* @__PURE__ */ $constructor("$ZodCheckMaxSize", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.size !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (def.maximum < curr)
      inst2._zod.bag.maximum = def.maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const size = input.size;
    if (size <= def.maximum)
      return;
    payload.issues.push({
      origin: getSizableOrigin(input),
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMinSize = /* @__PURE__ */ $constructor("$ZodCheckMinSize", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.size !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (def.minimum > curr)
      inst2._zod.bag.minimum = def.minimum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const size = input.size;
    if (size >= def.minimum)
      return;
    payload.issues.push({
      origin: getSizableOrigin(input),
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckSizeEquals = /* @__PURE__ */ $constructor("$ZodCheckSizeEquals", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.size !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.minimum = def.size;
    bag.maximum = def.size;
    bag.size = def.size;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const size = input.size;
    if (size === def.size)
      return;
    const tooBig = size > def.size;
    payload.issues.push({
      origin: getSizableOrigin(input),
      ...tooBig ? { code: "too_big", maximum: def.size } : { code: "too_small", minimum: def.size },
      inclusive: true,
      exact: true,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (def.maximum < curr)
      inst2._zod.bag.maximum = def.maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length <= def.maximum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (def.minimum > curr)
      inst2._zod.bag.minimum = def.minimum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length >= def.minimum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.minimum = def.length;
    bag.maximum = def.length;
    bag.length = def.length;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length === def.length)
      return;
    const origin = getLengthableOrigin(input);
    const tooBig = length > def.length;
    payload.issues.push({
      origin,
      ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
      inclusive: true,
      exact: true,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
  var _a2, _b;
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    if (def.pattern) {
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(def.pattern);
    }
  });
  if (def.pattern)
    (_a2 = inst._zod).check ?? (_a2.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: def.format,
        input: payload.value,
        ...def.pattern ? { pattern: def.pattern.toString() } : {},
        inst,
        continue: !def.abort
      });
    });
  else
    (_b = inst._zod).check ?? (_b.check = () => {
    });
});
var $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    def.pattern.lastIndex = 0;
    if (def.pattern.test(payload.value))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: payload.value,
      pattern: def.pattern.toString(),
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
  def.pattern ?? (def.pattern = lowercase);
  $ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
  def.pattern ?? (def.pattern = uppercase);
  $ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
  $ZodCheck.init(inst, def);
  const escapedRegex = escapeRegex(def.includes);
  const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
  def.pattern = pattern;
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.includes(def.includes, def.position))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: def.includes,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.startsWith(def.prefix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "starts_with",
      prefix: def.prefix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.endsWith(def.suffix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "ends_with",
      suffix: def.suffix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
function handleCheckPropertyResult(result, payload, property) {
  if (result.issues.length) {
    payload.issues.push(...prefixIssues(property, result.issues));
  }
}
var $ZodCheckProperty = /* @__PURE__ */ $constructor("$ZodCheckProperty", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    const result = def.schema._zod.run({
      value: payload.value[def.property],
      issues: []
    }, {});
    if (result instanceof Promise) {
      return result.then((result2) => handleCheckPropertyResult(result2, payload, def.property));
    }
    handleCheckPropertyResult(result, payload, def.property);
    return;
  };
});
var $ZodCheckMimeType = /* @__PURE__ */ $constructor("$ZodCheckMimeType", (inst, def) => {
  $ZodCheck.init(inst, def);
  const mimeSet = new Set(def.mime);
  inst._zod.onattach.push((inst2) => {
    inst2._zod.bag.mime = def.mime;
  });
  inst._zod.check = (payload) => {
    if (mimeSet.has(payload.value.type))
      return;
    payload.issues.push({
      code: "invalid_value",
      values: def.mime,
      input: payload.value.type,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    payload.value = def.tx(payload.value);
  };
});

// node_modules/zod/v4/core/doc.js
var Doc = class {
  constructor(args = []) {
    this.content = [];
    this.indent = 0;
    if (this)
      this.args = args;
  }
  indented(fn) {
    this.indent += 1;
    fn(this);
    this.indent -= 1;
  }
  write(arg) {
    if (typeof arg === "function") {
      arg(this, { execution: "sync" });
      arg(this, { execution: "async" });
      return;
    }
    const content = arg;
    const lines = content.split("\n").filter((x) => x);
    const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
    const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
    for (const line of dedented) {
      this.content.push(line);
    }
  }
  compile() {
    const F = Function;
    const args = this?.args;
    const content = this?.content ?? [``];
    const lines = [...content.map((x) => `  ${x}`)];
    return new F(...args, lines.join("\n"));
  }
};

// node_modules/zod/v4/core/versions.js
var version = {
  major: 4,
  minor: 3,
  patch: 6
};

// node_modules/zod/v4/core/schemas.js
var $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  var _a2;
  inst ?? (inst = {});
  inst._zod.def = def;
  inst._zod.bag = inst._zod.bag || {};
  inst._zod.version = version;
  const checks = [...inst._zod.def.checks ?? []];
  if (inst._zod.traits.has("$ZodCheck")) {
    checks.unshift(inst);
  }
  for (const ch of checks) {
    for (const fn of ch._zod.onattach) {
      fn(inst);
    }
  }
  if (checks.length === 0) {
    (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
    inst._zod.deferred?.push(() => {
      inst._zod.run = inst._zod.parse;
    });
  } else {
    const runChecks = (payload, checks2, ctx) => {
      let isAborted = aborted(payload);
      let asyncResult;
      for (const ch of checks2) {
        if (ch._zod.def.when) {
          const shouldRun = ch._zod.def.when(payload);
          if (!shouldRun)
            continue;
        } else if (isAborted) {
          continue;
        }
        const currLen = payload.issues.length;
        const _ = ch._zod.check(payload);
        if (_ instanceof Promise && ctx?.async === false) {
          throw new $ZodAsyncError();
        }
        if (asyncResult || _ instanceof Promise) {
          asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
            await _;
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              return;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          });
        } else {
          const nextLen = payload.issues.length;
          if (nextLen === currLen)
            continue;
          if (!isAborted)
            isAborted = aborted(payload, currLen);
        }
      }
      if (asyncResult) {
        return asyncResult.then(() => {
          return payload;
        });
      }
      return payload;
    };
    const handleCanaryResult = (canary, payload, ctx) => {
      if (aborted(canary)) {
        canary.aborted = true;
        return canary;
      }
      const checkResult = runChecks(payload, checks, ctx);
      if (checkResult instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
      }
      return inst._zod.parse(checkResult, ctx);
    };
    inst._zod.run = (payload, ctx) => {
      if (ctx.skipChecks) {
        return inst._zod.parse(payload, ctx);
      }
      if (ctx.direction === "backward") {
        const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
        if (canary instanceof Promise) {
          return canary.then((canary2) => {
            return handleCanaryResult(canary2, payload, ctx);
          });
        }
        return handleCanaryResult(canary, payload, ctx);
      }
      const result = inst._zod.parse(payload, ctx);
      if (result instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return result.then((result2) => runChecks(result2, checks, ctx));
      }
      return runChecks(result, checks, ctx);
    };
  }
  defineLazy(inst, "~standard", () => ({
    validate: (value) => {
      try {
        const r = safeParse(inst, value);
        return r.success ? { value: r.data } : { issues: r.error?.issues };
      } catch (_) {
        return safeParseAsync(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
      }
    },
    vendor: "zod",
    version: 1
  }));
});
var $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string(inst._zod.bag);
  inst._zod.parse = (payload, _) => {
    if (def.coerce)
      try {
        payload.value = String(payload.value);
      } catch (_2) {
      }
    if (typeof payload.value === "string")
      return payload;
    payload.issues.push({
      expected: "string",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  $ZodString.init(inst, def);
});
var $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
  def.pattern ?? (def.pattern = guid);
  $ZodStringFormat.init(inst, def);
});
var $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
  if (def.version) {
    const versionMap = {
      v1: 1,
      v2: 2,
      v3: 3,
      v4: 4,
      v5: 5,
      v6: 6,
      v7: 7,
      v8: 8
    };
    const v = versionMap[def.version];
    if (v === void 0)
      throw new Error(`Invalid UUID version: "${def.version}"`);
    def.pattern ?? (def.pattern = uuid(v));
  } else
    def.pattern ?? (def.pattern = uuid());
  $ZodStringFormat.init(inst, def);
});
var $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
  def.pattern ?? (def.pattern = email);
  $ZodStringFormat.init(inst, def);
});
var $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    try {
      const trimmed = payload.value.trim();
      const url2 = new URL(trimmed);
      if (def.hostname) {
        def.hostname.lastIndex = 0;
        if (!def.hostname.test(url2.hostname)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid hostname",
            pattern: def.hostname.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.protocol) {
        def.protocol.lastIndex = 0;
        if (!def.protocol.test(url2.protocol.endsWith(":") ? url2.protocol.slice(0, -1) : url2.protocol)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid protocol",
            pattern: def.protocol.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.normalize) {
        payload.value = url2.href;
      } else {
        payload.value = trimmed;
      }
      return;
    } catch (_) {
      payload.issues.push({
        code: "invalid_format",
        format: "url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
  def.pattern ?? (def.pattern = emoji());
  $ZodStringFormat.init(inst, def);
});
var $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
  def.pattern ?? (def.pattern = nanoid);
  $ZodStringFormat.init(inst, def);
});
var $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
  def.pattern ?? (def.pattern = cuid);
  $ZodStringFormat.init(inst, def);
});
var $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
  def.pattern ?? (def.pattern = cuid2);
  $ZodStringFormat.init(inst, def);
});
var $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
  def.pattern ?? (def.pattern = ulid);
  $ZodStringFormat.init(inst, def);
});
var $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
  def.pattern ?? (def.pattern = xid);
  $ZodStringFormat.init(inst, def);
});
var $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
  def.pattern ?? (def.pattern = ksuid);
  $ZodStringFormat.init(inst, def);
});
var $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
  def.pattern ?? (def.pattern = datetime(def));
  $ZodStringFormat.init(inst, def);
});
var $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
  def.pattern ?? (def.pattern = date);
  $ZodStringFormat.init(inst, def);
});
var $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
  def.pattern ?? (def.pattern = time(def));
  $ZodStringFormat.init(inst, def);
});
var $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
  def.pattern ?? (def.pattern = duration);
  $ZodStringFormat.init(inst, def);
});
var $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
  def.pattern ?? (def.pattern = ipv4);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `ipv4`;
});
var $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
  def.pattern ?? (def.pattern = ipv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `ipv6`;
  inst._zod.check = (payload) => {
    try {
      new URL(`http://[${payload.value}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "ipv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodMAC = /* @__PURE__ */ $constructor("$ZodMAC", (inst, def) => {
  def.pattern ?? (def.pattern = mac(def.delimiter));
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `mac`;
});
var $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv4);
  $ZodStringFormat.init(inst, def);
});
var $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    const parts = payload.value.split("/");
    try {
      if (parts.length !== 2)
        throw new Error();
      const [address, prefix] = parts;
      if (!prefix)
        throw new Error();
      const prefixNum = Number(prefix);
      if (`${prefixNum}` !== prefix)
        throw new Error();
      if (prefixNum < 0 || prefixNum > 128)
        throw new Error();
      new URL(`http://[${address}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "cidrv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
function isValidBase64(data) {
  if (data === "")
    return true;
  if (data.length % 4 !== 0)
    return false;
  try {
    atob(data);
    return true;
  } catch {
    return false;
  }
}
var $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
  def.pattern ?? (def.pattern = base64);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.contentEncoding = "base64";
  inst._zod.check = (payload) => {
    if (isValidBase64(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
function isValidBase64URL(data) {
  if (!base64url.test(data))
    return false;
  const base643 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
  const padded = base643.padEnd(Math.ceil(base643.length / 4) * 4, "=");
  return isValidBase64(padded);
}
var $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
  def.pattern ?? (def.pattern = base64url);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.contentEncoding = "base64url";
  inst._zod.check = (payload) => {
    if (isValidBase64URL(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64url",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
  def.pattern ?? (def.pattern = e164);
  $ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
  try {
    const tokensParts = token.split(".");
    if (tokensParts.length !== 3)
      return false;
    const [header] = tokensParts;
    if (!header)
      return false;
    const parsedHeader = JSON.parse(atob(header));
    if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
      return false;
    if (!parsedHeader.alg)
      return false;
    if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
      return false;
    return true;
  } catch {
    return false;
  }
}
var $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (isValidJWT(payload.value, def.alg))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "jwt",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCustomStringFormat = /* @__PURE__ */ $constructor("$ZodCustomStringFormat", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (def.fn(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: def.format,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = inst._zod.bag.pattern ?? number;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
      return payload;
    }
    const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
    payload.issues.push({
      expected: "number",
      code: "invalid_type",
      input,
      inst,
      ...received ? { received } : {}
    });
    return payload;
  };
});
var $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
  $ZodCheckNumberFormat.init(inst, def);
  $ZodNumber.init(inst, def);
});
var $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = boolean;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Boolean(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "boolean")
      return payload;
    payload.issues.push({
      expected: "boolean",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodBigInt = /* @__PURE__ */ $constructor("$ZodBigInt", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = bigint;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = BigInt(payload.value);
      } catch (_) {
      }
    if (typeof payload.value === "bigint")
      return payload;
    payload.issues.push({
      expected: "bigint",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodBigIntFormat = /* @__PURE__ */ $constructor("$ZodBigIntFormat", (inst, def) => {
  $ZodCheckBigIntFormat.init(inst, def);
  $ZodBigInt.init(inst, def);
});
var $ZodSymbol = /* @__PURE__ */ $constructor("$ZodSymbol", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (typeof input === "symbol")
      return payload;
    payload.issues.push({
      expected: "symbol",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodUndefined = /* @__PURE__ */ $constructor("$ZodUndefined", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = _undefined;
  inst._zod.values = /* @__PURE__ */ new Set([void 0]);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (typeof input === "undefined")
      return payload;
    payload.issues.push({
      expected: "undefined",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodNull = /* @__PURE__ */ $constructor("$ZodNull", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = _null;
  inst._zod.values = /* @__PURE__ */ new Set([null]);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (input === null)
      return payload;
    payload.issues.push({
      expected: "null",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodAny = /* @__PURE__ */ $constructor("$ZodAny", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
var $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
var $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    payload.issues.push({
      expected: "never",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodVoid = /* @__PURE__ */ $constructor("$ZodVoid", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (typeof input === "undefined")
      return payload;
    payload.issues.push({
      expected: "void",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodDate = /* @__PURE__ */ $constructor("$ZodDate", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce) {
      try {
        payload.value = new Date(payload.value);
      } catch (_err) {
      }
    }
    const input = payload.value;
    const isDate = input instanceof Date;
    const isValidDate = isDate && !Number.isNaN(input.getTime());
    if (isValidDate)
      return payload;
    payload.issues.push({
      expected: "date",
      code: "invalid_type",
      input,
      ...isDate ? { received: "Invalid Date" } : {},
      inst
    });
    return payload;
  };
});
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
var $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        expected: "array",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = Array(input.length);
    const proms = [];
    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
      } else {
        handleArrayResult(result, payload, i);
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
function handlePropertyResult(result, final, key, input, isOptionalOut) {
  if (result.issues.length) {
    if (isOptionalOut && !(key in input)) {
      return;
    }
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (result.value === void 0) {
    if (key in input) {
      final.value[key] = void 0;
    }
  } else {
    final.value[key] = result.value;
  }
}
function normalizeDef(def) {
  const keys = Object.keys(def.shape);
  for (const k of keys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    keys,
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  const isOptionalOut = _catchall.optout === "optional";
  for (const key in input) {
    if (keySet.has(key))
      continue;
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalOut)));
    } else {
      handlePropertyResult(r, payload, key, input, isOptionalOut);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
var $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
  $ZodType.init(inst, def);
  const desc = Object.getOwnPropertyDescriptor(def, "shape");
  if (!desc?.get) {
    const sh = def.shape;
    Object.defineProperty(def, "shape", {
      get: () => {
        const newSh = { ...sh };
        Object.defineProperty(def, "shape", {
          value: newSh
        });
        return newSh;
      }
    });
  }
  const _normalized = cached(() => normalizeDef(def));
  defineLazy(inst._zod, "propValues", () => {
    const shape = def.shape;
    const propValues = {};
    for (const key in shape) {
      const field = shape[key]._zod;
      if (field.values) {
        propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
        for (const v of field.values)
          propValues[key].add(v);
      }
    }
    return propValues;
  });
  const isObject2 = isObject;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = {};
    const proms = [];
    const shape = value.shape;
    for (const key of value.keys) {
      const el = shape[key];
      const isOptionalOut = el._zod.optout === "optional";
      const r = el._zod.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalOut)));
      } else {
        handlePropertyResult(r, payload, key, input, isOptionalOut);
      }
    }
    if (!catchall) {
      return proms.length ? Promise.all(proms).then(() => payload) : payload;
    }
    return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
  };
});
var $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
  $ZodObject.init(inst, def);
  const superParse = inst._zod.parse;
  const _normalized = cached(() => normalizeDef(def));
  const generateFastpass = (shape) => {
    const doc = new Doc(["shape", "payload", "ctx"]);
    const normalized = _normalized.value;
    const parseStr = (key) => {
      const k = esc(key);
      return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
    };
    doc.write(`const input = payload.value;`);
    const ids = /* @__PURE__ */ Object.create(null);
    let counter = 0;
    for (const key of normalized.keys) {
      ids[key] = `key_${counter++}`;
    }
    doc.write(`const newResult = {};`);
    for (const key of normalized.keys) {
      const id = ids[key];
      const k = esc(key);
      const schema = shape[key];
      const isOptionalOut = schema?._zod?.optout === "optional";
      doc.write(`const ${id} = ${parseStr(key)};`);
      if (isOptionalOut) {
        doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
      } else {
        doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
      }
    }
    doc.write(`payload.value = newResult;`);
    doc.write(`return payload;`);
    const fn = doc.compile();
    return (payload, ctx) => fn(shape, payload, ctx);
  };
  let fastpass;
  const isObject2 = isObject;
  const jit = !globalConfig.jitless;
  const allowsEval2 = allowsEval;
  const fastEnabled = jit && allowsEval2.value;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
      if (!fastpass)
        fastpass = generateFastpass(def.shape);
      payload = fastpass(payload, ctx);
      if (!catchall)
        return payload;
      return handleCatchall([], input, payload, ctx, value, inst);
    }
    return superParse(payload, ctx);
  };
});
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
var $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
  defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
  defineLazy(inst._zod, "values", () => {
    if (def.options.every((o) => o._zod.values)) {
      return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
    }
    return void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    if (def.options.every((o) => o._zod.pattern)) {
      const patterns = def.options.map((o) => o._zod.pattern);
      return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
    }
    return void 0;
  });
  const single = def.options.length === 1;
  const first = def.options[0]._zod.run;
  inst._zod.parse = (payload, ctx) => {
    if (single) {
      return first(payload, ctx);
    }
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        if (result.issues.length === 0)
          return result;
        results.push(result);
      }
    }
    if (!async)
      return handleUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results2) => {
      return handleUnionResults(results2, payload, inst, ctx);
    });
  };
});
function handleExclusiveUnionResults(results, final, inst, ctx) {
  const successes = results.filter((r) => r.issues.length === 0);
  if (successes.length === 1) {
    final.value = successes[0].value;
    return final;
  }
  if (successes.length === 0) {
    final.issues.push({
      code: "invalid_union",
      input: final.value,
      inst,
      errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    });
  } else {
    final.issues.push({
      code: "invalid_union",
      input: final.value,
      inst,
      errors: [],
      inclusive: false
    });
  }
  return final;
}
var $ZodXor = /* @__PURE__ */ $constructor("$ZodXor", (inst, def) => {
  $ZodUnion.init(inst, def);
  def.inclusive = false;
  const single = def.options.length === 1;
  const first = def.options[0]._zod.run;
  inst._zod.parse = (payload, ctx) => {
    if (single) {
      return first(payload, ctx);
    }
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        results.push(result);
      }
    }
    if (!async)
      return handleExclusiveUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results2) => {
      return handleExclusiveUnionResults(results2, payload, inst, ctx);
    });
  };
});
var $ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
  def.inclusive = false;
  $ZodUnion.init(inst, def);
  const _super = inst._zod.parse;
  defineLazy(inst._zod, "propValues", () => {
    const propValues = {};
    for (const option of def.options) {
      const pv = option._zod.propValues;
      if (!pv || Object.keys(pv).length === 0)
        throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
      for (const [k, v] of Object.entries(pv)) {
        if (!propValues[k])
          propValues[k] = /* @__PURE__ */ new Set();
        for (const val of v) {
          propValues[k].add(val);
        }
      }
    }
    return propValues;
  });
  const disc = cached(() => {
    const opts = def.options;
    const map2 = /* @__PURE__ */ new Map();
    for (const o of opts) {
      const values = o._zod.propValues?.[def.discriminator];
      if (!values || values.size === 0)
        throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
      for (const v of values) {
        if (map2.has(v)) {
          throw new Error(`Duplicate discriminator value "${String(v)}"`);
        }
        map2.set(v, o);
      }
    }
    return map2;
  });
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isObject(input)) {
      payload.issues.push({
        code: "invalid_type",
        expected: "object",
        input,
        inst
      });
      return payload;
    }
    const opt = disc.value.get(input?.[def.discriminator]);
    if (opt) {
      return opt._zod.run(payload, ctx);
    }
    if (def.unionFallback) {
      return _super(payload, ctx);
    }
    payload.issues.push({
      code: "invalid_union",
      errors: [],
      note: "No matching discriminator",
      discriminator: def.discriminator,
      input,
      path: [def.discriminator],
      inst
    });
    return payload;
  };
});
var $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    const left = def.left._zod.run({ value: input, issues: [] }, ctx);
    const right = def.right._zod.run({ value: input, issues: [] }, ctx);
    const async = left instanceof Promise || right instanceof Promise;
    if (async) {
      return Promise.all([left, right]).then(([left2, right2]) => {
        return handleIntersectionResults(payload, left2, right2);
      });
    }
    return handleIntersectionResults(payload, left, right);
  };
});
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  const unrecKeys = /* @__PURE__ */ new Map();
  let unrecIssue;
  for (const iss of left.issues) {
    if (iss.code === "unrecognized_keys") {
      unrecIssue ?? (unrecIssue = iss);
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).l = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  for (const iss of right.issues) {
    if (iss.code === "unrecognized_keys") {
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).r = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
  if (bothKeys.length && unrecIssue) {
    result.issues.push({ ...unrecIssue, keys: bothKeys });
  }
  if (aborted(result))
    return result;
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
var $ZodTuple = /* @__PURE__ */ $constructor("$ZodTuple", (inst, def) => {
  $ZodType.init(inst, def);
  const items = def.items;
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        input,
        inst,
        expected: "tuple",
        code: "invalid_type"
      });
      return payload;
    }
    payload.value = [];
    const proms = [];
    const reversedIndex = [...items].reverse().findIndex((item) => item._zod.optin !== "optional");
    const optStart = reversedIndex === -1 ? 0 : items.length - reversedIndex;
    if (!def.rest) {
      const tooBig = input.length > items.length;
      const tooSmall = input.length < optStart - 1;
      if (tooBig || tooSmall) {
        payload.issues.push({
          ...tooBig ? { code: "too_big", maximum: items.length, inclusive: true } : { code: "too_small", minimum: items.length },
          input,
          inst,
          origin: "array"
        });
        return payload;
      }
    }
    let i = -1;
    for (const item of items) {
      i++;
      if (i >= input.length) {
        if (i >= optStart)
          continue;
      }
      const result = item._zod.run({
        value: input[i],
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleTupleResult(result2, payload, i)));
      } else {
        handleTupleResult(result, payload, i);
      }
    }
    if (def.rest) {
      const rest = input.slice(items.length);
      for (const el of rest) {
        i++;
        const result = def.rest._zod.run({
          value: el,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => handleTupleResult(result2, payload, i)));
        } else {
          handleTupleResult(result, payload, i);
        }
      }
    }
    if (proms.length)
      return Promise.all(proms).then(() => payload);
    return payload;
  };
});
function handleTupleResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
var $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isPlainObject(input)) {
      payload.issues.push({
        expected: "record",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    const proms = [];
    const values = def.keyType._zod.values;
    if (values) {
      payload.value = {};
      const recordKeys = /* @__PURE__ */ new Set();
      for (const key of values) {
        if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
          recordKeys.add(typeof key === "number" ? key.toString() : key);
          const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => {
              if (result2.issues.length) {
                payload.issues.push(...prefixIssues(key, result2.issues));
              }
              payload.value[key] = result2.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key, result.issues));
            }
            payload.value[key] = result.value;
          }
        }
      }
      let unrecognized;
      for (const key in input) {
        if (!recordKeys.has(key)) {
          unrecognized = unrecognized ?? [];
          unrecognized.push(key);
        }
      }
      if (unrecognized && unrecognized.length > 0) {
        payload.issues.push({
          code: "unrecognized_keys",
          input,
          inst,
          keys: unrecognized
        });
      }
    } else {
      payload.value = {};
      for (const key of Reflect.ownKeys(input)) {
        if (key === "__proto__")
          continue;
        let keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
        if (keyResult instanceof Promise) {
          throw new Error("Async schemas not supported in object keys currently");
        }
        const checkNumericKey = typeof key === "string" && number.test(key) && keyResult.issues.length;
        if (checkNumericKey) {
          const retryResult = def.keyType._zod.run({ value: Number(key), issues: [] }, ctx);
          if (retryResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          if (retryResult.issues.length === 0) {
            keyResult = retryResult;
          }
        }
        if (keyResult.issues.length) {
          if (def.mode === "loose") {
            payload.value[key] = input[key];
          } else {
            payload.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
              input: key,
              path: [key],
              inst
            });
          }
          continue;
        }
        const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => {
            if (result2.issues.length) {
              payload.issues.push(...prefixIssues(key, result2.issues));
            }
            payload.value[keyResult.value] = result2.value;
          }));
        } else {
          if (result.issues.length) {
            payload.issues.push(...prefixIssues(key, result.issues));
          }
          payload.value[keyResult.value] = result.value;
        }
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
var $ZodMap = /* @__PURE__ */ $constructor("$ZodMap", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!(input instanceof Map)) {
      payload.issues.push({
        expected: "map",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    const proms = [];
    payload.value = /* @__PURE__ */ new Map();
    for (const [key, value] of input) {
      const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
      const valueResult = def.valueType._zod.run({ value, issues: [] }, ctx);
      if (keyResult instanceof Promise || valueResult instanceof Promise) {
        proms.push(Promise.all([keyResult, valueResult]).then(([keyResult2, valueResult2]) => {
          handleMapResult(keyResult2, valueResult2, payload, key, input, inst, ctx);
        }));
      } else {
        handleMapResult(keyResult, valueResult, payload, key, input, inst, ctx);
      }
    }
    if (proms.length)
      return Promise.all(proms).then(() => payload);
    return payload;
  };
});
function handleMapResult(keyResult, valueResult, final, key, input, inst, ctx) {
  if (keyResult.issues.length) {
    if (propertyKeyTypes.has(typeof key)) {
      final.issues.push(...prefixIssues(key, keyResult.issues));
    } else {
      final.issues.push({
        code: "invalid_key",
        origin: "map",
        input,
        inst,
        issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
      });
    }
  }
  if (valueResult.issues.length) {
    if (propertyKeyTypes.has(typeof key)) {
      final.issues.push(...prefixIssues(key, valueResult.issues));
    } else {
      final.issues.push({
        origin: "map",
        code: "invalid_element",
        input,
        inst,
        key,
        issues: valueResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
      });
    }
  }
  final.value.set(keyResult.value, valueResult.value);
}
var $ZodSet = /* @__PURE__ */ $constructor("$ZodSet", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!(input instanceof Set)) {
      payload.issues.push({
        input,
        inst,
        expected: "set",
        code: "invalid_type"
      });
      return payload;
    }
    const proms = [];
    payload.value = /* @__PURE__ */ new Set();
    for (const item of input) {
      const result = def.valueType._zod.run({ value: item, issues: [] }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleSetResult(result2, payload)));
      } else
        handleSetResult(result, payload);
    }
    if (proms.length)
      return Promise.all(proms).then(() => payload);
    return payload;
  };
});
function handleSetResult(result, final) {
  if (result.issues.length) {
    final.issues.push(...result.issues);
  }
  final.value.add(result.value);
}
var $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
  $ZodType.init(inst, def);
  const values = getEnumValues(def.entries);
  const valuesSet = new Set(values);
  inst._zod.values = valuesSet;
  inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (valuesSet.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values,
      input,
      inst
    });
    return payload;
  };
});
var $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
  $ZodType.init(inst, def);
  if (def.values.length === 0) {
    throw new Error("Cannot create literal schema with no valid values");
  }
  const values = new Set(def.values);
  inst._zod.values = values;
  inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (values.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values: def.values,
      input,
      inst
    });
    return payload;
  };
});
var $ZodFile = /* @__PURE__ */ $constructor("$ZodFile", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (input instanceof File)
      return payload;
    payload.issues.push({
      expected: "file",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    const _out = def.transform(payload.value, payload);
    if (ctx.async) {
      const output = _out instanceof Promise ? _out : Promise.resolve(_out);
      return output.then((output2) => {
        payload.value = output2;
        return payload;
      });
    }
    if (_out instanceof Promise) {
      throw new $ZodAsyncError();
    }
    payload.value = _out;
    return payload;
  };
});
function handleOptionalResult(result, input) {
  if (result.issues.length && input === void 0) {
    return { issues: [], value: void 0 };
  }
  return result;
}
var $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (def.innerType._zod.optin === "optional") {
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise)
        return result.then((r) => handleOptionalResult(r, payload.value));
      return handleOptionalResult(result, payload.value);
    }
    if (payload.value === void 0) {
      return payload;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodExactOptional = /* @__PURE__ */ $constructor("$ZodExactOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
  inst._zod.parse = (payload, ctx) => {
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
  });
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === null)
      return payload;
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
      return payload;
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleDefaultResult(result2, def));
    }
    return handleDefaultResult(result, def);
  };
});
function handleDefaultResult(payload, def) {
  if (payload.value === void 0) {
    payload.value = def.defaultValue;
  }
  return payload;
}
var $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => {
    const v = def.innerType._zod.values;
    return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleNonOptionalResult(result2, inst));
    }
    return handleNonOptionalResult(result, inst);
  };
});
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === void 0) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
var $ZodSuccess = /* @__PURE__ */ $constructor("$ZodSuccess", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      throw new $ZodEncodeError("ZodSuccess");
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => {
        payload.value = result2.issues.length === 0;
        return payload;
      });
    }
    payload.value = result.issues.length === 0;
    return payload;
  };
});
var $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => {
        payload.value = result2.value;
        if (result2.issues.length) {
          payload.value = def.catchValue({
            ...payload,
            error: {
              issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config()))
            },
            input: payload.value
          });
          payload.issues = [];
        }
        return payload;
      });
    }
    payload.value = result.value;
    if (result.issues.length) {
      payload.value = def.catchValue({
        ...payload,
        error: {
          issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
        },
        input: payload.value
      });
      payload.issues = [];
    }
    return payload;
  };
});
var $ZodNaN = /* @__PURE__ */ $constructor("$ZodNaN", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    if (typeof payload.value !== "number" || !Number.isNaN(payload.value)) {
      payload.issues.push({
        input: payload.value,
        inst,
        expected: "nan",
        code: "invalid_type"
      });
      return payload;
    }
    return payload;
  };
});
var $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => def.in._zod.values);
  defineLazy(inst._zod, "optin", () => def.in._zod.optin);
  defineLazy(inst._zod, "optout", () => def.out._zod.optout);
  defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      const right = def.out._zod.run(payload, ctx);
      if (right instanceof Promise) {
        return right.then((right2) => handlePipeResult(right2, def.in, ctx));
      }
      return handlePipeResult(right, def.in, ctx);
    }
    const left = def.in._zod.run(payload, ctx);
    if (left instanceof Promise) {
      return left.then((left2) => handlePipeResult(left2, def.out, ctx));
    }
    return handlePipeResult(left, def.out, ctx);
  };
});
function handlePipeResult(left, next, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return next._zod.run({ value: left.value, issues: left.issues }, ctx);
}
var $ZodCodec = /* @__PURE__ */ $constructor("$ZodCodec", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => def.in._zod.values);
  defineLazy(inst._zod, "optin", () => def.in._zod.optin);
  defineLazy(inst._zod, "optout", () => def.out._zod.optout);
  defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
  inst._zod.parse = (payload, ctx) => {
    const direction = ctx.direction || "forward";
    if (direction === "forward") {
      const left = def.in._zod.run(payload, ctx);
      if (left instanceof Promise) {
        return left.then((left2) => handleCodecAResult(left2, def, ctx));
      }
      return handleCodecAResult(left, def, ctx);
    } else {
      const right = def.out._zod.run(payload, ctx);
      if (right instanceof Promise) {
        return right.then((right2) => handleCodecAResult(right2, def, ctx));
      }
      return handleCodecAResult(right, def, ctx);
    }
  };
});
function handleCodecAResult(result, def, ctx) {
  if (result.issues.length) {
    result.aborted = true;
    return result;
  }
  const direction = ctx.direction || "forward";
  if (direction === "forward") {
    const transformed = def.transform(result.value, result);
    if (transformed instanceof Promise) {
      return transformed.then((value) => handleCodecTxResult(result, value, def.out, ctx));
    }
    return handleCodecTxResult(result, transformed, def.out, ctx);
  } else {
    const transformed = def.reverseTransform(result.value, result);
    if (transformed instanceof Promise) {
      return transformed.then((value) => handleCodecTxResult(result, value, def.in, ctx));
    }
    return handleCodecTxResult(result, transformed, def.in, ctx);
  }
}
function handleCodecTxResult(left, value, nextSchema, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return nextSchema._zod.run({ value, issues: left.issues }, ctx);
}
var $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
  defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then(handleReadonlyResult);
    }
    return handleReadonlyResult(result);
  };
});
function handleReadonlyResult(payload) {
  payload.value = Object.freeze(payload.value);
  return payload;
}
var $ZodTemplateLiteral = /* @__PURE__ */ $constructor("$ZodTemplateLiteral", (inst, def) => {
  $ZodType.init(inst, def);
  const regexParts = [];
  for (const part of def.parts) {
    if (typeof part === "object" && part !== null) {
      if (!part._zod.pattern) {
        throw new Error(`Invalid template literal part, no pattern found: ${[...part._zod.traits].shift()}`);
      }
      const source = part._zod.pattern instanceof RegExp ? part._zod.pattern.source : part._zod.pattern;
      if (!source)
        throw new Error(`Invalid template literal part: ${part._zod.traits}`);
      const start = source.startsWith("^") ? 1 : 0;
      const end = source.endsWith("$") ? source.length - 1 : source.length;
      regexParts.push(source.slice(start, end));
    } else if (part === null || primitiveTypes.has(typeof part)) {
      regexParts.push(escapeRegex(`${part}`));
    } else {
      throw new Error(`Invalid template literal part: ${part}`);
    }
  }
  inst._zod.pattern = new RegExp(`^${regexParts.join("")}$`);
  inst._zod.parse = (payload, _ctx) => {
    if (typeof payload.value !== "string") {
      payload.issues.push({
        input: payload.value,
        inst,
        expected: "string",
        code: "invalid_type"
      });
      return payload;
    }
    inst._zod.pattern.lastIndex = 0;
    if (!inst._zod.pattern.test(payload.value)) {
      payload.issues.push({
        input: payload.value,
        inst,
        code: "invalid_format",
        format: def.format ?? "template_literal",
        pattern: inst._zod.pattern.source
      });
      return payload;
    }
    return payload;
  };
});
var $ZodFunction = /* @__PURE__ */ $constructor("$ZodFunction", (inst, def) => {
  $ZodType.init(inst, def);
  inst._def = def;
  inst._zod.def = def;
  inst.implement = (func) => {
    if (typeof func !== "function") {
      throw new Error("implement() must be called with a function");
    }
    return function(...args) {
      const parsedArgs = inst._def.input ? parse(inst._def.input, args) : args;
      const result = Reflect.apply(func, this, parsedArgs);
      if (inst._def.output) {
        return parse(inst._def.output, result);
      }
      return result;
    };
  };
  inst.implementAsync = (func) => {
    if (typeof func !== "function") {
      throw new Error("implementAsync() must be called with a function");
    }
    return async function(...args) {
      const parsedArgs = inst._def.input ? await parseAsync(inst._def.input, args) : args;
      const result = await Reflect.apply(func, this, parsedArgs);
      if (inst._def.output) {
        return await parseAsync(inst._def.output, result);
      }
      return result;
    };
  };
  inst._zod.parse = (payload, _ctx) => {
    if (typeof payload.value !== "function") {
      payload.issues.push({
        code: "invalid_type",
        expected: "function",
        input: payload.value,
        inst
      });
      return payload;
    }
    const hasPromiseOutput = inst._def.output && inst._def.output._zod.def.type === "promise";
    if (hasPromiseOutput) {
      payload.value = inst.implementAsync(payload.value);
    } else {
      payload.value = inst.implement(payload.value);
    }
    return payload;
  };
  inst.input = (...args) => {
    const F = inst.constructor;
    if (Array.isArray(args[0])) {
      return new F({
        type: "function",
        input: new $ZodTuple({
          type: "tuple",
          items: args[0],
          rest: args[1]
        }),
        output: inst._def.output
      });
    }
    return new F({
      type: "function",
      input: args[0],
      output: inst._def.output
    });
  };
  inst.output = (output) => {
    const F = inst.constructor;
    return new F({
      type: "function",
      input: inst._def.input,
      output
    });
  };
  return inst;
});
var $ZodPromise = /* @__PURE__ */ $constructor("$ZodPromise", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    return Promise.resolve(payload.value).then((inner) => def.innerType._zod.run({ value: inner, issues: [] }, ctx));
  };
});
var $ZodLazy = /* @__PURE__ */ $constructor("$ZodLazy", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "innerType", () => def.getter());
  defineLazy(inst._zod, "pattern", () => inst._zod.innerType?._zod?.pattern);
  defineLazy(inst._zod, "propValues", () => inst._zod.innerType?._zod?.propValues);
  defineLazy(inst._zod, "optin", () => inst._zod.innerType?._zod?.optin ?? void 0);
  defineLazy(inst._zod, "optout", () => inst._zod.innerType?._zod?.optout ?? void 0);
  inst._zod.parse = (payload, ctx) => {
    const inner = inst._zod.innerType;
    return inner._zod.run(payload, ctx);
  };
});
var $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
  $ZodCheck.init(inst, def);
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _) => {
    return payload;
  };
  inst._zod.check = (payload) => {
    const input = payload.value;
    const r = def.fn(input);
    if (r instanceof Promise) {
      return r.then((r2) => handleRefineResult(r2, payload, input, inst));
    }
    handleRefineResult(r, payload, input, inst);
    return;
  };
});
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      // incorporates params.error into issue reporting
      path: [...inst._zod.def.path ?? []],
      // incorporates params.error into issue reporting
      continue: !inst._zod.def.abort
      // params: inst._zod.def.params,
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}

// node_modules/zod/v4/locales/en.js
var error = () => {
  const Sizable = {
    string: { unit: "characters", verb: "to have" },
    file: { unit: "bytes", verb: "to have" },
    array: { unit: "items", verb: "to have" },
    set: { unit: "items", verb: "to have" },
    map: { unit: "entries", verb: "to have" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "email address",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datetime",
    date: "ISO date",
    time: "ISO time",
    duration: "ISO duration",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    mac: "MAC address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded string",
    base64url: "base64url-encoded string",
    json_string: "JSON string",
    e164: "E.164 number",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    // Compatibility: "nan" -> "NaN" for display
    nan: "NaN"
    // All other type names omitted - they fall back to raw values via ?? operator
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expected = TypeDictionary[issue2.expected] ?? issue2.expected;
        const receivedType = parsedType(issue2.input);
        const received = TypeDictionary[receivedType] ?? receivedType;
        return `Invalid input: expected ${expected}, received ${received}`;
      }
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
        return `Invalid option: expected one of ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Too big: expected ${issue2.origin ?? "value"} to have ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
        return `Too big: expected ${issue2.origin ?? "value"} to be ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Too small: expected ${issue2.origin} to have ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Too small: expected ${issue2.origin} to be ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Invalid string: must start with "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Invalid string: must end with "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Invalid string: must include "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Invalid string: must match pattern ${_issue.pattern}`;
        return `Invalid ${FormatDictionary[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Invalid number: must be a multiple of ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Unrecognized key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Invalid key in ${issue2.origin}`;
      case "invalid_union":
        return "Invalid input";
      case "invalid_element":
        return `Invalid value in ${issue2.origin}`;
      default:
        return `Invalid input`;
    }
  };
};
function en_default() {
  return {
    localeError: error()
  };
}

// node_modules/zod/v4/core/registries.js
var _a;
var $ZodRegistry = class {
  constructor() {
    this._map = /* @__PURE__ */ new WeakMap();
    this._idmap = /* @__PURE__ */ new Map();
  }
  add(schema, ..._meta) {
    const meta3 = _meta[0];
    this._map.set(schema, meta3);
    if (meta3 && typeof meta3 === "object" && "id" in meta3) {
      this._idmap.set(meta3.id, schema);
    }
    return this;
  }
  clear() {
    this._map = /* @__PURE__ */ new WeakMap();
    this._idmap = /* @__PURE__ */ new Map();
    return this;
  }
  remove(schema) {
    const meta3 = this._map.get(schema);
    if (meta3 && typeof meta3 === "object" && "id" in meta3) {
      this._idmap.delete(meta3.id);
    }
    this._map.delete(schema);
    return this;
  }
  get(schema) {
    const p = schema._zod.parent;
    if (p) {
      const pm = { ...this.get(p) ?? {} };
      delete pm.id;
      const f = { ...pm, ...this._map.get(schema) };
      return Object.keys(f).length ? f : void 0;
    }
    return this._map.get(schema);
  }
  has(schema) {
    return this._map.has(schema);
  }
};
function registry() {
  return new $ZodRegistry();
}
(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
var globalRegistry = globalThis.__zod_globalRegistry;

// node_modules/zod/v4/core/api.js
// @__NO_SIDE_EFFECTS__
function _string(Class2, params) {
  return new Class2({
    type: "string",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _coercedString(Class2, params) {
  return new Class2({
    type: "string",
    coerce: true,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _email(Class2, params) {
  return new Class2({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _guid(Class2, params) {
  return new Class2({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv7(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _url(Class2, params) {
  return new Class2({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _emoji2(Class2, params) {
  return new Class2({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _nanoid(Class2, params) {
  return new Class2({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cuid2(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ulid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _xid(Class2, params) {
  return new Class2({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ksuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ipv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ipv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _mac(Class2, params) {
  return new Class2({
    type: "string",
    format: "mac",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cidrv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cidrv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _base64(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _base64url(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _e164(Class2, params) {
  return new Class2({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _jwt(Class2, params) {
  return new Class2({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDateTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDate(Class2, params) {
  return new Class2({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDuration(Class2, params) {
  return new Class2({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _number(Class2, params) {
  return new Class2({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _coercedNumber(Class2, params) {
  return new Class2({
    type: "number",
    coerce: true,
    checks: [],
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _int(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _float32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "float32",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _float64(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "float64",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _int32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "int32",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uint32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "uint32",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _boolean(Class2, params) {
  return new Class2({
    type: "boolean",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _coercedBoolean(Class2, params) {
  return new Class2({
    type: "boolean",
    coerce: true,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _bigint(Class2, params) {
  return new Class2({
    type: "bigint",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _coercedBigint(Class2, params) {
  return new Class2({
    type: "bigint",
    coerce: true,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _int64(Class2, params) {
  return new Class2({
    type: "bigint",
    check: "bigint_format",
    abort: false,
    format: "int64",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uint64(Class2, params) {
  return new Class2({
    type: "bigint",
    check: "bigint_format",
    abort: false,
    format: "uint64",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _symbol(Class2, params) {
  return new Class2({
    type: "symbol",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _undefined2(Class2, params) {
  return new Class2({
    type: "undefined",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _null2(Class2, params) {
  return new Class2({
    type: "null",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _any(Class2) {
  return new Class2({
    type: "any"
  });
}
// @__NO_SIDE_EFFECTS__
function _unknown(Class2) {
  return new Class2({
    type: "unknown"
  });
}
// @__NO_SIDE_EFFECTS__
function _never(Class2, params) {
  return new Class2({
    type: "never",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _void(Class2, params) {
  return new Class2({
    type: "void",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _date(Class2, params) {
  return new Class2({
    type: "date",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _coercedDate(Class2, params) {
  return new Class2({
    type: "date",
    coerce: true,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _nan(Class2, params) {
  return new Class2({
    type: "nan",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
// @__NO_SIDE_EFFECTS__
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _positive(params) {
  return /* @__PURE__ */ _gt(0, params);
}
// @__NO_SIDE_EFFECTS__
function _negative(params) {
  return /* @__PURE__ */ _lt(0, params);
}
// @__NO_SIDE_EFFECTS__
function _nonpositive(params) {
  return /* @__PURE__ */ _lte(0, params);
}
// @__NO_SIDE_EFFECTS__
function _nonnegative(params) {
  return /* @__PURE__ */ _gte(0, params);
}
// @__NO_SIDE_EFFECTS__
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
// @__NO_SIDE_EFFECTS__
function _maxSize(maximum, params) {
  return new $ZodCheckMaxSize({
    check: "max_size",
    ...normalizeParams(params),
    maximum
  });
}
// @__NO_SIDE_EFFECTS__
function _minSize(minimum, params) {
  return new $ZodCheckMinSize({
    check: "min_size",
    ...normalizeParams(params),
    minimum
  });
}
// @__NO_SIDE_EFFECTS__
function _size(size, params) {
  return new $ZodCheckSizeEquals({
    check: "size_equals",
    ...normalizeParams(params),
    size
  });
}
// @__NO_SIDE_EFFECTS__
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
// @__NO_SIDE_EFFECTS__
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length
  });
}
// @__NO_SIDE_EFFECTS__
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}
// @__NO_SIDE_EFFECTS__
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _includes(includes, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes
  });
}
// @__NO_SIDE_EFFECTS__
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix
  });
}
// @__NO_SIDE_EFFECTS__
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix
  });
}
// @__NO_SIDE_EFFECTS__
function _property(property, schema, params) {
  return new $ZodCheckProperty({
    check: "property",
    property,
    schema,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _mime(types, params) {
  return new $ZodCheckMimeType({
    check: "mime_type",
    mime: types,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
// @__NO_SIDE_EFFECTS__
function _normalize(form) {
  return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
}
// @__NO_SIDE_EFFECTS__
function _trim() {
  return /* @__PURE__ */ _overwrite((input) => input.trim());
}
// @__NO_SIDE_EFFECTS__
function _toLowerCase() {
  return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function _toUpperCase() {
  return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function _slugify() {
  return /* @__PURE__ */ _overwrite((input) => slugify(input));
}
// @__NO_SIDE_EFFECTS__
function _array(Class2, element, params) {
  return new Class2({
    type: "array",
    element,
    // get element() {
    //   return element;
    // },
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _file(Class2, params) {
  return new Class2({
    type: "file",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _custom(Class2, fn, _params) {
  const norm = normalizeParams(_params);
  norm.abort ?? (norm.abort = true);
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...norm
  });
  return schema;
}
// @__NO_SIDE_EFFECTS__
function _refine(Class2, fn, _params) {
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}
// @__NO_SIDE_EFFECTS__
function _superRefine(fn) {
  const ch = /* @__PURE__ */ _check((payload) => {
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(issue(issue2, payload.value, ch._zod.def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  });
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _check(fn, params) {
  const ch = new $ZodCheck({
    check: "custom",
    ...normalizeParams(params)
  });
  ch._zod.check = fn;
  return ch;
}
// @__NO_SIDE_EFFECTS__
function describe(description) {
  const ch = new $ZodCheck({ check: "describe" });
  ch._zod.onattach = [
    (inst) => {
      const existing = globalRegistry.get(inst) ?? {};
      globalRegistry.add(inst, { ...existing, description });
    }
  ];
  ch._zod.check = () => {
  };
  return ch;
}
// @__NO_SIDE_EFFECTS__
function meta(metadata) {
  const ch = new $ZodCheck({ check: "meta" });
  ch._zod.onattach = [
    (inst) => {
      const existing = globalRegistry.get(inst) ?? {};
      globalRegistry.add(inst, { ...existing, ...metadata });
    }
  ];
  ch._zod.check = () => {
  };
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _stringbool(Classes, _params) {
  const params = normalizeParams(_params);
  let truthyArray = params.truthy ?? ["true", "1", "yes", "on", "y", "enabled"];
  let falsyArray = params.falsy ?? ["false", "0", "no", "off", "n", "disabled"];
  if (params.case !== "sensitive") {
    truthyArray = truthyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
    falsyArray = falsyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
  }
  const truthySet = new Set(truthyArray);
  const falsySet = new Set(falsyArray);
  const _Codec = Classes.Codec ?? $ZodCodec;
  const _Boolean = Classes.Boolean ?? $ZodBoolean;
  const _String = Classes.String ?? $ZodString;
  const stringSchema = new _String({ type: "string", error: params.error });
  const booleanSchema = new _Boolean({ type: "boolean", error: params.error });
  const codec2 = new _Codec({
    type: "pipe",
    in: stringSchema,
    out: booleanSchema,
    transform: ((input, payload) => {
      let data = input;
      if (params.case !== "sensitive")
        data = data.toLowerCase();
      if (truthySet.has(data)) {
        return true;
      } else if (falsySet.has(data)) {
        return false;
      } else {
        payload.issues.push({
          code: "invalid_value",
          expected: "stringbool",
          values: [...truthySet, ...falsySet],
          input: payload.value,
          inst: codec2,
          continue: false
        });
        return {};
      }
    }),
    reverseTransform: ((input, _payload) => {
      if (input === true) {
        return truthyArray[0] || "true";
      } else {
        return falsyArray[0] || "false";
      }
    }),
    error: params.error
  });
  return codec2;
}
// @__NO_SIDE_EFFECTS__
function _stringFormat(Class2, format, fnOrRegex, _params = {}) {
  const params = normalizeParams(_params);
  const def = {
    ...normalizeParams(_params),
    check: "string_format",
    type: "string",
    format,
    fn: typeof fnOrRegex === "function" ? fnOrRegex : (val) => fnOrRegex.test(val),
    ...params
  };
  if (fnOrRegex instanceof RegExp) {
    def.pattern = fnOrRegex;
  }
  const inst = new Class2(def);
  return inst;
}

// node_modules/zod/v4/core/to-json-schema.js
function initializeContext(params) {
  let target = params?.target ?? "draft-2020-12";
  if (target === "draft-4")
    target = "draft-04";
  if (target === "draft-7")
    target = "draft-07";
  return {
    processors: params.processors ?? {},
    metadataRegistry: params?.metadata ?? globalRegistry,
    target,
    unrepresentable: params?.unrepresentable ?? "throw",
    override: params?.override ?? (() => {
    }),
    io: params?.io ?? "output",
    counter: 0,
    seen: /* @__PURE__ */ new Map(),
    cycles: params?.cycles ?? "ref",
    reused: params?.reused ?? "inline",
    external: params?.external ?? void 0
  };
}
function process2(schema, ctx, _params = { path: [], schemaPath: [] }) {
  var _a2;
  const def = schema._zod.def;
  const seen = ctx.seen.get(schema);
  if (seen) {
    seen.count++;
    const isCycle = _params.schemaPath.includes(schema);
    if (isCycle) {
      seen.cycle = _params.path;
    }
    return seen.schema;
  }
  const result = { schema: {}, count: 1, cycle: void 0, path: _params.path };
  ctx.seen.set(schema, result);
  const overrideSchema = schema._zod.toJSONSchema?.();
  if (overrideSchema) {
    result.schema = overrideSchema;
  } else {
    const params = {
      ..._params,
      schemaPath: [..._params.schemaPath, schema],
      path: _params.path
    };
    if (schema._zod.processJSONSchema) {
      schema._zod.processJSONSchema(ctx, result.schema, params);
    } else {
      const _json = result.schema;
      const processor = ctx.processors[def.type];
      if (!processor) {
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
      }
      processor(schema, ctx, _json, params);
    }
    const parent = schema._zod.parent;
    if (parent) {
      if (!result.ref)
        result.ref = parent;
      process2(parent, ctx, params);
      ctx.seen.get(parent).isParent = true;
    }
  }
  const meta3 = ctx.metadataRegistry.get(schema);
  if (meta3)
    Object.assign(result.schema, meta3);
  if (ctx.io === "input" && isTransforming(schema)) {
    delete result.schema.examples;
    delete result.schema.default;
  }
  if (ctx.io === "input" && result.schema._prefault)
    (_a2 = result.schema).default ?? (_a2.default = result.schema._prefault);
  delete result.schema._prefault;
  const _result = ctx.seen.get(schema);
  return _result.schema;
}
function extractDefs(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const idToSchema = /* @__PURE__ */ new Map();
  for (const entry of ctx.seen.entries()) {
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      const existing = idToSchema.get(id);
      if (existing && existing !== entry[0]) {
        throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      }
      idToSchema.set(id, entry[0]);
    }
  }
  const makeURI = (entry) => {
    const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
    if (ctx.external) {
      const externalId = ctx.external.registry.get(entry[0])?.id;
      const uriGenerator = ctx.external.uri ?? ((id2) => id2);
      if (externalId) {
        return { ref: uriGenerator(externalId) };
      }
      const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
      entry[1].defId = id;
      return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
    }
    if (entry[1] === root) {
      return { ref: "#" };
    }
    const uriPrefix = `#`;
    const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
    const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
    return { defId, ref: defUriPrefix + defId };
  };
  const extractToDef = (entry) => {
    if (entry[1].schema.$ref) {
      return;
    }
    const seen = entry[1];
    const { ref, defId } = makeURI(entry);
    seen.def = { ...seen.schema };
    if (defId)
      seen.defId = defId;
    const schema2 = seen.schema;
    for (const key in schema2) {
      delete schema2[key];
    }
    schema2.$ref = ref;
  };
  if (ctx.cycles === "throw") {
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.cycle) {
        throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
      }
    }
  }
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (schema === entry[0]) {
      extractToDef(entry);
      continue;
    }
    if (ctx.external) {
      const ext = ctx.external.registry.get(entry[0])?.id;
      if (schema !== entry[0] && ext) {
        extractToDef(entry);
        continue;
      }
    }
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      extractToDef(entry);
      continue;
    }
    if (seen.cycle) {
      extractToDef(entry);
      continue;
    }
    if (seen.count > 1) {
      if (ctx.reused === "ref") {
        extractToDef(entry);
        continue;
      }
    }
  }
}
function finalize(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const flattenRef = (zodSchema) => {
    const seen = ctx.seen.get(zodSchema);
    if (seen.ref === null)
      return;
    const schema2 = seen.def ?? seen.schema;
    const _cached = { ...schema2 };
    const ref = seen.ref;
    seen.ref = null;
    if (ref) {
      flattenRef(ref);
      const refSeen = ctx.seen.get(ref);
      const refSchema = refSeen.schema;
      if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
        schema2.allOf = schema2.allOf ?? [];
        schema2.allOf.push(refSchema);
      } else {
        Object.assign(schema2, refSchema);
      }
      Object.assign(schema2, _cached);
      const isParentRef = zodSchema._zod.parent === ref;
      if (isParentRef) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (!(key in _cached)) {
            delete schema2[key];
          }
        }
      }
      if (refSchema.$ref && refSeen.def) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (key in refSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(refSeen.def[key])) {
            delete schema2[key];
          }
        }
      }
    }
    const parent = zodSchema._zod.parent;
    if (parent && parent !== ref) {
      flattenRef(parent);
      const parentSeen = ctx.seen.get(parent);
      if (parentSeen?.schema.$ref) {
        schema2.$ref = parentSeen.schema.$ref;
        if (parentSeen.def) {
          for (const key in schema2) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (key in parentSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(parentSeen.def[key])) {
              delete schema2[key];
            }
          }
        }
      }
    }
    ctx.override({
      zodSchema,
      jsonSchema: schema2,
      path: seen.path ?? []
    });
  };
  for (const entry of [...ctx.seen.entries()].reverse()) {
    flattenRef(entry[0]);
  }
  const result = {};
  if (ctx.target === "draft-2020-12") {
    result.$schema = "https://json-schema.org/draft/2020-12/schema";
  } else if (ctx.target === "draft-07") {
    result.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (ctx.target === "draft-04") {
    result.$schema = "http://json-schema.org/draft-04/schema#";
  } else if (ctx.target === "openapi-3.0") {
  } else {
  }
  if (ctx.external?.uri) {
    const id = ctx.external.registry.get(schema)?.id;
    if (!id)
      throw new Error("Schema is missing an `id` property");
    result.$id = ctx.external.uri(id);
  }
  Object.assign(result, root.def ?? root.schema);
  const defs = ctx.external?.defs ?? {};
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (seen.def && seen.defId) {
      defs[seen.defId] = seen.def;
    }
  }
  if (ctx.external) {
  } else {
    if (Object.keys(defs).length > 0) {
      if (ctx.target === "draft-2020-12") {
        result.$defs = defs;
      } else {
        result.definitions = defs;
      }
    }
  }
  try {
    const finalized = JSON.parse(JSON.stringify(result));
    Object.defineProperty(finalized, "~standard", {
      value: {
        ...schema["~standard"],
        jsonSchema: {
          input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
          output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
        }
      },
      enumerable: false,
      writable: false
    });
    return finalized;
  } catch (_err) {
    throw new Error("Error converting schema to JSON.");
  }
}
function isTransforming(_schema, _ctx) {
  const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
  if (ctx.seen.has(_schema))
    return false;
  ctx.seen.add(_schema);
  const def = _schema._zod.def;
  if (def.type === "transform")
    return true;
  if (def.type === "array")
    return isTransforming(def.element, ctx);
  if (def.type === "set")
    return isTransforming(def.valueType, ctx);
  if (def.type === "lazy")
    return isTransforming(def.getter(), ctx);
  if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") {
    return isTransforming(def.innerType, ctx);
  }
  if (def.type === "intersection") {
    return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
  }
  if (def.type === "record" || def.type === "map") {
    return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
  }
  if (def.type === "pipe") {
    return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
  }
  if (def.type === "object") {
    for (const key in def.shape) {
      if (isTransforming(def.shape[key], ctx))
        return true;
    }
    return false;
  }
  if (def.type === "union") {
    for (const option of def.options) {
      if (isTransforming(option, ctx))
        return true;
    }
    return false;
  }
  if (def.type === "tuple") {
    for (const item of def.items) {
      if (isTransforming(item, ctx))
        return true;
    }
    if (def.rest && isTransforming(def.rest, ctx))
      return true;
    return false;
  }
  return false;
}
var createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
  const ctx = initializeContext({ ...params, processors });
  process2(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
var createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
  const { libraryOptions, target } = params ?? {};
  const ctx = initializeContext({ ...libraryOptions ?? {}, target, io, processors });
  process2(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};

// node_modules/zod/v4/core/json-schema-processors.js
var formatMap = {
  guid: "uuid",
  url: "uri",
  datetime: "date-time",
  json_string: "json-string",
  regex: ""
  // do not set
};
var stringProcessor = (schema, ctx, _json, _params) => {
  const json2 = _json;
  json2.type = "string";
  const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
  if (typeof minimum === "number")
    json2.minLength = minimum;
  if (typeof maximum === "number")
    json2.maxLength = maximum;
  if (format) {
    json2.format = formatMap[format] ?? format;
    if (json2.format === "")
      delete json2.format;
    if (format === "time") {
      delete json2.format;
    }
  }
  if (contentEncoding)
    json2.contentEncoding = contentEncoding;
  if (patterns && patterns.size > 0) {
    const regexes = [...patterns];
    if (regexes.length === 1)
      json2.pattern = regexes[0].source;
    else if (regexes.length > 1) {
      json2.allOf = [
        ...regexes.map((regex) => ({
          ...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
          pattern: regex.source
        }))
      ];
    }
  }
};
var numberProcessor = (schema, ctx, _json, _params) => {
  const json2 = _json;
  const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
  if (typeof format === "string" && format.includes("int"))
    json2.type = "integer";
  else
    json2.type = "number";
  if (typeof exclusiveMinimum === "number") {
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
      json2.minimum = exclusiveMinimum;
      json2.exclusiveMinimum = true;
    } else {
      json2.exclusiveMinimum = exclusiveMinimum;
    }
  }
  if (typeof minimum === "number") {
    json2.minimum = minimum;
    if (typeof exclusiveMinimum === "number" && ctx.target !== "draft-04") {
      if (exclusiveMinimum >= minimum)
        delete json2.minimum;
      else
        delete json2.exclusiveMinimum;
    }
  }
  if (typeof exclusiveMaximum === "number") {
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
      json2.maximum = exclusiveMaximum;
      json2.exclusiveMaximum = true;
    } else {
      json2.exclusiveMaximum = exclusiveMaximum;
    }
  }
  if (typeof maximum === "number") {
    json2.maximum = maximum;
    if (typeof exclusiveMaximum === "number" && ctx.target !== "draft-04") {
      if (exclusiveMaximum <= maximum)
        delete json2.maximum;
      else
        delete json2.exclusiveMaximum;
    }
  }
  if (typeof multipleOf === "number")
    json2.multipleOf = multipleOf;
};
var booleanProcessor = (_schema, _ctx, json2, _params) => {
  json2.type = "boolean";
};
var bigintProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("BigInt cannot be represented in JSON Schema");
  }
};
var symbolProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Symbols cannot be represented in JSON Schema");
  }
};
var nullProcessor = (_schema, ctx, json2, _params) => {
  if (ctx.target === "openapi-3.0") {
    json2.type = "string";
    json2.nullable = true;
    json2.enum = [null];
  } else {
    json2.type = "null";
  }
};
var undefinedProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Undefined cannot be represented in JSON Schema");
  }
};
var voidProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Void cannot be represented in JSON Schema");
  }
};
var neverProcessor = (_schema, _ctx, json2, _params) => {
  json2.not = {};
};
var anyProcessor = (_schema, _ctx, _json, _params) => {
};
var unknownProcessor = (_schema, _ctx, _json, _params) => {
};
var dateProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Date cannot be represented in JSON Schema");
  }
};
var enumProcessor = (schema, _ctx, json2, _params) => {
  const def = schema._zod.def;
  const values = getEnumValues(def.entries);
  if (values.every((v) => typeof v === "number"))
    json2.type = "number";
  if (values.every((v) => typeof v === "string"))
    json2.type = "string";
  json2.enum = values;
};
var literalProcessor = (schema, ctx, json2, _params) => {
  const def = schema._zod.def;
  const vals = [];
  for (const val of def.values) {
    if (val === void 0) {
      if (ctx.unrepresentable === "throw") {
        throw new Error("Literal `undefined` cannot be represented in JSON Schema");
      } else {
      }
    } else if (typeof val === "bigint") {
      if (ctx.unrepresentable === "throw") {
        throw new Error("BigInt literals cannot be represented in JSON Schema");
      } else {
        vals.push(Number(val));
      }
    } else {
      vals.push(val);
    }
  }
  if (vals.length === 0) {
  } else if (vals.length === 1) {
    const val = vals[0];
    json2.type = val === null ? "null" : typeof val;
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
      json2.enum = [val];
    } else {
      json2.const = val;
    }
  } else {
    if (vals.every((v) => typeof v === "number"))
      json2.type = "number";
    if (vals.every((v) => typeof v === "string"))
      json2.type = "string";
    if (vals.every((v) => typeof v === "boolean"))
      json2.type = "boolean";
    if (vals.every((v) => v === null))
      json2.type = "null";
    json2.enum = vals;
  }
};
var nanProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("NaN cannot be represented in JSON Schema");
  }
};
var templateLiteralProcessor = (schema, _ctx, json2, _params) => {
  const _json = json2;
  const pattern = schema._zod.pattern;
  if (!pattern)
    throw new Error("Pattern not found in template literal");
  _json.type = "string";
  _json.pattern = pattern.source;
};
var fileProcessor = (schema, _ctx, json2, _params) => {
  const _json = json2;
  const file2 = {
    type: "string",
    format: "binary",
    contentEncoding: "binary"
  };
  const { minimum, maximum, mime } = schema._zod.bag;
  if (minimum !== void 0)
    file2.minLength = minimum;
  if (maximum !== void 0)
    file2.maxLength = maximum;
  if (mime) {
    if (mime.length === 1) {
      file2.contentMediaType = mime[0];
      Object.assign(_json, file2);
    } else {
      Object.assign(_json, file2);
      _json.anyOf = mime.map((m) => ({ contentMediaType: m }));
    }
  } else {
    Object.assign(_json, file2);
  }
};
var successProcessor = (_schema, _ctx, json2, _params) => {
  json2.type = "boolean";
};
var customProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Custom types cannot be represented in JSON Schema");
  }
};
var functionProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Function types cannot be represented in JSON Schema");
  }
};
var transformProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Transforms cannot be represented in JSON Schema");
  }
};
var mapProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Map cannot be represented in JSON Schema");
  }
};
var setProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Set cannot be represented in JSON Schema");
  }
};
var arrayProcessor = (schema, ctx, _json, params) => {
  const json2 = _json;
  const def = schema._zod.def;
  const { minimum, maximum } = schema._zod.bag;
  if (typeof minimum === "number")
    json2.minItems = minimum;
  if (typeof maximum === "number")
    json2.maxItems = maximum;
  json2.type = "array";
  json2.items = process2(def.element, ctx, { ...params, path: [...params.path, "items"] });
};
var objectProcessor = (schema, ctx, _json, params) => {
  const json2 = _json;
  const def = schema._zod.def;
  json2.type = "object";
  json2.properties = {};
  const shape = def.shape;
  for (const key in shape) {
    json2.properties[key] = process2(shape[key], ctx, {
      ...params,
      path: [...params.path, "properties", key]
    });
  }
  const allKeys = new Set(Object.keys(shape));
  const requiredKeys = new Set([...allKeys].filter((key) => {
    const v = def.shape[key]._zod;
    if (ctx.io === "input") {
      return v.optin === void 0;
    } else {
      return v.optout === void 0;
    }
  }));
  if (requiredKeys.size > 0) {
    json2.required = Array.from(requiredKeys);
  }
  if (def.catchall?._zod.def.type === "never") {
    json2.additionalProperties = false;
  } else if (!def.catchall) {
    if (ctx.io === "output")
      json2.additionalProperties = false;
  } else if (def.catchall) {
    json2.additionalProperties = process2(def.catchall, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
};
var unionProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  const isExclusive = def.inclusive === false;
  const options = def.options.map((x, i) => process2(x, ctx, {
    ...params,
    path: [...params.path, isExclusive ? "oneOf" : "anyOf", i]
  }));
  if (isExclusive) {
    json2.oneOf = options;
  } else {
    json2.anyOf = options;
  }
};
var intersectionProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  const a = process2(def.left, ctx, {
    ...params,
    path: [...params.path, "allOf", 0]
  });
  const b = process2(def.right, ctx, {
    ...params,
    path: [...params.path, "allOf", 1]
  });
  const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
  const allOf = [
    ...isSimpleIntersection(a) ? a.allOf : [a],
    ...isSimpleIntersection(b) ? b.allOf : [b]
  ];
  json2.allOf = allOf;
};
var tupleProcessor = (schema, ctx, _json, params) => {
  const json2 = _json;
  const def = schema._zod.def;
  json2.type = "array";
  const prefixPath = ctx.target === "draft-2020-12" ? "prefixItems" : "items";
  const restPath = ctx.target === "draft-2020-12" ? "items" : ctx.target === "openapi-3.0" ? "items" : "additionalItems";
  const prefixItems = def.items.map((x, i) => process2(x, ctx, {
    ...params,
    path: [...params.path, prefixPath, i]
  }));
  const rest = def.rest ? process2(def.rest, ctx, {
    ...params,
    path: [...params.path, restPath, ...ctx.target === "openapi-3.0" ? [def.items.length] : []]
  }) : null;
  if (ctx.target === "draft-2020-12") {
    json2.prefixItems = prefixItems;
    if (rest) {
      json2.items = rest;
    }
  } else if (ctx.target === "openapi-3.0") {
    json2.items = {
      anyOf: prefixItems
    };
    if (rest) {
      json2.items.anyOf.push(rest);
    }
    json2.minItems = prefixItems.length;
    if (!rest) {
      json2.maxItems = prefixItems.length;
    }
  } else {
    json2.items = prefixItems;
    if (rest) {
      json2.additionalItems = rest;
    }
  }
  const { minimum, maximum } = schema._zod.bag;
  if (typeof minimum === "number")
    json2.minItems = minimum;
  if (typeof maximum === "number")
    json2.maxItems = maximum;
};
var recordProcessor = (schema, ctx, _json, params) => {
  const json2 = _json;
  const def = schema._zod.def;
  json2.type = "object";
  const keyType = def.keyType;
  const keyBag = keyType._zod.bag;
  const patterns = keyBag?.patterns;
  if (def.mode === "loose" && patterns && patterns.size > 0) {
    const valueSchema = process2(def.valueType, ctx, {
      ...params,
      path: [...params.path, "patternProperties", "*"]
    });
    json2.patternProperties = {};
    for (const pattern of patterns) {
      json2.patternProperties[pattern.source] = valueSchema;
    }
  } else {
    if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
      json2.propertyNames = process2(def.keyType, ctx, {
        ...params,
        path: [...params.path, "propertyNames"]
      });
    }
    json2.additionalProperties = process2(def.valueType, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
  const keyValues = keyType._zod.values;
  if (keyValues) {
    const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
    if (validKeyValues.length > 0) {
      json2.required = validKeyValues;
    }
  }
};
var nullableProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  const inner = process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  if (ctx.target === "openapi-3.0") {
    seen.ref = def.innerType;
    json2.nullable = true;
  } else {
    json2.anyOf = [inner, { type: "null" }];
  }
};
var nonoptionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
var defaultProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json2.default = JSON.parse(JSON.stringify(def.defaultValue));
};
var prefaultProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  if (ctx.io === "input")
    json2._prefault = JSON.parse(JSON.stringify(def.defaultValue));
};
var catchProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  let catchValue;
  try {
    catchValue = def.catchValue(void 0);
  } catch {
    throw new Error("Dynamic catch values are not supported in JSON Schema");
  }
  json2.default = catchValue;
};
var pipeProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  const innerType = ctx.io === "input" ? def.in._zod.def.type === "transform" ? def.out : def.in : def.out;
  process2(innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = innerType;
};
var readonlyProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json2.readOnly = true;
};
var promiseProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
var optionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
var lazyProcessor = (schema, ctx, _json, params) => {
  const innerType = schema._zod.innerType;
  process2(innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = innerType;
};

// node_modules/zod/v4/classic/schemas.js
var schemas_exports2 = {};
__export(schemas_exports2, {
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBase64: () => ZodBase64,
  ZodBase64URL: () => ZodBase64URL,
  ZodBigInt: () => ZodBigInt,
  ZodBigIntFormat: () => ZodBigIntFormat,
  ZodBoolean: () => ZodBoolean,
  ZodCIDRv4: () => ZodCIDRv4,
  ZodCIDRv6: () => ZodCIDRv6,
  ZodCUID: () => ZodCUID,
  ZodCUID2: () => ZodCUID2,
  ZodCatch: () => ZodCatch,
  ZodCodec: () => ZodCodec,
  ZodCustom: () => ZodCustom,
  ZodCustomStringFormat: () => ZodCustomStringFormat,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodE164: () => ZodE164,
  ZodEmail: () => ZodEmail,
  ZodEmoji: () => ZodEmoji,
  ZodEnum: () => ZodEnum,
  ZodExactOptional: () => ZodExactOptional,
  ZodFile: () => ZodFile,
  ZodFunction: () => ZodFunction,
  ZodGUID: () => ZodGUID,
  ZodIPv4: () => ZodIPv4,
  ZodIPv6: () => ZodIPv6,
  ZodIntersection: () => ZodIntersection,
  ZodJWT: () => ZodJWT,
  ZodKSUID: () => ZodKSUID,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMAC: () => ZodMAC,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNanoID: () => ZodNanoID,
  ZodNever: () => ZodNever,
  ZodNonOptional: () => ZodNonOptional,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodNumberFormat: () => ZodNumberFormat,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodPipe: () => ZodPipe,
  ZodPrefault: () => ZodPrefault,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodStringFormat: () => ZodStringFormat,
  ZodSuccess: () => ZodSuccess,
  ZodSymbol: () => ZodSymbol,
  ZodTemplateLiteral: () => ZodTemplateLiteral,
  ZodTransform: () => ZodTransform,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodULID: () => ZodULID,
  ZodURL: () => ZodURL,
  ZodUUID: () => ZodUUID,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  ZodXID: () => ZodXID,
  ZodXor: () => ZodXor,
  _ZodString: () => _ZodString,
  _default: () => _default,
  _function: () => _function,
  any: () => any,
  array: () => array,
  base64: () => base642,
  base64url: () => base64url2,
  bigint: () => bigint2,
  boolean: () => boolean2,
  catch: () => _catch,
  check: () => check,
  cidrv4: () => cidrv42,
  cidrv6: () => cidrv62,
  codec: () => codec,
  cuid: () => cuid3,
  cuid2: () => cuid22,
  custom: () => custom,
  date: () => date3,
  describe: () => describe2,
  discriminatedUnion: () => discriminatedUnion,
  e164: () => e1642,
  email: () => email2,
  emoji: () => emoji2,
  enum: () => _enum,
  exactOptional: () => exactOptional,
  file: () => file,
  float32: () => float32,
  float64: () => float64,
  function: () => _function,
  guid: () => guid2,
  hash: () => hash,
  hex: () => hex2,
  hostname: () => hostname2,
  httpUrl: () => httpUrl,
  instanceof: () => _instanceof,
  int: () => int,
  int32: () => int32,
  int64: () => int64,
  intersection: () => intersection,
  ipv4: () => ipv42,
  ipv6: () => ipv62,
  json: () => json,
  jwt: () => jwt,
  keyof: () => keyof,
  ksuid: () => ksuid2,
  lazy: () => lazy,
  literal: () => literal,
  looseObject: () => looseObject,
  looseRecord: () => looseRecord,
  mac: () => mac2,
  map: () => map,
  meta: () => meta2,
  nan: () => nan,
  nanoid: () => nanoid2,
  nativeEnum: () => nativeEnum,
  never: () => never,
  nonoptional: () => nonoptional,
  null: () => _null3,
  nullable: () => nullable,
  nullish: () => nullish2,
  number: () => number2,
  object: () => object,
  optional: () => optional,
  partialRecord: () => partialRecord,
  pipe: () => pipe,
  prefault: () => prefault,
  preprocess: () => preprocess,
  promise: () => promise,
  readonly: () => readonly,
  record: () => record,
  refine: () => refine,
  set: () => set,
  strictObject: () => strictObject,
  string: () => string2,
  stringFormat: () => stringFormat,
  stringbool: () => stringbool,
  success: () => success,
  superRefine: () => superRefine,
  symbol: () => symbol,
  templateLiteral: () => templateLiteral,
  transform: () => transform,
  tuple: () => tuple,
  uint32: () => uint32,
  uint64: () => uint64,
  ulid: () => ulid2,
  undefined: () => _undefined3,
  union: () => union,
  unknown: () => unknown,
  url: () => url,
  uuid: () => uuid2,
  uuidv4: () => uuidv4,
  uuidv6: () => uuidv6,
  uuidv7: () => uuidv7,
  void: () => _void2,
  xid: () => xid2,
  xor: () => xor
});

// node_modules/zod/v4/classic/checks.js
var checks_exports2 = {};
__export(checks_exports2, {
  endsWith: () => _endsWith,
  gt: () => _gt,
  gte: () => _gte,
  includes: () => _includes,
  length: () => _length,
  lowercase: () => _lowercase,
  lt: () => _lt,
  lte: () => _lte,
  maxLength: () => _maxLength,
  maxSize: () => _maxSize,
  mime: () => _mime,
  minLength: () => _minLength,
  minSize: () => _minSize,
  multipleOf: () => _multipleOf,
  negative: () => _negative,
  nonnegative: () => _nonnegative,
  nonpositive: () => _nonpositive,
  normalize: () => _normalize,
  overwrite: () => _overwrite,
  positive: () => _positive,
  property: () => _property,
  regex: () => _regex,
  size: () => _size,
  slugify: () => _slugify,
  startsWith: () => _startsWith,
  toLowerCase: () => _toLowerCase,
  toUpperCase: () => _toUpperCase,
  trim: () => _trim,
  uppercase: () => _uppercase
});

// node_modules/zod/v4/classic/iso.js
var iso_exports = {};
__export(iso_exports, {
  ZodISODate: () => ZodISODate,
  ZodISODateTime: () => ZodISODateTime,
  ZodISODuration: () => ZodISODuration,
  ZodISOTime: () => ZodISOTime,
  date: () => date2,
  datetime: () => datetime2,
  duration: () => duration2,
  time: () => time2
});
var ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
  $ZodISODateTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function datetime2(params) {
  return _isoDateTime(ZodISODateTime, params);
}
var ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
  $ZodISODate.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function date2(params) {
  return _isoDate(ZodISODate, params);
}
var ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
  $ZodISOTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function time2(params) {
  return _isoTime(ZodISOTime, params);
}
var ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
  $ZodISODuration.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function duration2(params) {
  return _isoDuration(ZodISODuration, params);
}

// node_modules/zod/v4/classic/errors.js
var initializer2 = (inst, issues) => {
  $ZodError.init(inst, issues);
  inst.name = "ZodError";
  Object.defineProperties(inst, {
    format: {
      value: (mapper) => formatError(inst, mapper)
      // enumerable: false,
    },
    flatten: {
      value: (mapper) => flattenError(inst, mapper)
      // enumerable: false,
    },
    addIssue: {
      value: (issue2) => {
        inst.issues.push(issue2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
      // enumerable: false,
    },
    addIssues: {
      value: (issues2) => {
        inst.issues.push(...issues2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
      // enumerable: false,
    },
    isEmpty: {
      get() {
        return inst.issues.length === 0;
      }
      // enumerable: false,
    }
  });
};
var ZodError = $constructor("ZodError", initializer2);
var ZodRealError = $constructor("ZodError", initializer2, {
  Parent: Error
});

// node_modules/zod/v4/classic/parse.js
var parse2 = /* @__PURE__ */ _parse(ZodRealError);
var parseAsync2 = /* @__PURE__ */ _parseAsync(ZodRealError);
var safeParse2 = /* @__PURE__ */ _safeParse(ZodRealError);
var safeParseAsync2 = /* @__PURE__ */ _safeParseAsync(ZodRealError);
var encode = /* @__PURE__ */ _encode(ZodRealError);
var decode = /* @__PURE__ */ _decode(ZodRealError);
var encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
var decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
var safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
var safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
var safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
var safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);

// node_modules/zod/v4/classic/schemas.js
var ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
  $ZodType.init(inst, def);
  Object.assign(inst["~standard"], {
    jsonSchema: {
      input: createStandardJSONSchemaMethod(inst, "input"),
      output: createStandardJSONSchemaMethod(inst, "output")
    }
  });
  inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
  inst.def = def;
  inst.type = def.type;
  Object.defineProperty(inst, "_def", { value: def });
  inst.check = (...checks) => {
    return inst.clone(util_exports.mergeDefs(def, {
      checks: [
        ...def.checks ?? [],
        ...checks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
      ]
    }), {
      parent: true
    });
  };
  inst.with = inst.check;
  inst.clone = (def2, params) => clone(inst, def2, params);
  inst.brand = () => inst;
  inst.register = ((reg, meta3) => {
    reg.add(inst, meta3);
    return inst;
  });
  inst.parse = (data, params) => parse2(inst, data, params, { callee: inst.parse });
  inst.safeParse = (data, params) => safeParse2(inst, data, params);
  inst.parseAsync = async (data, params) => parseAsync2(inst, data, params, { callee: inst.parseAsync });
  inst.safeParseAsync = async (data, params) => safeParseAsync2(inst, data, params);
  inst.spa = inst.safeParseAsync;
  inst.encode = (data, params) => encode(inst, data, params);
  inst.decode = (data, params) => decode(inst, data, params);
  inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
  inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
  inst.safeEncode = (data, params) => safeEncode(inst, data, params);
  inst.safeDecode = (data, params) => safeDecode(inst, data, params);
  inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
  inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
  inst.refine = (check2, params) => inst.check(refine(check2, params));
  inst.superRefine = (refinement) => inst.check(superRefine(refinement));
  inst.overwrite = (fn) => inst.check(_overwrite(fn));
  inst.optional = () => optional(inst);
  inst.exactOptional = () => exactOptional(inst);
  inst.nullable = () => nullable(inst);
  inst.nullish = () => optional(nullable(inst));
  inst.nonoptional = (params) => nonoptional(inst, params);
  inst.array = () => array(inst);
  inst.or = (arg) => union([inst, arg]);
  inst.and = (arg) => intersection(inst, arg);
  inst.transform = (tx) => pipe(inst, transform(tx));
  inst.default = (def2) => _default(inst, def2);
  inst.prefault = (def2) => prefault(inst, def2);
  inst.catch = (params) => _catch(inst, params);
  inst.pipe = (target) => pipe(inst, target);
  inst.readonly = () => readonly(inst);
  inst.describe = (description) => {
    const cl = inst.clone();
    globalRegistry.add(cl, { description });
    return cl;
  };
  Object.defineProperty(inst, "description", {
    get() {
      return globalRegistry.get(inst)?.description;
    },
    configurable: true
  });
  inst.meta = (...args) => {
    if (args.length === 0) {
      return globalRegistry.get(inst);
    }
    const cl = inst.clone();
    globalRegistry.add(cl, args[0]);
    return cl;
  };
  inst.isOptional = () => inst.safeParse(void 0).success;
  inst.isNullable = () => inst.safeParse(null).success;
  inst.apply = (fn) => fn(inst);
  return inst;
});
var _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => stringProcessor(inst, ctx, json2, params);
  const bag = inst._zod.bag;
  inst.format = bag.format ?? null;
  inst.minLength = bag.minimum ?? null;
  inst.maxLength = bag.maximum ?? null;
  inst.regex = (...args) => inst.check(_regex(...args));
  inst.includes = (...args) => inst.check(_includes(...args));
  inst.startsWith = (...args) => inst.check(_startsWith(...args));
  inst.endsWith = (...args) => inst.check(_endsWith(...args));
  inst.min = (...args) => inst.check(_minLength(...args));
  inst.max = (...args) => inst.check(_maxLength(...args));
  inst.length = (...args) => inst.check(_length(...args));
  inst.nonempty = (...args) => inst.check(_minLength(1, ...args));
  inst.lowercase = (params) => inst.check(_lowercase(params));
  inst.uppercase = (params) => inst.check(_uppercase(params));
  inst.trim = () => inst.check(_trim());
  inst.normalize = (...args) => inst.check(_normalize(...args));
  inst.toLowerCase = () => inst.check(_toLowerCase());
  inst.toUpperCase = () => inst.check(_toUpperCase());
  inst.slugify = () => inst.check(_slugify());
});
var ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  _ZodString.init(inst, def);
  inst.email = (params) => inst.check(_email(ZodEmail, params));
  inst.url = (params) => inst.check(_url(ZodURL, params));
  inst.jwt = (params) => inst.check(_jwt(ZodJWT, params));
  inst.emoji = (params) => inst.check(_emoji2(ZodEmoji, params));
  inst.guid = (params) => inst.check(_guid(ZodGUID, params));
  inst.uuid = (params) => inst.check(_uuid(ZodUUID, params));
  inst.uuidv4 = (params) => inst.check(_uuidv4(ZodUUID, params));
  inst.uuidv6 = (params) => inst.check(_uuidv6(ZodUUID, params));
  inst.uuidv7 = (params) => inst.check(_uuidv7(ZodUUID, params));
  inst.nanoid = (params) => inst.check(_nanoid(ZodNanoID, params));
  inst.guid = (params) => inst.check(_guid(ZodGUID, params));
  inst.cuid = (params) => inst.check(_cuid(ZodCUID, params));
  inst.cuid2 = (params) => inst.check(_cuid2(ZodCUID2, params));
  inst.ulid = (params) => inst.check(_ulid(ZodULID, params));
  inst.base64 = (params) => inst.check(_base64(ZodBase64, params));
  inst.base64url = (params) => inst.check(_base64url(ZodBase64URL, params));
  inst.xid = (params) => inst.check(_xid(ZodXID, params));
  inst.ksuid = (params) => inst.check(_ksuid(ZodKSUID, params));
  inst.ipv4 = (params) => inst.check(_ipv4(ZodIPv4, params));
  inst.ipv6 = (params) => inst.check(_ipv6(ZodIPv6, params));
  inst.cidrv4 = (params) => inst.check(_cidrv4(ZodCIDRv4, params));
  inst.cidrv6 = (params) => inst.check(_cidrv6(ZodCIDRv6, params));
  inst.e164 = (params) => inst.check(_e164(ZodE164, params));
  inst.datetime = (params) => inst.check(datetime2(params));
  inst.date = (params) => inst.check(date2(params));
  inst.time = (params) => inst.check(time2(params));
  inst.duration = (params) => inst.check(duration2(params));
});
function string2(params) {
  return _string(ZodString, params);
}
var ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  _ZodString.init(inst, def);
});
var ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
  $ZodEmail.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function email2(params) {
  return _email(ZodEmail, params);
}
var ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
  $ZodGUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function guid2(params) {
  return _guid(ZodGUID, params);
}
var ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
  $ZodUUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function uuid2(params) {
  return _uuid(ZodUUID, params);
}
function uuidv4(params) {
  return _uuidv4(ZodUUID, params);
}
function uuidv6(params) {
  return _uuidv6(ZodUUID, params);
}
function uuidv7(params) {
  return _uuidv7(ZodUUID, params);
}
var ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
  $ZodURL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function url(params) {
  return _url(ZodURL, params);
}
function httpUrl(params) {
  return _url(ZodURL, {
    protocol: /^https?$/,
    hostname: regexes_exports.domain,
    ...util_exports.normalizeParams(params)
  });
}
var ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
  $ZodEmoji.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function emoji2(params) {
  return _emoji2(ZodEmoji, params);
}
var ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
  $ZodNanoID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function nanoid2(params) {
  return _nanoid(ZodNanoID, params);
}
var ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
  $ZodCUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function cuid3(params) {
  return _cuid(ZodCUID, params);
}
var ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
  $ZodCUID2.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function cuid22(params) {
  return _cuid2(ZodCUID2, params);
}
var ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
  $ZodULID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function ulid2(params) {
  return _ulid(ZodULID, params);
}
var ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
  $ZodXID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function xid2(params) {
  return _xid(ZodXID, params);
}
var ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
  $ZodKSUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function ksuid2(params) {
  return _ksuid(ZodKSUID, params);
}
var ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
  $ZodIPv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function ipv42(params) {
  return _ipv4(ZodIPv4, params);
}
var ZodMAC = /* @__PURE__ */ $constructor("ZodMAC", (inst, def) => {
  $ZodMAC.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function mac2(params) {
  return _mac(ZodMAC, params);
}
var ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
  $ZodIPv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function ipv62(params) {
  return _ipv6(ZodIPv6, params);
}
var ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
  $ZodCIDRv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function cidrv42(params) {
  return _cidrv4(ZodCIDRv4, params);
}
var ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
  $ZodCIDRv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function cidrv62(params) {
  return _cidrv6(ZodCIDRv6, params);
}
var ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
  $ZodBase64.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function base642(params) {
  return _base64(ZodBase64, params);
}
var ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
  $ZodBase64URL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function base64url2(params) {
  return _base64url(ZodBase64URL, params);
}
var ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
  $ZodE164.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function e1642(params) {
  return _e164(ZodE164, params);
}
var ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
  $ZodJWT.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function jwt(params) {
  return _jwt(ZodJWT, params);
}
var ZodCustomStringFormat = /* @__PURE__ */ $constructor("ZodCustomStringFormat", (inst, def) => {
  $ZodCustomStringFormat.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function stringFormat(format, fnOrRegex, _params = {}) {
  return _stringFormat(ZodCustomStringFormat, format, fnOrRegex, _params);
}
function hostname2(_params) {
  return _stringFormat(ZodCustomStringFormat, "hostname", regexes_exports.hostname, _params);
}
function hex2(_params) {
  return _stringFormat(ZodCustomStringFormat, "hex", regexes_exports.hex, _params);
}
function hash(alg, params) {
  const enc = params?.enc ?? "hex";
  const format = `${alg}_${enc}`;
  const regex = regexes_exports[format];
  if (!regex)
    throw new Error(`Unrecognized hash format: ${format}`);
  return _stringFormat(ZodCustomStringFormat, format, regex, params);
}
var ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
  $ZodNumber.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => numberProcessor(inst, ctx, json2, params);
  inst.gt = (value, params) => inst.check(_gt(value, params));
  inst.gte = (value, params) => inst.check(_gte(value, params));
  inst.min = (value, params) => inst.check(_gte(value, params));
  inst.lt = (value, params) => inst.check(_lt(value, params));
  inst.lte = (value, params) => inst.check(_lte(value, params));
  inst.max = (value, params) => inst.check(_lte(value, params));
  inst.int = (params) => inst.check(int(params));
  inst.safe = (params) => inst.check(int(params));
  inst.positive = (params) => inst.check(_gt(0, params));
  inst.nonnegative = (params) => inst.check(_gte(0, params));
  inst.negative = (params) => inst.check(_lt(0, params));
  inst.nonpositive = (params) => inst.check(_lte(0, params));
  inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
  inst.step = (value, params) => inst.check(_multipleOf(value, params));
  inst.finite = () => inst;
  const bag = inst._zod.bag;
  inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
  inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
  inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
  inst.isFinite = true;
  inst.format = bag.format ?? null;
});
function number2(params) {
  return _number(ZodNumber, params);
}
var ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
  $ZodNumberFormat.init(inst, def);
  ZodNumber.init(inst, def);
});
function int(params) {
  return _int(ZodNumberFormat, params);
}
function float32(params) {
  return _float32(ZodNumberFormat, params);
}
function float64(params) {
  return _float64(ZodNumberFormat, params);
}
function int32(params) {
  return _int32(ZodNumberFormat, params);
}
function uint32(params) {
  return _uint32(ZodNumberFormat, params);
}
var ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
  $ZodBoolean.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => booleanProcessor(inst, ctx, json2, params);
});
function boolean2(params) {
  return _boolean(ZodBoolean, params);
}
var ZodBigInt = /* @__PURE__ */ $constructor("ZodBigInt", (inst, def) => {
  $ZodBigInt.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => bigintProcessor(inst, ctx, json2, params);
  inst.gte = (value, params) => inst.check(_gte(value, params));
  inst.min = (value, params) => inst.check(_gte(value, params));
  inst.gt = (value, params) => inst.check(_gt(value, params));
  inst.gte = (value, params) => inst.check(_gte(value, params));
  inst.min = (value, params) => inst.check(_gte(value, params));
  inst.lt = (value, params) => inst.check(_lt(value, params));
  inst.lte = (value, params) => inst.check(_lte(value, params));
  inst.max = (value, params) => inst.check(_lte(value, params));
  inst.positive = (params) => inst.check(_gt(BigInt(0), params));
  inst.negative = (params) => inst.check(_lt(BigInt(0), params));
  inst.nonpositive = (params) => inst.check(_lte(BigInt(0), params));
  inst.nonnegative = (params) => inst.check(_gte(BigInt(0), params));
  inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
  const bag = inst._zod.bag;
  inst.minValue = bag.minimum ?? null;
  inst.maxValue = bag.maximum ?? null;
  inst.format = bag.format ?? null;
});
function bigint2(params) {
  return _bigint(ZodBigInt, params);
}
var ZodBigIntFormat = /* @__PURE__ */ $constructor("ZodBigIntFormat", (inst, def) => {
  $ZodBigIntFormat.init(inst, def);
  ZodBigInt.init(inst, def);
});
function int64(params) {
  return _int64(ZodBigIntFormat, params);
}
function uint64(params) {
  return _uint64(ZodBigIntFormat, params);
}
var ZodSymbol = /* @__PURE__ */ $constructor("ZodSymbol", (inst, def) => {
  $ZodSymbol.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => symbolProcessor(inst, ctx, json2, params);
});
function symbol(params) {
  return _symbol(ZodSymbol, params);
}
var ZodUndefined = /* @__PURE__ */ $constructor("ZodUndefined", (inst, def) => {
  $ZodUndefined.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => undefinedProcessor(inst, ctx, json2, params);
});
function _undefined3(params) {
  return _undefined2(ZodUndefined, params);
}
var ZodNull = /* @__PURE__ */ $constructor("ZodNull", (inst, def) => {
  $ZodNull.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => nullProcessor(inst, ctx, json2, params);
});
function _null3(params) {
  return _null2(ZodNull, params);
}
var ZodAny = /* @__PURE__ */ $constructor("ZodAny", (inst, def) => {
  $ZodAny.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => anyProcessor(inst, ctx, json2, params);
});
function any() {
  return _any(ZodAny);
}
var ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
  $ZodUnknown.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => unknownProcessor(inst, ctx, json2, params);
});
function unknown() {
  return _unknown(ZodUnknown);
}
var ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
  $ZodNever.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => neverProcessor(inst, ctx, json2, params);
});
function never(params) {
  return _never(ZodNever, params);
}
var ZodVoid = /* @__PURE__ */ $constructor("ZodVoid", (inst, def) => {
  $ZodVoid.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => voidProcessor(inst, ctx, json2, params);
});
function _void2(params) {
  return _void(ZodVoid, params);
}
var ZodDate = /* @__PURE__ */ $constructor("ZodDate", (inst, def) => {
  $ZodDate.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => dateProcessor(inst, ctx, json2, params);
  inst.min = (value, params) => inst.check(_gte(value, params));
  inst.max = (value, params) => inst.check(_lte(value, params));
  const c = inst._zod.bag;
  inst.minDate = c.minimum ? new Date(c.minimum) : null;
  inst.maxDate = c.maximum ? new Date(c.maximum) : null;
});
function date3(params) {
  return _date(ZodDate, params);
}
var ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
  $ZodArray.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => arrayProcessor(inst, ctx, json2, params);
  inst.element = def.element;
  inst.min = (minLength, params) => inst.check(_minLength(minLength, params));
  inst.nonempty = (params) => inst.check(_minLength(1, params));
  inst.max = (maxLength, params) => inst.check(_maxLength(maxLength, params));
  inst.length = (len, params) => inst.check(_length(len, params));
  inst.unwrap = () => inst.element;
});
function array(element, params) {
  return _array(ZodArray, element, params);
}
function keyof(schema) {
  const shape = schema._zod.def.shape;
  return _enum(Object.keys(shape));
}
var ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
  $ZodObjectJIT.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => objectProcessor(inst, ctx, json2, params);
  util_exports.defineLazy(inst, "shape", () => {
    return def.shape;
  });
  inst.keyof = () => _enum(Object.keys(inst._zod.def.shape));
  inst.catchall = (catchall) => inst.clone({ ...inst._zod.def, catchall });
  inst.passthrough = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
  inst.loose = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
  inst.strict = () => inst.clone({ ...inst._zod.def, catchall: never() });
  inst.strip = () => inst.clone({ ...inst._zod.def, catchall: void 0 });
  inst.extend = (incoming) => {
    return util_exports.extend(inst, incoming);
  };
  inst.safeExtend = (incoming) => {
    return util_exports.safeExtend(inst, incoming);
  };
  inst.merge = (other) => util_exports.merge(inst, other);
  inst.pick = (mask) => util_exports.pick(inst, mask);
  inst.omit = (mask) => util_exports.omit(inst, mask);
  inst.partial = (...args) => util_exports.partial(ZodOptional, inst, args[0]);
  inst.required = (...args) => util_exports.required(ZodNonOptional, inst, args[0]);
});
function object(shape, params) {
  const def = {
    type: "object",
    shape: shape ?? {},
    ...util_exports.normalizeParams(params)
  };
  return new ZodObject(def);
}
function strictObject(shape, params) {
  return new ZodObject({
    type: "object",
    shape,
    catchall: never(),
    ...util_exports.normalizeParams(params)
  });
}
function looseObject(shape, params) {
  return new ZodObject({
    type: "object",
    shape,
    catchall: unknown(),
    ...util_exports.normalizeParams(params)
  });
}
var ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => unionProcessor(inst, ctx, json2, params);
  inst.options = def.options;
});
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...util_exports.normalizeParams(params)
  });
}
var ZodXor = /* @__PURE__ */ $constructor("ZodXor", (inst, def) => {
  ZodUnion.init(inst, def);
  $ZodXor.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => unionProcessor(inst, ctx, json2, params);
  inst.options = def.options;
});
function xor(options, params) {
  return new ZodXor({
    type: "union",
    options,
    inclusive: false,
    ...util_exports.normalizeParams(params)
  });
}
var ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("ZodDiscriminatedUnion", (inst, def) => {
  ZodUnion.init(inst, def);
  $ZodDiscriminatedUnion.init(inst, def);
});
function discriminatedUnion(discriminator, options, params) {
  return new ZodDiscriminatedUnion({
    type: "union",
    options,
    discriminator,
    ...util_exports.normalizeParams(params)
  });
}
var ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
  $ZodIntersection.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => intersectionProcessor(inst, ctx, json2, params);
});
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
var ZodTuple = /* @__PURE__ */ $constructor("ZodTuple", (inst, def) => {
  $ZodTuple.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => tupleProcessor(inst, ctx, json2, params);
  inst.rest = (rest) => inst.clone({
    ...inst._zod.def,
    rest
  });
});
function tuple(items, _paramsOrRest, _params) {
  const hasRest = _paramsOrRest instanceof $ZodType;
  const params = hasRest ? _params : _paramsOrRest;
  const rest = hasRest ? _paramsOrRest : null;
  return new ZodTuple({
    type: "tuple",
    items,
    rest,
    ...util_exports.normalizeParams(params)
  });
}
var ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
  $ZodRecord.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => recordProcessor(inst, ctx, json2, params);
  inst.keyType = def.keyType;
  inst.valueType = def.valueType;
});
function record(keyType, valueType, params) {
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    ...util_exports.normalizeParams(params)
  });
}
function partialRecord(keyType, valueType, params) {
  const k = clone(keyType);
  k._zod.values = void 0;
  return new ZodRecord({
    type: "record",
    keyType: k,
    valueType,
    ...util_exports.normalizeParams(params)
  });
}
function looseRecord(keyType, valueType, params) {
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    mode: "loose",
    ...util_exports.normalizeParams(params)
  });
}
var ZodMap = /* @__PURE__ */ $constructor("ZodMap", (inst, def) => {
  $ZodMap.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => mapProcessor(inst, ctx, json2, params);
  inst.keyType = def.keyType;
  inst.valueType = def.valueType;
  inst.min = (...args) => inst.check(_minSize(...args));
  inst.nonempty = (params) => inst.check(_minSize(1, params));
  inst.max = (...args) => inst.check(_maxSize(...args));
  inst.size = (...args) => inst.check(_size(...args));
});
function map(keyType, valueType, params) {
  return new ZodMap({
    type: "map",
    keyType,
    valueType,
    ...util_exports.normalizeParams(params)
  });
}
var ZodSet = /* @__PURE__ */ $constructor("ZodSet", (inst, def) => {
  $ZodSet.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => setProcessor(inst, ctx, json2, params);
  inst.min = (...args) => inst.check(_minSize(...args));
  inst.nonempty = (params) => inst.check(_minSize(1, params));
  inst.max = (...args) => inst.check(_maxSize(...args));
  inst.size = (...args) => inst.check(_size(...args));
});
function set(valueType, params) {
  return new ZodSet({
    type: "set",
    valueType,
    ...util_exports.normalizeParams(params)
  });
}
var ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
  $ZodEnum.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => enumProcessor(inst, ctx, json2, params);
  inst.enum = def.entries;
  inst.options = Object.values(def.entries);
  const keys = new Set(Object.keys(def.entries));
  inst.extract = (values, params) => {
    const newEntries = {};
    for (const value of values) {
      if (keys.has(value)) {
        newEntries[value] = def.entries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...util_exports.normalizeParams(params),
      entries: newEntries
    });
  };
  inst.exclude = (values, params) => {
    const newEntries = { ...def.entries };
    for (const value of values) {
      if (keys.has(value)) {
        delete newEntries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...util_exports.normalizeParams(params),
      entries: newEntries
    });
  };
});
function _enum(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodEnum({
    type: "enum",
    entries,
    ...util_exports.normalizeParams(params)
  });
}
function nativeEnum(entries, params) {
  return new ZodEnum({
    type: "enum",
    entries,
    ...util_exports.normalizeParams(params)
  });
}
var ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
  $ZodLiteral.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => literalProcessor(inst, ctx, json2, params);
  inst.values = new Set(def.values);
  Object.defineProperty(inst, "value", {
    get() {
      if (def.values.length > 1) {
        throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
      }
      return def.values[0];
    }
  });
});
function literal(value, params) {
  return new ZodLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...util_exports.normalizeParams(params)
  });
}
var ZodFile = /* @__PURE__ */ $constructor("ZodFile", (inst, def) => {
  $ZodFile.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => fileProcessor(inst, ctx, json2, params);
  inst.min = (size, params) => inst.check(_minSize(size, params));
  inst.max = (size, params) => inst.check(_maxSize(size, params));
  inst.mime = (types, params) => inst.check(_mime(Array.isArray(types) ? types : [types], params));
});
function file(params) {
  return _file(ZodFile, params);
}
var ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
  $ZodTransform.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => transformProcessor(inst, ctx, json2, params);
  inst._zod.parse = (payload, _ctx) => {
    if (_ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(util_exports.issue(issue2, payload.value, def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = inst);
        payload.issues.push(util_exports.issue(_issue));
      }
    };
    const output = def.transform(payload.value, payload);
    if (output instanceof Promise) {
      return output.then((output2) => {
        payload.value = output2;
        return payload;
      });
    }
    payload.value = output;
    return payload;
  };
});
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
var ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => optionalProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
var ZodExactOptional = /* @__PURE__ */ $constructor("ZodExactOptional", (inst, def) => {
  $ZodExactOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => optionalProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
  return new ZodExactOptional({
    type: "optional",
    innerType
  });
}
var ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
  $ZodNullable.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => nullableProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
function nullish2(innerType) {
  return optional(nullable(innerType));
}
var ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
  $ZodDefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => defaultProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : util_exports.shallowClone(defaultValue);
    }
  });
}
var ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
  $ZodPrefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => prefaultProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : util_exports.shallowClone(defaultValue);
    }
  });
}
var ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
  $ZodNonOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => nonoptionalProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...util_exports.normalizeParams(params)
  });
}
var ZodSuccess = /* @__PURE__ */ $constructor("ZodSuccess", (inst, def) => {
  $ZodSuccess.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => successProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function success(innerType) {
  return new ZodSuccess({
    type: "success",
    innerType
  });
}
var ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
  $ZodCatch.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => catchProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
var ZodNaN = /* @__PURE__ */ $constructor("ZodNaN", (inst, def) => {
  $ZodNaN.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => nanProcessor(inst, ctx, json2, params);
});
function nan(params) {
  return _nan(ZodNaN, params);
}
var ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
  $ZodPipe.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => pipeProcessor(inst, ctx, json2, params);
  inst.in = def.in;
  inst.out = def.out;
});
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
    // ...util.normalizeParams(params),
  });
}
var ZodCodec = /* @__PURE__ */ $constructor("ZodCodec", (inst, def) => {
  ZodPipe.init(inst, def);
  $ZodCodec.init(inst, def);
});
function codec(in_, out, params) {
  return new ZodCodec({
    type: "pipe",
    in: in_,
    out,
    transform: params.decode,
    reverseTransform: params.encode
  });
}
var ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
  $ZodReadonly.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => readonlyProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
var ZodTemplateLiteral = /* @__PURE__ */ $constructor("ZodTemplateLiteral", (inst, def) => {
  $ZodTemplateLiteral.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => templateLiteralProcessor(inst, ctx, json2, params);
});
function templateLiteral(parts, params) {
  return new ZodTemplateLiteral({
    type: "template_literal",
    parts,
    ...util_exports.normalizeParams(params)
  });
}
var ZodLazy = /* @__PURE__ */ $constructor("ZodLazy", (inst, def) => {
  $ZodLazy.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => lazyProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.getter();
});
function lazy(getter) {
  return new ZodLazy({
    type: "lazy",
    getter
  });
}
var ZodPromise = /* @__PURE__ */ $constructor("ZodPromise", (inst, def) => {
  $ZodPromise.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => promiseProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function promise(innerType) {
  return new ZodPromise({
    type: "promise",
    innerType
  });
}
var ZodFunction = /* @__PURE__ */ $constructor("ZodFunction", (inst, def) => {
  $ZodFunction.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => functionProcessor(inst, ctx, json2, params);
});
function _function(params) {
  return new ZodFunction({
    type: "function",
    input: Array.isArray(params?.input) ? tuple(params?.input) : params?.input ?? array(unknown()),
    output: params?.output ?? unknown()
  });
}
var ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
  $ZodCustom.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => customProcessor(inst, ctx, json2, params);
});
function check(fn) {
  const ch = new $ZodCheck({
    check: "custom"
    // ...util.normalizeParams(params),
  });
  ch._zod.check = fn;
  return ch;
}
function custom(fn, _params) {
  return _custom(ZodCustom, fn ?? (() => true), _params);
}
function refine(fn, _params = {}) {
  return _refine(ZodCustom, fn, _params);
}
function superRefine(fn) {
  return _superRefine(fn);
}
var describe2 = describe;
var meta2 = meta;
function _instanceof(cls, params = {}) {
  const inst = new ZodCustom({
    type: "custom",
    check: "custom",
    fn: (data) => data instanceof cls,
    abort: true,
    ...util_exports.normalizeParams(params)
  });
  inst._zod.bag.Class = cls;
  inst._zod.check = (payload) => {
    if (!(payload.value instanceof cls)) {
      payload.issues.push({
        code: "invalid_type",
        expected: cls.name,
        input: payload.value,
        inst,
        path: [...inst._zod.def.path ?? []]
      });
    }
  };
  return inst;
}
var stringbool = (...args) => _stringbool({
  Codec: ZodCodec,
  Boolean: ZodBoolean,
  String: ZodString
}, ...args);
function json(params) {
  const jsonSchema = lazy(() => {
    return union([string2(params), number2(), boolean2(), _null3(), array(jsonSchema), record(string2(), jsonSchema)]);
  });
  return jsonSchema;
}
function preprocess(fn, schema) {
  return pipe(transform(fn), schema);
}

// node_modules/zod/v4/classic/compat.js
var ZodIssueCode = {
  invalid_type: "invalid_type",
  too_big: "too_big",
  too_small: "too_small",
  invalid_format: "invalid_format",
  not_multiple_of: "not_multiple_of",
  unrecognized_keys: "unrecognized_keys",
  invalid_union: "invalid_union",
  invalid_key: "invalid_key",
  invalid_element: "invalid_element",
  invalid_value: "invalid_value",
  custom: "custom"
};
var ZodFirstPartyTypeKind;
/* @__PURE__ */ (function(ZodFirstPartyTypeKind2) {
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));

// node_modules/zod/v4/classic/from-json-schema.js
var z = {
  ...schemas_exports2,
  ...checks_exports2,
  iso: iso_exports
};

// node_modules/zod/v4/classic/coerce.js
var coerce_exports = {};
__export(coerce_exports, {
  bigint: () => bigint3,
  boolean: () => boolean3,
  date: () => date4,
  number: () => number3,
  string: () => string3
});
function string3(params) {
  return _coercedString(ZodString, params);
}
function number3(params) {
  return _coercedNumber(ZodNumber, params);
}
function boolean3(params) {
  return _coercedBoolean(ZodBoolean, params);
}
function bigint3(params) {
  return _coercedBigint(ZodBigInt, params);
}
function date4(params) {
  return _coercedDate(ZodDate, params);
}

// node_modules/zod/v4/classic/external.js
config(en_default());

// node_modules/@modelcontextprotocol/client/dist/src-RIHfgPRm.mjs
var __create2 = Object.create;
var __defProp2 = Object.defineProperty;
var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
var __getOwnPropNames2 = Object.getOwnPropertyNames;
var __getProtoOf2 = Object.getPrototypeOf;
var __hasOwnProp2 = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __copyProps2 = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (var keys = __getOwnPropNames2(from), i = 0, n = keys.length, key; i < n; i++) {
      key = keys[i];
      if (!__hasOwnProp2.call(to, key) && key !== except) {
        __defProp2(to, key, {
          get: ((k) => from[k]).bind(null, key),
          enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable
        });
      }
    }
  }
  return to;
};
var __toESM2 = (mod, isNodeMode, target) => (target = mod != null ? __create2(__getProtoOf2(mod)) : {}, __copyProps2(isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", {
  value: mod,
  enumerable: true
}) : target, mod));
var OAuthErrorCode = /* @__PURE__ */ (function(OAuthErrorCode$1) {
  OAuthErrorCode$1["InvalidRequest"] = "invalid_request";
  OAuthErrorCode$1["InvalidClient"] = "invalid_client";
  OAuthErrorCode$1["InvalidGrant"] = "invalid_grant";
  OAuthErrorCode$1["UnauthorizedClient"] = "unauthorized_client";
  OAuthErrorCode$1["UnsupportedGrantType"] = "unsupported_grant_type";
  OAuthErrorCode$1["InvalidScope"] = "invalid_scope";
  OAuthErrorCode$1["AccessDenied"] = "access_denied";
  OAuthErrorCode$1["ServerError"] = "server_error";
  OAuthErrorCode$1["TemporarilyUnavailable"] = "temporarily_unavailable";
  OAuthErrorCode$1["UnsupportedResponseType"] = "unsupported_response_type";
  OAuthErrorCode$1["UnsupportedTokenType"] = "unsupported_token_type";
  OAuthErrorCode$1["InvalidToken"] = "invalid_token";
  OAuthErrorCode$1["MethodNotAllowed"] = "method_not_allowed";
  OAuthErrorCode$1["TooManyRequests"] = "too_many_requests";
  OAuthErrorCode$1["InvalidClientMetadata"] = "invalid_client_metadata";
  OAuthErrorCode$1["InsufficientScope"] = "insufficient_scope";
  OAuthErrorCode$1["InvalidTarget"] = "invalid_target";
  return OAuthErrorCode$1;
})({});
var OAuthError = class OAuthError2 extends Error {
  constructor(code, message, errorUri) {
    super(message);
    this.code = code;
    this.errorUri = errorUri;
    this.name = "OAuthError";
  }
  /**
  * Converts the error to a standard OAuth error response object.
  */
  toResponseObject() {
    const response = {
      error: this.code,
      error_description: this.message
    };
    if (this.errorUri) response.error_uri = this.errorUri;
    return response;
  }
  /**
  * Creates an {@linkcode OAuthError} from an OAuth error response.
  */
  static fromResponse(response) {
    return new OAuthError2(response.error, response.error_description ?? response.error, response.error_uri);
  }
};
var SdkErrorCode = /* @__PURE__ */ (function(SdkErrorCode$1) {
  SdkErrorCode$1["NotConnected"] = "NOT_CONNECTED";
  SdkErrorCode$1["AlreadyConnected"] = "ALREADY_CONNECTED";
  SdkErrorCode$1["NotInitialized"] = "NOT_INITIALIZED";
  SdkErrorCode$1["CapabilityNotSupported"] = "CAPABILITY_NOT_SUPPORTED";
  SdkErrorCode$1["RequestTimeout"] = "REQUEST_TIMEOUT";
  SdkErrorCode$1["ConnectionClosed"] = "CONNECTION_CLOSED";
  SdkErrorCode$1["SendFailed"] = "SEND_FAILED";
  SdkErrorCode$1["ClientHttpNotImplemented"] = "CLIENT_HTTP_NOT_IMPLEMENTED";
  SdkErrorCode$1["ClientHttpAuthentication"] = "CLIENT_HTTP_AUTHENTICATION";
  SdkErrorCode$1["ClientHttpForbidden"] = "CLIENT_HTTP_FORBIDDEN";
  SdkErrorCode$1["ClientHttpUnexpectedContent"] = "CLIENT_HTTP_UNEXPECTED_CONTENT";
  SdkErrorCode$1["ClientHttpFailedToOpenStream"] = "CLIENT_HTTP_FAILED_TO_OPEN_STREAM";
  SdkErrorCode$1["ClientHttpFailedToTerminateSession"] = "CLIENT_HTTP_FAILED_TO_TERMINATE_SESSION";
  return SdkErrorCode$1;
})({});
var SdkError = class extends Error {
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.data = data;
    this.name = "SdkError";
  }
};
var SafeUrlSchema = url().superRefine((val, ctx) => {
  if (!URL.canParse(val)) {
    ctx.addIssue({
      code: ZodIssueCode.custom,
      message: "URL must be parseable",
      fatal: true
    });
    return NEVER;
  }
}).refine((url2) => {
  const u = new URL(url2);
  return u.protocol !== "javascript:" && u.protocol !== "data:" && u.protocol !== "vbscript:";
}, { message: "URL cannot use javascript:, data:, or vbscript: scheme" });
var OAuthProtectedResourceMetadataSchema = looseObject({
  resource: string2().url(),
  authorization_servers: array(SafeUrlSchema).optional(),
  jwks_uri: string2().url().optional(),
  scopes_supported: array(string2()).optional(),
  bearer_methods_supported: array(string2()).optional(),
  resource_signing_alg_values_supported: array(string2()).optional(),
  resource_name: string2().optional(),
  resource_documentation: string2().optional(),
  resource_policy_uri: string2().url().optional(),
  resource_tos_uri: string2().url().optional(),
  tls_client_certificate_bound_access_tokens: boolean2().optional(),
  authorization_details_types_supported: array(string2()).optional(),
  dpop_signing_alg_values_supported: array(string2()).optional(),
  dpop_bound_access_tokens_required: boolean2().optional()
});
var OAuthMetadataSchema = looseObject({
  issuer: string2(),
  authorization_endpoint: SafeUrlSchema,
  token_endpoint: SafeUrlSchema,
  registration_endpoint: SafeUrlSchema.optional(),
  scopes_supported: array(string2()).optional(),
  response_types_supported: array(string2()),
  response_modes_supported: array(string2()).optional(),
  grant_types_supported: array(string2()).optional(),
  token_endpoint_auth_methods_supported: array(string2()).optional(),
  token_endpoint_auth_signing_alg_values_supported: array(string2()).optional(),
  service_documentation: SafeUrlSchema.optional(),
  revocation_endpoint: SafeUrlSchema.optional(),
  revocation_endpoint_auth_methods_supported: array(string2()).optional(),
  revocation_endpoint_auth_signing_alg_values_supported: array(string2()).optional(),
  introspection_endpoint: string2().optional(),
  introspection_endpoint_auth_methods_supported: array(string2()).optional(),
  introspection_endpoint_auth_signing_alg_values_supported: array(string2()).optional(),
  code_challenge_methods_supported: array(string2()).optional(),
  client_id_metadata_document_supported: boolean2().optional()
});
var OpenIdProviderMetadataSchema = looseObject({
  issuer: string2(),
  authorization_endpoint: SafeUrlSchema,
  token_endpoint: SafeUrlSchema,
  userinfo_endpoint: SafeUrlSchema.optional(),
  jwks_uri: SafeUrlSchema,
  registration_endpoint: SafeUrlSchema.optional(),
  scopes_supported: array(string2()).optional(),
  response_types_supported: array(string2()),
  response_modes_supported: array(string2()).optional(),
  grant_types_supported: array(string2()).optional(),
  acr_values_supported: array(string2()).optional(),
  subject_types_supported: array(string2()),
  id_token_signing_alg_values_supported: array(string2()),
  id_token_encryption_alg_values_supported: array(string2()).optional(),
  id_token_encryption_enc_values_supported: array(string2()).optional(),
  userinfo_signing_alg_values_supported: array(string2()).optional(),
  userinfo_encryption_alg_values_supported: array(string2()).optional(),
  userinfo_encryption_enc_values_supported: array(string2()).optional(),
  request_object_signing_alg_values_supported: array(string2()).optional(),
  request_object_encryption_alg_values_supported: array(string2()).optional(),
  request_object_encryption_enc_values_supported: array(string2()).optional(),
  token_endpoint_auth_methods_supported: array(string2()).optional(),
  token_endpoint_auth_signing_alg_values_supported: array(string2()).optional(),
  display_values_supported: array(string2()).optional(),
  claim_types_supported: array(string2()).optional(),
  claims_supported: array(string2()).optional(),
  service_documentation: string2().optional(),
  claims_locales_supported: array(string2()).optional(),
  ui_locales_supported: array(string2()).optional(),
  claims_parameter_supported: boolean2().optional(),
  request_parameter_supported: boolean2().optional(),
  request_uri_parameter_supported: boolean2().optional(),
  require_request_uri_registration: boolean2().optional(),
  op_policy_uri: SafeUrlSchema.optional(),
  op_tos_uri: SafeUrlSchema.optional(),
  client_id_metadata_document_supported: boolean2().optional()
});
var OpenIdProviderDiscoveryMetadataSchema = object({
  ...OpenIdProviderMetadataSchema.shape,
  ...OAuthMetadataSchema.pick({ code_challenge_methods_supported: true }).shape
});
var OAuthTokensSchema = object({
  access_token: string2(),
  id_token: string2().optional(),
  token_type: string2(),
  expires_in: coerce_exports.number().optional(),
  scope: string2().optional(),
  refresh_token: string2().optional()
}).strip();
var IdJagTokenExchangeResponseSchema = object({
  issued_token_type: literal("urn:ietf:params:oauth:token-type:id-jag"),
  access_token: string2(),
  token_type: string2().optional(),
  expires_in: number2().optional(),
  scope: string2().optional()
}).strip();
var OAuthErrorResponseSchema = object({
  error: string2(),
  error_description: string2().optional(),
  error_uri: string2().optional()
});
var OptionalSafeUrlSchema = SafeUrlSchema.optional().or(literal("").transform(() => void 0));
var OAuthClientMetadataSchema = object({
  redirect_uris: array(SafeUrlSchema),
  token_endpoint_auth_method: string2().optional(),
  grant_types: array(string2()).optional(),
  response_types: array(string2()).optional(),
  client_name: string2().optional(),
  client_uri: SafeUrlSchema.optional(),
  logo_uri: OptionalSafeUrlSchema,
  scope: string2().optional(),
  contacts: array(string2()).optional(),
  tos_uri: OptionalSafeUrlSchema,
  policy_uri: string2().optional(),
  jwks_uri: SafeUrlSchema.optional(),
  jwks: any().optional(),
  software_id: string2().optional(),
  software_version: string2().optional(),
  software_statement: string2().optional()
}).strip();
var OAuthClientInformationSchema = object({
  client_id: string2(),
  client_secret: string2().optional(),
  client_id_issued_at: number2().optional(),
  client_secret_expires_at: number2().optional()
}).strip();
var OAuthClientInformationFullSchema = OAuthClientMetadataSchema.merge(OAuthClientInformationSchema);
var OAuthClientRegistrationErrorSchema = object({
  error: string2(),
  error_description: string2().optional()
}).strip();
var OAuthTokenRevocationRequestSchema = object({
  token: string2(),
  token_type_hint: string2().optional()
}).strip();
function resourceUrlFromServerUrl(url2) {
  const resourceURL = typeof url2 === "string" ? new URL(url2) : new URL(url2.href);
  resourceURL.hash = "";
  return resourceURL;
}
function checkResourceAllowed({ requestedResource, configuredResource }) {
  const requested = typeof requestedResource === "string" ? new URL(requestedResource) : new URL(requestedResource.href);
  const configured = typeof configuredResource === "string" ? new URL(configuredResource) : new URL(configuredResource.href);
  if (requested.origin !== configured.origin) return false;
  if (requested.pathname.length < configured.pathname.length) return false;
  const requestedPath = requested.pathname.endsWith("/") ? requested.pathname : requested.pathname + "/";
  const configuredPath = configured.pathname.endsWith("/") ? configured.pathname : configured.pathname + "/";
  return requestedPath.startsWith(configuredPath);
}
var LATEST_PROTOCOL_VERSION = "2025-11-25";
var SUPPORTED_PROTOCOL_VERSIONS = [
  LATEST_PROTOCOL_VERSION,
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
  "2024-10-07"
];
var RELATED_TASK_META_KEY = "io.modelcontextprotocol/related-task";
var JSONRPC_VERSION = "2.0";
var ProtocolErrorCode = /* @__PURE__ */ (function(ProtocolErrorCode$1) {
  ProtocolErrorCode$1[ProtocolErrorCode$1["ParseError"] = -32700] = "ParseError";
  ProtocolErrorCode$1[ProtocolErrorCode$1["InvalidRequest"] = -32600] = "InvalidRequest";
  ProtocolErrorCode$1[ProtocolErrorCode$1["MethodNotFound"] = -32601] = "MethodNotFound";
  ProtocolErrorCode$1[ProtocolErrorCode$1["InvalidParams"] = -32602] = "InvalidParams";
  ProtocolErrorCode$1[ProtocolErrorCode$1["InternalError"] = -32603] = "InternalError";
  ProtocolErrorCode$1[ProtocolErrorCode$1["ResourceNotFound"] = -32002] = "ResourceNotFound";
  ProtocolErrorCode$1[ProtocolErrorCode$1["UrlElicitationRequired"] = -32042] = "UrlElicitationRequired";
  return ProtocolErrorCode$1;
})({});
var ProtocolError = class ProtocolError2 extends Error {
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.data = data;
    this.name = "ProtocolError";
  }
  /**
  * Factory method to create the appropriate error type based on the error code and data
  */
  static fromError(code, message, data) {
    if (code === ProtocolErrorCode.UrlElicitationRequired && data) {
      const errorData = data;
      if (errorData.elicitations) return new UrlElicitationRequiredError(errorData.elicitations, message);
    }
    return new ProtocolError2(code, message, data);
  }
};
var UrlElicitationRequiredError = class extends ProtocolError {
  constructor(elicitations, message = `URL elicitation${elicitations.length > 1 ? "s" : ""} required`) {
    super(ProtocolErrorCode.UrlElicitationRequired, message, { elicitations });
  }
  get elicitations() {
    return this.data?.elicitations ?? [];
  }
};
var JSONValueSchema = lazy(() => union([
  string2(),
  number2(),
  boolean2(),
  _null3(),
  record(string2(), JSONValueSchema),
  array(JSONValueSchema)
]));
var JSONObjectSchema = record(string2(), JSONValueSchema);
var JSONArraySchema = array(JSONValueSchema);
var ProgressTokenSchema = union([string2(), number2().int()]);
var CursorSchema = string2();
var TaskCreationParamsSchema = looseObject({
  ttl: number2().optional(),
  pollInterval: number2().optional()
});
var TaskMetadataSchema = object({ ttl: number2().optional() });
var RelatedTaskMetadataSchema = object({ taskId: string2() });
var RequestMetaSchema = looseObject({
  progressToken: ProgressTokenSchema.optional(),
  [RELATED_TASK_META_KEY]: RelatedTaskMetadataSchema.optional()
});
var BaseRequestParamsSchema = object({ _meta: RequestMetaSchema.optional() });
var TaskAugmentedRequestParamsSchema = BaseRequestParamsSchema.extend({ task: TaskMetadataSchema.optional() });
var RequestSchema = object({
  method: string2(),
  params: BaseRequestParamsSchema.loose().optional()
});
var NotificationsParamsSchema = object({ _meta: RequestMetaSchema.optional() });
var NotificationSchema = object({
  method: string2(),
  params: NotificationsParamsSchema.loose().optional()
});
var ResultSchema = looseObject({ _meta: RequestMetaSchema.optional() });
var RequestIdSchema = union([string2(), number2().int()]);
var JSONRPCRequestSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  ...RequestSchema.shape
}).strict();
var JSONRPCNotificationSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  ...NotificationSchema.shape
}).strict();
var JSONRPCResultResponseSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  result: ResultSchema
}).strict();
var JSONRPCErrorResponseSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema.optional(),
  error: object({
    code: number2().int(),
    message: string2(),
    data: unknown().optional()
  })
}).strict();
var JSONRPCMessageSchema = union([
  JSONRPCRequestSchema,
  JSONRPCNotificationSchema,
  JSONRPCResultResponseSchema,
  JSONRPCErrorResponseSchema
]);
var JSONRPCResponseSchema = union([JSONRPCResultResponseSchema, JSONRPCErrorResponseSchema]);
var EmptyResultSchema = ResultSchema.strict();
var CancelledNotificationParamsSchema = NotificationsParamsSchema.extend({
  requestId: RequestIdSchema.optional(),
  reason: string2().optional()
});
var CancelledNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/cancelled"),
  params: CancelledNotificationParamsSchema
});
var IconSchema = object({
  src: string2(),
  mimeType: string2().optional(),
  sizes: array(string2()).optional(),
  theme: _enum(["light", "dark"]).optional()
});
var IconsSchema = object({ icons: array(IconSchema).optional() });
var BaseMetadataSchema = object({
  name: string2(),
  title: string2().optional()
});
var ImplementationSchema = BaseMetadataSchema.extend({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  version: string2(),
  websiteUrl: string2().optional(),
  description: string2().optional()
});
var FormElicitationCapabilitySchema = intersection(object({ applyDefaults: boolean2().optional() }), JSONObjectSchema);
var ElicitationCapabilitySchema = preprocess((value) => {
  if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return { form: {} };
  return value;
}, intersection(object({
  form: FormElicitationCapabilitySchema.optional(),
  url: JSONObjectSchema.optional()
}), JSONObjectSchema.optional()));
var ClientTasksCapabilitySchema = looseObject({
  list: JSONObjectSchema.optional(),
  cancel: JSONObjectSchema.optional(),
  requests: looseObject({
    sampling: looseObject({ createMessage: JSONObjectSchema.optional() }).optional(),
    elicitation: looseObject({ create: JSONObjectSchema.optional() }).optional()
  }).optional()
});
var ServerTasksCapabilitySchema = looseObject({
  list: JSONObjectSchema.optional(),
  cancel: JSONObjectSchema.optional(),
  requests: looseObject({ tools: looseObject({ call: JSONObjectSchema.optional() }).optional() }).optional()
});
var ClientCapabilitiesSchema = object({
  experimental: record(string2(), JSONObjectSchema).optional(),
  sampling: object({
    context: JSONObjectSchema.optional(),
    tools: JSONObjectSchema.optional()
  }).optional(),
  elicitation: ElicitationCapabilitySchema.optional(),
  roots: object({ listChanged: boolean2().optional() }).optional(),
  tasks: ClientTasksCapabilitySchema.optional(),
  extensions: record(string2(), JSONObjectSchema).optional()
});
var InitializeRequestParamsSchema = BaseRequestParamsSchema.extend({
  protocolVersion: string2(),
  capabilities: ClientCapabilitiesSchema,
  clientInfo: ImplementationSchema
});
var InitializeRequestSchema = RequestSchema.extend({
  method: literal("initialize"),
  params: InitializeRequestParamsSchema
});
var ServerCapabilitiesSchema = object({
  experimental: record(string2(), JSONObjectSchema).optional(),
  logging: JSONObjectSchema.optional(),
  completions: JSONObjectSchema.optional(),
  prompts: object({ listChanged: boolean2().optional() }).optional(),
  resources: object({
    subscribe: boolean2().optional(),
    listChanged: boolean2().optional()
  }).optional(),
  tools: object({ listChanged: boolean2().optional() }).optional(),
  tasks: ServerTasksCapabilitySchema.optional(),
  extensions: record(string2(), JSONObjectSchema).optional()
});
var InitializeResultSchema = ResultSchema.extend({
  protocolVersion: string2(),
  capabilities: ServerCapabilitiesSchema,
  serverInfo: ImplementationSchema,
  instructions: string2().optional()
});
var InitializedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/initialized"),
  params: NotificationsParamsSchema.optional()
});
var PingRequestSchema = RequestSchema.extend({
  method: literal("ping"),
  params: BaseRequestParamsSchema.optional()
});
var ProgressSchema = object({
  progress: number2(),
  total: optional(number2()),
  message: optional(string2())
});
var ProgressNotificationParamsSchema = object({
  ...NotificationsParamsSchema.shape,
  ...ProgressSchema.shape,
  progressToken: ProgressTokenSchema
});
var ProgressNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/progress"),
  params: ProgressNotificationParamsSchema
});
var PaginatedRequestParamsSchema = BaseRequestParamsSchema.extend({ cursor: CursorSchema.optional() });
var PaginatedRequestSchema = RequestSchema.extend({ params: PaginatedRequestParamsSchema.optional() });
var PaginatedResultSchema = ResultSchema.extend({ nextCursor: CursorSchema.optional() });
var TaskStatusSchema = _enum([
  "working",
  "input_required",
  "completed",
  "failed",
  "cancelled"
]);
var TaskSchema = object({
  taskId: string2(),
  status: TaskStatusSchema,
  ttl: union([number2(), _null3()]),
  createdAt: string2(),
  lastUpdatedAt: string2(),
  pollInterval: optional(number2()),
  statusMessage: optional(string2())
});
var CreateTaskResultSchema = ResultSchema.extend({ task: TaskSchema });
var TaskStatusNotificationParamsSchema = NotificationsParamsSchema.merge(TaskSchema);
var TaskStatusNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/tasks/status"),
  params: TaskStatusNotificationParamsSchema
});
var GetTaskRequestSchema = RequestSchema.extend({
  method: literal("tasks/get"),
  params: BaseRequestParamsSchema.extend({ taskId: string2() })
});
var GetTaskResultSchema = ResultSchema.merge(TaskSchema);
var GetTaskPayloadRequestSchema = RequestSchema.extend({
  method: literal("tasks/result"),
  params: BaseRequestParamsSchema.extend({ taskId: string2() })
});
var GetTaskPayloadResultSchema = ResultSchema.loose();
var ListTasksRequestSchema = PaginatedRequestSchema.extend({ method: literal("tasks/list") });
var ListTasksResultSchema = PaginatedResultSchema.extend({ tasks: array(TaskSchema) });
var CancelTaskRequestSchema = RequestSchema.extend({
  method: literal("tasks/cancel"),
  params: BaseRequestParamsSchema.extend({ taskId: string2() })
});
var CancelTaskResultSchema = ResultSchema.merge(TaskSchema);
var ResourceContentsSchema = object({
  uri: string2(),
  mimeType: optional(string2()),
  _meta: record(string2(), unknown()).optional()
});
var TextResourceContentsSchema = ResourceContentsSchema.extend({ text: string2() });
var Base64Schema = string2().refine((val) => {
  try {
    atob(val);
    return true;
  } catch {
    return false;
  }
}, { message: "Invalid Base64 string" });
var BlobResourceContentsSchema = ResourceContentsSchema.extend({ blob: Base64Schema });
var RoleSchema = _enum(["user", "assistant"]);
var AnnotationsSchema = object({
  audience: array(RoleSchema).optional(),
  priority: number2().min(0).max(1).optional(),
  lastModified: iso_exports.datetime({ offset: true }).optional()
});
var ResourceSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  uri: string2(),
  description: optional(string2()),
  mimeType: optional(string2()),
  size: optional(number2()),
  annotations: AnnotationsSchema.optional(),
  _meta: optional(looseObject({}))
});
var ResourceTemplateSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  uriTemplate: string2(),
  description: optional(string2()),
  mimeType: optional(string2()),
  annotations: AnnotationsSchema.optional(),
  _meta: optional(looseObject({}))
});
var ListResourcesRequestSchema = PaginatedRequestSchema.extend({ method: literal("resources/list") });
var ListResourcesResultSchema = PaginatedResultSchema.extend({ resources: array(ResourceSchema) });
var ListResourceTemplatesRequestSchema = PaginatedRequestSchema.extend({ method: literal("resources/templates/list") });
var ListResourceTemplatesResultSchema = PaginatedResultSchema.extend({ resourceTemplates: array(ResourceTemplateSchema) });
var ResourceRequestParamsSchema = BaseRequestParamsSchema.extend({ uri: string2() });
var ReadResourceRequestParamsSchema = ResourceRequestParamsSchema;
var ReadResourceRequestSchema = RequestSchema.extend({
  method: literal("resources/read"),
  params: ReadResourceRequestParamsSchema
});
var ReadResourceResultSchema = ResultSchema.extend({ contents: array(union([TextResourceContentsSchema, BlobResourceContentsSchema])) });
var ResourceListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/resources/list_changed"),
  params: NotificationsParamsSchema.optional()
});
var SubscribeRequestParamsSchema = ResourceRequestParamsSchema;
var SubscribeRequestSchema = RequestSchema.extend({
  method: literal("resources/subscribe"),
  params: SubscribeRequestParamsSchema
});
var UnsubscribeRequestParamsSchema = ResourceRequestParamsSchema;
var UnsubscribeRequestSchema = RequestSchema.extend({
  method: literal("resources/unsubscribe"),
  params: UnsubscribeRequestParamsSchema
});
var ResourceUpdatedNotificationParamsSchema = NotificationsParamsSchema.extend({ uri: string2() });
var ResourceUpdatedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/resources/updated"),
  params: ResourceUpdatedNotificationParamsSchema
});
var PromptArgumentSchema = object({
  name: string2(),
  description: optional(string2()),
  required: optional(boolean2())
});
var PromptSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  description: optional(string2()),
  arguments: optional(array(PromptArgumentSchema)),
  _meta: optional(looseObject({}))
});
var ListPromptsRequestSchema = PaginatedRequestSchema.extend({ method: literal("prompts/list") });
var ListPromptsResultSchema = PaginatedResultSchema.extend({ prompts: array(PromptSchema) });
var GetPromptRequestParamsSchema = BaseRequestParamsSchema.extend({
  name: string2(),
  arguments: record(string2(), string2()).optional()
});
var GetPromptRequestSchema = RequestSchema.extend({
  method: literal("prompts/get"),
  params: GetPromptRequestParamsSchema
});
var TextContentSchema = object({
  type: literal("text"),
  text: string2(),
  annotations: AnnotationsSchema.optional(),
  _meta: record(string2(), unknown()).optional()
});
var ImageContentSchema = object({
  type: literal("image"),
  data: Base64Schema,
  mimeType: string2(),
  annotations: AnnotationsSchema.optional(),
  _meta: record(string2(), unknown()).optional()
});
var AudioContentSchema = object({
  type: literal("audio"),
  data: Base64Schema,
  mimeType: string2(),
  annotations: AnnotationsSchema.optional(),
  _meta: record(string2(), unknown()).optional()
});
var ToolUseContentSchema = object({
  type: literal("tool_use"),
  name: string2(),
  id: string2(),
  input: record(string2(), unknown()),
  _meta: record(string2(), unknown()).optional()
});
var EmbeddedResourceSchema = object({
  type: literal("resource"),
  resource: union([TextResourceContentsSchema, BlobResourceContentsSchema]),
  annotations: AnnotationsSchema.optional(),
  _meta: record(string2(), unknown()).optional()
});
var ResourceLinkSchema = ResourceSchema.extend({ type: literal("resource_link") });
var ContentBlockSchema = union([
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema,
  ResourceLinkSchema,
  EmbeddedResourceSchema
]);
var PromptMessageSchema = object({
  role: RoleSchema,
  content: ContentBlockSchema
});
var GetPromptResultSchema = ResultSchema.extend({
  description: string2().optional(),
  messages: array(PromptMessageSchema)
});
var PromptListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/prompts/list_changed"),
  params: NotificationsParamsSchema.optional()
});
var ToolAnnotationsSchema = object({
  title: string2().optional(),
  readOnlyHint: boolean2().optional(),
  destructiveHint: boolean2().optional(),
  idempotentHint: boolean2().optional(),
  openWorldHint: boolean2().optional()
});
var ToolExecutionSchema = object({ taskSupport: _enum([
  "required",
  "optional",
  "forbidden"
]).optional() });
var ToolSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  description: string2().optional(),
  inputSchema: object({
    type: literal("object"),
    properties: record(string2(), JSONValueSchema).optional(),
    required: array(string2()).optional()
  }).catchall(unknown()),
  outputSchema: object({
    type: literal("object"),
    properties: record(string2(), JSONValueSchema).optional(),
    required: array(string2()).optional()
  }).catchall(unknown()).optional(),
  annotations: ToolAnnotationsSchema.optional(),
  execution: ToolExecutionSchema.optional(),
  _meta: record(string2(), unknown()).optional()
});
var ListToolsRequestSchema = PaginatedRequestSchema.extend({ method: literal("tools/list") });
var ListToolsResultSchema = PaginatedResultSchema.extend({ tools: array(ToolSchema) });
var CallToolResultSchema = ResultSchema.extend({
  content: array(ContentBlockSchema).default([]),
  structuredContent: record(string2(), unknown()).optional(),
  isError: boolean2().optional()
});
var CompatibilityCallToolResultSchema = CallToolResultSchema.or(ResultSchema.extend({ toolResult: unknown() }));
var CallToolRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  name: string2(),
  arguments: record(string2(), unknown()).optional()
});
var CallToolRequestSchema = RequestSchema.extend({
  method: literal("tools/call"),
  params: CallToolRequestParamsSchema
});
var ToolListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/tools/list_changed"),
  params: NotificationsParamsSchema.optional()
});
var ListChangedOptionsBaseSchema = object({
  autoRefresh: boolean2().default(true),
  debounceMs: number2().int().nonnegative().default(300)
});
var LoggingLevelSchema = _enum([
  "debug",
  "info",
  "notice",
  "warning",
  "error",
  "critical",
  "alert",
  "emergency"
]);
var SetLevelRequestParamsSchema = BaseRequestParamsSchema.extend({ level: LoggingLevelSchema });
var SetLevelRequestSchema = RequestSchema.extend({
  method: literal("logging/setLevel"),
  params: SetLevelRequestParamsSchema
});
var LoggingMessageNotificationParamsSchema = NotificationsParamsSchema.extend({
  level: LoggingLevelSchema,
  logger: string2().optional(),
  data: unknown()
});
var LoggingMessageNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/message"),
  params: LoggingMessageNotificationParamsSchema
});
var ModelHintSchema = object({ name: string2().optional() });
var ModelPreferencesSchema = object({
  hints: array(ModelHintSchema).optional(),
  costPriority: number2().min(0).max(1).optional(),
  speedPriority: number2().min(0).max(1).optional(),
  intelligencePriority: number2().min(0).max(1).optional()
});
var ToolChoiceSchema = object({ mode: _enum([
  "auto",
  "required",
  "none"
]).optional() });
var ToolResultContentSchema = object({
  type: literal("tool_result"),
  toolUseId: string2().describe("The unique identifier for the corresponding tool call."),
  content: array(ContentBlockSchema).default([]),
  structuredContent: object({}).loose().optional(),
  isError: boolean2().optional(),
  _meta: record(string2(), unknown()).optional()
});
var SamplingContentSchema = discriminatedUnion("type", [
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema
]);
var SamplingMessageContentBlockSchema = discriminatedUnion("type", [
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema,
  ToolUseContentSchema,
  ToolResultContentSchema
]);
var SamplingMessageSchema = object({
  role: RoleSchema,
  content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)]),
  _meta: record(string2(), unknown()).optional()
});
var CreateMessageRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  messages: array(SamplingMessageSchema),
  modelPreferences: ModelPreferencesSchema.optional(),
  systemPrompt: string2().optional(),
  includeContext: _enum([
    "none",
    "thisServer",
    "allServers"
  ]).optional(),
  temperature: number2().optional(),
  maxTokens: number2().int(),
  stopSequences: array(string2()).optional(),
  metadata: JSONObjectSchema.optional(),
  tools: array(ToolSchema).optional(),
  toolChoice: ToolChoiceSchema.optional()
});
var CreateMessageRequestSchema = RequestSchema.extend({
  method: literal("sampling/createMessage"),
  params: CreateMessageRequestParamsSchema
});
var CreateMessageResultSchema = ResultSchema.extend({
  model: string2(),
  stopReason: optional(_enum([
    "endTurn",
    "stopSequence",
    "maxTokens"
  ]).or(string2())),
  role: RoleSchema,
  content: SamplingContentSchema
});
var CreateMessageResultWithToolsSchema = ResultSchema.extend({
  model: string2(),
  stopReason: optional(_enum([
    "endTurn",
    "stopSequence",
    "maxTokens",
    "toolUse"
  ]).or(string2())),
  role: RoleSchema,
  content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)])
});
var BooleanSchemaSchema = object({
  type: literal("boolean"),
  title: string2().optional(),
  description: string2().optional(),
  default: boolean2().optional()
});
var StringSchemaSchema = object({
  type: literal("string"),
  title: string2().optional(),
  description: string2().optional(),
  minLength: number2().optional(),
  maxLength: number2().optional(),
  format: _enum([
    "email",
    "uri",
    "date",
    "date-time"
  ]).optional(),
  default: string2().optional()
});
var NumberSchemaSchema = object({
  type: _enum(["number", "integer"]),
  title: string2().optional(),
  description: string2().optional(),
  minimum: number2().optional(),
  maximum: number2().optional(),
  default: number2().optional()
});
var UntitledSingleSelectEnumSchemaSchema = object({
  type: literal("string"),
  title: string2().optional(),
  description: string2().optional(),
  enum: array(string2()),
  default: string2().optional()
});
var TitledSingleSelectEnumSchemaSchema = object({
  type: literal("string"),
  title: string2().optional(),
  description: string2().optional(),
  oneOf: array(object({
    const: string2(),
    title: string2()
  })),
  default: string2().optional()
});
var LegacyTitledEnumSchemaSchema = object({
  type: literal("string"),
  title: string2().optional(),
  description: string2().optional(),
  enum: array(string2()),
  enumNames: array(string2()).optional(),
  default: string2().optional()
});
var SingleSelectEnumSchemaSchema = union([UntitledSingleSelectEnumSchemaSchema, TitledSingleSelectEnumSchemaSchema]);
var UntitledMultiSelectEnumSchemaSchema = object({
  type: literal("array"),
  title: string2().optional(),
  description: string2().optional(),
  minItems: number2().optional(),
  maxItems: number2().optional(),
  items: object({
    type: literal("string"),
    enum: array(string2())
  }),
  default: array(string2()).optional()
});
var TitledMultiSelectEnumSchemaSchema = object({
  type: literal("array"),
  title: string2().optional(),
  description: string2().optional(),
  minItems: number2().optional(),
  maxItems: number2().optional(),
  items: object({ anyOf: array(object({
    const: string2(),
    title: string2()
  })) }),
  default: array(string2()).optional()
});
var MultiSelectEnumSchemaSchema = union([UntitledMultiSelectEnumSchemaSchema, TitledMultiSelectEnumSchemaSchema]);
var EnumSchemaSchema = union([
  LegacyTitledEnumSchemaSchema,
  SingleSelectEnumSchemaSchema,
  MultiSelectEnumSchemaSchema
]);
var PrimitiveSchemaDefinitionSchema = union([
  EnumSchemaSchema,
  BooleanSchemaSchema,
  StringSchemaSchema,
  NumberSchemaSchema
]);
var ElicitRequestFormParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  mode: literal("form").optional(),
  message: string2(),
  requestedSchema: object({
    type: literal("object"),
    properties: record(string2(), PrimitiveSchemaDefinitionSchema),
    required: array(string2()).optional()
  })
});
var ElicitRequestURLParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  mode: literal("url"),
  message: string2(),
  elicitationId: string2(),
  url: string2().url()
});
var ElicitRequestParamsSchema = union([ElicitRequestFormParamsSchema, ElicitRequestURLParamsSchema]);
var ElicitRequestSchema = RequestSchema.extend({
  method: literal("elicitation/create"),
  params: ElicitRequestParamsSchema
});
var ElicitationCompleteNotificationParamsSchema = NotificationsParamsSchema.extend({ elicitationId: string2() });
var ElicitationCompleteNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/elicitation/complete"),
  params: ElicitationCompleteNotificationParamsSchema
});
var ElicitResultSchema = ResultSchema.extend({
  action: _enum([
    "accept",
    "decline",
    "cancel"
  ]),
  content: preprocess((val) => val === null ? void 0 : val, record(string2(), union([
    string2(),
    number2(),
    boolean2(),
    array(string2())
  ])).optional())
});
var ResourceTemplateReferenceSchema = object({
  type: literal("ref/resource"),
  uri: string2()
});
var PromptReferenceSchema = object({
  type: literal("ref/prompt"),
  name: string2()
});
var CompleteRequestParamsSchema = BaseRequestParamsSchema.extend({
  ref: union([PromptReferenceSchema, ResourceTemplateReferenceSchema]),
  argument: object({
    name: string2(),
    value: string2()
  }),
  context: object({ arguments: record(string2(), string2()).optional() }).optional()
});
var CompleteRequestSchema = RequestSchema.extend({
  method: literal("completion/complete"),
  params: CompleteRequestParamsSchema
});
var CompleteResultSchema = ResultSchema.extend({ completion: looseObject({
  values: array(string2()).max(100),
  total: optional(number2().int()),
  hasMore: optional(boolean2())
}) });
var RootSchema = object({
  uri: string2().startsWith("file://"),
  name: string2().optional(),
  _meta: record(string2(), unknown()).optional()
});
var ListRootsRequestSchema = RequestSchema.extend({
  method: literal("roots/list"),
  params: BaseRequestParamsSchema.optional()
});
var ListRootsResultSchema = ResultSchema.extend({ roots: array(RootSchema) });
var RootsListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/roots/list_changed"),
  params: NotificationsParamsSchema.optional()
});
var ClientRequestSchema = union([
  PingRequestSchema,
  InitializeRequestSchema,
  CompleteRequestSchema,
  SetLevelRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema
]);
var ClientNotificationSchema = union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  InitializedNotificationSchema,
  RootsListChangedNotificationSchema,
  TaskStatusNotificationSchema
]);
var ClientResultSchema = union([
  EmptyResultSchema,
  CreateMessageResultSchema,
  CreateMessageResultWithToolsSchema,
  ElicitResultSchema,
  ListRootsResultSchema,
  GetTaskResultSchema,
  ListTasksResultSchema,
  CreateTaskResultSchema
]);
var ServerRequestSchema = union([
  PingRequestSchema,
  CreateMessageRequestSchema,
  ElicitRequestSchema,
  ListRootsRequestSchema,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema
]);
var ServerNotificationSchema = union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  LoggingMessageNotificationSchema,
  ResourceUpdatedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ToolListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
  TaskStatusNotificationSchema,
  ElicitationCompleteNotificationSchema
]);
var ServerResultSchema = union([
  EmptyResultSchema,
  InitializeResultSchema,
  CompleteResultSchema,
  GetPromptResultSchema,
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ReadResourceResultSchema,
  CallToolResultSchema,
  ListToolsResultSchema,
  GetTaskResultSchema,
  ListTasksResultSchema,
  CreateTaskResultSchema
]);
var resultSchemas = {
  ping: EmptyResultSchema,
  initialize: InitializeResultSchema,
  "completion/complete": CompleteResultSchema,
  "logging/setLevel": EmptyResultSchema,
  "prompts/get": GetPromptResultSchema,
  "prompts/list": ListPromptsResultSchema,
  "resources/list": ListResourcesResultSchema,
  "resources/templates/list": ListResourceTemplatesResultSchema,
  "resources/read": ReadResourceResultSchema,
  "resources/subscribe": EmptyResultSchema,
  "resources/unsubscribe": EmptyResultSchema,
  "tools/call": union([CallToolResultSchema, CreateTaskResultSchema]),
  "tools/list": ListToolsResultSchema,
  "sampling/createMessage": union([CreateMessageResultWithToolsSchema, CreateTaskResultSchema]),
  "elicitation/create": union([ElicitResultSchema, CreateTaskResultSchema]),
  "roots/list": ListRootsResultSchema,
  "tasks/get": GetTaskResultSchema,
  "tasks/result": ResultSchema,
  "tasks/list": ListTasksResultSchema,
  "tasks/cancel": CancelTaskResultSchema
};
function getResultSchema(method) {
  return resultSchemas[method];
}
function buildSchemaMap(schemas) {
  const map2 = {};
  for (const schema of schemas) {
    const method = schema.shape.method.value;
    map2[method] = schema;
  }
  return map2;
}
var requestSchemas = buildSchemaMap([...ClientRequestSchema.options, ...ServerRequestSchema.options]);
var notificationSchemas = buildSchemaMap([...ClientNotificationSchema.options, ...ServerNotificationSchema.options]);
function getRequestSchema(method) {
  return requestSchemas[method];
}
function getNotificationSchema(method) {
  return notificationSchemas[method];
}
var isJSONRPCRequest = (value) => JSONRPCRequestSchema.safeParse(value).success;
var isJSONRPCNotification = (value) => JSONRPCNotificationSchema.safeParse(value).success;
var isJSONRPCResultResponse = (value) => JSONRPCResultResponseSchema.safeParse(value).success;
var isJSONRPCErrorResponse = (value) => JSONRPCErrorResponseSchema.safeParse(value).success;
var isTaskAugmentedRequestParams = (value) => TaskAugmentedRequestParamsSchema.safeParse(value).success;
var isInitializedNotification = (value) => InitializedNotificationSchema.safeParse(value).success;
function parseSchema(schema, data) {
  return safeParse2(schema, data);
}
function isTerminal(status) {
  return status === "completed" || status === "failed" || status === "cancelled";
}
function extractTaskManagerOptions(tasksCapability) {
  if (!tasksCapability) return void 0;
  const { taskStore, taskMessageQueue, defaultTaskPollInterval, maxTaskQueueSize } = tasksCapability;
  return {
    taskStore,
    taskMessageQueue,
    defaultTaskPollInterval,
    maxTaskQueueSize
  };
}
var TaskManager = class {
  _taskStore;
  _taskMessageQueue;
  _taskProgressTokens = /* @__PURE__ */ new Map();
  _requestResolvers = /* @__PURE__ */ new Map();
  _options;
  _host;
  constructor(options) {
    this._options = options;
    this._taskStore = options.taskStore;
    this._taskMessageQueue = options.taskMessageQueue;
  }
  bind(host) {
    this._host = host;
    if (this._taskStore) {
      host.registerHandler("tasks/get", async (request, ctx) => {
        const params = request.params;
        return { ...await this.handleGetTask(params.taskId, ctx.sessionId) };
      });
      host.registerHandler("tasks/result", async (request, ctx) => {
        const params = request.params;
        return await this.handleGetTaskPayload(params.taskId, ctx.sessionId, ctx.mcpReq.signal, async (message) => {
          await host.sendOnResponseStream(message, ctx.mcpReq.id);
        });
      });
      host.registerHandler("tasks/list", async (request, ctx) => {
        const params = request.params;
        return await this.handleListTasks(params?.cursor, ctx.sessionId);
      });
      host.registerHandler("tasks/cancel", async (request, ctx) => {
        const params = request.params;
        return await this.handleCancelTask(params.taskId, ctx.sessionId);
      });
    }
  }
  get _requireHost() {
    if (!this._host) throw new ProtocolError(ProtocolErrorCode.InternalError, "TaskManager is not bound to a Protocol host \u2014 call bind() first");
    return this._host;
  }
  get taskStore() {
    return this._taskStore;
  }
  get _requireTaskStore() {
    if (!this._taskStore) throw new ProtocolError(ProtocolErrorCode.InternalError, "TaskStore is not configured");
    return this._taskStore;
  }
  get taskMessageQueue() {
    return this._taskMessageQueue;
  }
  async *requestStream(request, resultSchema, options) {
    const host = this._requireHost;
    const { task } = options ?? {};
    if (!task) {
      try {
        yield {
          type: "result",
          result: await host.request(request, resultSchema, options)
        };
      } catch (error2) {
        yield {
          type: "error",
          error: error2 instanceof Error ? error2 : new Error(String(error2))
        };
      }
      return;
    }
    let taskId;
    try {
      const createResult = await host.request(request, CreateTaskResultSchema, options);
      if (createResult.task) {
        taskId = createResult.task.taskId;
        yield {
          type: "taskCreated",
          task: createResult.task
        };
      } else throw new ProtocolError(ProtocolErrorCode.InternalError, "Task creation did not return a task");
      while (true) {
        const task$1 = await this.getTask({ taskId }, options);
        yield {
          type: "taskStatus",
          task: task$1
        };
        if (isTerminal(task$1.status)) {
          switch (task$1.status) {
            case "completed":
              yield {
                type: "result",
                result: await this.getTaskResult({ taskId }, resultSchema, options)
              };
              break;
            case "failed":
              yield {
                type: "error",
                error: new ProtocolError(ProtocolErrorCode.InternalError, `Task ${taskId} failed`)
              };
              break;
            case "cancelled":
              yield {
                type: "error",
                error: new ProtocolError(ProtocolErrorCode.InternalError, `Task ${taskId} was cancelled`)
              };
              break;
          }
          return;
        }
        if (task$1.status === "input_required") {
          yield {
            type: "result",
            result: await this.getTaskResult({ taskId }, resultSchema, options)
          };
          return;
        }
        const pollInterval = task$1.pollInterval ?? this._options.defaultTaskPollInterval ?? 1e3;
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        options?.signal?.throwIfAborted();
      }
    } catch (error2) {
      yield {
        type: "error",
        error: error2 instanceof Error ? error2 : new Error(String(error2))
      };
    }
  }
  async getTask(params, options) {
    return this._requireHost.request({
      method: "tasks/get",
      params
    }, GetTaskResultSchema, options);
  }
  async getTaskResult(params, resultSchema, options) {
    return this._requireHost.request({
      method: "tasks/result",
      params
    }, resultSchema, options);
  }
  async listTasks(params, options) {
    return this._requireHost.request({
      method: "tasks/list",
      params
    }, ListTasksResultSchema, options);
  }
  async cancelTask(params, options) {
    return this._requireHost.request({
      method: "tasks/cancel",
      params
    }, CancelTaskResultSchema, options);
  }
  async handleGetTask(taskId, sessionId) {
    const task = await this._requireTaskStore.getTask(taskId, sessionId);
    if (!task) throw new ProtocolError(ProtocolErrorCode.InvalidParams, "Failed to retrieve task: Task not found");
    return task;
  }
  async handleGetTaskPayload(taskId, sessionId, signal, sendOnResponseStream) {
    const handleTaskResult = async () => {
      if (this._taskMessageQueue) {
        let queuedMessage;
        while (queuedMessage = await this._taskMessageQueue.dequeue(taskId, sessionId)) {
          if (queuedMessage.type === "response" || queuedMessage.type === "error") {
            const message = queuedMessage.message;
            const requestId = message.id;
            const resolver = this._requestResolvers.get(requestId);
            if (resolver) {
              this._requestResolvers.delete(requestId);
              if (queuedMessage.type === "response") resolver(message);
              else {
                const errorMessage = message;
                resolver(new ProtocolError(errorMessage.error.code, errorMessage.error.message, errorMessage.error.data));
              }
            } else {
              const messageType = queuedMessage.type === "response" ? "Response" : "Error";
              this._host?.reportError(/* @__PURE__ */ new Error(`${messageType} handler missing for request ${requestId}`));
            }
            continue;
          }
          await sendOnResponseStream(queuedMessage.message);
        }
      }
      const task = await this._requireTaskStore.getTask(taskId, sessionId);
      if (!task) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Task not found: ${taskId}`);
      if (!isTerminal(task.status)) {
        await this._waitForTaskUpdate(task.pollInterval, signal);
        return await handleTaskResult();
      }
      const result = await this._requireTaskStore.getTaskResult(taskId, sessionId);
      await this._clearTaskQueue(taskId);
      return {
        ...result,
        _meta: {
          ...result._meta,
          [RELATED_TASK_META_KEY]: { taskId }
        }
      };
    };
    return await handleTaskResult();
  }
  async handleListTasks(cursor, sessionId) {
    try {
      const { tasks, nextCursor } = await this._requireTaskStore.listTasks(cursor, sessionId);
      return {
        tasks,
        nextCursor,
        _meta: {}
      };
    } catch (error2) {
      throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Failed to list tasks: ${error2 instanceof Error ? error2.message : String(error2)}`);
    }
  }
  async handleCancelTask(taskId, sessionId) {
    try {
      const task = await this._requireTaskStore.getTask(taskId, sessionId);
      if (!task) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Task not found: ${taskId}`);
      if (isTerminal(task.status)) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Cannot cancel task in terminal status: ${task.status}`);
      await this._requireTaskStore.updateTaskStatus(taskId, "cancelled", "Client cancelled task execution.", sessionId);
      await this._clearTaskQueue(taskId);
      const cancelledTask = await this._requireTaskStore.getTask(taskId, sessionId);
      if (!cancelledTask) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Task not found after cancellation: ${taskId}`);
      return {
        _meta: {},
        ...cancelledTask
      };
    } catch (error2) {
      if (error2 instanceof ProtocolError) throw error2;
      throw new ProtocolError(ProtocolErrorCode.InvalidRequest, `Failed to cancel task: ${error2 instanceof Error ? error2.message : String(error2)}`);
    }
  }
  prepareOutboundRequest(jsonrpcRequest, options, messageId, responseHandler, onError) {
    const { task, relatedTask } = options ?? {};
    if (task) jsonrpcRequest.params = {
      ...jsonrpcRequest.params,
      task
    };
    if (relatedTask) jsonrpcRequest.params = {
      ...jsonrpcRequest.params,
      _meta: {
        ...jsonrpcRequest.params?._meta,
        [RELATED_TASK_META_KEY]: relatedTask
      }
    };
    const relatedTaskId = relatedTask?.taskId;
    if (relatedTaskId) {
      this._requestResolvers.set(messageId, responseHandler);
      this._enqueueTaskMessage(relatedTaskId, {
        type: "request",
        message: jsonrpcRequest,
        timestamp: Date.now()
      }).catch((error2) => {
        onError(error2);
      });
      return true;
    }
    return false;
  }
  extractInboundTaskContext(request, sessionId) {
    const relatedTaskId = request.params?._meta?.[RELATED_TASK_META_KEY]?.taskId;
    const taskCreationParams = isTaskAugmentedRequestParams(request.params) ? request.params.task : void 0;
    let taskContext;
    if (this._taskStore) taskContext = {
      id: relatedTaskId,
      store: this.createRequestTaskStore(request, sessionId),
      requestedTtl: taskCreationParams?.ttl
    };
    if (!relatedTaskId && !taskCreationParams && !taskContext) return {};
    return {
      relatedTaskId,
      taskCreationParams,
      taskContext
    };
  }
  wrapSendNotification(relatedTaskId, originalSendNotification) {
    return async (notification) => {
      await originalSendNotification(notification, { relatedTask: { taskId: relatedTaskId } });
    };
  }
  wrapSendRequest(relatedTaskId, taskStore, originalSendRequest) {
    return async (request, resultSchema, options) => {
      const requestOptions = { ...options };
      if (relatedTaskId && !requestOptions.relatedTask) requestOptions.relatedTask = { taskId: relatedTaskId };
      const effectiveTaskId = requestOptions.relatedTask?.taskId ?? relatedTaskId;
      if (effectiveTaskId && taskStore) await taskStore.updateTaskStatus(effectiveTaskId, "input_required");
      return await originalSendRequest(request, resultSchema, requestOptions);
    };
  }
  handleResponse(response) {
    const messageId = Number(response.id);
    const resolver = this._requestResolvers.get(messageId);
    if (resolver) {
      this._requestResolvers.delete(messageId);
      if (isJSONRPCResultResponse(response)) resolver(response);
      else resolver(new ProtocolError(response.error.code, response.error.message, response.error.data));
      return true;
    }
    return false;
  }
  shouldPreserveProgressHandler(response, messageId) {
    if (isJSONRPCResultResponse(response) && response.result && typeof response.result === "object") {
      const result = response.result;
      if (result.task && typeof result.task === "object") {
        const task = result.task;
        if (typeof task.taskId === "string") {
          this._taskProgressTokens.set(task.taskId, messageId);
          return true;
        }
      }
    }
    return false;
  }
  async routeNotification(notification, options) {
    const relatedTaskId = options?.relatedTask?.taskId;
    if (!relatedTaskId) return false;
    const jsonrpcNotification = {
      ...notification,
      jsonrpc: "2.0",
      params: {
        ...notification.params,
        _meta: {
          ...notification.params?._meta,
          [RELATED_TASK_META_KEY]: options.relatedTask
        }
      }
    };
    await this._enqueueTaskMessage(relatedTaskId, {
      type: "notification",
      message: jsonrpcNotification,
      timestamp: Date.now()
    });
    return true;
  }
  async routeResponse(relatedTaskId, message, sessionId) {
    if (!relatedTaskId || !this._taskMessageQueue) return false;
    await (isJSONRPCErrorResponse(message) ? this._enqueueTaskMessage(relatedTaskId, {
      type: "error",
      message,
      timestamp: Date.now()
    }, sessionId) : this._enqueueTaskMessage(relatedTaskId, {
      type: "response",
      message,
      timestamp: Date.now()
    }, sessionId));
    return true;
  }
  createRequestTaskStore(request, sessionId) {
    const taskStore = this._requireTaskStore;
    const host = this._host;
    return {
      createTask: async (taskParams) => {
        if (!request) throw new Error("No request provided");
        return await taskStore.createTask(taskParams, request.id, {
          method: request.method,
          params: request.params
        }, sessionId);
      },
      getTask: async (taskId) => {
        const task = await taskStore.getTask(taskId, sessionId);
        if (!task) throw new ProtocolError(ProtocolErrorCode.InvalidParams, "Failed to retrieve task: Task not found");
        return task;
      },
      storeTaskResult: async (taskId, status, result) => {
        await taskStore.storeTaskResult(taskId, status, result, sessionId);
        const task = await taskStore.getTask(taskId, sessionId);
        if (task) {
          const notification = TaskStatusNotificationSchema.parse({
            method: "notifications/tasks/status",
            params: task
          });
          await host?.notification(notification);
          if (isTerminal(task.status)) this._cleanupTaskProgressHandler(taskId);
        }
      },
      getTaskResult: (taskId) => taskStore.getTaskResult(taskId, sessionId),
      updateTaskStatus: async (taskId, status, statusMessage) => {
        const task = await taskStore.getTask(taskId, sessionId);
        if (!task) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Task "${taskId}" not found - it may have been cleaned up`);
        if (isTerminal(task.status)) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Cannot update task "${taskId}" from terminal status "${task.status}" to "${status}". Terminal states (completed, failed, cancelled) cannot transition to other states.`);
        await taskStore.updateTaskStatus(taskId, status, statusMessage, sessionId);
        const updatedTask = await taskStore.getTask(taskId, sessionId);
        if (updatedTask) {
          const notification = TaskStatusNotificationSchema.parse({
            method: "notifications/tasks/status",
            params: updatedTask
          });
          await host?.notification(notification);
          if (isTerminal(updatedTask.status)) this._cleanupTaskProgressHandler(taskId);
        }
      },
      listTasks: (cursor) => taskStore.listTasks(cursor, sessionId)
    };
  }
  processInboundRequest(request, ctx) {
    const taskInfo = this.extractInboundTaskContext(request, ctx.sessionId);
    const relatedTaskId = taskInfo?.relatedTaskId;
    const sendNotification = relatedTaskId ? this.wrapSendNotification(relatedTaskId, ctx.sendNotification) : (notification) => ctx.sendNotification(notification);
    const sendRequest = relatedTaskId ? this.wrapSendRequest(relatedTaskId, taskInfo?.taskContext?.store, ctx.sendRequest) : taskInfo?.taskContext ? this.wrapSendRequest("", taskInfo.taskContext.store, ctx.sendRequest) : ctx.sendRequest;
    const hasTaskCreationParams = !!taskInfo?.taskCreationParams;
    return {
      taskContext: taskInfo?.taskContext,
      sendNotification,
      sendRequest,
      routeResponse: async (message) => {
        if (relatedTaskId) return this.routeResponse(relatedTaskId, message, ctx.sessionId);
        return false;
      },
      hasTaskCreationParams,
      validateInbound: hasTaskCreationParams ? () => this._requireHost.assertTaskHandlerCapability(request.method) : void 0
    };
  }
  processOutboundRequest(jsonrpcRequest, options, messageId, responseHandler, onError) {
    if (this._requireHost.enforceStrictCapabilities && options?.task) this._requireHost.assertTaskCapability(jsonrpcRequest.method);
    return { queued: this.prepareOutboundRequest(jsonrpcRequest, options, messageId, responseHandler, onError) };
  }
  processInboundResponse(response, messageId) {
    if (this.handleResponse(response)) return {
      consumed: true,
      preserveProgress: false
    };
    return {
      consumed: false,
      preserveProgress: this.shouldPreserveProgressHandler(response, messageId)
    };
  }
  async processOutboundNotification(notification, options) {
    if (await this.routeNotification(notification, options)) return { queued: true };
    let jsonrpcNotification = {
      ...notification,
      jsonrpc: "2.0"
    };
    if (options?.relatedTask) jsonrpcNotification = {
      ...jsonrpcNotification,
      params: {
        ...jsonrpcNotification.params,
        _meta: {
          ...jsonrpcNotification.params?._meta,
          [RELATED_TASK_META_KEY]: options.relatedTask
        }
      }
    };
    return {
      queued: false,
      jsonrpcNotification
    };
  }
  onClose() {
    this._taskProgressTokens.clear();
    this._requestResolvers.clear();
  }
  async _enqueueTaskMessage(taskId, message, sessionId) {
    if (!this._taskStore || !this._taskMessageQueue) throw new Error("Cannot enqueue task message: taskStore and taskMessageQueue are not configured");
    await this._taskMessageQueue.enqueue(taskId, message, sessionId, this._options.maxTaskQueueSize);
  }
  async _clearTaskQueue(taskId, sessionId) {
    if (this._taskMessageQueue) {
      const messages = await this._taskMessageQueue.dequeueAll(taskId, sessionId);
      for (const message of messages) if (message.type === "request" && isJSONRPCRequest(message.message)) {
        const requestId = message.message.id;
        const resolver = this._requestResolvers.get(requestId);
        if (resolver) {
          resolver(new ProtocolError(ProtocolErrorCode.InternalError, "Task cancelled or completed"));
          this._requestResolvers.delete(requestId);
        } else this._host?.reportError(/* @__PURE__ */ new Error(`Resolver missing for request ${requestId} during task ${taskId} cleanup`));
      }
    }
  }
  async _waitForTaskUpdate(pollInterval, signal) {
    const interval = pollInterval ?? this._options.defaultTaskPollInterval ?? 1e3;
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new ProtocolError(ProtocolErrorCode.InvalidRequest, "Request cancelled"));
        return;
      }
      const timeoutId = setTimeout(resolve, interval);
      signal.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        reject(new ProtocolError(ProtocolErrorCode.InvalidRequest, "Request cancelled"));
      }, { once: true });
    });
  }
  _cleanupTaskProgressHandler(taskId) {
    const progressToken = this._taskProgressTokens.get(taskId);
    if (progressToken !== void 0) {
      this._host?.removeProgressHandler(progressToken);
      this._taskProgressTokens.delete(taskId);
    }
  }
};
var NullTaskManager = class extends TaskManager {
  constructor() {
    super({});
  }
  processInboundRequest(request, ctx) {
    const hasTaskCreationParams = isTaskAugmentedRequestParams(request.params) && !!request.params.task;
    return {
      taskContext: void 0,
      sendNotification: (notification) => ctx.sendNotification(notification),
      sendRequest: ctx.sendRequest,
      routeResponse: async () => false,
      hasTaskCreationParams,
      validateInbound: hasTaskCreationParams ? () => this._requireHost.assertTaskHandlerCapability(request.method) : void 0
    };
  }
  async processOutboundNotification(notification, _options) {
    return {
      queued: false,
      jsonrpcNotification: {
        ...notification,
        jsonrpc: "2.0"
      }
    };
  }
};
var DEFAULT_REQUEST_TIMEOUT_MSEC = 6e4;
var Protocol = class {
  _transport;
  _requestMessageId = 0;
  _requestHandlers = /* @__PURE__ */ new Map();
  _requestHandlerAbortControllers = /* @__PURE__ */ new Map();
  _notificationHandlers = /* @__PURE__ */ new Map();
  _responseHandlers = /* @__PURE__ */ new Map();
  _progressHandlers = /* @__PURE__ */ new Map();
  _timeoutInfo = /* @__PURE__ */ new Map();
  _pendingDebouncedNotifications = /* @__PURE__ */ new Set();
  _taskManager;
  _supportedProtocolVersions;
  /**
  * Callback for when the connection is closed for any reason.
  *
  * This is invoked when {@linkcode Protocol.close | close()} is called as well.
  */
  onclose;
  /**
  * Callback for when an error occurs.
  *
  * Note that errors are not necessarily fatal; they are used for reporting any kind of exceptional condition out of band.
  */
  onerror;
  /**
  * A handler to invoke for any request types that do not have their own handler installed.
  */
  fallbackRequestHandler;
  /**
  * A handler to invoke for any notification types that do not have their own handler installed.
  */
  fallbackNotificationHandler;
  constructor(_options) {
    this._options = _options;
    this._supportedProtocolVersions = _options?.supportedProtocolVersions ?? SUPPORTED_PROTOCOL_VERSIONS;
    this._taskManager = _options?.tasks ? new TaskManager(_options.tasks) : new NullTaskManager();
    this._bindTaskManager();
    this.setNotificationHandler("notifications/cancelled", (notification) => {
      this._oncancel(notification);
    });
    this.setNotificationHandler("notifications/progress", (notification) => {
      this._onprogress(notification);
    });
    this.setRequestHandler("ping", (_request) => ({}));
  }
  /**
  * Access the TaskManager for task orchestration.
  * Always available; returns a NullTaskManager when no task store is configured.
  */
  get taskManager() {
    return this._taskManager;
  }
  _bindTaskManager() {
    const taskManager = this._taskManager;
    const host = {
      request: (request, resultSchema, options) => this._requestWithSchema(request, resultSchema, options),
      notification: (notification, options) => this.notification(notification, options),
      reportError: (error2) => this._onerror(error2),
      removeProgressHandler: (token) => this._progressHandlers.delete(token),
      registerHandler: (method, handler) => {
        const schema = getRequestSchema(method);
        this._requestHandlers.set(method, (request, ctx) => {
          schema.parse(request);
          return handler(request, ctx);
        });
      },
      sendOnResponseStream: async (message, relatedRequestId) => {
        await this._transport?.send(message, { relatedRequestId });
      },
      enforceStrictCapabilities: this._options?.enforceStrictCapabilities === true,
      assertTaskCapability: (method) => this.assertTaskCapability(method),
      assertTaskHandlerCapability: (method) => this.assertTaskHandlerCapability(method)
    };
    taskManager.bind(host);
  }
  async _oncancel(notification) {
    if (!notification.params.requestId) return;
    this._requestHandlerAbortControllers.get(notification.params.requestId)?.abort(notification.params.reason);
  }
  _setupTimeout(messageId, timeout, maxTotalTimeout, onTimeout, resetTimeoutOnProgress = false) {
    this._timeoutInfo.set(messageId, {
      timeoutId: setTimeout(onTimeout, timeout),
      startTime: Date.now(),
      timeout,
      maxTotalTimeout,
      resetTimeoutOnProgress,
      onTimeout
    });
  }
  _resetTimeout(messageId) {
    const info = this._timeoutInfo.get(messageId);
    if (!info) return false;
    const totalElapsed = Date.now() - info.startTime;
    if (info.maxTotalTimeout && totalElapsed >= info.maxTotalTimeout) {
      this._timeoutInfo.delete(messageId);
      throw new SdkError(SdkErrorCode.RequestTimeout, "Maximum total timeout exceeded", {
        maxTotalTimeout: info.maxTotalTimeout,
        totalElapsed
      });
    }
    clearTimeout(info.timeoutId);
    info.timeoutId = setTimeout(info.onTimeout, info.timeout);
    return true;
  }
  _cleanupTimeout(messageId) {
    const info = this._timeoutInfo.get(messageId);
    if (info) {
      clearTimeout(info.timeoutId);
      this._timeoutInfo.delete(messageId);
    }
  }
  /**
  * Attaches to the given transport, starts it, and starts listening for messages.
  *
  * The caller assumes ownership of the {@linkcode Transport}, replacing any callbacks that have already been set, and expects that it is the only user of the {@linkcode Transport} instance going forward.
  */
  async connect(transport) {
    this._transport = transport;
    const _onclose = this.transport?.onclose;
    this._transport.onclose = () => {
      try {
        _onclose?.();
      } finally {
        this._onclose();
      }
    };
    const _onerror = this.transport?.onerror;
    this._transport.onerror = (error2) => {
      _onerror?.(error2);
      this._onerror(error2);
    };
    const _onmessage = this._transport?.onmessage;
    this._transport.onmessage = (message, extra) => {
      _onmessage?.(message, extra);
      if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) this._onresponse(message);
      else if (isJSONRPCRequest(message)) this._onrequest(message, extra);
      else if (isJSONRPCNotification(message)) this._onnotification(message);
      else this._onerror(/* @__PURE__ */ new Error(`Unknown message type: ${JSON.stringify(message)}`));
    };
    transport.setSupportedProtocolVersions?.(this._supportedProtocolVersions);
    await this._transport.start();
  }
  _onclose() {
    const responseHandlers = this._responseHandlers;
    this._responseHandlers = /* @__PURE__ */ new Map();
    this._progressHandlers.clear();
    this._taskManager.onClose();
    this._pendingDebouncedNotifications.clear();
    for (const info of this._timeoutInfo.values()) clearTimeout(info.timeoutId);
    this._timeoutInfo.clear();
    const requestHandlerAbortControllers = this._requestHandlerAbortControllers;
    this._requestHandlerAbortControllers = /* @__PURE__ */ new Map();
    const error2 = new SdkError(SdkErrorCode.ConnectionClosed, "Connection closed");
    this._transport = void 0;
    try {
      this.onclose?.();
    } finally {
      for (const handler of responseHandlers.values()) handler(error2);
      for (const controller of requestHandlerAbortControllers.values()) controller.abort(error2);
    }
  }
  _onerror(error2) {
    this.onerror?.(error2);
  }
  _onnotification(notification) {
    const handler = this._notificationHandlers.get(notification.method) ?? this.fallbackNotificationHandler;
    if (handler === void 0) return;
    Promise.resolve().then(() => handler(notification)).catch((error2) => this._onerror(/* @__PURE__ */ new Error(`Uncaught error in notification handler: ${error2}`)));
  }
  _onrequest(request, extra) {
    const handler = this._requestHandlers.get(request.method) ?? this.fallbackRequestHandler;
    const capturedTransport = this._transport;
    const inboundCtx = {
      sessionId: capturedTransport?.sessionId,
      sendNotification: (notification, options) => this.notification(notification, {
        ...options,
        relatedRequestId: request.id
      }),
      sendRequest: (r, resultSchema, options) => this._requestWithSchema(r, resultSchema, {
        ...options,
        relatedRequestId: request.id
      })
    };
    const taskResult = this._taskManager.processInboundRequest(request, inboundCtx);
    const sendNotification = taskResult.sendNotification;
    const sendRequest = taskResult.sendRequest;
    const taskContext = taskResult.taskContext;
    const routeResponse = taskResult.routeResponse;
    const validators = [];
    if (taskResult.validateInbound) validators.push(taskResult.validateInbound);
    if (handler === void 0) {
      const errorResponse = {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: ProtocolErrorCode.MethodNotFound,
          message: "Method not found"
        }
      };
      routeResponse(errorResponse).then((routed) => {
        if (!routed) capturedTransport?.send(errorResponse).catch((error2) => this._onerror(/* @__PURE__ */ new Error(`Failed to send an error response: ${error2}`)));
      }).catch((error2) => this._onerror(/* @__PURE__ */ new Error(`Failed to enqueue error response: ${error2}`)));
      return;
    }
    const abortController = new AbortController();
    this._requestHandlerAbortControllers.set(request.id, abortController);
    const baseCtx = {
      sessionId: capturedTransport?.sessionId,
      mcpReq: {
        id: request.id,
        method: request.method,
        _meta: request.params?._meta,
        signal: abortController.signal,
        send: (r, options) => {
          return sendRequest(r, getResultSchema(r.method), options);
        },
        notify: sendNotification
      },
      http: extra?.authInfo ? { authInfo: extra.authInfo } : void 0,
      task: taskContext
    };
    const ctx = this.buildContext(baseCtx, extra);
    Promise.resolve().then(() => {
      for (const validate of validators) validate();
    }).then(() => handler(request, ctx)).then(async (result) => {
      if (abortController.signal.aborted) return;
      const response = {
        result,
        jsonrpc: "2.0",
        id: request.id
      };
      if (!await routeResponse(response)) await capturedTransport?.send(response);
    }, async (error2) => {
      if (abortController.signal.aborted) return;
      const errorResponse = {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: Number.isSafeInteger(error2["code"]) ? error2["code"] : ProtocolErrorCode.InternalError,
          message: error2.message ?? "Internal error",
          ...error2["data"] !== void 0 && { data: error2["data"] }
        }
      };
      if (!await routeResponse(errorResponse)) await capturedTransport?.send(errorResponse);
    }).catch((error2) => this._onerror(/* @__PURE__ */ new Error(`Failed to send response: ${error2}`))).finally(() => {
      if (this._requestHandlerAbortControllers.get(request.id) === abortController) this._requestHandlerAbortControllers.delete(request.id);
    });
  }
  _onprogress(notification) {
    const { progressToken, ...params } = notification.params;
    const messageId = Number(progressToken);
    const handler = this._progressHandlers.get(messageId);
    if (!handler) {
      this._onerror(/* @__PURE__ */ new Error(`Received a progress notification for an unknown token: ${JSON.stringify(notification)}`));
      return;
    }
    const responseHandler = this._responseHandlers.get(messageId);
    const timeoutInfo = this._timeoutInfo.get(messageId);
    if (timeoutInfo && responseHandler && timeoutInfo.resetTimeoutOnProgress) try {
      this._resetTimeout(messageId);
    } catch (error2) {
      this._responseHandlers.delete(messageId);
      this._progressHandlers.delete(messageId);
      this._cleanupTimeout(messageId);
      responseHandler(error2);
      return;
    }
    handler(params);
  }
  _onresponse(response) {
    const messageId = Number(response.id);
    const taskResult = this._taskManager.processInboundResponse(response, messageId);
    if (taskResult.consumed) return;
    const preserveProgress = taskResult.preserveProgress;
    const handler = this._responseHandlers.get(messageId);
    if (handler === void 0) {
      this._onerror(/* @__PURE__ */ new Error(`Received a response for an unknown message ID: ${JSON.stringify(response)}`));
      return;
    }
    this._responseHandlers.delete(messageId);
    this._cleanupTimeout(messageId);
    if (!preserveProgress) this._progressHandlers.delete(messageId);
    if (isJSONRPCResultResponse(response)) handler(response);
    else handler(ProtocolError.fromError(response.error.code, response.error.message, response.error.data));
  }
  get transport() {
    return this._transport;
  }
  /**
  * Closes the connection.
  */
  async close() {
    await this._transport?.close();
  }
  /**
  * Sends a request and waits for a response, resolving the result schema
  * automatically from the method name.
  *
  * Do not use this method to emit notifications! Use {@linkcode Protocol.notification | notification()} instead.
  */
  request(request, options) {
    const resultSchema = getResultSchema(request.method);
    return this._requestWithSchema(request, resultSchema, options);
  }
  /**
  * Sends a request and waits for a response, using the provided schema for validation.
  *
  * This is the internal implementation used by SDK methods that need to specify
  * a particular result schema (e.g., for compatibility or task-specific schemas).
  */
  _requestWithSchema(request, resultSchema, options) {
    const { relatedRequestId, resumptionToken, onresumptiontoken } = options ?? {};
    let onAbort;
    let cleanupMessageId;
    return new Promise((resolve, reject) => {
      const earlyReject = (error2) => {
        reject(error2);
      };
      if (!this._transport) {
        earlyReject(/* @__PURE__ */ new Error("Not connected"));
        return;
      }
      if (this._options?.enforceStrictCapabilities === true) try {
        this.assertCapabilityForMethod(request.method);
      } catch (error2) {
        earlyReject(error2);
        return;
      }
      options?.signal?.throwIfAborted();
      const messageId = this._requestMessageId++;
      cleanupMessageId = messageId;
      const jsonrpcRequest = {
        ...request,
        jsonrpc: "2.0",
        id: messageId
      };
      if (options?.onprogress) {
        this._progressHandlers.set(messageId, options.onprogress);
        jsonrpcRequest.params = {
          ...request.params,
          _meta: {
            ...request.params?._meta,
            progressToken: messageId
          }
        };
      }
      const cancel = (reason) => {
        this._progressHandlers.delete(messageId);
        this._transport?.send({
          jsonrpc: "2.0",
          method: "notifications/cancelled",
          params: {
            requestId: messageId,
            reason: String(reason)
          }
        }, {
          relatedRequestId,
          resumptionToken,
          onresumptiontoken
        }).catch((error2) => this._onerror(/* @__PURE__ */ new Error(`Failed to send cancellation: ${error2}`)));
        reject(reason instanceof SdkError ? reason : new SdkError(SdkErrorCode.RequestTimeout, String(reason)));
      };
      this._responseHandlers.set(messageId, (response) => {
        if (options?.signal?.aborted) return;
        if (response instanceof Error) return reject(response);
        try {
          const parseResult = parseSchema(resultSchema, response.result);
          if (parseResult.success) resolve(parseResult.data);
          else reject(parseResult.error);
        } catch (error2) {
          reject(error2);
        }
      });
      onAbort = () => cancel(options?.signal?.reason);
      options?.signal?.addEventListener("abort", onAbort, { once: true });
      const timeout = options?.timeout ?? DEFAULT_REQUEST_TIMEOUT_MSEC;
      const timeoutHandler = () => cancel(new SdkError(SdkErrorCode.RequestTimeout, "Request timed out", { timeout }));
      this._setupTimeout(messageId, timeout, options?.maxTotalTimeout, timeoutHandler, options?.resetTimeoutOnProgress ?? false);
      const responseHandler = (response) => {
        const handler = this._responseHandlers.get(messageId);
        if (handler) handler(response);
        else this._onerror(/* @__PURE__ */ new Error(`Response handler missing for side-channeled request ${messageId}`));
      };
      let outboundQueued = false;
      try {
        if (this._taskManager.processOutboundRequest(jsonrpcRequest, options, messageId, responseHandler, (error2) => {
          this._progressHandlers.delete(messageId);
          reject(error2);
        }).queued) outboundQueued = true;
      } catch (error2) {
        this._progressHandlers.delete(messageId);
        reject(error2);
        return;
      }
      if (!outboundQueued) this._transport.send(jsonrpcRequest, {
        relatedRequestId,
        resumptionToken,
        onresumptiontoken
      }).catch((error2) => {
        this._progressHandlers.delete(messageId);
        reject(error2);
      });
    }).finally(() => {
      if (onAbort) options?.signal?.removeEventListener("abort", onAbort);
      if (cleanupMessageId !== void 0) {
        this._responseHandlers.delete(cleanupMessageId);
        this._cleanupTimeout(cleanupMessageId);
      }
    });
  }
  /**
  * Emits a notification, which is a one-way message that does not expect a response.
  */
  async notification(notification, options) {
    if (!this._transport) throw new SdkError(SdkErrorCode.NotConnected, "Not connected");
    this.assertNotificationCapability(notification.method);
    const taskResult = await this._taskManager.processOutboundNotification(notification, options);
    const queued = taskResult.queued;
    const jsonrpcNotification = taskResult.queued ? void 0 : taskResult.jsonrpcNotification;
    if (queued) return;
    if ((this._options?.debouncedNotificationMethods ?? []).includes(notification.method) && !notification.params && !options?.relatedRequestId && !options?.relatedTask) {
      if (this._pendingDebouncedNotifications.has(notification.method)) return;
      this._pendingDebouncedNotifications.add(notification.method);
      Promise.resolve().then(() => {
        this._pendingDebouncedNotifications.delete(notification.method);
        if (!this._transport) return;
        this._transport?.send(jsonrpcNotification, options).catch((error2) => this._onerror(error2));
      });
      return;
    }
    await this._transport.send(jsonrpcNotification, options);
  }
  /**
  * Registers a handler to invoke when this protocol object receives a request with the given method.
  *
  * Note that this will replace any previous request handler for the same method.
  */
  setRequestHandler(method, handler) {
    this.assertRequestHandlerCapability(method);
    const schema = getRequestSchema(method);
    this._requestHandlers.set(method, (request, ctx) => {
      const parsed = schema.parse(request);
      return Promise.resolve(handler(parsed, ctx));
    });
  }
  /**
  * Removes the request handler for the given method.
  */
  removeRequestHandler(method) {
    this._requestHandlers.delete(method);
  }
  /**
  * Asserts that a request handler has not already been set for the given method, in preparation for a new one being automatically installed.
  */
  assertCanSetRequestHandler(method) {
    if (this._requestHandlers.has(method)) throw new Error(`A request handler for ${method} already exists, which would be overridden`);
  }
  /**
  * Registers a handler to invoke when this protocol object receives a notification with the given method.
  *
  * Note that this will replace any previous notification handler for the same method.
  */
  setNotificationHandler(method, handler) {
    const schema = getNotificationSchema(method);
    this._notificationHandlers.set(method, (notification) => {
      const parsed = schema.parse(notification);
      return Promise.resolve(handler(parsed));
    });
  }
  /**
  * Removes the notification handler for the given method.
  */
  removeNotificationHandler(method) {
    this._notificationHandlers.delete(method);
  }
};
function isPlainObject2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function mergeCapabilities(base, additional) {
  const result = { ...base };
  for (const key in additional) {
    const k = key;
    const addValue = additional[k];
    if (addValue === void 0) continue;
    const baseValue = result[k];
    result[k] = isPlainObject2(baseValue) && isPlainObject2(addValue) ? {
      ...baseValue,
      ...addValue
    } : addValue;
  }
  return result;
}
function normalizeHeaders(headers) {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return { ...headers };
}
function createFetchWithInit(baseFetch = fetch, baseInit) {
  if (!baseInit) return baseFetch;
  return async (url2, init) => {
    return baseFetch(url2, {
      ...baseInit,
      ...init,
      headers: init?.headers ? {
        ...normalizeHeaders(baseInit.headers),
        ...normalizeHeaders(init.headers)
      } : baseInit.headers
    });
  };
}
var require_code$1 = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.regexpCode = exports2.getEsmExportName = exports2.getProperty = exports2.safeStringify = exports2.stringify = exports2.strConcat = exports2.addCodeArg = exports2.str = exports2._ = exports2.nil = exports2._Code = exports2.Name = exports2.IDENTIFIER = exports2._CodeOrName = void 0;
  var _CodeOrName = class {
  };
  exports2._CodeOrName = _CodeOrName;
  exports2.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  var Name = class extends _CodeOrName {
    constructor(s) {
      super();
      if (!exports2.IDENTIFIER.test(s)) throw new Error("CodeGen: name must be a valid identifier");
      this.str = s;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      return false;
    }
    get names() {
      return { [this.str]: 1 };
    }
  };
  exports2.Name = Name;
  var _Code = class extends _CodeOrName {
    constructor(code) {
      super();
      this._items = typeof code === "string" ? [code] : code;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      if (this._items.length > 1) return false;
      const item = this._items[0];
      return item === "" || item === '""';
    }
    get str() {
      var _a2;
      return (_a2 = this._str) !== null && _a2 !== void 0 ? _a2 : this._str = this._items.reduce((s, c) => `${s}${c}`, "");
    }
    get names() {
      var _a2;
      return (_a2 = this._names) !== null && _a2 !== void 0 ? _a2 : this._names = this._items.reduce((names, c) => {
        if (c instanceof Name) names[c.str] = (names[c.str] || 0) + 1;
        return names;
      }, {});
    }
  };
  exports2._Code = _Code;
  exports2.nil = new _Code("");
  function _(strs, ...args) {
    const code = [strs[0]];
    let i = 0;
    while (i < args.length) {
      addCodeArg(code, args[i]);
      code.push(strs[++i]);
    }
    return new _Code(code);
  }
  exports2._ = _;
  const plus = new _Code("+");
  function str(strs, ...args) {
    const expr = [safeStringify(strs[0])];
    let i = 0;
    while (i < args.length) {
      expr.push(plus);
      addCodeArg(expr, args[i]);
      expr.push(plus, safeStringify(strs[++i]));
    }
    optimize(expr);
    return new _Code(expr);
  }
  exports2.str = str;
  function addCodeArg(code, arg) {
    if (arg instanceof _Code) code.push(...arg._items);
    else if (arg instanceof Name) code.push(arg);
    else code.push(interpolate(arg));
  }
  exports2.addCodeArg = addCodeArg;
  function optimize(expr) {
    let i = 1;
    while (i < expr.length - 1) {
      if (expr[i] === plus) {
        const res = mergeExprItems(expr[i - 1], expr[i + 1]);
        if (res !== void 0) {
          expr.splice(i - 1, 3, res);
          continue;
        }
        expr[i++] = "+";
      }
      i++;
    }
  }
  function mergeExprItems(a, b) {
    if (b === '""') return a;
    if (a === '""') return b;
    if (typeof a == "string") {
      if (b instanceof Name || a[a.length - 1] !== '"') return;
      if (typeof b != "string") return `${a.slice(0, -1)}${b}"`;
      if (b[0] === '"') return a.slice(0, -1) + b.slice(1);
      return;
    }
    if (typeof b == "string" && b[0] === '"' && !(a instanceof Name)) return `"${a}${b.slice(1)}`;
  }
  function strConcat(c1, c2) {
    return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str`${c1}${c2}`;
  }
  exports2.strConcat = strConcat;
  function interpolate(x) {
    return typeof x == "number" || typeof x == "boolean" || x === null ? x : safeStringify(Array.isArray(x) ? x.join(",") : x);
  }
  function stringify(x) {
    return new _Code(safeStringify(x));
  }
  exports2.stringify = stringify;
  function safeStringify(x) {
    return JSON.stringify(x).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }
  exports2.safeStringify = safeStringify;
  function getProperty(key) {
    return typeof key == "string" && exports2.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _`[${key}]`;
  }
  exports2.getProperty = getProperty;
  function getEsmExportName(key) {
    if (typeof key == "string" && exports2.IDENTIFIER.test(key)) return new _Code(`${key}`);
    throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
  }
  exports2.getEsmExportName = getEsmExportName;
  function regexpCode(rx) {
    return new _Code(rx.toString());
  }
  exports2.regexpCode = regexpCode;
}));
var require_scope = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.ValueScope = exports2.ValueScopeName = exports2.Scope = exports2.varKinds = exports2.UsedValueState = void 0;
  const code_1 = require_code$1();
  var ValueError = class extends Error {
    constructor(name) {
      super(`CodeGen: "code" for ${name} not defined`);
      this.value = name.value;
    }
  };
  var UsedValueState;
  (function(UsedValueState2) {
    UsedValueState2[UsedValueState2["Started"] = 0] = "Started";
    UsedValueState2[UsedValueState2["Completed"] = 1] = "Completed";
  })(UsedValueState || (exports2.UsedValueState = UsedValueState = {}));
  exports2.varKinds = {
    const: new code_1.Name("const"),
    let: new code_1.Name("let"),
    var: new code_1.Name("var")
  };
  var Scope = class {
    constructor({ prefixes, parent } = {}) {
      this._names = {};
      this._prefixes = prefixes;
      this._parent = parent;
    }
    toName(nameOrPrefix) {
      return nameOrPrefix instanceof code_1.Name ? nameOrPrefix : this.name(nameOrPrefix);
    }
    name(prefix) {
      return new code_1.Name(this._newName(prefix));
    }
    _newName(prefix) {
      const ng = this._names[prefix] || this._nameGroup(prefix);
      return `${prefix}${ng.index++}`;
    }
    _nameGroup(prefix) {
      var _a2, _b;
      if (((_b = (_a2 = this._parent) === null || _a2 === void 0 ? void 0 : _a2._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || this._prefixes && !this._prefixes.has(prefix)) throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
      return this._names[prefix] = {
        prefix,
        index: 0
      };
    }
  };
  exports2.Scope = Scope;
  var ValueScopeName = class extends code_1.Name {
    constructor(prefix, nameStr) {
      super(nameStr);
      this.prefix = prefix;
    }
    setValue(value, { property, itemIndex }) {
      this.value = value;
      this.scopePath = (0, code_1._)`.${new code_1.Name(property)}[${itemIndex}]`;
    }
  };
  exports2.ValueScopeName = ValueScopeName;
  const line = (0, code_1._)`\n`;
  var ValueScope = class extends Scope {
    constructor(opts) {
      super(opts);
      this._values = {};
      this._scope = opts.scope;
      this.opts = {
        ...opts,
        _n: opts.lines ? line : code_1.nil
      };
    }
    get() {
      return this._scope;
    }
    name(prefix) {
      return new ValueScopeName(prefix, this._newName(prefix));
    }
    value(nameOrPrefix, value) {
      var _a2;
      if (value.ref === void 0) throw new Error("CodeGen: ref must be passed in value");
      const name = this.toName(nameOrPrefix);
      const { prefix } = name;
      const valueKey = (_a2 = value.key) !== null && _a2 !== void 0 ? _a2 : value.ref;
      let vs = this._values[prefix];
      if (vs) {
        const _name = vs.get(valueKey);
        if (_name) return _name;
      } else vs = this._values[prefix] = /* @__PURE__ */ new Map();
      vs.set(valueKey, name);
      const s = this._scope[prefix] || (this._scope[prefix] = []);
      const itemIndex = s.length;
      s[itemIndex] = value.ref;
      name.setValue(value, {
        property: prefix,
        itemIndex
      });
      return name;
    }
    getValue(prefix, keyOrRef) {
      const vs = this._values[prefix];
      if (!vs) return;
      return vs.get(keyOrRef);
    }
    scopeRefs(scopeName, values = this._values) {
      return this._reduceValues(values, (name) => {
        if (name.scopePath === void 0) throw new Error(`CodeGen: name "${name}" has no value`);
        return (0, code_1._)`${scopeName}${name.scopePath}`;
      });
    }
    scopeCode(values = this._values, usedValues, getCode) {
      return this._reduceValues(values, (name) => {
        if (name.value === void 0) throw new Error(`CodeGen: name "${name}" has no value`);
        return name.value.code;
      }, usedValues, getCode);
    }
    _reduceValues(values, valueCode, usedValues = {}, getCode) {
      let code = code_1.nil;
      for (const prefix in values) {
        const vs = values[prefix];
        if (!vs) continue;
        const nameSet = usedValues[prefix] = usedValues[prefix] || /* @__PURE__ */ new Map();
        vs.forEach((name) => {
          if (nameSet.has(name)) return;
          nameSet.set(name, UsedValueState.Started);
          let c = valueCode(name);
          if (c) {
            const def = this.opts.es5 ? exports2.varKinds.var : exports2.varKinds.const;
            code = (0, code_1._)`${code}${def} ${name} = ${c};${this.opts._n}`;
          } else if (c = getCode === null || getCode === void 0 ? void 0 : getCode(name)) code = (0, code_1._)`${code}${c}${this.opts._n}`;
          else throw new ValueError(name);
          nameSet.set(name, UsedValueState.Completed);
        });
      }
      return code;
    }
  };
  exports2.ValueScope = ValueScope;
}));
var require_codegen = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.or = exports2.and = exports2.not = exports2.CodeGen = exports2.operators = exports2.varKinds = exports2.ValueScopeName = exports2.ValueScope = exports2.Scope = exports2.Name = exports2.regexpCode = exports2.stringify = exports2.getProperty = exports2.nil = exports2.strConcat = exports2.str = exports2._ = void 0;
  const code_1 = require_code$1();
  const scope_1 = require_scope();
  var code_2 = require_code$1();
  Object.defineProperty(exports2, "_", {
    enumerable: true,
    get: function() {
      return code_2._;
    }
  });
  Object.defineProperty(exports2, "str", {
    enumerable: true,
    get: function() {
      return code_2.str;
    }
  });
  Object.defineProperty(exports2, "strConcat", {
    enumerable: true,
    get: function() {
      return code_2.strConcat;
    }
  });
  Object.defineProperty(exports2, "nil", {
    enumerable: true,
    get: function() {
      return code_2.nil;
    }
  });
  Object.defineProperty(exports2, "getProperty", {
    enumerable: true,
    get: function() {
      return code_2.getProperty;
    }
  });
  Object.defineProperty(exports2, "stringify", {
    enumerable: true,
    get: function() {
      return code_2.stringify;
    }
  });
  Object.defineProperty(exports2, "regexpCode", {
    enumerable: true,
    get: function() {
      return code_2.regexpCode;
    }
  });
  Object.defineProperty(exports2, "Name", {
    enumerable: true,
    get: function() {
      return code_2.Name;
    }
  });
  var scope_2 = require_scope();
  Object.defineProperty(exports2, "Scope", {
    enumerable: true,
    get: function() {
      return scope_2.Scope;
    }
  });
  Object.defineProperty(exports2, "ValueScope", {
    enumerable: true,
    get: function() {
      return scope_2.ValueScope;
    }
  });
  Object.defineProperty(exports2, "ValueScopeName", {
    enumerable: true,
    get: function() {
      return scope_2.ValueScopeName;
    }
  });
  Object.defineProperty(exports2, "varKinds", {
    enumerable: true,
    get: function() {
      return scope_2.varKinds;
    }
  });
  exports2.operators = {
    GT: new code_1._Code(">"),
    GTE: new code_1._Code(">="),
    LT: new code_1._Code("<"),
    LTE: new code_1._Code("<="),
    EQ: new code_1._Code("==="),
    NEQ: new code_1._Code("!=="),
    NOT: new code_1._Code("!"),
    OR: new code_1._Code("||"),
    AND: new code_1._Code("&&"),
    ADD: new code_1._Code("+")
  };
  var Node = class {
    optimizeNodes() {
      return this;
    }
    optimizeNames(_names, _constants) {
      return this;
    }
  };
  var Def = class extends Node {
    constructor(varKind, name, rhs) {
      super();
      this.varKind = varKind;
      this.name = name;
      this.rhs = rhs;
    }
    render({ es5, _n }) {
      const varKind = es5 ? scope_1.varKinds.var : this.varKind;
      const rhs = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
      return `${varKind} ${this.name}${rhs};` + _n;
    }
    optimizeNames(names, constants) {
      if (!names[this.name.str]) return;
      if (this.rhs) this.rhs = optimizeExpr(this.rhs, names, constants);
      return this;
    }
    get names() {
      return this.rhs instanceof code_1._CodeOrName ? this.rhs.names : {};
    }
  };
  var Assign = class extends Node {
    constructor(lhs, rhs, sideEffects) {
      super();
      this.lhs = lhs;
      this.rhs = rhs;
      this.sideEffects = sideEffects;
    }
    render({ _n }) {
      return `${this.lhs} = ${this.rhs};` + _n;
    }
    optimizeNames(names, constants) {
      if (this.lhs instanceof code_1.Name && !names[this.lhs.str] && !this.sideEffects) return;
      this.rhs = optimizeExpr(this.rhs, names, constants);
      return this;
    }
    get names() {
      return addExprNames(this.lhs instanceof code_1.Name ? {} : { ...this.lhs.names }, this.rhs);
    }
  };
  var AssignOp = class extends Assign {
    constructor(lhs, op, rhs, sideEffects) {
      super(lhs, rhs, sideEffects);
      this.op = op;
    }
    render({ _n }) {
      return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
    }
  };
  var Label = class extends Node {
    constructor(label) {
      super();
      this.label = label;
      this.names = {};
    }
    render({ _n }) {
      return `${this.label}:` + _n;
    }
  };
  var Break = class extends Node {
    constructor(label) {
      super();
      this.label = label;
      this.names = {};
    }
    render({ _n }) {
      return `break${this.label ? ` ${this.label}` : ""};` + _n;
    }
  };
  var Throw = class extends Node {
    constructor(error2) {
      super();
      this.error = error2;
    }
    render({ _n }) {
      return `throw ${this.error};` + _n;
    }
    get names() {
      return this.error.names;
    }
  };
  var AnyCode = class extends Node {
    constructor(code) {
      super();
      this.code = code;
    }
    render({ _n }) {
      return `${this.code};` + _n;
    }
    optimizeNodes() {
      return `${this.code}` ? this : void 0;
    }
    optimizeNames(names, constants) {
      this.code = optimizeExpr(this.code, names, constants);
      return this;
    }
    get names() {
      return this.code instanceof code_1._CodeOrName ? this.code.names : {};
    }
  };
  var ParentNode = class extends Node {
    constructor(nodes = []) {
      super();
      this.nodes = nodes;
    }
    render(opts) {
      return this.nodes.reduce((code, n) => code + n.render(opts), "");
    }
    optimizeNodes() {
      const { nodes } = this;
      let i = nodes.length;
      while (i--) {
        const n = nodes[i].optimizeNodes();
        if (Array.isArray(n)) nodes.splice(i, 1, ...n);
        else if (n) nodes[i] = n;
        else nodes.splice(i, 1);
      }
      return nodes.length > 0 ? this : void 0;
    }
    optimizeNames(names, constants) {
      const { nodes } = this;
      let i = nodes.length;
      while (i--) {
        const n = nodes[i];
        if (n.optimizeNames(names, constants)) continue;
        subtractNames(names, n.names);
        nodes.splice(i, 1);
      }
      return nodes.length > 0 ? this : void 0;
    }
    get names() {
      return this.nodes.reduce((names, n) => addNames(names, n.names), {});
    }
  };
  var BlockNode = class extends ParentNode {
    render(opts) {
      return "{" + opts._n + super.render(opts) + "}" + opts._n;
    }
  };
  var Root = class extends ParentNode {
  };
  var Else = class extends BlockNode {
  };
  Else.kind = "else";
  var If = class If2 extends BlockNode {
    constructor(condition, nodes) {
      super(nodes);
      this.condition = condition;
    }
    render(opts) {
      let code = `if(${this.condition})` + super.render(opts);
      if (this.else) code += "else " + this.else.render(opts);
      return code;
    }
    optimizeNodes() {
      super.optimizeNodes();
      const cond = this.condition;
      if (cond === true) return this.nodes;
      let e = this.else;
      if (e) {
        const ns = e.optimizeNodes();
        e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
      }
      if (e) {
        if (cond === false) return e instanceof If2 ? e : e.nodes;
        if (this.nodes.length) return this;
        return new If2(not(cond), e instanceof If2 ? [e] : e.nodes);
      }
      if (cond === false || !this.nodes.length) return void 0;
      return this;
    }
    optimizeNames(names, constants) {
      var _a2;
      this.else = (_a2 = this.else) === null || _a2 === void 0 ? void 0 : _a2.optimizeNames(names, constants);
      if (!(super.optimizeNames(names, constants) || this.else)) return;
      this.condition = optimizeExpr(this.condition, names, constants);
      return this;
    }
    get names() {
      const names = super.names;
      addExprNames(names, this.condition);
      if (this.else) addNames(names, this.else.names);
      return names;
    }
  };
  If.kind = "if";
  var For = class extends BlockNode {
  };
  For.kind = "for";
  var ForLoop = class extends For {
    constructor(iteration) {
      super();
      this.iteration = iteration;
    }
    render(opts) {
      return `for(${this.iteration})` + super.render(opts);
    }
    optimizeNames(names, constants) {
      if (!super.optimizeNames(names, constants)) return;
      this.iteration = optimizeExpr(this.iteration, names, constants);
      return this;
    }
    get names() {
      return addNames(super.names, this.iteration.names);
    }
  };
  var ForRange = class extends For {
    constructor(varKind, name, from, to) {
      super();
      this.varKind = varKind;
      this.name = name;
      this.from = from;
      this.to = to;
    }
    render(opts) {
      const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
      const { name, from, to } = this;
      return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
    }
    get names() {
      return addExprNames(addExprNames(super.names, this.from), this.to);
    }
  };
  var ForIter = class extends For {
    constructor(loop, varKind, name, iterable) {
      super();
      this.loop = loop;
      this.varKind = varKind;
      this.name = name;
      this.iterable = iterable;
    }
    render(opts) {
      return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
    }
    optimizeNames(names, constants) {
      if (!super.optimizeNames(names, constants)) return;
      this.iterable = optimizeExpr(this.iterable, names, constants);
      return this;
    }
    get names() {
      return addNames(super.names, this.iterable.names);
    }
  };
  var Func = class extends BlockNode {
    constructor(name, args, async) {
      super();
      this.name = name;
      this.args = args;
      this.async = async;
    }
    render(opts) {
      return `${this.async ? "async " : ""}function ${this.name}(${this.args})` + super.render(opts);
    }
  };
  Func.kind = "func";
  var Return = class extends ParentNode {
    render(opts) {
      return "return " + super.render(opts);
    }
  };
  Return.kind = "return";
  var Try = class extends BlockNode {
    render(opts) {
      let code = "try" + super.render(opts);
      if (this.catch) code += this.catch.render(opts);
      if (this.finally) code += this.finally.render(opts);
      return code;
    }
    optimizeNodes() {
      var _a2, _b;
      super.optimizeNodes();
      (_a2 = this.catch) === null || _a2 === void 0 || _a2.optimizeNodes();
      (_b = this.finally) === null || _b === void 0 || _b.optimizeNodes();
      return this;
    }
    optimizeNames(names, constants) {
      var _a2, _b;
      super.optimizeNames(names, constants);
      (_a2 = this.catch) === null || _a2 === void 0 || _a2.optimizeNames(names, constants);
      (_b = this.finally) === null || _b === void 0 || _b.optimizeNames(names, constants);
      return this;
    }
    get names() {
      const names = super.names;
      if (this.catch) addNames(names, this.catch.names);
      if (this.finally) addNames(names, this.finally.names);
      return names;
    }
  };
  var Catch = class extends BlockNode {
    constructor(error2) {
      super();
      this.error = error2;
    }
    render(opts) {
      return `catch(${this.error})` + super.render(opts);
    }
  };
  Catch.kind = "catch";
  var Finally = class extends BlockNode {
    render(opts) {
      return "finally" + super.render(opts);
    }
  };
  Finally.kind = "finally";
  var CodeGen = class {
    constructor(extScope, opts = {}) {
      this._values = {};
      this._blockStarts = [];
      this._constants = {};
      this.opts = {
        ...opts,
        _n: opts.lines ? "\n" : ""
      };
      this._extScope = extScope;
      this._scope = new scope_1.Scope({ parent: extScope });
      this._nodes = [new Root()];
    }
    toString() {
      return this._root.render(this.opts);
    }
    name(prefix) {
      return this._scope.name(prefix);
    }
    scopeName(prefix) {
      return this._extScope.name(prefix);
    }
    scopeValue(prefixOrName, value) {
      const name = this._extScope.value(prefixOrName, value);
      (this._values[name.prefix] || (this._values[name.prefix] = /* @__PURE__ */ new Set())).add(name);
      return name;
    }
    getScopeValue(prefix, keyOrRef) {
      return this._extScope.getValue(prefix, keyOrRef);
    }
    scopeRefs(scopeName) {
      return this._extScope.scopeRefs(scopeName, this._values);
    }
    scopeCode() {
      return this._extScope.scopeCode(this._values);
    }
    _def(varKind, nameOrPrefix, rhs, constant) {
      const name = this._scope.toName(nameOrPrefix);
      if (rhs !== void 0 && constant) this._constants[name.str] = rhs;
      this._leafNode(new Def(varKind, name, rhs));
      return name;
    }
    const(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
    }
    let(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
    }
    var(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
    }
    assign(lhs, rhs, sideEffects) {
      return this._leafNode(new Assign(lhs, rhs, sideEffects));
    }
    add(lhs, rhs) {
      return this._leafNode(new AssignOp(lhs, exports2.operators.ADD, rhs));
    }
    code(c) {
      if (typeof c == "function") c();
      else if (c !== code_1.nil) this._leafNode(new AnyCode(c));
      return this;
    }
    object(...keyValues) {
      const code = ["{"];
      for (const [key, value] of keyValues) {
        if (code.length > 1) code.push(",");
        code.push(key);
        if (key !== value || this.opts.es5) {
          code.push(":");
          (0, code_1.addCodeArg)(code, value);
        }
      }
      code.push("}");
      return new code_1._Code(code);
    }
    if(condition, thenBody, elseBody) {
      this._blockNode(new If(condition));
      if (thenBody && elseBody) this.code(thenBody).else().code(elseBody).endIf();
      else if (thenBody) this.code(thenBody).endIf();
      else if (elseBody) throw new Error('CodeGen: "else" body without "then" body');
      return this;
    }
    elseIf(condition) {
      return this._elseNode(new If(condition));
    }
    else() {
      return this._elseNode(new Else());
    }
    endIf() {
      return this._endBlockNode(If, Else);
    }
    _for(node, forBody) {
      this._blockNode(node);
      if (forBody) this.code(forBody).endFor();
      return this;
    }
    for(iteration, forBody) {
      return this._for(new ForLoop(iteration), forBody);
    }
    forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
      const name = this._scope.toName(nameOrPrefix);
      return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
    }
    forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
      const name = this._scope.toName(nameOrPrefix);
      if (this.opts.es5) {
        const arr = iterable instanceof code_1.Name ? iterable : this.var("_arr", iterable);
        return this.forRange("_i", 0, (0, code_1._)`${arr}.length`, (i) => {
          this.var(name, (0, code_1._)`${arr}[${i}]`);
          forBody(name);
        });
      }
      return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
    }
    forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
      if (this.opts.ownProperties) return this.forOf(nameOrPrefix, (0, code_1._)`Object.keys(${obj})`, forBody);
      const name = this._scope.toName(nameOrPrefix);
      return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
    }
    endFor() {
      return this._endBlockNode(For);
    }
    label(label) {
      return this._leafNode(new Label(label));
    }
    break(label) {
      return this._leafNode(new Break(label));
    }
    return(value) {
      const node = new Return();
      this._blockNode(node);
      this.code(value);
      if (node.nodes.length !== 1) throw new Error('CodeGen: "return" should have one node');
      return this._endBlockNode(Return);
    }
    try(tryBody, catchCode, finallyCode) {
      if (!catchCode && !finallyCode) throw new Error('CodeGen: "try" without "catch" and "finally"');
      const node = new Try();
      this._blockNode(node);
      this.code(tryBody);
      if (catchCode) {
        const error2 = this.name("e");
        this._currNode = node.catch = new Catch(error2);
        catchCode(error2);
      }
      if (finallyCode) {
        this._currNode = node.finally = new Finally();
        this.code(finallyCode);
      }
      return this._endBlockNode(Catch, Finally);
    }
    throw(error2) {
      return this._leafNode(new Throw(error2));
    }
    block(body, nodeCount) {
      this._blockStarts.push(this._nodes.length);
      if (body) this.code(body).endBlock(nodeCount);
      return this;
    }
    endBlock(nodeCount) {
      const len = this._blockStarts.pop();
      if (len === void 0) throw new Error("CodeGen: not in self-balancing block");
      const toClose = this._nodes.length - len;
      if (toClose < 0 || nodeCount !== void 0 && toClose !== nodeCount) throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
      this._nodes.length = len;
      return this;
    }
    func(name, args = code_1.nil, async, funcBody) {
      this._blockNode(new Func(name, args, async));
      if (funcBody) this.code(funcBody).endFunc();
      return this;
    }
    endFunc() {
      return this._endBlockNode(Func);
    }
    optimize(n = 1) {
      while (n-- > 0) {
        this._root.optimizeNodes();
        this._root.optimizeNames(this._root.names, this._constants);
      }
    }
    _leafNode(node) {
      this._currNode.nodes.push(node);
      return this;
    }
    _blockNode(node) {
      this._currNode.nodes.push(node);
      this._nodes.push(node);
    }
    _endBlockNode(N1, N2) {
      const n = this._currNode;
      if (n instanceof N1 || N2 && n instanceof N2) {
        this._nodes.pop();
        return this;
      }
      throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
    }
    _elseNode(node) {
      const n = this._currNode;
      if (!(n instanceof If)) throw new Error('CodeGen: "else" without "if"');
      this._currNode = n.else = node;
      return this;
    }
    get _root() {
      return this._nodes[0];
    }
    get _currNode() {
      const ns = this._nodes;
      return ns[ns.length - 1];
    }
    set _currNode(node) {
      const ns = this._nodes;
      ns[ns.length - 1] = node;
    }
  };
  exports2.CodeGen = CodeGen;
  function addNames(names, from) {
    for (const n in from) names[n] = (names[n] || 0) + (from[n] || 0);
    return names;
  }
  function addExprNames(names, from) {
    return from instanceof code_1._CodeOrName ? addNames(names, from.names) : names;
  }
  function optimizeExpr(expr, names, constants) {
    if (expr instanceof code_1.Name) return replaceName(expr);
    if (!canOptimize(expr)) return expr;
    return new code_1._Code(expr._items.reduce((items, c) => {
      if (c instanceof code_1.Name) c = replaceName(c);
      if (c instanceof code_1._Code) items.push(...c._items);
      else items.push(c);
      return items;
    }, []));
    function replaceName(n) {
      const c = constants[n.str];
      if (c === void 0 || names[n.str] !== 1) return n;
      delete names[n.str];
      return c;
    }
    function canOptimize(e) {
      return e instanceof code_1._Code && e._items.some((c) => c instanceof code_1.Name && names[c.str] === 1 && constants[c.str] !== void 0);
    }
  }
  function subtractNames(names, from) {
    for (const n in from) names[n] = (names[n] || 0) - (from[n] || 0);
  }
  function not(x) {
    return typeof x == "boolean" || typeof x == "number" || x === null ? !x : (0, code_1._)`!${par(x)}`;
  }
  exports2.not = not;
  const andCode = mappend(exports2.operators.AND);
  function and(...args) {
    return args.reduce(andCode);
  }
  exports2.and = and;
  const orCode = mappend(exports2.operators.OR);
  function or(...args) {
    return args.reduce(orCode);
  }
  exports2.or = or;
  function mappend(op) {
    return (x, y) => x === code_1.nil ? y : y === code_1.nil ? x : (0, code_1._)`${par(x)} ${op} ${par(y)}`;
  }
  function par(x) {
    return x instanceof code_1.Name ? x : (0, code_1._)`(${x})`;
  }
}));
var require_util = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.checkStrictMode = exports2.getErrorPath = exports2.Type = exports2.useFunc = exports2.setEvaluated = exports2.evaluatedPropsToName = exports2.mergeEvaluated = exports2.eachItem = exports2.unescapeJsonPointer = exports2.escapeJsonPointer = exports2.escapeFragment = exports2.unescapeFragment = exports2.schemaRefOrVal = exports2.schemaHasRulesButRef = exports2.schemaHasRules = exports2.checkUnknownRules = exports2.alwaysValidSchema = exports2.toHash = void 0;
  const codegen_1 = require_codegen();
  const code_1 = require_code$1();
  function toHash(arr) {
    const hash2 = {};
    for (const item of arr) hash2[item] = true;
    return hash2;
  }
  exports2.toHash = toHash;
  function alwaysValidSchema(it, schema) {
    if (typeof schema == "boolean") return schema;
    if (Object.keys(schema).length === 0) return true;
    checkUnknownRules(it, schema);
    return !schemaHasRules(schema, it.self.RULES.all);
  }
  exports2.alwaysValidSchema = alwaysValidSchema;
  function checkUnknownRules(it, schema = it.schema) {
    const { opts, self } = it;
    if (!opts.strictSchema) return;
    if (typeof schema === "boolean") return;
    const rules = self.RULES.keywords;
    for (const key in schema) if (!rules[key]) checkStrictMode(it, `unknown keyword: "${key}"`);
  }
  exports2.checkUnknownRules = checkUnknownRules;
  function schemaHasRules(schema, rules) {
    if (typeof schema == "boolean") return !schema;
    for (const key in schema) if (rules[key]) return true;
    return false;
  }
  exports2.schemaHasRules = schemaHasRules;
  function schemaHasRulesButRef(schema, RULES) {
    if (typeof schema == "boolean") return !schema;
    for (const key in schema) if (key !== "$ref" && RULES.all[key]) return true;
    return false;
  }
  exports2.schemaHasRulesButRef = schemaHasRulesButRef;
  function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword, $data) {
    if (!$data) {
      if (typeof schema == "number" || typeof schema == "boolean") return schema;
      if (typeof schema == "string") return (0, codegen_1._)`${schema}`;
    }
    return (0, codegen_1._)`${topSchemaRef}${schemaPath}${(0, codegen_1.getProperty)(keyword)}`;
  }
  exports2.schemaRefOrVal = schemaRefOrVal;
  function unescapeFragment(str) {
    return unescapeJsonPointer(decodeURIComponent(str));
  }
  exports2.unescapeFragment = unescapeFragment;
  function escapeFragment(str) {
    return encodeURIComponent(escapeJsonPointer(str));
  }
  exports2.escapeFragment = escapeFragment;
  function escapeJsonPointer(str) {
    if (typeof str == "number") return `${str}`;
    return str.replace(/~/g, "~0").replace(/\//g, "~1");
  }
  exports2.escapeJsonPointer = escapeJsonPointer;
  function unescapeJsonPointer(str) {
    return str.replace(/~1/g, "/").replace(/~0/g, "~");
  }
  exports2.unescapeJsonPointer = unescapeJsonPointer;
  function eachItem(xs, f) {
    if (Array.isArray(xs)) for (const x of xs) f(x);
    else f(xs);
  }
  exports2.eachItem = eachItem;
  function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues: mergeValues2, resultToName }) {
    return (gen, from, to, toName) => {
      const res = to === void 0 ? from : to instanceof codegen_1.Name ? (from instanceof codegen_1.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to) : from instanceof codegen_1.Name ? (mergeToName(gen, to, from), from) : mergeValues2(from, to);
      return toName === codegen_1.Name && !(res instanceof codegen_1.Name) ? resultToName(gen, res) : res;
    };
  }
  exports2.mergeEvaluated = {
    props: makeMergeEvaluated({
      mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => {
        gen.if((0, codegen_1._)`${from} === true`, () => gen.assign(to, true), () => gen.assign(to, (0, codegen_1._)`${to} || {}`).code((0, codegen_1._)`Object.assign(${to}, ${from})`));
      }),
      mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => {
        if (from === true) gen.assign(to, true);
        else {
          gen.assign(to, (0, codegen_1._)`${to} || {}`);
          setEvaluated(gen, to, from);
        }
      }),
      mergeValues: (from, to) => from === true ? true : {
        ...from,
        ...to
      },
      resultToName: evaluatedPropsToName
    }),
    items: makeMergeEvaluated({
      mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => gen.assign(to, (0, codegen_1._)`${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)),
      mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => gen.assign(to, from === true ? true : (0, codegen_1._)`${to} > ${from} ? ${to} : ${from}`)),
      mergeValues: (from, to) => from === true ? true : Math.max(from, to),
      resultToName: (gen, items) => gen.var("items", items)
    })
  };
  function evaluatedPropsToName(gen, ps) {
    if (ps === true) return gen.var("props", true);
    const props = gen.var("props", (0, codegen_1._)`{}`);
    if (ps !== void 0) setEvaluated(gen, props, ps);
    return props;
  }
  exports2.evaluatedPropsToName = evaluatedPropsToName;
  function setEvaluated(gen, props, ps) {
    Object.keys(ps).forEach((p) => gen.assign((0, codegen_1._)`${props}${(0, codegen_1.getProperty)(p)}`, true));
  }
  exports2.setEvaluated = setEvaluated;
  const snippets = {};
  function useFunc(gen, f) {
    return gen.scopeValue("func", {
      ref: f,
      code: snippets[f.code] || (snippets[f.code] = new code_1._Code(f.code))
    });
  }
  exports2.useFunc = useFunc;
  var Type;
  (function(Type2) {
    Type2[Type2["Num"] = 0] = "Num";
    Type2[Type2["Str"] = 1] = "Str";
  })(Type || (exports2.Type = Type = {}));
  function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
    if (dataProp instanceof codegen_1.Name) {
      const isNumber = dataPropType === Type.Num;
      return jsPropertySyntax ? isNumber ? (0, codegen_1._)`"[" + ${dataProp} + "]"` : (0, codegen_1._)`"['" + ${dataProp} + "']"` : isNumber ? (0, codegen_1._)`"/" + ${dataProp}` : (0, codegen_1._)`"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
    }
    return jsPropertySyntax ? (0, codegen_1.getProperty)(dataProp).toString() : "/" + escapeJsonPointer(dataProp);
  }
  exports2.getErrorPath = getErrorPath;
  function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
    if (!mode) return;
    msg = `strict mode: ${msg}`;
    if (mode === true) throw new Error(msg);
    it.self.logger.warn(msg);
  }
  exports2.checkStrictMode = checkStrictMode;
}));
var require_names = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const codegen_1 = require_codegen();
  const names = {
    data: new codegen_1.Name("data"),
    valCxt: new codegen_1.Name("valCxt"),
    instancePath: new codegen_1.Name("instancePath"),
    parentData: new codegen_1.Name("parentData"),
    parentDataProperty: new codegen_1.Name("parentDataProperty"),
    rootData: new codegen_1.Name("rootData"),
    dynamicAnchors: new codegen_1.Name("dynamicAnchors"),
    vErrors: new codegen_1.Name("vErrors"),
    errors: new codegen_1.Name("errors"),
    this: new codegen_1.Name("this"),
    self: new codegen_1.Name("self"),
    scope: new codegen_1.Name("scope"),
    json: new codegen_1.Name("json"),
    jsonPos: new codegen_1.Name("jsonPos"),
    jsonLen: new codegen_1.Name("jsonLen"),
    jsonPart: new codegen_1.Name("jsonPart")
  };
  exports2.default = names;
}));
var require_errors = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.extendErrors = exports2.resetErrorsCount = exports2.reportExtraError = exports2.reportError = exports2.keyword$DataError = exports2.keywordError = void 0;
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  const names_1 = require_names();
  exports2.keywordError = { message: ({ keyword }) => (0, codegen_1.str)`must pass "${keyword}" keyword validation` };
  exports2.keyword$DataError = { message: ({ keyword, schemaType }) => schemaType ? (0, codegen_1.str)`"${keyword}" keyword must be ${schemaType} ($data)` : (0, codegen_1.str)`"${keyword}" keyword is invalid ($data)` };
  function reportError(cxt, error2 = exports2.keywordError, errorPaths, overrideAllErrors) {
    const { it } = cxt;
    const { gen, compositeRule, allErrors } = it;
    const errObj = errorObjectCode(cxt, error2, errorPaths);
    if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : compositeRule || allErrors) addError(gen, errObj);
    else returnErrors(it, (0, codegen_1._)`[${errObj}]`);
  }
  exports2.reportError = reportError;
  function reportExtraError(cxt, error2 = exports2.keywordError, errorPaths) {
    const { it } = cxt;
    const { gen, compositeRule, allErrors } = it;
    addError(gen, errorObjectCode(cxt, error2, errorPaths));
    if (!(compositeRule || allErrors)) returnErrors(it, names_1.default.vErrors);
  }
  exports2.reportExtraError = reportExtraError;
  function resetErrorsCount(gen, errsCount) {
    gen.assign(names_1.default.errors, errsCount);
    gen.if((0, codegen_1._)`${names_1.default.vErrors} !== null`, () => gen.if(errsCount, () => gen.assign((0, codegen_1._)`${names_1.default.vErrors}.length`, errsCount), () => gen.assign(names_1.default.vErrors, null)));
  }
  exports2.resetErrorsCount = resetErrorsCount;
  function extendErrors({ gen, keyword, schemaValue, data, errsCount, it }) {
    if (errsCount === void 0) throw new Error("ajv implementation error");
    const err = gen.name("err");
    gen.forRange("i", errsCount, names_1.default.errors, (i) => {
      gen.const(err, (0, codegen_1._)`${names_1.default.vErrors}[${i}]`);
      gen.if((0, codegen_1._)`${err}.instancePath === undefined`, () => gen.assign((0, codegen_1._)`${err}.instancePath`, (0, codegen_1.strConcat)(names_1.default.instancePath, it.errorPath)));
      gen.assign((0, codegen_1._)`${err}.schemaPath`, (0, codegen_1.str)`${it.errSchemaPath}/${keyword}`);
      if (it.opts.verbose) {
        gen.assign((0, codegen_1._)`${err}.schema`, schemaValue);
        gen.assign((0, codegen_1._)`${err}.data`, data);
      }
    });
  }
  exports2.extendErrors = extendErrors;
  function addError(gen, errObj) {
    const err = gen.const("err", errObj);
    gen.if((0, codegen_1._)`${names_1.default.vErrors} === null`, () => gen.assign(names_1.default.vErrors, (0, codegen_1._)`[${err}]`), (0, codegen_1._)`${names_1.default.vErrors}.push(${err})`);
    gen.code((0, codegen_1._)`${names_1.default.errors}++`);
  }
  function returnErrors(it, errs) {
    const { gen, validateName, schemaEnv } = it;
    if (schemaEnv.$async) gen.throw((0, codegen_1._)`new ${it.ValidationError}(${errs})`);
    else {
      gen.assign((0, codegen_1._)`${validateName}.errors`, errs);
      gen.return(false);
    }
  }
  const E = {
    keyword: new codegen_1.Name("keyword"),
    schemaPath: new codegen_1.Name("schemaPath"),
    params: new codegen_1.Name("params"),
    propertyName: new codegen_1.Name("propertyName"),
    message: new codegen_1.Name("message"),
    schema: new codegen_1.Name("schema"),
    parentSchema: new codegen_1.Name("parentSchema")
  };
  function errorObjectCode(cxt, error2, errorPaths) {
    const { createErrors } = cxt.it;
    if (createErrors === false) return (0, codegen_1._)`{}`;
    return errorObject(cxt, error2, errorPaths);
  }
  function errorObject(cxt, error2, errorPaths = {}) {
    const { gen, it } = cxt;
    const keyValues = [errorInstancePath(it, errorPaths), errorSchemaPath(cxt, errorPaths)];
    extraErrorProps(cxt, error2, keyValues);
    return gen.object(...keyValues);
  }
  function errorInstancePath({ errorPath }, { instancePath }) {
    const instPath = instancePath ? (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(instancePath, util_1.Type.Str)}` : errorPath;
    return [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, instPath)];
  }
  function errorSchemaPath({ keyword, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
    let schPath = parentSchema ? errSchemaPath : (0, codegen_1.str)`${errSchemaPath}/${keyword}`;
    if (schemaPath) schPath = (0, codegen_1.str)`${schPath}${(0, util_1.getErrorPath)(schemaPath, util_1.Type.Str)}`;
    return [E.schemaPath, schPath];
  }
  function extraErrorProps(cxt, { params, message }, keyValues) {
    const { keyword, data, schemaValue, it } = cxt;
    const { opts, propertyName, topSchemaRef, schemaPath } = it;
    keyValues.push([E.keyword, keyword], [E.params, typeof params == "function" ? params(cxt) : params || (0, codegen_1._)`{}`]);
    if (opts.messages) keyValues.push([E.message, typeof message == "function" ? message(cxt) : message]);
    if (opts.verbose) keyValues.push([E.schema, schemaValue], [E.parentSchema, (0, codegen_1._)`${topSchemaRef}${schemaPath}`], [names_1.default.data, data]);
    if (propertyName) keyValues.push([E.propertyName, propertyName]);
  }
}));
var require_boolSchema = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.boolOrEmptySchema = exports2.topBoolOrEmptySchema = void 0;
  const errors_1 = require_errors();
  const codegen_1 = require_codegen();
  const names_1 = require_names();
  const boolError = { message: "boolean schema is false" };
  function topBoolOrEmptySchema(it) {
    const { gen, schema, validateName } = it;
    if (schema === false) falseSchemaError(it, false);
    else if (typeof schema == "object" && schema.$async === true) gen.return(names_1.default.data);
    else {
      gen.assign((0, codegen_1._)`${validateName}.errors`, null);
      gen.return(true);
    }
  }
  exports2.topBoolOrEmptySchema = topBoolOrEmptySchema;
  function boolOrEmptySchema(it, valid) {
    const { gen, schema } = it;
    if (schema === false) {
      gen.var(valid, false);
      falseSchemaError(it);
    } else gen.var(valid, true);
  }
  exports2.boolOrEmptySchema = boolOrEmptySchema;
  function falseSchemaError(it, overrideAllErrors) {
    const { gen, data } = it;
    const cxt = {
      gen,
      keyword: "false schema",
      data,
      schema: false,
      schemaCode: false,
      schemaValue: false,
      params: {},
      it
    };
    (0, errors_1.reportError)(cxt, boolError, void 0, overrideAllErrors);
  }
}));
var require_rules = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.getRules = exports2.isJSONType = void 0;
  const jsonTypes = /* @__PURE__ */ new Set([
    "string",
    "number",
    "integer",
    "boolean",
    "null",
    "object",
    "array"
  ]);
  function isJSONType(x) {
    return typeof x == "string" && jsonTypes.has(x);
  }
  exports2.isJSONType = isJSONType;
  function getRules() {
    const groups = {
      number: {
        type: "number",
        rules: []
      },
      string: {
        type: "string",
        rules: []
      },
      array: {
        type: "array",
        rules: []
      },
      object: {
        type: "object",
        rules: []
      }
    };
    return {
      types: {
        ...groups,
        integer: true,
        boolean: true,
        null: true
      },
      rules: [
        { rules: [] },
        groups.number,
        groups.string,
        groups.array,
        groups.object
      ],
      post: { rules: [] },
      all: {},
      keywords: {}
    };
  }
  exports2.getRules = getRules;
}));
var require_applicability = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.shouldUseRule = exports2.shouldUseGroup = exports2.schemaHasRulesForType = void 0;
  function schemaHasRulesForType({ schema, self }, type) {
    const group = self.RULES.types[type];
    return group && group !== true && shouldUseGroup(schema, group);
  }
  exports2.schemaHasRulesForType = schemaHasRulesForType;
  function shouldUseGroup(schema, group) {
    return group.rules.some((rule) => shouldUseRule(schema, rule));
  }
  exports2.shouldUseGroup = shouldUseGroup;
  function shouldUseRule(schema, rule) {
    var _a2;
    return schema[rule.keyword] !== void 0 || ((_a2 = rule.definition.implements) === null || _a2 === void 0 ? void 0 : _a2.some((kwd) => schema[kwd] !== void 0));
  }
  exports2.shouldUseRule = shouldUseRule;
}));
var require_dataType = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.reportTypeError = exports2.checkDataTypes = exports2.checkDataType = exports2.coerceAndCheckDataType = exports2.getJSONTypes = exports2.getSchemaTypes = exports2.DataType = void 0;
  const rules_1 = require_rules();
  const applicability_1 = require_applicability();
  const errors_1 = require_errors();
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  var DataType;
  (function(DataType2) {
    DataType2[DataType2["Correct"] = 0] = "Correct";
    DataType2[DataType2["Wrong"] = 1] = "Wrong";
  })(DataType || (exports2.DataType = DataType = {}));
  function getSchemaTypes(schema) {
    const types = getJSONTypes(schema.type);
    if (types.includes("null")) {
      if (schema.nullable === false) throw new Error("type: null contradicts nullable: false");
    } else {
      if (!types.length && schema.nullable !== void 0) throw new Error('"nullable" cannot be used without "type"');
      if (schema.nullable === true) types.push("null");
    }
    return types;
  }
  exports2.getSchemaTypes = getSchemaTypes;
  function getJSONTypes(ts) {
    const types = Array.isArray(ts) ? ts : ts ? [ts] : [];
    if (types.every(rules_1.isJSONType)) return types;
    throw new Error("type must be JSONType or JSONType[]: " + types.join(","));
  }
  exports2.getJSONTypes = getJSONTypes;
  function coerceAndCheckDataType(it, types) {
    const { gen, data, opts } = it;
    const coerceTo = coerceToTypes(types, opts.coerceTypes);
    const checkTypes = types.length > 0 && !(coerceTo.length === 0 && types.length === 1 && (0, applicability_1.schemaHasRulesForType)(it, types[0]));
    if (checkTypes) {
      const wrongType = checkDataTypes(types, data, opts.strictNumbers, DataType.Wrong);
      gen.if(wrongType, () => {
        if (coerceTo.length) coerceData(it, types, coerceTo);
        else reportTypeError(it);
      });
    }
    return checkTypes;
  }
  exports2.coerceAndCheckDataType = coerceAndCheckDataType;
  const COERCIBLE = /* @__PURE__ */ new Set([
    "string",
    "number",
    "integer",
    "boolean",
    "null"
  ]);
  function coerceToTypes(types, coerceTypes) {
    return coerceTypes ? types.filter((t) => COERCIBLE.has(t) || coerceTypes === "array" && t === "array") : [];
  }
  function coerceData(it, types, coerceTo) {
    const { gen, data, opts } = it;
    const dataType = gen.let("dataType", (0, codegen_1._)`typeof ${data}`);
    const coerced = gen.let("coerced", (0, codegen_1._)`undefined`);
    if (opts.coerceTypes === "array") gen.if((0, codegen_1._)`${dataType} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () => gen.assign(data, (0, codegen_1._)`${data}[0]`).assign(dataType, (0, codegen_1._)`typeof ${data}`).if(checkDataTypes(types, data, opts.strictNumbers), () => gen.assign(coerced, data)));
    gen.if((0, codegen_1._)`${coerced} !== undefined`);
    for (const t of coerceTo) if (COERCIBLE.has(t) || t === "array" && opts.coerceTypes === "array") coerceSpecificType(t);
    gen.else();
    reportTypeError(it);
    gen.endIf();
    gen.if((0, codegen_1._)`${coerced} !== undefined`, () => {
      gen.assign(data, coerced);
      assignParentData(it, coerced);
    });
    function coerceSpecificType(t) {
      switch (t) {
        case "string":
          gen.elseIf((0, codegen_1._)`${dataType} == "number" || ${dataType} == "boolean"`).assign(coerced, (0, codegen_1._)`"" + ${data}`).elseIf((0, codegen_1._)`${data} === null`).assign(coerced, (0, codegen_1._)`""`);
          return;
        case "number":
          gen.elseIf((0, codegen_1._)`${dataType} == "boolean" || ${data} === null
              || (${dataType} == "string" && ${data} && ${data} == +${data})`).assign(coerced, (0, codegen_1._)`+${data}`);
          return;
        case "integer":
          gen.elseIf((0, codegen_1._)`${dataType} === "boolean" || ${data} === null
              || (${dataType} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`).assign(coerced, (0, codegen_1._)`+${data}`);
          return;
        case "boolean":
          gen.elseIf((0, codegen_1._)`${data} === "false" || ${data} === 0 || ${data} === null`).assign(coerced, false).elseIf((0, codegen_1._)`${data} === "true" || ${data} === 1`).assign(coerced, true);
          return;
        case "null":
          gen.elseIf((0, codegen_1._)`${data} === "" || ${data} === 0 || ${data} === false`);
          gen.assign(coerced, null);
          return;
        case "array":
          gen.elseIf((0, codegen_1._)`${dataType} === "string" || ${dataType} === "number"
              || ${dataType} === "boolean" || ${data} === null`).assign(coerced, (0, codegen_1._)`[${data}]`);
      }
    }
  }
  function assignParentData({ gen, parentData, parentDataProperty }, expr) {
    gen.if((0, codegen_1._)`${parentData} !== undefined`, () => gen.assign((0, codegen_1._)`${parentData}[${parentDataProperty}]`, expr));
  }
  function checkDataType(dataType, data, strictNums, correct = DataType.Correct) {
    const EQ = correct === DataType.Correct ? codegen_1.operators.EQ : codegen_1.operators.NEQ;
    let cond;
    switch (dataType) {
      case "null":
        return (0, codegen_1._)`${data} ${EQ} null`;
      case "array":
        cond = (0, codegen_1._)`Array.isArray(${data})`;
        break;
      case "object":
        cond = (0, codegen_1._)`${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
        break;
      case "integer":
        cond = numCond((0, codegen_1._)`!(${data} % 1) && !isNaN(${data})`);
        break;
      case "number":
        cond = numCond();
        break;
      default:
        return (0, codegen_1._)`typeof ${data} ${EQ} ${dataType}`;
    }
    return correct === DataType.Correct ? cond : (0, codegen_1.not)(cond);
    function numCond(_cond = codegen_1.nil) {
      return (0, codegen_1.and)((0, codegen_1._)`typeof ${data} == "number"`, _cond, strictNums ? (0, codegen_1._)`isFinite(${data})` : codegen_1.nil);
    }
  }
  exports2.checkDataType = checkDataType;
  function checkDataTypes(dataTypes, data, strictNums, correct) {
    if (dataTypes.length === 1) return checkDataType(dataTypes[0], data, strictNums, correct);
    let cond;
    const types = (0, util_1.toHash)(dataTypes);
    if (types.array && types.object) {
      const notObj = (0, codegen_1._)`typeof ${data} != "object"`;
      cond = types.null ? notObj : (0, codegen_1._)`!${data} || ${notObj}`;
      delete types.null;
      delete types.array;
      delete types.object;
    } else cond = codegen_1.nil;
    if (types.number) delete types.integer;
    for (const t in types) cond = (0, codegen_1.and)(cond, checkDataType(t, data, strictNums, correct));
    return cond;
  }
  exports2.checkDataTypes = checkDataTypes;
  const typeError = {
    message: ({ schema }) => `must be ${schema}`,
    params: ({ schema, schemaValue }) => typeof schema == "string" ? (0, codegen_1._)`{type: ${schema}}` : (0, codegen_1._)`{type: ${schemaValue}}`
  };
  function reportTypeError(it) {
    const cxt = getTypeErrorContext(it);
    (0, errors_1.reportError)(cxt, typeError);
  }
  exports2.reportTypeError = reportTypeError;
  function getTypeErrorContext(it) {
    const { gen, data, schema } = it;
    const schemaCode = (0, util_1.schemaRefOrVal)(it, schema, "type");
    return {
      gen,
      keyword: "type",
      data,
      schema: schema.type,
      schemaCode,
      schemaValue: schemaCode,
      parentSchema: schema,
      params: {},
      it
    };
  }
}));
var require_defaults = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.assignDefaults = void 0;
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  function assignDefaults(it, ty) {
    const { properties, items } = it.schema;
    if (ty === "object" && properties) for (const key in properties) assignDefault(it, key, properties[key].default);
    else if (ty === "array" && Array.isArray(items)) items.forEach((sch, i) => assignDefault(it, i, sch.default));
  }
  exports2.assignDefaults = assignDefaults;
  function assignDefault(it, prop, defaultValue) {
    const { gen, compositeRule, data, opts } = it;
    if (defaultValue === void 0) return;
    const childData = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(prop)}`;
    if (compositeRule) {
      (0, util_1.checkStrictMode)(it, `default is ignored for: ${childData}`);
      return;
    }
    let condition = (0, codegen_1._)`${childData} === undefined`;
    if (opts.useDefaults === "empty") condition = (0, codegen_1._)`${condition} || ${childData} === null || ${childData} === ""`;
    gen.if(condition, (0, codegen_1._)`${childData} = ${(0, codegen_1.stringify)(defaultValue)}`);
  }
}));
var require_code = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.validateUnion = exports2.validateArray = exports2.usePattern = exports2.callValidateCode = exports2.schemaProperties = exports2.allSchemaProperties = exports2.noPropertyInData = exports2.propertyInData = exports2.isOwnProperty = exports2.hasPropFunc = exports2.reportMissingProp = exports2.checkMissingProp = exports2.checkReportMissingProp = void 0;
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  const names_1 = require_names();
  const util_2 = require_util();
  function checkReportMissingProp(cxt, prop) {
    const { gen, data, it } = cxt;
    gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
      cxt.setParams({ missingProperty: (0, codegen_1._)`${prop}` }, true);
      cxt.error();
    });
  }
  exports2.checkReportMissingProp = checkReportMissingProp;
  function checkMissingProp({ gen, data, it: { opts } }, properties, missing) {
    return (0, codegen_1.or)(...properties.map((prop) => (0, codegen_1.and)(noPropertyInData(gen, data, prop, opts.ownProperties), (0, codegen_1._)`${missing} = ${prop}`)));
  }
  exports2.checkMissingProp = checkMissingProp;
  function reportMissingProp(cxt, missing) {
    cxt.setParams({ missingProperty: missing }, true);
    cxt.error();
  }
  exports2.reportMissingProp = reportMissingProp;
  function hasPropFunc(gen) {
    return gen.scopeValue("func", {
      ref: Object.prototype.hasOwnProperty,
      code: (0, codegen_1._)`Object.prototype.hasOwnProperty`
    });
  }
  exports2.hasPropFunc = hasPropFunc;
  function isOwnProperty(gen, data, property) {
    return (0, codegen_1._)`${hasPropFunc(gen)}.call(${data}, ${property})`;
  }
  exports2.isOwnProperty = isOwnProperty;
  function propertyInData(gen, data, property, ownProperties) {
    const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} !== undefined`;
    return ownProperties ? (0, codegen_1._)`${cond} && ${isOwnProperty(gen, data, property)}` : cond;
  }
  exports2.propertyInData = propertyInData;
  function noPropertyInData(gen, data, property, ownProperties) {
    const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} === undefined`;
    return ownProperties ? (0, codegen_1.or)(cond, (0, codegen_1.not)(isOwnProperty(gen, data, property))) : cond;
  }
  exports2.noPropertyInData = noPropertyInData;
  function allSchemaProperties(schemaMap) {
    return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
  }
  exports2.allSchemaProperties = allSchemaProperties;
  function schemaProperties(it, schemaMap) {
    return allSchemaProperties(schemaMap).filter((p) => !(0, util_1.alwaysValidSchema)(it, schemaMap[p]));
  }
  exports2.schemaProperties = schemaProperties;
  function callValidateCode({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context, passSchema) {
    const dataAndSchema = passSchema ? (0, codegen_1._)`${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
    const valCxt = [
      [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, errorPath)],
      [names_1.default.parentData, it.parentData],
      [names_1.default.parentDataProperty, it.parentDataProperty],
      [names_1.default.rootData, names_1.default.rootData]
    ];
    if (it.opts.dynamicRef) valCxt.push([names_1.default.dynamicAnchors, names_1.default.dynamicAnchors]);
    const args = (0, codegen_1._)`${dataAndSchema}, ${gen.object(...valCxt)}`;
    return context !== codegen_1.nil ? (0, codegen_1._)`${func}.call(${context}, ${args})` : (0, codegen_1._)`${func}(${args})`;
  }
  exports2.callValidateCode = callValidateCode;
  const newRegExp = (0, codegen_1._)`new RegExp`;
  function usePattern({ gen, it: { opts } }, pattern) {
    const u = opts.unicodeRegExp ? "u" : "";
    const { regExp } = opts.code;
    const rx = regExp(pattern, u);
    return gen.scopeValue("pattern", {
      key: rx.toString(),
      ref: rx,
      code: (0, codegen_1._)`${regExp.code === "new RegExp" ? newRegExp : (0, util_2.useFunc)(gen, regExp)}(${pattern}, ${u})`
    });
  }
  exports2.usePattern = usePattern;
  function validateArray(cxt) {
    const { gen, data, keyword, it } = cxt;
    const valid = gen.name("valid");
    if (it.allErrors) {
      const validArr = gen.let("valid", true);
      validateItems(() => gen.assign(validArr, false));
      return validArr;
    }
    gen.var(valid, true);
    validateItems(() => gen.break());
    return valid;
    function validateItems(notValid) {
      const len = gen.const("len", (0, codegen_1._)`${data}.length`);
      gen.forRange("i", 0, len, (i) => {
        cxt.subschema({
          keyword,
          dataProp: i,
          dataPropType: util_1.Type.Num
        }, valid);
        gen.if((0, codegen_1.not)(valid), notValid);
      });
    }
  }
  exports2.validateArray = validateArray;
  function validateUnion(cxt) {
    const { gen, schema, keyword, it } = cxt;
    if (!Array.isArray(schema)) throw new Error("ajv implementation error");
    if (schema.some((sch) => (0, util_1.alwaysValidSchema)(it, sch)) && !it.opts.unevaluated) return;
    const valid = gen.let("valid", false);
    const schValid = gen.name("_valid");
    gen.block(() => schema.forEach((_sch, i) => {
      const schCxt = cxt.subschema({
        keyword,
        schemaProp: i,
        compositeRule: true
      }, schValid);
      gen.assign(valid, (0, codegen_1._)`${valid} || ${schValid}`);
      if (!cxt.mergeValidEvaluated(schCxt, schValid)) gen.if((0, codegen_1.not)(valid));
    }));
    cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
  }
  exports2.validateUnion = validateUnion;
}));
var require_keyword = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.validateKeywordUsage = exports2.validSchemaType = exports2.funcKeywordCode = exports2.macroKeywordCode = void 0;
  const codegen_1 = require_codegen();
  const names_1 = require_names();
  const code_1 = require_code();
  const errors_1 = require_errors();
  function macroKeywordCode(cxt, def) {
    const { gen, keyword, schema, parentSchema, it } = cxt;
    const macroSchema = def.macro.call(it.self, schema, parentSchema, it);
    const schemaRef = useKeyword(gen, keyword, macroSchema);
    if (it.opts.validateSchema !== false) it.self.validateSchema(macroSchema, true);
    const valid = gen.name("valid");
    cxt.subschema({
      schema: macroSchema,
      schemaPath: codegen_1.nil,
      errSchemaPath: `${it.errSchemaPath}/${keyword}`,
      topSchemaRef: schemaRef,
      compositeRule: true
    }, valid);
    cxt.pass(valid, () => cxt.error(true));
  }
  exports2.macroKeywordCode = macroKeywordCode;
  function funcKeywordCode(cxt, def) {
    var _a2;
    const { gen, keyword, schema, parentSchema, $data, it } = cxt;
    checkAsyncKeyword(it, def);
    const validateRef = useKeyword(gen, keyword, !$data && def.compile ? def.compile.call(it.self, schema, parentSchema, it) : def.validate);
    const valid = gen.let("valid");
    cxt.block$data(valid, validateKeyword);
    cxt.ok((_a2 = def.valid) !== null && _a2 !== void 0 ? _a2 : valid);
    function validateKeyword() {
      if (def.errors === false) {
        assignValid();
        if (def.modifying) modifyData(cxt);
        reportErrs(() => cxt.error());
      } else {
        const ruleErrs = def.async ? validateAsync() : validateSync();
        if (def.modifying) modifyData(cxt);
        reportErrs(() => addErrs(cxt, ruleErrs));
      }
    }
    function validateAsync() {
      const ruleErrs = gen.let("ruleErrs", null);
      gen.try(() => assignValid((0, codegen_1._)`await `), (e) => gen.assign(valid, false).if((0, codegen_1._)`${e} instanceof ${it.ValidationError}`, () => gen.assign(ruleErrs, (0, codegen_1._)`${e}.errors`), () => gen.throw(e)));
      return ruleErrs;
    }
    function validateSync() {
      const validateErrs = (0, codegen_1._)`${validateRef}.errors`;
      gen.assign(validateErrs, null);
      assignValid(codegen_1.nil);
      return validateErrs;
    }
    function assignValid(_await = def.async ? (0, codegen_1._)`await ` : codegen_1.nil) {
      const passCxt = it.opts.passContext ? names_1.default.this : names_1.default.self;
      const passSchema = !("compile" in def && !$data || def.schema === false);
      gen.assign(valid, (0, codegen_1._)`${_await}${(0, code_1.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`, def.modifying);
    }
    function reportErrs(errors) {
      var _a$1;
      gen.if((0, codegen_1.not)((_a$1 = def.valid) !== null && _a$1 !== void 0 ? _a$1 : valid), errors);
    }
  }
  exports2.funcKeywordCode = funcKeywordCode;
  function modifyData(cxt) {
    const { gen, data, it } = cxt;
    gen.if(it.parentData, () => gen.assign(data, (0, codegen_1._)`${it.parentData}[${it.parentDataProperty}]`));
  }
  function addErrs(cxt, errs) {
    const { gen } = cxt;
    gen.if((0, codegen_1._)`Array.isArray(${errs})`, () => {
      gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`).assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
      (0, errors_1.extendErrors)(cxt);
    }, () => cxt.error());
  }
  function checkAsyncKeyword({ schemaEnv }, def) {
    if (def.async && !schemaEnv.$async) throw new Error("async keyword in sync schema");
  }
  function useKeyword(gen, keyword, result) {
    if (result === void 0) throw new Error(`keyword "${keyword}" failed to compile`);
    return gen.scopeValue("keyword", typeof result == "function" ? { ref: result } : {
      ref: result,
      code: (0, codegen_1.stringify)(result)
    });
  }
  function validSchemaType(schema, schemaType, allowUndefined = false) {
    return !schemaType.length || schemaType.some((st) => st === "array" ? Array.isArray(schema) : st === "object" ? schema && typeof schema == "object" && !Array.isArray(schema) : typeof schema == st || allowUndefined && typeof schema == "undefined");
  }
  exports2.validSchemaType = validSchemaType;
  function validateKeywordUsage({ schema, opts, self, errSchemaPath }, def, keyword) {
    if (Array.isArray(def.keyword) ? !def.keyword.includes(keyword) : def.keyword !== keyword) throw new Error("ajv implementation error");
    const deps = def.dependencies;
    if (deps === null || deps === void 0 ? void 0 : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))) throw new Error(`parent schema must have dependencies of ${keyword}: ${deps.join(",")}`);
    if (def.validateSchema) {
      if (!def.validateSchema(schema[keyword])) {
        const msg = `keyword "${keyword}" value is invalid at path "${errSchemaPath}": ` + self.errorsText(def.validateSchema.errors);
        if (opts.validateSchema === "log") self.logger.error(msg);
        else throw new Error(msg);
      }
    }
  }
  exports2.validateKeywordUsage = validateKeywordUsage;
}));
var require_subschema = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.extendSubschemaMode = exports2.extendSubschemaData = exports2.getSubschema = void 0;
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  function getSubschema(it, { keyword, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
    if (keyword !== void 0 && schema !== void 0) throw new Error('both "keyword" and "schema" passed, only one allowed');
    if (keyword !== void 0) {
      const sch = it.schema[keyword];
      return schemaProp === void 0 ? {
        schema: sch,
        schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}`,
        errSchemaPath: `${it.errSchemaPath}/${keyword}`
      } : {
        schema: sch[schemaProp],
        schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}${(0, codegen_1.getProperty)(schemaProp)}`,
        errSchemaPath: `${it.errSchemaPath}/${keyword}/${(0, util_1.escapeFragment)(schemaProp)}`
      };
    }
    if (schema !== void 0) {
      if (schemaPath === void 0 || errSchemaPath === void 0 || topSchemaRef === void 0) throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
      return {
        schema,
        schemaPath,
        topSchemaRef,
        errSchemaPath
      };
    }
    throw new Error('either "keyword" or "schema" must be passed');
  }
  exports2.getSubschema = getSubschema;
  function extendSubschemaData(subschema, it, { dataProp, dataPropType: dpType, data, dataTypes, propertyName }) {
    if (data !== void 0 && dataProp !== void 0) throw new Error('both "data" and "dataProp" passed, only one allowed');
    const { gen } = it;
    if (dataProp !== void 0) {
      const { errorPath, dataPathArr, opts } = it;
      dataContextProps(gen.let("data", (0, codegen_1._)`${it.data}${(0, codegen_1.getProperty)(dataProp)}`, true));
      subschema.errorPath = (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`;
      subschema.parentDataProperty = (0, codegen_1._)`${dataProp}`;
      subschema.dataPathArr = [...dataPathArr, subschema.parentDataProperty];
    }
    if (data !== void 0) {
      dataContextProps(data instanceof codegen_1.Name ? data : gen.let("data", data, true));
      if (propertyName !== void 0) subschema.propertyName = propertyName;
    }
    if (dataTypes) subschema.dataTypes = dataTypes;
    function dataContextProps(_nextData) {
      subschema.data = _nextData;
      subschema.dataLevel = it.dataLevel + 1;
      subschema.dataTypes = [];
      it.definedProperties = /* @__PURE__ */ new Set();
      subschema.parentData = it.data;
      subschema.dataNames = [...it.dataNames, _nextData];
    }
  }
  exports2.extendSubschemaData = extendSubschemaData;
  function extendSubschemaMode(subschema, { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }) {
    if (compositeRule !== void 0) subschema.compositeRule = compositeRule;
    if (createErrors !== void 0) subschema.createErrors = createErrors;
    if (allErrors !== void 0) subschema.allErrors = allErrors;
    subschema.jtdDiscriminator = jtdDiscriminator;
    subschema.jtdMetadata = jtdMetadata;
  }
  exports2.extendSubschemaMode = extendSubschemaMode;
}));
var require_fast_deep_equal = /* @__PURE__ */ __commonJSMin(((exports2, module2) => {
  module2.exports = function equal(a, b) {
    if (a === b) return true;
    if (a && b && typeof a == "object" && typeof b == "object") {
      if (a.constructor !== b.constructor) return false;
      var length, i, keys;
      if (Array.isArray(a)) {
        length = a.length;
        if (length != b.length) return false;
        for (i = length; i-- !== 0; ) if (!equal(a[i], b[i])) return false;
        return true;
      }
      if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
      if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
      if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
      keys = Object.keys(a);
      length = keys.length;
      if (length !== Object.keys(b).length) return false;
      for (i = length; i-- !== 0; ) if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
      for (i = length; i-- !== 0; ) {
        var key = keys[i];
        if (!equal(a[key], b[key])) return false;
      }
      return true;
    }
    return a !== a && b !== b;
  };
}));
var require_json_schema_traverse = /* @__PURE__ */ __commonJSMin(((exports2, module2) => {
  var traverse = module2.exports = function(schema, opts, cb) {
    if (typeof opts == "function") {
      cb = opts;
      opts = {};
    }
    cb = opts.cb || cb;
    var pre = typeof cb == "function" ? cb : cb.pre || function() {
    };
    var post = cb.post || function() {
    };
    _traverse(opts, pre, post, schema, "", schema);
  };
  traverse.keywords = {
    additionalItems: true,
    items: true,
    contains: true,
    additionalProperties: true,
    propertyNames: true,
    not: true,
    if: true,
    then: true,
    else: true
  };
  traverse.arrayKeywords = {
    items: true,
    allOf: true,
    anyOf: true,
    oneOf: true
  };
  traverse.propsKeywords = {
    $defs: true,
    definitions: true,
    properties: true,
    patternProperties: true,
    dependencies: true
  };
  traverse.skipKeywords = {
    default: true,
    enum: true,
    const: true,
    required: true,
    maximum: true,
    minimum: true,
    exclusiveMaximum: true,
    exclusiveMinimum: true,
    multipleOf: true,
    maxLength: true,
    minLength: true,
    pattern: true,
    format: true,
    maxItems: true,
    minItems: true,
    uniqueItems: true,
    maxProperties: true,
    minProperties: true
  };
  function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
    if (schema && typeof schema == "object" && !Array.isArray(schema)) {
      pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
      for (var key in schema) {
        var sch = schema[key];
        if (Array.isArray(sch)) {
          if (key in traverse.arrayKeywords) for (var i = 0; i < sch.length; i++) _traverse(opts, pre, post, sch[i], jsonPtr + "/" + key + "/" + i, rootSchema, jsonPtr, key, schema, i);
        } else if (key in traverse.propsKeywords) {
          if (sch && typeof sch == "object") for (var prop in sch) _traverse(opts, pre, post, sch[prop], jsonPtr + "/" + key + "/" + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
        } else if (key in traverse.keywords || opts.allKeys && !(key in traverse.skipKeywords)) _traverse(opts, pre, post, sch, jsonPtr + "/" + key, rootSchema, jsonPtr, key, schema);
      }
      post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
    }
  }
  function escapeJsonPtr(str) {
    return str.replace(/~/g, "~0").replace(/\//g, "~1");
  }
}));
var require_resolve = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.getSchemaRefs = exports2.resolveUrl = exports2.normalizeId = exports2._getFullPath = exports2.getFullPath = exports2.inlineRef = void 0;
  const util_1 = require_util();
  const equal = require_fast_deep_equal();
  const traverse = require_json_schema_traverse();
  const SIMPLE_INLINED = /* @__PURE__ */ new Set([
    "type",
    "format",
    "pattern",
    "maxLength",
    "minLength",
    "maxProperties",
    "minProperties",
    "maxItems",
    "minItems",
    "maximum",
    "minimum",
    "uniqueItems",
    "multipleOf",
    "required",
    "enum",
    "const"
  ]);
  function inlineRef(schema, limit = true) {
    if (typeof schema == "boolean") return true;
    if (limit === true) return !hasRef(schema);
    if (!limit) return false;
    return countKeys(schema) <= limit;
  }
  exports2.inlineRef = inlineRef;
  const REF_KEYWORDS = /* @__PURE__ */ new Set([
    "$ref",
    "$recursiveRef",
    "$recursiveAnchor",
    "$dynamicRef",
    "$dynamicAnchor"
  ]);
  function hasRef(schema) {
    for (const key in schema) {
      if (REF_KEYWORDS.has(key)) return true;
      const sch = schema[key];
      if (Array.isArray(sch) && sch.some(hasRef)) return true;
      if (typeof sch == "object" && hasRef(sch)) return true;
    }
    return false;
  }
  function countKeys(schema) {
    let count = 0;
    for (const key in schema) {
      if (key === "$ref") return Infinity;
      count++;
      if (SIMPLE_INLINED.has(key)) continue;
      if (typeof schema[key] == "object") (0, util_1.eachItem)(schema[key], (sch) => count += countKeys(sch));
      if (count === Infinity) return Infinity;
    }
    return count;
  }
  function getFullPath(resolver, id = "", normalize) {
    if (normalize !== false) id = normalizeId(id);
    return _getFullPath(resolver, resolver.parse(id));
  }
  exports2.getFullPath = getFullPath;
  function _getFullPath(resolver, p) {
    return resolver.serialize(p).split("#")[0] + "#";
  }
  exports2._getFullPath = _getFullPath;
  const TRAILING_SLASH_HASH = /#\/?$/;
  function normalizeId(id) {
    return id ? id.replace(TRAILING_SLASH_HASH, "") : "";
  }
  exports2.normalizeId = normalizeId;
  function resolveUrl(resolver, baseId, id) {
    id = normalizeId(id);
    return resolver.resolve(baseId, id);
  }
  exports2.resolveUrl = resolveUrl;
  const ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
  function getSchemaRefs(schema, baseId) {
    if (typeof schema == "boolean") return {};
    const { schemaId, uriResolver } = this.opts;
    const schId = normalizeId(schema[schemaId] || baseId);
    const baseIds = { "": schId };
    const pathPrefix = getFullPath(uriResolver, schId, false);
    const localRefs = {};
    const schemaRefs = /* @__PURE__ */ new Set();
    traverse(schema, { allKeys: true }, (sch, jsonPtr, _, parentJsonPtr) => {
      if (parentJsonPtr === void 0) return;
      const fullPath = pathPrefix + jsonPtr;
      let innerBaseId = baseIds[parentJsonPtr];
      if (typeof sch[schemaId] == "string") innerBaseId = addRef.call(this, sch[schemaId]);
      addAnchor.call(this, sch.$anchor);
      addAnchor.call(this, sch.$dynamicAnchor);
      baseIds[jsonPtr] = innerBaseId;
      function addRef(ref) {
        const _resolve = this.opts.uriResolver.resolve;
        ref = normalizeId(innerBaseId ? _resolve(innerBaseId, ref) : ref);
        if (schemaRefs.has(ref)) throw ambiguos(ref);
        schemaRefs.add(ref);
        let schOrRef = this.refs[ref];
        if (typeof schOrRef == "string") schOrRef = this.refs[schOrRef];
        if (typeof schOrRef == "object") checkAmbiguosRef(sch, schOrRef.schema, ref);
        else if (ref !== normalizeId(fullPath)) if (ref[0] === "#") {
          checkAmbiguosRef(sch, localRefs[ref], ref);
          localRefs[ref] = sch;
        } else this.refs[ref] = fullPath;
        return ref;
      }
      function addAnchor(anchor) {
        if (typeof anchor == "string") {
          if (!ANCHOR.test(anchor)) throw new Error(`invalid anchor "${anchor}"`);
          addRef.call(this, `#${anchor}`);
        }
      }
    });
    return localRefs;
    function checkAmbiguosRef(sch1, sch2, ref) {
      if (sch2 !== void 0 && !equal(sch1, sch2)) throw ambiguos(ref);
    }
    function ambiguos(ref) {
      return /* @__PURE__ */ new Error(`reference "${ref}" resolves to more than one schema`);
    }
  }
  exports2.getSchemaRefs = getSchemaRefs;
}));
var require_validate = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.getData = exports2.KeywordCxt = exports2.validateFunctionCode = void 0;
  const boolSchema_1 = require_boolSchema();
  const dataType_1 = require_dataType();
  const applicability_1 = require_applicability();
  const dataType_2 = require_dataType();
  const defaults_1 = require_defaults();
  const keyword_1 = require_keyword();
  const subschema_1 = require_subschema();
  const codegen_1 = require_codegen();
  const names_1 = require_names();
  const resolve_1 = require_resolve();
  const util_1 = require_util();
  const errors_1 = require_errors();
  function validateFunctionCode(it) {
    if (isSchemaObj(it)) {
      checkKeywords(it);
      if (schemaCxtHasRules(it)) {
        topSchemaObjCode(it);
        return;
      }
    }
    validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it));
  }
  exports2.validateFunctionCode = validateFunctionCode;
  function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
    if (opts.code.es5) gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${names_1.default.valCxt}`, schemaEnv.$async, () => {
      gen.code((0, codegen_1._)`"use strict"; ${funcSourceUrl(schema, opts)}`);
      destructureValCxtES5(gen, opts);
      gen.code(body);
    });
    else gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${destructureValCxt(opts)}`, schemaEnv.$async, () => gen.code(funcSourceUrl(schema, opts)).code(body));
  }
  function destructureValCxt(opts) {
    return (0, codegen_1._)`{${names_1.default.instancePath}="", ${names_1.default.parentData}, ${names_1.default.parentDataProperty}, ${names_1.default.rootData}=${names_1.default.data}${opts.dynamicRef ? (0, codegen_1._)`, ${names_1.default.dynamicAnchors}={}` : codegen_1.nil}}={}`;
  }
  function destructureValCxtES5(gen, opts) {
    gen.if(names_1.default.valCxt, () => {
      gen.var(names_1.default.instancePath, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.instancePath}`);
      gen.var(names_1.default.parentData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentData}`);
      gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentDataProperty}`);
      gen.var(names_1.default.rootData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.rootData}`);
      if (opts.dynamicRef) gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.dynamicAnchors}`);
    }, () => {
      gen.var(names_1.default.instancePath, (0, codegen_1._)`""`);
      gen.var(names_1.default.parentData, (0, codegen_1._)`undefined`);
      gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`undefined`);
      gen.var(names_1.default.rootData, names_1.default.data);
      if (opts.dynamicRef) gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`{}`);
    });
  }
  function topSchemaObjCode(it) {
    const { schema, opts, gen } = it;
    validateFunction(it, () => {
      if (opts.$comment && schema.$comment) commentKeyword(it);
      checkNoDefault(it);
      gen.let(names_1.default.vErrors, null);
      gen.let(names_1.default.errors, 0);
      if (opts.unevaluated) resetEvaluated(it);
      typeAndKeywords(it);
      returnResults(it);
    });
  }
  function resetEvaluated(it) {
    const { gen, validateName } = it;
    it.evaluated = gen.const("evaluated", (0, codegen_1._)`${validateName}.evaluated`);
    gen.if((0, codegen_1._)`${it.evaluated}.dynamicProps`, () => gen.assign((0, codegen_1._)`${it.evaluated}.props`, (0, codegen_1._)`undefined`));
    gen.if((0, codegen_1._)`${it.evaluated}.dynamicItems`, () => gen.assign((0, codegen_1._)`${it.evaluated}.items`, (0, codegen_1._)`undefined`));
  }
  function funcSourceUrl(schema, opts) {
    const schId = typeof schema == "object" && schema[opts.schemaId];
    return schId && (opts.code.source || opts.code.process) ? (0, codegen_1._)`/*# sourceURL=${schId} */` : codegen_1.nil;
  }
  function subschemaCode(it, valid) {
    if (isSchemaObj(it)) {
      checkKeywords(it);
      if (schemaCxtHasRules(it)) {
        subSchemaObjCode(it, valid);
        return;
      }
    }
    (0, boolSchema_1.boolOrEmptySchema)(it, valid);
  }
  function schemaCxtHasRules({ schema, self }) {
    if (typeof schema == "boolean") return !schema;
    for (const key in schema) if (self.RULES.all[key]) return true;
    return false;
  }
  function isSchemaObj(it) {
    return typeof it.schema != "boolean";
  }
  function subSchemaObjCode(it, valid) {
    const { schema, gen, opts } = it;
    if (opts.$comment && schema.$comment) commentKeyword(it);
    updateContext(it);
    checkAsyncSchema(it);
    const errsCount = gen.const("_errs", names_1.default.errors);
    typeAndKeywords(it, errsCount);
    gen.var(valid, (0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
  }
  function checkKeywords(it) {
    (0, util_1.checkUnknownRules)(it);
    checkRefsAndKeywords(it);
  }
  function typeAndKeywords(it, errsCount) {
    if (it.opts.jtd) return schemaKeywords(it, [], false, errsCount);
    const types = (0, dataType_1.getSchemaTypes)(it.schema);
    schemaKeywords(it, types, !(0, dataType_1.coerceAndCheckDataType)(it, types), errsCount);
  }
  function checkRefsAndKeywords(it) {
    const { schema, errSchemaPath, opts, self } = it;
    if (schema.$ref && opts.ignoreKeywordsWithRef && (0, util_1.schemaHasRulesButRef)(schema, self.RULES)) self.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
  }
  function checkNoDefault(it) {
    const { schema, opts } = it;
    if (schema.default !== void 0 && opts.useDefaults && opts.strictSchema) (0, util_1.checkStrictMode)(it, "default is ignored in the schema root");
  }
  function updateContext(it) {
    const schId = it.schema[it.opts.schemaId];
    if (schId) it.baseId = (0, resolve_1.resolveUrl)(it.opts.uriResolver, it.baseId, schId);
  }
  function checkAsyncSchema(it) {
    if (it.schema.$async && !it.schemaEnv.$async) throw new Error("async schema in sync schema");
  }
  function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
    const msg = schema.$comment;
    if (opts.$comment === true) gen.code((0, codegen_1._)`${names_1.default.self}.logger.log(${msg})`);
    else if (typeof opts.$comment == "function") {
      const schemaPath = (0, codegen_1.str)`${errSchemaPath}/$comment`;
      const rootName = gen.scopeValue("root", { ref: schemaEnv.root });
      gen.code((0, codegen_1._)`${names_1.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
    }
  }
  function returnResults(it) {
    const { gen, schemaEnv, validateName, ValidationError, opts } = it;
    if (schemaEnv.$async) gen.if((0, codegen_1._)`${names_1.default.errors} === 0`, () => gen.return(names_1.default.data), () => gen.throw((0, codegen_1._)`new ${ValidationError}(${names_1.default.vErrors})`));
    else {
      gen.assign((0, codegen_1._)`${validateName}.errors`, names_1.default.vErrors);
      if (opts.unevaluated) assignEvaluated(it);
      gen.return((0, codegen_1._)`${names_1.default.errors} === 0`);
    }
  }
  function assignEvaluated({ gen, evaluated, props, items }) {
    if (props instanceof codegen_1.Name) gen.assign((0, codegen_1._)`${evaluated}.props`, props);
    if (items instanceof codegen_1.Name) gen.assign((0, codegen_1._)`${evaluated}.items`, items);
  }
  function schemaKeywords(it, types, typeErrors, errsCount) {
    const { gen, schema, data, allErrors, opts, self } = it;
    const { RULES } = self;
    if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_1.schemaHasRulesButRef)(schema, RULES))) {
      gen.block(() => keywordCode(it, "$ref", RULES.all.$ref.definition));
      return;
    }
    if (!opts.jtd) checkStrictTypes(it, types);
    gen.block(() => {
      for (const group of RULES.rules) groupKeywords(group);
      groupKeywords(RULES.post);
    });
    function groupKeywords(group) {
      if (!(0, applicability_1.shouldUseGroup)(schema, group)) return;
      if (group.type) {
        gen.if((0, dataType_2.checkDataType)(group.type, data, opts.strictNumbers));
        iterateKeywords(it, group);
        if (types.length === 1 && types[0] === group.type && typeErrors) {
          gen.else();
          (0, dataType_2.reportTypeError)(it);
        }
        gen.endIf();
      } else iterateKeywords(it, group);
      if (!allErrors) gen.if((0, codegen_1._)`${names_1.default.errors} === ${errsCount || 0}`);
    }
  }
  function iterateKeywords(it, group) {
    const { gen, schema, opts: { useDefaults } } = it;
    if (useDefaults) (0, defaults_1.assignDefaults)(it, group.type);
    gen.block(() => {
      for (const rule of group.rules) if ((0, applicability_1.shouldUseRule)(schema, rule)) keywordCode(it, rule.keyword, rule.definition, group.type);
    });
  }
  function checkStrictTypes(it, types) {
    if (it.schemaEnv.meta || !it.opts.strictTypes) return;
    checkContextTypes(it, types);
    if (!it.opts.allowUnionTypes) checkMultipleTypes(it, types);
    checkKeywordTypes(it, it.dataTypes);
  }
  function checkContextTypes(it, types) {
    if (!types.length) return;
    if (!it.dataTypes.length) {
      it.dataTypes = types;
      return;
    }
    types.forEach((t) => {
      if (!includesType(it.dataTypes, t)) strictTypesError(it, `type "${t}" not allowed by context "${it.dataTypes.join(",")}"`);
    });
    narrowSchemaTypes(it, types);
  }
  function checkMultipleTypes(it, ts) {
    if (ts.length > 1 && !(ts.length === 2 && ts.includes("null"))) strictTypesError(it, "use allowUnionTypes to allow union type keyword");
  }
  function checkKeywordTypes(it, ts) {
    const rules = it.self.RULES.all;
    for (const keyword in rules) {
      const rule = rules[keyword];
      if (typeof rule == "object" && (0, applicability_1.shouldUseRule)(it.schema, rule)) {
        const { type } = rule.definition;
        if (type.length && !type.some((t) => hasApplicableType(ts, t))) strictTypesError(it, `missing type "${type.join(",")}" for keyword "${keyword}"`);
      }
    }
  }
  function hasApplicableType(schTs, kwdT) {
    return schTs.includes(kwdT) || kwdT === "number" && schTs.includes("integer");
  }
  function includesType(ts, t) {
    return ts.includes(t) || t === "integer" && ts.includes("number");
  }
  function narrowSchemaTypes(it, withTypes) {
    const ts = [];
    for (const t of it.dataTypes) if (includesType(withTypes, t)) ts.push(t);
    else if (withTypes.includes("integer") && t === "number") ts.push("integer");
    it.dataTypes = ts;
  }
  function strictTypesError(it, msg) {
    const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
    msg += ` at "${schemaPath}" (strictTypes)`;
    (0, util_1.checkStrictMode)(it, msg, it.opts.strictTypes);
  }
  var KeywordCxt = class {
    constructor(it, def, keyword) {
      (0, keyword_1.validateKeywordUsage)(it, def, keyword);
      this.gen = it.gen;
      this.allErrors = it.allErrors;
      this.keyword = keyword;
      this.data = it.data;
      this.schema = it.schema[keyword];
      this.$data = def.$data && it.opts.$data && this.schema && this.schema.$data;
      this.schemaValue = (0, util_1.schemaRefOrVal)(it, this.schema, keyword, this.$data);
      this.schemaType = def.schemaType;
      this.parentSchema = it.schema;
      this.params = {};
      this.it = it;
      this.def = def;
      if (this.$data) this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
      else {
        this.schemaCode = this.schemaValue;
        if (!(0, keyword_1.validSchemaType)(this.schema, def.schemaType, def.allowUndefined)) throw new Error(`${keyword} value must be ${JSON.stringify(def.schemaType)}`);
      }
      if ("code" in def ? def.trackErrors : def.errors !== false) this.errsCount = it.gen.const("_errs", names_1.default.errors);
    }
    result(condition, successAction, failAction) {
      this.failResult((0, codegen_1.not)(condition), successAction, failAction);
    }
    failResult(condition, successAction, failAction) {
      this.gen.if(condition);
      if (failAction) failAction();
      else this.error();
      if (successAction) {
        this.gen.else();
        successAction();
        if (this.allErrors) this.gen.endIf();
      } else if (this.allErrors) this.gen.endIf();
      else this.gen.else();
    }
    pass(condition, failAction) {
      this.failResult((0, codegen_1.not)(condition), void 0, failAction);
    }
    fail(condition) {
      if (condition === void 0) {
        this.error();
        if (!this.allErrors) this.gen.if(false);
        return;
      }
      this.gen.if(condition);
      this.error();
      if (this.allErrors) this.gen.endIf();
      else this.gen.else();
    }
    fail$data(condition) {
      if (!this.$data) return this.fail(condition);
      const { schemaCode } = this;
      this.fail((0, codegen_1._)`${schemaCode} !== undefined && (${(0, codegen_1.or)(this.invalid$data(), condition)})`);
    }
    error(append, errorParams, errorPaths) {
      if (errorParams) {
        this.setParams(errorParams);
        this._error(append, errorPaths);
        this.setParams({});
        return;
      }
      this._error(append, errorPaths);
    }
    _error(append, errorPaths) {
      (append ? errors_1.reportExtraError : errors_1.reportError)(this, this.def.error, errorPaths);
    }
    $dataError() {
      (0, errors_1.reportError)(this, this.def.$dataError || errors_1.keyword$DataError);
    }
    reset() {
      if (this.errsCount === void 0) throw new Error('add "trackErrors" to keyword definition');
      (0, errors_1.resetErrorsCount)(this.gen, this.errsCount);
    }
    ok(cond) {
      if (!this.allErrors) this.gen.if(cond);
    }
    setParams(obj, assign) {
      if (assign) Object.assign(this.params, obj);
      else this.params = obj;
    }
    block$data(valid, codeBlock, $dataValid = codegen_1.nil) {
      this.gen.block(() => {
        this.check$data(valid, $dataValid);
        codeBlock();
      });
    }
    check$data(valid = codegen_1.nil, $dataValid = codegen_1.nil) {
      if (!this.$data) return;
      const { gen, schemaCode, schemaType, def } = this;
      gen.if((0, codegen_1.or)((0, codegen_1._)`${schemaCode} === undefined`, $dataValid));
      if (valid !== codegen_1.nil) gen.assign(valid, true);
      if (schemaType.length || def.validateSchema) {
        gen.elseIf(this.invalid$data());
        this.$dataError();
        if (valid !== codegen_1.nil) gen.assign(valid, false);
      }
      gen.else();
    }
    invalid$data() {
      const { gen, schemaCode, schemaType, def, it } = this;
      return (0, codegen_1.or)(wrong$DataType(), invalid$DataSchema());
      function wrong$DataType() {
        if (schemaType.length) {
          if (!(schemaCode instanceof codegen_1.Name)) throw new Error("ajv implementation error");
          const st = Array.isArray(schemaType) ? schemaType : [schemaType];
          return (0, codegen_1._)`${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
        }
        return codegen_1.nil;
      }
      function invalid$DataSchema() {
        if (def.validateSchema) {
          const validateSchemaRef = gen.scopeValue("validate$data", { ref: def.validateSchema });
          return (0, codegen_1._)`!${validateSchemaRef}(${schemaCode})`;
        }
        return codegen_1.nil;
      }
    }
    subschema(appl, valid) {
      const subschema = (0, subschema_1.getSubschema)(this.it, appl);
      (0, subschema_1.extendSubschemaData)(subschema, this.it, appl);
      (0, subschema_1.extendSubschemaMode)(subschema, appl);
      const nextContext = {
        ...this.it,
        ...subschema,
        items: void 0,
        props: void 0
      };
      subschemaCode(nextContext, valid);
      return nextContext;
    }
    mergeEvaluated(schemaCxt, toName) {
      const { it, gen } = this;
      if (!it.opts.unevaluated) return;
      if (it.props !== true && schemaCxt.props !== void 0) it.props = util_1.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
      if (it.items !== true && schemaCxt.items !== void 0) it.items = util_1.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
    }
    mergeValidEvaluated(schemaCxt, valid) {
      const { it, gen } = this;
      if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
        gen.if(valid, () => this.mergeEvaluated(schemaCxt, codegen_1.Name));
        return true;
      }
    }
  };
  exports2.KeywordCxt = KeywordCxt;
  function keywordCode(it, keyword, def, ruleType) {
    const cxt = new KeywordCxt(it, def, keyword);
    if ("code" in def) def.code(cxt, ruleType);
    else if (cxt.$data && def.validate) (0, keyword_1.funcKeywordCode)(cxt, def);
    else if ("macro" in def) (0, keyword_1.macroKeywordCode)(cxt, def);
    else if (def.compile || def.validate) (0, keyword_1.funcKeywordCode)(cxt, def);
  }
  const JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
  const RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
  function getData($data, { dataLevel, dataNames, dataPathArr }) {
    let jsonPointer;
    let data;
    if ($data === "") return names_1.default.rootData;
    if ($data[0] === "/") {
      if (!JSON_POINTER.test($data)) throw new Error(`Invalid JSON-pointer: ${$data}`);
      jsonPointer = $data;
      data = names_1.default.rootData;
    } else {
      const matches = RELATIVE_JSON_POINTER.exec($data);
      if (!matches) throw new Error(`Invalid JSON-pointer: ${$data}`);
      const up = +matches[1];
      jsonPointer = matches[2];
      if (jsonPointer === "#") {
        if (up >= dataLevel) throw new Error(errorMsg("property/index", up));
        return dataPathArr[dataLevel - up];
      }
      if (up > dataLevel) throw new Error(errorMsg("data", up));
      data = dataNames[dataLevel - up];
      if (!jsonPointer) return data;
    }
    let expr = data;
    const segments = jsonPointer.split("/");
    for (const segment of segments) if (segment) {
      data = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)((0, util_1.unescapeJsonPointer)(segment))}`;
      expr = (0, codegen_1._)`${expr} && ${data}`;
    }
    return expr;
    function errorMsg(pointerType, up) {
      return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
    }
  }
  exports2.getData = getData;
}));
var require_validation_error = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  var ValidationError = class extends Error {
    constructor(errors) {
      super("validation failed");
      this.errors = errors;
      this.ajv = this.validation = true;
    }
  };
  exports2.default = ValidationError;
}));
var require_ref_error = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const resolve_1 = require_resolve();
  var MissingRefError = class extends Error {
    constructor(resolver, baseId, ref, msg) {
      super(msg || `can't resolve reference ${ref} from id ${baseId}`);
      this.missingRef = (0, resolve_1.resolveUrl)(resolver, baseId, ref);
      this.missingSchema = (0, resolve_1.normalizeId)((0, resolve_1.getFullPath)(resolver, this.missingRef));
    }
  };
  exports2.default = MissingRefError;
}));
var require_compile = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.resolveSchema = exports2.getCompilingSchema = exports2.resolveRef = exports2.compileSchema = exports2.SchemaEnv = void 0;
  const codegen_1 = require_codegen();
  const validation_error_1 = require_validation_error();
  const names_1 = require_names();
  const resolve_1 = require_resolve();
  const util_1 = require_util();
  const validate_1 = require_validate();
  var SchemaEnv = class {
    constructor(env) {
      var _a2;
      this.refs = {};
      this.dynamicAnchors = {};
      let schema;
      if (typeof env.schema == "object") schema = env.schema;
      this.schema = env.schema;
      this.schemaId = env.schemaId;
      this.root = env.root || this;
      this.baseId = (_a2 = env.baseId) !== null && _a2 !== void 0 ? _a2 : (0, resolve_1.normalizeId)(schema === null || schema === void 0 ? void 0 : schema[env.schemaId || "$id"]);
      this.schemaPath = env.schemaPath;
      this.localRefs = env.localRefs;
      this.meta = env.meta;
      this.$async = schema === null || schema === void 0 ? void 0 : schema.$async;
      this.refs = {};
    }
  };
  exports2.SchemaEnv = SchemaEnv;
  function compileSchema(sch) {
    const _sch = getCompilingSchema.call(this, sch);
    if (_sch) return _sch;
    const rootId = (0, resolve_1.getFullPath)(this.opts.uriResolver, sch.root.baseId);
    const { es5, lines } = this.opts.code;
    const { ownProperties } = this.opts;
    const gen = new codegen_1.CodeGen(this.scope, {
      es5,
      lines,
      ownProperties
    });
    let _ValidationError;
    if (sch.$async) _ValidationError = gen.scopeValue("Error", {
      ref: validation_error_1.default,
      code: (0, codegen_1._)`require("ajv/dist/runtime/validation_error").default`
    });
    const validateName = gen.scopeName("validate");
    sch.validateName = validateName;
    const schemaCxt = {
      gen,
      allErrors: this.opts.allErrors,
      data: names_1.default.data,
      parentData: names_1.default.parentData,
      parentDataProperty: names_1.default.parentDataProperty,
      dataNames: [names_1.default.data],
      dataPathArr: [codegen_1.nil],
      dataLevel: 0,
      dataTypes: [],
      definedProperties: /* @__PURE__ */ new Set(),
      topSchemaRef: gen.scopeValue("schema", this.opts.code.source === true ? {
        ref: sch.schema,
        code: (0, codegen_1.stringify)(sch.schema)
      } : { ref: sch.schema }),
      validateName,
      ValidationError: _ValidationError,
      schema: sch.schema,
      schemaEnv: sch,
      rootId,
      baseId: sch.baseId || rootId,
      schemaPath: codegen_1.nil,
      errSchemaPath: sch.schemaPath || (this.opts.jtd ? "" : "#"),
      errorPath: (0, codegen_1._)`""`,
      opts: this.opts,
      self: this
    };
    let sourceCode;
    try {
      this._compilations.add(sch);
      (0, validate_1.validateFunctionCode)(schemaCxt);
      gen.optimize(this.opts.code.optimize);
      const validateCode = gen.toString();
      sourceCode = `${gen.scopeRefs(names_1.default.scope)}return ${validateCode}`;
      if (this.opts.code.process) sourceCode = this.opts.code.process(sourceCode, sch);
      const validate = new Function(`${names_1.default.self}`, `${names_1.default.scope}`, sourceCode)(this, this.scope.get());
      this.scope.value(validateName, { ref: validate });
      validate.errors = null;
      validate.schema = sch.schema;
      validate.schemaEnv = sch;
      if (sch.$async) validate.$async = true;
      if (this.opts.code.source === true) validate.source = {
        validateName,
        validateCode,
        scopeValues: gen._values
      };
      if (this.opts.unevaluated) {
        const { props, items } = schemaCxt;
        validate.evaluated = {
          props: props instanceof codegen_1.Name ? void 0 : props,
          items: items instanceof codegen_1.Name ? void 0 : items,
          dynamicProps: props instanceof codegen_1.Name,
          dynamicItems: items instanceof codegen_1.Name
        };
        if (validate.source) validate.source.evaluated = (0, codegen_1.stringify)(validate.evaluated);
      }
      sch.validate = validate;
      return sch;
    } catch (e) {
      delete sch.validate;
      delete sch.validateName;
      if (sourceCode) this.logger.error("Error compiling schema, function code:", sourceCode);
      throw e;
    } finally {
      this._compilations.delete(sch);
    }
  }
  exports2.compileSchema = compileSchema;
  function resolveRef(root, baseId, ref) {
    var _a2;
    ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, ref);
    const schOrFunc = root.refs[ref];
    if (schOrFunc) return schOrFunc;
    let _sch = resolve.call(this, root, ref);
    if (_sch === void 0) {
      const schema = (_a2 = root.localRefs) === null || _a2 === void 0 ? void 0 : _a2[ref];
      const { schemaId } = this.opts;
      if (schema) _sch = new SchemaEnv({
        schema,
        schemaId,
        root,
        baseId
      });
    }
    if (_sch === void 0) return;
    return root.refs[ref] = inlineOrCompile.call(this, _sch);
  }
  exports2.resolveRef = resolveRef;
  function inlineOrCompile(sch) {
    if ((0, resolve_1.inlineRef)(sch.schema, this.opts.inlineRefs)) return sch.schema;
    return sch.validate ? sch : compileSchema.call(this, sch);
  }
  function getCompilingSchema(schEnv) {
    for (const sch of this._compilations) if (sameSchemaEnv(sch, schEnv)) return sch;
  }
  exports2.getCompilingSchema = getCompilingSchema;
  function sameSchemaEnv(s1, s2) {
    return s1.schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId;
  }
  function resolve(root, ref) {
    let sch;
    while (typeof (sch = this.refs[ref]) == "string") ref = sch;
    return sch || this.schemas[ref] || resolveSchema.call(this, root, ref);
  }
  function resolveSchema(root, ref) {
    const p = this.opts.uriResolver.parse(ref);
    const refPath = (0, resolve_1._getFullPath)(this.opts.uriResolver, p);
    let baseId = (0, resolve_1.getFullPath)(this.opts.uriResolver, root.baseId, void 0);
    if (Object.keys(root.schema).length > 0 && refPath === baseId) return getJsonPointer.call(this, p, root);
    const id = (0, resolve_1.normalizeId)(refPath);
    const schOrRef = this.refs[id] || this.schemas[id];
    if (typeof schOrRef == "string") {
      const sch = resolveSchema.call(this, root, schOrRef);
      if (typeof (sch === null || sch === void 0 ? void 0 : sch.schema) !== "object") return;
      return getJsonPointer.call(this, p, sch);
    }
    if (typeof (schOrRef === null || schOrRef === void 0 ? void 0 : schOrRef.schema) !== "object") return;
    if (!schOrRef.validate) compileSchema.call(this, schOrRef);
    if (id === (0, resolve_1.normalizeId)(ref)) {
      const { schema } = schOrRef;
      const { schemaId } = this.opts;
      const schId = schema[schemaId];
      if (schId) baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
      return new SchemaEnv({
        schema,
        schemaId,
        root,
        baseId
      });
    }
    return getJsonPointer.call(this, p, schOrRef);
  }
  exports2.resolveSchema = resolveSchema;
  const PREVENT_SCOPE_CHANGE = /* @__PURE__ */ new Set([
    "properties",
    "patternProperties",
    "enum",
    "dependencies",
    "definitions"
  ]);
  function getJsonPointer(parsedRef, { baseId, schema, root }) {
    var _a2;
    if (((_a2 = parsedRef.fragment) === null || _a2 === void 0 ? void 0 : _a2[0]) !== "/") return;
    for (const part of parsedRef.fragment.slice(1).split("/")) {
      if (typeof schema === "boolean") return;
      const partSchema = schema[(0, util_1.unescapeFragment)(part)];
      if (partSchema === void 0) return;
      schema = partSchema;
      const schId = typeof schema === "object" && schema[this.opts.schemaId];
      if (!PREVENT_SCOPE_CHANGE.has(part) && schId) baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
    }
    let env;
    if (typeof schema != "boolean" && schema.$ref && !(0, util_1.schemaHasRulesButRef)(schema, this.RULES)) {
      const $ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
      env = resolveSchema.call(this, root, $ref);
    }
    const { schemaId } = this.opts;
    env = env || new SchemaEnv({
      schema,
      schemaId,
      root,
      baseId
    });
    if (env.schema !== env.root.schema) return env;
  }
}));
var require_data = /* @__PURE__ */ __commonJSMin(((exports2, module2) => {
  module2.exports = {
    "$id": "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
    "description": "Meta-schema for $data reference (JSON AnySchema extension proposal)",
    "type": "object",
    "required": ["$data"],
    "properties": { "$data": {
      "type": "string",
      "anyOf": [{ "format": "relative-json-pointer" }, { "format": "json-pointer" }]
    } },
    "additionalProperties": false
  };
}));
var require_utils = /* @__PURE__ */ __commonJSMin(((exports2, module2) => {
  const isUUID = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu);
  const isIPv4 = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u);
  function stringArrayToHexStripped(input) {
    let acc = "";
    let code = 0;
    let i = 0;
    for (i = 0; i < input.length; i++) {
      code = input[i].charCodeAt(0);
      if (code === 48) continue;
      if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) return "";
      acc += input[i];
      break;
    }
    for (i += 1; i < input.length; i++) {
      code = input[i].charCodeAt(0);
      if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) return "";
      acc += input[i];
    }
    return acc;
  }
  const nonSimpleDomain = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
  function consumeIsZone(buffer) {
    buffer.length = 0;
    return true;
  }
  function consumeHextets(buffer, address, output) {
    if (buffer.length) {
      const hex3 = stringArrayToHexStripped(buffer);
      if (hex3 !== "") address.push(hex3);
      else {
        output.error = true;
        return false;
      }
      buffer.length = 0;
    }
    return true;
  }
  function getIPV6(input) {
    let tokenCount = 0;
    const output = {
      error: false,
      address: "",
      zone: ""
    };
    const address = [];
    const buffer = [];
    let endipv6Encountered = false;
    let endIpv6 = false;
    let consume = consumeHextets;
    for (let i = 0; i < input.length; i++) {
      const cursor = input[i];
      if (cursor === "[" || cursor === "]") continue;
      if (cursor === ":") {
        if (endipv6Encountered === true) endIpv6 = true;
        if (!consume(buffer, address, output)) break;
        if (++tokenCount > 7) {
          output.error = true;
          break;
        }
        if (i > 0 && input[i - 1] === ":") endipv6Encountered = true;
        address.push(":");
        continue;
      } else if (cursor === "%") {
        if (!consume(buffer, address, output)) break;
        consume = consumeIsZone;
      } else {
        buffer.push(cursor);
        continue;
      }
    }
    if (buffer.length) if (consume === consumeIsZone) output.zone = buffer.join("");
    else if (endIpv6) address.push(buffer.join(""));
    else address.push(stringArrayToHexStripped(buffer));
    output.address = address.join("");
    return output;
  }
  function normalizeIPv6(host) {
    if (findToken(host, ":") < 2) return {
      host,
      isIPV6: false
    };
    const ipv63 = getIPV6(host);
    if (!ipv63.error) {
      let newHost = ipv63.address;
      let escapedHost = ipv63.address;
      if (ipv63.zone) {
        newHost += "%" + ipv63.zone;
        escapedHost += "%25" + ipv63.zone;
      }
      return {
        host: newHost,
        isIPV6: true,
        escapedHost
      };
    } else return {
      host,
      isIPV6: false
    };
  }
  function findToken(str, token) {
    let ind = 0;
    for (let i = 0; i < str.length; i++) if (str[i] === token) ind++;
    return ind;
  }
  function removeDotSegments(path) {
    let input = path;
    const output = [];
    let nextSlash = -1;
    let len = 0;
    while (len = input.length) {
      if (len === 1) if (input === ".") break;
      else if (input === "/") {
        output.push("/");
        break;
      } else {
        output.push(input);
        break;
      }
      else if (len === 2) {
        if (input[0] === ".") {
          if (input[1] === ".") break;
          else if (input[1] === "/") {
            input = input.slice(2);
            continue;
          }
        } else if (input[0] === "/") {
          if (input[1] === "." || input[1] === "/") {
            output.push("/");
            break;
          }
        }
      } else if (len === 3) {
        if (input === "/..") {
          if (output.length !== 0) output.pop();
          output.push("/");
          break;
        }
      }
      if (input[0] === ".") {
        if (input[1] === ".") {
          if (input[2] === "/") {
            input = input.slice(3);
            continue;
          }
        } else if (input[1] === "/") {
          input = input.slice(2);
          continue;
        }
      } else if (input[0] === "/") {
        if (input[1] === ".") {
          if (input[2] === "/") {
            input = input.slice(2);
            continue;
          } else if (input[2] === ".") {
            if (input[3] === "/") {
              input = input.slice(3);
              if (output.length !== 0) output.pop();
              continue;
            }
          }
        }
      }
      if ((nextSlash = input.indexOf("/", 1)) === -1) {
        output.push(input);
        break;
      } else {
        output.push(input.slice(0, nextSlash));
        input = input.slice(nextSlash);
      }
    }
    return output.join("");
  }
  function normalizeComponentEncoding(component, esc2) {
    const func = esc2 !== true ? escape : unescape;
    if (component.scheme !== void 0) component.scheme = func(component.scheme);
    if (component.userinfo !== void 0) component.userinfo = func(component.userinfo);
    if (component.host !== void 0) component.host = func(component.host);
    if (component.path !== void 0) component.path = func(component.path);
    if (component.query !== void 0) component.query = func(component.query);
    if (component.fragment !== void 0) component.fragment = func(component.fragment);
    return component;
  }
  function recomposeAuthority(component) {
    const uriTokens = [];
    if (component.userinfo !== void 0) {
      uriTokens.push(component.userinfo);
      uriTokens.push("@");
    }
    if (component.host !== void 0) {
      let host = unescape(component.host);
      if (!isIPv4(host)) {
        const ipV6res = normalizeIPv6(host);
        if (ipV6res.isIPV6 === true) host = `[${ipV6res.escapedHost}]`;
        else host = component.host;
      }
      uriTokens.push(host);
    }
    if (typeof component.port === "number" || typeof component.port === "string") {
      uriTokens.push(":");
      uriTokens.push(String(component.port));
    }
    return uriTokens.length ? uriTokens.join("") : void 0;
  }
  module2.exports = {
    nonSimpleDomain,
    recomposeAuthority,
    normalizeComponentEncoding,
    removeDotSegments,
    isIPv4,
    isUUID,
    normalizeIPv6,
    stringArrayToHexStripped
  };
}));
var require_schemes = /* @__PURE__ */ __commonJSMin(((exports2, module2) => {
  const { isUUID } = require_utils();
  const URN_REG = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu;
  const supportedSchemeNames = [
    "http",
    "https",
    "ws",
    "wss",
    "urn",
    "urn:uuid"
  ];
  function isValidSchemeName(name) {
    return supportedSchemeNames.indexOf(name) !== -1;
  }
  function wsIsSecure(wsComponent) {
    if (wsComponent.secure === true) return true;
    else if (wsComponent.secure === false) return false;
    else if (wsComponent.scheme) return wsComponent.scheme.length === 3 && (wsComponent.scheme[0] === "w" || wsComponent.scheme[0] === "W") && (wsComponent.scheme[1] === "s" || wsComponent.scheme[1] === "S") && (wsComponent.scheme[2] === "s" || wsComponent.scheme[2] === "S");
    else return false;
  }
  function httpParse(component) {
    if (!component.host) component.error = component.error || "HTTP URIs must have a host.";
    return component;
  }
  function httpSerialize(component) {
    const secure = String(component.scheme).toLowerCase() === "https";
    if (component.port === (secure ? 443 : 80) || component.port === "") component.port = void 0;
    if (!component.path) component.path = "/";
    return component;
  }
  function wsParse(wsComponent) {
    wsComponent.secure = wsIsSecure(wsComponent);
    wsComponent.resourceName = (wsComponent.path || "/") + (wsComponent.query ? "?" + wsComponent.query : "");
    wsComponent.path = void 0;
    wsComponent.query = void 0;
    return wsComponent;
  }
  function wsSerialize(wsComponent) {
    if (wsComponent.port === (wsIsSecure(wsComponent) ? 443 : 80) || wsComponent.port === "") wsComponent.port = void 0;
    if (typeof wsComponent.secure === "boolean") {
      wsComponent.scheme = wsComponent.secure ? "wss" : "ws";
      wsComponent.secure = void 0;
    }
    if (wsComponent.resourceName) {
      const [path, query] = wsComponent.resourceName.split("?");
      wsComponent.path = path && path !== "/" ? path : void 0;
      wsComponent.query = query;
      wsComponent.resourceName = void 0;
    }
    wsComponent.fragment = void 0;
    return wsComponent;
  }
  function urnParse(urnComponent, options) {
    if (!urnComponent.path) {
      urnComponent.error = "URN can not be parsed";
      return urnComponent;
    }
    const matches = urnComponent.path.match(URN_REG);
    if (matches) {
      const scheme = options.scheme || urnComponent.scheme || "urn";
      urnComponent.nid = matches[1].toLowerCase();
      urnComponent.nss = matches[2];
      const schemeHandler = getSchemeHandler(`${scheme}:${options.nid || urnComponent.nid}`);
      urnComponent.path = void 0;
      if (schemeHandler) urnComponent = schemeHandler.parse(urnComponent, options);
    } else urnComponent.error = urnComponent.error || "URN can not be parsed.";
    return urnComponent;
  }
  function urnSerialize(urnComponent, options) {
    if (urnComponent.nid === void 0) throw new Error("URN without nid cannot be serialized");
    const scheme = options.scheme || urnComponent.scheme || "urn";
    const nid = urnComponent.nid.toLowerCase();
    const schemeHandler = getSchemeHandler(`${scheme}:${options.nid || nid}`);
    if (schemeHandler) urnComponent = schemeHandler.serialize(urnComponent, options);
    const uriComponent = urnComponent;
    const nss = urnComponent.nss;
    uriComponent.path = `${nid || options.nid}:${nss}`;
    options.skipEscape = true;
    return uriComponent;
  }
  function urnuuidParse(urnComponent, options) {
    const uuidComponent = urnComponent;
    uuidComponent.uuid = uuidComponent.nss;
    uuidComponent.nss = void 0;
    if (!options.tolerant && (!uuidComponent.uuid || !isUUID(uuidComponent.uuid))) uuidComponent.error = uuidComponent.error || "UUID is not valid.";
    return uuidComponent;
  }
  function urnuuidSerialize(uuidComponent) {
    const urnComponent = uuidComponent;
    urnComponent.nss = (uuidComponent.uuid || "").toLowerCase();
    return urnComponent;
  }
  const http = {
    scheme: "http",
    domainHost: true,
    parse: httpParse,
    serialize: httpSerialize
  };
  const https = {
    scheme: "https",
    domainHost: http.domainHost,
    parse: httpParse,
    serialize: httpSerialize
  };
  const ws = {
    scheme: "ws",
    domainHost: true,
    parse: wsParse,
    serialize: wsSerialize
  };
  const wss = {
    scheme: "wss",
    domainHost: ws.domainHost,
    parse: ws.parse,
    serialize: ws.serialize
  };
  const urn = {
    scheme: "urn",
    parse: urnParse,
    serialize: urnSerialize,
    skipNormalize: true
  };
  const urnuuid = {
    scheme: "urn:uuid",
    parse: urnuuidParse,
    serialize: urnuuidSerialize,
    skipNormalize: true
  };
  const SCHEMES = {
    http,
    https,
    ws,
    wss,
    urn,
    "urn:uuid": urnuuid
  };
  Object.setPrototypeOf(SCHEMES, null);
  function getSchemeHandler(scheme) {
    return scheme && (SCHEMES[scheme] || SCHEMES[scheme.toLowerCase()]) || void 0;
  }
  module2.exports = {
    wsIsSecure,
    SCHEMES,
    isValidSchemeName,
    getSchemeHandler
  };
}));
var require_fast_uri = /* @__PURE__ */ __commonJSMin(((exports2, module2) => {
  const { normalizeIPv6, removeDotSegments, recomposeAuthority, normalizeComponentEncoding, isIPv4, nonSimpleDomain } = require_utils();
  const { SCHEMES, getSchemeHandler } = require_schemes();
  function normalize(uri, options) {
    if (typeof uri === "string") uri = serialize(parse3(uri, options), options);
    else if (typeof uri === "object") uri = parse3(serialize(uri, options), options);
    return uri;
  }
  function resolve(baseURI, relativeURI, options) {
    const schemelessOptions = options ? Object.assign({ scheme: "null" }, options) : { scheme: "null" };
    const resolved = resolveComponent(parse3(baseURI, schemelessOptions), parse3(relativeURI, schemelessOptions), schemelessOptions, true);
    schemelessOptions.skipEscape = true;
    return serialize(resolved, schemelessOptions);
  }
  function resolveComponent(base, relative, options, skipNormalization) {
    const target = {};
    if (!skipNormalization) {
      base = parse3(serialize(base, options), options);
      relative = parse3(serialize(relative, options), options);
    }
    options = options || {};
    if (!options.tolerant && relative.scheme) {
      target.scheme = relative.scheme;
      target.userinfo = relative.userinfo;
      target.host = relative.host;
      target.port = relative.port;
      target.path = removeDotSegments(relative.path || "");
      target.query = relative.query;
    } else {
      if (relative.userinfo !== void 0 || relative.host !== void 0 || relative.port !== void 0) {
        target.userinfo = relative.userinfo;
        target.host = relative.host;
        target.port = relative.port;
        target.path = removeDotSegments(relative.path || "");
        target.query = relative.query;
      } else {
        if (!relative.path) {
          target.path = base.path;
          if (relative.query !== void 0) target.query = relative.query;
          else target.query = base.query;
        } else {
          if (relative.path[0] === "/") target.path = removeDotSegments(relative.path);
          else {
            if ((base.userinfo !== void 0 || base.host !== void 0 || base.port !== void 0) && !base.path) target.path = "/" + relative.path;
            else if (!base.path) target.path = relative.path;
            else target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative.path;
            target.path = removeDotSegments(target.path);
          }
          target.query = relative.query;
        }
        target.userinfo = base.userinfo;
        target.host = base.host;
        target.port = base.port;
      }
      target.scheme = base.scheme;
    }
    target.fragment = relative.fragment;
    return target;
  }
  function equal(uriA, uriB, options) {
    if (typeof uriA === "string") {
      uriA = unescape(uriA);
      uriA = serialize(normalizeComponentEncoding(parse3(uriA, options), true), {
        ...options,
        skipEscape: true
      });
    } else if (typeof uriA === "object") uriA = serialize(normalizeComponentEncoding(uriA, true), {
      ...options,
      skipEscape: true
    });
    if (typeof uriB === "string") {
      uriB = unescape(uriB);
      uriB = serialize(normalizeComponentEncoding(parse3(uriB, options), true), {
        ...options,
        skipEscape: true
      });
    } else if (typeof uriB === "object") uriB = serialize(normalizeComponentEncoding(uriB, true), {
      ...options,
      skipEscape: true
    });
    return uriA.toLowerCase() === uriB.toLowerCase();
  }
  function serialize(cmpts, opts) {
    const component = {
      host: cmpts.host,
      scheme: cmpts.scheme,
      userinfo: cmpts.userinfo,
      port: cmpts.port,
      path: cmpts.path,
      query: cmpts.query,
      nid: cmpts.nid,
      nss: cmpts.nss,
      uuid: cmpts.uuid,
      fragment: cmpts.fragment,
      reference: cmpts.reference,
      resourceName: cmpts.resourceName,
      secure: cmpts.secure,
      error: ""
    };
    const options = Object.assign({}, opts);
    const uriTokens = [];
    const schemeHandler = getSchemeHandler(options.scheme || component.scheme);
    if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(component, options);
    if (component.path !== void 0) if (!options.skipEscape) {
      component.path = escape(component.path);
      if (component.scheme !== void 0) component.path = component.path.split("%3A").join(":");
    } else component.path = unescape(component.path);
    if (options.reference !== "suffix" && component.scheme) uriTokens.push(component.scheme, ":");
    const authority = recomposeAuthority(component);
    if (authority !== void 0) {
      if (options.reference !== "suffix") uriTokens.push("//");
      uriTokens.push(authority);
      if (component.path && component.path[0] !== "/") uriTokens.push("/");
    }
    if (component.path !== void 0) {
      let s = component.path;
      if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) s = removeDotSegments(s);
      if (authority === void 0 && s[0] === "/" && s[1] === "/") s = "/%2F" + s.slice(2);
      uriTokens.push(s);
    }
    if (component.query !== void 0) uriTokens.push("?", component.query);
    if (component.fragment !== void 0) uriTokens.push("#", component.fragment);
    return uriTokens.join("");
  }
  const URI_PARSE = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
  function parse3(uri, opts) {
    const options = Object.assign({}, opts);
    const parsed = {
      scheme: void 0,
      userinfo: void 0,
      host: "",
      port: void 0,
      path: "",
      query: void 0,
      fragment: void 0
    };
    let isIP = false;
    if (options.reference === "suffix") if (options.scheme) uri = options.scheme + ":" + uri;
    else uri = "//" + uri;
    const matches = uri.match(URI_PARSE);
    if (matches) {
      parsed.scheme = matches[1];
      parsed.userinfo = matches[3];
      parsed.host = matches[4];
      parsed.port = parseInt(matches[5], 10);
      parsed.path = matches[6] || "";
      parsed.query = matches[7];
      parsed.fragment = matches[8];
      if (isNaN(parsed.port)) parsed.port = matches[5];
      if (parsed.host) if (isIPv4(parsed.host) === false) {
        const ipv6result = normalizeIPv6(parsed.host);
        parsed.host = ipv6result.host.toLowerCase();
        isIP = ipv6result.isIPV6;
      } else isIP = true;
      if (parsed.scheme === void 0 && parsed.userinfo === void 0 && parsed.host === void 0 && parsed.port === void 0 && parsed.query === void 0 && !parsed.path) parsed.reference = "same-document";
      else if (parsed.scheme === void 0) parsed.reference = "relative";
      else if (parsed.fragment === void 0) parsed.reference = "absolute";
      else parsed.reference = "uri";
      if (options.reference && options.reference !== "suffix" && options.reference !== parsed.reference) parsed.error = parsed.error || "URI is not a " + options.reference + " reference.";
      const schemeHandler = getSchemeHandler(options.scheme || parsed.scheme);
      if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport)) {
        if (parsed.host && (options.domainHost || schemeHandler && schemeHandler.domainHost) && isIP === false && nonSimpleDomain(parsed.host)) try {
          parsed.host = URL.domainToASCII(parsed.host.toLowerCase());
        } catch (e) {
          parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e;
        }
      }
      if (!schemeHandler || schemeHandler && !schemeHandler.skipNormalize) {
        if (uri.indexOf("%") !== -1) {
          if (parsed.scheme !== void 0) parsed.scheme = unescape(parsed.scheme);
          if (parsed.host !== void 0) parsed.host = unescape(parsed.host);
        }
        if (parsed.path) parsed.path = escape(unescape(parsed.path));
        if (parsed.fragment) parsed.fragment = encodeURI(decodeURIComponent(parsed.fragment));
      }
      if (schemeHandler && schemeHandler.parse) schemeHandler.parse(parsed, options);
    } else parsed.error = parsed.error || "URI can not be parsed.";
    return parsed;
  }
  const fastUri = {
    SCHEMES,
    normalize,
    resolve,
    resolveComponent,
    equal,
    serialize,
    parse: parse3
  };
  module2.exports = fastUri;
  module2.exports.default = fastUri;
  module2.exports.fastUri = fastUri;
}));
var require_uri = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const uri = require_fast_uri();
  uri.code = 'require("ajv/dist/runtime/uri").default';
  exports2.default = uri;
}));
var require_core$1 = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.CodeGen = exports2.Name = exports2.nil = exports2.stringify = exports2.str = exports2._ = exports2.KeywordCxt = void 0;
  var validate_1 = require_validate();
  Object.defineProperty(exports2, "KeywordCxt", {
    enumerable: true,
    get: function() {
      return validate_1.KeywordCxt;
    }
  });
  var codegen_1 = require_codegen();
  Object.defineProperty(exports2, "_", {
    enumerable: true,
    get: function() {
      return codegen_1._;
    }
  });
  Object.defineProperty(exports2, "str", {
    enumerable: true,
    get: function() {
      return codegen_1.str;
    }
  });
  Object.defineProperty(exports2, "stringify", {
    enumerable: true,
    get: function() {
      return codegen_1.stringify;
    }
  });
  Object.defineProperty(exports2, "nil", {
    enumerable: true,
    get: function() {
      return codegen_1.nil;
    }
  });
  Object.defineProperty(exports2, "Name", {
    enumerable: true,
    get: function() {
      return codegen_1.Name;
    }
  });
  Object.defineProperty(exports2, "CodeGen", {
    enumerable: true,
    get: function() {
      return codegen_1.CodeGen;
    }
  });
  const validation_error_1 = require_validation_error();
  const ref_error_1 = require_ref_error();
  const rules_1 = require_rules();
  const compile_1 = require_compile();
  const codegen_2 = require_codegen();
  const resolve_1 = require_resolve();
  const dataType_1 = require_dataType();
  const util_1 = require_util();
  const $dataRefSchema = require_data();
  const uri_1 = require_uri();
  const defaultRegExp = (str, flags) => new RegExp(str, flags);
  defaultRegExp.code = "new RegExp";
  const META_IGNORE_OPTIONS = [
    "removeAdditional",
    "useDefaults",
    "coerceTypes"
  ];
  const EXT_SCOPE_NAMES = /* @__PURE__ */ new Set([
    "validate",
    "serialize",
    "parse",
    "wrapper",
    "root",
    "schema",
    "keyword",
    "pattern",
    "formats",
    "validate$data",
    "func",
    "obj",
    "Error"
  ]);
  const removedOptions = {
    errorDataPath: "",
    format: "`validateFormats: false` can be used instead.",
    nullable: '"nullable" keyword is supported by default.',
    jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
    extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
    missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
    processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
    sourceCode: "Use option `code: {source: true}`",
    strictDefaults: "It is default now, see option `strict`.",
    strictKeywords: "It is default now, see option `strict`.",
    uniqueItems: '"uniqueItems" keyword is always validated.',
    unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
    cache: "Map is used as cache, schema object as key.",
    serialize: "Map is used as cache, schema object as key.",
    ajvErrors: "It is default now."
  };
  const deprecatedOptions = {
    ignoreKeywordsWithRef: "",
    jsPropertySyntax: "",
    unicode: '"minLength"/"maxLength" account for unicode characters by default.'
  };
  const MAX_EXPRESSION = 200;
  function requiredOptions(o) {
    var _a2, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
    const s = o.strict;
    const _optz = (_a2 = o.code) === null || _a2 === void 0 ? void 0 : _a2.optimize;
    const optimize = _optz === true || _optz === void 0 ? 1 : _optz || 0;
    const regExp = (_c = (_b = o.code) === null || _b === void 0 ? void 0 : _b.regExp) !== null && _c !== void 0 ? _c : defaultRegExp;
    const uriResolver = (_d = o.uriResolver) !== null && _d !== void 0 ? _d : uri_1.default;
    return {
      strictSchema: (_f = (_e = o.strictSchema) !== null && _e !== void 0 ? _e : s) !== null && _f !== void 0 ? _f : true,
      strictNumbers: (_h = (_g = o.strictNumbers) !== null && _g !== void 0 ? _g : s) !== null && _h !== void 0 ? _h : true,
      strictTypes: (_k = (_j = o.strictTypes) !== null && _j !== void 0 ? _j : s) !== null && _k !== void 0 ? _k : "log",
      strictTuples: (_m = (_l = o.strictTuples) !== null && _l !== void 0 ? _l : s) !== null && _m !== void 0 ? _m : "log",
      strictRequired: (_p = (_o = o.strictRequired) !== null && _o !== void 0 ? _o : s) !== null && _p !== void 0 ? _p : false,
      code: o.code ? {
        ...o.code,
        optimize,
        regExp
      } : {
        optimize,
        regExp
      },
      loopRequired: (_q = o.loopRequired) !== null && _q !== void 0 ? _q : MAX_EXPRESSION,
      loopEnum: (_r = o.loopEnum) !== null && _r !== void 0 ? _r : MAX_EXPRESSION,
      meta: (_s = o.meta) !== null && _s !== void 0 ? _s : true,
      messages: (_t = o.messages) !== null && _t !== void 0 ? _t : true,
      inlineRefs: (_u = o.inlineRefs) !== null && _u !== void 0 ? _u : true,
      schemaId: (_v = o.schemaId) !== null && _v !== void 0 ? _v : "$id",
      addUsedSchema: (_w = o.addUsedSchema) !== null && _w !== void 0 ? _w : true,
      validateSchema: (_x = o.validateSchema) !== null && _x !== void 0 ? _x : true,
      validateFormats: (_y = o.validateFormats) !== null && _y !== void 0 ? _y : true,
      unicodeRegExp: (_z = o.unicodeRegExp) !== null && _z !== void 0 ? _z : true,
      int32range: (_0 = o.int32range) !== null && _0 !== void 0 ? _0 : true,
      uriResolver
    };
  }
  var Ajv = class {
    constructor(opts = {}) {
      this.schemas = {};
      this.refs = {};
      this.formats = {};
      this._compilations = /* @__PURE__ */ new Set();
      this._loading = {};
      this._cache = /* @__PURE__ */ new Map();
      opts = this.opts = {
        ...opts,
        ...requiredOptions(opts)
      };
      const { es5, lines } = this.opts.code;
      this.scope = new codegen_2.ValueScope({
        scope: {},
        prefixes: EXT_SCOPE_NAMES,
        es5,
        lines
      });
      this.logger = getLogger(opts.logger);
      const formatOpt = opts.validateFormats;
      opts.validateFormats = false;
      this.RULES = (0, rules_1.getRules)();
      checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
      checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
      this._metaOpts = getMetaSchemaOptions.call(this);
      if (opts.formats) addInitialFormats.call(this);
      this._addVocabularies();
      this._addDefaultMetaSchema();
      if (opts.keywords) addInitialKeywords.call(this, opts.keywords);
      if (typeof opts.meta == "object") this.addMetaSchema(opts.meta);
      addInitialSchemas.call(this);
      opts.validateFormats = formatOpt;
    }
    _addVocabularies() {
      this.addKeyword("$async");
    }
    _addDefaultMetaSchema() {
      const { $data, meta: meta3, schemaId } = this.opts;
      let _dataRefSchema = $dataRefSchema;
      if (schemaId === "id") {
        _dataRefSchema = { ...$dataRefSchema };
        _dataRefSchema.id = _dataRefSchema.$id;
        delete _dataRefSchema.$id;
      }
      if (meta3 && $data) this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false);
    }
    defaultMeta() {
      const { meta: meta3, schemaId } = this.opts;
      return this.opts.defaultMeta = typeof meta3 == "object" ? meta3[schemaId] || meta3 : void 0;
    }
    validate(schemaKeyRef, data) {
      let v;
      if (typeof schemaKeyRef == "string") {
        v = this.getSchema(schemaKeyRef);
        if (!v) throw new Error(`no schema with key or ref "${schemaKeyRef}"`);
      } else v = this.compile(schemaKeyRef);
      const valid = v(data);
      if (!("$async" in v)) this.errors = v.errors;
      return valid;
    }
    compile(schema, _meta) {
      const sch = this._addSchema(schema, _meta);
      return sch.validate || this._compileSchemaEnv(sch);
    }
    compileAsync(schema, meta3) {
      if (typeof this.opts.loadSchema != "function") throw new Error("options.loadSchema should be a function");
      const { loadSchema } = this.opts;
      return runCompileAsync.call(this, schema, meta3);
      async function runCompileAsync(_schema, _meta) {
        await loadMetaSchema.call(this, _schema.$schema);
        const sch = this._addSchema(_schema, _meta);
        return sch.validate || _compileAsync.call(this, sch);
      }
      async function loadMetaSchema($ref) {
        if ($ref && !this.getSchema($ref)) await runCompileAsync.call(this, { $ref }, true);
      }
      async function _compileAsync(sch) {
        try {
          return this._compileSchemaEnv(sch);
        } catch (e) {
          if (!(e instanceof ref_error_1.default)) throw e;
          checkLoaded.call(this, e);
          await loadMissingSchema.call(this, e.missingSchema);
          return _compileAsync.call(this, sch);
        }
      }
      function checkLoaded({ missingSchema: ref, missingRef }) {
        if (this.refs[ref]) throw new Error(`AnySchema ${ref} is loaded but ${missingRef} cannot be resolved`);
      }
      async function loadMissingSchema(ref) {
        const _schema = await _loadSchema.call(this, ref);
        if (!this.refs[ref]) await loadMetaSchema.call(this, _schema.$schema);
        if (!this.refs[ref]) this.addSchema(_schema, ref, meta3);
      }
      async function _loadSchema(ref) {
        const p = this._loading[ref];
        if (p) return p;
        try {
          return await (this._loading[ref] = loadSchema(ref));
        } finally {
          delete this._loading[ref];
        }
      }
    }
    addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
      if (Array.isArray(schema)) {
        for (const sch of schema) this.addSchema(sch, void 0, _meta, _validateSchema);
        return this;
      }
      let id;
      if (typeof schema === "object") {
        const { schemaId } = this.opts;
        id = schema[schemaId];
        if (id !== void 0 && typeof id != "string") throw new Error(`schema ${schemaId} must be string`);
      }
      key = (0, resolve_1.normalizeId)(key || id);
      this._checkUnique(key);
      this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true);
      return this;
    }
    addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
      this.addSchema(schema, key, true, _validateSchema);
      return this;
    }
    validateSchema(schema, throwOrLogError) {
      if (typeof schema == "boolean") return true;
      let $schema;
      $schema = schema.$schema;
      if ($schema !== void 0 && typeof $schema != "string") throw new Error("$schema must be a string");
      $schema = $schema || this.opts.defaultMeta || this.defaultMeta();
      if (!$schema) {
        this.logger.warn("meta-schema not available");
        this.errors = null;
        return true;
      }
      const valid = this.validate($schema, schema);
      if (!valid && throwOrLogError) {
        const message = "schema is invalid: " + this.errorsText();
        if (this.opts.validateSchema === "log") this.logger.error(message);
        else throw new Error(message);
      }
      return valid;
    }
    getSchema(keyRef) {
      let sch;
      while (typeof (sch = getSchEnv.call(this, keyRef)) == "string") keyRef = sch;
      if (sch === void 0) {
        const { schemaId } = this.opts;
        const root = new compile_1.SchemaEnv({
          schema: {},
          schemaId
        });
        sch = compile_1.resolveSchema.call(this, root, keyRef);
        if (!sch) return;
        this.refs[keyRef] = sch;
      }
      return sch.validate || this._compileSchemaEnv(sch);
    }
    removeSchema(schemaKeyRef) {
      if (schemaKeyRef instanceof RegExp) {
        this._removeAllSchemas(this.schemas, schemaKeyRef);
        this._removeAllSchemas(this.refs, schemaKeyRef);
        return this;
      }
      switch (typeof schemaKeyRef) {
        case "undefined":
          this._removeAllSchemas(this.schemas);
          this._removeAllSchemas(this.refs);
          this._cache.clear();
          return this;
        case "string": {
          const sch = getSchEnv.call(this, schemaKeyRef);
          if (typeof sch == "object") this._cache.delete(sch.schema);
          delete this.schemas[schemaKeyRef];
          delete this.refs[schemaKeyRef];
          return this;
        }
        case "object": {
          const cacheKey = schemaKeyRef;
          this._cache.delete(cacheKey);
          let id = schemaKeyRef[this.opts.schemaId];
          if (id) {
            id = (0, resolve_1.normalizeId)(id);
            delete this.schemas[id];
            delete this.refs[id];
          }
          return this;
        }
        default:
          throw new Error("ajv.removeSchema: invalid parameter");
      }
    }
    addVocabulary(definitions) {
      for (const def of definitions) this.addKeyword(def);
      return this;
    }
    addKeyword(kwdOrDef, def) {
      let keyword;
      if (typeof kwdOrDef == "string") {
        keyword = kwdOrDef;
        if (typeof def == "object") {
          this.logger.warn("these parameters are deprecated, see docs for addKeyword");
          def.keyword = keyword;
        }
      } else if (typeof kwdOrDef == "object" && def === void 0) {
        def = kwdOrDef;
        keyword = def.keyword;
        if (Array.isArray(keyword) && !keyword.length) throw new Error("addKeywords: keyword must be string or non-empty array");
      } else throw new Error("invalid addKeywords parameters");
      checkKeyword.call(this, keyword, def);
      if (!def) {
        (0, util_1.eachItem)(keyword, (kwd) => addRule.call(this, kwd));
        return this;
      }
      keywordMetaschema.call(this, def);
      const definition = {
        ...def,
        type: (0, dataType_1.getJSONTypes)(def.type),
        schemaType: (0, dataType_1.getJSONTypes)(def.schemaType)
      };
      (0, util_1.eachItem)(keyword, definition.type.length === 0 ? (k) => addRule.call(this, k, definition) : (k) => definition.type.forEach((t) => addRule.call(this, k, definition, t)));
      return this;
    }
    getKeyword(keyword) {
      const rule = this.RULES.all[keyword];
      return typeof rule == "object" ? rule.definition : !!rule;
    }
    removeKeyword(keyword) {
      const { RULES } = this;
      delete RULES.keywords[keyword];
      delete RULES.all[keyword];
      for (const group of RULES.rules) {
        const i = group.rules.findIndex((rule) => rule.keyword === keyword);
        if (i >= 0) group.rules.splice(i, 1);
      }
      return this;
    }
    addFormat(name, format) {
      if (typeof format == "string") format = new RegExp(format);
      this.formats[name] = format;
      return this;
    }
    errorsText(errors = this.errors, { separator = ", ", dataVar = "data" } = {}) {
      if (!errors || errors.length === 0) return "No errors";
      return errors.map((e) => `${dataVar}${e.instancePath} ${e.message}`).reduce((text, msg) => text + separator + msg);
    }
    $dataMetaSchema(metaSchema, keywordsJsonPointers) {
      const rules = this.RULES.all;
      metaSchema = JSON.parse(JSON.stringify(metaSchema));
      for (const jsonPointer of keywordsJsonPointers) {
        const segments = jsonPointer.split("/").slice(1);
        let keywords = metaSchema;
        for (const seg of segments) keywords = keywords[seg];
        for (const key in rules) {
          const rule = rules[key];
          if (typeof rule != "object") continue;
          const { $data } = rule.definition;
          const schema = keywords[key];
          if ($data && schema) keywords[key] = schemaOrData(schema);
        }
      }
      return metaSchema;
    }
    _removeAllSchemas(schemas, regex) {
      for (const keyRef in schemas) {
        const sch = schemas[keyRef];
        if (!regex || regex.test(keyRef)) {
          if (typeof sch == "string") delete schemas[keyRef];
          else if (sch && !sch.meta) {
            this._cache.delete(sch.schema);
            delete schemas[keyRef];
          }
        }
      }
    }
    _addSchema(schema, meta3, baseId, validateSchema = this.opts.validateSchema, addSchema = this.opts.addUsedSchema) {
      let id;
      const { schemaId } = this.opts;
      if (typeof schema == "object") id = schema[schemaId];
      else if (this.opts.jtd) throw new Error("schema must be object");
      else if (typeof schema != "boolean") throw new Error("schema must be object or boolean");
      let sch = this._cache.get(schema);
      if (sch !== void 0) return sch;
      baseId = (0, resolve_1.normalizeId)(id || baseId);
      const localRefs = resolve_1.getSchemaRefs.call(this, schema, baseId);
      sch = new compile_1.SchemaEnv({
        schema,
        schemaId,
        meta: meta3,
        baseId,
        localRefs
      });
      this._cache.set(sch.schema, sch);
      if (addSchema && !baseId.startsWith("#")) {
        if (baseId) this._checkUnique(baseId);
        this.refs[baseId] = sch;
      }
      if (validateSchema) this.validateSchema(schema, true);
      return sch;
    }
    _checkUnique(id) {
      if (this.schemas[id] || this.refs[id]) throw new Error(`schema with key or id "${id}" already exists`);
    }
    _compileSchemaEnv(sch) {
      if (sch.meta) this._compileMetaSchema(sch);
      else compile_1.compileSchema.call(this, sch);
      if (!sch.validate) throw new Error("ajv implementation error");
      return sch.validate;
    }
    _compileMetaSchema(sch) {
      const currentOpts = this.opts;
      this.opts = this._metaOpts;
      try {
        compile_1.compileSchema.call(this, sch);
      } finally {
        this.opts = currentOpts;
      }
    }
  };
  Ajv.ValidationError = validation_error_1.default;
  Ajv.MissingRefError = ref_error_1.default;
  exports2.default = Ajv;
  function checkOptions(checkOpts, options, msg, log = "error") {
    for (const key in checkOpts) {
      const opt = key;
      if (opt in options) this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
    }
  }
  function getSchEnv(keyRef) {
    keyRef = (0, resolve_1.normalizeId)(keyRef);
    return this.schemas[keyRef] || this.refs[keyRef];
  }
  function addInitialSchemas() {
    const optsSchemas = this.opts.schemas;
    if (!optsSchemas) return;
    if (Array.isArray(optsSchemas)) this.addSchema(optsSchemas);
    else for (const key in optsSchemas) this.addSchema(optsSchemas[key], key);
  }
  function addInitialFormats() {
    for (const name in this.opts.formats) {
      const format = this.opts.formats[name];
      if (format) this.addFormat(name, format);
    }
  }
  function addInitialKeywords(defs) {
    if (Array.isArray(defs)) {
      this.addVocabulary(defs);
      return;
    }
    this.logger.warn("keywords option as map is deprecated, pass array");
    for (const keyword in defs) {
      const def = defs[keyword];
      if (!def.keyword) def.keyword = keyword;
      this.addKeyword(def);
    }
  }
  function getMetaSchemaOptions() {
    const metaOpts = { ...this.opts };
    for (const opt of META_IGNORE_OPTIONS) delete metaOpts[opt];
    return metaOpts;
  }
  const noLogs = {
    log() {
    },
    warn() {
    },
    error() {
    }
  };
  function getLogger(logger) {
    if (logger === false) return noLogs;
    if (logger === void 0) return console;
    if (logger.log && logger.warn && logger.error) return logger;
    throw new Error("logger must implement log, warn and error methods");
  }
  const KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
  function checkKeyword(keyword, def) {
    const { RULES } = this;
    (0, util_1.eachItem)(keyword, (kwd) => {
      if (RULES.keywords[kwd]) throw new Error(`Keyword ${kwd} is already defined`);
      if (!KEYWORD_NAME.test(kwd)) throw new Error(`Keyword ${kwd} has invalid name`);
    });
    if (!def) return;
    if (def.$data && !("code" in def || "validate" in def)) throw new Error('$data keyword must have "code" or "validate" function');
  }
  function addRule(keyword, definition, dataType) {
    var _a2;
    const post = definition === null || definition === void 0 ? void 0 : definition.post;
    if (dataType && post) throw new Error('keyword with "post" flag cannot have "type"');
    const { RULES } = this;
    let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t }) => t === dataType);
    if (!ruleGroup) {
      ruleGroup = {
        type: dataType,
        rules: []
      };
      RULES.rules.push(ruleGroup);
    }
    RULES.keywords[keyword] = true;
    if (!definition) return;
    const rule = {
      keyword,
      definition: {
        ...definition,
        type: (0, dataType_1.getJSONTypes)(definition.type),
        schemaType: (0, dataType_1.getJSONTypes)(definition.schemaType)
      }
    };
    if (definition.before) addBeforeRule.call(this, ruleGroup, rule, definition.before);
    else ruleGroup.rules.push(rule);
    RULES.all[keyword] = rule;
    (_a2 = definition.implements) === null || _a2 === void 0 || _a2.forEach((kwd) => this.addKeyword(kwd));
  }
  function addBeforeRule(ruleGroup, rule, before) {
    const i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
    if (i >= 0) ruleGroup.rules.splice(i, 0, rule);
    else {
      ruleGroup.rules.push(rule);
      this.logger.warn(`rule ${before} is not defined`);
    }
  }
  function keywordMetaschema(def) {
    let { metaSchema } = def;
    if (metaSchema === void 0) return;
    if (def.$data && this.opts.$data) metaSchema = schemaOrData(metaSchema);
    def.validateSchema = this.compile(metaSchema, true);
  }
  const $dataRef = { $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#" };
  function schemaOrData(schema) {
    return { anyOf: [schema, $dataRef] };
  }
}));
var require_id = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const def = {
    keyword: "id",
    code() {
      throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
    }
  };
  exports2.default = def;
}));
var require_ref = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.callRef = exports2.getValidate = void 0;
  const ref_error_1 = require_ref_error();
  const code_1 = require_code();
  const codegen_1 = require_codegen();
  const names_1 = require_names();
  const compile_1 = require_compile();
  const util_1 = require_util();
  const def = {
    keyword: "$ref",
    schemaType: "string",
    code(cxt) {
      const { gen, schema: $ref, it } = cxt;
      const { baseId, schemaEnv: env, validateName, opts, self } = it;
      const { root } = env;
      if (($ref === "#" || $ref === "#/") && baseId === root.baseId) return callRootRef();
      const schOrEnv = compile_1.resolveRef.call(self, root, baseId, $ref);
      if (schOrEnv === void 0) throw new ref_error_1.default(it.opts.uriResolver, baseId, $ref);
      if (schOrEnv instanceof compile_1.SchemaEnv) return callValidate(schOrEnv);
      return inlineRefSchema(schOrEnv);
      function callRootRef() {
        if (env === root) return callRef(cxt, validateName, env, env.$async);
        const rootName = gen.scopeValue("root", { ref: root });
        return callRef(cxt, (0, codegen_1._)`${rootName}.validate`, root, root.$async);
      }
      function callValidate(sch) {
        callRef(cxt, getValidate(cxt, sch), sch, sch.$async);
      }
      function inlineRefSchema(sch) {
        const schName = gen.scopeValue("schema", opts.code.source === true ? {
          ref: sch,
          code: (0, codegen_1.stringify)(sch)
        } : { ref: sch });
        const valid = gen.name("valid");
        const schCxt = cxt.subschema({
          schema: sch,
          dataTypes: [],
          schemaPath: codegen_1.nil,
          topSchemaRef: schName,
          errSchemaPath: $ref
        }, valid);
        cxt.mergeEvaluated(schCxt);
        cxt.ok(valid);
      }
    }
  };
  function getValidate(cxt, sch) {
    const { gen } = cxt;
    return sch.validate ? gen.scopeValue("validate", { ref: sch.validate }) : (0, codegen_1._)`${gen.scopeValue("wrapper", { ref: sch })}.validate`;
  }
  exports2.getValidate = getValidate;
  function callRef(cxt, v, sch, $async) {
    const { gen, it } = cxt;
    const { allErrors, schemaEnv: env, opts } = it;
    const passCxt = opts.passContext ? names_1.default.this : codegen_1.nil;
    if ($async) callAsyncRef();
    else callSyncRef();
    function callAsyncRef() {
      if (!env.$async) throw new Error("async schema referenced by sync schema");
      const valid = gen.let("valid");
      gen.try(() => {
        gen.code((0, codegen_1._)`await ${(0, code_1.callValidateCode)(cxt, v, passCxt)}`);
        addEvaluatedFrom(v);
        if (!allErrors) gen.assign(valid, true);
      }, (e) => {
        gen.if((0, codegen_1._)`!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e));
        addErrorsFrom(e);
        if (!allErrors) gen.assign(valid, false);
      });
      cxt.ok(valid);
    }
    function callSyncRef() {
      cxt.result((0, code_1.callValidateCode)(cxt, v, passCxt), () => addEvaluatedFrom(v), () => addErrorsFrom(v));
    }
    function addErrorsFrom(source) {
      const errs = (0, codegen_1._)`${source}.errors`;
      gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`);
      gen.assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
    }
    function addEvaluatedFrom(source) {
      var _a2;
      if (!it.opts.unevaluated) return;
      const schEvaluated = (_a2 = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a2 === void 0 ? void 0 : _a2.evaluated;
      if (it.props !== true) if (schEvaluated && !schEvaluated.dynamicProps) {
        if (schEvaluated.props !== void 0) it.props = util_1.mergeEvaluated.props(gen, schEvaluated.props, it.props);
      } else {
        const props = gen.var("props", (0, codegen_1._)`${source}.evaluated.props`);
        it.props = util_1.mergeEvaluated.props(gen, props, it.props, codegen_1.Name);
      }
      if (it.items !== true) if (schEvaluated && !schEvaluated.dynamicItems) {
        if (schEvaluated.items !== void 0) it.items = util_1.mergeEvaluated.items(gen, schEvaluated.items, it.items);
      } else {
        const items = gen.var("items", (0, codegen_1._)`${source}.evaluated.items`);
        it.items = util_1.mergeEvaluated.items(gen, items, it.items, codegen_1.Name);
      }
    }
  }
  exports2.callRef = callRef;
  exports2.default = def;
}));
var require_core = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const id_1 = require_id();
  const ref_1 = require_ref();
  const core = [
    "$schema",
    "$id",
    "$defs",
    "$vocabulary",
    { keyword: "$comment" },
    "definitions",
    id_1.default,
    ref_1.default
  ];
  exports2.default = core;
}));
var require_limitNumber = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const codegen_1 = require_codegen();
  const ops = codegen_1.operators;
  const KWDs = {
    maximum: {
      okStr: "<=",
      ok: ops.LTE,
      fail: ops.GT
    },
    minimum: {
      okStr: ">=",
      ok: ops.GTE,
      fail: ops.LT
    },
    exclusiveMaximum: {
      okStr: "<",
      ok: ops.LT,
      fail: ops.GTE
    },
    exclusiveMinimum: {
      okStr: ">",
      ok: ops.GT,
      fail: ops.LTE
    }
  };
  const def = {
    keyword: Object.keys(KWDs),
    type: "number",
    schemaType: "number",
    $data: true,
    error: {
      message: ({ keyword, schemaCode }) => (0, codegen_1.str)`must be ${KWDs[keyword].okStr} ${schemaCode}`,
      params: ({ keyword, schemaCode }) => (0, codegen_1._)`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`
    },
    code(cxt) {
      const { keyword, data, schemaCode } = cxt;
      cxt.fail$data((0, codegen_1._)`${data} ${KWDs[keyword].fail} ${schemaCode} || isNaN(${data})`);
    }
  };
  exports2.default = def;
}));
var require_multipleOf = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const codegen_1 = require_codegen();
  const def = {
    keyword: "multipleOf",
    type: "number",
    schemaType: "number",
    $data: true,
    error: {
      message: ({ schemaCode }) => (0, codegen_1.str)`must be multiple of ${schemaCode}`,
      params: ({ schemaCode }) => (0, codegen_1._)`{multipleOf: ${schemaCode}}`
    },
    code(cxt) {
      const { gen, data, schemaCode, it } = cxt;
      const prec = it.opts.multipleOfPrecision;
      const res = gen.let("res");
      const invalid = prec ? (0, codegen_1._)`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}` : (0, codegen_1._)`${res} !== parseInt(${res})`;
      cxt.fail$data((0, codegen_1._)`(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
    }
  };
  exports2.default = def;
}));
var require_ucs2length = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  function ucs2length(str) {
    const len = str.length;
    let length = 0;
    let pos = 0;
    let value;
    while (pos < len) {
      length++;
      value = str.charCodeAt(pos++);
      if (value >= 55296 && value <= 56319 && pos < len) {
        value = str.charCodeAt(pos);
        if ((value & 64512) === 56320) pos++;
      }
    }
    return length;
  }
  exports2.default = ucs2length;
  ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default';
}));
var require_limitLength = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  const ucs2length_1 = require_ucs2length();
  const def = {
    keyword: ["maxLength", "minLength"],
    type: "string",
    schemaType: "number",
    $data: true,
    error: {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxLength" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} characters`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    },
    code(cxt) {
      const { keyword, data, schemaCode, it } = cxt;
      const op = keyword === "maxLength" ? codegen_1.operators.GT : codegen_1.operators.LT;
      const len = it.opts.unicode === false ? (0, codegen_1._)`${data}.length` : (0, codegen_1._)`${(0, util_1.useFunc)(cxt.gen, ucs2length_1.default)}(${data})`;
      cxt.fail$data((0, codegen_1._)`${len} ${op} ${schemaCode}`);
    }
  };
  exports2.default = def;
}));
var require_pattern = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const code_1 = require_code();
  const util_1 = require_util();
  const codegen_1 = require_codegen();
  const def = {
    keyword: "pattern",
    type: "string",
    schemaType: "string",
    $data: true,
    error: {
      message: ({ schemaCode }) => (0, codegen_1.str)`must match pattern "${schemaCode}"`,
      params: ({ schemaCode }) => (0, codegen_1._)`{pattern: ${schemaCode}}`
    },
    code(cxt) {
      const { gen, data, $data, schema, schemaCode, it } = cxt;
      const u = it.opts.unicodeRegExp ? "u" : "";
      if ($data) {
        const { regExp } = it.opts.code;
        const regExpCode = regExp.code === "new RegExp" ? (0, codegen_1._)`new RegExp` : (0, util_1.useFunc)(gen, regExp);
        const valid = gen.let("valid");
        gen.try(() => gen.assign(valid, (0, codegen_1._)`${regExpCode}(${schemaCode}, ${u}).test(${data})`), () => gen.assign(valid, false));
        cxt.fail$data((0, codegen_1._)`!${valid}`);
      } else {
        const regExp = (0, code_1.usePattern)(cxt, schema);
        cxt.fail$data((0, codegen_1._)`!${regExp}.test(${data})`);
      }
    }
  };
  exports2.default = def;
}));
var require_limitProperties = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const codegen_1 = require_codegen();
  const def = {
    keyword: ["maxProperties", "minProperties"],
    type: "object",
    schemaType: "number",
    $data: true,
    error: {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxProperties" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} properties`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    },
    code(cxt) {
      const { keyword, data, schemaCode } = cxt;
      const op = keyword === "maxProperties" ? codegen_1.operators.GT : codegen_1.operators.LT;
      cxt.fail$data((0, codegen_1._)`Object.keys(${data}).length ${op} ${schemaCode}`);
    }
  };
  exports2.default = def;
}));
var require_required = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const code_1 = require_code();
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  const def = {
    keyword: "required",
    type: "object",
    schemaType: "array",
    $data: true,
    error: {
      message: ({ params: { missingProperty } }) => (0, codegen_1.str)`must have required property '${missingProperty}'`,
      params: ({ params: { missingProperty } }) => (0, codegen_1._)`{missingProperty: ${missingProperty}}`
    },
    code(cxt) {
      const { gen, schema, schemaCode, data, $data, it } = cxt;
      const { opts } = it;
      if (!$data && schema.length === 0) return;
      const useLoop = schema.length >= opts.loopRequired;
      if (it.allErrors) allErrorsMode();
      else exitOnErrorMode();
      if (opts.strictRequired) {
        const props = cxt.parentSchema.properties;
        const { definedProperties } = cxt.it;
        for (const requiredKey of schema) if ((props === null || props === void 0 ? void 0 : props[requiredKey]) === void 0 && !definedProperties.has(requiredKey)) {
          const msg = `required property "${requiredKey}" is not defined at "${it.schemaEnv.baseId + it.errSchemaPath}" (strictRequired)`;
          (0, util_1.checkStrictMode)(it, msg, it.opts.strictRequired);
        }
      }
      function allErrorsMode() {
        if (useLoop || $data) cxt.block$data(codegen_1.nil, loopAllRequired);
        else for (const prop of schema) (0, code_1.checkReportMissingProp)(cxt, prop);
      }
      function exitOnErrorMode() {
        const missing = gen.let("missing");
        if (useLoop || $data) {
          const valid = gen.let("valid", true);
          cxt.block$data(valid, () => loopUntilMissing(missing, valid));
          cxt.ok(valid);
        } else {
          gen.if((0, code_1.checkMissingProp)(cxt, schema, missing));
          (0, code_1.reportMissingProp)(cxt, missing);
          gen.else();
        }
      }
      function loopAllRequired() {
        gen.forOf("prop", schemaCode, (prop) => {
          cxt.setParams({ missingProperty: prop });
          gen.if((0, code_1.noPropertyInData)(gen, data, prop, opts.ownProperties), () => cxt.error());
        });
      }
      function loopUntilMissing(missing, valid) {
        cxt.setParams({ missingProperty: missing });
        gen.forOf(missing, schemaCode, () => {
          gen.assign(valid, (0, code_1.propertyInData)(gen, data, missing, opts.ownProperties));
          gen.if((0, codegen_1.not)(valid), () => {
            cxt.error();
            gen.break();
          });
        }, codegen_1.nil);
      }
    }
  };
  exports2.default = def;
}));
var require_limitItems = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const codegen_1 = require_codegen();
  const def = {
    keyword: ["maxItems", "minItems"],
    type: "array",
    schemaType: "number",
    $data: true,
    error: {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxItems" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} items`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    },
    code(cxt) {
      const { keyword, data, schemaCode } = cxt;
      const op = keyword === "maxItems" ? codegen_1.operators.GT : codegen_1.operators.LT;
      cxt.fail$data((0, codegen_1._)`${data}.length ${op} ${schemaCode}`);
    }
  };
  exports2.default = def;
}));
var require_equal = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const equal = require_fast_deep_equal();
  equal.code = 'require("ajv/dist/runtime/equal").default';
  exports2.default = equal;
}));
var require_uniqueItems = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const dataType_1 = require_dataType();
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  const equal_1 = require_equal();
  const def = {
    keyword: "uniqueItems",
    type: "array",
    schemaType: "boolean",
    $data: true,
    error: {
      message: ({ params: { i, j } }) => (0, codegen_1.str)`must NOT have duplicate items (items ## ${j} and ${i} are identical)`,
      params: ({ params: { i, j } }) => (0, codegen_1._)`{i: ${i}, j: ${j}}`
    },
    code(cxt) {
      const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
      if (!$data && !schema) return;
      const valid = gen.let("valid");
      const itemTypes = parentSchema.items ? (0, dataType_1.getSchemaTypes)(parentSchema.items) : [];
      cxt.block$data(valid, validateUniqueItems, (0, codegen_1._)`${schemaCode} === false`);
      cxt.ok(valid);
      function validateUniqueItems() {
        const i = gen.let("i", (0, codegen_1._)`${data}.length`);
        const j = gen.let("j");
        cxt.setParams({
          i,
          j
        });
        gen.assign(valid, true);
        gen.if((0, codegen_1._)`${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j));
      }
      function canOptimize() {
        return itemTypes.length > 0 && !itemTypes.some((t) => t === "object" || t === "array");
      }
      function loopN(i, j) {
        const item = gen.name("item");
        const wrongType = (0, dataType_1.checkDataTypes)(itemTypes, item, it.opts.strictNumbers, dataType_1.DataType.Wrong);
        const indices = gen.const("indices", (0, codegen_1._)`{}`);
        gen.for((0, codegen_1._)`;${i}--;`, () => {
          gen.let(item, (0, codegen_1._)`${data}[${i}]`);
          gen.if(wrongType, (0, codegen_1._)`continue`);
          if (itemTypes.length > 1) gen.if((0, codegen_1._)`typeof ${item} == "string"`, (0, codegen_1._)`${item} += "_"`);
          gen.if((0, codegen_1._)`typeof ${indices}[${item}] == "number"`, () => {
            gen.assign(j, (0, codegen_1._)`${indices}[${item}]`);
            cxt.error();
            gen.assign(valid, false).break();
          }).code((0, codegen_1._)`${indices}[${item}] = ${i}`);
        });
      }
      function loopN2(i, j) {
        const eql = (0, util_1.useFunc)(gen, equal_1.default);
        const outer = gen.name("outer");
        gen.label(outer).for((0, codegen_1._)`;${i}--;`, () => gen.for((0, codegen_1._)`${j} = ${i}; ${j}--;`, () => gen.if((0, codegen_1._)`${eql}(${data}[${i}], ${data}[${j}])`, () => {
          cxt.error();
          gen.assign(valid, false).break(outer);
        })));
      }
    }
  };
  exports2.default = def;
}));
var require_const = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  const equal_1 = require_equal();
  const def = {
    keyword: "const",
    $data: true,
    error: {
      message: "must be equal to constant",
      params: ({ schemaCode }) => (0, codegen_1._)`{allowedValue: ${schemaCode}}`
    },
    code(cxt) {
      const { gen, data, $data, schemaCode, schema } = cxt;
      if ($data || schema && typeof schema == "object") cxt.fail$data((0, codegen_1._)`!${(0, util_1.useFunc)(gen, equal_1.default)}(${data}, ${schemaCode})`);
      else cxt.fail((0, codegen_1._)`${schema} !== ${data}`);
    }
  };
  exports2.default = def;
}));
var require_enum = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  const equal_1 = require_equal();
  const def = {
    keyword: "enum",
    schemaType: "array",
    $data: true,
    error: {
      message: "must be equal to one of the allowed values",
      params: ({ schemaCode }) => (0, codegen_1._)`{allowedValues: ${schemaCode}}`
    },
    code(cxt) {
      const { gen, data, $data, schema, schemaCode, it } = cxt;
      if (!$data && schema.length === 0) throw new Error("enum must have non-empty array");
      const useLoop = schema.length >= it.opts.loopEnum;
      let eql;
      const getEql = () => eql !== null && eql !== void 0 ? eql : eql = (0, util_1.useFunc)(gen, equal_1.default);
      let valid;
      if (useLoop || $data) {
        valid = gen.let("valid");
        cxt.block$data(valid, loopEnum);
      } else {
        if (!Array.isArray(schema)) throw new Error("ajv implementation error");
        const vSchema = gen.const("vSchema", schemaCode);
        valid = (0, codegen_1.or)(...schema.map((_x, i) => equalCode(vSchema, i)));
      }
      cxt.pass(valid);
      function loopEnum() {
        gen.assign(valid, false);
        gen.forOf("v", schemaCode, (v) => gen.if((0, codegen_1._)`${getEql()}(${data}, ${v})`, () => gen.assign(valid, true).break()));
      }
      function equalCode(vSchema, i) {
        const sch = schema[i];
        return typeof sch === "object" && sch !== null ? (0, codegen_1._)`${getEql()}(${data}, ${vSchema}[${i}])` : (0, codegen_1._)`${data} === ${sch}`;
      }
    }
  };
  exports2.default = def;
}));
var require_validation = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const limitNumber_1 = require_limitNumber();
  const multipleOf_1 = require_multipleOf();
  const limitLength_1 = require_limitLength();
  const pattern_1 = require_pattern();
  const limitProperties_1 = require_limitProperties();
  const required_1 = require_required();
  const limitItems_1 = require_limitItems();
  const uniqueItems_1 = require_uniqueItems();
  const const_1 = require_const();
  const enum_1 = require_enum();
  const validation = [
    limitNumber_1.default,
    multipleOf_1.default,
    limitLength_1.default,
    pattern_1.default,
    limitProperties_1.default,
    required_1.default,
    limitItems_1.default,
    uniqueItems_1.default,
    {
      keyword: "type",
      schemaType: ["string", "array"]
    },
    {
      keyword: "nullable",
      schemaType: "boolean"
    },
    const_1.default,
    enum_1.default
  ];
  exports2.default = validation;
}));
var require_additionalItems = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.validateAdditionalItems = void 0;
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  const def = {
    keyword: "additionalItems",
    type: "array",
    schemaType: ["boolean", "object"],
    before: "uniqueItems",
    error: {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    },
    code(cxt) {
      const { parentSchema, it } = cxt;
      const { items } = parentSchema;
      if (!Array.isArray(items)) {
        (0, util_1.checkStrictMode)(it, '"additionalItems" is ignored when "items" is not an array of schemas');
        return;
      }
      validateAdditionalItems(cxt, items);
    }
  };
  function validateAdditionalItems(cxt, items) {
    const { gen, schema, data, keyword, it } = cxt;
    it.items = true;
    const len = gen.const("len", (0, codegen_1._)`${data}.length`);
    if (schema === false) {
      cxt.setParams({ len: items.length });
      cxt.pass((0, codegen_1._)`${len} <= ${items.length}`);
    } else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
      const valid = gen.var("valid", (0, codegen_1._)`${len} <= ${items.length}`);
      gen.if((0, codegen_1.not)(valid), () => validateItems(valid));
      cxt.ok(valid);
    }
    function validateItems(valid) {
      gen.forRange("i", items.length, len, (i) => {
        cxt.subschema({
          keyword,
          dataProp: i,
          dataPropType: util_1.Type.Num
        }, valid);
        if (!it.allErrors) gen.if((0, codegen_1.not)(valid), () => gen.break());
      });
    }
  }
  exports2.validateAdditionalItems = validateAdditionalItems;
  exports2.default = def;
}));
var require_items = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.validateTuple = void 0;
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  const code_1 = require_code();
  const def = {
    keyword: "items",
    type: "array",
    schemaType: [
      "object",
      "array",
      "boolean"
    ],
    before: "uniqueItems",
    code(cxt) {
      const { schema, it } = cxt;
      if (Array.isArray(schema)) return validateTuple(cxt, "additionalItems", schema);
      it.items = true;
      if ((0, util_1.alwaysValidSchema)(it, schema)) return;
      cxt.ok((0, code_1.validateArray)(cxt));
    }
  };
  function validateTuple(cxt, extraItems, schArr = cxt.schema) {
    const { gen, parentSchema, data, keyword, it } = cxt;
    checkStrictTuple(parentSchema);
    if (it.opts.unevaluated && schArr.length && it.items !== true) it.items = util_1.mergeEvaluated.items(gen, schArr.length, it.items);
    const valid = gen.name("valid");
    const len = gen.const("len", (0, codegen_1._)`${data}.length`);
    schArr.forEach((sch, i) => {
      if ((0, util_1.alwaysValidSchema)(it, sch)) return;
      gen.if((0, codegen_1._)`${len} > ${i}`, () => cxt.subschema({
        keyword,
        schemaProp: i,
        dataProp: i
      }, valid));
      cxt.ok(valid);
    });
    function checkStrictTuple(sch) {
      const { opts, errSchemaPath } = it;
      const l = schArr.length;
      const fullTuple = l === sch.minItems && (l === sch.maxItems || sch[extraItems] === false);
      if (opts.strictTuples && !fullTuple) {
        const msg = `"${keyword}" is ${l}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
        (0, util_1.checkStrictMode)(it, msg, opts.strictTuples);
      }
    }
  }
  exports2.validateTuple = validateTuple;
  exports2.default = def;
}));
var require_prefixItems = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const items_1 = require_items();
  const def = {
    keyword: "prefixItems",
    type: "array",
    schemaType: ["array"],
    before: "uniqueItems",
    code: (cxt) => (0, items_1.validateTuple)(cxt, "items")
  };
  exports2.default = def;
}));
var require_items2020 = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  const code_1 = require_code();
  const additionalItems_1 = require_additionalItems();
  const def = {
    keyword: "items",
    type: "array",
    schemaType: ["object", "boolean"],
    before: "uniqueItems",
    error: {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    },
    code(cxt) {
      const { schema, parentSchema, it } = cxt;
      const { prefixItems } = parentSchema;
      it.items = true;
      if ((0, util_1.alwaysValidSchema)(it, schema)) return;
      if (prefixItems) (0, additionalItems_1.validateAdditionalItems)(cxt, prefixItems);
      else cxt.ok((0, code_1.validateArray)(cxt));
    }
  };
  exports2.default = def;
}));
var require_contains = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  const def = {
    keyword: "contains",
    type: "array",
    schemaType: ["object", "boolean"],
    before: "uniqueItems",
    trackErrors: true,
    error: {
      message: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1.str)`must contain at least ${min} valid item(s)` : (0, codegen_1.str)`must contain at least ${min} and no more than ${max} valid item(s)`,
      params: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1._)`{minContains: ${min}}` : (0, codegen_1._)`{minContains: ${min}, maxContains: ${max}}`
    },
    code(cxt) {
      const { gen, schema, parentSchema, data, it } = cxt;
      let min;
      let max;
      const { minContains, maxContains } = parentSchema;
      if (it.opts.next) {
        min = minContains === void 0 ? 1 : minContains;
        max = maxContains;
      } else min = 1;
      const len = gen.const("len", (0, codegen_1._)`${data}.length`);
      cxt.setParams({
        min,
        max
      });
      if (max === void 0 && min === 0) {
        (0, util_1.checkStrictMode)(it, `"minContains" == 0 without "maxContains": "contains" keyword ignored`);
        return;
      }
      if (max !== void 0 && min > max) {
        (0, util_1.checkStrictMode)(it, `"minContains" > "maxContains" is always invalid`);
        cxt.fail();
        return;
      }
      if ((0, util_1.alwaysValidSchema)(it, schema)) {
        let cond = (0, codegen_1._)`${len} >= ${min}`;
        if (max !== void 0) cond = (0, codegen_1._)`${cond} && ${len} <= ${max}`;
        cxt.pass(cond);
        return;
      }
      it.items = true;
      const valid = gen.name("valid");
      if (max === void 0 && min === 1) validateItems(valid, () => gen.if(valid, () => gen.break()));
      else if (min === 0) {
        gen.let(valid, true);
        if (max !== void 0) gen.if((0, codegen_1._)`${data}.length > 0`, validateItemsWithCount);
      } else {
        gen.let(valid, false);
        validateItemsWithCount();
      }
      cxt.result(valid, () => cxt.reset());
      function validateItemsWithCount() {
        const schValid = gen.name("_valid");
        const count = gen.let("count", 0);
        validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
      }
      function validateItems(_valid, block) {
        gen.forRange("i", 0, len, (i) => {
          cxt.subschema({
            keyword: "contains",
            dataProp: i,
            dataPropType: util_1.Type.Num,
            compositeRule: true
          }, _valid);
          block();
        });
      }
      function checkLimits(count) {
        gen.code((0, codegen_1._)`${count}++`);
        if (max === void 0) gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true).break());
        else {
          gen.if((0, codegen_1._)`${count} > ${max}`, () => gen.assign(valid, false).break());
          if (min === 1) gen.assign(valid, true);
          else gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true));
        }
      }
    }
  };
  exports2.default = def;
}));
var require_dependencies = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.validateSchemaDeps = exports2.validatePropertyDeps = exports2.error = void 0;
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  const code_1 = require_code();
  exports2.error = {
    message: ({ params: { property, depsCount, deps } }) => {
      const property_ies = depsCount === 1 ? "property" : "properties";
      return (0, codegen_1.str)`must have ${property_ies} ${deps} when property ${property} is present`;
    },
    params: ({ params: { property, depsCount, deps, missingProperty } }) => (0, codegen_1._)`{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`
  };
  const def = {
    keyword: "dependencies",
    type: "object",
    schemaType: "object",
    error: exports2.error,
    code(cxt) {
      const [propDeps, schDeps] = splitDependencies(cxt);
      validatePropertyDeps(cxt, propDeps);
      validateSchemaDeps(cxt, schDeps);
    }
  };
  function splitDependencies({ schema }) {
    const propertyDeps = {};
    const schemaDeps = {};
    for (const key in schema) {
      if (key === "__proto__") continue;
      const deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
      deps[key] = schema[key];
    }
    return [propertyDeps, schemaDeps];
  }
  function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
    const { gen, data, it } = cxt;
    if (Object.keys(propertyDeps).length === 0) return;
    const missing = gen.let("missing");
    for (const prop in propertyDeps) {
      const deps = propertyDeps[prop];
      if (deps.length === 0) continue;
      const hasProperty = (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties);
      cxt.setParams({
        property: prop,
        depsCount: deps.length,
        deps: deps.join(", ")
      });
      if (it.allErrors) gen.if(hasProperty, () => {
        for (const depProp of deps) (0, code_1.checkReportMissingProp)(cxt, depProp);
      });
      else {
        gen.if((0, codegen_1._)`${hasProperty} && (${(0, code_1.checkMissingProp)(cxt, deps, missing)})`);
        (0, code_1.reportMissingProp)(cxt, missing);
        gen.else();
      }
    }
  }
  exports2.validatePropertyDeps = validatePropertyDeps;
  function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
    const { gen, data, keyword, it } = cxt;
    const valid = gen.name("valid");
    for (const prop in schemaDeps) {
      if ((0, util_1.alwaysValidSchema)(it, schemaDeps[prop])) continue;
      gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties), () => {
        const schCxt = cxt.subschema({
          keyword,
          schemaProp: prop
        }, valid);
        cxt.mergeValidEvaluated(schCxt, valid);
      }, () => gen.var(valid, true));
      cxt.ok(valid);
    }
  }
  exports2.validateSchemaDeps = validateSchemaDeps;
  exports2.default = def;
}));
var require_propertyNames = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  const def = {
    keyword: "propertyNames",
    type: "object",
    schemaType: ["object", "boolean"],
    error: {
      message: "property name must be valid",
      params: ({ params }) => (0, codegen_1._)`{propertyName: ${params.propertyName}}`
    },
    code(cxt) {
      const { gen, schema, data, it } = cxt;
      if ((0, util_1.alwaysValidSchema)(it, schema)) return;
      const valid = gen.name("valid");
      gen.forIn("key", data, (key) => {
        cxt.setParams({ propertyName: key });
        cxt.subschema({
          keyword: "propertyNames",
          data: key,
          dataTypes: ["string"],
          propertyName: key,
          compositeRule: true
        }, valid);
        gen.if((0, codegen_1.not)(valid), () => {
          cxt.error(true);
          if (!it.allErrors) gen.break();
        });
      });
      cxt.ok(valid);
    }
  };
  exports2.default = def;
}));
var require_additionalProperties = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const code_1 = require_code();
  const codegen_1 = require_codegen();
  const names_1 = require_names();
  const util_1 = require_util();
  const def = {
    keyword: "additionalProperties",
    type: ["object"],
    schemaType: ["boolean", "object"],
    allowUndefined: true,
    trackErrors: true,
    error: {
      message: "must NOT have additional properties",
      params: ({ params }) => (0, codegen_1._)`{additionalProperty: ${params.additionalProperty}}`
    },
    code(cxt) {
      const { gen, schema, parentSchema, data, errsCount, it } = cxt;
      if (!errsCount) throw new Error("ajv implementation error");
      const { allErrors, opts } = it;
      it.props = true;
      if (opts.removeAdditional !== "all" && (0, util_1.alwaysValidSchema)(it, schema)) return;
      const props = (0, code_1.allSchemaProperties)(parentSchema.properties);
      const patProps = (0, code_1.allSchemaProperties)(parentSchema.patternProperties);
      checkAdditionalProperties();
      cxt.ok((0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
      function checkAdditionalProperties() {
        gen.forIn("key", data, (key) => {
          if (!props.length && !patProps.length) additionalPropertyCode(key);
          else gen.if(isAdditional(key), () => additionalPropertyCode(key));
        });
      }
      function isAdditional(key) {
        let definedProp;
        if (props.length > 8) {
          const propsSchema = (0, util_1.schemaRefOrVal)(it, parentSchema.properties, "properties");
          definedProp = (0, code_1.isOwnProperty)(gen, propsSchema, key);
        } else if (props.length) definedProp = (0, codegen_1.or)(...props.map((p) => (0, codegen_1._)`${key} === ${p}`));
        else definedProp = codegen_1.nil;
        if (patProps.length) definedProp = (0, codegen_1.or)(definedProp, ...patProps.map((p) => (0, codegen_1._)`${(0, code_1.usePattern)(cxt, p)}.test(${key})`));
        return (0, codegen_1.not)(definedProp);
      }
      function deleteAdditional(key) {
        gen.code((0, codegen_1._)`delete ${data}[${key}]`);
      }
      function additionalPropertyCode(key) {
        if (opts.removeAdditional === "all" || opts.removeAdditional && schema === false) {
          deleteAdditional(key);
          return;
        }
        if (schema === false) {
          cxt.setParams({ additionalProperty: key });
          cxt.error();
          if (!allErrors) gen.break();
          return;
        }
        if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
          const valid = gen.name("valid");
          if (opts.removeAdditional === "failing") {
            applyAdditionalSchema(key, valid, false);
            gen.if((0, codegen_1.not)(valid), () => {
              cxt.reset();
              deleteAdditional(key);
            });
          } else {
            applyAdditionalSchema(key, valid);
            if (!allErrors) gen.if((0, codegen_1.not)(valid), () => gen.break());
          }
        }
      }
      function applyAdditionalSchema(key, valid, errors) {
        const subschema = {
          keyword: "additionalProperties",
          dataProp: key,
          dataPropType: util_1.Type.Str
        };
        if (errors === false) Object.assign(subschema, {
          compositeRule: true,
          createErrors: false,
          allErrors: false
        });
        cxt.subschema(subschema, valid);
      }
    }
  };
  exports2.default = def;
}));
var require_properties = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const validate_1 = require_validate();
  const code_1 = require_code();
  const util_1 = require_util();
  const additionalProperties_1 = require_additionalProperties();
  const def = {
    keyword: "properties",
    type: "object",
    schemaType: "object",
    code(cxt) {
      const { gen, schema, parentSchema, data, it } = cxt;
      if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === void 0) additionalProperties_1.default.code(new validate_1.KeywordCxt(it, additionalProperties_1.default, "additionalProperties"));
      const allProps = (0, code_1.allSchemaProperties)(schema);
      for (const prop of allProps) it.definedProperties.add(prop);
      if (it.opts.unevaluated && allProps.length && it.props !== true) it.props = util_1.mergeEvaluated.props(gen, (0, util_1.toHash)(allProps), it.props);
      const properties = allProps.filter((p) => !(0, util_1.alwaysValidSchema)(it, schema[p]));
      if (properties.length === 0) return;
      const valid = gen.name("valid");
      for (const prop of properties) {
        if (hasDefault(prop)) applyPropertySchema(prop);
        else {
          gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties));
          applyPropertySchema(prop);
          if (!it.allErrors) gen.else().var(valid, true);
          gen.endIf();
        }
        cxt.it.definedProperties.add(prop);
        cxt.ok(valid);
      }
      function hasDefault(prop) {
        return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== void 0;
      }
      function applyPropertySchema(prop) {
        cxt.subschema({
          keyword: "properties",
          schemaProp: prop,
          dataProp: prop
        }, valid);
      }
    }
  };
  exports2.default = def;
}));
var require_patternProperties = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const code_1 = require_code();
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  const util_2 = require_util();
  const def = {
    keyword: "patternProperties",
    type: "object",
    schemaType: "object",
    code(cxt) {
      const { gen, schema, data, parentSchema, it } = cxt;
      const { opts } = it;
      const patterns = (0, code_1.allSchemaProperties)(schema);
      const alwaysValidPatterns = patterns.filter((p) => (0, util_1.alwaysValidSchema)(it, schema[p]));
      if (patterns.length === 0 || alwaysValidPatterns.length === patterns.length && (!it.opts.unevaluated || it.props === true)) return;
      const checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties;
      const valid = gen.name("valid");
      if (it.props !== true && !(it.props instanceof codegen_1.Name)) it.props = (0, util_2.evaluatedPropsToName)(gen, it.props);
      const { props } = it;
      validatePatternProperties();
      function validatePatternProperties() {
        for (const pat of patterns) {
          if (checkProperties) checkMatchingProperties(pat);
          if (it.allErrors) validateProperties(pat);
          else {
            gen.var(valid, true);
            validateProperties(pat);
            gen.if(valid);
          }
        }
      }
      function checkMatchingProperties(pat) {
        for (const prop in checkProperties) if (new RegExp(pat).test(prop)) (0, util_1.checkStrictMode)(it, `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`);
      }
      function validateProperties(pat) {
        gen.forIn("key", data, (key) => {
          gen.if((0, codegen_1._)`${(0, code_1.usePattern)(cxt, pat)}.test(${key})`, () => {
            const alwaysValid = alwaysValidPatterns.includes(pat);
            if (!alwaysValid) cxt.subschema({
              keyword: "patternProperties",
              schemaProp: pat,
              dataProp: key,
              dataPropType: util_2.Type.Str
            }, valid);
            if (it.opts.unevaluated && props !== true) gen.assign((0, codegen_1._)`${props}[${key}]`, true);
            else if (!alwaysValid && !it.allErrors) gen.if((0, codegen_1.not)(valid), () => gen.break());
          });
        });
      }
    }
  };
  exports2.default = def;
}));
var require_not = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const util_1 = require_util();
  const def = {
    keyword: "not",
    schemaType: ["object", "boolean"],
    trackErrors: true,
    code(cxt) {
      const { gen, schema, it } = cxt;
      if ((0, util_1.alwaysValidSchema)(it, schema)) {
        cxt.fail();
        return;
      }
      const valid = gen.name("valid");
      cxt.subschema({
        keyword: "not",
        compositeRule: true,
        createErrors: false,
        allErrors: false
      }, valid);
      cxt.failResult(valid, () => cxt.reset(), () => cxt.error());
    },
    error: { message: "must NOT be valid" }
  };
  exports2.default = def;
}));
var require_anyOf = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const def = {
    keyword: "anyOf",
    schemaType: "array",
    trackErrors: true,
    code: require_code().validateUnion,
    error: { message: "must match a schema in anyOf" }
  };
  exports2.default = def;
}));
var require_oneOf = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  const def = {
    keyword: "oneOf",
    schemaType: "array",
    trackErrors: true,
    error: {
      message: "must match exactly one schema in oneOf",
      params: ({ params }) => (0, codegen_1._)`{passingSchemas: ${params.passing}}`
    },
    code(cxt) {
      const { gen, schema, parentSchema, it } = cxt;
      if (!Array.isArray(schema)) throw new Error("ajv implementation error");
      if (it.opts.discriminator && parentSchema.discriminator) return;
      const schArr = schema;
      const valid = gen.let("valid", false);
      const passing = gen.let("passing", null);
      const schValid = gen.name("_valid");
      cxt.setParams({ passing });
      gen.block(validateOneOf);
      cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
      function validateOneOf() {
        schArr.forEach((sch, i) => {
          let schCxt;
          if ((0, util_1.alwaysValidSchema)(it, sch)) gen.var(schValid, true);
          else schCxt = cxt.subschema({
            keyword: "oneOf",
            schemaProp: i,
            compositeRule: true
          }, schValid);
          if (i > 0) gen.if((0, codegen_1._)`${schValid} && ${valid}`).assign(valid, false).assign(passing, (0, codegen_1._)`[${passing}, ${i}]`).else();
          gen.if(schValid, () => {
            gen.assign(valid, true);
            gen.assign(passing, i);
            if (schCxt) cxt.mergeEvaluated(schCxt, codegen_1.Name);
          });
        });
      }
    }
  };
  exports2.default = def;
}));
var require_allOf = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const util_1 = require_util();
  const def = {
    keyword: "allOf",
    schemaType: "array",
    code(cxt) {
      const { gen, schema, it } = cxt;
      if (!Array.isArray(schema)) throw new Error("ajv implementation error");
      const valid = gen.name("valid");
      schema.forEach((sch, i) => {
        if ((0, util_1.alwaysValidSchema)(it, sch)) return;
        const schCxt = cxt.subschema({
          keyword: "allOf",
          schemaProp: i
        }, valid);
        cxt.ok(valid);
        cxt.mergeEvaluated(schCxt);
      });
    }
  };
  exports2.default = def;
}));
var require_if = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const codegen_1 = require_codegen();
  const util_1 = require_util();
  const def = {
    keyword: "if",
    schemaType: ["object", "boolean"],
    trackErrors: true,
    error: {
      message: ({ params }) => (0, codegen_1.str)`must match "${params.ifClause}" schema`,
      params: ({ params }) => (0, codegen_1._)`{failingKeyword: ${params.ifClause}}`
    },
    code(cxt) {
      const { gen, parentSchema, it } = cxt;
      if (parentSchema.then === void 0 && parentSchema.else === void 0) (0, util_1.checkStrictMode)(it, '"if" without "then" and "else" is ignored');
      const hasThen = hasSchema(it, "then");
      const hasElse = hasSchema(it, "else");
      if (!hasThen && !hasElse) return;
      const valid = gen.let("valid", true);
      const schValid = gen.name("_valid");
      validateIf();
      cxt.reset();
      if (hasThen && hasElse) {
        const ifClause = gen.let("ifClause");
        cxt.setParams({ ifClause });
        gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
      } else if (hasThen) gen.if(schValid, validateClause("then"));
      else gen.if((0, codegen_1.not)(schValid), validateClause("else"));
      cxt.pass(valid, () => cxt.error(true));
      function validateIf() {
        const schCxt = cxt.subschema({
          keyword: "if",
          compositeRule: true,
          createErrors: false,
          allErrors: false
        }, schValid);
        cxt.mergeEvaluated(schCxt);
      }
      function validateClause(keyword, ifClause) {
        return () => {
          const schCxt = cxt.subschema({ keyword }, schValid);
          gen.assign(valid, schValid);
          cxt.mergeValidEvaluated(schCxt, valid);
          if (ifClause) gen.assign(ifClause, (0, codegen_1._)`${keyword}`);
          else cxt.setParams({ ifClause: keyword });
        };
      }
    }
  };
  function hasSchema(it, keyword) {
    const schema = it.schema[keyword];
    return schema !== void 0 && !(0, util_1.alwaysValidSchema)(it, schema);
  }
  exports2.default = def;
}));
var require_thenElse = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const util_1 = require_util();
  const def = {
    keyword: ["then", "else"],
    schemaType: ["object", "boolean"],
    code({ keyword, parentSchema, it }) {
      if (parentSchema.if === void 0) (0, util_1.checkStrictMode)(it, `"${keyword}" without "if" is ignored`);
    }
  };
  exports2.default = def;
}));
var require_applicator = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const additionalItems_1 = require_additionalItems();
  const prefixItems_1 = require_prefixItems();
  const items_1 = require_items();
  const items2020_1 = require_items2020();
  const contains_1 = require_contains();
  const dependencies_1 = require_dependencies();
  const propertyNames_1 = require_propertyNames();
  const additionalProperties_1 = require_additionalProperties();
  const properties_1 = require_properties();
  const patternProperties_1 = require_patternProperties();
  const not_1 = require_not();
  const anyOf_1 = require_anyOf();
  const oneOf_1 = require_oneOf();
  const allOf_1 = require_allOf();
  const if_1 = require_if();
  const thenElse_1 = require_thenElse();
  function getApplicator(draft2020 = false) {
    const applicator = [
      not_1.default,
      anyOf_1.default,
      oneOf_1.default,
      allOf_1.default,
      if_1.default,
      thenElse_1.default,
      propertyNames_1.default,
      additionalProperties_1.default,
      dependencies_1.default,
      properties_1.default,
      patternProperties_1.default
    ];
    if (draft2020) applicator.push(prefixItems_1.default, items2020_1.default);
    else applicator.push(additionalItems_1.default, items_1.default);
    applicator.push(contains_1.default);
    return applicator;
  }
  exports2.default = getApplicator;
}));
var require_format$1 = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const codegen_1 = require_codegen();
  const def = {
    keyword: "format",
    type: ["number", "string"],
    schemaType: "string",
    $data: true,
    error: {
      message: ({ schemaCode }) => (0, codegen_1.str)`must match format "${schemaCode}"`,
      params: ({ schemaCode }) => (0, codegen_1._)`{format: ${schemaCode}}`
    },
    code(cxt, ruleType) {
      const { gen, data, $data, schema, schemaCode, it } = cxt;
      const { opts, errSchemaPath, schemaEnv, self } = it;
      if (!opts.validateFormats) return;
      if ($data) validate$DataFormat();
      else validateFormat();
      function validate$DataFormat() {
        const fmts = gen.scopeValue("formats", {
          ref: self.formats,
          code: opts.code.formats
        });
        const fDef = gen.const("fDef", (0, codegen_1._)`${fmts}[${schemaCode}]`);
        const fType = gen.let("fType");
        const format = gen.let("format");
        gen.if((0, codegen_1._)`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`, () => gen.assign(fType, (0, codegen_1._)`${fDef}.type || "string"`).assign(format, (0, codegen_1._)`${fDef}.validate`), () => gen.assign(fType, (0, codegen_1._)`"string"`).assign(format, fDef));
        cxt.fail$data((0, codegen_1.or)(unknownFmt(), invalidFmt()));
        function unknownFmt() {
          if (opts.strictSchema === false) return codegen_1.nil;
          return (0, codegen_1._)`${schemaCode} && !${format}`;
        }
        function invalidFmt() {
          const callFormat = schemaEnv.$async ? (0, codegen_1._)`(${fDef}.async ? await ${format}(${data}) : ${format}(${data}))` : (0, codegen_1._)`${format}(${data})`;
          const validData = (0, codegen_1._)`(typeof ${format} == "function" ? ${callFormat} : ${format}.test(${data}))`;
          return (0, codegen_1._)`${format} && ${format} !== true && ${fType} === ${ruleType} && !${validData}`;
        }
      }
      function validateFormat() {
        const formatDef = self.formats[schema];
        if (!formatDef) {
          unknownFormat();
          return;
        }
        if (formatDef === true) return;
        const [fmtType, format, fmtRef] = getFormat(formatDef);
        if (fmtType === ruleType) cxt.pass(validCondition());
        function unknownFormat() {
          if (opts.strictSchema === false) {
            self.logger.warn(unknownMsg());
            return;
          }
          throw new Error(unknownMsg());
          function unknownMsg() {
            return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
          }
        }
        function getFormat(fmtDef) {
          const code = fmtDef instanceof RegExp ? (0, codegen_1.regexpCode)(fmtDef) : opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(schema)}` : void 0;
          const fmt = gen.scopeValue("formats", {
            key: schema,
            ref: fmtDef,
            code
          });
          if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp)) return [
            fmtDef.type || "string",
            fmtDef.validate,
            (0, codegen_1._)`${fmt}.validate`
          ];
          return [
            "string",
            fmtDef,
            fmt
          ];
        }
        function validCondition() {
          if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
            if (!schemaEnv.$async) throw new Error("async format in sync schema");
            return (0, codegen_1._)`await ${fmtRef}(${data})`;
          }
          return typeof format == "function" ? (0, codegen_1._)`${fmtRef}(${data})` : (0, codegen_1._)`${fmtRef}.test(${data})`;
        }
      }
    }
  };
  exports2.default = def;
}));
var require_format = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const format = [require_format$1().default];
  exports2.default = format;
}));
var require_metadata = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.contentVocabulary = exports2.metadataVocabulary = void 0;
  exports2.metadataVocabulary = [
    "title",
    "description",
    "default",
    "deprecated",
    "readOnly",
    "writeOnly",
    "examples"
  ];
  exports2.contentVocabulary = [
    "contentMediaType",
    "contentEncoding",
    "contentSchema"
  ];
}));
var require_draft7 = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const core_1 = require_core();
  const validation_1 = require_validation();
  const applicator_1 = require_applicator();
  const format_1 = require_format();
  const metadata_1 = require_metadata();
  const draft7Vocabularies = [
    core_1.default,
    validation_1.default,
    (0, applicator_1.default)(),
    format_1.default,
    metadata_1.metadataVocabulary,
    metadata_1.contentVocabulary
  ];
  exports2.default = draft7Vocabularies;
}));
var require_types = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.DiscrError = void 0;
  var DiscrError;
  (function(DiscrError2) {
    DiscrError2["Tag"] = "tag";
    DiscrError2["Mapping"] = "mapping";
  })(DiscrError || (exports2.DiscrError = DiscrError = {}));
}));
var require_discriminator = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const codegen_1 = require_codegen();
  const types_1 = require_types();
  const compile_1 = require_compile();
  const ref_error_1 = require_ref_error();
  const util_1 = require_util();
  const def = {
    keyword: "discriminator",
    type: "object",
    schemaType: "object",
    error: {
      message: ({ params: { discrError, tagName } }) => discrError === types_1.DiscrError.Tag ? `tag "${tagName}" must be string` : `value of tag "${tagName}" must be in oneOf`,
      params: ({ params: { discrError, tag, tagName } }) => (0, codegen_1._)`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`
    },
    code(cxt) {
      const { gen, data, schema, parentSchema, it } = cxt;
      const { oneOf } = parentSchema;
      if (!it.opts.discriminator) throw new Error("discriminator: requires discriminator option");
      const tagName = schema.propertyName;
      if (typeof tagName != "string") throw new Error("discriminator: requires propertyName");
      if (schema.mapping) throw new Error("discriminator: mapping is not supported");
      if (!oneOf) throw new Error("discriminator: requires oneOf keyword");
      const valid = gen.let("valid", false);
      const tag = gen.const("tag", (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(tagName)}`);
      gen.if((0, codegen_1._)`typeof ${tag} == "string"`, () => validateMapping(), () => cxt.error(false, {
        discrError: types_1.DiscrError.Tag,
        tag,
        tagName
      }));
      cxt.ok(valid);
      function validateMapping() {
        const mapping = getMapping();
        gen.if(false);
        for (const tagValue in mapping) {
          gen.elseIf((0, codegen_1._)`${tag} === ${tagValue}`);
          gen.assign(valid, applyTagSchema(mapping[tagValue]));
        }
        gen.else();
        cxt.error(false, {
          discrError: types_1.DiscrError.Mapping,
          tag,
          tagName
        });
        gen.endIf();
      }
      function applyTagSchema(schemaProp) {
        const _valid = gen.name("valid");
        const schCxt = cxt.subschema({
          keyword: "oneOf",
          schemaProp
        }, _valid);
        cxt.mergeEvaluated(schCxt, codegen_1.Name);
        return _valid;
      }
      function getMapping() {
        var _a2;
        const oneOfMapping = {};
        const topRequired = hasRequired(parentSchema);
        let tagRequired = true;
        for (let i = 0; i < oneOf.length; i++) {
          let sch = oneOf[i];
          if ((sch === null || sch === void 0 ? void 0 : sch.$ref) && !(0, util_1.schemaHasRulesButRef)(sch, it.self.RULES)) {
            const ref = sch.$ref;
            sch = compile_1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, ref);
            if (sch instanceof compile_1.SchemaEnv) sch = sch.schema;
            if (sch === void 0) throw new ref_error_1.default(it.opts.uriResolver, it.baseId, ref);
          }
          const propSch = (_a2 = sch === null || sch === void 0 ? void 0 : sch.properties) === null || _a2 === void 0 ? void 0 : _a2[tagName];
          if (typeof propSch != "object") throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`);
          tagRequired = tagRequired && (topRequired || hasRequired(sch));
          addMappings(propSch, i);
        }
        if (!tagRequired) throw new Error(`discriminator: "${tagName}" must be required`);
        return oneOfMapping;
        function hasRequired({ required: required2 }) {
          return Array.isArray(required2) && required2.includes(tagName);
        }
        function addMappings(sch, i) {
          if (sch.const) addMapping(sch.const, i);
          else if (sch.enum) for (const tagValue of sch.enum) addMapping(tagValue, i);
          else throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
        }
        function addMapping(tagValue, i) {
          if (typeof tagValue != "string" || tagValue in oneOfMapping) throw new Error(`discriminator: "${tagName}" values must be unique strings`);
          oneOfMapping[tagValue] = i;
        }
      }
    }
  };
  exports2.default = def;
}));
var require_json_schema_draft_07 = /* @__PURE__ */ __commonJSMin(((exports2, module2) => {
  module2.exports = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "http://json-schema.org/draft-07/schema#",
    "title": "Core schema meta-schema",
    "definitions": {
      "schemaArray": {
        "type": "array",
        "minItems": 1,
        "items": { "$ref": "#" }
      },
      "nonNegativeInteger": {
        "type": "integer",
        "minimum": 0
      },
      "nonNegativeIntegerDefault0": { "allOf": [{ "$ref": "#/definitions/nonNegativeInteger" }, { "default": 0 }] },
      "simpleTypes": { "enum": [
        "array",
        "boolean",
        "integer",
        "null",
        "number",
        "object",
        "string"
      ] },
      "stringArray": {
        "type": "array",
        "items": { "type": "string" },
        "uniqueItems": true,
        "default": []
      }
    },
    "type": ["object", "boolean"],
    "properties": {
      "$id": {
        "type": "string",
        "format": "uri-reference"
      },
      "$schema": {
        "type": "string",
        "format": "uri"
      },
      "$ref": {
        "type": "string",
        "format": "uri-reference"
      },
      "$comment": { "type": "string" },
      "title": { "type": "string" },
      "description": { "type": "string" },
      "default": true,
      "readOnly": {
        "type": "boolean",
        "default": false
      },
      "examples": {
        "type": "array",
        "items": true
      },
      "multipleOf": {
        "type": "number",
        "exclusiveMinimum": 0
      },
      "maximum": { "type": "number" },
      "exclusiveMaximum": { "type": "number" },
      "minimum": { "type": "number" },
      "exclusiveMinimum": { "type": "number" },
      "maxLength": { "$ref": "#/definitions/nonNegativeInteger" },
      "minLength": { "$ref": "#/definitions/nonNegativeIntegerDefault0" },
      "pattern": {
        "type": "string",
        "format": "regex"
      },
      "additionalItems": { "$ref": "#" },
      "items": {
        "anyOf": [{ "$ref": "#" }, { "$ref": "#/definitions/schemaArray" }],
        "default": true
      },
      "maxItems": { "$ref": "#/definitions/nonNegativeInteger" },
      "minItems": { "$ref": "#/definitions/nonNegativeIntegerDefault0" },
      "uniqueItems": {
        "type": "boolean",
        "default": false
      },
      "contains": { "$ref": "#" },
      "maxProperties": { "$ref": "#/definitions/nonNegativeInteger" },
      "minProperties": { "$ref": "#/definitions/nonNegativeIntegerDefault0" },
      "required": { "$ref": "#/definitions/stringArray" },
      "additionalProperties": { "$ref": "#" },
      "definitions": {
        "type": "object",
        "additionalProperties": { "$ref": "#" },
        "default": {}
      },
      "properties": {
        "type": "object",
        "additionalProperties": { "$ref": "#" },
        "default": {}
      },
      "patternProperties": {
        "type": "object",
        "additionalProperties": { "$ref": "#" },
        "propertyNames": { "format": "regex" },
        "default": {}
      },
      "dependencies": {
        "type": "object",
        "additionalProperties": { "anyOf": [{ "$ref": "#" }, { "$ref": "#/definitions/stringArray" }] }
      },
      "propertyNames": { "$ref": "#" },
      "const": true,
      "enum": {
        "type": "array",
        "items": true,
        "minItems": 1,
        "uniqueItems": true
      },
      "type": { "anyOf": [{ "$ref": "#/definitions/simpleTypes" }, {
        "type": "array",
        "items": { "$ref": "#/definitions/simpleTypes" },
        "minItems": 1,
        "uniqueItems": true
      }] },
      "format": { "type": "string" },
      "contentMediaType": { "type": "string" },
      "contentEncoding": { "type": "string" },
      "if": { "$ref": "#" },
      "then": { "$ref": "#" },
      "else": { "$ref": "#" },
      "allOf": { "$ref": "#/definitions/schemaArray" },
      "anyOf": { "$ref": "#/definitions/schemaArray" },
      "oneOf": { "$ref": "#/definitions/schemaArray" },
      "not": { "$ref": "#" }
    },
    "default": true
  };
}));
var require_ajv = /* @__PURE__ */ __commonJSMin(((exports2, module2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.MissingRefError = exports2.ValidationError = exports2.CodeGen = exports2.Name = exports2.nil = exports2.stringify = exports2.str = exports2._ = exports2.KeywordCxt = exports2.Ajv = void 0;
  const core_1 = require_core$1();
  const draft7_1 = require_draft7();
  const discriminator_1 = require_discriminator();
  const draft7MetaSchema = require_json_schema_draft_07();
  const META_SUPPORT_DATA = ["/properties"];
  const META_SCHEMA_ID = "http://json-schema.org/draft-07/schema";
  var Ajv = class extends core_1.default {
    _addVocabularies() {
      super._addVocabularies();
      draft7_1.default.forEach((v) => this.addVocabulary(v));
      if (this.opts.discriminator) this.addKeyword(discriminator_1.default);
    }
    _addDefaultMetaSchema() {
      super._addDefaultMetaSchema();
      if (!this.opts.meta) return;
      const metaSchema = this.opts.$data ? this.$dataMetaSchema(draft7MetaSchema, META_SUPPORT_DATA) : draft7MetaSchema;
      this.addMetaSchema(metaSchema, META_SCHEMA_ID, false);
      this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
    }
    defaultMeta() {
      return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0);
    }
  };
  exports2.Ajv = Ajv;
  module2.exports = exports2 = Ajv;
  module2.exports.Ajv = Ajv;
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.default = Ajv;
  var validate_1 = require_validate();
  Object.defineProperty(exports2, "KeywordCxt", {
    enumerable: true,
    get: function() {
      return validate_1.KeywordCxt;
    }
  });
  var codegen_1 = require_codegen();
  Object.defineProperty(exports2, "_", {
    enumerable: true,
    get: function() {
      return codegen_1._;
    }
  });
  Object.defineProperty(exports2, "str", {
    enumerable: true,
    get: function() {
      return codegen_1.str;
    }
  });
  Object.defineProperty(exports2, "stringify", {
    enumerable: true,
    get: function() {
      return codegen_1.stringify;
    }
  });
  Object.defineProperty(exports2, "nil", {
    enumerable: true,
    get: function() {
      return codegen_1.nil;
    }
  });
  Object.defineProperty(exports2, "Name", {
    enumerable: true,
    get: function() {
      return codegen_1.Name;
    }
  });
  Object.defineProperty(exports2, "CodeGen", {
    enumerable: true,
    get: function() {
      return codegen_1.CodeGen;
    }
  });
  var validation_error_1 = require_validation_error();
  Object.defineProperty(exports2, "ValidationError", {
    enumerable: true,
    get: function() {
      return validation_error_1.default;
    }
  });
  var ref_error_1 = require_ref_error();
  Object.defineProperty(exports2, "MissingRefError", {
    enumerable: true,
    get: function() {
      return ref_error_1.default;
    }
  });
}));
var require_formats = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.formatNames = exports2.fastFormats = exports2.fullFormats = void 0;
  function fmtDef(validate, compare) {
    return {
      validate,
      compare
    };
  }
  exports2.fullFormats = {
    date: fmtDef(date5, compareDate),
    time: fmtDef(getTime(true), compareTime),
    "date-time": fmtDef(getDateTime(true), compareDateTime),
    "iso-time": fmtDef(getTime(), compareIsoTime),
    "iso-date-time": fmtDef(getDateTime(), compareIsoDateTime),
    duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
    uri,
    "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
    "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
    url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
    email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
    hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
    ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
    ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
    regex,
    uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
    "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
    "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
    "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
    byte,
    int32: {
      type: "number",
      validate: validateInt32
    },
    int64: {
      type: "number",
      validate: validateInt64
    },
    float: {
      type: "number",
      validate: validateNumber
    },
    double: {
      type: "number",
      validate: validateNumber
    },
    password: true,
    binary: true
  };
  exports2.fastFormats = {
    ...exports2.fullFormats,
    date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
    time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareTime),
    "date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareDateTime),
    "iso-time": fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoTime),
    "iso-date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoDateTime),
    uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
    "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
    email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
  };
  exports2.formatNames = Object.keys(exports2.fullFormats);
  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }
  const DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
  const DAYS = [
    0,
    31,
    28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ];
  function date5(str) {
    const matches = DATE.exec(str);
    if (!matches) return false;
    const year = +matches[1];
    const month = +matches[2];
    const day = +matches[3];
    return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]);
  }
  function compareDate(d1, d2) {
    if (!(d1 && d2)) return void 0;
    if (d1 > d2) return 1;
    if (d1 < d2) return -1;
    return 0;
  }
  const TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
  function getTime(strictTimeZone) {
    return function time3(str) {
      const matches = TIME.exec(str);
      if (!matches) return false;
      const hr = +matches[1];
      const min = +matches[2];
      const sec = +matches[3];
      const tz = matches[4];
      const tzSign = matches[5] === "-" ? -1 : 1;
      const tzH = +(matches[6] || 0);
      const tzM = +(matches[7] || 0);
      if (tzH > 23 || tzM > 59 || strictTimeZone && !tz) return false;
      if (hr <= 23 && min <= 59 && sec < 60) return true;
      const utcMin = min - tzM * tzSign;
      const utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
      return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
    };
  }
  function compareTime(s1, s2) {
    if (!(s1 && s2)) return void 0;
    const t1 = (/* @__PURE__ */ new Date("2020-01-01T" + s1)).valueOf();
    const t2 = (/* @__PURE__ */ new Date("2020-01-01T" + s2)).valueOf();
    if (!(t1 && t2)) return void 0;
    return t1 - t2;
  }
  function compareIsoTime(t1, t2) {
    if (!(t1 && t2)) return void 0;
    const a1 = TIME.exec(t1);
    const a2 = TIME.exec(t2);
    if (!(a1 && a2)) return void 0;
    t1 = a1[1] + a1[2] + a1[3];
    t2 = a2[1] + a2[2] + a2[3];
    if (t1 > t2) return 1;
    if (t1 < t2) return -1;
    return 0;
  }
  const DATE_TIME_SEPARATOR = /t|\s/i;
  function getDateTime(strictTimeZone) {
    const time3 = getTime(strictTimeZone);
    return function date_time(str) {
      const dateTime = str.split(DATE_TIME_SEPARATOR);
      return dateTime.length === 2 && date5(dateTime[0]) && time3(dateTime[1]);
    };
  }
  function compareDateTime(dt1, dt2) {
    if (!(dt1 && dt2)) return void 0;
    const d1 = new Date(dt1).valueOf();
    const d2 = new Date(dt2).valueOf();
    if (!(d1 && d2)) return void 0;
    return d1 - d2;
  }
  function compareIsoDateTime(dt1, dt2) {
    if (!(dt1 && dt2)) return void 0;
    const [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
    const [d2, t2] = dt2.split(DATE_TIME_SEPARATOR);
    const res = compareDate(d1, d2);
    if (res === void 0) return void 0;
    return res || compareTime(t1, t2);
  }
  const NOT_URI_FRAGMENT = /\/|:/;
  const URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  function uri(str) {
    return NOT_URI_FRAGMENT.test(str) && URI.test(str);
  }
  const BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
  function byte(str) {
    BYTE.lastIndex = 0;
    return BYTE.test(str);
  }
  const MIN_INT32 = -(2 ** 31);
  const MAX_INT32 = 2 ** 31 - 1;
  function validateInt32(value) {
    return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
  }
  function validateInt64(value) {
    return Number.isInteger(value);
  }
  function validateNumber() {
    return true;
  }
  const Z_ANCHOR = /[^\\]\\Z/;
  function regex(str) {
    if (Z_ANCHOR.test(str)) return false;
    try {
      new RegExp(str);
      return true;
    } catch (e) {
      return false;
    }
  }
}));
var require_limit = /* @__PURE__ */ __commonJSMin(((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.formatLimitDefinition = void 0;
  const ajv_1 = require_ajv();
  const codegen_1 = require_codegen();
  const ops = codegen_1.operators;
  const KWDs = {
    formatMaximum: {
      okStr: "<=",
      ok: ops.LTE,
      fail: ops.GT
    },
    formatMinimum: {
      okStr: ">=",
      ok: ops.GTE,
      fail: ops.LT
    },
    formatExclusiveMaximum: {
      okStr: "<",
      ok: ops.LT,
      fail: ops.GTE
    },
    formatExclusiveMinimum: {
      okStr: ">",
      ok: ops.GT,
      fail: ops.LTE
    }
  };
  const error2 = {
    message: ({ keyword, schemaCode }) => (0, codegen_1.str)`should be ${KWDs[keyword].okStr} ${schemaCode}`,
    params: ({ keyword, schemaCode }) => (0, codegen_1._)`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`
  };
  exports2.formatLimitDefinition = {
    keyword: Object.keys(KWDs),
    type: "string",
    schemaType: "string",
    $data: true,
    error: error2,
    code(cxt) {
      const { gen, data, schemaCode, keyword, it } = cxt;
      const { opts, self } = it;
      if (!opts.validateFormats) return;
      const fCxt = new ajv_1.KeywordCxt(it, self.RULES.all.format.definition, "format");
      if (fCxt.$data) validate$DataFormat();
      else validateFormat();
      function validate$DataFormat() {
        const fmts = gen.scopeValue("formats", {
          ref: self.formats,
          code: opts.code.formats
        });
        const fmt = gen.const("fmt", (0, codegen_1._)`${fmts}[${fCxt.schemaCode}]`);
        cxt.fail$data((0, codegen_1.or)((0, codegen_1._)`typeof ${fmt} != "object"`, (0, codegen_1._)`${fmt} instanceof RegExp`, (0, codegen_1._)`typeof ${fmt}.compare != "function"`, compareCode(fmt)));
      }
      function validateFormat() {
        const format = fCxt.schema;
        const fmtDef = self.formats[format];
        if (!fmtDef || fmtDef === true) return;
        if (typeof fmtDef != "object" || fmtDef instanceof RegExp || typeof fmtDef.compare != "function") throw new Error(`"${keyword}": format "${format}" does not define "compare" function`);
        const fmt = gen.scopeValue("formats", {
          key: format,
          ref: fmtDef,
          code: opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(format)}` : void 0
        });
        cxt.fail$data(compareCode(fmt));
      }
      function compareCode(fmt) {
        return (0, codegen_1._)`${fmt}.compare(${data}, ${schemaCode}) ${KWDs[keyword].fail} 0`;
      }
    },
    dependencies: ["format"]
  };
  const formatLimitPlugin = (ajv) => {
    ajv.addKeyword(exports2.formatLimitDefinition);
    return ajv;
  };
  exports2.default = formatLimitPlugin;
}));
var require_dist = /* @__PURE__ */ __commonJSMin(((exports2, module2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  const formats_1 = require_formats();
  const limit_1 = require_limit();
  const codegen_1 = require_codegen();
  const fullName = new codegen_1.Name("fullFormats");
  const fastName = new codegen_1.Name("fastFormats");
  const formatsPlugin = (ajv, opts = { keywords: true }) => {
    if (Array.isArray(opts)) {
      addFormats(ajv, opts, formats_1.fullFormats, fullName);
      return ajv;
    }
    const [formats, exportName] = opts.mode === "fast" ? [formats_1.fastFormats, fastName] : [formats_1.fullFormats, fullName];
    addFormats(ajv, opts.formats || formats_1.formatNames, formats, exportName);
    if (opts.keywords) (0, limit_1.default)(ajv);
    return ajv;
  };
  formatsPlugin.get = (name, mode = "full") => {
    const f = (mode === "fast" ? formats_1.fastFormats : formats_1.fullFormats)[name];
    if (!f) throw new Error(`Unknown format "${name}"`);
    return f;
  };
  function addFormats(ajv, list, fs, exportName) {
    var _a2;
    var _b;
    (_a2 = (_b = ajv.opts.code).formats) !== null && _a2 !== void 0 || (_b.formats = (0, codegen_1._)`require("ajv-formats/dist/formats").${exportName}`);
    for (const f of list) ajv.addFormat(f, fs[f]);
  }
  module2.exports = exports2 = formatsPlugin;
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.default = formatsPlugin;
}));
var import_ajv = require_ajv();
var import_dist = /* @__PURE__ */ __toESM2(require_dist(), 1);
function createDefaultAjvInstance() {
  const ajv = new import_ajv.Ajv({
    strict: false,
    validateFormats: true,
    validateSchema: false,
    allErrors: true
  });
  (0, import_dist.default)(ajv);
  return ajv;
}
var AjvJsonSchemaValidator = class {
  _ajv;
  /**
  * Create an AJV validator
  *
  * @param ajv - Optional pre-configured AJV instance. If not provided, a default instance will be created.
  *
  * @example Use default configuration (recommended for most cases)
  * ```ts source="./ajvProvider.examples.ts#AjvJsonSchemaValidator_default"
  * const validator = new AjvJsonSchemaValidator();
  * ```
  *
  * @example Provide custom AJV instance for advanced configuration
  * ```ts source="./ajvProvider.examples.ts#AjvJsonSchemaValidator_constructor_withFormats"
  * const ajv = new Ajv({ validateFormats: true });
  * addFormats(ajv);
  * const validator = new AjvJsonSchemaValidator(ajv);
  * ```
  */
  constructor(ajv) {
    this._ajv = ajv ?? createDefaultAjvInstance();
  }
  /**
  * Create a validator for the given JSON Schema
  *
  * The validator is compiled once and can be reused multiple times.
  * If the schema has an `$id`, it will be cached by AJV automatically.
  *
  * @param schema - Standard JSON Schema object
  * @returns A validator function that validates input data
  */
  getValidator(schema) {
    const ajvValidator = "$id" in schema && typeof schema.$id === "string" ? this._ajv.getSchema(schema.$id) ?? this._ajv.compile(schema) : this._ajv.compile(schema);
    return (input) => {
      return ajvValidator(input) ? {
        valid: true,
        data: input,
        errorMessage: void 0
      } : {
        valid: false,
        data: void 0,
        errorMessage: this._ajv.errorsText(ajvValidator.errors)
      };
    };
  }
};

// node_modules/@modelcontextprotocol/client/dist/shimsNode.mjs
var CORS_IS_POSSIBLE = false;

// node_modules/pkce-challenge/dist/index.node.js
var crypto2;
crypto2 = globalThis.crypto?.webcrypto ?? // Node.js [18-16] REPL
globalThis.crypto ?? // Node.js >18
import("node:crypto").then((m) => m.webcrypto);
async function getRandomValues(size) {
  return (await crypto2).getRandomValues(new Uint8Array(size));
}
async function random(size) {
  const mask = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~";
  const evenDistCutoff = Math.pow(2, 8) - Math.pow(2, 8) % mask.length;
  let result = "";
  while (result.length < size) {
    const randomBytes = await getRandomValues(size - result.length);
    for (const randomByte of randomBytes) {
      if (randomByte < evenDistCutoff) {
        result += mask[randomByte % mask.length];
      }
    }
  }
  return result;
}
async function generateVerifier(length) {
  return await random(length);
}
async function generateChallenge(code_verifier) {
  const buffer = await (await crypto2).subtle.digest("SHA-256", new TextEncoder().encode(code_verifier));
  return btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\//g, "_").replace(/\+/g, "-").replace(/=/g, "");
}
async function pkceChallenge(length) {
  if (!length)
    length = 43;
  if (length < 43 || length > 128) {
    throw `Expected a length between 43 and 128. Received ${length}.`;
  }
  const verifier = await generateVerifier(length);
  const challenge = await generateChallenge(verifier);
  return {
    code_verifier: verifier,
    code_challenge: challenge
  };
}

// node_modules/eventsource-parser/dist/index.js
var ParseError = class extends Error {
  constructor(message, options) {
    super(message), this.name = "ParseError", this.type = options.type, this.field = options.field, this.value = options.value, this.line = options.line;
  }
};
function noop(_arg) {
}
function createParser(callbacks) {
  if (typeof callbacks == "function")
    throw new TypeError(
      "`callbacks` must be an object, got a function instead. Did you mean `{onEvent: fn}`?"
    );
  const { onEvent = noop, onError = noop, onRetry = noop, onComment } = callbacks;
  let incompleteLine = "", isFirstChunk = true, id, data = "", eventType = "";
  function feed(newChunk) {
    const chunk = isFirstChunk ? newChunk.replace(/^\xEF\xBB\xBF/, "") : newChunk, [complete, incomplete] = splitLines(`${incompleteLine}${chunk}`);
    for (const line of complete)
      parseLine(line);
    incompleteLine = incomplete, isFirstChunk = false;
  }
  function parseLine(line) {
    if (line === "") {
      dispatchEvent();
      return;
    }
    if (line.startsWith(":")) {
      onComment && onComment(line.slice(line.startsWith(": ") ? 2 : 1));
      return;
    }
    const fieldSeparatorIndex = line.indexOf(":");
    if (fieldSeparatorIndex !== -1) {
      const field = line.slice(0, fieldSeparatorIndex), offset = line[fieldSeparatorIndex + 1] === " " ? 2 : 1, value = line.slice(fieldSeparatorIndex + offset);
      processField(field, value, line);
      return;
    }
    processField(line, "", line);
  }
  function processField(field, value, line) {
    switch (field) {
      case "event":
        eventType = value;
        break;
      case "data":
        data = `${data}${value}
`;
        break;
      case "id":
        id = value.includes("\0") ? void 0 : value;
        break;
      case "retry":
        /^\d+$/.test(value) ? onRetry(parseInt(value, 10)) : onError(
          new ParseError(`Invalid \`retry\` value: "${value}"`, {
            type: "invalid-retry",
            value,
            line
          })
        );
        break;
      default:
        onError(
          new ParseError(
            `Unknown field "${field.length > 20 ? `${field.slice(0, 20)}\u2026` : field}"`,
            { type: "unknown-field", field, value, line }
          )
        );
        break;
    }
  }
  function dispatchEvent() {
    data.length > 0 && onEvent({
      id,
      event: eventType || void 0,
      // If the data buffer's last character is a U+000A LINE FEED (LF) character,
      // then remove the last character from the data buffer.
      data: data.endsWith(`
`) ? data.slice(0, -1) : data
    }), id = void 0, data = "", eventType = "";
  }
  function reset(options = {}) {
    incompleteLine && options.consume && parseLine(incompleteLine), isFirstChunk = true, id = void 0, data = "", eventType = "", incompleteLine = "";
  }
  return { feed, reset };
}
function splitLines(chunk) {
  const lines = [];
  let incompleteLine = "", searchIndex = 0;
  for (; searchIndex < chunk.length; ) {
    const crIndex = chunk.indexOf("\r", searchIndex), lfIndex = chunk.indexOf(`
`, searchIndex);
    let lineEnd = -1;
    if (crIndex !== -1 && lfIndex !== -1 ? lineEnd = Math.min(crIndex, lfIndex) : crIndex !== -1 ? crIndex === chunk.length - 1 ? lineEnd = -1 : lineEnd = crIndex : lfIndex !== -1 && (lineEnd = lfIndex), lineEnd === -1) {
      incompleteLine = chunk.slice(searchIndex);
      break;
    } else {
      const line = chunk.slice(searchIndex, lineEnd);
      lines.push(line), searchIndex = lineEnd + 1, chunk[searchIndex - 1] === "\r" && chunk[searchIndex] === `
` && searchIndex++;
    }
  }
  return [lines, incompleteLine];
}

// node_modules/eventsource/dist/index.js
var ErrorEvent = class extends Event {
  /**
   * Constructs a new `ErrorEvent` instance. This is typically not called directly,
   * but rather emitted by the `EventSource` object when an error occurs.
   *
   * @param type - The type of the event (should be "error")
   * @param errorEventInitDict - Optional properties to include in the error event
   */
  constructor(type, errorEventInitDict) {
    var _a2, _b;
    super(type), this.code = (_a2 = errorEventInitDict == null ? void 0 : errorEventInitDict.code) != null ? _a2 : void 0, this.message = (_b = errorEventInitDict == null ? void 0 : errorEventInitDict.message) != null ? _b : void 0;
  }
  /**
   * Node.js "hides" the `message` and `code` properties of the `ErrorEvent` instance,
   * when it is `console.log`'ed. This makes it harder to debug errors. To ease debugging,
   * we explicitly include the properties in the `inspect` method.
   *
   * This is automatically called by Node.js when you `console.log` an instance of this class.
   *
   * @param _depth - The current depth
   * @param options - The options passed to `util.inspect`
   * @param inspect - The inspect function to use (prevents having to import it from `util`)
   * @returns A string representation of the error
   */
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")](_depth, options, inspect) {
    return inspect(inspectableError(this), options);
  }
  /**
   * Deno "hides" the `message` and `code` properties of the `ErrorEvent` instance,
   * when it is `console.log`'ed. This makes it harder to debug errors. To ease debugging,
   * we explicitly include the properties in the `inspect` method.
   *
   * This is automatically called by Deno when you `console.log` an instance of this class.
   *
   * @param inspect - The inspect function to use (prevents having to import it from `util`)
   * @param options - The options passed to `Deno.inspect`
   * @returns A string representation of the error
   */
  [/* @__PURE__ */ Symbol.for("Deno.customInspect")](inspect, options) {
    return inspect(inspectableError(this), options);
  }
};
function syntaxError(message) {
  const DomException = globalThis.DOMException;
  return typeof DomException == "function" ? new DomException(message, "SyntaxError") : new SyntaxError(message);
}
function flattenError2(err) {
  return err instanceof Error ? "errors" in err && Array.isArray(err.errors) ? err.errors.map(flattenError2).join(", ") : "cause" in err && err.cause instanceof Error ? `${err}: ${flattenError2(err.cause)}` : err.message : `${err}`;
}
function inspectableError(err) {
  return {
    type: err.type,
    message: err.message,
    code: err.code,
    defaultPrevented: err.defaultPrevented,
    cancelable: err.cancelable,
    timeStamp: err.timeStamp
  };
}
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _readyState;
var _url2;
var _redirectUrl;
var _withCredentials;
var _fetch;
var _reconnectInterval;
var _reconnectTimer;
var _lastEventId;
var _controller;
var _parser;
var _onError;
var _onMessage;
var _onOpen;
var _EventSource_instances;
var connect_fn;
var _onFetchResponse;
var _onFetchError;
var getRequestOptions_fn;
var _onEvent;
var _onRetryChange;
var failConnection_fn;
var scheduleReconnect_fn;
var _reconnect;
var EventSource = class extends EventTarget {
  constructor(url2, eventSourceInitDict) {
    var _a2, _b;
    super(), __privateAdd(this, _EventSource_instances), this.CONNECTING = 0, this.OPEN = 1, this.CLOSED = 2, __privateAdd(this, _readyState), __privateAdd(this, _url2), __privateAdd(this, _redirectUrl), __privateAdd(this, _withCredentials), __privateAdd(this, _fetch), __privateAdd(this, _reconnectInterval), __privateAdd(this, _reconnectTimer), __privateAdd(this, _lastEventId, null), __privateAdd(this, _controller), __privateAdd(this, _parser), __privateAdd(this, _onError, null), __privateAdd(this, _onMessage, null), __privateAdd(this, _onOpen, null), __privateAdd(this, _onFetchResponse, async (response) => {
      var _a22;
      __privateGet(this, _parser).reset();
      const { body, redirected, status, headers } = response;
      if (status === 204) {
        __privateMethod(this, _EventSource_instances, failConnection_fn).call(this, "Server sent HTTP 204, not reconnecting", 204), this.close();
        return;
      }
      if (redirected ? __privateSet(this, _redirectUrl, new URL(response.url)) : __privateSet(this, _redirectUrl, void 0), status !== 200) {
        __privateMethod(this, _EventSource_instances, failConnection_fn).call(this, `Non-200 status code (${status})`, status);
        return;
      }
      if (!(headers.get("content-type") || "").startsWith("text/event-stream")) {
        __privateMethod(this, _EventSource_instances, failConnection_fn).call(this, 'Invalid content type, expected "text/event-stream"', status);
        return;
      }
      if (__privateGet(this, _readyState) === this.CLOSED)
        return;
      __privateSet(this, _readyState, this.OPEN);
      const openEvent = new Event("open");
      if ((_a22 = __privateGet(this, _onOpen)) == null || _a22.call(this, openEvent), this.dispatchEvent(openEvent), typeof body != "object" || !body || !("getReader" in body)) {
        __privateMethod(this, _EventSource_instances, failConnection_fn).call(this, "Invalid response body, expected a web ReadableStream", status), this.close();
        return;
      }
      const decoder = new TextDecoder(), reader = body.getReader();
      let open = true;
      do {
        const { done, value } = await reader.read();
        value && __privateGet(this, _parser).feed(decoder.decode(value, { stream: !done })), done && (open = false, __privateGet(this, _parser).reset(), __privateMethod(this, _EventSource_instances, scheduleReconnect_fn).call(this));
      } while (open);
    }), __privateAdd(this, _onFetchError, (err) => {
      __privateSet(this, _controller, void 0), !(err.name === "AbortError" || err.type === "aborted") && __privateMethod(this, _EventSource_instances, scheduleReconnect_fn).call(this, flattenError2(err));
    }), __privateAdd(this, _onEvent, (event) => {
      typeof event.id == "string" && __privateSet(this, _lastEventId, event.id);
      const messageEvent = new MessageEvent(event.event || "message", {
        data: event.data,
        origin: __privateGet(this, _redirectUrl) ? __privateGet(this, _redirectUrl).origin : __privateGet(this, _url2).origin,
        lastEventId: event.id || ""
      });
      __privateGet(this, _onMessage) && (!event.event || event.event === "message") && __privateGet(this, _onMessage).call(this, messageEvent), this.dispatchEvent(messageEvent);
    }), __privateAdd(this, _onRetryChange, (value) => {
      __privateSet(this, _reconnectInterval, value);
    }), __privateAdd(this, _reconnect, () => {
      __privateSet(this, _reconnectTimer, void 0), __privateGet(this, _readyState) === this.CONNECTING && __privateMethod(this, _EventSource_instances, connect_fn).call(this);
    });
    try {
      if (url2 instanceof URL)
        __privateSet(this, _url2, url2);
      else if (typeof url2 == "string")
        __privateSet(this, _url2, new URL(url2, getBaseURL()));
      else
        throw new Error("Invalid URL");
    } catch {
      throw syntaxError("An invalid or illegal string was specified");
    }
    __privateSet(this, _parser, createParser({
      onEvent: __privateGet(this, _onEvent),
      onRetry: __privateGet(this, _onRetryChange)
    })), __privateSet(this, _readyState, this.CONNECTING), __privateSet(this, _reconnectInterval, 3e3), __privateSet(this, _fetch, (_a2 = eventSourceInitDict == null ? void 0 : eventSourceInitDict.fetch) != null ? _a2 : globalThis.fetch), __privateSet(this, _withCredentials, (_b = eventSourceInitDict == null ? void 0 : eventSourceInitDict.withCredentials) != null ? _b : false), __privateMethod(this, _EventSource_instances, connect_fn).call(this);
  }
  /**
   * Returns the state of this EventSource object's connection. It can have the values described below.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/readyState)
   *
   * Note: typed as `number` instead of `0 | 1 | 2` for compatibility with the `EventSource` interface,
   * defined in the TypeScript `dom` library.
   *
   * @public
   */
  get readyState() {
    return __privateGet(this, _readyState);
  }
  /**
   * Returns the URL providing the event stream.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/url)
   *
   * @public
   */
  get url() {
    return __privateGet(this, _url2).href;
  }
  /**
   * Returns true if the credentials mode for connection requests to the URL providing the event stream is set to "include", and false otherwise.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/withCredentials)
   */
  get withCredentials() {
    return __privateGet(this, _withCredentials);
  }
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/error_event) */
  get onerror() {
    return __privateGet(this, _onError);
  }
  set onerror(value) {
    __privateSet(this, _onError, value);
  }
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/message_event) */
  get onmessage() {
    return __privateGet(this, _onMessage);
  }
  set onmessage(value) {
    __privateSet(this, _onMessage, value);
  }
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/open_event) */
  get onopen() {
    return __privateGet(this, _onOpen);
  }
  set onopen(value) {
    __privateSet(this, _onOpen, value);
  }
  addEventListener(type, listener, options) {
    const listen = listener;
    super.addEventListener(type, listen, options);
  }
  removeEventListener(type, listener, options) {
    const listen = listener;
    super.removeEventListener(type, listen, options);
  }
  /**
   * Aborts any instances of the fetch algorithm started for this EventSource object, and sets the readyState attribute to CLOSED.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/close)
   *
   * @public
   */
  close() {
    __privateGet(this, _reconnectTimer) && clearTimeout(__privateGet(this, _reconnectTimer)), __privateGet(this, _readyState) !== this.CLOSED && (__privateGet(this, _controller) && __privateGet(this, _controller).abort(), __privateSet(this, _readyState, this.CLOSED), __privateSet(this, _controller, void 0));
  }
};
_readyState = /* @__PURE__ */ new WeakMap(), _url2 = /* @__PURE__ */ new WeakMap(), _redirectUrl = /* @__PURE__ */ new WeakMap(), _withCredentials = /* @__PURE__ */ new WeakMap(), _fetch = /* @__PURE__ */ new WeakMap(), _reconnectInterval = /* @__PURE__ */ new WeakMap(), _reconnectTimer = /* @__PURE__ */ new WeakMap(), _lastEventId = /* @__PURE__ */ new WeakMap(), _controller = /* @__PURE__ */ new WeakMap(), _parser = /* @__PURE__ */ new WeakMap(), _onError = /* @__PURE__ */ new WeakMap(), _onMessage = /* @__PURE__ */ new WeakMap(), _onOpen = /* @__PURE__ */ new WeakMap(), _EventSource_instances = /* @__PURE__ */ new WeakSet(), /**
* Connect to the given URL and start receiving events
*
* @internal
*/
connect_fn = function() {
  __privateSet(this, _readyState, this.CONNECTING), __privateSet(this, _controller, new AbortController()), __privateGet(this, _fetch)(__privateGet(this, _url2), __privateMethod(this, _EventSource_instances, getRequestOptions_fn).call(this)).then(__privateGet(this, _onFetchResponse)).catch(__privateGet(this, _onFetchError));
}, _onFetchResponse = /* @__PURE__ */ new WeakMap(), _onFetchError = /* @__PURE__ */ new WeakMap(), /**
* Get request options for the `fetch()` request
*
* @returns The request options
* @internal
*/
getRequestOptions_fn = function() {
  var _a2;
  const init = {
    // [spec] Let `corsAttributeState` be `Anonymous`…
    // [spec] …will have their mode set to "cors"…
    mode: "cors",
    redirect: "follow",
    headers: { Accept: "text/event-stream", ...__privateGet(this, _lastEventId) ? { "Last-Event-ID": __privateGet(this, _lastEventId) } : void 0 },
    cache: "no-store",
    signal: (_a2 = __privateGet(this, _controller)) == null ? void 0 : _a2.signal
  };
  return "window" in globalThis && (init.credentials = this.withCredentials ? "include" : "same-origin"), init;
}, _onEvent = /* @__PURE__ */ new WeakMap(), _onRetryChange = /* @__PURE__ */ new WeakMap(), /**
* Handles the process referred to in the EventSource specification as "failing a connection".
*
* @param error - The error causing the connection to fail
* @param code - The HTTP status code, if available
* @internal
*/
failConnection_fn = function(message, code) {
  var _a2;
  __privateGet(this, _readyState) !== this.CLOSED && __privateSet(this, _readyState, this.CLOSED);
  const errorEvent = new ErrorEvent("error", { code, message });
  (_a2 = __privateGet(this, _onError)) == null || _a2.call(this, errorEvent), this.dispatchEvent(errorEvent);
}, /**
* Schedules a reconnection attempt against the EventSource endpoint.
*
* @param message - The error causing the connection to fail
* @param code - The HTTP status code, if available
* @internal
*/
scheduleReconnect_fn = function(message, code) {
  var _a2;
  if (__privateGet(this, _readyState) === this.CLOSED)
    return;
  __privateSet(this, _readyState, this.CONNECTING);
  const errorEvent = new ErrorEvent("error", { code, message });
  (_a2 = __privateGet(this, _onError)) == null || _a2.call(this, errorEvent), this.dispatchEvent(errorEvent), __privateSet(this, _reconnectTimer, setTimeout(__privateGet(this, _reconnect), __privateGet(this, _reconnectInterval)));
}, _reconnect = /* @__PURE__ */ new WeakMap(), /**
* ReadyState representing an EventSource currently trying to connect
*
* @public
*/
EventSource.CONNECTING = 0, /**
* ReadyState representing an EventSource connection that is open (eg connected)
*
* @public
*/
EventSource.OPEN = 1, /**
* ReadyState representing an EventSource connection that is closed (eg disconnected)
*
* @public
*/
EventSource.CLOSED = 2;
function getBaseURL() {
  const doc = "document" in globalThis ? globalThis.document : void 0;
  return doc && typeof doc == "object" && "baseURI" in doc && typeof doc.baseURI == "string" ? doc.baseURI : void 0;
}

// node_modules/@modelcontextprotocol/client/dist/index.mjs
var import_node_process = __toESM(require("node:process"), 1);
var import_cross_spawn = __toESM(require_cross_spawn(), 1);

// node_modules/eventsource-parser/dist/stream.js
var EventSourceParserStream = class extends TransformStream {
  constructor({ onError, onRetry, onComment } = {}) {
    let parser;
    super({
      start(controller) {
        parser = createParser({
          onEvent: (event) => {
            controller.enqueue(event);
          },
          onError(error2) {
            onError === "terminate" ? controller.error(error2) : typeof onError == "function" && onError(error2);
          },
          onRetry,
          onComment
        });
      },
      transform(chunk) {
        parser.feed(chunk);
      }
    });
  }
};

// node_modules/@modelcontextprotocol/client/dist/index.mjs
function assertToolsCallTaskCapability(requests, method, entityName) {
  if (!requests) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `${entityName} does not support task creation (required for ${method})`);
  switch (method) {
    case "tools/call":
      if (!requests.tools?.call) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `${entityName} does not support task creation for tools/call (required for ${method})`);
      break;
    default:
      break;
  }
}
function assertClientRequestTaskCapability(requests, method, entityName) {
  if (!requests) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `${entityName} does not support task creation (required for ${method})`);
  switch (method) {
    case "sampling/createMessage":
      if (!requests.sampling?.createMessage) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `${entityName} does not support task creation for sampling/createMessage (required for ${method})`);
      break;
    case "elicitation/create":
      if (!requests.elicitation?.create) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `${entityName} does not support task creation for elicitation/create (required for ${method})`);
      break;
    default:
      break;
  }
}
function isOAuthClientProvider(provider) {
  if (provider == null) return false;
  const p = provider;
  return typeof p.tokens === "function" && typeof p.clientInformation === "function";
}
async function handleOAuthUnauthorized(provider, ctx) {
  const { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(ctx.response);
  if (await auth(provider, {
    serverUrl: ctx.serverUrl,
    resourceMetadataUrl,
    scope,
    fetchFn: ctx.fetchFn
  }) !== "AUTHORIZED") throw new UnauthorizedError();
}
function adaptOAuthProvider(provider) {
  return {
    token: async () => {
      return (await provider.tokens())?.access_token;
    },
    onUnauthorized: async (ctx) => handleOAuthUnauthorized(provider, ctx)
  };
}
var UnauthorizedError = class extends Error {
  constructor(message) {
    super(message ?? "Unauthorized");
  }
};
function isClientAuthMethod(method) {
  return [
    "client_secret_basic",
    "client_secret_post",
    "none"
  ].includes(method);
}
var AUTHORIZATION_CODE_RESPONSE_TYPE = "code";
var AUTHORIZATION_CODE_CHALLENGE_METHOD = "S256";
function selectClientAuthMethod(clientInformation, supportedMethods) {
  const hasClientSecret = clientInformation.client_secret !== void 0;
  if ("token_endpoint_auth_method" in clientInformation && clientInformation.token_endpoint_auth_method && isClientAuthMethod(clientInformation.token_endpoint_auth_method) && (supportedMethods.length === 0 || supportedMethods.includes(clientInformation.token_endpoint_auth_method))) return clientInformation.token_endpoint_auth_method;
  if (supportedMethods.length === 0) return hasClientSecret ? "client_secret_basic" : "none";
  if (hasClientSecret && supportedMethods.includes("client_secret_basic")) return "client_secret_basic";
  if (hasClientSecret && supportedMethods.includes("client_secret_post")) return "client_secret_post";
  if (supportedMethods.includes("none")) return "none";
  return hasClientSecret ? "client_secret_post" : "none";
}
function applyClientAuthentication(method, clientInformation, headers, params) {
  const { client_id, client_secret } = clientInformation;
  switch (method) {
    case "client_secret_basic":
      applyBasicAuth(client_id, client_secret, headers);
      return;
    case "client_secret_post":
      applyPostAuth(client_id, client_secret, params);
      return;
    case "none":
      applyPublicAuth(client_id, params);
      return;
    default:
      throw new Error(`Unsupported client authentication method: ${method}`);
  }
}
function applyBasicAuth(clientId, clientSecret, headers) {
  if (!clientSecret) throw new Error("client_secret_basic authentication requires a client_secret");
  const credentials = btoa(`${clientId}:${clientSecret}`);
  headers.set("Authorization", `Basic ${credentials}`);
}
function applyPostAuth(clientId, clientSecret, params) {
  params.set("client_id", clientId);
  if (clientSecret) params.set("client_secret", clientSecret);
}
function applyPublicAuth(clientId, params) {
  params.set("client_id", clientId);
}
async function parseErrorResponse(input) {
  const statusCode = input instanceof Response ? input.status : void 0;
  const body = input instanceof Response ? await input.text() : input;
  try {
    const result = OAuthErrorResponseSchema.parse(JSON.parse(body));
    return OAuthError.fromResponse(result);
  } catch (error2) {
    const errorMessage = `${statusCode ? `HTTP ${statusCode}: ` : ""}Invalid OAuth error response: ${error2}. Raw body: ${body}`;
    return new OAuthError(OAuthErrorCode.ServerError, errorMessage);
  }
}
async function auth(provider, options) {
  try {
    return await authInternal(provider, options);
  } catch (error2) {
    if (error2 instanceof OAuthError) {
      if (error2.code === OAuthErrorCode.InvalidClient || error2.code === OAuthErrorCode.UnauthorizedClient) {
        await provider.invalidateCredentials?.("all");
        return await authInternal(provider, options);
      } else if (error2.code === OAuthErrorCode.InvalidGrant) {
        await provider.invalidateCredentials?.("tokens");
        return await authInternal(provider, options);
      }
    }
    throw error2;
  }
}
function determineScope(options) {
  const { requestedScope, resourceMetadata, authServerMetadata, clientMetadata } = options;
  let effectiveScope = requestedScope || resourceMetadata?.scopes_supported?.join(" ") || clientMetadata.scope;
  if (effectiveScope && authServerMetadata?.scopes_supported?.includes("offline_access") && !effectiveScope.split(" ").includes("offline_access") && clientMetadata.grant_types?.includes("refresh_token")) effectiveScope = `${effectiveScope} offline_access`;
  return effectiveScope;
}
async function authInternal(provider, { serverUrl, authorizationCode, scope, resourceMetadataUrl, fetchFn }) {
  const cachedState = await provider.discoveryState?.();
  let resourceMetadata;
  let authorizationServerUrl;
  let metadata;
  let effectiveResourceMetadataUrl = resourceMetadataUrl;
  if (!effectiveResourceMetadataUrl && cachedState?.resourceMetadataUrl) effectiveResourceMetadataUrl = new URL(cachedState.resourceMetadataUrl);
  if (cachedState?.authorizationServerUrl) {
    authorizationServerUrl = cachedState.authorizationServerUrl;
    resourceMetadata = cachedState.resourceMetadata;
    metadata = cachedState.authorizationServerMetadata ?? await discoverAuthorizationServerMetadata(authorizationServerUrl, { fetchFn });
    if (!resourceMetadata) try {
      resourceMetadata = await discoverOAuthProtectedResourceMetadata(serverUrl, { resourceMetadataUrl: effectiveResourceMetadataUrl }, fetchFn);
    } catch (error2) {
      if (error2 instanceof TypeError) throw error2;
    }
    if (metadata !== cachedState.authorizationServerMetadata || resourceMetadata !== cachedState.resourceMetadata) await provider.saveDiscoveryState?.({
      authorizationServerUrl: String(authorizationServerUrl),
      resourceMetadataUrl: effectiveResourceMetadataUrl?.toString(),
      resourceMetadata,
      authorizationServerMetadata: metadata
    });
  } else {
    const serverInfo = await discoverOAuthServerInfo(serverUrl, {
      resourceMetadataUrl: effectiveResourceMetadataUrl,
      fetchFn
    });
    authorizationServerUrl = serverInfo.authorizationServerUrl;
    metadata = serverInfo.authorizationServerMetadata;
    resourceMetadata = serverInfo.resourceMetadata;
    await provider.saveDiscoveryState?.({
      authorizationServerUrl: String(authorizationServerUrl),
      resourceMetadataUrl: effectiveResourceMetadataUrl?.toString(),
      resourceMetadata,
      authorizationServerMetadata: metadata
    });
  }
  await provider.saveAuthorizationServerUrl?.(String(authorizationServerUrl));
  const resource = await selectResourceURL(serverUrl, provider, resourceMetadata);
  if (resource) await provider.saveResourceUrl?.(String(resource));
  const resolvedScope = determineScope({
    requestedScope: scope,
    resourceMetadata,
    authServerMetadata: metadata,
    clientMetadata: provider.clientMetadata
  });
  let clientInformation = await Promise.resolve(provider.clientInformation());
  if (!clientInformation) {
    if (authorizationCode !== void 0) throw new Error("Existing OAuth client information is required when exchanging an authorization code");
    const supportsUrlBasedClientId = metadata?.client_id_metadata_document_supported === true;
    const clientMetadataUrl = provider.clientMetadataUrl;
    if (clientMetadataUrl && !isHttpsUrl(clientMetadataUrl)) throw new OAuthError(OAuthErrorCode.InvalidClientMetadata, `clientMetadataUrl must be a valid HTTPS URL with a non-root pathname, got: ${clientMetadataUrl}`);
    if (supportsUrlBasedClientId && clientMetadataUrl) {
      clientInformation = { client_id: clientMetadataUrl };
      await provider.saveClientInformation?.(clientInformation);
    } else {
      if (!provider.saveClientInformation) throw new Error("OAuth client information must be saveable for dynamic registration");
      const fullInformation = await registerClient(authorizationServerUrl, {
        metadata,
        clientMetadata: provider.clientMetadata,
        scope: resolvedScope,
        fetchFn
      });
      await provider.saveClientInformation(fullInformation);
      clientInformation = fullInformation;
    }
  }
  const nonInteractiveFlow = !provider.redirectUrl;
  if (authorizationCode !== void 0 || nonInteractiveFlow) {
    const tokens$1 = await fetchToken(provider, authorizationServerUrl, {
      metadata,
      resource,
      authorizationCode,
      scope: resolvedScope,
      fetchFn
    });
    await provider.saveTokens(tokens$1);
    return "AUTHORIZED";
  }
  const tokens = await provider.tokens();
  if (tokens?.refresh_token) try {
    const newTokens = await refreshAuthorization(authorizationServerUrl, {
      metadata,
      clientInformation,
      refreshToken: tokens.refresh_token,
      resource,
      addClientAuthentication: provider.addClientAuthentication,
      fetchFn
    });
    await provider.saveTokens(newTokens);
    return "AUTHORIZED";
  } catch (error2) {
    if (!(error2 instanceof OAuthError) || error2.code === OAuthErrorCode.ServerError) {
    } else throw error2;
  }
  const state = provider.state ? await provider.state() : void 0;
  const { authorizationUrl, codeVerifier } = await startAuthorization(authorizationServerUrl, {
    metadata,
    clientInformation,
    state,
    redirectUrl: provider.redirectUrl,
    scope: resolvedScope,
    resource
  });
  await provider.saveCodeVerifier(codeVerifier);
  await provider.redirectToAuthorization(authorizationUrl);
  return "REDIRECT";
}
function isHttpsUrl(value) {
  if (!value) return false;
  try {
    const url2 = new URL(value);
    return url2.protocol === "https:" && url2.pathname !== "/";
  } catch {
    return false;
  }
}
async function selectResourceURL(serverUrl, provider, resourceMetadata) {
  const defaultResource = resourceUrlFromServerUrl(serverUrl);
  if (provider.validateResourceURL) return await provider.validateResourceURL(defaultResource, resourceMetadata?.resource);
  if (!resourceMetadata) return;
  if (!checkResourceAllowed({
    requestedResource: defaultResource,
    configuredResource: resourceMetadata.resource
  })) throw new Error(`Protected resource ${resourceMetadata.resource} does not match expected ${defaultResource} (or origin)`);
  return new URL(resourceMetadata.resource);
}
function extractWWWAuthenticateParams(res) {
  const authenticateHeader = res.headers.get("WWW-Authenticate");
  if (!authenticateHeader) return {};
  const [type, scheme] = authenticateHeader.split(" ");
  if (type?.toLowerCase() !== "bearer" || !scheme) return {};
  const resourceMetadataMatch = extractFieldFromWwwAuth(res, "resource_metadata") || void 0;
  let resourceMetadataUrl;
  if (resourceMetadataMatch) try {
    resourceMetadataUrl = new URL(resourceMetadataMatch);
  } catch {
  }
  const scope = extractFieldFromWwwAuth(res, "scope") || void 0;
  const error2 = extractFieldFromWwwAuth(res, "error") || void 0;
  return {
    resourceMetadataUrl,
    scope,
    error: error2
  };
}
function extractFieldFromWwwAuth(response, fieldName) {
  const wwwAuthHeader = response.headers.get("WWW-Authenticate");
  if (!wwwAuthHeader) return null;
  const pattern = new RegExp(String.raw`${fieldName}=(?:"([^"]+)"|([^\s,]+))`);
  const match = wwwAuthHeader.match(pattern);
  if (match) {
    const result = match[1] || match[2];
    if (result) return result;
  }
  return null;
}
async function discoverOAuthProtectedResourceMetadata(serverUrl, opts, fetchFn = fetch) {
  const response = await discoverMetadataWithFallback(serverUrl, "oauth-protected-resource", fetchFn, {
    protocolVersion: opts?.protocolVersion,
    metadataUrl: opts?.resourceMetadataUrl
  });
  if (!response || response.status === 404) {
    await response?.text?.().catch(() => {
    });
    throw new Error(`Resource server does not implement OAuth 2.0 Protected Resource Metadata.`);
  }
  if (!response.ok) {
    await response.text?.().catch(() => {
    });
    throw new Error(`HTTP ${response.status} trying to load well-known OAuth protected resource metadata.`);
  }
  return OAuthProtectedResourceMetadataSchema.parse(await response.json());
}
async function fetchWithCorsRetry(url2, headers, fetchFn = fetch) {
  try {
    return await fetchFn(url2, { headers });
  } catch (error2) {
    if (!(error2 instanceof TypeError) || !CORS_IS_POSSIBLE) throw error2;
    if (headers) try {
      return await fetchFn(url2, {});
    } catch (retryError) {
      if (!(retryError instanceof TypeError)) throw retryError;
      return;
    }
    return;
  }
}
function buildWellKnownPath(wellKnownPrefix, pathname = "", options = {}) {
  if (pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  return options.prependPathname ? `${pathname}/.well-known/${wellKnownPrefix}` : `/.well-known/${wellKnownPrefix}${pathname}`;
}
async function tryMetadataDiscovery(url2, protocolVersion, fetchFn = fetch) {
  return await fetchWithCorsRetry(url2, { "MCP-Protocol-Version": protocolVersion }, fetchFn);
}
function shouldAttemptFallback(response, pathname) {
  if (!response) return true;
  if (pathname === "/") return false;
  return response.status >= 400 && response.status < 500 || response.status === 502;
}
async function discoverMetadataWithFallback(serverUrl, wellKnownType, fetchFn, opts) {
  const issuer = new URL(serverUrl);
  const protocolVersion = opts?.protocolVersion ?? LATEST_PROTOCOL_VERSION;
  let url2;
  if (opts?.metadataUrl) url2 = new URL(opts.metadataUrl);
  else {
    const wellKnownPath = buildWellKnownPath(wellKnownType, issuer.pathname);
    url2 = new URL(wellKnownPath, opts?.metadataServerUrl ?? issuer);
    url2.search = issuer.search;
  }
  let response = await tryMetadataDiscovery(url2, protocolVersion, fetchFn);
  if (!opts?.metadataUrl && shouldAttemptFallback(response, issuer.pathname)) response = await tryMetadataDiscovery(new URL(`/.well-known/${wellKnownType}`, issuer), protocolVersion, fetchFn);
  return response;
}
function buildDiscoveryUrls(authorizationServerUrl) {
  const url2 = typeof authorizationServerUrl === "string" ? new URL(authorizationServerUrl) : authorizationServerUrl;
  const hasPath = url2.pathname !== "/";
  const urlsToTry = [];
  if (!hasPath) {
    urlsToTry.push({
      url: new URL("/.well-known/oauth-authorization-server", url2.origin),
      type: "oauth"
    }, {
      url: new URL(`/.well-known/openid-configuration`, url2.origin),
      type: "oidc"
    });
    return urlsToTry;
  }
  let pathname = url2.pathname;
  if (pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  urlsToTry.push({
    url: new URL(`/.well-known/oauth-authorization-server${pathname}`, url2.origin),
    type: "oauth"
  }, {
    url: new URL(`/.well-known/openid-configuration${pathname}`, url2.origin),
    type: "oidc"
  }, {
    url: new URL(`${pathname}/.well-known/openid-configuration`, url2.origin),
    type: "oidc"
  });
  return urlsToTry;
}
async function discoverAuthorizationServerMetadata(authorizationServerUrl, { fetchFn = fetch, protocolVersion = LATEST_PROTOCOL_VERSION } = {}) {
  const headers = {
    "MCP-Protocol-Version": protocolVersion,
    Accept: "application/json"
  };
  const urlsToTry = buildDiscoveryUrls(authorizationServerUrl);
  for (const { url: endpointUrl, type } of urlsToTry) {
    const response = await fetchWithCorsRetry(endpointUrl, headers, fetchFn);
    if (!response)
      continue;
    if (!response.ok) {
      await response.text?.().catch(() => {
      });
      if (response.status >= 400 && response.status < 500 || response.status === 502) continue;
      throw new Error(`HTTP ${response.status} trying to load ${type === "oauth" ? "OAuth" : "OpenID provider"} metadata from ${endpointUrl}`);
    }
    return type === "oauth" ? OAuthMetadataSchema.parse(await response.json()) : OpenIdProviderDiscoveryMetadataSchema.parse(await response.json());
  }
}
async function discoverOAuthServerInfo(serverUrl, opts) {
  let resourceMetadata;
  let authorizationServerUrl;
  try {
    resourceMetadata = await discoverOAuthProtectedResourceMetadata(serverUrl, { resourceMetadataUrl: opts?.resourceMetadataUrl }, opts?.fetchFn);
    if (resourceMetadata.authorization_servers && resourceMetadata.authorization_servers.length > 0) authorizationServerUrl = resourceMetadata.authorization_servers[0];
  } catch (error2) {
    if (error2 instanceof TypeError) throw error2;
  }
  if (!authorizationServerUrl) authorizationServerUrl = String(new URL("/", serverUrl));
  const authorizationServerMetadata = await discoverAuthorizationServerMetadata(authorizationServerUrl, { fetchFn: opts?.fetchFn });
  return {
    authorizationServerUrl,
    authorizationServerMetadata,
    resourceMetadata
  };
}
async function startAuthorization(authorizationServerUrl, { metadata, clientInformation, redirectUrl, scope, state, resource }) {
  let authorizationUrl;
  if (metadata) {
    authorizationUrl = new URL(metadata.authorization_endpoint);
    if (!metadata.response_types_supported.includes(AUTHORIZATION_CODE_RESPONSE_TYPE)) throw new Error(`Incompatible auth server: does not support response type ${AUTHORIZATION_CODE_RESPONSE_TYPE}`);
    if (metadata.code_challenge_methods_supported && !metadata.code_challenge_methods_supported.includes(AUTHORIZATION_CODE_CHALLENGE_METHOD)) throw new Error(`Incompatible auth server: does not support code challenge method ${AUTHORIZATION_CODE_CHALLENGE_METHOD}`);
  } else authorizationUrl = new URL("/authorize", authorizationServerUrl);
  const challenge = await pkceChallenge();
  const codeVerifier = challenge.code_verifier;
  const codeChallenge = challenge.code_challenge;
  authorizationUrl.searchParams.set("response_type", AUTHORIZATION_CODE_RESPONSE_TYPE);
  authorizationUrl.searchParams.set("client_id", clientInformation.client_id);
  authorizationUrl.searchParams.set("code_challenge", codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", AUTHORIZATION_CODE_CHALLENGE_METHOD);
  authorizationUrl.searchParams.set("redirect_uri", String(redirectUrl));
  if (state) authorizationUrl.searchParams.set("state", state);
  if (scope) authorizationUrl.searchParams.set("scope", scope);
  if (scope?.split(" ").includes("offline_access")) authorizationUrl.searchParams.append("prompt", "consent");
  if (resource) authorizationUrl.searchParams.set("resource", resource.href);
  return {
    authorizationUrl,
    codeVerifier
  };
}
function prepareAuthorizationCodeRequest(authorizationCode, codeVerifier, redirectUri) {
  return new URLSearchParams({
    grant_type: "authorization_code",
    code: authorizationCode,
    code_verifier: codeVerifier,
    redirect_uri: String(redirectUri)
  });
}
async function executeTokenRequest(authorizationServerUrl, { metadata, tokenRequestParams, clientInformation, addClientAuthentication, resource, fetchFn }) {
  const tokenUrl = metadata?.token_endpoint ? new URL(metadata.token_endpoint) : new URL("/token", authorizationServerUrl);
  const headers = new Headers({
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json"
  });
  if (resource) tokenRequestParams.set("resource", resource.href);
  if (addClientAuthentication) await addClientAuthentication(headers, tokenRequestParams, tokenUrl, metadata);
  else if (clientInformation) applyClientAuthentication(selectClientAuthMethod(clientInformation, metadata?.token_endpoint_auth_methods_supported ?? []), clientInformation, headers, tokenRequestParams);
  const response = await (fetchFn ?? fetch)(tokenUrl, {
    method: "POST",
    headers,
    body: tokenRequestParams
  });
  if (!response.ok) throw await parseErrorResponse(response);
  const json2 = await response.json();
  try {
    return OAuthTokensSchema.parse(json2);
  } catch (parseError) {
    if (typeof json2 === "object" && json2 !== null && "error" in json2) throw await parseErrorResponse(JSON.stringify(json2));
    throw parseError;
  }
}
async function refreshAuthorization(authorizationServerUrl, { metadata, clientInformation, refreshToken, resource, addClientAuthentication, fetchFn }) {
  return {
    refresh_token: refreshToken,
    ...await executeTokenRequest(authorizationServerUrl, {
      metadata,
      tokenRequestParams: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken
      }),
      clientInformation,
      addClientAuthentication,
      resource,
      fetchFn
    })
  };
}
async function fetchToken(provider, authorizationServerUrl, { metadata, resource, authorizationCode, scope, fetchFn } = {}) {
  const effectiveScope = scope ?? provider.clientMetadata.scope;
  let tokenRequestParams;
  if (provider.prepareTokenRequest) tokenRequestParams = await provider.prepareTokenRequest(effectiveScope);
  if (!tokenRequestParams) {
    if (!authorizationCode) throw new Error("Either provider.prepareTokenRequest() or authorizationCode is required");
    if (!provider.redirectUrl) throw new Error("redirectUrl is required for authorization_code flow");
    tokenRequestParams = prepareAuthorizationCodeRequest(authorizationCode, await provider.codeVerifier(), provider.redirectUrl);
  }
  const clientInformation = await provider.clientInformation();
  return executeTokenRequest(authorizationServerUrl, {
    metadata,
    tokenRequestParams,
    clientInformation: clientInformation ?? void 0,
    addClientAuthentication: provider.addClientAuthentication,
    resource,
    fetchFn
  });
}
async function registerClient(authorizationServerUrl, { metadata, clientMetadata, scope, fetchFn }) {
  let registrationUrl;
  if (metadata) {
    if (!metadata.registration_endpoint) throw new Error("Incompatible auth server: does not support dynamic client registration");
    registrationUrl = new URL(metadata.registration_endpoint);
  } else registrationUrl = new URL("/register", authorizationServerUrl);
  const response = await (fetchFn ?? fetch)(registrationUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...clientMetadata,
      ...scope === void 0 ? {} : { scope }
    })
  });
  if (!response.ok) throw await parseErrorResponse(response);
  return OAuthClientInformationFullSchema.parse(await response.json());
}
var ExperimentalClientTasks = class {
  constructor(_client) {
    this._client = _client;
  }
  get _module() {
    return this._client.taskManager;
  }
  /**
  * Calls a tool and returns an AsyncGenerator that yields response messages.
  * The generator is guaranteed to end with either a `'result'` or `'error'` message.
  *
  * This method provides streaming access to tool execution, allowing you to
  * observe intermediate task status updates for long-running tool calls.
  * Automatically validates structured output if the tool has an `outputSchema`.
  *
  * @example
  * ```ts source="./client.examples.ts#ExperimentalClientTasks_callToolStream"
  * const stream = client.experimental.tasks.callToolStream({ name: 'myTool', arguments: {} });
  * for await (const message of stream) {
  *     switch (message.type) {
  *         case 'taskCreated': {
  *             console.log('Tool execution started:', message.task.taskId);
  *             break;
  *         }
  *         case 'taskStatus': {
  *             console.log('Tool status:', message.task.status);
  *             break;
  *         }
  *         case 'result': {
  *             console.log('Tool result:', message.result);
  *             break;
  *         }
  *         case 'error': {
  *             console.error('Tool error:', message.error);
  *             break;
  *         }
  *     }
  * }
  * ```
  *
  * @param params - Tool call parameters (name and arguments)
  * @param options - Optional request options (timeout, signal, task creation params, etc.)
  * @returns AsyncGenerator that yields {@linkcode ResponseMessage} objects
  *
  * @experimental
  */
  async *callToolStream(params, options) {
    const clientInternal = this._client;
    const optionsWithTask = {
      ...options,
      task: options?.task ?? (clientInternal.isToolTask(params.name) ? {} : void 0)
    };
    const stream = this._module.requestStream({
      method: "tools/call",
      params
    }, CallToolResultSchema, optionsWithTask);
    const validator = clientInternal.getToolOutputValidator(params.name);
    for await (const message of stream) {
      if (message.type === "result" && validator && "content" in message.result) {
        const result = message.result;
        if (!result.structuredContent && !result.isError) {
          yield {
            type: "error",
            error: new ProtocolError(ProtocolErrorCode.InvalidRequest, `Tool ${params.name} has an output schema but did not return structured content`)
          };
          return;
        }
        if (result.structuredContent) try {
          const validationResult = validator(result.structuredContent);
          if (!validationResult.valid) {
            yield {
              type: "error",
              error: new ProtocolError(ProtocolErrorCode.InvalidParams, `Structured content does not match the tool's output schema: ${validationResult.errorMessage}`)
            };
            return;
          }
        } catch (error2) {
          if (error2 instanceof ProtocolError) {
            yield {
              type: "error",
              error: error2
            };
            return;
          }
          yield {
            type: "error",
            error: new ProtocolError(ProtocolErrorCode.InvalidParams, `Failed to validate structured content: ${error2 instanceof Error ? error2.message : String(error2)}`)
          };
          return;
        }
      }
      yield message;
    }
  }
  /**
  * Gets the current status of a task.
  *
  * @param taskId - The task identifier
  * @param options - Optional request options
  * @returns The task status
  *
  * @experimental
  */
  async getTask(taskId, options) {
    return this._module.getTask({ taskId }, options);
  }
  /**
  * Retrieves the result of a completed task.
  *
  * @param taskId - The task identifier
  * @param options - Optional request options
  * @returns The task result. The payload structure matches the result type of the
  *   original request (e.g., a `tools/call` task returns a `CallToolResult`).
  *
  * @experimental
  */
  async getTaskResult(taskId, options) {
    return this._module.getTaskResult({ taskId }, GetTaskPayloadResultSchema, options);
  }
  /**
  * Lists tasks with optional pagination.
  *
  * @param cursor - Optional pagination cursor
  * @param options - Optional request options
  * @returns List of tasks with optional next cursor
  *
  * @experimental
  */
  async listTasks(cursor, options) {
    return this._module.listTasks(cursor ? { cursor } : void 0, options);
  }
  /**
  * Cancels a running task.
  *
  * @param taskId - The task identifier
  * @param options - Optional request options
  *
  * @experimental
  */
  async cancelTask(taskId, options) {
    return this._module.cancelTask({ taskId }, options);
  }
  /**
  * Sends a request and returns an AsyncGenerator that yields response messages.
  * The generator is guaranteed to end with either a `'result'` or `'error'` message.
  *
  * This method provides streaming access to request processing, allowing you to
  * observe intermediate task status updates for task-augmented requests.
  *
  * @example
  * ```ts source="./client.examples.ts#ExperimentalClientTasks_requestStream"
  * const stream = client.experimental.tasks.requestStream({ method: 'tools/call', params: { name: 'my-tool', arguments: {} } }, options);
  * for await (const message of stream) {
  *     switch (message.type) {
  *         case 'taskCreated': {
  *             console.log('Task created:', message.task.taskId);
  *             break;
  *         }
  *         case 'taskStatus': {
  *             console.log('Task status:', message.task.status);
  *             break;
  *         }
  *         case 'result': {
  *             console.log('Final result:', message.result);
  *             break;
  *         }
  *         case 'error': {
  *             console.error('Error:', message.error);
  *             break;
  *         }
  *     }
  * }
  * ```
  *
  * @param request - The request to send
  * @param options - Optional request options (timeout, signal, task creation params, etc.)
  * @returns AsyncGenerator that yields {@linkcode ResponseMessage} objects
  *
  * @experimental
  */
  requestStream(request, options) {
    const resultSchema = getResultSchema(request.method);
    return this._module.requestStream(request, resultSchema, options);
  }
};
function applyElicitationDefaults(schema, data) {
  if (!schema || data === null || typeof data !== "object") return;
  if (schema.type === "object" && schema.properties && typeof schema.properties === "object") {
    const obj = data;
    const props = schema.properties;
    for (const key of Object.keys(props)) {
      const propSchema = props[key];
      if (obj[key] === void 0 && Object.prototype.hasOwnProperty.call(propSchema, "default")) obj[key] = propSchema.default;
      if (obj[key] !== void 0) applyElicitationDefaults(propSchema, obj[key]);
    }
  }
  if (Array.isArray(schema.anyOf)) {
    for (const sub of schema.anyOf) if (typeof sub !== "boolean") applyElicitationDefaults(sub, data);
  }
  if (Array.isArray(schema.oneOf)) {
    for (const sub of schema.oneOf) if (typeof sub !== "boolean") applyElicitationDefaults(sub, data);
  }
}
function getSupportedElicitationModes(capabilities) {
  if (!capabilities) return {
    supportsFormMode: false,
    supportsUrlMode: false
  };
  const hasFormCapability = capabilities.form !== void 0;
  const hasUrlCapability = capabilities.url !== void 0;
  return {
    supportsFormMode: hasFormCapability || !hasFormCapability && !hasUrlCapability,
    supportsUrlMode: hasUrlCapability
  };
}
var Client = class extends Protocol {
  _serverCapabilities;
  _serverVersion;
  _negotiatedProtocolVersion;
  _capabilities;
  _instructions;
  _jsonSchemaValidator;
  _cachedToolOutputValidators = /* @__PURE__ */ new Map();
  _cachedKnownTaskTools = /* @__PURE__ */ new Set();
  _cachedRequiredTaskTools = /* @__PURE__ */ new Set();
  _experimental;
  _listChangedDebounceTimers = /* @__PURE__ */ new Map();
  _pendingListChangedConfig;
  _enforceStrictCapabilities;
  /**
  * Initializes this client with the given name and version information.
  */
  constructor(_clientInfo, options) {
    super({
      ...options,
      tasks: extractTaskManagerOptions(options?.capabilities?.tasks)
    });
    this._clientInfo = _clientInfo;
    this._capabilities = options?.capabilities ? { ...options.capabilities } : {};
    this._jsonSchemaValidator = options?.jsonSchemaValidator ?? new AjvJsonSchemaValidator();
    this._enforceStrictCapabilities = options?.enforceStrictCapabilities ?? false;
    if (options?.capabilities?.tasks) {
      const { taskStore, taskMessageQueue, defaultTaskPollInterval, maxTaskQueueSize, ...wireCapabilities } = options.capabilities.tasks;
      this._capabilities.tasks = wireCapabilities;
    }
    if (options?.listChanged) this._pendingListChangedConfig = options.listChanged;
  }
  buildContext(ctx, _transportInfo) {
    return ctx;
  }
  /**
  * Set up handlers for list changed notifications based on config and server capabilities.
  * This should only be called after initialization when server capabilities are known.
  * Handlers are silently skipped if the server doesn't advertise the corresponding listChanged capability.
  * @internal
  */
  _setupListChangedHandlers(config2) {
    if (config2.tools && this._serverCapabilities?.tools?.listChanged) this._setupListChangedHandler("tools", "notifications/tools/list_changed", config2.tools, async () => {
      return (await this.listTools()).tools;
    });
    if (config2.prompts && this._serverCapabilities?.prompts?.listChanged) this._setupListChangedHandler("prompts", "notifications/prompts/list_changed", config2.prompts, async () => {
      return (await this.listPrompts()).prompts;
    });
    if (config2.resources && this._serverCapabilities?.resources?.listChanged) this._setupListChangedHandler("resources", "notifications/resources/list_changed", config2.resources, async () => {
      return (await this.listResources()).resources;
    });
  }
  /**
  * Access experimental features.
  *
  * WARNING: These APIs are experimental and may change without notice.
  *
  * @experimental
  */
  get experimental() {
    if (!this._experimental) this._experimental = { tasks: new ExperimentalClientTasks(this) };
    return this._experimental;
  }
  /**
  * Registers new capabilities. This can only be called before connecting to a transport.
  *
  * The new capabilities will be merged with any existing capabilities previously given (e.g., at initialization).
  */
  registerCapabilities(capabilities) {
    if (this.transport) throw new Error("Cannot register capabilities after connecting to transport");
    this._capabilities = mergeCapabilities(this._capabilities, capabilities);
  }
  /**
  * Registers a handler for server-initiated requests (sampling, elicitation, roots).
  * The client must declare the corresponding capability for the handler to be accepted.
  * Replaces any previously registered handler for the same method.
  *
  * For `sampling/createMessage` and `elicitation/create`, the handler is automatically
  * wrapped with schema validation for both the incoming request and the returned result.
  *
  * @example Handling a sampling request
  * ```ts source="./client.examples.ts#Client_setRequestHandler_sampling"
  * client.setRequestHandler('sampling/createMessage', async request => {
  *     const lastMessage = request.params.messages.at(-1);
  *     console.log('Sampling request:', lastMessage);
  *
  *     // In production, send messages to your LLM here
  *     return {
  *         model: 'my-model',
  *         role: 'assistant' as const,
  *         content: {
  *             type: 'text' as const,
  *             text: 'Response from the model'
  *         }
  *     };
  * });
  * ```
  */
  setRequestHandler(method, handler) {
    if (method === "elicitation/create") {
      const wrappedHandler = async (request, ctx) => {
        const validatedRequest = parseSchema(ElicitRequestSchema, request);
        if (!validatedRequest.success) {
          const errorMessage = validatedRequest.error instanceof Error ? validatedRequest.error.message : String(validatedRequest.error);
          throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Invalid elicitation request: ${errorMessage}`);
        }
        const { params } = validatedRequest.data;
        params.mode = params.mode ?? "form";
        const { supportsFormMode, supportsUrlMode } = getSupportedElicitationModes(this._capabilities.elicitation);
        if (params.mode === "form" && !supportsFormMode) throw new ProtocolError(ProtocolErrorCode.InvalidParams, "Client does not support form-mode elicitation requests");
        if (params.mode === "url" && !supportsUrlMode) throw new ProtocolError(ProtocolErrorCode.InvalidParams, "Client does not support URL-mode elicitation requests");
        const result = await Promise.resolve(handler(request, ctx));
        if (params.task) {
          const taskValidationResult = parseSchema(CreateTaskResultSchema, result);
          if (!taskValidationResult.success) {
            const errorMessage = taskValidationResult.error instanceof Error ? taskValidationResult.error.message : String(taskValidationResult.error);
            throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Invalid task creation result: ${errorMessage}`);
          }
          return taskValidationResult.data;
        }
        const validationResult = parseSchema(ElicitResultSchema, result);
        if (!validationResult.success) {
          const errorMessage = validationResult.error instanceof Error ? validationResult.error.message : String(validationResult.error);
          throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Invalid elicitation result: ${errorMessage}`);
        }
        const validatedResult = validationResult.data;
        const requestedSchema = params.mode === "form" ? params.requestedSchema : void 0;
        if (params.mode === "form" && validatedResult.action === "accept" && validatedResult.content && requestedSchema && this._capabilities.elicitation?.form?.applyDefaults) try {
          applyElicitationDefaults(requestedSchema, validatedResult.content);
        } catch {
        }
        return validatedResult;
      };
      return super.setRequestHandler(method, wrappedHandler);
    }
    if (method === "sampling/createMessage") {
      const wrappedHandler = async (request, ctx) => {
        const validatedRequest = parseSchema(CreateMessageRequestSchema, request);
        if (!validatedRequest.success) {
          const errorMessage = validatedRequest.error instanceof Error ? validatedRequest.error.message : String(validatedRequest.error);
          throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Invalid sampling request: ${errorMessage}`);
        }
        const { params } = validatedRequest.data;
        const result = await Promise.resolve(handler(request, ctx));
        if (params.task) {
          const taskValidationResult = parseSchema(CreateTaskResultSchema, result);
          if (!taskValidationResult.success) {
            const errorMessage = taskValidationResult.error instanceof Error ? taskValidationResult.error.message : String(taskValidationResult.error);
            throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Invalid task creation result: ${errorMessage}`);
          }
          return taskValidationResult.data;
        }
        const validationResult = parseSchema(params.tools || params.toolChoice ? CreateMessageResultWithToolsSchema : CreateMessageResultSchema, result);
        if (!validationResult.success) {
          const errorMessage = validationResult.error instanceof Error ? validationResult.error.message : String(validationResult.error);
          throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Invalid sampling result: ${errorMessage}`);
        }
        return validationResult.data;
      };
      return super.setRequestHandler(method, wrappedHandler);
    }
    return super.setRequestHandler(method, handler);
  }
  assertCapability(capability, method) {
    if (!this._serverCapabilities?.[capability]) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Server does not support ${capability} (required for ${method})`);
  }
  /**
  * Connects to a server via the given transport and performs the MCP initialization handshake.
  *
  * @example Basic usage (stdio)
  * ```ts source="./client.examples.ts#Client_connect_stdio"
  * const client = new Client({ name: 'my-client', version: '1.0.0' });
  * const transport = new StdioClientTransport({ command: 'my-mcp-server' });
  * await client.connect(transport);
  * ```
  *
  * @example Streamable HTTP with SSE fallback
  * ```ts source="./client.examples.ts#Client_connect_sseFallback"
  * const baseUrl = new URL(url);
  *
  * try {
  *     // Try modern Streamable HTTP transport first
  *     const client = new Client({ name: 'my-client', version: '1.0.0' });
  *     const transport = new StreamableHTTPClientTransport(baseUrl);
  *     await client.connect(transport);
  *     return { client, transport };
  * } catch {
  *     // Fall back to legacy SSE transport
  *     const client = new Client({ name: 'my-client', version: '1.0.0' });
  *     const transport = new SSEClientTransport(baseUrl);
  *     await client.connect(transport);
  *     return { client, transport };
  * }
  * ```
  */
  async connect(transport, options) {
    await super.connect(transport);
    if (transport.sessionId !== void 0) {
      if (this._negotiatedProtocolVersion !== void 0 && transport.setProtocolVersion) transport.setProtocolVersion(this._negotiatedProtocolVersion);
      return;
    }
    try {
      const result = await this._requestWithSchema({
        method: "initialize",
        params: {
          protocolVersion: this._supportedProtocolVersions[0] ?? LATEST_PROTOCOL_VERSION,
          capabilities: this._capabilities,
          clientInfo: this._clientInfo
        }
      }, InitializeResultSchema, options);
      if (result === void 0) throw new Error(`Server sent invalid initialize result: ${result}`);
      if (!this._supportedProtocolVersions.includes(result.protocolVersion)) throw new Error(`Server's protocol version is not supported: ${result.protocolVersion}`);
      this._serverCapabilities = result.capabilities;
      this._serverVersion = result.serverInfo;
      this._negotiatedProtocolVersion = result.protocolVersion;
      if (transport.setProtocolVersion) transport.setProtocolVersion(result.protocolVersion);
      this._instructions = result.instructions;
      await this.notification({ method: "notifications/initialized" });
      if (this._pendingListChangedConfig) {
        this._setupListChangedHandlers(this._pendingListChangedConfig);
        this._pendingListChangedConfig = void 0;
      }
    } catch (error2) {
      this.close();
      throw error2;
    }
  }
  /**
  * After initialization has completed, this will be populated with the server's reported capabilities.
  */
  getServerCapabilities() {
    return this._serverCapabilities;
  }
  /**
  * After initialization has completed, this will be populated with information about the server's name and version.
  */
  getServerVersion() {
    return this._serverVersion;
  }
  /**
  * After initialization has completed, this will be populated with the protocol version negotiated
  * during the initialize handshake. When manually reconstructing a transport for reconnection, pass this
  * value to the new transport so it continues sending the required `mcp-protocol-version` header.
  */
  getNegotiatedProtocolVersion() {
    return this._negotiatedProtocolVersion;
  }
  /**
  * After initialization has completed, this may be populated with information about the server's instructions.
  */
  getInstructions() {
    return this._instructions;
  }
  assertCapabilityForMethod(method) {
    switch (method) {
      case "logging/setLevel":
        if (!this._serverCapabilities?.logging) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Server does not support logging (required for ${method})`);
        break;
      case "prompts/get":
      case "prompts/list":
        if (!this._serverCapabilities?.prompts) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Server does not support prompts (required for ${method})`);
        break;
      case "resources/list":
      case "resources/templates/list":
      case "resources/read":
      case "resources/subscribe":
      case "resources/unsubscribe":
        if (!this._serverCapabilities?.resources) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Server does not support resources (required for ${method})`);
        if (method === "resources/subscribe" && !this._serverCapabilities.resources.subscribe) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Server does not support resource subscriptions (required for ${method})`);
        break;
      case "tools/call":
      case "tools/list":
        if (!this._serverCapabilities?.tools) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Server does not support tools (required for ${method})`);
        break;
      case "completion/complete":
        if (!this._serverCapabilities?.completions) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Server does not support completions (required for ${method})`);
        break;
      case "initialize":
        break;
      case "ping":
        break;
    }
  }
  assertNotificationCapability(method) {
    switch (method) {
      case "notifications/roots/list_changed":
        if (!this._capabilities.roots?.listChanged) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Client does not support roots list changed notifications (required for ${method})`);
        break;
      case "notifications/initialized":
        break;
      case "notifications/cancelled":
        break;
      case "notifications/progress":
        break;
    }
  }
  assertRequestHandlerCapability(method) {
    switch (method) {
      case "sampling/createMessage":
        if (!this._capabilities.sampling) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Client does not support sampling capability (required for ${method})`);
        break;
      case "elicitation/create":
        if (!this._capabilities.elicitation) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Client does not support elicitation capability (required for ${method})`);
        break;
      case "roots/list":
        if (!this._capabilities.roots) throw new SdkError(SdkErrorCode.CapabilityNotSupported, `Client does not support roots capability (required for ${method})`);
        break;
      case "ping":
        break;
    }
  }
  assertTaskCapability(method) {
    assertToolsCallTaskCapability(this._serverCapabilities?.tasks?.requests, method, "Server");
  }
  assertTaskHandlerCapability(method) {
    assertClientRequestTaskCapability(this._capabilities?.tasks?.requests, method, "Client");
  }
  async ping(options) {
    return this._requestWithSchema({ method: "ping" }, EmptyResultSchema, options);
  }
  /** Requests argument autocompletion suggestions from the server for a prompt or resource. */
  async complete(params, options) {
    return this._requestWithSchema({
      method: "completion/complete",
      params
    }, CompleteResultSchema, options);
  }
  /** Sets the minimum severity level for log messages sent by the server. */
  async setLoggingLevel(level, options) {
    return this._requestWithSchema({
      method: "logging/setLevel",
      params: { level }
    }, EmptyResultSchema, options);
  }
  /** Retrieves a prompt by name from the server, passing the given arguments for template substitution. */
  async getPrompt(params, options) {
    return this._requestWithSchema({
      method: "prompts/get",
      params
    }, GetPromptResultSchema, options);
  }
  /**
  * Lists available prompts. Results may be paginated — loop on `nextCursor` to collect all pages.
  *
  * Returns an empty list if the server does not advertise prompts capability
  * (or throws if {@linkcode ClientOptions.enforceStrictCapabilities} is enabled).
  *
  * @example
  * ```ts source="./client.examples.ts#Client_listPrompts_pagination"
  * const allPrompts: Prompt[] = [];
  * let cursor: string | undefined;
  * do {
  *     const { prompts, nextCursor } = await client.listPrompts({ cursor });
  *     allPrompts.push(...prompts);
  *     cursor = nextCursor;
  * } while (cursor);
  * console.log(
  *     'Available prompts:',
  *     allPrompts.map(p => p.name)
  * );
  * ```
  */
  async listPrompts(params, options) {
    if (!this._serverCapabilities?.prompts && !this._enforceStrictCapabilities) {
      console.debug("Client.listPrompts() called but server does not advertise prompts capability - returning empty list");
      return { prompts: [] };
    }
    return this._requestWithSchema({
      method: "prompts/list",
      params
    }, ListPromptsResultSchema, options);
  }
  /**
  * Lists available resources. Results may be paginated — loop on `nextCursor` to collect all pages.
  *
  * Returns an empty list if the server does not advertise resources capability
  * (or throws if {@linkcode ClientOptions.enforceStrictCapabilities} is enabled).
  *
  * @example
  * ```ts source="./client.examples.ts#Client_listResources_pagination"
  * const allResources: Resource[] = [];
  * let cursor: string | undefined;
  * do {
  *     const { resources, nextCursor } = await client.listResources({ cursor });
  *     allResources.push(...resources);
  *     cursor = nextCursor;
  * } while (cursor);
  * console.log(
  *     'Available resources:',
  *     allResources.map(r => r.name)
  * );
  * ```
  */
  async listResources(params, options) {
    if (!this._serverCapabilities?.resources && !this._enforceStrictCapabilities) {
      console.debug("Client.listResources() called but server does not advertise resources capability - returning empty list");
      return { resources: [] };
    }
    return this._requestWithSchema({
      method: "resources/list",
      params
    }, ListResourcesResultSchema, options);
  }
  /**
  * Lists available resource URI templates for dynamic resources. Results may be paginated — see {@linkcode listResources | listResources()} for the cursor pattern.
  *
  * Returns an empty list if the server does not advertise resources capability
  * (or throws if {@linkcode ClientOptions.enforceStrictCapabilities} is enabled).
  */
  async listResourceTemplates(params, options) {
    if (!this._serverCapabilities?.resources && !this._enforceStrictCapabilities) {
      console.debug("Client.listResourceTemplates() called but server does not advertise resources capability - returning empty list");
      return { resourceTemplates: [] };
    }
    return this._requestWithSchema({
      method: "resources/templates/list",
      params
    }, ListResourceTemplatesResultSchema, options);
  }
  /** Reads the contents of a resource by URI. */
  async readResource(params, options) {
    return this._requestWithSchema({
      method: "resources/read",
      params
    }, ReadResourceResultSchema, options);
  }
  /** Subscribes to change notifications for a resource. The server must support resource subscriptions. */
  async subscribeResource(params, options) {
    return this._requestWithSchema({
      method: "resources/subscribe",
      params
    }, EmptyResultSchema, options);
  }
  /** Unsubscribes from change notifications for a resource. */
  async unsubscribeResource(params, options) {
    return this._requestWithSchema({
      method: "resources/unsubscribe",
      params
    }, EmptyResultSchema, options);
  }
  /**
  * Calls a tool on the connected server and returns the result. Automatically validates structured output
  * if the tool has an `outputSchema`.
  *
  * Tool results have two error surfaces: `result.isError` for tool-level failures (the tool ran but reported
  * a problem), and thrown {@linkcode ProtocolError} for protocol-level failures or {@linkcode SdkError} for
  * SDK-level issues (timeouts, missing capabilities).
  *
  * For task-based execution with streaming behavior, use {@linkcode ExperimentalClientTasks.callToolStream | client.experimental.tasks.callToolStream()} instead.
  *
  * @example Basic usage
  * ```ts source="./client.examples.ts#Client_callTool_basic"
  * const result = await client.callTool({
  *     name: 'calculate-bmi',
  *     arguments: { weightKg: 70, heightM: 1.75 }
  * });
  *
  * // Tool-level errors are returned in the result, not thrown
  * if (result.isError) {
  *     console.error('Tool error:', result.content);
  *     return;
  * }
  *
  * console.log(result.content);
  * ```
  *
  * @example Structured output
  * ```ts source="./client.examples.ts#Client_callTool_structuredOutput"
  * const result = await client.callTool({
  *     name: 'calculate-bmi',
  *     arguments: { weightKg: 70, heightM: 1.75 }
  * });
  *
  * // Machine-readable output for the client application
  * if (result.structuredContent) {
  *     console.log(result.structuredContent); // e.g. { bmi: 22.86 }
  * }
  * ```
  */
  async callTool(params, options) {
    if (this.isToolTaskRequired(params.name)) throw new ProtocolError(ProtocolErrorCode.InvalidRequest, `Tool "${params.name}" requires task-based execution. Use client.experimental.tasks.callToolStream() instead.`);
    const result = await this._requestWithSchema({
      method: "tools/call",
      params
    }, CallToolResultSchema, options);
    const validator = this.getToolOutputValidator(params.name);
    if (validator) {
      if (!result.structuredContent && !result.isError) throw new ProtocolError(ProtocolErrorCode.InvalidRequest, `Tool ${params.name} has an output schema but did not return structured content`);
      if (result.structuredContent) try {
        const validationResult = validator(result.structuredContent);
        if (!validationResult.valid) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Structured content does not match the tool's output schema: ${validationResult.errorMessage}`);
      } catch (error2) {
        if (error2 instanceof ProtocolError) throw error2;
        throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Failed to validate structured content: ${error2 instanceof Error ? error2.message : String(error2)}`);
      }
    }
    return result;
  }
  isToolTask(toolName) {
    if (!this._serverCapabilities?.tasks?.requests?.tools?.call) return false;
    return this._cachedKnownTaskTools.has(toolName);
  }
  /**
  * Check if a tool requires task-based execution.
  * Unlike {@linkcode isToolTask} which includes `'optional'` tools, this only checks for `'required'`.
  */
  isToolTaskRequired(toolName) {
    return this._cachedRequiredTaskTools.has(toolName);
  }
  /**
  * Cache validators for tool output schemas.
  * Called after {@linkcode listTools | listTools()} to pre-compile validators for better performance.
  */
  cacheToolMetadata(tools) {
    this._cachedToolOutputValidators.clear();
    this._cachedKnownTaskTools.clear();
    this._cachedRequiredTaskTools.clear();
    for (const tool of tools) {
      if (tool.outputSchema) {
        const toolValidator = this._jsonSchemaValidator.getValidator(tool.outputSchema);
        this._cachedToolOutputValidators.set(tool.name, toolValidator);
      }
      const taskSupport = tool.execution?.taskSupport;
      if (taskSupport === "required" || taskSupport === "optional") this._cachedKnownTaskTools.add(tool.name);
      if (taskSupport === "required") this._cachedRequiredTaskTools.add(tool.name);
    }
  }
  /**
  * Get cached validator for a tool
  */
  getToolOutputValidator(toolName) {
    return this._cachedToolOutputValidators.get(toolName);
  }
  /**
  * Lists available tools. Results may be paginated — loop on `nextCursor` to collect all pages.
  *
  * Returns an empty list if the server does not advertise tools capability
  * (or throws if {@linkcode ClientOptions.enforceStrictCapabilities} is enabled).
  *
  * @example
  * ```ts source="./client.examples.ts#Client_listTools_pagination"
  * const allTools: Tool[] = [];
  * let cursor: string | undefined;
  * do {
  *     const { tools, nextCursor } = await client.listTools({ cursor });
  *     allTools.push(...tools);
  *     cursor = nextCursor;
  * } while (cursor);
  * console.log(
  *     'Available tools:',
  *     allTools.map(t => t.name)
  * );
  * ```
  */
  async listTools(params, options) {
    if (!this._serverCapabilities?.tools && !this._enforceStrictCapabilities) {
      console.debug("Client.listTools() called but server does not advertise tools capability - returning empty list");
      return { tools: [] };
    }
    const result = await this._requestWithSchema({
      method: "tools/list",
      params
    }, ListToolsResultSchema, options);
    this.cacheToolMetadata(result.tools);
    return result;
  }
  /**
  * Set up a single list changed handler.
  * @internal
  */
  _setupListChangedHandler(listType, notificationMethod, options, fetcher) {
    const parseResult = parseSchema(ListChangedOptionsBaseSchema, options);
    if (!parseResult.success) throw new Error(`Invalid ${listType} listChanged options: ${parseResult.error.message}`);
    if (typeof options.onChanged !== "function") throw new TypeError(`Invalid ${listType} listChanged options: onChanged must be a function`);
    const { autoRefresh, debounceMs } = parseResult.data;
    const { onChanged } = options;
    const refresh = async () => {
      if (!autoRefresh) {
        onChanged(null, null);
        return;
      }
      try {
        onChanged(null, await fetcher());
      } catch (error2) {
        onChanged(error2 instanceof Error ? error2 : new Error(String(error2)), null);
      }
    };
    const handler = () => {
      if (debounceMs) {
        const existingTimer = this._listChangedDebounceTimers.get(listType);
        if (existingTimer) clearTimeout(existingTimer);
        const timer = setTimeout(refresh, debounceMs);
        this._listChangedDebounceTimers.set(listType, timer);
      } else refresh();
    };
    this.setNotificationHandler(notificationMethod, handler);
  }
  /** Notifies the server that the client's root list has changed. Requires the `roots.listChanged` capability. */
  async sendRootsListChanged() {
    return this.notification({ method: "notifications/roots/list_changed" });
  }
};
var SseError = class extends Error {
  constructor(code, message, event) {
    super(`SSE error: ${message}`);
    this.code = code;
    this.event = event;
  }
};
var SSEClientTransport = class {
  _eventSource;
  _endpoint;
  _abortController;
  _url;
  _resourceMetadataUrl;
  _scope;
  _eventSourceInit;
  _requestInit;
  _authProvider;
  _oauthProvider;
  _fetch;
  _fetchWithInit;
  _protocolVersion;
  onclose;
  onerror;
  onmessage;
  constructor(url2, opts) {
    this._url = url2;
    this._resourceMetadataUrl = void 0;
    this._scope = void 0;
    this._eventSourceInit = opts?.eventSourceInit;
    this._requestInit = opts?.requestInit;
    if (isOAuthClientProvider(opts?.authProvider)) {
      this._oauthProvider = opts.authProvider;
      this._authProvider = adaptOAuthProvider(opts.authProvider);
    } else this._authProvider = opts?.authProvider;
    this._fetch = opts?.fetch;
    this._fetchWithInit = createFetchWithInit(opts?.fetch, opts?.requestInit);
  }
  _last401Response;
  async _commonHeaders() {
    const headers = {};
    const token = await this._authProvider?.token();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (this._protocolVersion) headers["mcp-protocol-version"] = this._protocolVersion;
    const extraHeaders = normalizeHeaders(this._requestInit?.headers);
    return new Headers({
      ...headers,
      ...extraHeaders
    });
  }
  _startOrAuth() {
    const fetchImpl = this?._eventSourceInit?.fetch ?? this._fetch ?? fetch;
    return new Promise((resolve, reject) => {
      this._eventSource = new EventSource(this._url.href, {
        ...this._eventSourceInit,
        fetch: async (url2, init) => {
          const headers = await this._commonHeaders();
          headers.set("Accept", "text/event-stream");
          const response = await fetchImpl(url2, {
            ...init,
            headers
          });
          if (response.status === 401) {
            this._last401Response = response;
            if (response.headers.has("www-authenticate")) {
              const { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(response);
              this._resourceMetadataUrl = resourceMetadataUrl;
              this._scope = scope;
            }
          }
          return response;
        }
      });
      this._abortController = new AbortController();
      this._eventSource.onerror = (event) => {
        if (event.code === 401 && this._authProvider) {
          if (this._authProvider.onUnauthorized && this._last401Response) {
            const response = this._last401Response;
            this._last401Response = void 0;
            this._eventSource?.close();
            this._authProvider.onUnauthorized({
              response,
              serverUrl: this._url,
              fetchFn: this._fetchWithInit
            }).then(() => this._startOrAuth().then(resolve, reject), (error$2) => {
              this.onerror?.(error$2);
              reject(error$2);
            });
            return;
          }
          const error$1 = new UnauthorizedError();
          reject(error$1);
          this.onerror?.(error$1);
          return;
        }
        const error2 = new SseError(event.code, event.message, event);
        reject(error2);
        this.onerror?.(error2);
      };
      this._eventSource.onopen = () => {
      };
      this._eventSource.addEventListener("endpoint", (event) => {
        const messageEvent = event;
        try {
          this._endpoint = new URL(messageEvent.data, this._url);
          if (this._endpoint.origin !== this._url.origin) throw new Error(`Endpoint origin does not match connection origin: ${this._endpoint.origin}`);
        } catch (error2) {
          reject(error2);
          this.onerror?.(error2);
          this.close();
          return;
        }
        resolve();
      });
      this._eventSource.onmessage = (event) => {
        const messageEvent = event;
        let message;
        try {
          message = JSONRPCMessageSchema.parse(JSON.parse(messageEvent.data));
        } catch (error2) {
          this.onerror?.(error2);
          return;
        }
        this.onmessage?.(message);
      };
    });
  }
  async start() {
    if (this._eventSource) throw new Error("SSEClientTransport already started! If using Client class, note that connect() calls start() automatically.");
    return await this._startOrAuth();
  }
  /**
  * Call this method after the user has finished authorizing via their user agent and is redirected back to the MCP client application. This will exchange the authorization code for an access token, enabling the next connection attempt to successfully auth.
  */
  async finishAuth(authorizationCode) {
    if (!this._oauthProvider) throw new UnauthorizedError("finishAuth requires an OAuthClientProvider");
    if (await auth(this._oauthProvider, {
      serverUrl: this._url,
      authorizationCode,
      resourceMetadataUrl: this._resourceMetadataUrl,
      scope: this._scope,
      fetchFn: this._fetchWithInit
    }) !== "AUTHORIZED") throw new UnauthorizedError("Failed to authorize");
  }
  async close() {
    this._abortController?.abort();
    this._eventSource?.close();
    this.onclose?.();
  }
  async send(message) {
    return this._send(message, false);
  }
  async _send(message, isAuthRetry) {
    if (!this._endpoint) throw new SdkError(SdkErrorCode.NotConnected, "Not connected");
    try {
      const headers = await this._commonHeaders();
      headers.set("content-type", "application/json");
      const init = {
        ...this._requestInit,
        method: "POST",
        headers,
        body: JSON.stringify(message),
        signal: this._abortController?.signal
      };
      const response = await (this._fetch ?? fetch)(this._endpoint, init);
      if (!response.ok) {
        if (response.status === 401 && this._authProvider) {
          if (response.headers.has("www-authenticate")) {
            const { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(response);
            this._resourceMetadataUrl = resourceMetadataUrl;
            this._scope = scope;
          }
          if (this._authProvider.onUnauthorized && !isAuthRetry) {
            await this._authProvider.onUnauthorized({
              response,
              serverUrl: this._url,
              fetchFn: this._fetchWithInit
            });
            await response.text?.().catch(() => {
            });
            return this._send(message, true);
          }
          await response.text?.().catch(() => {
          });
          if (isAuthRetry) throw new SdkError(SdkErrorCode.ClientHttpAuthentication, "Server returned 401 after re-authentication", { status: 401 });
          throw new UnauthorizedError();
        }
        const text = await response.text?.().catch(() => null);
        throw new Error(`Error POSTing to endpoint (HTTP ${response.status}): ${text}`);
      }
      await response.text?.().catch(() => {
      });
    } catch (error2) {
      this.onerror?.(error2);
      throw error2;
    }
  }
  setProtocolVersion(version2) {
    this._protocolVersion = version2;
  }
};
var DEFAULT_INHERITED_ENV_VARS = import_node_process.default.platform === "win32" ? [
  "APPDATA",
  "HOMEDRIVE",
  "HOMEPATH",
  "LOCALAPPDATA",
  "PATH",
  "PROCESSOR_ARCHITECTURE",
  "SYSTEMDRIVE",
  "SYSTEMROOT",
  "TEMP",
  "USERNAME",
  "USERPROFILE",
  "PROGRAMFILES"
] : [
  "HOME",
  "LOGNAME",
  "PATH",
  "SHELL",
  "TERM",
  "USER"
];
var DEFAULT_STREAMABLE_HTTP_RECONNECTION_OPTIONS = {
  initialReconnectionDelay: 1e3,
  maxReconnectionDelay: 3e4,
  reconnectionDelayGrowFactor: 1.5,
  maxRetries: 2
};
var StreamableHTTPClientTransport = class {
  _abortController;
  _url;
  _resourceMetadataUrl;
  _scope;
  _requestInit;
  _authProvider;
  _oauthProvider;
  _fetch;
  _fetchWithInit;
  _sessionId;
  _reconnectionOptions;
  _protocolVersion;
  _lastUpscopingHeader;
  _serverRetryMs;
  _reconnectionScheduler;
  _cancelReconnection;
  onclose;
  onerror;
  onmessage;
  constructor(url2, opts) {
    this._url = url2;
    this._resourceMetadataUrl = void 0;
    this._scope = void 0;
    this._requestInit = opts?.requestInit;
    if (isOAuthClientProvider(opts?.authProvider)) {
      this._oauthProvider = opts.authProvider;
      this._authProvider = adaptOAuthProvider(opts.authProvider);
    } else this._authProvider = opts?.authProvider;
    this._fetch = opts?.fetch;
    this._fetchWithInit = createFetchWithInit(opts?.fetch, opts?.requestInit);
    this._sessionId = opts?.sessionId;
    this._protocolVersion = opts?.protocolVersion;
    this._reconnectionOptions = opts?.reconnectionOptions ?? DEFAULT_STREAMABLE_HTTP_RECONNECTION_OPTIONS;
    this._reconnectionScheduler = opts?.reconnectionScheduler;
  }
  async _commonHeaders() {
    const headers = {};
    const token = await this._authProvider?.token();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (this._sessionId) headers["mcp-session-id"] = this._sessionId;
    if (this._protocolVersion) headers["mcp-protocol-version"] = this._protocolVersion;
    const extraHeaders = normalizeHeaders(this._requestInit?.headers);
    return new Headers({
      ...headers,
      ...extraHeaders
    });
  }
  async _startOrAuthSse(options, isAuthRetry = false) {
    const { resumptionToken } = options;
    try {
      const headers = await this._commonHeaders();
      headers.set("Accept", "text/event-stream");
      if (resumptionToken) headers.set("last-event-id", resumptionToken);
      const response = await (this._fetch ?? fetch)(this._url, {
        ...this._requestInit,
        method: "GET",
        headers,
        signal: this._abortController?.signal
      });
      if (!response.ok) {
        if (response.status === 401 && this._authProvider) {
          if (response.headers.has("www-authenticate")) {
            const { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(response);
            this._resourceMetadataUrl = resourceMetadataUrl;
            this._scope = scope;
          }
          if (this._authProvider.onUnauthorized && !isAuthRetry) {
            await this._authProvider.onUnauthorized({
              response,
              serverUrl: this._url,
              fetchFn: this._fetchWithInit
            });
            await response.text?.().catch(() => {
            });
            return this._startOrAuthSse(options, true);
          }
          await response.text?.().catch(() => {
          });
          if (isAuthRetry) throw new SdkError(SdkErrorCode.ClientHttpAuthentication, "Server returned 401 after re-authentication", { status: 401 });
          throw new UnauthorizedError();
        }
        await response.text?.().catch(() => {
        });
        if (response.status === 405) return;
        throw new SdkError(SdkErrorCode.ClientHttpFailedToOpenStream, `Failed to open SSE stream: ${response.statusText}`, {
          status: response.status,
          statusText: response.statusText
        });
      }
      this._handleSseStream(response.body, options, true);
    } catch (error2) {
      this.onerror?.(error2);
      throw error2;
    }
  }
  /**
  * Calculates the next reconnection delay using a backoff algorithm
  *
  * @param attempt Current reconnection attempt count for the specific stream
  * @returns Time to wait in milliseconds before next reconnection attempt
  */
  _getNextReconnectionDelay(attempt) {
    if (this._serverRetryMs !== void 0) return this._serverRetryMs;
    const initialDelay = this._reconnectionOptions.initialReconnectionDelay;
    const growFactor = this._reconnectionOptions.reconnectionDelayGrowFactor;
    const maxDelay = this._reconnectionOptions.maxReconnectionDelay;
    return Math.min(initialDelay * Math.pow(growFactor, attempt), maxDelay);
  }
  /**
  * Schedule a reconnection attempt using server-provided retry interval or backoff
  *
  * @param lastEventId The ID of the last received event for resumability
  * @param attemptCount Current reconnection attempt count for this specific stream
  */
  _scheduleReconnection(options, attemptCount = 0) {
    const maxRetries = this._reconnectionOptions.maxRetries;
    if (attemptCount >= maxRetries) {
      this.onerror?.(/* @__PURE__ */ new Error(`Maximum reconnection attempts (${maxRetries}) exceeded.`));
      return;
    }
    const delay = this._getNextReconnectionDelay(attemptCount);
    const reconnect = () => {
      this._cancelReconnection = void 0;
      if (this._abortController?.signal.aborted) return;
      this._startOrAuthSse(options).catch((error2) => {
        this.onerror?.(/* @__PURE__ */ new Error(`Failed to reconnect SSE stream: ${error2 instanceof Error ? error2.message : String(error2)}`));
        try {
          this._scheduleReconnection(options, attemptCount + 1);
        } catch (scheduleError) {
          this.onerror?.(scheduleError instanceof Error ? scheduleError : new Error(String(scheduleError)));
        }
      });
    };
    if (this._reconnectionScheduler) {
      const cancel = this._reconnectionScheduler(reconnect, delay, attemptCount);
      this._cancelReconnection = typeof cancel === "function" ? cancel : void 0;
    } else {
      const handle = setTimeout(reconnect, delay);
      this._cancelReconnection = () => clearTimeout(handle);
    }
  }
  _handleSseStream(stream, options, isReconnectable) {
    if (!stream) return;
    const { onresumptiontoken, replayMessageId } = options;
    let lastEventId;
    let hasPrimingEvent = false;
    let receivedResponse = false;
    const processStream = async () => {
      try {
        const reader = stream.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream({ onRetry: (retryMs) => {
          this._serverRetryMs = retryMs;
        } })).getReader();
        while (true) {
          const { value: event, done } = await reader.read();
          if (done) break;
          if (event.id) {
            lastEventId = event.id;
            hasPrimingEvent = true;
            onresumptiontoken?.(event.id);
          }
          if (!event.data) continue;
          if (!event.event || event.event === "message") try {
            const message = JSONRPCMessageSchema.parse(JSON.parse(event.data));
            if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) {
              receivedResponse = true;
              if (replayMessageId !== void 0) message.id = replayMessageId;
            }
            this.onmessage?.(message);
          } catch (error2) {
            this.onerror?.(error2);
          }
        }
        if ((isReconnectable || hasPrimingEvent) && !receivedResponse && this._abortController && !this._abortController.signal.aborted) this._scheduleReconnection({
          resumptionToken: lastEventId,
          onresumptiontoken,
          replayMessageId
        }, 0);
      } catch (error2) {
        this.onerror?.(/* @__PURE__ */ new Error(`SSE stream disconnected: ${error2}`));
        if ((isReconnectable || hasPrimingEvent) && !receivedResponse && this._abortController && !this._abortController.signal.aborted) try {
          this._scheduleReconnection({
            resumptionToken: lastEventId,
            onresumptiontoken,
            replayMessageId
          }, 0);
        } catch (error$1) {
          this.onerror?.(/* @__PURE__ */ new Error(`Failed to reconnect: ${error$1 instanceof Error ? error$1.message : String(error$1)}`));
        }
      }
    };
    processStream();
  }
  async start() {
    if (this._abortController) throw new Error("StreamableHTTPClientTransport already started! If using Client class, note that connect() calls start() automatically.");
    this._abortController = new AbortController();
  }
  /**
  * Call this method after the user has finished authorizing via their user agent and is redirected back to the MCP client application. This will exchange the authorization code for an access token, enabling the next connection attempt to successfully auth.
  */
  async finishAuth(authorizationCode) {
    if (!this._oauthProvider) throw new UnauthorizedError("finishAuth requires an OAuthClientProvider");
    if (await auth(this._oauthProvider, {
      serverUrl: this._url,
      authorizationCode,
      resourceMetadataUrl: this._resourceMetadataUrl,
      scope: this._scope,
      fetchFn: this._fetchWithInit
    }) !== "AUTHORIZED") throw new UnauthorizedError("Failed to authorize");
  }
  async close() {
    try {
      this._cancelReconnection?.();
    } finally {
      this._cancelReconnection = void 0;
      this._abortController?.abort();
      this.onclose?.();
    }
  }
  async send(message, options) {
    return this._send(message, options, false);
  }
  async _send(message, options, isAuthRetry) {
    try {
      const { resumptionToken, onresumptiontoken } = options || {};
      if (resumptionToken) {
        this._startOrAuthSse({
          resumptionToken,
          replayMessageId: isJSONRPCRequest(message) ? message.id : void 0
        }).catch((error2) => this.onerror?.(error2));
        return;
      }
      const headers = await this._commonHeaders();
      headers.set("content-type", "application/json");
      headers.set("accept", "application/json, text/event-stream");
      const init = {
        ...this._requestInit,
        method: "POST",
        headers,
        body: JSON.stringify(message),
        signal: this._abortController?.signal
      };
      const response = await (this._fetch ?? fetch)(this._url, init);
      const sessionId = response.headers.get("mcp-session-id");
      if (sessionId) this._sessionId = sessionId;
      if (!response.ok) {
        if (response.status === 401 && this._authProvider) {
          if (response.headers.has("www-authenticate")) {
            const { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(response);
            this._resourceMetadataUrl = resourceMetadataUrl;
            this._scope = scope;
          }
          if (this._authProvider.onUnauthorized && !isAuthRetry) {
            await this._authProvider.onUnauthorized({
              response,
              serverUrl: this._url,
              fetchFn: this._fetchWithInit
            });
            await response.text?.().catch(() => {
            });
            return this._send(message, options, true);
          }
          await response.text?.().catch(() => {
          });
          if (isAuthRetry) throw new SdkError(SdkErrorCode.ClientHttpAuthentication, "Server returned 401 after re-authentication", { status: 401 });
          throw new UnauthorizedError();
        }
        const text = await response.text?.().catch(() => null);
        if (response.status === 403 && this._oauthProvider) {
          const { resourceMetadataUrl, scope, error: error2 } = extractWWWAuthenticateParams(response);
          if (error2 === "insufficient_scope") {
            const wwwAuthHeader = response.headers.get("WWW-Authenticate");
            if (this._lastUpscopingHeader === wwwAuthHeader) throw new SdkError(SdkErrorCode.ClientHttpForbidden, "Server returned 403 after trying upscoping", {
              status: 403,
              text
            });
            if (scope) this._scope = scope;
            if (resourceMetadataUrl) this._resourceMetadataUrl = resourceMetadataUrl;
            this._lastUpscopingHeader = wwwAuthHeader ?? void 0;
            if (await auth(this._oauthProvider, {
              serverUrl: this._url,
              resourceMetadataUrl: this._resourceMetadataUrl,
              scope: this._scope,
              fetchFn: this._fetchWithInit
            }) !== "AUTHORIZED") throw new UnauthorizedError();
            return this._send(message, options, isAuthRetry);
          }
        }
        throw new SdkError(SdkErrorCode.ClientHttpNotImplemented, `Error POSTing to endpoint: ${text}`, {
          status: response.status,
          text
        });
      }
      this._lastUpscopingHeader = void 0;
      if (response.status === 202) {
        await response.text?.().catch(() => {
        });
        if (isInitializedNotification(message)) this._startOrAuthSse({ resumptionToken: void 0 }).catch((error2) => this.onerror?.(error2));
        return;
      }
      const hasRequests = (Array.isArray(message) ? message : [message]).some((msg) => "method" in msg && "id" in msg && msg.id !== void 0);
      const contentType = response.headers.get("content-type");
      if (hasRequests) if (contentType?.includes("text/event-stream")) this._handleSseStream(response.body, { onresumptiontoken }, false);
      else if (contentType?.includes("application/json")) {
        const data = await response.json();
        const responseMessages = Array.isArray(data) ? data.map((msg) => JSONRPCMessageSchema.parse(msg)) : [JSONRPCMessageSchema.parse(data)];
        for (const msg of responseMessages) this.onmessage?.(msg);
      } else {
        await response.text?.().catch(() => {
        });
        throw new SdkError(SdkErrorCode.ClientHttpUnexpectedContent, `Unexpected content type: ${contentType}`, { contentType });
      }
      else await response.text?.().catch(() => {
      });
    } catch (error2) {
      this.onerror?.(error2);
      throw error2;
    }
  }
  get sessionId() {
    return this._sessionId;
  }
  /**
  * Terminates the current session by sending a `DELETE` request to the server.
  *
  * Clients that no longer need a particular session
  * (e.g., because the user is leaving the client application) SHOULD send an
  * HTTP `DELETE` to the MCP endpoint with the `Mcp-Session-Id` header to explicitly
  * terminate the session.
  *
  * The server MAY respond with HTTP `405 Method Not Allowed`, indicating that
  * the server does not allow clients to terminate sessions.
  */
  async terminateSession() {
    if (!this._sessionId) return;
    try {
      const headers = await this._commonHeaders();
      const init = {
        ...this._requestInit,
        method: "DELETE",
        headers,
        signal: this._abortController?.signal
      };
      const response = await (this._fetch ?? fetch)(this._url, init);
      await response.text?.().catch(() => {
      });
      if (!response.ok && response.status !== 405) throw new SdkError(SdkErrorCode.ClientHttpFailedToTerminateSession, `Failed to terminate session: ${response.statusText}`, {
        status: response.status,
        statusText: response.statusText
      });
      this._sessionId = void 0;
    } catch (error2) {
      this.onerror?.(error2);
      throw error2;
    }
  }
  setProtocolVersion(version2) {
    this._protocolVersion = version2;
  }
  get protocolVersion() {
    return this._protocolVersion;
  }
  /**
  * Resume an SSE stream from a previous event ID.
  * Opens a `GET` SSE connection with `Last-Event-ID` header to replay missed events.
  *
  * @param lastEventId The event ID to resume from
  * @param options Optional callback to receive new resumption tokens
  */
  async resumeStream(lastEventId, options) {
    await this._startOrAuthSse({
      resumptionToken: lastEventId,
      onresumptiontoken: options?.onresumptiontoken
    });
  }
};

// src/services/mcp/mcpClientService.ts
var McpClientService = class {
  constructor(output, secrets) {
    this.output = output;
    this.secrets = secrets;
  }
  output;
  secrets;
  client;
  transport;
  connectedUrl;
  toolsCache = [];
  instructions = "";
  isConnected() {
    return Boolean(this.client);
  }
  getConnectedUrl() {
    return this.connectedUrl;
  }
  getInstructions() {
    return this.instructions;
  }
  getCachedTools() {
    return this.toolsCache;
  }
  async connect(settings) {
    await this.disconnect();
    const url2 = new URL(settings.mcp.serverUrl);
    const token = await this.secrets.getMcpBearerToken();
    const authProvider = token ? { token: async () => token } : void 0;
    this.output.appendLine(`[MCP] connecting to ${url2.toString()} mode=${settings.mcp.connectionMode}`);
    const createClient = () => new Client({
      name: "oem-assistant",
      version: "0.1.0"
    });
    try {
      if (settings.mcp.connectionMode === "streamable-http") {
        this.client = createClient();
        this.transport = new StreamableHTTPClientTransport(url2, authProvider ? { authProvider } : void 0);
        await this.client.connect(this.transport);
      } else if (settings.mcp.connectionMode === "legacy-sse") {
        this.client = createClient();
        this.transport = new SSEClientTransport(url2);
        await this.client.connect(this.transport);
      } else {
        try {
          this.client = createClient();
          this.transport = new StreamableHTTPClientTransport(url2, authProvider ? { authProvider } : void 0);
          await this.client.connect(this.transport);
          this.output.appendLine("[MCP] connected via Streamable HTTP");
        } catch (streamErr) {
          this.output.appendLine(`[MCP] Streamable HTTP failed, fallback to SSE: ${String(streamErr)}`);
          this.client = createClient();
          this.transport = new SSEClientTransport(url2);
          await this.client.connect(this.transport);
          this.output.appendLine("[MCP] connected via legacy SSE");
        }
      }
      this.connectedUrl = url2.toString();
      this.instructions = this.client.getInstructions() ?? "";
      await this.refreshTools();
    } catch (error2) {
      await this.disconnect();
      throw error2;
    }
  }
  async refreshTools() {
    if (!this.client) {
      throw new Error("MCP client is not connected.");
    }
    const allTools = [];
    let cursor;
    do {
      const response = await this.client.listTools({ cursor });
      allTools.push(...response.tools);
      cursor = response.nextCursor;
    } while (cursor);
    this.toolsCache = allTools;
    this.output.appendLine(`[MCP] tools refreshed: ${allTools.map((t) => t.name).join(", ") || "(none)"}`);
    return allTools;
  }
  async callTool(name, args) {
    if (!this.client) {
      throw new Error("MCP client is not connected.");
    }
    const response = await this.client.callTool({ name, arguments: args });
    const textParts = response.content.map((item) => {
      if (item?.type === "text") {
        return item.text;
      }
      return JSON.stringify(item, null, 2);
    }).filter(Boolean);
    if (response.structuredContent) {
      const structured = JSON.stringify(response.structuredContent, null, 2);
      const current = textParts.join("\n");
      const alreadyIncluded = current.includes(structured);
      if (!alreadyIncluded) {
        textParts.push(`
[structuredContent]
${structured}`);
      }
    }
    const result = textParts.join("\n");
    this.output.appendLine(`[MCP] tool ${name} executed`);
    return result || "(empty tool result)";
  }
  async disconnect() {
    if (this.transport && this.transport instanceof StreamableHTTPClientTransport) {
      try {
        await this.transport.terminateSession();
      } catch {
      }
    }
    if (this.client) {
      try {
        await this.client.close();
      } catch {
      }
    }
    this.client = void 0;
    this.transport = void 0;
    this.connectedUrl = void 0;
    this.instructions = "";
    this.toolsCache = [];
  }
};

// src/services/oracleDocSearchService.ts
function isAllowedOracleRagUrl(url2) {
  try {
    const u = new URL(url2);
    if (u.protocol !== "https:") {
      return false;
    }
    const h = u.hostname.toLowerCase();
    if (h === "blogs.oracle.com") {
      return true;
    }
    if (h === "docs.oracle.com") {
      return u.pathname === "/en" || u.pathname.startsWith("/en/");
    }
    return false;
  } catch {
    return false;
  }
}
function stripHtmlToText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
async function fetchPageSnippet(url2, maxChars, fetchImpl) {
  const res = await fetchImpl(url2, {
    method: "GET",
    headers: {
      "User-Agent": "OEM-Assistant-RAG/0.1 (VSCode extension)",
      Accept: "text/html,application/xhtml+xml"
    }
  });
  if (!res.ok) {
    return `[fetch failed: ${res.status}]`;
  }
  const html = await res.text();
  const text = stripHtmlToText(html);
  return text.length > maxChars ? `${text.slice(0, maxChars)}
\u2026` : text;
}
async function searchOracleRagViaTavily(query, apiKey, maxResults, fetchImpl = fetch) {
  const n = Math.min(Math.max(1, maxResults), 20);
  const res = await fetchImpl("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: query.trim(),
      search_depth: "basic",
      max_results: n,
      include_domains: ["docs.oracle.com", "blogs.oracle.com"]
    })
  });
  const rawText = await res.text();
  let json2;
  try {
    json2 = JSON.parse(rawText);
  } catch {
    throw new Error(`Tavily response is not JSON: ${rawText.slice(0, 200)}`);
  }
  if (!res.ok) {
    const detail = typeof json2.message === "string" ? json2.message : json2.error ?? rawText.slice(0, 300);
    throw new Error(`Tavily search failed: ${res.status} ${detail}`);
  }
  const out = [];
  for (const r of json2.results ?? []) {
    const link = typeof r.url === "string" ? r.url.trim() : "";
    const title = typeof r.title === "string" ? r.title.trim() : link;
    if (!link || !isAllowedOracleRagUrl(link)) {
      continue;
    }
    const sn = typeof r.content === "string" ? r.content.trim() : "";
    out.push({
      title: title || link,
      url: link,
      ...sn ? { snippet: sn.length > 12e3 ? `${sn.slice(0, 12e3)}\u2026` : sn } : {}
    });
  }
  return out;
}

// src/orchestration/ragOrchestrator.ts
function parseJsonObjectFromLlm(text) {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  const raw = fence ? fence[1].trim() : trimmed;
  const parsed = JSON.parse(raw);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed;
  }
  throw new Error("LLM output is not a JSON object.");
}
function normalizeReferences(raw, allowed) {
  const allowSet = new Set(allowed.map((a) => a.url));
  const byUrl = new Map(allowed.map((a) => [a.url, a]));
  if (!Array.isArray(raw)) {
    return [];
  }
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const rec = item;
    const url2 = typeof rec.url === "string" ? rec.url.trim() : "";
    if (!url2 || !allowSet.has(url2)) {
      continue;
    }
    const meta3 = byUrl.get(url2);
    const title = typeof rec.title === "string" && rec.title.trim() ? rec.title.trim() : meta3?.title ?? url2;
    const sn = meta3?.snippet?.trim();
    out.push(sn ? { title, url: url2, snippet: sn } : { title, url: url2 });
  }
  return out;
}
var RagOrchestrator = class {
  constructor(settings, secrets, output, fetchImpl = fetch) {
    this.settings = settings;
    this.secrets = secrets;
    this.output = output;
    this.fetchImpl = fetchImpl;
  }
  settings;
  secrets;
  output;
  fetchImpl;
  async ask(userText, conversationContext = []) {
    const apiKey = await this.secrets.getLlmApiKey();
    if (!apiKey) {
      throw new Error("LLM API key is not configured. Run: OEM Assistant: Set LLM API Key");
    }
    if (this.settings.llm.provider === "copilot") {
      throw new Error("Copilot mode is reserved for a later version. Use openai-compatible.");
    }
    const tavilyKey = (await this.secrets.getTavilyApiKey())?.trim() ?? "";
    if (!tavilyKey) {
      return {
        finalText: "\u672A\u914D\u7F6E Tavily API Key\u3002\u8BF7\u6253\u5F00 OEM Assistant Settings\uFF0C\u5728\u300CRAG\u300D\u4E2D\u586B\u5199 Tavily API Key\uFF08SecretStorage \u4FDD\u5B58\uFF09\u3002\u68C0\u7D22\u8303\u56F4\u4EC5 https://docs.oracle.com/en/ \u4E0E https://blogs.oracle.com/ \u3002\u914D\u7F6E\u540E\u91CD\u8BD5\u3002",
        steps: [
          {
            type: "info",
            title: "RAG",
            detail: "\u4F7F\u7528 Tavily Search API\uFF08include_domains: docs.oracle.com\u3001blogs.oracle.com\uFF09\uFF0C\u7ED3\u679C\u518D\u6309 URL \u89C4\u5219\u8FC7\u6EE4\u4E3A\u4EC5 docs.oracle.com/en/ \u4E0E blogs.oracle.com\u3002"
          }
        ]
      };
    }
    const topK = this.settings.rag.searchTopK;
    const snippetPages = Math.max(0, Math.min(5, this.settings.rag.fetchSnippetPages));
    const snippetMax = Math.max(500, this.settings.rag.snippetMaxChars);
    let links;
    try {
      links = await searchOracleRagViaTavily(userText, tavilyKey, topK, this.fetchImpl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.output.appendLine(`[RAG search] ${msg}`);
      return {
        finalText: `Oracle \u6587\u6863\u68C0\u7D22\u5931\u8D25\uFF1A${msg}`,
        steps: [{ type: "error", title: "\u68C0\u7D22", detail: msg }]
      };
    }
    if (links.length === 0) {
      return {
        finalText: "\u672A\u5728\u5141\u8BB8\u7AD9\u70B9\uFF08docs.oracle.com/en/ \u4E0E blogs.oracle.com\uFF09\u68C0\u7D22\u5230\u5339\u914D\u9875\u9762\u3002\u8BF7\u6362\u7528\u82F1\u6587\u5173\u952E\u8BCD\u3001\u4EA7\u54C1\u540D\u6216\u6587\u6863\u4E2D\u7684\u672F\u8BED\u540E\u91CD\u8BD5\u3002",
        steps: [{ type: "info", title: "\u68C0\u7D22", detail: "0 results after Tavily + URL filter" }]
      };
    }
    const snippetParts = [];
    const slice = links.slice(0, snippetPages);
    for (let i = 0; i < slice.length; i++) {
      const u = slice[i].url;
      try {
        const sn = await fetchPageSnippet(u, Math.floor(snippetMax / Math.max(1, slice.length)), this.fetchImpl);
        snippetParts.push(`--- Page ${i + 1}: ${u} ---
${sn}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        snippetParts.push(`--- Page ${i + 1}: ${u} ---
[snippet fetch failed: ${msg}]`);
      }
    }
    let snippetsJoined = snippetParts.join("\n\n");
    if (!snippetsJoined.trim()) {
      snippetsJoined = links.map((l, i) => {
        const sn = l.snippet?.trim() || "";
        return `--- Tavily ${i + 1}: ${l.url} ---
${sn || "(no snippet from search API)"}`;
      }).join("\n\n");
    }
    const llm = new OpenAiCompatibleLlmService(
      this.settings.llm.baseUrl,
      apiKey,
      this.settings.llm.model,
      0.1
    );
    const allowedJson = JSON.stringify(links, null, 0);
    const systemPrompt = [
      "You answer using only the user question and the PROVIDED document excerpts and allowed link list.",
      'Do not invent URLs. The "references" array may only contain objects whose "url" appears in the allowed list.',
      "Respond in Chinese unless the user explicitly asked another language.",
      "Output a single JSON object only, no markdown fence, with keys:",
      '"answer" (string, markdown allowed in plain text only, no HTML tags)',
      '"references" (array of { "title", "url" } subset of allowed links you cited).'
    ].join("\n");
    const userBlock = [
      `User question:
${userText}`,
      "",
      `Allowed links (title + url):
${allowedJson}`,
      "",
      `Document excerpts:
${snippetsJoined}`
    ].join("\n");
    const prior = conversationContext.slice(-12);
    const messages = [
      { role: "system", content: systemPrompt },
      ...prior,
      { role: "user", content: userBlock }
    ];
    const choice = await llm.complete(messages, []);
    const content = choice.content?.trim();
    if (!content) {
      throw new Error("LLM returned empty content.");
    }
    let parsed;
    try {
      parsed = parseJsonObjectFromLlm(content);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.output.appendLine(`[RAG] JSON parse failed: ${msg}
Raw: ${content.slice(0, 2e3)}`);
      return {
        finalText: "\u6A21\u578B\u672A\u8FD4\u56DE\u53EF\u89E3\u6790\u7684 JSON\u3002\u8BF7\u91CD\u8BD5\uFF1B\u82E5\u6301\u7EED\u5931\u8D25\uFF0C\u8BF7\u964D\u4F4E\u95EE\u9898\u957F\u5EA6\u6216\u68C0\u67E5\u6A21\u578B\u662F\u5426\u652F\u6301\u6307\u4EE4\u9075\u5FAA\u3002",
        steps: [
          { type: "error", title: "LLM", detail: msg },
          { type: "info", title: "\u68C0\u7D22\u547D\u4E2D", detail: `${links.length} page(s) (Tavily, allowed URLs only)` }
        ],
        referenceLinks: links
      };
    }
    const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
    const refs = normalizeReferences(parsed.references, links);
    if (!answer) {
      return {
        finalText: "\u6A21\u578B\u672A\u751F\u6210\u6709\u6548\u56DE\u7B54\u6B63\u6587\u3002\u8BF7\u91CD\u8BD5\u3002",
        steps: [{ type: "info", title: "\u68C0\u7D22\u547D\u4E2D", detail: `${links.length} page(s)` }],
        referenceLinks: links
      };
    }
    return {
      finalText: answer,
      steps: [
        {
          type: "info",
          title: "\u68C0\u7D22",
          detail: `Tavily \u547D\u4E2D ${links.length} \u6761\uFF08\u5141\u8BB8\u7AD9\u70B9\u5185\uFF09\uFF1B\u7528\u4E8E HTML \u6458\u5F55 ${slice.length} \u9875\u3002`
        }
      ],
      referenceLinks: refs.length > 0 ? refs : links
    };
  }
};

// src/views/chatPanel.ts
var vscode4 = __toESM(require("vscode"));

// src/views/chatPanelHtml.ts
function buildChatPanelHtml(options) {
  const isOem = options.mode === "oem";
  const { chartSrc, csp } = options;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="${csp.replace(/"/g, "&quot;")}" />
  <title>${isOem ? "OEM Assistant Console" : "OEM RAG Console"}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family);
      margin: 0;
      padding: 0;
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .layout {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .conv-sidebar {
      width: 200px;
      min-width: 160px;
      border-right: 1px solid var(--vscode-panel-border);
      display: flex;
      flex-direction: column;
      background: color-mix(in srgb, var(--vscode-sideBar-background) 90%, transparent);
    }
    .conv-toolbar {
      padding: 8px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .conv-toolbar button {
      width: 100%;
      padding: 6px 8px;
      font-size: 12px;
      cursor: pointer;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
      border-radius: 4px;
    }
    .conv-toolbar button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .conv-list {
      list-style: none;
      margin: 0;
      padding: 4px;
      overflow-y: auto;
      flex: 1;
    }
    .conv-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 6px;
      margin-bottom: 2px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      border: 1px solid transparent;
    }
    .conv-item:hover {
      background: color-mix(in srgb, var(--vscode-list-hoverBackground) 80%, transparent);
    }
    .conv-item.active {
      background: color-mix(in srgb, var(--vscode-list-activeSelectionBackground) 35%, transparent);
      border-color: var(--vscode-focusBorder);
    }
    .conv-title-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .conv-item button.icon {
      flex: 0 0 22px;
      height: 22px;
      padding: 0;
      font-size: 11px;
      line-height: 1;
      cursor: pointer;
      border: none;
      border-radius: 3px;
      background: transparent;
      color: var(--vscode-foreground);
      opacity: 0.85;
    }
    .conv-item button.icon:hover {
      background: color-mix(in srgb, var(--vscode-toolbar-hoverBackground) 90%, transparent);
    }
    .conv-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      padding: 8px 4px;
    }
    .chat-log {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 12px;
      min-height: 200px;
      flex: 1;
      overflow-y: auto;
    }
    .bubble {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 10px;
      padding: 10px;
      white-space: pre-wrap;
      word-break: break-word;
      min-width: 0;
    }
    .bubble.user {
      align-self: flex-end;
      max-width: min(92%, 720px);
      background: color-mix(in srgb, var(--vscode-button-background) 15%, transparent);
    }
    .bubble.assistant {
      align-self: stretch;
      width: 100%;
      max-width: 100%;
      background: color-mix(in srgb, var(--vscode-editorWidget-background) 75%, transparent);
    }
    .bubble.info {
      align-self: center;
      background: color-mix(in srgb, var(--vscode-textCodeBlock-background) 65%, transparent);
      opacity: 0.95;
      font-size: 12px;
    }
    .bubble-title {
      font-weight: 600;
      margin-bottom: 6px;
      font-size: 12px;
      opacity: 0.9;
    }
    details {
      margin-top: 8px;
      border-top: 1px dashed var(--vscode-panel-border);
      padding-top: 8px;
    }
    details summary {
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
    }
    .step {
      margin-top: 8px;
      padding: 8px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      background: color-mix(in srgb, var(--vscode-textCodeBlock-background) 55%, transparent);
    }
    .step-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .composer {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      align-items: end;
      position: relative;
    }
    textarea {
      width: 100%;
      min-height: 96px;
      resize: vertical;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 8px;
      padding: 8px;
      font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
    }
    .submit-btn {
      height: 38px;
      width: 38px;
      border-radius: 8px;
      border: 1px solid var(--vscode-button-border);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
    }
    .submit-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .tool-picker {
      position: absolute;
      left: 0;
      right: 46px;
      bottom: 110px;
      max-height: 220px;
      overflow-y: auto;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      background: var(--vscode-editorWidget-background);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
      z-index: 10;
      display: none;
    }
    .tool-picker.visible {
      display: block;
    }
    .tool-option {
      padding: 8px 10px;
      cursor: pointer;
      border-bottom: 1px solid color-mix(in srgb, var(--vscode-panel-border) 40%, transparent);
    }
    .tool-option:last-child {
      border-bottom: none;
    }
    .tool-option:hover,
    .tool-option.active {
      background: color-mix(in srgb, var(--vscode-list-hoverBackground) 80%, transparent);
    }
    .tool-option .name {
      font-weight: 600;
      font-size: 12px;
    }
    .tool-option .desc {
      font-size: 11px;
      opacity: 0.9;
      margin-top: 4px;
    }
    .hint {
      margin-top: 6px;
      font-size: 11px;
      opacity: 0.8;
    }
    .mention-pill {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--vscode-badge-background);
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 11px;
      margin-right: 6px;
      margin-bottom: 6px;
      background: color-mix(in srgb, var(--vscode-badge-background) 22%, transparent);
    }
    .mention-wrap {
      min-height: 20px;
      margin: 4px 0;
    }
    .oem-fetch-charts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 16px;
      margin-top: 10px;
      width: 100%;
      align-items: start;
    }
    .chart-wrap {
      position: relative;
      width: 100%;
      min-height: 300px;
      height: clamp(320px, 44vh, 560px);
      max-height: min(60vh, 640px);
      min-width: 0;
      margin-bottom: 0;
    }
    .chart-toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0 10px 0;
      border-bottom: 1px solid var(--vscode-panel-border);
      font-size: 12px;
      flex-wrap: wrap;
    }
    .chart-toolbar .chart-toggle-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      user-select: none;
    }
    .chart-toolbar .chart-hint {
      opacity: 0.75;
      font-size: 11px;
    }
    .oem-chart-section {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px dashed var(--vscode-panel-border);
    }
    .oem-chart-section-title {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
      opacity: 0.9;
    }
    .oem-chart-block-title {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
      opacity: 0.95;
      color: var(--vscode-foreground);
    }
    .chart-wrap-table {
      min-height: auto;
      height: auto;
      max-height: none;
    }
    .oem-chart-table-wrap {
      overflow-x: auto;
      width: 100%;
    }
    .oem-chart-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .oem-chart-table th,
    .oem-chart-table td {
      border: 1px solid var(--vscode-panel-border);
      padding: 8px 10px;
      text-align: left;
      word-break: break-word;
    }
    .oem-chart-table th {
      background: color-mix(in srgb, var(--vscode-editorWidget-background) 82%, transparent);
      font-weight: 600;
    }
    .oem-chart-table tbody tr:nth-child(even) {
      background: color-mix(in srgb, var(--vscode-editorWidget-background) 45%, transparent);
    }
    .ref-links {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px dashed var(--vscode-panel-border);
      font-size: 12px;
    }
    .ref-links-title {
      font-weight: 600;
      margin-bottom: 6px;
      opacity: 0.9;
    }
    .ref-link-row {
      margin: 4px 0;
    }
    .ref-link-row a {
      color: var(--vscode-textLink-foreground);
    }
    .rag-top-hint {
      font-size: 11px;
      opacity: 0.85;
      padding: 6px 0 8px 0;
      border-bottom: 1px solid var(--vscode-panel-border);
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="layout">
    <aside class="conv-sidebar">
      <div class="conv-toolbar">
        <button type="button" id="newConvBtn">+ \u65B0\u5EFA\u4F1A\u8BDD</button>
      </div>
      <ul id="convList" class="conv-list" role="list"></ul>
    </aside>
    <div class="conv-main">
      <div class="chart-toolbar" style="${isOem ? "" : "display:none"}">
        <label class="chart-toggle-label" for="chartToggle">
          <input type="checkbox" id="chartToggle" checked />
          \u663E\u793A\u6570\u636E\u56FE\u8868
        </label>
        <span class="chart-hint">\u56FE\u8868\u5C55\u793A\u5728\u52A9\u624B\u56DE\u7B54\u6B63\u6587\u4E0B\u65B9\uFF1B\u5173\u95ED\u540E\u4EC5\u9690\u85CF\u56FE\u8868\u3002</span>
      </div>
      <div class="rag-top-hint" style="${isOem ? "display:none" : ""}">
        \u77E5\u8BC6\u68C0\u7D22\uFF1A\u4EC5 https://docs.oracle.com/en/ \u4E0E https://blogs.oracle.com/ \u3002\u8BF7\u5728 OEM Assistant Settings \u2192 RAG \u4E2D\u914D\u7F6E Tavily API Key\uFF08SecretStorage\uFF09\u3002
      </div>
      <div id="log" class="chat-log"></div>
      <div class="mention-wrap" id="mentions" style="${isOem ? "" : "display:none"}"></div>
      <div class="composer">
        <div id="toolPicker" class="tool-picker" role="listbox" aria-label="MCP tools" style="${isOem ? "" : "display:none"}"></div>
        <textarea id="input" placeholder="${isOem ? "\u8F93\u5165 @ \u53EF\u5FEB\u901F\u9009\u62E9 tool\uFF0C\u4F8B\u5982\uFF1A@fetch_data_from_oem \u67E5\u8BE2xx\u4E3B\u673ACPU\u544A\u8B66\u3002" : "\u8F93\u5165\u5173\u4E8E Oracle \u6587\u6863\u7684\u95EE\u9898\uFF08\u82F1\u6587\u5173\u952E\u8BCD\u68C0\u7D22\u6548\u679C\u66F4\u7A33\uFF09\u3002"}"></textarea>
        <button id="askBtn" class="submit-btn" title="Submit">\u27A4</button>
      </div>
      <div class="hint">${isOem ? "\u63D0\u793A\uFF1A\u8F93\u5165 @tool_name \u53EF\u6307\u5B9A\u4F18\u5148\u8C03\u7528\u5DE5\u5177\uFF1BCtrl/Cmd+Enter \u53D1\u9001\u3002" : "Ctrl/Cmd+Enter \u53D1\u9001\u3002"}</div>
    </div>
  </div>

  ${isOem ? `<script src="${chartSrc}"></script>` : ""}
  <script>
    const vscode = acquireVsCodeApi();
    const IS_OEM = ${isOem ? "true" : "false"};
    const input = document.getElementById('input');
    const log = document.getElementById('log');
    const picker = document.getElementById('toolPicker');
    const mentions = document.getElementById('mentions');
    const convList = document.getElementById('convList');
    const newConvBtn = document.getElementById('newConvBtn');
    const chartToggle = document.getElementById('chartToggle');
    let toolsCatalog = [];
    let currentOptions = [];
    let activeOptionIndex = 0;
    let currentActiveId = '';
    let convItems = [];
    let showFetchDataCharts = true;
    let settingsAllowCharts = true;

    (function initChartToggleFromStorage() {
      if (!chartToggle) {
        return;
      }
      const saved = localStorage.getItem('oemAssistant.showCharts');
      if (saved !== null) {
        chartToggle.checked = saved === 'true';
      }
    })();

    if (chartToggle) {
      chartToggle.addEventListener('change', function() {
        localStorage.setItem('oemAssistant.showCharts', String(chartToggle.checked));
        document.querySelectorAll('.oem-chart-section').forEach(function(el) {
          el.style.display = chartToggle.checked && settingsAllowCharts ? '' : 'none';
        });
      });
    }

    function redrawMentions() {
      if (!IS_OEM) {
        mentions.innerHTML = '';
        return;
      }
      const used = extractToolMentions(input.value);
      if (!used.length) {
        mentions.innerHTML = '';
        return;
      }
      mentions.innerHTML = used.map(name => '<span class="mention-pill">@' + escapeHtml(name) + '</span>').join('');
    }

    function redactSensitiveText(raw) {
      let text = String(raw || '');
      text = text.replace(/"password"\\s*:\\s*"[^"]*"/gi, '"password": "***"');
      text = text.replace(/"pass"\\s*:\\s*"[^"]*"/gi, '"pass": "***"');
      text = text.replace(/"pwd"\\s*:\\s*"[^"]*"/gi, '"pwd": "***"');
      text = text.replace(/(password\\s*[=:]\\s*)([^\\s,\\n]+)/gi, '$1***');
      text = text.replace(/(\u5BC6\u7801\\s*[\uFF1A:\\=]\\s*)([^\\s,\\n]+)/g, '$1***');
      text = text.replace(/(username\\s*[=:]\\s*)([^\\s,\\n]+)/gi, '$1***');
      text = text.replace(/(\u7528\u6237\u540D\\s*[\uFF1A:\\=]\\s*)([^\\s,\\n]+)/g, '$1***');
      text = text.replace(/(https?:\\/\\/[^\\s]*\\/em\\/api)/gi, '[OEM_API_REDACTED]');
      return text;
    }

    function appendBubble(type, title, bodyHtml) {
      const div = document.createElement('div');
      div.className = 'bubble ' + type;
      div.innerHTML = '<div class="bubble-title">' + escapeHtml(title) + '</div>' + bodyHtml;
      log.appendChild(div);
      div.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return div;
    }

    function clearLog() {
      log.innerHTML = '';
    }

    function renderConvList(items, activeId) {
      convItems = items || [];
      currentActiveId = activeId || '';
      convList.innerHTML = (convItems || []).map(meta => {
        const active = meta.id === activeId ? ' conv-item active' : ' conv-item';
        return '<li class="' + active.trim() + '" data-id="' + escapeHtml(meta.id) + '">'
          + '<span class="conv-title-text" title="' + escapeHtml(meta.title) + '">' + escapeHtml(meta.title) + '</span>'
          + '<button type="button" class="icon conv-rename" title="\u91CD\u547D\u540D" data-id="' + escapeHtml(meta.id) + '">\u270E</button>'
          + '<button type="button" class="icon conv-del" title="\u5220\u9664" data-id="' + escapeHtml(meta.id) + '">\xD7</button>'
          + '</li>';
      }).join('');
    }

    function buildChartJsOptions(chart) {
      const tickFont = { font: { size: 11 } };
      const scales = {};
      if (chart.chartType === 'bar') {
        scales.x = {
          title: chart.xAxisLabel ? { display: true, text: chart.xAxisLabel } : undefined,
          ticks: { maxRotation: 50, minRotation: 0, autoSkip: false, ...tickFont }
        };
        if (chart.yAxisLabel) {
          scales.y = {
            title: { display: true, text: chart.yAxisLabel },
            ticks: { maxTicksLimit: 8, ...tickFont }
          };
        }
      } else {
        if (chart.xAxisLabel) {
          scales.x = { title: { display: true, text: chart.xAxisLabel }, ticks: { ...tickFont } };
        }
        if (chart.yAxisLabel) {
          scales.y = {
            title: { display: true, text: chart.yAxisLabel },
            ticks: { maxTicksLimit: 8, ...tickFont }
          };
        }
      }
      const base = { responsive: true, maintainAspectRatio: false };
      if (Object.keys(scales).length) {
        base.scales = scales;
      }
      const ds = chart.datasets || [];
      if (chart.chartType === 'line' && ds.length > 1) {
        base.plugins = {
          legend: { display: true, position: 'bottom' }
        };
      }
      return base;
    }

    function initFetchCharts(container) {
      if (typeof Chart === 'undefined') {
        return;
      }
      container.querySelectorAll('.oem-fetch-charts').forEach(function(el) {
        const raw = el.getAttribute('data-spec');
        if (!raw) {
          return;
        }
        try {
          const spec = JSON.parse(decodeURIComponent(raw));
          el.innerHTML = '';
          spec.charts.forEach(function(chart) {
            const wrap = document.createElement('div');
            wrap.className = 'chart-wrap';

            if (chart.chartType === 'table' && chart.tableRows && chart.tableRows.length && chart.tableColumns && chart.tableColumns.length >= 2) {
              wrap.classList.add('chart-wrap-table');
              if (chart.title) {
                const bt = document.createElement('div');
                bt.className = 'oem-chart-block-title';
                bt.textContent = chart.title;
                wrap.appendChild(bt);
              }
              const tw = document.createElement('div');
              tw.className = 'oem-chart-table-wrap';
              const tbl = document.createElement('table');
              tbl.className = 'oem-chart-table';
              const thead = document.createElement('thead');
              const trh = document.createElement('tr');
              chart.tableColumns.forEach(function(col) {
                const th = document.createElement('th');
                th.textContent = col;
                trh.appendChild(th);
              });
              thead.appendChild(trh);
              tbl.appendChild(thead);
              const tbody = document.createElement('tbody');
              chart.tableRows.forEach(function(row) {
                const tr = document.createElement('tr');
                row.forEach(function(cell) {
                  const td = document.createElement('td');
                  td.textContent = cell;
                  tr.appendChild(td);
                });
                tbody.appendChild(tr);
              });
              tbl.appendChild(tbody);
              tw.appendChild(tbl);
              wrap.appendChild(tw);
              el.appendChild(wrap);
              return;
            }

            const canvas = document.createElement('canvas');
            wrap.appendChild(canvas);
            el.appendChild(wrap);
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              return;
            }
            if (chart.chartType === 'scatter' && chart.scatterPoints && chart.scatterPoints.length) {
              var pts = chart.scatterPoints;
              var mag = pts.map(function(p) { return Math.abs(p.x) + Math.abs(p.y); });
              var maxMag = Math.max.apply(null, mag) || 1;
              if (chart.title) {
                const bt2 = document.createElement('div');
                bt2.className = 'oem-chart-block-title';
                bt2.textContent = chart.title;
                wrap.insertBefore(bt2, canvas);
              }
              var gridCol = 'rgba(128, 128, 128, 0.18)';
              new Chart(ctx, {
                type: 'bubble',
                data: {
                  datasets: [{
                    label: chart.title || 'series',
                    data: pts.map(function(p, i) {
                      var t = mag[i] / maxMag;
                      var r = Math.max(14, Math.min(34, 10 + Math.sqrt(t) * 24));
                      return { x: p.x, y: p.y, r: r };
                    }),
                    backgroundColor: pts.map(function(_, i) {
                      var h = (200 + i * 47) % 360;
                      return 'hsla(' + h + ', 58%, 52%, 0.58)';
                    }),
                    borderColor: pts.map(function(_, i) {
                      var h = (200 + i * 47) % 360;
                      return 'hsla(' + h + ', 58%, 38%, 0.92)';
                    }),
                    borderWidth: 2,
                    hoverBackgroundColor: pts.map(function(_, i) {
                      var h = (200 + i * 47) % 360;
                      return 'hsla(' + h + ', 58%, 48%, 0.75)';
                    }),
                    hoverBorderWidth: 2
                  }]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      type: 'linear',
                      title: chart.xAxisLabel ? { display: true, text: chart.xAxisLabel } : undefined,
                      ticks: { font: { size: 11 } },
                      grid: { color: gridCol }
                    },
                    y: {
                      title: chart.yAxisLabel ? { display: true, text: chart.yAxisLabel } : undefined,
                      ticks: { maxTicksLimit: 8, font: { size: 11 } },
                      grid: { color: gridCol }
                    }
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: function(ctx) {
                          var d = ctx.raw;
                          return 'x: ' + d.x + ', y: ' + d.y + ' (r\u2248' + (d.r && d.r.toFixed ? d.r.toFixed(1) : d.r) + ')';
                        }
                      }
                    }
                  }
                }
              });
            } else {
              const opts = buildChartJsOptions(chart);
              new Chart(ctx, {
                type: chart.chartType,
                data: {
                  labels: chart.labels,
                  datasets: (chart.datasets || []).map(function(ds) {
                    return { label: ds.label, data: ds.data };
                  })
                },
                options: opts
              });
            }
          });
        } catch (e) {
          console.error(e);
        }
      });
    }

    function collectAllFetchCharts(result) {
      const out = [];
      if (!result || !result.steps) {
        return { charts: [] };
      }
      for (var i = 0; i < result.steps.length; i++) {
        var step = result.steps[i];
        if (step.fetchCharts && step.fetchCharts.charts && step.fetchCharts.charts.length) {
          for (var j = 0; j < step.fetchCharts.charts.length; j++) {
            out.push(step.fetchCharts.charts[j]);
          }
        }
      }
      return { charts: out.slice(0, 10) };
    }

    function appendReferenceLinks(wrapper, result) {
      if (!result || !result.referenceLinks || !result.referenceLinks.length) {
        return;
      }
      const box = document.createElement('div');
      box.className = 'ref-links';
      box.innerHTML =
        '<div class="ref-links-title">\u76F8\u5173\u6587\u6863</div>' +
        result.referenceLinks
          .map(function (l) {
            const u = escapeHtml(String(l.url || ''));
            const t = escapeHtml(String(l.title || l.url || ''));
            return '<div class="ref-link-row"><a href="' + u + '" target="_blank" rel="noopener noreferrer">' + t + '</a></div>';
          })
          .join('');
      wrapper.appendChild(box);
    }

    function renderAssistantBubble(result, skipTypewriter, messageShowCharts) {
      const settingsOk = messageShowCharts !== undefined ? messageShowCharts : showFetchDataCharts;
      const userWantsCharts = chartToggle ? chartToggle.checked : true;
      const useCharts = userWantsCharts && settingsOk && settingsAllowCharts;

      const wrapper = appendBubble('assistant', 'Assistant', '<div class="answer-body"></div>');
      const answerBody = wrapper.querySelector('.answer-body');
      if (!answerBody) return;

      const chartSection = document.createElement('div');
      chartSection.className = 'oem-chart-section';
      chartSection.style.display = 'none';
      answerBody.after(chartSection);

      const runSteps = () => {
        const merged = collectAllFetchCharts(result);
        if (useCharts && merged.charts.length) {
          chartSection.style.display = '';
          chartSection.innerHTML =
            '<div class="oem-chart-section-title">\u6570\u636E\u56FE\u8868</div>'
            + '<div class="oem-fetch-charts" data-spec="' + encodeURIComponent(JSON.stringify(merged)) + '"></div>';
          initFetchCharts(chartSection);
        } else {
          chartSection.style.display = 'none';
          chartSection.innerHTML = '';
        }

        const stepsHtml = result.steps
          .map(function(step) {
            return (
              '<div class="step">'
              + '<div class="step-title">' + escapeHtml(step.title) + '</div>'
              + '<div>' + escapeHtml(redactSensitiveText(step.detail)) + '</div>'
              + '</div>'
            );
          })
          .join('');
        if (stepsHtml) {
          const details = document.createElement('details');
          details.innerHTML = '<summary>Tool Execution Trace</summary>' + stepsHtml;
          wrapper.appendChild(details);
        }
        appendReferenceLinks(wrapper, result);
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'end' });
      };

      if (skipTypewriter) {
        answerBody.textContent = redactSensitiveText(result.finalText);
        runSteps();
        return;
      }

      const text = redactSensitiveText(result.finalText);
      const batchSize = 3;
      const frameDelay = 12;
      let index = 0;
      const timer = setInterval(() => {
        const next = Math.min(index + batchSize, text.length);
        answerBody.textContent = text.slice(0, next);
        index = next;
        if (index >= text.length) {
          clearInterval(timer);
          runSteps();
        }
      }, frameDelay);
    }

    function renderMessages(messages) {
      clearLog();
      if (!messages || !messages.length) return;
      for (const m of messages) {
        if (m.kind === 'user') {
          appendBubble('user', 'You', '<div>' + escapeHtml(redactSensitiveText(m.text)) + '</div>');
        } else if (m.kind === 'assistant') {
          renderAssistantBubble(m.result, true, undefined);
        } else if (m.kind === 'info') {
          appendBubble('info', 'Info', '<div>' + escapeHtml(redactSensitiveText(m.text)) + '</div>');
        }
      }
    }

    function extractToolMentions(text) {
      const names = new Set();
      for (const match of String(text).matchAll(/@([a-zA-Z0-9_:-]+)/g)) {
        const name = match[1];
        if (name) names.add(name);
      }
      return Array.from(names);
    }

    function getCurrentMentionQuery() {
      const value = input.value;
      const caret = input.selectionStart || 0;
      const beforeCaret = value.slice(0, caret);
      const match = beforeCaret.match(/(?:^|\\s)@([a-zA-Z0-9_:-]*)$/);
      if (!match) return undefined;
      const atPos = beforeCaret.lastIndexOf('@');
      return { query: (match[1] || '').toLowerCase(), atPos };
    }

    function rankTools(query) {
      if (!query) return toolsCatalog.slice(0, 20);
      return toolsCatalog
        .map(tool => {
          const name = tool.name.toLowerCase();
          const desc = (tool.description || '').toLowerCase();
          let score = 0;
          if (name.startsWith(query)) score += 6;
          if (name.includes(query)) score += 4;
          if (desc.includes(query)) score += 1;
          return { tool, score };
        })
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
        .slice(0, 20)
        .map(entry => entry.tool);
    }

    function renderPicker(options) {
      currentOptions = options;
      if (!options.length) {
        picker.classList.remove('visible');
        picker.innerHTML = '';
        return;
      }
      picker.classList.add('visible');
      activeOptionIndex = Math.min(activeOptionIndex, options.length - 1);
      picker.innerHTML = options.map((tool, idx) => {
        const cls = idx === activeOptionIndex ? 'tool-option active' : 'tool-option';
        return '<div class="' + cls + '" data-tool-name="' + escapeHtml(tool.name) + '">'
          + '<div class="name">' + escapeHtml(tool.name) + '</div>'
          + '<div class="desc">' + escapeHtml(tool.description || 'No description') + '</div>'
          + '</div>';
      }).join('');
    }

    function applyToolMention(toolName) {
      const mention = getCurrentMentionQuery();
      if (!mention) return;
      const caret = input.selectionStart || 0;
      const before = input.value.slice(0, mention.atPos);
      const after = input.value.slice(caret);
      const spaceAfter = after.startsWith(' ') ? '' : ' ';
      input.value = before + '@' + toolName + ' ' + spaceAfter + after;
      const nextPos = (before + '@' + toolName + ' ').length;
      input.focus();
      input.selectionStart = nextPos;
      input.selectionEnd = nextPos;
      picker.classList.remove('visible');
      picker.innerHTML = '';
      redrawMentions();
    }

    function maybeShowPicker() {
      if (!IS_OEM) {
        return;
      }
      const mention = getCurrentMentionQuery();
      if (!mention) {
        picker.classList.remove('visible');
        picker.innerHTML = '';
        return;
      }
      activeOptionIndex = 0;
      renderPicker(rankTools(mention.query));
    }

    function submitAsk() {
      const question = input.value.trim();
      if (!question) return;
      appendBubble('user', 'You', '<div>' + escapeHtml(redactSensitiveText(question)) + '</div>');
      if (IS_OEM) {
        const preferredTools = extractToolMentions(question);
        vscode.postMessage({ type: 'ask', payload: { question, preferredTools } });
      } else {
        vscode.postMessage({ type: 'rag-ask', payload: { question } });
      }
      input.value = '';
      mentions.innerHTML = '';
      picker.classList.remove('visible');
      picker.innerHTML = '';
    }

    newConvBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'conversation/create' });
    });

    convList.addEventListener('click', e => {
      const del = e.target.closest('.conv-del');
      if (del) {
        e.preventDefault();
        e.stopPropagation();
        const id = del.getAttribute('data-id');
        if (id) {
          vscode.postMessage({ type: 'conversation/delete', id });
        }
        return;
      }
      const ren = e.target.closest('.conv-rename');
      if (ren) {
        e.preventDefault();
        e.stopPropagation();
        const id = ren.getAttribute('data-id');
        if (id) {
          vscode.postMessage({ type: 'conversation/rename', id });
        }
        return;
      }
      const row = e.target.closest('.conv-item');
      if (row && !e.target.closest('button')) {
        const id = row.getAttribute('data-id');
        if (id) {
          vscode.postMessage({ type: 'conversation/select', id });
        }
      }
    });

    document.getElementById('askBtn').addEventListener('click', submitAsk);

    input.addEventListener('input', () => {
      redrawMentions();
      maybeShowPicker();
    });

    input.addEventListener('keydown', event => {
      if (picker.classList.contains('visible') && currentOptions.length > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          activeOptionIndex = (activeOptionIndex + 1) % currentOptions.length;
          renderPicker(currentOptions);
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          activeOptionIndex = (activeOptionIndex - 1 + currentOptions.length) % currentOptions.length;
          renderPicker(currentOptions);
          return;
        }
        if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
          event.preventDefault();
          applyToolMention(currentOptions[activeOptionIndex].name);
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          picker.classList.remove('visible');
          return;
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        submitAsk();
      }
    });

    picker.addEventListener('mousedown', event => {
      const row = event.target.closest('[data-tool-name]');
      if (!row) return;
      const name = row.getAttribute('data-tool-name');
      if (name) applyToolMention(name);
    });

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'tools-catalog') {
        toolsCatalog = Array.isArray(message.payload) ? message.payload : [];
        maybeShowPicker();
        return;
      }
      if (message.type === 'conversations-bootstrap') {
        const p = message.payload;
        if (p && p.items) renderConvList(p.items, p.activeId);
        if (p && p.activeMessages) renderMessages(p.activeMessages);
        return;
      }
      if (message.type === 'conversations-list') {
        const p = message.payload;
        if (p && p.items) renderConvList(p.items, p.activeId);
        return;
      }
      if (message.type === 'conversation-activate') {
        const p = message.payload;
        if (p && p.activeId) currentActiveId = p.activeId;
        if (p && p.messages) renderMessages(p.messages);
        return;
      }
      if (message.type === 'info') {
        appendBubble('info', 'Info', '<div>' + escapeHtml(redactSensitiveText(message.payload)) + '</div>');
        return;
      }
      if (message.type === 'chart-settings') {
        showFetchDataCharts = Boolean(message.payload);
        settingsAllowCharts = Boolean(message.payload);
        if (chartToggle && localStorage.getItem('oemAssistant.showCharts') === null) {
          chartToggle.checked = settingsAllowCharts;
        }
        if (chartToggle) {
          document.querySelectorAll('.oem-chart-section').forEach(function(el) {
            el.style.display = chartToggle.checked && settingsAllowCharts ? '' : 'none';
          });
        }
        return;
      }
      if (message.type === 'assistant-result') {
        const payload = message.payload;
        if (payload.conversationId && payload.conversationId !== currentActiveId) {
          return;
        }
        const result = payload.result;
        const msgCharts = payload.showFetchDataCharts;
        renderAssistantBubble(result, false, msgCharts);
        return;
      }
    });

    function escapeHtml(str) {
      return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
    }

    vscode.postMessage({ type: 'webview-ready' });
  </script>
</body>
</html>`;
}

// src/views/chatPanel.ts
var ChatPanel = class _ChatPanel {
  static current;
  panel;
  static createOrShow(context) {
    if (_ChatPanel.current) {
      _ChatPanel.current.panel.reveal(vscode4.ViewColumn.One);
      return _ChatPanel.current;
    }
    const panel = vscode4.window.createWebviewPanel(
      "alertMcpConsole",
      "OEM Assistant Console",
      vscode4.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode4.Uri.joinPath(context.extensionUri, "media")]
      }
    );
    _ChatPanel.current = new _ChatPanel(panel, context);
    return _ChatPanel.current;
  }
  constructor(panel, context) {
    this.panel = panel;
    this.panel.onDidDispose(() => {
      _ChatPanel.current = void 0;
    });
    const chartSrc = this.panel.webview.asWebviewUri(vscode4.Uri.joinPath(context.extensionUri, "media", "chart.umd.min.js")).toString();
    const csp = [
      `default-src 'none'`,
      `style-src ${this.panel.webview.cspSource} 'unsafe-inline'`,
      `script-src ${this.panel.webview.cspSource} 'unsafe-inline'`,
      `img-src ${this.panel.webview.cspSource} data:`,
      `font-src ${this.panel.webview.cspSource} data:`
    ].join("; ");
    this.panel.webview.html = this.renderHtml(chartSrc, csp);
  }
  onDidReceiveMessage(handler) {
    return this.panel.webview.onDidReceiveMessage(handler);
  }
  setPanelTitle(title) {
    const t = title.trim();
    this.panel.title = t.length > 0 ? `OEM: ${t.length > 40 ? `${t.slice(0, 37)}...` : t}` : "OEM Assistant Console";
  }
  postBootstrap(payload) {
    this.panel.webview.postMessage({ type: "conversations-bootstrap", payload });
  }
  postConversationActivate(activeId, messages) {
    this.panel.webview.postMessage({
      type: "conversation-activate",
      payload: { activeId, messages }
    });
  }
  postConversationListUpdate(items, activeId) {
    this.panel.webview.postMessage({
      type: "conversations-list",
      payload: { items, activeId }
    });
  }
  postAssistantResult(conversationId, question, result, showFetchDataCharts) {
    this.panel.webview.postMessage({
      type: "assistant-result",
      payload: { conversationId, question, result, showFetchDataCharts }
    });
  }
  postChartSettings(showFetchDataCharts) {
    this.panel.webview.postMessage({ type: "chart-settings", payload: showFetchDataCharts });
  }
  postInfo(text) {
    this.panel.webview.postMessage({ type: "info", payload: text });
  }
  postToolCatalog(tools) {
    this.panel.webview.postMessage({ type: "tools-catalog", payload: tools });
  }
  renderHtml(chartSrc, csp) {
    return buildChatPanelHtml({ mode: "oem", chartSrc, csp });
  }
};

// src/views/ragChatPanel.ts
var vscode5 = __toESM(require("vscode"));
var RagChatPanel = class _RagChatPanel {
  static current;
  panel;
  static createOrShow(context) {
    if (_RagChatPanel.current) {
      _RagChatPanel.current.panel.reveal(vscode5.ViewColumn.One);
      return _RagChatPanel.current;
    }
    const panel = vscode5.window.createWebviewPanel(
      "alertMcpRagConsole",
      "OEM RAG Console",
      vscode5.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode5.Uri.joinPath(context.extensionUri, "media")]
      }
    );
    _RagChatPanel.current = new _RagChatPanel(panel, context);
    return _RagChatPanel.current;
  }
  constructor(panel, context) {
    this.panel = panel;
    this.panel.onDidDispose(() => {
      _RagChatPanel.current = void 0;
    });
    const csp = [
      `default-src 'none'`,
      `style-src ${this.panel.webview.cspSource} 'unsafe-inline'`,
      `script-src ${this.panel.webview.cspSource} 'unsafe-inline'`,
      `img-src ${this.panel.webview.cspSource} data:`,
      `font-src ${this.panel.webview.cspSource} data:`
    ].join("; ");
    this.panel.webview.html = this.renderHtml(csp);
  }
  onDidReceiveMessage(handler) {
    return this.panel.webview.onDidReceiveMessage(handler);
  }
  setPanelTitle(title) {
    const t = title.trim();
    this.panel.title = t.length > 0 ? `OEM RAG: ${t.length > 40 ? `${t.slice(0, 37)}...` : t}` : "OEM RAG Console";
  }
  postBootstrap(payload) {
    this.panel.webview.postMessage({ type: "conversations-bootstrap", payload });
  }
  postConversationActivate(activeId, messages) {
    this.panel.webview.postMessage({
      type: "conversation-activate",
      payload: { activeId, messages }
    });
  }
  postConversationListUpdate(items, activeId) {
    this.panel.webview.postMessage({
      type: "conversations-list",
      payload: { items, activeId }
    });
  }
  postAssistantResult(conversationId, question, result, _showFetchDataCharts) {
    this.panel.webview.postMessage({
      type: "assistant-result",
      payload: { conversationId, question, result, showFetchDataCharts: false }
    });
  }
  postInfo(text) {
    this.panel.webview.postMessage({ type: "info", payload: text });
  }
  renderHtml(csp) {
    return buildChatPanelHtml({ mode: "rag", chartSrc: "", csp });
  }
};

// src/views/opsSidebarProvider.ts
var vscode6 = __toESM(require("vscode"));
var SidebarItem = class extends vscode6.TreeItem {
  constructor(label, options) {
    super(label, options?.collapsibleState ?? vscode6.TreeItemCollapsibleState.None);
    this.description = options?.description;
    this.command = options?.command;
    this.contextValue = options?.contextValue;
    this.tooltip = options?.tooltip;
  }
};
var OpsSidebarProvider = class {
  constructor(mcp, settingsService) {
    this.mcp = mcp;
    this.settingsService = settingsService;
  }
  mcp;
  settingsService;
  onDidChangeTreeDataEmitter = new vscode6.EventEmitter();
  onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
  refresh() {
    this.onDidChangeTreeDataEmitter.fire();
  }
  getTreeItem(element) {
    return element;
  }
  getChildren(element) {
    const settings = this.settingsService.get();
    const tools = this.mcp.getCachedTools();
    if (element?.contextValue === "available-tools") {
      if (tools.length === 0) {
        return Promise.resolve([
          new SidebarItem("No tools discovered yet", {
            description: "Connect MCP and refresh to load tool metadata."
          })
        ]);
      }
      return Promise.resolve(
        tools.slice(0, 30).map((tool) => new SidebarItem(tool.name, {
          command: {
            command: "alertMcp.showToolDescription",
            title: "Show Tool Description",
            arguments: [tool.name, tool.description ?? "No description from MCP server."]
          },
          tooltip: tool.description ?? "No description from MCP server."
        }))
      );
    }
    return Promise.resolve([
      new SidebarItem(
        this.mcp.isConnected() ? "MCP: Connected" : "MCP: Disconnected",
        {
          description: this.mcp.getConnectedUrl() ?? settings.mcp.serverUrl,
          command: {
            command: this.mcp.isConnected() ? "alertMcp.disconnectMcp" : "alertMcp.connectMcp",
            title: "Toggle MCP Connection"
          }
        }
      ),
      new SidebarItem("LLM Provider", { description: settings.llm.provider }),
      new SidebarItem("LLM Model", { description: settings.llm.model }),
      new SidebarItem("Available Tools", {
        description: `${tools.length}`,
        collapsibleState: vscode6.TreeItemCollapsibleState.Expanded,
        contextValue: "available-tools"
      }),
      new SidebarItem("Open Console", {
        description: "Chat + tool execution view",
        command: {
          command: "alertMcp.openConsole",
          title: "Open Console"
        }
      }),
      new SidebarItem("Open Console RAG", {
        description: "Oracle docs (docs.oracle.com) + LLM",
        command: {
          command: "alertMcp.openRagConsole",
          title: "Open Console RAG"
        }
      }),
      new SidebarItem("Open Settings", {
        description: "LLM / OEM / MCP credentials",
        command: {
          command: "alertMcp.openSettings",
          title: "Open Settings"
        }
      })
    ]);
  }
};

// src/views/settingsPanel.ts
var vscode7 = __toESM(require("vscode"));
var SettingsPanel = class _SettingsPanel {
  static current;
  panel;
  static async createOrShow(context, settingsService, secrets) {
    if (_SettingsPanel.current) {
      _SettingsPanel.current.panel.reveal(vscode7.ViewColumn.One);
      await _SettingsPanel.current.refresh(settingsService, secrets);
      return _SettingsPanel.current;
    }
    const panel = vscode7.window.createWebviewPanel(
      "alertMcpSettings",
      "OEM Assistant Settings",
      vscode7.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    _SettingsPanel.current = new _SettingsPanel(panel, context, settingsService, secrets);
    await _SettingsPanel.current.refresh(settingsService, secrets);
    return _SettingsPanel.current;
  }
  constructor(panel, _context, settingsService, secrets) {
    this.panel = panel;
    this.panel.webview.html = this.renderHtml();
    this.panel.onDidDispose(() => {
      _SettingsPanel.current = void 0;
    });
    this.panel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === "save") {
        await this.handleSave(message.payload, settingsService, secrets);
      }
    });
  }
  async refresh(settingsService, secrets) {
    const settings = settingsService.get();
    const state = {
      mcpServerUrl: settings.mcp.serverUrl,
      mcpConnectionMode: settings.mcp.connectionMode,
      llmProvider: settings.llm.provider,
      llmBaseUrl: settings.llm.baseUrl,
      llmModel: settings.llm.model,
      llmTemperature: settings.llm.temperature,
      oemBaseUrl: settings.oem.baseUrl,
      oemUsername: settings.oem.username,
      hasLlmApiKey: Boolean(await secrets.getLlmApiKey()),
      hasMcpToken: Boolean(await secrets.getMcpBearerToken()),
      hasOemPassword: Boolean(await secrets.getOemPassword()),
      hasTavilyApiKey: Boolean(await secrets.getTavilyApiKey())
    };
    this.panel.webview.postMessage({ type: "state", payload: state });
  }
  async handleSave(payload, settingsService, secrets) {
    const config2 = vscode7.workspace.getConfiguration("alertMcp");
    await Promise.all([
      config2.update("mcp.serverUrl", String(payload.mcpServerUrl ?? ""), vscode7.ConfigurationTarget.Global),
      config2.update(
        "mcp.connectionMode",
        String(payload.mcpConnectionMode ?? "auto"),
        vscode7.ConfigurationTarget.Global
      ),
      config2.update("llm.provider", String(payload.llmProvider ?? "openai-compatible"), vscode7.ConfigurationTarget.Global),
      config2.update("llm.baseUrl", String(payload.llmBaseUrl ?? ""), vscode7.ConfigurationTarget.Global),
      config2.update("llm.model", String(payload.llmModel ?? ""), vscode7.ConfigurationTarget.Global),
      config2.update(
        "llm.temperature",
        Number(payload.llmTemperature ?? 0.1),
        vscode7.ConfigurationTarget.Global
      ),
      config2.update("oem.baseUrl", String(payload.oemBaseUrl ?? ""), vscode7.ConfigurationTarget.Global),
      config2.update("oem.username", String(payload.oemUsername ?? ""), vscode7.ConfigurationTarget.Global)
    ]);
    const llmApiKey = String(payload.llmApiKey ?? "").trim();
    if (llmApiKey) {
      await secrets.setLlmApiKey(llmApiKey);
    }
    const mcpToken = String(payload.mcpBearerToken ?? "").trim();
    if (mcpToken) {
      await secrets.setMcpBearerToken(mcpToken);
    }
    const oemPassword = String(payload.oemPassword ?? "").trim();
    if (oemPassword) {
      await secrets.setOemPassword(oemPassword);
    }
    const tavilyApiKey = String(payload.tavilyApiKey ?? "").trim();
    if (tavilyApiKey) {
      await secrets.setTavilyApiKey(tavilyApiKey);
    }
    await this.refresh(settingsService, secrets);
    vscode7.window.showInformationMessage("OEM Assistant settings saved.");
  }
  renderHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OEM Assistant Settings</title>
  <style>
    :root {
      --card-border: color-mix(in srgb, var(--vscode-panel-border) 75%, transparent);
      --soft-bg: color-mix(in srgb, var(--vscode-editorWidget-background) 75%, transparent);
      --muted-fg: color-mix(in srgb, var(--vscode-foreground) 70%, transparent);
      --accent: var(--vscode-button-background);
      --accent-fg: var(--vscode-button-foreground);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 20px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-editor-foreground);
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--vscode-editor-background) 92%, #111 8%) 0%,
        var(--vscode-editor-background) 100%
      );
    }

    .container {
      max-width: 1080px;
      margin: 0 auto;
      display: grid;
      gap: 14px;
    }

    .header {
      padding: 16px 18px;
      border: 1px solid var(--card-border);
      border-radius: 12px;
      background: var(--soft-bg);
    }

    .title {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.2px;
    }

    .subtitle {
      margin: 8px 0 0;
      font-size: 12px;
      color: var(--muted-fg);
    }

    .card {
      border: 1px solid var(--card-border);
      border-radius: 12px;
      background: color-mix(in srgb, var(--vscode-editorWidget-background) 65%, transparent);
      padding: 14px;
    }

    .section-title {
      margin: 2px 0 10px;
      font-size: 13px;
      font-weight: 600;
      color: var(--muted-fg);
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .grid {
      display: grid;
      gap: 10px;
      grid-template-columns: 1fr 1fr;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field.full {
      grid-column: 1 / -1;
    }

    label {
      font-size: 12px;
      font-weight: 500;
      color: color-mix(in srgb, var(--vscode-foreground) 88%, transparent);
    }

    input, select {
      width: 100%;
      border: 1px solid color-mix(in srgb, var(--vscode-input-border) 75%, transparent);
      border-radius: 8px;
      padding: 10px 11px;
      min-height: 38px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      outline: none;
      transition: border-color 0.18s ease, box-shadow 0.18s ease;
    }

    input:focus,
    select:focus {
      border-color: color-mix(in srgb, var(--accent) 82%, white 18%);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 28%, transparent);
    }

    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding-top: 2px;
    }

    .hint {
      font-size: 12px;
      color: var(--muted-fg);
      min-height: 18px;
    }

    button {
      border: 1px solid color-mix(in srgb, var(--accent) 75%, transparent);
      background: var(--accent);
      color: var(--accent-fg);
      border-radius: 8px;
      padding: 9px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 class="title">OEM Assistant Settings</h2>
      <p class="subtitle">\u7EF4\u62A4 MCP / LLM / OEM \u8FDE\u63A5\u4FE1\u606F\uFF08\u5BC6\u7801\u4E0E\u5BC6\u94A5\u4F7F\u7528 SecretStorage\uFF09\u3002</p>
    </div>

    <div class="card">
      <div class="section-title">MCP</div>
      <div class="grid">
        <label class="field full">MCP SSE \u5730\u5740
          <input id="mcpServerUrl" placeholder="http://127.0.0.1:3000/sse" />
        </label>
        <label class="field">MCP \u8FDE\u63A5\u6A21\u5F0F
          <select id="mcpConnectionMode">
            <option value="auto">auto</option>
            <option value="legacy-sse">legacy-sse</option>
            <option value="streamable-http">streamable-http</option>
          </select>
        </label>
      </div>
    </div>

    <div class="card">
      <div class="section-title">LLM</div>
      <div class="grid">
        <label class="field">LLM Provider
          <select id="llmProvider">
            <option value="openai-compatible">openai-compatible</option>
            <option value="copilot">copilot</option>
          </select>
        </label>
        <label class="field full">LLM Base URL
          <input id="llmBaseUrl" placeholder="https://api.deepseek.com" />
        </label>
        <label class="field">LLM Model
          <input id="llmModel" placeholder="deepseek-chat" />
        </label>
        <label class="field">LLM Temperature
          <input id="llmTemperature" type="number" min="0" max="2" step="0.1" />
        </label>
        <label class="field full">LLM API Key\uFF08\u7559\u7A7A\u8868\u793A\u4E0D\u4FEE\u6539\uFF09
          <input id="llmApiKey" type="password" placeholder="sk-..." />
        </label>
      </div>
    </div>

    <div class="card">
      <div class="section-title">OEM</div>
      <div class="grid">
        <label class="field full">OEM \u5730\u5740
          <input id="oemBaseUrl" placeholder="https://oem.example.com" />
        </label>
        <label class="field">OEM \u8D26\u53F7
          <input id="oemUsername" placeholder="username" />
        </label>
        <label class="field">OEM \u5BC6\u7801\uFF08\u7559\u7A7A\u8868\u793A\u4E0D\u4FEE\u6539\uFF09
          <input id="oemPassword" type="password" />
        </label>
      </div>
    </div>

    <div class="card">
      <div class="section-title">RAG\uFF08Oracle \u6587\u6863 / \u535A\u5BA2\uFF09</div>
      <p class="subtitle" style="margin: 0 0 10px 0;">\u68C0\u7D22\u4EC5\u5141\u8BB8 <strong>docs.oracle.com/en/</strong> \u4E0E <strong>blogs.oracle.com</strong>\uFF08Tavily <code>include_domains</code> + URL \u4E8C\u6B21\u8FC7\u6EE4\uFF09\u3002</p>
      <div class="grid">
        <label class="field full">Tavily API Key\uFF08\u7559\u7A7A\u8868\u793A\u4E0D\u4FEE\u6539\uFF09
          <input id="tavilyApiKey" type="password" placeholder="tvly-..." />
        </label>
      </div>
    </div>

    <div class="card">
      <div class="section-title">Security</div>
      <div class="grid">
        <label class="field full">MCP Bearer Token\uFF08\u7559\u7A7A\u8868\u793A\u4E0D\u4FEE\u6539\uFF09
          <input id="mcpBearerToken" type="password" />
        </label>
      </div>
      <div class="footer">
        <div class="hint" id="secretHint"></div>
        <button id="saveBtn">\u4FDD\u5B58\u8BBE\u7F6E</button>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    const fields = [
      'mcpServerUrl', 'mcpConnectionMode', 'llmProvider', 'llmBaseUrl', 'llmModel', 'llmTemperature',
      'llmApiKey', 'oemBaseUrl', 'oemUsername', 'oemPassword', 'tavilyApiKey', 'mcpBearerToken'
    ];

    document.getElementById('saveBtn').addEventListener('click', () => {
      const payload = {};
      for (const id of fields) {
        payload[id] = document.getElementById(id).value;
      }
      vscode.postMessage({ type: 'save', payload });
    });

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type !== 'state') {
        return;
      }

      const state = message.payload;
      document.getElementById('mcpServerUrl').value = state.mcpServerUrl;
      document.getElementById('mcpConnectionMode').value = state.mcpConnectionMode;
      document.getElementById('llmProvider').value = state.llmProvider;
      document.getElementById('llmBaseUrl').value = state.llmBaseUrl;
      document.getElementById('llmModel').value = state.llmModel;
      document.getElementById('llmTemperature').value = state.llmTemperature;
      document.getElementById('oemBaseUrl').value = state.oemBaseUrl;
      document.getElementById('oemUsername').value = state.oemUsername;

      document.getElementById('llmApiKey').value = '';
      document.getElementById('oemPassword').value = '';
      document.getElementById('tavilyApiKey').value = '';
      document.getElementById('mcpBearerToken').value = '';

      const hints = [];
      if (state.hasLlmApiKey) hints.push('LLM Key\u5DF2\u4FDD\u5B58');
      if (state.hasMcpToken) hints.push('MCP Token\u5DF2\u4FDD\u5B58');
      if (state.hasOemPassword) hints.push('OEM\u5BC6\u7801\u5DF2\u4FDD\u5B58');
      if (state.hasTavilyApiKey) hints.push('Tavily Key\u5DF2\u4FDD\u5B58');
      document.getElementById('secretHint').textContent = hints.join(' | ');
    });
  </script>
</body>
</html>`;
  }
};

// src/extension.ts
var MAX_SESSION_CONTEXT_CHARS = 128 * 1024;
function trimSessionContext(turns) {
  let total = turns.reduce((sum, turn) => sum + turn.content.length, 0);
  while (total > MAX_SESSION_CONTEXT_CHARS && turns.length > 2) {
    const removed = turns.shift();
    total -= removed?.content.length ?? 0;
  }
}
function activate(context) {
  const output = vscode8.window.createOutputChannel("OEM Assistant");
  const settingsService = new SettingsService();
  const secrets = new SecretStorageService(context);
  const mcpService = new McpClientService(output, secrets);
  const sidebar = new OpsSidebarProvider(mcpService, settingsService);
  const treeView = vscode8.window.createTreeView("alertMcp.sidebar", {
    treeDataProvider: sidebar
  });
  const conversationStore = new ConversationStore(context);
  conversationStore.ensureAtLeastOneConversation();
  const ragConversationStore = new ConversationStore(context, RAG_CONVERSATIONS_STORAGE_KEY);
  ragConversationStore.ensureAtLeastOneConversation();
  const sessionContextMap = /* @__PURE__ */ new Map();
  const oemSessionIdByConvId = /* @__PURE__ */ new Map();
  const ragSessionContextMap = /* @__PURE__ */ new Map();
  const syncSessionContextFromStore = (convId) => {
    const msgs = conversationStore.getMessagesForConversation(convId);
    sessionContextMap.set(convId, messagesToChatTurns(msgs));
  };
  const syncRagSessionContextFromStore = (convId) => {
    const msgs = ragConversationStore.getMessagesForConversation(convId);
    ragSessionContextMap.set(convId, messagesToChatTurns(msgs));
  };
  syncSessionContextFromStore(conversationStore.getActiveId());
  syncRagSessionContextFromStore(ragConversationStore.getActiveId());
  context.subscriptions.push(output, treeView);
  let panel;
  let panelMessageDisposable;
  let ragPanel;
  let ragPanelMessageDisposable;
  context.subscriptions.push(
    new vscode8.Disposable(() => {
      panelMessageDisposable?.dispose();
      ragPanelMessageDisposable?.dispose();
    })
  );
  const pushSessionTurn = (convId, turn) => {
    const arr = sessionContextMap.get(convId) ?? [];
    arr.push(turn);
    trimSessionContext(arr);
    sessionContextMap.set(convId, arr);
  };
  const getContextForAsk = (convId) => {
    let ctx = sessionContextMap.get(convId);
    if (!ctx) {
      ctx = messagesToChatTurns(conversationStore.getMessagesForConversation(convId));
      sessionContextMap.set(convId, ctx);
    }
    return ctx;
  };
  const pushRagSessionTurn = (convId, turn) => {
    const arr = ragSessionContextMap.get(convId) ?? [];
    arr.push(turn);
    trimSessionContext(arr);
    ragSessionContextMap.set(convId, arr);
  };
  const getRagContextForAsk = (convId) => {
    let ctx = ragSessionContextMap.get(convId);
    if (!ctx) {
      ctx = messagesToChatTurns(ragConversationStore.getMessagesForConversation(convId));
      ragSessionContextMap.set(convId, ctx);
    }
    return ctx;
  };
  const refreshPanelTitle = (p) => {
    const id = conversationStore.getActiveId();
    const c = conversationStore.getConversation(id);
    p.setPanelTitle(c?.meta.title ?? "");
  };
  const refreshRagPanelTitle = (p) => {
    const id = ragConversationStore.getActiveId();
    const c = ragConversationStore.getConversation(id);
    p.setPanelTitle(c?.meta.title ?? "");
  };
  const pushConversationListUpdate = (p) => {
    const boot = conversationStore.getBootstrapPayload();
    p.postConversationListUpdate(boot.items, boot.activeId);
  };
  const pushRagConversationListUpdate = (p) => {
    const boot = ragConversationStore.getBootstrapPayload();
    p.postConversationListUpdate(boot.items, boot.activeId);
  };
  const syncPanelToolCatalog = () => {
    if (!panel) {
      return;
    }
    panel.postToolCatalog(
      mcpService.getCachedTools().map((tool) => ({
        name: tool.name,
        description: tool.description ?? "No description from MCP server."
      }))
    );
  };
  const connectMcp = async () => {
    const settings = settingsService.get();
    await vscode8.window.withProgress(
      {
        location: vscode8.ProgressLocation.Notification,
        title: "Connecting MCP server..."
      },
      async () => {
        await mcpService.connect(settings);
      }
    );
    sidebar.refresh();
    syncPanelToolCatalog();
    const p = openPanel();
    p.postInfo(`MCP connected: ${mcpService.getConnectedUrl() ?? settings.mcp.serverUrl}`);
    vscode8.window.showInformationMessage("MCP server connected.");
  };
  const runAsk = async (userQuestion, preferredTools, parsedPayload) => {
    const currentPanel = openPanel();
    const askConvId = conversationStore.getActiveId();
    const ctx = getContextForAsk(askConvId);
    const settings = settingsService.get();
    const orchestrator = new AssistantOrchestrator(settings, secrets, mcpService, output);
    try {
      const result = await vscode8.window.withProgress(
        {
          location: vscode8.ProgressLocation.Notification,
          title: "Running alert assistant..."
        },
        async () => orchestrator.ask(userQuestion, ctx, {
          preferredTools: parsedPayload?.preferredTools ?? preferredTools,
          oemSessionId: oemSessionIdByConvId.get(askConvId)
        })
      );
      conversationStore.appendUserMessage(askConvId, userQuestion, preferredTools);
      conversationStore.appendAssistantMessage(askConvId, result);
      pushSessionTurn(askConvId, { role: "user", content: userQuestion });
      pushSessionTurn(askConvId, { role: "assistant", content: result.finalText });
      const sid = extractSessionId(result.finalText) ?? extractSessionId(result.steps.map((step) => step.detail).join("\n"));
      if (sid) {
        oemSessionIdByConvId.set(askConvId, sid);
      }
      currentPanel.postAssistantResult(
        askConvId,
        userQuestion,
        result,
        settingsService.get().ui.showFetchDataCharts
      );
    } catch (error2) {
      const message = error2 instanceof Error ? error2.message : String(error2);
      output.appendLine(`[ERROR] ${message}`);
      conversationStore.appendUserMessage(askConvId, userQuestion, preferredTools);
      conversationStore.appendInfoMessage(askConvId, message);
      pushSessionTurn(askConvId, { role: "user", content: userQuestion });
      currentPanel.postInfo(message);
      vscode8.window.showErrorMessage(message);
    }
  };
  const runRagAsk = async (userQuestion) => {
    const currentPanel = openRagPanel();
    const askConvId = ragConversationStore.getActiveId();
    const ctx = getRagContextForAsk(askConvId);
    const settings = settingsService.get();
    const orchestrator = new RagOrchestrator(settings, secrets, output);
    try {
      const result = await vscode8.window.withProgress(
        {
          location: vscode8.ProgressLocation.Notification,
          title: "Running Oracle docs RAG..."
        },
        async () => orchestrator.ask(userQuestion, ctx)
      );
      ragConversationStore.appendUserMessage(askConvId, userQuestion, []);
      ragConversationStore.appendAssistantMessage(askConvId, result);
      pushRagSessionTurn(askConvId, { role: "user", content: userQuestion });
      pushRagSessionTurn(askConvId, { role: "assistant", content: result.finalText });
      currentPanel.postAssistantResult(askConvId, userQuestion, result, false);
    } catch (error2) {
      const message = error2 instanceof Error ? error2.message : String(error2);
      output.appendLine(`[RAG ERROR] ${message}`);
      ragConversationStore.appendUserMessage(askConvId, userQuestion, []);
      ragConversationStore.appendInfoMessage(askConvId, message);
      pushRagSessionTurn(askConvId, { role: "user", content: userQuestion });
      currentPanel.postInfo(message);
      vscode8.window.showErrorMessage(message);
    }
  };
  const askAssistant = async (payload) => {
    const parsedPayload = typeof payload === "string" ? { question: payload } : payload;
    const userQuestion = parsedPayload?.question ?? await vscode8.window.showInputBox({
      prompt: "Ask the alert assistant",
      placeHolder: "\u4F8B\u5982\uFF1A@fetch_data_from_oem \u67E5\u8BE2\u6700\u8FD12\u5C0F\u65F6\u6240\u6709P1\u544A\u8B66\uFF0C\u5E76\u7ED9\u51FA\u5904\u7F6E\u5EFA\u8BAE"
    });
    if (!userQuestion) {
      return;
    }
    const preferredTools = parsedPayload?.preferredTools ?? [];
    await runAsk(userQuestion, preferredTools, parsedPayload);
  };
  const openPanel = () => {
    panel = ChatPanel.createOrShow(context);
    panelMessageDisposable?.dispose();
    panelMessageDisposable = panel.onDidReceiveMessage(async (message) => {
      if (message.type === "webview-ready") {
        panel.postBootstrap(conversationStore.getBootstrapPayload());
        panel.postChartSettings(settingsService.get().ui.showFetchDataCharts);
        syncPanelToolCatalog();
        refreshPanelTitle(panel);
        return;
      }
      if (message.type === "connect") {
        await connectMcp();
        return;
      }
      if (message.type === "conversation/create") {
        const snap = conversationStore.createConversation();
        sessionContextMap.set(snap.meta.id, []);
        oemSessionIdByConvId.delete(snap.meta.id);
        pushConversationListUpdate(panel);
        panel.postConversationActivate(snap.meta.id, []);
        refreshPanelTitle(panel);
        return;
      }
      if (message.type === "conversation/select" && typeof message.id === "string") {
        conversationStore.setActive(message.id);
        syncSessionContextFromStore(message.id);
        const msgs = conversationStore.getMessagesForConversation(message.id);
        panel.postConversationActivate(message.id, msgs);
        refreshPanelTitle(panel);
        return;
      }
      if (message.type === "conversation/rename" && typeof message.id === "string") {
        const convId = message.id;
        const directTitle = typeof message.title === "string" ? message.title.trim() : "";
        let titleToApply = directTitle;
        if (!titleToApply) {
          const existing = conversationStore.getConversation(convId);
          const next = await vscode8.window.showInputBox({
            prompt: "\u4F1A\u8BDD\u540D\u79F0",
            value: existing?.meta.title ?? ""
          });
          if (next === void 0) {
            return;
          }
          titleToApply = next;
        }
        conversationStore.renameConversation(convId, titleToApply);
        pushConversationListUpdate(panel);
        if (convId === conversationStore.getActiveId()) {
          refreshPanelTitle(panel);
        }
        return;
      }
      if (message.type === "conversation/delete" && typeof message.id === "string") {
        const convId = message.id;
        const confirmDelete = await vscode8.window.showWarningMessage(
          "\u786E\u5B9A\u5220\u9664\u6B64\u4F1A\u8BDD\uFF1F",
          { modal: true },
          "\u5220\u9664"
        );
        if (confirmDelete !== "\u5220\u9664") {
          return;
        }
        conversationStore.deleteConversation(convId);
        sessionContextMap.delete(convId);
        oemSessionIdByConvId.delete(convId);
        const boot = conversationStore.getBootstrapPayload();
        pushConversationListUpdate(panel);
        panel.postConversationActivate(boot.activeId, boot.activeMessages);
        syncSessionContextFromStore(boot.activeId);
        refreshPanelTitle(panel);
        return;
      }
      if (message.type === "ask") {
        const p = message.payload;
        if (!p?.question?.trim()) {
          return;
        }
        await runAsk(p.question.trim(), Array.isArray(p.preferredTools) ? p.preferredTools : [], {
          question: p.question.trim(),
          preferredTools: p.preferredTools
        });
      }
    });
    syncPanelToolCatalog();
    return panel;
  };
  const openRagPanel = () => {
    ragPanel = RagChatPanel.createOrShow(context);
    ragPanelMessageDisposable?.dispose();
    ragPanelMessageDisposable = ragPanel.onDidReceiveMessage(async (message) => {
      if (message.type === "webview-ready") {
        ragPanel.postBootstrap(ragConversationStore.getBootstrapPayload());
        refreshRagPanelTitle(ragPanel);
        return;
      }
      if (message.type === "conversation/create") {
        const snap = ragConversationStore.createConversation();
        ragSessionContextMap.set(snap.meta.id, []);
        pushRagConversationListUpdate(ragPanel);
        ragPanel.postConversationActivate(snap.meta.id, []);
        refreshRagPanelTitle(ragPanel);
        return;
      }
      if (message.type === "conversation/select" && typeof message.id === "string") {
        ragConversationStore.setActive(message.id);
        syncRagSessionContextFromStore(message.id);
        const msgs = ragConversationStore.getMessagesForConversation(message.id);
        ragPanel.postConversationActivate(message.id, msgs);
        refreshRagPanelTitle(ragPanel);
        return;
      }
      if (message.type === "conversation/rename" && typeof message.id === "string") {
        const convId = message.id;
        const directTitle = typeof message.title === "string" ? message.title.trim() : "";
        let titleToApply = directTitle;
        if (!titleToApply) {
          const existing = ragConversationStore.getConversation(convId);
          const next = await vscode8.window.showInputBox({
            prompt: "\u4F1A\u8BDD\u540D\u79F0",
            value: existing?.meta.title ?? ""
          });
          if (next === void 0) {
            return;
          }
          titleToApply = next;
        }
        ragConversationStore.renameConversation(convId, titleToApply);
        pushRagConversationListUpdate(ragPanel);
        if (convId === ragConversationStore.getActiveId()) {
          refreshRagPanelTitle(ragPanel);
        }
        return;
      }
      if (message.type === "conversation/delete" && typeof message.id === "string") {
        const convId = message.id;
        const confirmDelete = await vscode8.window.showWarningMessage(
          "\u786E\u5B9A\u5220\u9664\u6B64\u4F1A\u8BDD\uFF1F",
          { modal: true },
          "\u5220\u9664"
        );
        if (confirmDelete !== "\u5220\u9664") {
          return;
        }
        ragConversationStore.deleteConversation(convId);
        ragSessionContextMap.delete(convId);
        const boot = ragConversationStore.getBootstrapPayload();
        pushRagConversationListUpdate(ragPanel);
        ragPanel.postConversationActivate(boot.activeId, boot.activeMessages);
        syncRagSessionContextFromStore(boot.activeId);
        refreshRagPanelTitle(ragPanel);
        return;
      }
      if (message.type === "rag-ask") {
        const p = message.payload;
        if (!p?.question?.trim()) {
          return;
        }
        await runRagAsk(p.question.trim());
      }
    });
    return ragPanel;
  };
  context.subscriptions.push(
    vscode8.commands.registerCommand("alertMcp.openConsole", () => {
      openPanel();
    }),
    vscode8.commands.registerCommand("alertMcp.openRagConsole", () => {
      openRagPanel();
    }),
    vscode8.commands.registerCommand("alertMcp.connectMcp", connectMcp),
    vscode8.commands.registerCommand("alertMcp.disconnectMcp", async () => {
      await mcpService.disconnect();
      oemSessionIdByConvId.clear();
      sidebar.refresh();
      syncPanelToolCatalog();
      vscode8.window.showInformationMessage("MCP server disconnected.");
    }),
    vscode8.commands.registerCommand("alertMcp.askAssistant", askAssistant),
    vscode8.commands.registerCommand("alertMcp.showToolDescription", async (toolName, toolDescription) => {
      const safeDescription = toolDescription || "No description from MCP server.";
      vscode8.window.showInformationMessage(`${toolName}: ${safeDescription}`);
      const currentPanel = openPanel();
      currentPanel.postInfo(`Tool: ${toolName}
${safeDescription}`);
    }),
    vscode8.commands.registerCommand("alertMcp.openSettings", async () => {
      await SettingsPanel.createOrShow(context, settingsService, secrets);
    }),
    vscode8.commands.registerCommand("alertMcp.setLlmApiKey", async () => {
      await promptAndStoreLlmApiKey(secrets);
    }),
    vscode8.commands.registerCommand("alertMcp.setMcpBearerToken", async () => {
      await promptAndStoreMcpToken(secrets);
    }),
    vscode8.commands.registerCommand("alertMcp.refreshSidebar", async () => {
      if (mcpService.isConnected()) {
        await mcpService.refreshTools();
      }
      sidebar.refresh();
      syncPanelToolCatalog();
    }),
    vscode8.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("alertMcp")) {
        sidebar.refresh();
        if (panel) {
          panel.postChartSettings(settingsService.get().ui.showFetchDataCharts);
        }
      }
    }),
    {
      dispose: () => {
        void mcpService.disconnect();
      }
    }
  );
}
function extractSessionId(text) {
  try {
    const parsed = JSON.parse(text);
    const direct = parsed.session_id ?? parsed.sessionId;
    if (typeof direct === "string" && direct.trim()) {
      return direct.trim();
    }
  } catch {
  }
  const match = /"session_id"\s*:\s*"([^"]+)"/i.exec(text);
  return match?.[1];
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate
});
//# sourceMappingURL=extension.js.map
